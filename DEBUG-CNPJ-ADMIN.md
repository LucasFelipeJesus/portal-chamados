# 🔍 DEBUG: Problema com Busca de CNPJ (Usuário Admin)

## 🎯 Passo 1: Verificar no Console do Navegador

1. Abra o app e vá para "Novo Chamado"
2. Pressione **F12** para abrir o DevTools
3. Clique na aba **Console**
4. Digite um CNPJ e clique em buscar 🔍

### O que você deve ver no console:

```
🔍 Buscando CNPJ: 12345678000199
👤 Usuário logado: {id: '...', full_name: '...', role: 'admin', ...}
🔑 Role do usuário: admin
📊 Resultado da busca: {data: {...}, error: null}
📋 Todas as empresas (primeiras 5): {allCompanies: [...], allError: null}
✅ Empresa encontrada: {id: '...', name: 'Nome da Empresa', cnpj: '...'}
```

### ❌ Se der erro, você verá algo como:

```
❌ Erro ao buscar CNPJ: {message: 'new row violates row-level security policy', code: '42501'}
```

OU

```
📋 Todas as empresas (primeiras 5): {allCompanies: null, allError: {message: '...', code: '...'}}
```

## 🎯 Passo 2: Verificar Políticas RLS no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Execute esta query:

```sql
-- Ver políticas atuais
SELECT 
    policyname,
    cmd,
    qual as "using_expression"
FROM pg_policies 
WHERE tablename = 'companies';
```

### ✅ O que deveria aparecer:

| policyname | cmd | using_expression |
|-----------|-----|------------------|
| Admin and Tech full access to companies | ALL | (get_my_role() = ANY (ARRAY['admin'::user_role, 'tecnico'::user_role])) |
| Client can view own company | SELECT | (id = get_my_company_id()) |

### ❌ Se não aparecer nada OU estiver diferente, execute a correção!

## 🎯 Passo 3: Testar suas Permissões

No **SQL Editor** do Supabase, execute:

```sql
-- Verificar SEU perfil e role
SELECT 
    id,
    full_name,
    email,
    role,
    company_id
FROM public.user_profiles
WHERE id = auth.uid();
```

**Resultado esperado:**
```
role: "admin"
```

Se não for "admin", o problema está no seu perfil!

## 🎯 Passo 4: Listar Empresas Visíveis

```sql
-- Ver quantas empresas você consegue ver
SELECT id, name, cnpj FROM public.companies LIMIT 10;
```

### ✅ Se você é admin:
- Deveria ver **TODAS** as empresas cadastradas

### ❌ Se você vê apenas 1 empresa (ou nenhuma):
- As políticas RLS não estão corretas
- Execute a correção abaixo!

## 🔧 CORREÇÃO: Execute este SQL

```sql
-- Remove políticas antigas
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;
DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
DROP POLICY IF EXISTS "Allow authenticated to search companies" ON public.companies;

-- Cria políticas corretas
CREATE POLICY "Admin and Tech full access to companies"
ON public.companies
FOR ALL
TO authenticated
USING (
    public.get_my_role() IN ('admin', 'tecnico')
)
WITH CHECK (
    public.get_my_role() IN ('admin', 'tecnico')
);

CREATE POLICY "Client can view own company"
ON public.companies
FOR SELECT
TO authenticated
USING (
    id = public.get_my_company_id()
);
```

## 🎯 Passo 5: Verificar Novamente

Após executar a correção:

1. **Faça logout e login novamente** no app
2. Vá em "Novo Chamado"
3. Tente buscar um CNPJ
4. Verifique o console (F12)

## 📊 Checklist de Debug

- [ ] Abri o console do navegador (F12)
- [ ] Minha role no console mostra "admin"
- [ ] A query de todas as empresas retorna dados
- [ ] Executei a correção do RLS no Supabase
- [ ] Fiz logout e login novamente
- [ ] Testei a busca de CNPJ

## 🆘 Se AINDA não funcionar

Copie e cole aqui:

1. **O que aparece no console quando você busca o CNPJ**
2. **Resultado da query de verificação de políticas**
3. **Seu perfil (role e company_id)**

Vou te ajudar a resolver! 🚀
