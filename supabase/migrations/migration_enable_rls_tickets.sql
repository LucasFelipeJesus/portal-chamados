-- ============================================================================
-- REABILITAR ROW LEVEL SECURITY NA TABELA TICKETS
-- ============================================================================
-- Este script reabilita o RLS que foi desabilitado para testes
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================================

-- Reabilitar RLS na tabela tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Verificar status do RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'tickets';

-- Listar políticas existentes
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

-- RESULTADO ESPERADO:
-- - rls_enabled = TRUE
-- - Deve mostrar todas as políticas criadas anteriormente:
--   * Clientes podem criar tickets
--   * Clientes podem ver seus próprios tickets
--   * Técnicos podem criar tickets
--   * Técnicos podem ver todos os tickets
--   * Técnicos podem atualizar tickets
--   * Admins podem criar tickets
--   * Admins podem ver todos os tickets
--   * Admins podem atualizar todos os tickets
--   * Clientes podem comentar em seus tickets
