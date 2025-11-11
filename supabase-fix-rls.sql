-- ========================================
-- CORREÇÃO: Política RLS para permitir busca de CNPJ
-- ========================================

-- A política atual da tabela companies só permite ver a própria empresa
-- Isso impede a busca de CNPJ ao abrir chamados
-- Vamos adicionar uma política que permita buscar empresas por CNPJ

-- Remove a política restritiva antiga
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;

-- Nova política: Permite que usuários autenticados busquem empresas
-- (necessário para abrir chamados para outras empresas)
DROP POLICY IF EXISTS "Allow authenticated to search companies" ON public.companies;
CREATE POLICY "Allow authenticated to search companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);

-- Mantém a política de admin/técnico para INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
CREATE POLICY "Allow tech/admin full access"
ON public.companies FOR INSERT, UPDATE, DELETE
TO authenticated
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));
