// Ferramentas de debug para desenvolvimento
// Disponível no console do navegador

export const debugTools = {
    // Limpa toda a sessão do Supabase e recarrega a página
    clearSession: () => {
        console.log('🧹 Limpando sessão do Supabase...');
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    },

    // Mostra os dados armazenados no localStorage
    showLocalStorage: () => {
        console.log('📦 Dados no localStorage:');
        for (let i = 0;i < localStorage.length;i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                console.log(`  ${key}:`, value);
            }
        }
    },

    // Limpa apenas os dados do Supabase
    clearSupabaseData: () => {
        console.log('🗑️ Limpando dados do Supabase...');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
                console.log(`  Removido: ${key}`);
            }
        });
        console.log('✅ Dados do Supabase removidos. Recarregue a página.');
    }
};

// Torna disponível globalmente no console
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).debugTools = debugTools;
}
