-- =====================================================
-- POLÍTICAS DE STORAGE PARA portal-assets
-- =====================================================
-- Estas políticas garantem que apenas admins possam fazer upload/delete
-- e todos possam visualizar os logos

-- 1. REMOVER políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admins podem fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem visualizar logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem deletar logos" ON storage.objects;

-- 2. HABILITAR RLS na tabela storage.objects (se ainda não estiver)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE INSERT (Upload)
-- =====================================================

-- Admins podem fazer upload de imagens
CREATE POLICY "Admins podem fazer upload"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'portal-assets' AND
    public.user_has_role('admin')
);

-- =====================================================
-- POLÍTICAS DE SELECT (Visualização)
-- =====================================================

-- Todos podem visualizar logos (bucket é público)
CREATE POLICY "Todos podem visualizar logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portal-assets');

-- =====================================================
-- POLÍTICAS DE DELETE (Remoção)
-- =====================================================

-- Admins podem deletar logos
CREATE POLICY "Admins podem deletar logos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'portal-assets' AND
    public.user_has_role('admin')
);

-- =====================================================
-- POLÍTICAS DE UPDATE (Atualização)
-- =====================================================

-- Admins podem atualizar metadados dos logos
CREATE POLICY "Admins podem atualizar logos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'portal-assets' AND
    public.user_has_role('admin')
)
WITH CHECK (
    bucket_id = 'portal-assets' AND
    public.user_has_role('admin')
);

-- =====================================================
-- VERIFICAR POLÍTICAS CRIADAS
-- =====================================================
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
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
