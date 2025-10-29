# 📁 MIGRATIONS DO SUPABASE - Sistema Disciplinar Jupiara

Este diretório contém as migrations (alterações) do banco de dados Supabase.

---

## 📋 MIGRATIONS DISPONÍVEIS

### 001_adicionar_campos_pdf_ia.sql

**Descrição:** Adiciona estrutura completa para geração de PDF com IA

**O que faz:**
- ✅ Adiciona 11 colunas na tabela `medidas` para suporte a IA e PDF
- ✅ Cria tabela `documentos_pdf` para histórico de versões
- ✅ Cria índices para performance
- ✅ Cria function `gerar_numero_documento()` para numeração automática
- ✅ Adiciona triggers e comentários

**Status:** ⏳ Pendente de aplicação

---

## 🚀 COMO APLICAR AS MIGRATIONS

### Método 1: Via Dashboard do Supabase (RECOMENDADO)

1. Acesse: **https://supabase.com/dashboard**

2. Selecione seu projeto: **Sistema Disciplinar Jupiara**

3. No menu lateral, clique em: **SQL Editor**

4. Clique em: **+ New query**

5. Copie TODO o conteúdo do arquivo: `001_adicionar_campos_pdf_ia.sql`

6. Cole no editor SQL

7. Clique em: **RUN** (ou pressione Ctrl+Enter)

8. ✅ **Aguarde** a execução (pode levar 5-10 segundos)

9. Verifique se apareceu: **"Success. No rows returned"** ou lista de sucesso

10. **PRONTO!** As tabelas foram atualizadas

---

### Método 2: Via Supabase CLI (Avançado)

```bash
# 1. Instalar Supabase CLI (se não tiver)
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Link com o projeto
supabase link --project-ref SEU_PROJECT_ID

# 4. Aplicar migration
supabase db push
```

---

## ✅ COMO VERIFICAR SE A MIGRATION FOI APLICADA

Depois de aplicar, execute esta query no SQL Editor para confirmar:

```sql
-- Verificar se as colunas foram adicionadas
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'medidas'
  AND column_name IN (
    'fato_original',
    'fato_corrigido',
    'tipo_documento',
    'pdf_url'
  );

-- Verificar se a tabela documentos_pdf foi criada
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'documentos_pdf';

-- Testar a function de gerar número
SELECT gerar_numero_documento('FMD');
```

**Resultado esperado:**
- ✅ Deve listar as 4 colunas da tabela `medidas`
- ✅ Deve retornar `documentos_pdf`
- ✅ Deve retornar algo como: `FMD-2025-001`

---

## 📊 ESTRUTURA CRIADA

### Tabela `medidas` (COLUNAS ADICIONADAS)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `fato_original` | TEXT | Texto original escrito pelo inspetor |
| `fato_corrigido` | TEXT | Texto corrigido pela IA |
| `artigos_aplicaveis` | TEXT[] | Array de artigos (ex: ["Art. 6º"]) |
| `fundamento_legal` | TEXT | Texto da seção FUNDAMENTO |
| `tipo_documento` | VARCHAR(10) | FMD ou FO |
| `turno` | VARCHAR(20) | Matutino/Vespertino |
| `inspetor_responsavel` | VARCHAR(255) | Nome do inspetor |
| `status_documento` | VARCHAR(30) | rascunho/revisao/finalizado |
| `ia_historico` | JSONB | Histórico de sugestões da IA |
| `pdf_gerado_em` | TIMESTAMP | Data de geração do PDF |
| `pdf_url` | TEXT | URL do PDF no Storage |

### Tabela `documentos_pdf` (NOVA)

Armazena histórico de PDFs gerados com versionamento.

**Colunas principais:**
- `id` (PK)
- `medida_id` (FK → medidas)
- `numero_documento` (ex: FMD-2025-001)
- `tipo_documento` (FMD/FO)
- `codigo_matricula`, `nome_aluno`, `turma`
- `pdf_url`, `pdf_tamanho_bytes`, `pdf_hash`
- `assinado_aluno`, `assinado_responsavel`, `assinado_diretor`
- `versao`, `is_versao_atual`

---

## 🔒 SEGURANÇA

As migrations incluem:
- ✅ `IF NOT EXISTS` para evitar erros se já aplicadas
- ✅ `CHECK constraints` para validar dados
- ✅ Índices para performance
- ✅ Foreign keys para integridade referencial
- ✅ Triggers para atualizar timestamps automaticamente

**É seguro aplicar múltiplas vezes** - não vai quebrar se já estiver aplicada!

---

## 🐛 TROUBLESHOOTING

### Erro: "relation 'medidas' does not exist"

**Solução:** A tabela `medidas` não existe no banco. Verifique se está no banco correto.

### Erro: "column already exists"

**Solução:** A migration já foi aplicada antes. Isso é normal! Pode ignorar.

### Erro: "permission denied"

**Solução:** Verifique se está logado como owner do projeto no Supabase.

---

## 📝 PRÓXIMOS PASSOS

Após aplicar a migration:

1. ✅ Configurar Supabase Storage (bucket para PDFs)
2. ✅ Atualizar código JavaScript para usar novos campos
3. ✅ Testar fluxo completo de criação → IA → PDF

---

**Dúvidas?** Consulte a documentação ou entre em contato! 🚀
