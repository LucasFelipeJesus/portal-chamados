# Troubleshooting - Portal de Chamados

## Problema: Sistema funciona em aba anônima mas não na normal

### Causa
Esse problema ocorre quando há dados corrompidos ou inválidos armazenados no `localStorage` do navegador, especialmente relacionados à sessão do Supabase.

### Sintomas
- ✅ Funciona perfeitamente em modo anônimo/privado
- ❌ Não funciona em navegação normal
- ❌ Fica travado na tela de carregamento
- ❌ Erros no console relacionados ao perfil do usuário

### Soluções

#### Solução 1: Limpar cache pelo console do navegador
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Digite um dos comandos:

```javascript
// Limpa tudo e recarrega
debugTools.clearSession()

// Apenas limpa dados do Supabase (depois recarregue manualmente)
debugTools.clearSupabaseData()

// Ver o que está armazenado
debugTools.showLocalStorage()
```

#### Solução 2: Limpar manualmente pelo DevTools
1. Abra o DevTools (F12)
2. Vá em **Application** (Chrome) ou **Storage** (Firefox)
3. Clique em **Local Storage** → `http://localhost:5173`
4. Delete todas as chaves que começam com `sb-`
5. Recarregue a página (F5)

#### Solução 3: Limpar cache do navegador
1. **Chrome/Edge**: `Ctrl + Shift + Delete`
2. Selecione "Últimas 24 horas" ou "Todo o período"
3. Marque "Cookies e outros dados de sites"
4. Clique em "Limpar dados"

### Melhorias Implementadas

O código agora possui proteções automáticas:

1. **Validação de sessão**: Verifica se a sessão é válida antes de usar
2. **Limpeza automática**: Se o perfil não for encontrado, faz logout automático
3. **Tratamento de erros**: Captura e loga todos os erros de autenticação
4. **Limpeza no logout**: Remove todos os dados do localStorage ao fazer logout

### Logs úteis para debug

Abra o console do navegador e procure por:
- ✅ `"Perfil não encontrado, fazendo logout..."` → Sistema limpou sessão inválida
- ❌ `"Erro ao buscar perfil:"` → Problema com o banco de dados
- ❌ `"Erro ao buscar sessão:"` → Problema com a autenticação

### Prevenção

Para evitar esse problema no futuro:
1. Sempre faça logout antes de fechar o navegador
2. Não manipule diretamente o localStorage do Supabase
3. Se estiver desenvolvendo, use `debugTools.clearSession()` ao trocar de usuário
