-- =====================================================
-- POLÍTICAS RLS PARA user_profiles
-- =====================================================
-- Estas políticas garantem que os usuários possam ler e atualizar seus próprios perfis

-- 1. HABILITAR RLS na tabela user_profiles (se ainda não estiver)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 2. PERMITIR que usuários vejam seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. PERMITIR que usuários atualizem seu próprio perfil
-- (necessário para alterar senha, telefone, etc.)
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. PERMITIR que admins vejam todos os perfis
CREATE POLICY "Admins podem ver todos os perfis"
ON user_profiles
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 5. PERMITIR que admins atualizem todos os perfis
CREATE POLICY "Admins podem atualizar todos os perfis"
ON user_profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================
-- Execute este comando para ver todas as políticas da tabela user_profiles:
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS (se necessário)
-- =====================================================
-- Se houver políticas antigas que estão causando conflito, remova-as:
-- DROP POLICY IF EXISTS "nome_da_política_antiga" ON user_profiles;
