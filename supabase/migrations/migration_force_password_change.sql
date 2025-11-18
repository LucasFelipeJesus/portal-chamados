-- Migração: Adicionar flag para forçar troca de senha no primeiro acesso
-- Arquivo: migration_force_password_change.sql

-- Adicionar coluna force_password_change à tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de queries que filtram usuários que precisam trocar senha
CREATE INDEX IF NOT EXISTS idx_user_profiles_force_password_change 
ON user_profiles (force_password_change) 
WHERE force_password_change = true;

-- Comentário explicativo
COMMENT ON COLUMN user_profiles.force_password_change IS 
'Flag que indica se o usuário deve trocar a senha no próximo login (obrigatório para novos usuários)';
