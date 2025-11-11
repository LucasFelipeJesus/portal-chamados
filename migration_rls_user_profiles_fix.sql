-- =====================================================
-- CORRIGIR POLÍTICAS RLS PARA user_profiles
-- =====================================================
-- Garantir que admins e técnicos possam ver todos os perfis

-- 1. REMOVER políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem atualizar todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Técnicos podem ver todos os perfis" ON user_profiles;
DROP POLICY IF EXISTS "Técnicos podem atualizar perfis" ON user_profiles;
DROP POLICY IF EXISTS "Admins podem criar perfis" ON user_profiles;

-- 2. HABILITAR RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR FUNÇÃO AUXILIAR para verificar role sem recursão
-- Esta função usa SECURITY DEFINER para executar como superusuário
-- Criando no schema public ao invés de auth
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role::text = required_role
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- POLÍTICAS DE SELECT (Visualizar perfis)
-- =====================================================

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins podem ver todos os perfis"
ON user_profiles
FOR SELECT
USING (public.user_has_role('admin'));

-- Técnicos podem ver todos os perfis
CREATE POLICY "Técnicos podem ver todos os perfis"
ON user_profiles
FOR SELECT
USING (public.user_has_role('tecnico'));

-- =====================================================
-- POLÍTICAS DE UPDATE (Atualizar perfis)
-- =====================================================

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins podem atualizar todos os perfis
CREATE POLICY "Admins podem atualizar todos os perfis"
ON user_profiles
FOR UPDATE
USING (public.user_has_role('admin'))
WITH CHECK (public.user_has_role('admin'));

-- =====================================================
-- POLÍTICAS DE INSERT (Criar perfis - apenas admins)
-- =====================================================

CREATE POLICY "Admins podem criar perfis"
ON user_profiles
FOR INSERT
WITH CHECK (public.user_has_role('admin'));

-- =====================================================
-- VERIFICAR POLÍTICAS CRIADAS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
