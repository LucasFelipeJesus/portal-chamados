# Instalação das Dependências para Exportação de PDF

Para que a funcionalidade de exportação de relatórios em PDF funcione corretamente, você precisa instalar as seguintes bibliotecas:

## Bibliotecas Necessárias

```bash
npm install jspdf jspdf-autotable
```

OU

```bash
yarn add jspdf jspdf-autotable
```

## O que cada biblioteca faz:

- **jspdf**: Biblioteca principal para geração de PDFs em JavaScript
- **jspdf-autotable**: Plugin para criar tabelas automaticamente no PDF

## Funcionalidades Implementadas

### 1. Finalizar Chamado (Admin)
- Apenas usuários com role `admin` podem finalizar chamados
- Botão "Finalizar Chamado" aparece na página de detalhes
- Atualiza o status para "fechado" e registra a data de fechamento
- Confirmação antes de finalizar

### 2. Relatórios de Chamados (Admin)
- Página exclusiva para admin com filtros avançados
- **Filtros disponíveis**:
  - Status (Aberto, Em Atendimento, Aguardando Cliente, Fechado, Cancelado)
  - Data de Início
  - Data de Fim
  - Fabricante do Equipamento
  
- **Estatísticas em tempo real**:
  - Total de chamados
  - Contadores por status (com cards coloridos)
  
- **Exportação em PDF**:
  - Título e data de geração
  - Informações dos filtros aplicados
  - Estatísticas agregadas
  - Tabela completa com todos os chamados filtrados
  - Nome do arquivo automático com data
  
- **Tabela interativa**:
  - Lista todos os chamados filtrados
  - Informações: ID, Data, Equipamento, Local, Status
  - Visual responsivo com cores por status

## Como acessar:

1. **Finalizar Chamado**: 
   - Login como admin
   - Clicar em um chamado aberto
   - Clicar no botão verde "Finalizar Chamado"

2. **Relatórios**:
   - Login como admin
   - Clicar no botão "Relatórios" no header (ícone de gráfico)
   - Aplicar filtros desejados
   - Clicar em "Exportar PDF"

## Estrutura de Arquivos Criados/Modificados

### Novos Arquivos:
- `src/pages/Reports.tsx` - Página de relatórios com filtros e exportação
- `INSTALACAO-PDF.md` - Este arquivo de documentação

### Arquivos Modificados:
- `src/pages/TicketDetail.tsx` - Adicionado botão de finalizar para admin
- `src/components/AppLayout.tsx` - Adicionado botão de relatórios no header
- `src/types/index.ts` - Adicionado 'reports' ao tipo Page e 'closed_at' ao Ticket

## Notas Importantes

- A exportação de PDF só funciona após a instalação das bibliotecas
- Os relatórios só são acessíveis para usuários com role `admin`
- Os filtros são aplicados em tempo real
- O PDF é gerado no navegador (client-side) e baixado automaticamente
