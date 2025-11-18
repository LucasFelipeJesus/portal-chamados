-- =====================================================
-- POLÍTICAS RLS PARA equipments
-- =====================================================
-- Permite que usuários vejam equipamentos das empresas vinculadas

-- 1. HABILITAR RLS na tabela equipments
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- 2. PERMITIR que usuários vejam equipamentos da sua empresa principal
CREATE POLICY "Usuários podem ver equipamentos da sua empresa principal"
ON equipments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND company_id = equipments.company_id
    )
);

-- 3. PERMITIR que usuários vejam equipamentos das empresas adicionais
CREATE POLICY "Usuários podem ver equipamentos das empresas adicionais"
ON equipments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND equipments.company_id = ANY(additional_company_ids)
    )
);

-- 4. PERMITIR que admins e técnicos vejam todos os equipamentos
CREATE POLICY "Admins e técnicos podem ver todos os equipamentos"
ON equipments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND role IN ('admin', 'tecnico')
    )
);

-- 5. PERMITIR que usuários criem equipamentos
CREATE POLICY "Usuários podem criar equipamentos"
ON equipments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND (
            company_id = equipments.company_id 
            OR equipments.company_id = ANY(additional_company_ids)
            OR role IN ('admin', 'tecnico')
        )
    )
);

-- =====================================================
-- VERIFICAR POLÍTICAS EXISTENTES
-- =====================================================
-- Execute para ver todas as políticas da tabela equipments:
SELECT * FROM pg_policies WHERE tablename = 'equipments';

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS (se necessário)
-- =====================================================
-- Se houver políticas antigas causando conflito, remova-as:
-- DROP POLICY IF EXISTS "nome_da_política_antiga" ON equipments;

-- =====================================================
-- TESTE RÁPIDO
-- =====================================================
-- Verifique se há equipamentos cadastrados:
SELECT e.*, c.name as company_name 
FROM equipments e
LEFT JOIN companies c ON c.id = e.company_id
ORDER BY e.created_at DESC;

-- Verifique as empresas do usuário:
SELECT id, full_name, company_id, additional_company_ids 
FROM user_profiles 
WHERE email = 'seu_email_aqui@empresa.com';
