-- Criar tabela simples para mapear username -> email

CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    nome_completo VARCHAR(200),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT now()
);

-- Permitir acesso para todos (sem RLS por simplicidade)
ALTER TABLE usuarios_sistema DISABLE ROW LEVEL SECURITY;

-- Inserir usuário admin padrão
INSERT INTO usuarios_sistema (username, email, nome_completo, role) 
VALUES ('admin', 'admin@eecmjupiara.com.br', 'Administrador', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Ver resultado
SELECT * FROM usuarios_sistema;