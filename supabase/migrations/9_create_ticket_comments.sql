-- Migration: Criar tabela de comentários nos chamados
-- Data: 2025-01-11
-- Descrição: Sistema de comentários para comunicação entre cliente, admin e técnicos

-- 1. Criar tabela ticket_comments
CREATE TABLE IF NOT EXISTS ticket_comments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Comentário interno (apenas admin/técnico vê)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_user_id ON ticket_comments(user_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at DESC);

-- 3. Adicionar comentários
COMMENT ON TABLE ticket_comments IS 'Comentários e atualizações nos chamados';
COMMENT ON COLUMN ticket_comments.is_internal IS 'Se true, apenas admin e técnicos veem (notas internas)';

-- 4. Habilitar RLS
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- Policy: Todos veem comentários públicos dos seus chamados
CREATE POLICY "Usuários veem comentários públicos dos seus chamados"
ON ticket_comments
FOR SELECT
USING (
    -- Comentário não é interno
    is_internal = false
    AND
    -- E o usuário está relacionado ao ticket (cliente, ou admin/técnico da empresa)
    EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (
            -- É o cliente que abriu
            t.client_id = auth.uid()
            OR
            -- É admin ou técnico da mesma empresa
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid()
                AND up.company_id = t.company_id
                AND up.role IN ('admin', 'tecnico')
            )
        )
    )
);

-- Policy: Admin e técnicos veem todos os comentários (incluindo internos)
CREATE POLICY "Admin e técnicos veem todos os comentários"
ON ticket_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'tecnico')
    )
);

-- Policy: Usuários podem criar comentários nos seus chamados
CREATE POLICY "Usuários criam comentários nos seus chamados"
ON ticket_comments
FOR INSERT
WITH CHECK (
    -- Usuário autenticado
    auth.uid() = user_id
    AND
    -- E está relacionado ao ticket
    EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND (
            -- É o cliente que abriu
            t.client_id = auth.uid()
            OR
            -- É admin ou técnico da mesma empresa
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid()
                AND up.company_id = t.company_id
                AND up.role IN ('admin', 'tecnico')
            )
        )
    )
);

-- Policy: Apenas o autor pode atualizar seu comentário (dentro de 15 minutos)
CREATE POLICY "Autor atualiza seu comentário"
ON ticket_comments
FOR UPDATE
USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '15 minutes'
)
WITH CHECK (
    auth.uid() = user_id
);

-- Policy: Apenas admins podem deletar comentários
CREATE POLICY "Admin deleta comentários"
ON ticket_comments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ticket_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_comments_updated_at
    BEFORE UPDATE ON ticket_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_comments_updated_at();

-- 7. Verificação
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ticket_comments'
ORDER BY ordinal_position;

-- Verificar policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'ticket_comments'
ORDER BY policyname;
