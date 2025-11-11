-- =====================================================
-- POLÍTICAS RLS PARA tickets
-- =====================================================
-- Estas políticas garantem que:
-- - Clientes podem criar tickets
-- - Clientes podem ver apenas seus próprios tickets
-- - Técnicos e admins podem ver todos os tickets
-- - Técnicos e admins podem atualizar tickets (atribuir, mudar status, etc.)

-- 1. HABILITAR RLS na tabela tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER políticas antigas (se existirem)
DROP POLICY IF EXISTS "Clientes podem criar tickets" ON tickets;
DROP POLICY IF EXISTS "Clientes podem ver seus próprios tickets" ON tickets;
DROP POLICY IF EXISTS "Técnicos podem ver todos os tickets" ON tickets;
DROP POLICY IF EXISTS "Admins podem ver todos os tickets" ON tickets;
DROP POLICY IF EXISTS "Técnicos podem atualizar tickets" ON tickets;
DROP POLICY IF EXISTS "Admins podem atualizar todos os tickets" ON tickets;

-- =====================================================
-- POLÍTICAS DE INSERT (Criar tickets)
-- =====================================================

-- Clientes podem criar tickets
CREATE POLICY "Clientes podem criar tickets"
ON tickets
FOR INSERT
WITH CHECK (
    auth.uid() = client_id
);

-- Técnicos podem criar tickets (em nome de clientes)
CREATE POLICY "Técnicos podem criar tickets"
ON tickets
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'tecnico'
    )
);

-- Admins podem criar tickets (em nome de clientes)
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
-- POLÍTICAS DE SELECT (Visualizar tickets)
-- =====================================================

-- Clientes podem ver seus próprios tickets
CREATE POLICY "Clientes podem ver seus próprios tickets"
ON tickets
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND role = 'cliente'
        AND id = tickets.client_id
    )
);

-- Técnicos podem ver todos os tickets
CREATE POLICY "Técnicos podem ver todos os tickets"
ON tickets
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'tecnico'
    )
);

-- Admins podem ver todos os tickets
CREATE POLICY "Admins podem ver todos os tickets"
ON tickets
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- =====================================================
-- POLÍTICAS DE UPDATE (Atualizar tickets)
-- =====================================================

-- Técnicos podem atualizar tickets (atribuir, mudar status, adicionar comentários)
CREATE POLICY "Técnicos podem atualizar tickets"
ON tickets
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'tecnico'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'tecnico'
    )
);

-- Admins podem atualizar todos os tickets
CREATE POLICY "Admins podem atualizar todos os tickets"
ON tickets
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Clientes podem atualizar apenas seus próprios tickets (para adicionar comentários, por exemplo)
CREATE POLICY "Clientes podem comentar em seus tickets"
ON tickets
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND role = 'cliente'
        AND id = tickets.client_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() 
        AND role = 'cliente'
        AND id = tickets.client_id
    )
);

-- =====================================================
-- VERIFICAR POLÍTICAS CRIADAS
-- =====================================================
-- Execute este comando para ver todas as políticas da tabela tickets:
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
ORDER BY policyname;

-- =====================================================
-- TESTAR AS POLÍTICAS
-- =====================================================
-- Como CLIENTE, tente criar um ticket:
-- INSERT INTO tickets (client_id, company_id, status, equipment_manufacturer, equipment_model)
-- VALUES (auth.uid(), 'uuid-da-empresa', 'aberto', 'Fabricante', 'Modelo');

-- Como CLIENTE, tente ver seus tickets:
-- SELECT * FROM tickets WHERE client_id = auth.uid();

-- Como TÉCNICO ou ADMIN, tente ver todos os tickets:
-- SELECT * FROM tickets;
