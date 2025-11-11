# 🗄️ Executar Migrações SQL no Supabase

Para que o sistema funcione completamente, você precisa executar as migrações SQL no banco de dados do Supabase.

## 📋 Migrações Necessárias

### 1️⃣ migration_additional_companies.sql
Adiciona suporte a múltiplas empresas por usuário.

### 2️⃣ migration_add_phone.sql
Adiciona campo de telefone ao perfil do usuário.

### 3️⃣ migration_force_password_change.sql
Adiciona flag para forçar troca de senha no primeiro acesso.

## 🚀 Como Executar

### Método 1: SQL Editor (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/uljakqvlrtajbpislunr)
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New query**
4. Para cada arquivo de migração:
   - Abra o arquivo (ex: `migration_additional_companies.sql`)
   - Copie todo o conteúdo
   - Cole no SQL Editor
   - Clique em **Run** (ou pressione Ctrl+Enter)
   - Aguarde a confirmação de sucesso ✅

### Método 2: Table Editor

Se preferir fazer manualmente:

#### Para adicionar colunas à tabela `user_profiles`:

1. Vá em **Table Editor** → `user_profiles`
2. Clique em **Add Column** (+)
3. Configure cada coluna:

**Coluna: additional_company_ids**
- Name: `additional_company_ids`
- Type: `uuid[]` (array de UUID)
- Default value: (deixe vazio)
- Is Nullable: ✅ Yes
- Is Unique: ❌ No

**Coluna: phone**
- Name: `phone`
- Type: `text`
- Default value: (deixe vazio)
- Is Nullable: ✅ Yes
- Is Unique: ❌ No

**Coluna: force_password_change**
- Name: `force_password_change`
- Type: `boolean`
- Default value: `false`
- Is Nullable: ✅ Yes
- Is Unique: ❌ No

## ✅ Verificar se as Migrações Funcionaram

Execute esta query no SQL Editor para verificar:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

Você deve ver as colunas:
- `additional_company_ids` (ARRAY)
- `phone` (text)
- `force_password_change` (boolean)

## ⚠️ Ordem de Execução

Execute as migrações nesta ordem:
1. `migration_additional_companies.sql`
2. `migration_add_phone.sql`
3. `migration_force_password_change.sql`

## 🆘 Problemas Comuns

### Erro: "column already exists"
✅ Significa que a migração já foi executada. Pode ignorar.

### Erro: "permission denied"
❌ Você precisa ser o proprietário do projeto no Supabase.

### Erro: "syntax error"
❌ Certifique-se de copiar o SQL completo, incluindo os comentários.

## 📝 Nota

As migrações usam `IF NOT EXISTS`, então é seguro executá-las múltiplas vezes sem problemas.
