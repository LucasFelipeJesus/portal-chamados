import { supabase } from '../services/supabaseClient';

/**
 * Ferramentas de debug para diagnosticar problemas com Supabase
 */
export const supabaseDebug = {
    /**
     * Testa a conexão básica com o Supabase
     */
    async testConnection() {
        console.log('🔍 [Debug] Testando conexão com Supabase...');

        try {
            const start = Date.now();
            const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
            const duration = Date.now() - start;

            console.log('✅ [Debug] Conexão OK!', { duration: `${duration}ms`, data, error });
            return { success: true, duration, error: null };
        } catch (err) {
            console.error('❌ [Debug] Erro na conexão:', err);
            return { success: false, duration: 0, error: err };
        }
    },

    /**
     * Verifica o status da autenticação
     */
    async checkAuth() {
        console.log('🔍 [Debug] Verificando autenticação...');

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('✅ [Debug] Auth Status:', {
                hasSession: !!session,
                user: session?.user?.id,
                expiresAt: session?.expires_at,
                error
            });
            return { session, error };
        } catch (err) {
            console.error('❌ [Debug] Erro ao verificar auth:', err);
            return { session: null, error: err };
        }
    },

    /**
     * Limpa completamente o cache e sessão do Supabase
     */
    async clearAll() {
        console.log('🧹 [Debug] Limpando cache e sessão...');

        try {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ [Debug] Cache limpo! Recarregue a página.');
        } catch (err) {
            console.error('❌ [Debug] Erro ao limpar:', err);
        }
    },

    /**
     * Força logout e recarrega a página
     */
    async forceReset() {
        console.log('🔄 [Debug] Forçando reset completo...');
        await this.clearAll();
        window.location.reload();
    }
};

// Expor no console para debug
if (typeof window !== 'undefined') {
    (window as any).supabaseDebug = supabaseDebug;
    console.log('💡 Use supabaseDebug no console para debugar problemas com Supabase');
    console.log('Comandos disponíveis:');
    console.log('  - supabaseDebug.testConnection()  // Testa conexão básica');
    console.log('  - supabaseDebug.checkAuth()       // Verifica status de autenticação');
    console.log('  - supabaseDebug.clearAll()        // Limpa cache e sessão');
    console.log('  - supabaseDebug.forceReset()      // Reset completo + reload');
}
