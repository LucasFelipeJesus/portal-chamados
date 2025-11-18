-- =====================================================
-- TABELA DE CONFIGURAÇÕES DO SISTEMA
-- =====================================================
-- Armazena configurações gerais como logo, nome do portal, etc.

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES user_profiles(id)
);

-- Inserir configurações padrão
INSERT INTO system_settings (setting_key, setting_value) VALUES
    ('portal_name', 'Portal de Chamados'),
    ('logo_url', NULL),
    ('primary_color', '#2563eb')
ON CONFLICT (setting_key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Permitir que todos leiam as configurações
CREATE POLICY "Todos podem ler configurações"
ON system_settings
FOR SELECT
USING (true);

-- Apenas admins podem atualizar
CREATE POLICY "Apenas admins podem atualizar configurações"
ON system_settings
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

-- =====================================================
-- STORAGE BUCKET PARA LOGOS
-- =====================================================
-- Execute estes comandos no Supabase Dashboard → Storage:

-- 1. Criar bucket público para logos (faça isso manualmente no dashboard)
-- Nome: portal-assets
-- Public: true

-- 2. Ou use SQL (se disponível):
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('portal-assets', 'portal-assets', true)
-- ON CONFLICT (id) DO NOTHING;

-- 3. Política de acesso ao storage
-- Permitir que admins façam upload
CREATE POLICY "Admins podem fazer upload de assets"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'portal-assets' AND
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Permitir que admins deletem assets
CREATE POLICY "Admins podem deletar assets"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'portal-assets' AND
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Permitir que todos vejam os assets (bucket público)
CREATE POLICY "Todos podem ver assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'portal-assets');

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Ver configurações atuais:
SELECT * FROM system_settings;

-- Ver buckets de storage:
SELECT * FROM storage.buckets WHERE id = 'portal-assets';
