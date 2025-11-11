-- =====================================================
-- ADICIONAR FOREIGN KEYS NA TABELA tickets
-- =====================================================
-- Estas foreign keys permitem que o Supabase faça joins
-- automáticos entre tickets, user_profiles e companies

-- 1. Adicionar Foreign Key para client_id -> user_profiles(id)
ALTER TABLE tickets
ADD CONSTRAINT fk_tickets_client
FOREIGN KEY (client_id)
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- 2. Adicionar Foreign Key para company_id -> companies(id)
ALTER TABLE tickets
ADD CONSTRAINT fk_tickets_company
FOREIGN KEY (company_id)
REFERENCES companies(id)
ON DELETE CASCADE;

-- 3. Adicionar Foreign Key para technician_id -> user_profiles(id)
-- (caso você tenha esse campo para atribuir técnicos aos tickets)
-- Se não tiver, ignore ou comente esta parte
-- ALTER TABLE tickets
-- ADD CONSTRAINT fk_tickets_technician
-- FOREIGN KEY (technician_id)
-- REFERENCES user_profiles(id)
-- ON DELETE SET NULL;

-- =====================================================
-- VERIFICAR AS FOREIGN KEYS CRIADAS
-- =====================================================
-- Execute este comando para ver todas as foreign keys da tabela tickets:
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tickets'
ORDER BY tc.constraint_name;
