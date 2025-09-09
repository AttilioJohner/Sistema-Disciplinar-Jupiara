-- Criar tabela para gestão de usuários com user_id do Supabase Auth

-- Dropar tabela se existe (cuidado: apaga dados!)
-- DROP TABLE IF EXISTS usuarios_sistema;

CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nome_completo VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT now()
);

-- Se a tabela já existe mas não tem user_id, adicionar coluna
DO $$
BEGIN
    -- Adicionar coluna user_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'usuarios_sistema' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE usuarios_sistema ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Permitir acesso para todos (sem RLS por simplicidade)
ALTER TABLE usuarios_sistema DISABLE ROW LEVEL SECURITY;

-- Inserir usuário admin padrão
INSERT INTO usuarios_sistema (username, email, nome_completo, role) 
VALUES ('admin', 'admin@eecmjupiara.com.br', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Ver resultado
SELECT * FROM usuarios_sistema;