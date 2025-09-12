// Script para separar emoji do texto nos títulos das páginas
// Aplica o gradient apenas no texto, mantendo a cor natural do emoji

document.addEventListener('DOMContentLoaded', function() {
    const moduleTitles = document.querySelectorAll('.module-title');
    
    moduleTitles.forEach(title => {
        const fullText = title.textContent.trim();
        
        // Regex para separar emoji do texto
        // Captura emojis no início da string seguidos de espaço e texto
        const match = fullText.match(/^([\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+)\s*(.+)$/u);
        
        if (match) {
            const emoji = match[1];
            const text = match[2];
            
            // Limpar o conteúdo original
            title.innerHTML = '';
            
            // Criar elementos separados
            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'title-emoji';
            emojiSpan.textContent = emoji;
            
            const textSpan = document.createElement('span');
            textSpan.className = 'title-text';
            textSpan.textContent = text;
            
            // Adicionar os elementos ao título
            title.appendChild(emojiSpan);
            title.appendChild(textSpan);
            
            console.log('✅ Título processado:', emoji, '+', text);
        }
    });
});