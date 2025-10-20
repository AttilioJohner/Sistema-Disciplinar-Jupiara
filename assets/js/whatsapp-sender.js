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

  // Aguardar inicialização do Supabase
  async aguardarInicializacaoSupabase(timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkSupabase = () => {
        if (window.supabaseClient || window.supabase) {
          console.log('✅ Cliente Supabase inicializado com sucesso');
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          console.error(`❌ Timeout aguardando Supabase (${timeout}ms)`);
          resolve(false);
          return;
        }

        setTimeout(checkSupabase, 100);
      };

      checkSupabase();
    });
  }

  // Normalizar número de telefone (remover 5º dígito se presente)
  normalizarTelefone(telefone) {
    if (!telefone) return null;

    // Converter para string se for number/bigint do Postgres
    const telefoneStr = String(telefone);

    // Remover espaços, parênteses, traços
    const numeroLimpo = telefoneStr.replace(/[\s\(\)\-]/g, '');

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

  // Buscar telefone do responsável usando Supabase diretamente
  async buscarTelefoneResponsavel(alunoId) {
    try {
      console.log(`🔍 Buscando telefone para aluno ID: ${alunoId}`);

      // Usar cliente Supabase diretamente (disponível globalmente)
      if (!window.supabaseClient) {
        console.log('🔍 window.supabaseClient não encontrado, tentando window.supabase...');
        if (!window.supabase) {
          throw new Error('Cliente Supabase não inicializado. Verifique se a página carregou completamente.');
        }
      }

      const clienteSupabase = window.supabaseClient || window.supabase;
      console.log('🔗 Usando cliente Supabase:', clienteSupabase ? 'Disponível' : 'Não disponível');

      // Buscar dados do aluno na tabela alunos
      const { data: dadosAluno, error } = await clienteSupabase
        .from('alunos')
        .select('*')
        .eq('codigo', parseInt(alunoId))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`⚠️ Aluno não encontrado: ${alunoId}`);
          return null;
        }
        throw error;
      }

      if (!dadosAluno) {
        console.warn(`⚠️ Nenhum dado retornado para aluno: ${alunoId}`);
        return null;
      }
      console.log(`📋 Dados do aluno encontrados:`, {
        id: alunoId,
        nome: dadosAluno['Nome completo'] || dadosAluno.nome_completo || dadosAluno.nome,
        'Telefone do responsável': dadosAluno['Telefone do responsável'],
        'Telefone do responsável 2': dadosAluno['Telefone do responsável 2'],
        responsavel1: dadosAluno.responsavel1,
        telefone_responsavel: dadosAluno.telefone_responsavel,
        telefone1: dadosAluno.telefone1,
        telefone: dadosAluno.telefone,
        // Log todos os campos para debug
        camposDisponiveis: Object.keys(dadosAluno)
      });

      // Tentar diferentes campos de telefone baseados no schema real
      const telefoneResponsavel = dadosAluno['Telefone do responsável'] ||
                                 dadosAluno['Telefone do responsável 2'] ||
                                 dadosAluno.responsavel1 ||
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
    // Usar a data fornecida na medida ou a data atual como fallback
    let data;
    if (medida.data) {
      // Se a data vem no formato YYYY-MM-DD (input HTML), formatá-la corretamente
      if (medida.data.includes('-') && medida.data.length === 10) {
        const [ano, mes, dia] = medida.data.split('-');
        const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        data = dataLocal.toLocaleDateString('pt-BR');
      } else {
        data = medida.data; // Se já está formatada, usar como está
      }
    } else {
      // Usar data de hoje no timezone local (sem conversão UTC)
      const hoje = new Date();
      data = hoje.toLocaleDateString('pt-BR');
    }
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

    mensagem += `📲 Essa é uma mensagem automática. Em caso de dúvidas, entre em contato com a Gestão Cívico-Militar pelo telefone ou WhatsApp: (66) 98111-4366.`;

    return mensagem;
  }

  // Verificar se medida é positiva
  isMedidaPositiva(tipo) {
    const tiposPositivos = [
      'elogio',
      'parabéns',
      'destaque',
      'reconhecimento',
      'mérito',
      'positivo',  // Para "Fato Observado Positivo"
      'fato observado positivo',
      'comportamento exemplar',
      'destaque acadêmico'
    ];
    return tiposPositivos.some(tipoPos => tipo.toLowerCase().includes(tipoPos));
  }

  // Formatar mensagem de ocorrência (mantido para compatibilidade)
  formatarMensagemOcorrencia(aluno, ocorrencia) {
    return this.formatarMensagemMedidaDisciplinar(aluno, ocorrencia);
  }

  // Enviar aviso de frequência
  async notificarFrequencia(dadosAluno, dadosFalta) {
    // Buscar telefone real do responsável (igual nas medidas)
    const telefone = await this.buscarTelefoneResponsavel(dadosAluno.id || dadosAluno.codigo);

    if (!telefone) {
      console.warn('⚠️ Aluno sem telefone cadastrado:', dadosAluno.nome);
      return { success: false, error: 'Telefone não cadastrado para este aluno' };
    }

    console.log(`📱 Enviando WhatsApp de frequência para: ${telefone}`);
    const mensagem = this.formatarMensagemFrequencia(dadosAluno, dadosFalta);
    return await this.enviarMensagem(telefone, mensagem);
  }

  // Formatar mensagem de frequência
  formatarMensagemFrequencia(aluno, dadosFalta) {
    let dataFormatada;
    if (dadosFalta.data) {
      // Se a data vem no formato YYYY-MM-DD (input HTML), criar data sem problemas de timezone
      if (dadosFalta.data.includes('-') && dadosFalta.data.length === 10) {
        const [ano, mes, dia] = dadosFalta.data.split('-');
        const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        dataFormatada = dataLocal.toLocaleDateString('pt-BR');
      } else {
        dataFormatada = dadosFalta.data; // Se já está formatada, usar como está
      }
    } else {
      // Usar data de hoje no timezone local (sem conversão UTC)
      const hoje = new Date();
      dataFormatada = hoje.toLocaleDateString('pt-BR');
    }

    let mensagem = `Bom dia!\n`;
    mensagem += `Prezados Pais e/ou Responsáveis, a Equipe de Gestão Cívico-Militar da EECM Jupiara informa:\n\n`;

    mensagem += `👤 Aluno: ${aluno.nome}\n`;
    mensagem += `🆔 Código: ${aluno.codigo || aluno.id}\n`;
    mensagem += `🏫 Turma: ${aluno.turma}\n`;
    mensagem += `📅 Data da Ocorrência: ${dataFormatada}\n\n`;

    mensagem += `⚠️ Informo que o aluno não compareceu na escola na data especificada acima.\n\n`;

    mensagem += `📲 Essa é uma mensagem automática. Em caso de atestados médicos, justificativas e dúvidas, entre em contato com a Gestão Cívico-Militar pelo telefone ou WhatsApp: (66) 98111-4366.`;

    return mensagem;
  }

  // Enviar mensagem personalizada
  async enviarMensagemPersonalizada(telefone, titulo, conteudo) {
    const data = new Date().toLocaleDateString('pt-BR');

    let mensagem = `🏫 *EECM Jupiara - ${titulo}*\n\n`;
    mensagem += `📅 *Data:* ${data}\n\n`;
    mensagem += `${conteudo}\n\n`;
    mensagem += `📞 *Contato da Escola:*\n`;
    mensagem += `WhatsApp: (66) 98111-4366\n`;
    mensagem += `Email: eecmjupiara@gmail.com\n\n`;
    mensagem += `_Mensagem automática do Sistema Disciplinar_`;

    return await this.enviarMensagem(telefone, mensagem);
  }

  // Enviar mensagem em massa para todos os contatos
  async enviarMensagemEmMassa(mensagem, opcoes = {}) {
    const {
      unidade = null,  // Filtrar por unidade específica (null = todas)
      turma = null,    // Filtrar por turma específica
      delayEntreMensagens = 2000,  // Delay em ms entre cada envio (2s padrão)
      simular = false  // Se true, apenas simula sem enviar
    } = opcoes;

    console.log('📢 INICIANDO ENVIO EM MASSA');
    console.log('Opções:', { unidade, turma, delayEntreMensagens, simular });

    try {
      // Verificar se Supabase está disponível
      const clienteSupabase = window.supabaseClient || window.supabase;
      if (!clienteSupabase) {
        throw new Error('Cliente Supabase não disponível');
      }

      // Buscar alunos com filtros
      let query = clienteSupabase
        .from('alunos')
        .select('codigo, "Nome completo", turma, unidade, "Telefone do responsável", "Telefone do responsável 2"');

      if (unidade) {
        query = query.eq('unidade', unidade);
      }
      if (turma) {
        query = query.eq('turma', turma);
      }

      const { data: alunos, error } = await query;

      if (error) throw error;

      console.log(`📊 ${alunos.length} alunos encontrados`);

      // Extrair telefones únicos
      const telefonesMap = new Map(); // telefone -> array de alunos
      let alunosSemTelefone = [];

      alunos.forEach(aluno => {
        const tel1 = aluno['Telefone do responsável'];
        const tel2 = aluno['Telefone do responsável 2'];

        if (tel1 || tel2) {
          const telefones = [tel1, tel2].filter(Boolean);

          telefones.forEach(tel => {
            const telNormalizado = this.normalizarTelefone(tel);
            if (telNormalizado) {
              if (!telefonesMap.has(telNormalizado)) {
                telefonesMap.set(telNormalizado, []);
              }
              telefonesMap.get(telNormalizado).push({
                nome: aluno['Nome completo'],
                turma: aluno.turma,
                codigo: aluno.codigo
              });
            }
          });
        } else {
          alunosSemTelefone.push({
            codigo: aluno.codigo,
            nome: aluno['Nome completo'],
            turma: aluno.turma
          });
        }
      });

      const totalTelefones = telefonesMap.size;
      console.log(`📱 ${totalTelefones} telefones únicos identificados`);
      console.log(`⚠️ ${alunosSemTelefone.length} alunos sem telefone cadastrado`);

      if (simular) {
        console.log('🧪 MODO SIMULAÇÃO - Não enviando mensagens reais');
        return {
          success: true,
          simulacao: true,
          estatisticas: {
            totalAlunos: alunos.length,
            totalTelefones: totalTelefones,
            alunosSemTelefone: alunosSemTelefone.length,
            detalhesSemTelefone: alunosSemTelefone
          },
          preview: {
            mensagem: mensagem,
            primeirosTelefones: Array.from(telefonesMap.entries()).slice(0, 5).map(([tel, alunos]) => ({
              telefone: tel,
              alunos: alunos.map(a => a.nome)
            }))
          }
        };
      }

      // Enviar mensagens com delay
      const resultados = {
        enviados: [],
        falhas: [],
        total: totalTelefones
      };

      let contador = 0;
      for (const [telefone, alunosDoTelefone] of telefonesMap) {
        contador++;
        console.log(`📤 [${contador}/${totalTelefones}] Enviando para ${telefone} (${alunosDoTelefone.length} aluno(s))`);

        const resultado = await this.enviarMensagem(telefone, mensagem);

        if (resultado.success) {
          resultados.enviados.push({
            telefone,
            alunos: alunosDoTelefone
          });
        } else {
          resultados.falhas.push({
            telefone,
            alunos: alunosDoTelefone,
            erro: resultado.error
          });
        }

        // Delay entre envios (exceto no último)
        if (contador < totalTelefones) {
          await new Promise(resolve => setTimeout(resolve, delayEntreMensagens));
        }
      }

      const estatisticas = {
        totalAlunos: alunos.length,
        totalTelefones: totalTelefones,
        enviados: resultados.enviados.length,
        falhas: resultados.falhas.length,
        alunosSemTelefone: alunosSemTelefone.length,
        taxaSucesso: ((resultados.enviados.length / totalTelefones) * 100).toFixed(1) + '%'
      };

      console.log('✅ ENVIO EM MASSA CONCLUÍDO');
      console.log('Estatísticas:', estatisticas);

      return {
        success: true,
        estatisticas,
        resultados,
        alunosSemTelefone
      };

    } catch (error) {
      console.error('❌ Erro no envio em massa:', error);
      return {
        success: false,
        error: error.message
      };
    }
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

// Função para testar detecção de medidas positivas
window.testarDeteccaoPositiva = function() {
  const tiposTeste = [
    'Fato Observado Positivo',
    'Elogio por Destaque Acadêmico',
    'Advertência',
    'Suspensão',
    'Reconhecimento por Mérito',
    'Comportamento Exemplar'
  ];

  console.log('🧪 Testando detecção de medidas positivas:');
  tiposTeste.forEach(tipo => {
    const isPositiva = window.whatsappSender.isMedidaPositiva(tipo);
    console.log(`${isPositiva ? '✅' : '❌'} "${tipo}" → ${isPositiva ? 'POSITIVA' : 'NEGATIVA'}`);
  });
};

// Função global para envio em massa
window.enviarWhatsAppEmMassa = async function(mensagem, opcoes = {}) {
  return await window.whatsappSender.enviarMensagemEmMassa(mensagem, opcoes);
};

// Função de simulação para testar antes de enviar
window.simularEnvioEmMassa = async function(mensagem, opcoes = {}) {
  return await window.whatsappSender.enviarMensagemEmMassa(mensagem, { ...opcoes, simular: true });
};

// Exemplos de uso no console
window.exemplosEnvioMassa = function() {
  console.log(`
📢 EXEMPLOS DE ENVIO EM MASSA:

1️⃣ SIMULAR envio para TODOS os alunos:
await simularEnvioEmMassa("Mensagem de teste")

2️⃣ SIMULAR envio apenas para a Sede:
await simularEnvioEmMassa("Mensagem de teste", { unidade: 'Sede' })

3️⃣ SIMULAR envio para turma específica:
await simularEnvioEmMassa("Mensagem de teste", { turma: '7A' })

4️⃣ ENVIAR REAL para todos da Sede (delay 2s entre mensagens):
await enviarWhatsAppEmMassa("Atenção pais! Amanhã haverá reunião às 19h.", { unidade: 'Sede' })

5️⃣ ENVIAR com delay maior (5s) para evitar bloqueio:
await enviarWhatsAppEmMassa("Mensagem importante", {
  unidade: 'Sede',
  delayEntreMensagens: 5000
})

6️⃣ ENVIAR para turma específica:
await enviarWhatsAppEmMassa("Aviso para os pais da 7A", { turma: '7A' })

⚠️ IMPORTANTE:
- SEMPRE use simularEnvioEmMassa() primeiro para conferir!
- Telefones duplicados são enviados apenas 1 vez
- Delay padrão: 2 segundos entre mensagens
- A função normaliza telefones automaticamente
  `);
};

console.log('📱 WhatsApp Sender carregado - use: window.whatsappSender');
console.log('🧪 Para testar medidas: await testarMedidaDisciplinar("positiva") ou await testarMedidaDisciplinar("negativa")');
console.log('📞 Para testar telefones: testarNormalizacaoTelefone()');
console.log('✅ Para testar detecção: testarDeteccaoPositiva()');
console.log('📢 NOVO: Envio em massa disponível! Digite exemplosEnvioMassa() para ver como usar');