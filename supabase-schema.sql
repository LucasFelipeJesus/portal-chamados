-- ========= 1. CRIAÇÃO DE TIPOS (ENUMs) =========
-- Adiciona verificações "IF NOT EXISTS" para os tipos

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE public.ticket_status AS ENUM (
            'aberto',
            'em_atendimento',
            'aguardando_cliente',
            'fechado',
            'cancelado'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_application_type') THEN
        CREATE TYPE public.equipment_application_type AS ENUM (
            'Acesso',
            'Ponto'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_card_type') THEN
        CREATE TYPE public.equipment_card_type AS ENUM (
            'Smartcard',
            'Proximidade HID',
            'Biometria',
            'Facial',
            'Outro'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'cliente',
            'tecnico',
            'admin'
        );
    END IF;
END$$;


-- ========= 2. CRIAÇÃO DAS TABELAS =========
-- Adiciona "IF NOT EXISTS" às tabelas

-- Tabela de Empresas (Clientes)
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    cnpj text NOT NULL UNIQUE,
    full_address text,
    cep text,
    created_at timestamptz DEFAULT now()
);

-- Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    email text UNIQUE,
    phone text,
    role public.user_role DEFAULT 'cliente'::public.user_role,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    updated_at timestamptz DEFAULT now()
);

-- Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS public.equipments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    manufacturer text NOT NULL,
    model text NOT NULL,
    internal_location text, -- Campo 7 (pode ser o local padrão)
    application_type public.equipment_application_type, -- Campo 2
    serial_number text,
    tecnology text, -- Ex: "Proximidade" (Campo 4)
    created_at timestamptz DEFAULT now()
);

-- Tabela de Chamados (Tickets)
CREATE TABLE IF NOT EXISTS public.tickets (
    id bigserial PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status public.ticket_status DEFAULT 'aberto'::public.ticket_status,

    -- Campos do formulário (para fácil acesso/relatório)
    equipment_manufacturer text NOT NULL, -- Campo 1
    equipment_model text NOT NULL,        -- Campo 1
    application_type public.equipment_application_type, -- Campo 2
    internal_location text,               -- Campo 7

    -- Armazena os 10 campos em formato JSON para flexibilidade
    form_data jsonb NOT NULL,

    -- Para o fechamento
    closed_at timestamptz,
    service_order_pdf_path text -- Caminho para o arquivo no Supabase Storage
);
COMMENT ON COLUMN public.tickets.form_data IS 'Armazena todos os 10 campos do formulário de abertura';
COMMENT ON COLUMN public.tickets.service_order_pdf_path IS 'Caminho do arquivo no bucket "service_orders". Ex: "company_uuid/ticket_id.pdf"';


-- Tabela de Atualizações do Chamado (Comentários)
CREATE TABLE IF NOT EXISTS public.ticket_updates (
    id bigserial PRIMARY KEY,
    ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL, -- Quem atualizou
    comment text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_internal_note boolean DEFAULT false -- Se for true, não mostrar para o cliente
);

-- Tabela de Histórico de Manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_history (
    id bigserial PRIMARY KEY,
    equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
    ticket_id bigint REFERENCES public.tickets(id) ON DELETE SET NULL, -- Linka ao chamado que gerou a manutenção
    technician_name text,
    service_date date NOT NULL,
    service_description text NOT NULL,
    service_order_pdf_path text -- Histórico de OSs
);


-- ========= 3. STORAGE (Bucket para PDFs) =========

-- Cria o bucket "service_orders" para os PDFs
-- ON CONFLICT já o torna idempotente
INSERT INTO storage.buckets (id, name, public)
VALUES ('service_orders', 'service_orders', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Storage
-- Adiciona "DROP IF EXISTS" para tornar a criação idempotente
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'service_orders');

DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service_orders');


-- ========= 4. ROW LEVEL SECURITY (RLS) =========

-- Ativa o RLS (é idempotente, não dá erro se já estiver ativo)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares (CREATE OR REPLACE já é idempotente)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
  SELECT company_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- --- Políticas de RLS ---
-- Adiciona "DROP IF EXISTS" para todas as políticas

-- Tabela: user_profiles
DROP POLICY IF EXISTS "Allow user to manage own profile" ON public.user_profiles;
CREATE POLICY "Allow user to manage own profile"
ON public.user_profiles FOR ALL
USING (id = auth.uid());

DROP POLICY IF EXISTS "Allow admin/tech to view company profiles" ON public.user_profiles;
CREATE POLICY "Allow admin/tech to view company profiles"
ON public.user_profiles FOR SELECT
USING (company_id = public.get_my_company_id() AND public.get_my_role() IN ('admin', 'tecnico'));


-- Tabela: companies
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;
CREATE POLICY "Allow user to view own company"
ON public.companies FOR SELECT
USING (id = public.get_my_company_id());

DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
CREATE POLICY "Allow tech/admin full access"
ON public.companies FOR ALL
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));


-- Tabela: tickets
DROP POLICY IF EXISTS "Allow client to manage own company tickets" ON public.tickets;
CREATE POLICY "Allow client to manage own company tickets"
ON public.tickets FOR ALL
USING (company_id = public.get_my_company_id())
WITH CHECK (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.tickets;
CREATE POLICY "Allow tech/admin full access"
ON public.tickets FOR ALL
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));


-- Tabela: ticket_updates
DROP POLICY IF EXISTS "Allow user to manage updates on visible tickets" ON public.ticket_updates;
CREATE POLICY "Allow user to manage updates on visible tickets"
ON public.ticket_updates FOR ALL
USING (
    ticket_id IN (
        SELECT id FROM public.tickets WHERE tickets.id = ticket_updates.ticket_id
    )
);


-- Tabela: equipments
DROP POLICY IF EXISTS "Allow client to view own company equipments" ON public.equipments;
CREATE POLICY "Allow client to view own company equipments"
ON public.equipments FOR SELECT
USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.equipments;
CREATE POLICY "Allow tech/admin full access"
ON public.equipments FOR ALL
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));


-- Tabela: maintenance_history
DROP POLICY IF EXISTS "Allow client to view own company history" ON public.maintenance_history;
CREATE POLICY "Allow client to view own company history"
ON public.maintenance_history FOR SELECT
USING (
    equipment_id IN (
        SELECT id FROM public.equipments WHERE equipments.company_id = public.get_my_company_id()
    )
);

DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.maintenance_history;
CREATE POLICY "Allow tech/admin full access"
ON public.maintenance_history FOR ALL
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));
