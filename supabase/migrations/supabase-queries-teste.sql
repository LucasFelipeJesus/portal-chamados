-- ========================================
-- QUERIES DE TESTE E VERIFICAÇÃO
-- ========================================

-- 1. Verificar se há empresas cadastradas
SELECT 
    id,
    name,
    cnpj,
    created_at
FROM public.companies
ORDER BY created_at DESC;

-- 2. Verificar políticas RLS da tabela companies
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
WHERE tablename = 'companies';

-- 3. Inserir empresa de teste (caso não tenha nenhuma)
-- ATENÇÃO: Execute apenas se não houver empresas!
INSERT INTO public.companies (name, cnpj, full_address, cep)
VALUES 
    ('Empresa Teste LTDA', '12345678000199', 'Rua Teste, 123 - São Paulo, SP', '01234567')
ON CONFLICT (cnpj) DO NOTHING
RETURNING *;

-- 4. Verificar equipamentos cadastrados
SELECT 
    e.id,
    e.manufacturer,
    e.model,
    e.serial_number,
    e.internal_location,
    c.name as company_name,
    c.cnpj
FROM public.equipments e
JOIN public.companies c ON e.company_id = c.id
ORDER BY e.created_at DESC;

-- 5. Testar busca de CNPJ (simula o que o frontend faz)
SELECT *
FROM public.companies
WHERE cnpj = '12345678000199';

-- 6. Verificar perfil do usuário logado e sua role
SELECT 
    id,
    full_name,
    email,
    role,
    company_id,
    (SELECT name FROM public.companies WHERE id = user_profiles.company_id) as company_name
FROM public.user_profiles
WHERE id = auth.uid();

-- 7. Inserir equipamento de teste para a empresa
-- ATENÇÃO: Substitua 'UUID_DA_EMPRESA' pelo ID real da empresa
INSERT INTO public.equipments (
    company_id,
    manufacturer,
    model,
    serial_number,
    internal_location,
    application_type,
    tecnology
)
VALUES (
    'UUID_DA_EMPRESA', -- ⚠️ Substitua pelo ID real!
    'Henry',
    'Face ID Pro',
    'SN123456789',
    'Portaria Principal',
    'Acesso',
    'Facial'
)
ON CONFLICT DO NOTHING
RETURNING *;
