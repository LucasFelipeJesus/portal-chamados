import { supabase } from './supabaseClient';


const supabaseDebug = {
    testConnection: async () => {
        try {
            const { error } = await supabase.from('user_profiles').select('id').limit(1);
            if (error) {
                console.error('❌ Falha na conexão com Supabase:', error.message);
            } else {
                console.log('✅ Conexão com Supabase OK');
            }
        } catch (err) {
            console.error('❌ Erro inesperado:', err);
        }
    },

    checkAuth: async () => {
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session;
        if (session && session.user) {
            console.log('🔑 Usuário autenticado:', session.user.id);
        } else {
            console.log('🔒 Usuário não autenticado');
        }
        if (error) {
            console.error('❌ Erro ao obter sessão:', error.message);
        }
    },
};



console.log('💡 Use supabaseDebug no console para debugar problemas com Supabase');
console.log('Comandos disponíveis:');
console.log('  - supabaseDebug.testConnection()  // Testa conexão básica');
console.log('  - supabaseDebug.checkAuth()       // Verifica status de autenticação');

(window as unknown as { supabaseDebug: typeof supabaseDebug }).supabaseDebug = supabaseDebug;

export default supabaseDebug;
