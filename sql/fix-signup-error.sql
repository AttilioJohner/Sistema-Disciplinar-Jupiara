-- CORRIGIR ERRO "Database error saving new user"
-- Execute este SQL no Supabase para remover triggers problemáticos

-- 1. REMOVER TODOS OS TRIGGERS que podem estar causando erro
DROP TRIGGER IF EXISTS auto_confirm_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- 2. REMOVER FUNÇÕES que podem estar causando problema  
DROP FUNCTION IF EXISTS public.auto_confirm_users();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. VERIFICAR se existe algum trigger ativo na tabela auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- 4. CONFIRMAR usuários existentes manualmente (sem trigger)
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  phone_confirmed_at = COALESCE(phone_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 5. VERIFICAR se agora está funcionando
SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado' 
    ELSE '❌ Precisa confirmar' 
  END as status
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;