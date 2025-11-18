-- =====================================================
-- CORREÇÃO: Validar empresa na criação de tickets
-- =====================================================
-- Problema: Usuários conseguem abrir chamados para empresas
-- que não estão vinculadas a eles.
-- Solução: Atualizar políticas RLS para validar relacionamento usuário-empresa

-- REMOVER políticas antigas de INSERT
DROP POLICY IF EXISTS "Clientes podem criar tickets" ON tickets;
DROP POLICY IF EXISTS "Técnicos podem criar tickets" ON tickets;
DROP POLICY IF EXISTS "Admins podem criar tickets" ON tickets;

-- =====================================================
-- NOVA POLÍTICA: Clientes podem criar tickets APENAS para empresas vinculadas
-- =====================================================
CREATE POLICY "Clientes podem criar tickets para empresas vinculadas"
ON tickets
FOR INSERT
WITH CHECK (
    -- Usuário deve ser cliente
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'cliente'
    )
    -- E a empresa deve estar vinculada ao usuário
    AND (
        company_id IN (
            SELECT company_id FROM user_profiles WHERE id = auth.uid()
            UNION
            SELECT UNNEST(additional_company_ids) FROM user_profiles WHERE id = auth.uid()
        )
    )
);

-- =====================================================
-- POLÍTICAS PARA TÉCNICOS E ADMINS (mantém sem restrição de empresa)
-- =====================================================

-- Técnicos podem criar tickets para qualquer empresa
CREATE POLICY "Técnicos podem criar tickets"
ON tickets
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'tecnico'
    )
);

-- Admins podem criar tickets para qualquer empresa
CREATE POLICY "Admins podem criar tickets"
ON tickets
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- VERIFICAR POLÍTICAS ATUALIZADAS
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
WHERE tablename = 'tickets'
AND cmd = 'INSERT'
ORDER BY policyname;