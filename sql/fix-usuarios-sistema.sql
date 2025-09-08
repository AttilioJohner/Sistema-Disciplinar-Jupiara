-- Script simplificado para criar/corrigir tabela usuarios_sistema

-- 1. Dropar tabela se existir com estrutura errada
DROP TABLE IF EXISTS usuarios_sistema CASCADE;

-- 2. Criar tabela nova com estrutura correta
CREATE TABLE usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nome_completo VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas simples (permitir tudo para autenticados)
CREATE POLICY "usuarios_sistema_all" 
ON usuarios_sistema 
FOR ALL 
TO authenticated, anon
USING (true) 
WITH CHECK (true);

-- 5. Inserir admin padrão
INSERT INTO usuarios_sistema (username, email, nome_completo, role) 
VALUES 
    ('admin', 'admin@eecmjupiara.com.br', 'Administrador do Sistema', 'admin'),
    ('teste', 'teste@escola.com', 'Usuário de Teste', 'user')
ON CONFLICT DO NOTHING;

-- 6. Criar índices
CREATE INDEX idx_usuarios_username ON usuarios_sistema(username);
CREATE INDEX idx_usuarios_email ON usuarios_sistema(email);

-- 7. Verificar se funcionou
SELECT * FROM usuarios_sistema;