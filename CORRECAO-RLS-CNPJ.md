# 🔧 Correção: Problema ao Buscar CNPJ

## 🐛 Problema Identificado

A busca de CNPJ não está funcionando porque o **Row Level Security (RLS)** da tabela `companies` está configurado de forma muito restritiva.

A política atual permite que cada usuário veja **apenas a própria empresa**, mas para abrir chamados precisamos poder buscar qualquer empresa por CNPJ.

## ✅ Solução

Execute o seguinte SQL no **SQL Editor** do Supabase:

```sql
-- Remove a política restritiva antiga
DROP POLICY IF EXISTS "Allow user to view own company" ON public.companies;

-- Nova política: Permite que usuários autenticados busquem empresas
CREATE POLICY "Allow authenticated to search companies"
ON public.companies FOR SELECT
TO authenticated
USING (true);

-- Mantém a política de admin/técnico para INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow tech/admin full access" ON public.companies;
CREATE POLICY "Allow tech/admin full access"
ON public.companies FOR INSERT, UPDATE, DELETE
TO authenticated
USING (public.get_my_role() IN ('admin', 'tecnico'))
WITH CHECK (public.get_my_role() IN ('admin', 'tecnico'));
```

## 📋 Passo a Passo

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Cole o SQL acima
5. Clique em **Run** (ou pressione `Ctrl + Enter`)

## 🔍 Verificação

Após executar o SQL, teste novamente a busca de CNPJ no formulário. 

### Debug no Console

Abra o **DevTools (F12)** e vá na aba **Console**. Ao buscar um CNPJ, você verá:

```
🔍 Buscando CNPJ: 12345678000199
📊 Resultado da busca: { data: {...}, error: null }
✅ Empresa encontrada: { id: '...', name: '...', cnpj: '...' }
```

Se ainda houver erro, a mensagem aparecerá no console com detalhes.

## 🛡️ Segurança

A nova política mantém a segurança porque:

- ✅ **SELECT**: Qualquer usuário autenticado pode **ler** empresas (necessário para buscar CNPJ)
- ✅ **INSERT/UPDATE/DELETE**: Apenas admins e técnicos podem **modificar** empresas
- ✅ Usuários não autenticados não têm acesso algum

## 📝 Alternativa: RLS mais granular (opcional)

Se você quiser restringir mais (ex: apenas permitir buscar empresas ativas), pode usar:

```sql
CREATE POLICY "Allow authenticated to search companies"
ON public.companies FOR SELECT
TO authenticated
USING (
    -- Permite ver a própria empresa OU buscar outras (se for admin/técnico)
    id = public.get_my_company_id() 
    OR 
    public.get_my_role() IN ('admin', 'tecnico')
);
```

Mas isso quebraria a funcionalidade de clientes abrirem chamados para outras empresas.
