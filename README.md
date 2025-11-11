# 🎫 Portal de Chamados

Sistema completo de gerenciamento de chamados técnicos desenvolvido com React + TypeScript + Supabase.

## ✨ Funcionalidades

### Cliente
- 📝 Abertura de chamados com descrição detalhada
- 📂 Upload de anexos (imagens, vídeos, documentos)--- futura implementação
- 👁️ Visualização de histórico de chamados
- 🔔 Notificações de atualizações
- 📱 Interface responsiva

### Técnico
- 📋 Visualização de chamados atribuídos
- 💬 Sistema de comentários
- 🔄 Atualização de status (Pendente → Em Andamento → Resolvido)
- 📎 Anexo de arquivos nas respostas
- 🏢 Visualização por empresa

### Administrador
- 👥 Gerenciamento de usuários (Cliente, Técnico, Admin)
- 🏢 Gerenciamento de empresas
- 📊 Relatórios com filtros avançados
- 📄 Exportação de relatórios em PDF
- ⚙️ Configurações do sistema (nome do portal, logo, cores)
- 🔐 Controle total de permissões

## 🛠️ Tecnologias

- **Frontend**: React 19.1.1, TypeScript 5.9.3, Vite 6.0.7
- **UI**: Tailwind CSS, Lucide Icons
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **Segurança**: Row Level Security (RLS) policies
- **PDF**: jsPDF + jspdf-autotable

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/LucasFelipeJesus/portal-chamados.git
cd portal-chamados
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
VITE_SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env.local` (já está no `.gitignore`)

4. **Configure o banco de dados**

Execute as migrações SQL no Supabase SQL Editor na seguinte ordem:

1. `1_create_system_settings_table.sql` - Tabela de configurações
2. `2_create_companies_table.sql` - Tabela de empresas
3. `3_create_user_profiles_table.sql` - Perfis de usuários
4. `4_create_tickets_table.sql` - Tabela de chamados
5. `5_create_ticket_comments_table.sql` - Comentários
6. `6_enable_rls.sql` - Ativa Row Level Security
7. `7_storage_policies.sql` - Políticas do Storage

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse: `http://localhost:5173`

## 📦 Build para Produção

```bash
npm run build
npm run preview  # Testar build localmente
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- `system_settings` - Configurações do portal (nome, logo, cores)
- `companies` - Empresas cadastradas
- `user_profiles` - Perfis de usuários (role: cliente, tecnico, admin)
- `tickets` - Chamados técnicos
- `ticket_comments` - Comentários nos chamados

### Storage Buckets
- `portal-assets` - Logos e imagens do sistema
- `ticket-attachments` - Anexos dos chamados (público com RLS)

### Row Level Security (RLS)
Todas as tabelas possuem políticas RLS:
- Clientes veem apenas seus chamados
- Técnicos veem chamados de suas empresas
- Admins têm acesso total

## 🎨 Customização

Acesse **Configurações** no menu de administrador para personalizar:
- Nome do portal
- Logo (upload de imagem)
- Cor primária do tema
- Cores dos status de chamados

## 🔐 Segurança

⚠️ **Service Role Key no Frontend (Desenvolvimento)**

Este projeto usa a `VITE_SUPABASE_SERVICE_ROLE_KEY` no frontend para operações administrativas. Isso é **aceitável em desenvolvimento**, mas para **produção** considere:

1. Migrar operações admin para **Supabase Edge Functions**
2. Usar apenas a chave anônima no frontend
3. Implementar validação de roles no backend

## 🐛 Ferramentas de Debug

O projeto inclui uma ferramenta de debug disponível no console do navegador:

```javascript
// Testar conexão com Supabase
await supabaseDebug.testConnection()

// Verificar autenticação
await supabaseDebug.checkAuth()

// Limpar cache e sessão
supabaseDebug.clearAll()

// Reset completo (recarrega a página)
supabaseDebug.forceReset()
```

## 📝 Desenvolvimento vs Produção

**Desenvolvimento** (configuração atual):
- Service Role Key no frontend para facilitar testes admin
- React.StrictMode removido (evita double-render)
- Logs detalhados no console

**Produção** (recomendações):
- Mover operações admin para Edge Functions
- Remover/ofuscar console.logs
- Implementar error boundaries
- Configurar variáveis de ambiente no host (Vercel, Netlify, etc)

## 👨‍💻 Autor

**Lucas Jesus**  
Projeto desenvolvido para gerenciamento de chamados técnicos

---

## 🔧 Stack Técnica Detalhada

- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Supabase** - Backend as a Service
  - PostgreSQL - Banco de dados
  - Auth - Autenticação
  - Storage - Armazenamento de arquivos
  - RLS - Row Level Security
- **Tailwind CSS** - Framework CSS utilitário
- **React Router DOM** - Roteamento SPA
- **jsPDF** - Geração de PDFs
- **Lucide React** - Ícones modernos

## 📄 Licença

Este projeto foi desenvolvido para uso interno. Todos os direitos reservados.
