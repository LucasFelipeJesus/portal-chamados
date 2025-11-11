-- ========================================
-- VERIFICAR CNPJs CADASTRADOS
-- ========================================

-- 1. Listar todas as empresas cadastradas com CNPJs
SELECT 
    id,
    name,
    cnpj,
    created_at
FROM public.companies
ORDER BY created_at DESC;

-- 2. Formatar CNPJs para facilitar visualização
SELECT 
    name,
    cnpj as "CNPJ (sem formatação)",
    CONCAT(
        SUBSTRING(cnpj, 1, 2), '.',
        SUBSTRING(cnpj, 3, 3), '.',
        SUBSTRING(cnpj, 6, 3), '/',
        SUBSTRING(cnpj, 9, 4), '-',
        SUBSTRING(cnpj, 13, 2)
    ) as "CNPJ (formatado)"
FROM public.companies
ORDER BY name;

-- 3. Cadastrar a empresa do CNPJ que você tentou buscar (se necessário)
INSERT INTO public.companies (name, cnpj, full_address, cep)
VALUES 
    ('Nome da Empresa', '70940994005685', 'Endereço completo aqui', '12345678')
ON CONFLICT (cnpj) DO NOTHING
RETURNING *;

-- OU se preferir atualizar o CNPJ de uma empresa existente:
-- UPDATE public.companies 
-- SET cnpj = '70940994005685' 
-- WHERE id = 'UUID_DA_EMPRESA';
