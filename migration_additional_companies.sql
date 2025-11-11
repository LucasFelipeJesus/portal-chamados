-- Migração: Adicionar suporte a múltiplas empresas por usuário
-- Arquivo: migration_additional_companies.sql

-- Adicionar coluna para armazenar IDs de empresas adicionais (além da empresa principal)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS additional_company_ids UUID[];

-- Criar índice GIN para melhorar performance de queries com arrays
CREATE INDEX IF NOT EXISTS idx_user_profiles_additional_companies 
ON user_profiles USING GIN (additional_company_ids);

-- Comentários explicativos
COMMENT ON COLUMN user_profiles.additional_company_ids IS 
'Array de UUIDs das empresas adicionais vinculadas ao usuário (além da empresa principal em company_id)';
