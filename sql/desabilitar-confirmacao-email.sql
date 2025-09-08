-- EXECUTAR ESTE SQL NO SUPABASE PARA REMOVER CONFIRMAÇÃO DE EMAIL
-- Copie e cole no SQL Editor do seu projeto Supabase

-- 1. PRIMEIRO: Vá no dashboard do Supabase e faça:
-- Authentication > Settings > Email > "Enable email confirmations" = DESATIVAR

-- 2. Se não conseguir desativar no dashboard, execute este SQL:

-- Auto-confirmar usuários automaticamente quando criados
CREATE OR REPLACE FUNCTION public.auto_confirm_users() 
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirmar imediatamente
  NEW.email_confirmed_at = NOW();
  NEW.phone_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS auto_confirm_trigger ON auth.users;

-- Criar trigger para auto-confirmar
CREATE TRIGGER auto_confirm_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_users();

-- Confirmar usuários existentes que não foram confirmados
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  phone_confirmed_at = COALESCE(phone_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR phone_confirmed_at IS NULL;

-- Verificar se funcionou
SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado' 
    ELSE '❌ Não confirmado' 
  END as status
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;