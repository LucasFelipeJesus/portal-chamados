-- ========================================
-- VERIFICAÇÃO E CORREÇÃO COMPLETA DAS POLÍTICAS RLS
-- ========================================

-- 1. VERIFICAR POLÍTICAS ATUAIS DA TABELA COMPANIES
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual as "using_expression",
    with_check as "check_expression"
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- 2. VERIFICAR SE AS FUNÇÕES AUXILIARES EXISTEM
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname IN ('get_my_role', 'get_my_company_id');

-- 3. TESTAR AS FUNÇÕES (execute quando estiver logado)
SELECT 
    public.get_my_role() as minha_role,
    public.get_my_company_id() as minha_empresa,
    auth.uid() as meu_user_id;

-- 4. VERIFICAR MEU PERFIL
SELECT 
    id,
    full_name,
    email,
    role,
    company_id
FROM public.user_profiles
WHERE id = auth.uid();

-- 5. LISTAR TODAS AS EMPRESAS (para ver se o RLS está bloqueando)
SELECT id, name, cnpj FROM public.companies LIMIT 10;

-- ========================================
-- CORREÇÃO: REMOVER TODAS AS POLÍTICAS E RECRIAR
-- ========================================

-- Remove todas as políticas antigas da tabela companies
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;
DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated to search companies" ON public.companies;

-- Política 1: Admin e Técnico têm acesso TOTAL
CREATE POLICY "Admin and Tech full access to companies"
ON public.companies
FOR ALL
TO authenticated
USING (
    public.get_my_role() IN ('admin', 'tecnico')
)
WITH CHECK (
    public.get_my_role() IN ('admin', 'tecnico')
);

-- Política 2: Cliente pode ver a própria empresa
CREATE POLICY "Client can view own company"
ON public.companies
FOR SELECT
TO authenticated
USING (
    id = public.get_my_company_id()
);

-- ========================================
-- VERIFICAÇÃO FINAL
-- ========================================

-- Verificar se as novas políticas foram criadas
SELECT 
    policyname,
    cmd,
    qual as "using_expression"
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- Testar busca de empresa específica
SELECT * FROM public.companies WHERE cnpj = '12345678000199';

-- Contar total de empresas visíveis para o usuário atual
SELECT COUNT(*) as total_empresas_visiveis FROM public.companies;
