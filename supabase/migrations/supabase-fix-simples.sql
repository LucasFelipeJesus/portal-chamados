-- ========================================
-- CORREÇÃO SIMPLES: Permitir busca de CNPJ para todos
-- ========================================

-- Remove políticas antigas que estão bloqueando
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;
DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated to search companies" ON public.companies;
DROP POLICY IF EXISTS "Admin and Tech full access to companies" ON public.companies;
DROP POLICY IF EXISTS "Client can view own company" ON public.companies;

-- NOVA POLÍTICA 1: Qualquer usuário autenticado pode BUSCAR/VER empresas
CREATE POLICY "Anyone authenticated can view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- NOVA POLÍTICA 2: Apenas Admin/Técnico pode CRIAR/EDITAR/DELETAR empresas
CREATE POLICY "Only admin can modify companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));
