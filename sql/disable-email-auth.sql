-- Configurar Supabase para não exigir verificação de email

-- 1. Criar tabela de usuários do sistema (se não existir)
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

CREATE POLICY "usuarios_sistema_select" ON usuarios_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_sistema_insert" ON usuarios_sistema FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "usuarios_sistema_update" ON usuarios_sistema FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Inserir usuário administrador padrão
INSERT INTO usuarios_sistema (username, email, nome_completo, role) 
VALUES ('admin', 'admin@eecmjupiara.com.br', 'Administrador do Sistema', 'admin')
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = EXCLUDED.nome_completo,
    role = EXCLUDED.role,
    updated_at = now();

-- 5. Função para criar usuário sem verificação de email
CREATE OR REPLACE FUNCTION create_user_no_email_verification(
    p_username VARCHAR(50),
    p_email VARCHAR(100),
    p_password VARCHAR(100),
    p_nome_completo VARCHAR(200) DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    auth_user_id UUID;
BEGIN
    -- Validar se username já existe
    IF EXISTS (SELECT 1 FROM usuarios_sistema WHERE username = p_username) THEN
        RETURN json_build_object('success', false, 'error', 'Username já existe');
    END IF;
    
    -- Validar se email já existe
    IF EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = p_email) THEN
        RETURN json_build_object('success', false, 'error', 'Email já existe');
    END IF;
    
    -- Criar usuário no sistema de auth (sem confirmação)
    BEGIN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            confirmation_token,
            confirmed_at
        ) VALUES (
            gen_random_uuid(),
            p_email,
            crypt(p_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '',
            now()
        ) RETURNING id INTO auth_user_id;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'Erro ao criar usuário: ' || SQLERRM);
    END;
    
    -- Criar registro na tabela personalizada
    INSERT INTO usuarios_sistema (username, email, nome_completo)
    VALUES (p_username, p_email, COALESCE(p_nome_completo, p_username))
    RETURNING id INTO new_user_id;
    
    RETURN json_build_object(
        'success', true, 
        'user_id', new_user_id,
        'auth_user_id', auth_user_id,
        'message', 'Usuário criado com sucesso'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Erro geral: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;