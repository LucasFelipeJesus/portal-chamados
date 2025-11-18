-- Migração: Adicionar campo de telefone ao perfil do usuário
-- Arquivo: migration_add_phone.sql

-- Adicionar coluna phone à tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentário explicativo
COMMENT ON COLUMN user_profiles.phone IS 
'Número de telefone do usuário para contato';
