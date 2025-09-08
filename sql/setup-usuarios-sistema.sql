-- ========================================
-- CONFIGURAÇÃO DE USUÁRIOS SEM EMAIL AUTH
-- ========================================

-- 1. Criar tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nome_completo VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 2. Habilitar RLS na tabela
ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas para usuários autenticados
DROP POLICY IF EXISTS "usuarios_sistema_select" ON usuarios_sistema;
DROP POLICY IF EXISTS "usuarios_sistema_insert" ON usuarios_sistema;
DROP POLICY IF EXISTS "usuarios_sistema_update" ON usuarios_sistema;

CREATE POLICY "usuarios_sistema_select" 
ON usuarios_sistema FOR SELECT 
TO authenticated, anon 
USING (true);

CREATE POLICY "usuarios_sistema_insert" 
ON usuarios_sistema FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "usuarios_sistema_update" 
ON usuarios_sistema FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 4. Inserir usuário administrador padrão (se não existir)
INSERT INTO usuarios_sistema (username, email, nome_completo, role) 
VALUES ('admin', 'admin@eecmjupiara.com.br', 'Administrador do Sistema', 'admin')
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = EXCLUDED.nome_completo,
    role = EXCLUDED.role,
    updated_at = now();

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_username ON usuarios_sistema(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_email ON usuarios_sistema(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_ativo ON usuarios_sistema(ativo);

-- 6. Comentário na tabela
COMMENT ON TABLE usuarios_sistema IS 'Tabela de mapeamento username->email para login sem verificação de email';
COMMENT ON COLUMN usuarios_sistema.username IS 'Nome de usuário único para login';
COMMENT ON COLUMN usuarios_sistema.email IS 'Email associado ao usuário (usado internamente para auth)';
COMMENT ON COLUMN usuarios_sistema.role IS 'Papel do usuário: admin, user, etc';
COMMENT ON COLUMN usuarios_sistema.ativo IS 'Se o usuário está ativo no sistema';