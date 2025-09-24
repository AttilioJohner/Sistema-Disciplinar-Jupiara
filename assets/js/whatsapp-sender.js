// 📱 Sistema de Envio WhatsApp para EECM Jupiara
// Integração com Railway WAHA para notificar pais

class WhatsAppSender {
  constructor() {
    this.apiUrl = 'https://waha-production-7ba4.up.railway.app/api';
    this.session = 'default';
  }

  // Enviar mensagem simples
  async enviarMensagem(telefone, mensagem) {
    try {
      console.log(`📤 Enviando mensagem para ${telefone}`);

      // Formatar número (adicionar @c.us se necessário)
      const chatId = telefone.includes('@') ? telefone : `${telefone}@c.us`;

      const payload = {
        chatId: chatId,
        text: mensagem,
        session: this.session
      };

      const response = await fetch(`${this.apiUrl}/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Mensagem enviada com sucesso:', result);
        return { success: true, data: result };
      } else {
        const error = await response.text();
        console.error('❌ Erro ao enviar mensagem:', error);
        return { success: false, error: error };
      }

    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return { success: false, error: error.message };
    }
  }

  // Aguardar inicialização do banco de dados
  async aguardarInicializacaoDB(timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkDB = () => {
        if (window.db) {
          console.log('✅ window.db inicializado com sucesso');
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          console.error(`❌ Timeout aguardando window.db (${timeout}ms)`);
          resolve(false);
          return;
        }

        setTimeout(checkDB, 100);
      };

      checkDB();
    });
  }

  // Normalizar número de telefone (remover 5º dígito se presente)
  normalizarTelefone(telefone) {
    if (!telefone) return null;

    // Remover espaços, parênteses, traços
    const numeroLimpo = telefone.replace(/[\s\(\)\-]/g, '');

    // Verificar se tem 13 dígitos (com o 9 extra)
    // Formato: 5566999138335 (13 dígitos)
    // Resultado: 556699138335 (12 dígitos)
    if (numeroLimpo.length === 13 && numeroLimpo.startsWith('55')) {
      // Extrair: 55 + 66 + remover 9 + 99138335
      const codigoPais = numeroLimpo.substring(0, 2);    // "55"
      const codigoUF = numeroLimpo.substring(2, 4);      // "66"
      const numeroReal = numeroLimpo.substring(5);       // "99138335" (remove o 5º dígito)

      const numeroNormalizado = codigoPais + codigoUF + numeroReal;
      console.log(`📞 Telefone normalizado: ${numeroLimpo} → ${numeroNormalizado}`);
      return numeroNormalizado;
    }

    // Se já está no formato correto (12 dígitos), retornar como está
    if (numeroLimpo.length === 12 && numeroLimpo.startsWith('55')) {
      console.log(`📞 Telefone já no formato correto: ${numeroLimpo}`);
      return numeroLimpo;
    }

    // Formato não reconhecido
    console.warn(`⚠️ Formato de telefone não reconhecido: ${telefone}`);
    return numeroLimpo;
  }

  // Buscar telefone do responsável no banco de dados
  async buscarTelefoneResponsavel(alunoId) {
    try {
      console.log(`🔍 Buscando telefone para aluno ID: ${alunoId}`);

      // Verificar se window.db está inicializado
      if (!window.db) {
        console.error('❌ window.db não está inicializado');
        console.log('🔄 Tentando aguardar inicialização...');

        // Aguardar até 5 segundos pela inicialização
        await this.aguardarInicializacaoDB(5000);

        if (!window.db) {
          throw new Error('Sistema de banco de dados não inicializado após aguardar. Recarregue a página.');
        }
      }

      // Buscar dados do aluno no banco
      const alunoDoc = await window.db.collection('alunos').doc(alunoId).get();

      if (!alunoDoc.exists) {
        console.warn(`⚠️ Aluno não encontrado: ${alunoId}`);
        return null;
      }

      const dadosAluno = alunoDoc.data();
      console.log(`📋 Dados do aluno encontrados:`, {
        id: alunoId,
        nome: dadosAluno.nome || dadosAluno.nome_completo,
        responsavel1: dadosAluno.responsavel1,
        telefone_responsavel: dadosAluno.telefone_responsavel,
        telefone1: dadosAluno.telefone1,
        telefone: dadosAluno.telefone,
        // Log todos os campos para debug
        camposDisponiveis: Object.keys(dadosAluno)
      });

      // Tentar diferentes campos de telefone
      const telefoneResponsavel = dadosAluno.responsavel1 ||
                                 dadosAluno.telefone_responsavel ||
                                 dadosAluno.telefone1 ||
                                 dadosAluno.telefone;

      if (telefoneResponsavel) {
        console.log(`📞 Telefone bruto encontrado no campo: ${telefoneResponsavel}`);
        const telefoneNormalizado = this.normalizarTelefone(telefoneResponsavel);
        console.log(`📲 Telefone final normalizado: ${telefoneNormalizado}`);
        return telefoneNormalizado;
      }

      console.warn(`⚠️ Nenhum telefone encontrado para o aluno: ${dadosAluno.nome_completo || dadosAluno.nome || alunoId}`);
      return null;

    } catch (error) {
      console.error(`❌ Erro ao buscar telefone do aluno ${alunoId}:`, error);
      return null;
    }
  }

  // Enviar notificação de medida disciplinar (nova versão)
  async notificarMedidaDisciplinar(dadosAluno, medida) {
    // Buscar telefone real do responsável
    const telefone = await this.buscarTelefoneResponsavel(dadosAluno.id || dadosAluno.codigo);

    if (!telefone) {
      console.warn('⚠️ Aluno sem telefone cadastrado:', dadosAluno.nome);
      return { success: false, error: 'Telefone não cadastrado para este aluno' };
    }

    console.log(`📱 Enviando WhatsApp para: ${telefone}`);
    const mensagem = this.formatarMensagemMedidaDisciplinar(dadosAluno, medida);
    return await this.enviarMensagem(telefone, mensagem);
  }

  // Enviar notificação de ocorrência disciplinar (mantido para compatibilidade)
  async notificarOcorrencia(dadosAluno, ocorrencia) {
    return await this.notificarMedidaDisciplinar(dadosAluno, ocorrencia);
  }

  // Formatar mensagem de medida disciplinar (novo template)
  formatarMensagemMedidaDisciplinar(aluno, medida) {
    const data = medida.data || new Date().toLocaleDateString('pt-BR');
    const isPositiva = this.isMedidaPositiva(medida.tipo);

    let mensagem = `Bom dia!\n`;
    mensagem += `Prezados Pais e/ou Responsáveis, a Equipe de Gestão Cívico-Militar da EECM Jupiara informa:\n\n`;

    mensagem += `👤 Aluno: ${aluno.nome}\n`;
    mensagem += `🆔 Código: ${aluno.id}\n`;
    mensagem += `🏫 Turma: ${aluno.turma}\n`;
    mensagem += `📅 Data da Ocorrência: ${data}\n\n`;

    mensagem += `📑 Tipo de Medida: ${medida.tipo}\n`;

    if (medida.especificacao) {
      mensagem += `📖 Especificação (Conforme Regulamento Disciplinar): ${medida.especificacao}\n`;
    }

    if (medida.motivo) {
      mensagem += `📝 Motivo/Descrição: ${medida.motivo}\n`;
    }

    if (medida.providencias) {
      mensagem += `⚖ Providências: ${medida.providencias}\n`;
    }

    mensagem += `\n`;

    // Adicionar texto baseado no tipo (positiva/negativa)
    if (isPositiva) {
      mensagem += `✅ Parabenizamos o aluno pelo destaque! Sua postura e atitude merecem reconhecimento e servem de exemplo para toda a turma.\n\n`;
    } else {
      mensagem += `⚠️ Registramos uma chamada de atenção, pois a ação é incompatível com as normas e valores da EECM Jupiara.\n\n`;

      // Adicionar nota sobre documentos para medidas específicas
      const medidaComDocumento = ['advertência', 'suspensão', 'termo de adequação'].some(tipo =>
        medida.tipo.toLowerCase().includes(tipo)
      );

      if (medidaComDocumento) {
        mensagem += `📌 Em caso de Advertência, Suspensão ou Termo de Adequação de Conduta, os responsáveis possuem até 3 dias úteis para devolução do documento devidamente assinado.\n\n`;
      }
    }

    mensagem += `📲 Essa é uma mensagem automática. Em caso de dúvidas, entre em contato com a Gestão Cívico-Militar pelo telefone ou WhatsApp: (66) 8101-0652.`;

    return mensagem;
  }

  // Verificar se medida é positiva
  isMedidaPositiva(tipo) {
    const tiposPositivos = ['elogio', 'parabéns', 'destaque', 'reconhecimento', 'mérito'];
    return tiposPositivos.some(tipoPos => tipo.toLowerCase().includes(tipoPos));
  }

  // Formatar mensagem de ocorrência (mantido para compatibilidade)
  formatarMensagemOcorrencia(aluno, ocorrencia) {
    return this.formatarMensagemMedidaDisciplinar(aluno, ocorrencia);
  }

  // Enviar aviso de frequência
  async notificarFrequencia(dadosAluno, faltas) {
    const telefone = dadosAluno.telefone1 || dadosAluno.telefone2;

    if (!telefone) {
      return { success: false, error: 'Telefone não cadastrado' };
    }

    const mensagem = this.formatarMensagemFrequencia(dadosAluno, faltas);
    return await this.enviarMensagem(telefone, mensagem);
  }

  // Formatar mensagem de frequência
  formatarMensagemFrequencia(aluno, faltas) {
    const data = new Date().toLocaleDateString('pt-BR');

    let mensagem = `🏫 *EECM Jupiara - Aviso de Frequência*\n\n`;
    mensagem += `👤 *Aluno:* ${aluno.nome}\n`;
    mensagem += `🏫 *Turma:* ${aluno.turma}\n`;
    mensagem += `📅 *Data:* ${data}\n\n`;

    mensagem += `⚠️ *Faltas Acumuladas:* ${faltas} dias\n\n`;

    if (faltas >= 15) {
      mensagem += `🚨 *ATENÇÃO:* Número de faltas próximo ao limite legal.\n`;
      mensagem += `É necessário comparecer à escola para regularizar.\n\n`;
    } else if (faltas >= 10) {
      mensagem += `⚠️ *AVISO:* Número elevado de faltas.\n`;
      mensagem += `Solicitamos maior atenção à frequência.\n\n`;
    }

    mensagem += `📞 *Contato da Escola:*\n`;
    mensagem += `WhatsApp: (66) 8101-0652\n`;
    mensagem += `Email: eecmjupiara@gmail.com\n\n`;
    mensagem += `_Mensagem automática do Sistema Disciplinar_`;

    return mensagem;
  }

  // Enviar mensagem personalizada
  async enviarMensagemPersonalizada(telefone, titulo, conteudo) {
    const data = new Date().toLocaleDateString('pt-BR');

    let mensagem = `🏫 *EECM Jupiara - ${titulo}*\n\n`;
    mensagem += `📅 *Data:* ${data}\n\n`;
    mensagem += `${conteudo}\n\n`;
    mensagem += `📞 *Contato da Escola:*\n`;
    mensagem += `WhatsApp: (66) 8101-0652\n`;
    mensagem += `Email: eecmjupiara@gmail.com\n\n`;
    mensagem += `_Mensagem automática do Sistema Disciplinar_`;

    return await this.enviarMensagem(telefone, mensagem);
  }

  // Testar conexão
  async testarConexao() {
    try {
      const response = await fetch(`${this.apiUrl}/sessions`);
      const sessions = await response.json();

      const sessionAtiva = sessions.find(s => s.name === this.session && s.status === 'WORKING');

      return {
        conectado: !!sessionAtiva,
        status: sessionAtiva ? sessionAtiva.status : 'DISCONNECTED',
        sessions: sessions
      };
    } catch (error) {
      return {
        conectado: false,
        status: 'ERROR',
        error: error.message
      };
    }
  }
}

// Instância global
window.whatsappSender = new WhatsAppSender();

// Funções de conveniência para usar no sistema
window.enviarNotificacaoWhatsApp = async function(dadosAluno, medida) {
  return await window.whatsappSender.notificarMedidaDisciplinar(dadosAluno, medida);
};

window.enviarMedidaDisciplinar = async function(dadosAluno, medida) {
  return await window.whatsappSender.notificarMedidaDisciplinar(dadosAluno, medida);
};

window.enviarAvisoFrequencia = async function(dadosAluno, faltas) {
  return await window.whatsappSender.notificarFrequencia(dadosAluno, faltas);
};

window.testarWhatsApp = async function() {
  return await window.whatsappSender.testarConexao();
};

// Função de teste para medidas disciplinares
window.testarMedidaDisciplinar = async function(tipoTeste = 'negativa') {
  const alunoTeste = {
    id: '2025001', // Usar ID real de um aluno no banco
    codigo: '2025001',
    nome: 'João Silva Santos',
    turma: '8A'
  };

  let medidaTeste;

  if (tipoTeste === 'positiva') {
    medidaTeste = {
      tipo: 'Elogio por Destaque Acadêmico',
      especificacao: 'Reconhecimento por excelente desempenho em atividades escolares',
      motivo: 'Participação exemplar nas aulas e auxílio aos colegas',
      providencias: 'Comunicação aos responsáveis e registro no histórico escolar',
      data: new Date().toLocaleDateString('pt-BR')
    };
  } else {
    medidaTeste = {
      tipo: 'Advertência',
      especificacao: 'Conforme Art. 15 do Regulamento Disciplinar - Comportamento inadequado',
      motivo: 'Conversas paralelas durante aula e desrespeito às orientações do professor',
      providencias: 'Orientação pedagógica e comunicação aos responsáveis',
      data: new Date().toLocaleDateString('pt-BR')
    };
  }

  console.log(`🧪 Testando medida ${tipoTeste}:`, medidaTeste);
  return await window.enviarMedidaDisciplinar(alunoTeste, medidaTeste);
};

// Função para testar normalização de telefones
window.testarNormalizacaoTelefone = function() {
  const exemplos = [
    '5566999138335',    // Formato com 5º dígito extra
    '556699138335',     // Formato correto
    '55 66 9 99138335', // Com espaços
    '(55) 66 9 9913-8335', // Formatado
    '66999138335',      // Sem código do país
    '99138335'          // Apenas número local
  ];

  console.log('🧪 Testando normalização de telefones:');
  exemplos.forEach(tel => {
    const normalizado = window.whatsappSender.normalizarTelefone(tel);
    console.log(`📞 ${tel} → ${normalizado}`);
  });
};

console.log('📱 WhatsApp Sender carregado - use: window.whatsappSender');
console.log('🧪 Para testar medidas: await testarMedidaDisciplinar("positiva") ou await testarMedidaDisciplinar("negativa")');
console.log('📞 Para testar telefones: testarNormalizacaoTelefone()');