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

  // Enviar notificação de ocorrência disciplinar
  async notificarOcorrencia(dadosAluno, ocorrencia) {
    const telefone = dadosAluno.telefone1 || dadosAluno.telefone2;

    if (!telefone) {
      console.warn('⚠️ Aluno sem telefone cadastrado:', dadosAluno.nome);
      return { success: false, error: 'Telefone não cadastrado' };
    }

    const mensagem = this.formatarMensagemOcorrencia(dadosAluno, ocorrencia);
    return await this.enviarMensagem(telefone, mensagem);
  }

  // Formatar mensagem de ocorrência
  formatarMensagemOcorrencia(aluno, ocorrencia) {
    const data = new Date().toLocaleDateString('pt-BR');

    let mensagem = `🏫 *EECM Jupiara - Comunicado*\n\n`;
    mensagem += `👤 *Aluno:* ${aluno.nome}\n`;
    mensagem += `🏫 *Turma:* ${aluno.turma}\n`;
    mensagem += `📅 *Data:* ${data}\n\n`;

    mensagem += `📋 *Tipo:* ${ocorrencia.tipo}\n`;
    mensagem += `📝 *Descrição:* ${ocorrencia.descricao}\n\n`;

    if (ocorrencia.medida) {
      mensagem += `⚖️ *Medida Aplicada:* ${ocorrencia.medida}\n\n`;
    }

    mensagem += `📞 *Contato da Escola:*\n`;
    mensagem += `WhatsApp: (66) 8101-0652\n`;
    mensagem += `Email: eecmjupiara@gmail.com\n\n`;
    mensagem += `_Mensagem automática do Sistema Disciplinar_`;

    return mensagem;
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
window.enviarNotificacaoWhatsApp = async function(dadosAluno, ocorrencia) {
  return await window.whatsappSender.notificarOcorrencia(dadosAluno, ocorrencia);
};

window.enviarAvisoFrequencia = async function(dadosAluno, faltas) {
  return await window.whatsappSender.notificarFrequencia(dadosAluno, faltas);
};

window.testarWhatsApp = async function() {
  return await window.whatsappSender.testarConexao();
};

console.log('📱 WhatsApp Sender carregado - use: window.whatsappSender');