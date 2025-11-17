-- Migration: Corrigir acesso do admin aos comentários
-- Data: 2025-11-17
-- Descrição: Admin deve ter acesso total irrestrito a comentários de qualquer chamado

-- 1. Remover políticas antigas que limitam admin
DROP POLICY IF EXISTS "Usuários veem comentários públicos dos seus chamados" ON ticket_comments;
DROP POLICY IF EXISTS "Admin e técnicos veem todos os comentários" ON ticket_comments;
DROP POLICY IF EXISTS "Usuários criam comentários nos seus chamados" ON ticket_comments;
DROP POLICY IF EXISTS "Autor atualiza seu comentário" ON ticket_comments;
DROP POLICY IF EXISTS "Admin deleta comentários" ON ticket_comments;

-- 2. Criar novas políticas com acesso total para admin

-- Policy SELECT: Admin vê TODOS os comentários (públicos e internos de qualquer chamado)
CREATE POLICY "Admin vê todos os comentários"
ON ticket_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);

-- Policy SELECT: Técnicos veem comentários da sua empresa
CREATE POLICY "Técnicos veem comentários da sua empresa"
ON ticket_comments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN tickets t ON t.company_id = up.company_id
        WHERE up.id = auth.uid()
        AND up.role = 'tecnico'
        AND t.id = ticket_comments.ticket_id
    )
);

-- Policy SELECT: Clientes veem comentários públicos dos seus chamados
CREATE POLICY "Clientes veem comentários públicos dos seus chamados"
ON ticket_comments
FOR SELECT
USING (
    is_internal = false
    AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND t.client_id = auth.uid()
    )
);

-- Policy INSERT: Admin cria comentários em QUALQUER chamado
CREATE POLICY "Admin cria comentários em qualquer chamado"
ON ticket_comments
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);

-- Policy INSERT: Técnicos criam comentários em chamados da sua empresa
CREATE POLICY "Técnicos criam comentários da sua empresa"
ON ticket_comments
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN tickets t ON t.company_id = up.company_id
        WHERE up.id = auth.uid()
        AND up.role = 'tecnico'
        AND t.id = ticket_comments.ticket_id
    )
);

-- Policy INSERT: Clientes criam comentários nos seus chamados
CREATE POLICY "Clientes criam comentários nos seus chamados"
ON ticket_comments
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_comments.ticket_id
        AND t.client_id = auth.uid()
    )
);

-- Policy UPDATE: Autor pode editar seu comentário (15 min)
CREATE POLICY "Autor edita seu comentário"
ON ticket_comments
FOR UPDATE
USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '15 minutes'
)
WITH CHECK (
    auth.uid() = user_id
);

-- Policy DELETE: Apenas admins deletam comentários
CREATE POLICY "Apenas admin deleta comentários"
ON ticket_comments
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);

-- 3. Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'ticket_comments'
ORDER BY cmd, policyname;

-- 4. Testar acesso
-- Execute este teste logado como admin para verificar:
-- SELECT * FROM ticket_comments; -- Deve retornar TODOS os comentários
-- INSERT INTO ticket_comments (ticket_id, user_id, comment) VALUES (1, auth.uid(), 'Teste admin'); -- Deve funcionar em qualquer ticket
