# Sistema Disciplinar Jupiara 🏫

Dashboard completo para gestão disciplinar escolar com integração Supabase e deploy automático na Netlify.

**Status**: Sistema em produção - Deploy automático ativo (teste de deploy)

## 🚀 Características

- **Sistema Híbrido**: Funciona com Supabase (produção) ou armazenamento local (desenvolvimento)
- **Autenticação Segura**: Sistema de login integrado com Supabase Auth
- **Interface Responsiva**: Design moderno e intuitivo
- **Deploy Automático**: Configurado para Netlify com CI/CD
- **Fallback Inteligente**: Continua funcionando mesmo sem internet

## 📋 Funcionalidades

- 👥 **Gestão de Alunos**: Cadastro, edição e consulta de alunos
- 📋 **Medidas Disciplinares**: Registro e acompanhamento de ocorrências
- 📅 **Controle de Frequência**: Monitoramento de faltas e presenças
- 📊 **Relatórios**: Análises estatísticas e relatórios personalizados
- 📈 **Dashboard**: Visão geral com indicadores importantes
- 🔐 **Autenticação**: Sistema seguro de login e controle de acesso

## 🛠️ Configuração Local

### 1. Clone o repositório
```bash
git clone https://github.com/AttilioJohner/Sistema-Disciplinar-Jupiara.git
cd Sistema-Disciplinar-Jupiara
```

### 2. Configurar variáveis de ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite as variáveis com suas credenciais do Supabase
```

### 3. Executar localmente
```bash
# Opção 1: Servidor Python
python -m http.server 8000

# Opção 2: Servidor Node.js
npx serve .

# Opção 3: Live Server (VS Code)
# Use a extensão Live Server
```

Acesse: http://localhost:8000

## ☁️ Deploy na Netlify

### 1. Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta/projeto
3. Anote a **URL do projeto** e a **chave anônima**

### 2. Configurar Netlify
1. Conecte seu repositório GitHub à Netlify
2. Configure as variáveis de ambiente:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima-aqui
NODE_ENV=production
```

### 3. Deploy automático
- Cada push na branch `main` faz deploy automático
- Netlify usa as configurações em `netlify.toml`

## 📊 Estrutura do Banco de Dados

O sistema cria automaticamente as seguintes tabelas no Supabase:

### `alunos`
- `id` (text, primary key)
- `nome` (text)
- `turma` (text)
- `nascimento` (date)
- `responsavel` (text)
- `cpf` (text)
- `ativo` (boolean)
- `criadoEm` (timestamp)
- `atualizadoEm` (timestamp)

### `medidas`
- `id` (text, primary key)
- `alunoId` (text, foreign key)
- `tipo` (text)
- `descricao` (text)
- `data` (date)
- `professor` (text)
- `status` (text)
- `criadoEm` (timestamp)

> Para compatibilidade com trechos legados, crie uma *view* opcional:
>
> ```sql
> create or replace view public.medidas_disciplinares as select * from public.medidas;
> ```

### `frequencia_diaria`
- `id` (text, primary key)
- `alunoId` (text, foreign key)
- `data` (date)
- `presente` (boolean)
- `justificada` (boolean)
- `observacoes` (text)

## 🔐 Configuração de Segurança

### Row Level Security (RLS)
Configure as seguintes políticas no Supabase:

```sql
-- Habilitar RLS
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia_diaria ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver tudo" ON alunos
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver tudo" ON medidas
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem ver tudo" ON frequencia_diaria
FOR ALL USING (auth.role() = 'authenticated');
```

## 📁 Estrutura do Projeto

```
Sistema-Disciplinar-Jupiara/
├── index.html              # Página principal
├── netlify.toml            # Configurações da Netlify
├── .env.example            # Exemplo de variáveis de ambiente
├── _headers                # Cabeçalhos HTTP
├── _redirects              # Redirecionamentos
│
├── assets/
│   ├── css/
│   │   ├── style.css       # Estilos principais
│   │   ├── components.css  # Componentes
│   │   └── dashboard.css   # Dashboard específico
│   │
│   ├── js/
│   │   ├── env-config.js   # Configurações de ambiente
│   │   ├── config.js       # Configurações globais
│   │   ├── supabase-config.js  # Cliente Supabase
│   │   ├── supabase-auth.js    # Autenticação Supabase
│   │   ├── local-db.js     # Banco local (fallback)
│   │   └── local-auth.js   # Autenticação local
│   │
│   └── images/
│       └── logo-escola.jpeg
│
├── pages/
│   ├── login.html          # Página de login
│   ├── gestao-alunos.html  # Gestão de alunos
│   ├── medidas-disciplinares.html
│   ├── frequencia.html     # Controle de frequência
│   ├── relatorios.html     # Relatórios
│   └── analises.html       # Análises estatísticas
│
└── data/
    └── *.json              # Dados de fallback local
```

## 🧪 Testando o Sistema

### Modo Desenvolvimento (Local)
- Sistema usa armazenamento local automaticamente
- Debug habilitado no console
- Dados salvos no localStorage do navegador

### Modo Produção (Netlify)
- Sistema conecta automaticamente ao Supabase
- Fallback para modo local se houver problemas
- Logs reduzidos para performance

## 🔧 Variáveis de Ambiente Necessárias

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | Produção |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase | Produção |
| `NODE_ENV` | Ambiente (development/production) | Não |
| `DEBUG_ENABLED` | Habilitar debug | Não |

## Supabase

Crie um arquivo `config.js` baseado em `config.example.js` na raiz do projeto. Ele deve definir as chaves:

```js
window.__ENV = {
  SUPABASE_URL: "https://...supabase.co",
  SUPABASE_ANON_KEY: "..."
};
```

O arquivo `config.js` não deve ser commitado.

## 📞 Suporte

### Problemas Comuns

1. **Erro de conexão Supabase**
   - Verifique se as variáveis de ambiente estão corretas
   - Confirme que o projeto Supabase está ativo

2. **Dados não salvam**
   - Verifique as políticas RLS no Supabase
   - Confirme que o usuário está autenticado

3. **Login não funciona**
   - Verifique se a autenticação está habilitada no Supabase
   - Confirme as URLs de redirecionamento

### Debug
- Abra o Console do navegador (F12)
- Procure por mensagens com prefixo `[SISTEMA]`
- Verifique a aba Network para erros de API

## 📝 Próximos Passos Após Deploy

1. **Configurar Supabase**:
   - Criar projeto
   - Configurar autenticação
   - Definir políticas RLS

2. **Configurar Netlify**:
   - Adicionar variáveis de ambiente
   - Configurar domínio personalizado (opcional)

3. **Primeiro Acesso**:
   - Criar conta de usuário
   - Importar dados existentes (se houver)
   - Configurar perfis de acesso

4. **Manutenção**:
   - Backups regulares via Supabase
   - Monitorar logs no Netlify
   - Atualizar dependências

## 📄 Licença

MIT License - você pode usar livremente para projetos educacionais.

---

**Sistema Disciplinar Jupiara** - Desenvolvido com ❤️ para educação
