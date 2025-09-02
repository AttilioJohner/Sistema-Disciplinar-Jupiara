#!/usr/bin/env node
// SCRIPT PARA ATUALIZAR VERSÃO DO SISTEMA
// Executa antes do deploy para atualizar timestamps de cache

const fs = require('fs');
const path = require('path');

// Gerar nova versão baseada em timestamp
const now = new Date();
const version = `v2.2.0-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;

console.log(`🔄 Atualizando versão para: ${version}`);

// Arquivos para atualizar
const files = [
    './index.html',
    './pages/login.html',
    './pages/gestao-alunos.html', 
    './pages/analises.html',
    './sw.js',
    './assets/js/cache-buster.js'
];

// Função para atualizar arquivo
function updateVersion(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Patterns para atualizar
    const patterns = [
        // Meta tag de versão
        /(content="v[\d\.]+-\d+)/g,
        // Cache version em SW
        /(CACHE_VERSION = ')v[\d\.]+-[^']+/g,
        // Version em JS
        /(currentVersion.*v[\d\.]+-)[^'"]+/g
    ];
    
    let updated = false;
    
    patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            const oldContent = content;
            content = content.replace(pattern, (match) => {
                return match.replace(/v[\d\.]+-[^'"]+/, version);
            });
            
            if (content !== oldContent) {
                updated = true;
            }
        }
    });
    
    if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Atualizado: ${filePath}`);
    } else {
        console.log(`ℹ️ Sem mudanças: ${filePath}`);
    }
}

// Atualizar todos os arquivos
files.forEach(updateVersion);

// Criar arquivo de versão para referência
fs.writeFileSync('./VERSION.txt', `${version}\n${now.toISOString()}`);

console.log(`✅ Versioning completo: ${version}`);
console.log('📝 Não esqueça de fazer commit das mudanças!');