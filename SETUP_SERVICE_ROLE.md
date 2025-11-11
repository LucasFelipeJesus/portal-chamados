# 🔐 Configuração da Service Role Key do Supabase

Para que o sistema de gerenciamento de usuários funcione corretamente, você precisa configurar a **Service Role Key** do Supabase.

## 📋 Passo a Passo

### 1️⃣ Obter a Service Role Key

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto: **uljakqvlrtajbpislunr**
3. Vá em **Settings** (Configurações) → **API**
4. Role até a seção **Project API keys**
5. Copie a chave **`service_role`** (NÃO a `anon`)

### 2️⃣ Criar arquivo .env

1. Na raiz do projeto, crie um arquivo chamado `.env`
2. Copie o conteúdo de `.env.example`
3. Cole a Service Role Key que você copiou:

```env
VITE_SUPABASE_URL=https://uljakqvlrtajbpislunr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_copiada_aqui
```

### 3️⃣ Reiniciar o servidor de desenvolvimento

Após criar o `.env`, reinicie o servidor:

```bash
npm run dev
```

## ✅ Funcionalidades que requerem Service Role Key

- ✅ Criar novos usuários
- ✅ Atualizar senha de usuários existentes
- ✅ Excluir usuários do sistema

## ⚠️ IMPORTANTE - Segurança

### ❌ NUNCA faça isso:
- Fazer commit do arquivo `.env` no Git
- Compartilhar a Service Role Key publicamente
- Usar a Service Role Key em produção no frontend

### ✅ Boas práticas:
- O arquivo `.env` já está no `.gitignore`
- Use `.env.example` como template (sem chaves reais)
- Em produção, use **Supabase Edge Functions** para proteger a chave

## 🚀 Alternativa para Produção

Para ambientes de produção, recomenda-se criar uma **Edge Function** no Supabase:

```typescript
// Edge Function: create-user
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { email, password, full_name, role, company_id } = await req.json()
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  // ... resto da lógica
})
```

Isso mantém a Service Role Key segura no servidor, nunca expondo no frontend.

## 🆘 Problemas?

Se ainda aparecer erro `403 Forbidden`:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Confirme que a Service Role Key está correta
3. Reinicie o servidor de desenvolvimento
4. Limpe o cache do navegador (Ctrl+Shift+R)
