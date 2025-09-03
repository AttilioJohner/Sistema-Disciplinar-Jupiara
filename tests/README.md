# 🧪 Testes - Sistema Disciplinar Jupiara

## Visão Geral

Esta pasta contém os testes para validar o sistema disciplinar baseado em views do Postgres. Os testes garantem que a migração do sistema de cálculos frontend para views do banco de dados está funcionando corretamente.

## Estrutura de Testes

### 📋 Testes de Integração (`integration-tests.html`)

**Propósito:** Validar a integração completa entre as camadas de dados e as views do Postgres.

**O que testa:**
- ✅ Conexão com Supabase
- ✅ Funcionamento das views:
  - `v_nota_disciplinar_atual`
  - `v_nota_disciplinar_contadores` 
  - `v_frequencia_acumulado_aluno`
  - `v_frequencia_diaria_turma`
  - `mv_frequencia_mensal_aluno` (materialized view)
- ✅ Camadas de dados (`data/notas.js` e `data/frequencia.js`)

**Como executar:**
1. Abra `integration-tests.html` no navegador
2. Os testes executam automaticamente após 3 segundos
3. Ou clique em "▶️ Executar Todos os Testes"

### 🔧 Testes Unitários (`unit-tests.html`)

**Propósito:** Validar as funções de utilidade e formatação.

**O que testa:**
- ✅ **NotasUtils:**
  - `formatarNota()` - Formatação de notas
  - `getCorNota()` - Classificação por cor
  - `getDescricaoNota()` - Descrições textuais
  - `isBonusAtivo()` - Lógica de bônus
  - `diasSemNegativas()` - Cálculo de dias
  
- ✅ **FrequenciaUtils:**
  - `formatarPercentual()` - Formatação de percentuais
  - `getCorPresenca()` - Classificação por cor
  - `getDescricaoPresenca()` - Descrições textuais
  - `isPresencaCritica()` - Detecção de presença crítica

**Como executar:**
1. Abra `unit-tests.html` no navegador
2. Os testes executam automaticamente após 1 segundo
3. Ou clique em "▶️ Executar Todos os Testes"

## 📊 Interpretação dos Resultados

### Status dos Testes

- ✅ **Verde/Sucesso:** Teste passou - funcionalidade está correta
- ❌ **Vermelho/Erro:** Teste falhou - requer investigação
- ⚠️ **Amarelo/Aviso:** Teste passou com ressalvas

### Métricas de Qualidade

- **Taxa de Aprovação:** Percentual de testes que passaram
- **Cobertura:** Aspectos do sistema testados
- **Performance:** Tempo de resposta das views

## 🚀 Executando os Testes

### Pré-requisitos

1. **Variáveis de Ambiente:** Configure `netlify-env.js` com as credenciais do Supabase
2. **Views Criadas:** Certifique-se de que todas as views estão criadas no Postgres
3. **Dados de Teste:** Tenha pelo menos alguns registros nas tabelas base

### Execução Manual

```bash
# Abrir no navegador
open tests/integration-tests.html
open tests/unit-tests.html
```

### Execução via Live Server (Recomendado)

```bash
# Com VS Code Live Server
# 1. Clique direito no arquivo HTML
# 2. Selecione "Open with Live Server"
```

## 🔍 Troubleshooting

### Problemas Comuns

**Erro: "Cliente Supabase não inicializado"**
- Verifique se `netlify-env.js` existe e contém as credenciais corretas
- Confirme se `supabase-config.js` está carregando corretamente

**Erro: "View não encontrada"**
- Verifique se as views foram criadas no Postgres
- Confirme as permissões de acesso às views

**Testes de integração falhando**
- Verifique a conexão com a internet
- Confirme se o Supabase está online
- Verifique se há dados nas tabelas base

**Testes unitários falhando**
- Pode indicar mudanças nas funções de utilidade
- Verifique se as especificações ainda estão corretas

## 📈 Melhorias Futuras

### Testes Adicionais Planejados

- [ ] **Testes de Performance:** Medir tempo de resposta das views
- [ ] **Testes de Carga:** Validar comportamento com muitos dados
- [ ] **Testes End-to-End:** Simular fluxos completos do usuário
- [ ] **Testes de Regressão:** Evitar quebras em atualizações

### Automação

- [ ] **CI/CD:** Integrar com GitHub Actions
- [ ] **Testes Automáticos:** Executar em cada deploy
- [ ] **Relatórios:** Gerar relatórios de cobertura

## 📝 Notas de Desenvolvimento

### Padrões de Teste

1. **Nomenclatura:** Usar nomes descritivos para os testes
2. **Isolamento:** Cada teste deve ser independente
3. **Clareza:** Mensagens de erro devem ser informativas
4. **Cobertura:** Testar casos normais e casos extremos

### Estrutura de Arquivos

```
tests/
├── README.md                 # Esta documentação
├── integration-tests.html    # Testes de integração
├── unit-tests.html          # Testes unitários
└── [futuros arquivos de teste]
```

---

**Sistema Disciplinar Jupiara**  
*Testes implementados em Janeiro de 2025*  
*Versão: Sistema View-Based com Postgres*