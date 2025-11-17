-- =====================================================
-- MIGRATION: Adicionar coluna e políticas RLS para gerenciamento de equipamentos
-- Data: 2025-11-17
-- =====================================================

-- 1. ADICIONAR coluna installation_location se não existir
ALTER TABLE equipments 
ADD COLUMN IF NOT EXISTS installation_location text;

-- 2. HABILITAR RLS (caso ainda não esteja)
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER políticas existentes para recriar (evitar duplicação)
DROP POLICY IF EXISTS "Usuários podem ver equipamentos da sua empresa principal" ON equipments;
DROP POLICY IF EXISTS "Usuários podem ver equipamentos das empresas adicionais" ON equipments;
DROP POLICY IF EXISTS "Admins e técnicos podem ver todos os equipamentos" ON equipments;
DROP POLICY IF EXISTS "Usuários podem criar equipamentos" ON equipments;
DROP POLICY IF EXISTS "Admin e técnicos podem criar equipamentos" ON equipments;
DROP POLICY IF EXISTS "Admin e técnicos podem atualizar equipamentos" ON equipments;
DROP POLICY IF EXISTS "Admin e técnicos podem deletar equipamentos" ON equipments;

-- =====================================================
-- POLÍTICAS DE SELECT (Visualização)
-- =====================================================

-- Permitir que usuários vejam equipamentos da sua empresa principal
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

-- Permitir que usuários vejam equipamentos das empresas adicionais
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

-- Admins e técnicos podem ver todos os equipamentos
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

-- =====================================================
-- POLÍTICAS DE INSERT (Criação)
-- =====================================================

-- Apenas admin e técnicos podem criar equipamentos
CREATE POLICY "Admin e técnicos podem criar equipamentos"
ON equipments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'tecnico')
    )
);

-- =====================================================
-- POLÍTICAS DE UPDATE (Atualização)
-- =====================================================

-- Apenas admin e técnicos podem atualizar equipamentos
CREATE POLICY "Admin e técnicos podem atualizar equipamentos"
ON equipments
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'tecnico')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'tecnico')
    )
);

-- =====================================================
-- POLÍTICAS DE DELETE (Exclusão)
-- =====================================================

-- Apenas admin e técnicos podem deletar equipamentos
CREATE POLICY "Admin e técnicos podem deletar equipamentos"
ON equipments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'tecnico')
    )
);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON COLUMN equipments.installation_location IS 'Local específico de instalação do equipamento (ex: Próximo à recepção)';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar políticas criadas:
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'equipments'
ORDER BY cmd, policyname;
