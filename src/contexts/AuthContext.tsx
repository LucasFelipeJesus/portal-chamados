import React, { createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, AuthContextType } from '../types';
import { supabase } from '../services/supabaseClient';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    // Ref para armazenar o userId atual e evitar closures com valor stale
    const currentUserIdRef = useRef<string | null>(null);
    // Ref para controlar timer de inatividade
    const idleTimeoutRef = useRef<number | null>(null);
    // Tempo de inatividade (ms) antes do logout automático — 5 minutos
    const IDLE_TIMEOUT = 5 * 60 * 1000;

    useEffect(() => {
        // Busca a sessão inicial
        const getInitialSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Erro ao buscar sessão:', error);
                    // Limpa sessão corrompida
                    await supabase.auth.signOut();
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                setUser(session?.user ?? null);
                currentUserIdRef.current = session?.user?.id ?? null;

                if (session?.user) {
                    const profileLoaded = await fetchProfile(session.user.id);
                    // Se não conseguiu carregar o perfil, desloga
                    if (profileLoaded === false) {
                        console.warn('Perfil não encontrado, fazendo logout...');
                        await supabase.auth.signOut();
                        setUser(null);
                        setProfile(null);
                    }
                }
            } catch (err) {
                console.error('Erro inesperado ao inicializar sessão:', err);
                await supabase.auth.signOut();
                setUser(null);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Ouve mudanças na autenticação
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔔 Auth state changed:', event);

                // Ignorar eventos que não precisam de atualização de perfil
                if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    console.log(`${event} - mantendo perfil atual`);
                    return;
                }

                // INITIAL_SESSION já foi tratado no getInitialSession, ignorar completamente
                if (event === 'INITIAL_SESSION') {
                    console.log('🔄 INITIAL_SESSION detectado (ignorando - já tratado)');
                    return;
                }

                // Se houve erro na sessão, desloga
                if (event === 'SIGNED_OUT') {
                    console.log('🚪 SIGNED_OUT - limpando estado');
                    setUser(null);
                    setProfile(null);
                    return;
                }

                // Eventos de login - MAS APENAS SE O USUÁRIO MUDOU
                if (event === 'SIGNED_IN') {
                    const newUserId = session?.user?.id;
                    const currentUserId = currentUserIdRef.current;

                    // Se é o mesmo usuário, ignorar para evitar loop
                    if (newUserId === currentUserId) {
                        console.log('⚠️ SIGNED_IN ignorado - mesmo usuário já logado');
                        return;
                    }

                    console.log('✅ SIGNED_IN - novo login detectado, carregando perfil');
                    // Atualiza o user e o ref de id imediatamente
                    setUser(session?.user ?? null);
                    currentUserIdRef.current = session?.user?.id ?? null;

                    if (session?.user) {
                        await fetchProfile(session.user.id);
                    } else {
                        setProfile(null);
                    }
                }
            }
        );

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const clearAuthError = () => setAuthError(null);

    const fetchProfile = async (userId: string, forceRefresh = false): Promise<boolean> => {
        try {
            console.log('🔍 Buscando perfil para userId:', userId, forceRefresh ? '(FORÇANDO REFRESH COM BYPASS DE CACHE)' : '');

            // Bypass de cache: usar timestamp único
            if (forceRefresh) {
                // Aguardar 100ms para garantir que a atualização do banco foi propagada
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*, company:companies(*)')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('❌ Erro ao buscar perfil:', error.message, error);
                setProfile(null);
                return false;
            }

            if (!data) {
                console.error('❌ Perfil não encontrado para o usuário:', userId);
                setProfile(null);
                return false;
            }

            console.log('✅ Perfil carregado:', {
                id: data.id,
                full_name: data.full_name,
                email: data.email,
                force_password_change: data.force_password_change,
                timestamp: new Date().toISOString()
            });

            setProfile(data as UserProfile);
            return true;
        } catch (err) {
            console.error('❌ Erro inesperado ao buscar perfil:', err);
            setProfile(null);
            return false;
        }
    };

    const signIn = async (email: string, password: string) => {
        console.log('🔐 [AuthContext] signIn chamado para:', email);
        setLoading(true);
        // limpar erro anterior
        setAuthError(null);

        try {
            console.log('📤 [AuthContext] Enviando credenciais para Supabase...');
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            console.log('📥 [AuthContext] Resposta do Supabase:', { error });

            if (error) {
                console.error('❌ [AuthContext] Erro no login:', error.message);
                setLoading(false);

                // Mensagens de erro mais amigáveis
                if (error.message.includes('Invalid login credentials')) {
                    console.log('🔴 [AuthContext] Retornando: Email ou senha incorretos');
                    setAuthError('Email ou senha incorretos');
                    return 'Email ou senha incorretos';
                }
                if (error.message.includes('Email not confirmed')) {
                    console.log('🔴 [AuthContext] Retornando: Email não confirmado');
                    setAuthError('Por favor, confirme seu email antes de fazer login');
                    return 'Por favor, confirme seu email antes de fazer login';
                }
                console.log('🔴 [AuthContext] Retornando erro original:', error.message);
                setAuthError(error.message);
                return error.message;
            }

            // O fetchProfile será chamado pelo listener onAuthStateChange
            console.log('✅ [AuthContext] Login bem-sucedido, retornando null');
            setLoading(false);
            return null;
        } catch (err) {
            console.error('💥 [AuthContext] Erro inesperado no login:', err);
            setLoading(false);
            setAuthError('Erro inesperado ao fazer login. Tente novamente.');
            return 'Erro inesperado ao fazer login. Tente novamente.';
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 [Auth] Iniciando logout...');
            // Limpa estado imediatamente (não espera Supabase)
            setUser(null);
            currentUserIdRef.current = null;
            setProfile(null);
            setAuthError(null);
            // Tenta fazer logout no Supabase (com timeout)
            const logoutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => {
                    console.log('⏱️ [Auth] Timeout no logout do Supabase (ignorando)');
                    resolve(null);
                }, 2000)
            );
            await Promise.race([logoutPromise, timeoutPromise]);
            console.log('✅ [Auth] Logout concluído');
            try {
                // Redireciona para tela de login (root). Em SPA isso também forçará
                // a exibição do `LoginPage` caso o App baseie-se em `user`.
                if (typeof window !== 'undefined') {
                    // Use Vite's BASE_URL so redirect works both in dev ("/")
                    // and when deployed under a subpath (e.g. "/portal-chamados/").
                    // `import.meta.env.BASE_URL` is set from `vite.config.ts` `base` option.
                    // Fallback to '/' if not available.
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore - import.meta.env typing can vary across setups
                    const base = (import.meta as any)?.env?.BASE_URL || '/';
                    window.location.href = base;
                }
            } catch (err) {
                // Não falhar o logout por erro de navegação
                console.warn('Não foi possível redirecionar automaticamente:', err);
            }
        } catch (error) {
            console.error('❌ [Auth] Erro ao fazer logout (ignorando):', error);
            setUser(null);
            currentUserIdRef.current = null;
            setProfile(null);
        }
    };

    // Funções para controlar timeout de inatividade
    const clearIdleTimer = () => {
        if (idleTimeoutRef.current) {
            window.clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = null;
        }
    };

    const startIdleTimer = () => {
        clearIdleTimer();
        if (!user) return;
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        idleTimeoutRef.current = window.setTimeout(async () => {
            try {
                console.log('🔒 Inatividade detectada — efetuando logout automático');
                await signOut();
            } catch (err) {
                console.error('Erro no logout por inatividade:', err);
            }
        }, IDLE_TIMEOUT) as unknown as number;
    };

    // Adiciona listeners de atividade do usuário e listener de fechamento da aba
    useEffect(() => {
        // Só ativa quando houver um usuário logado
        if (!user) {
            clearIdleTimer();
            return;
        }

        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

        const onActivity = () => {
            startIdleTimer();
        };

        for (const ev of activityEvents) {
            window.addEventListener(ev, onActivity, { passive: true });
        }

        const onBeforeUnload = () => {
            try {
                console.log('⚠️ beforeunload - tentando logout rápido');
                // Tenta informar o servidor; não aguardamos pois o browser pode cancelar
                void supabase.auth.signOut();
            } catch (err) {
                // ignore
            }
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        // inicia o timer ao montar
        startIdleTimer();

        return () => {
            clearIdleTimer();
            for (const ev of activityEvents) {
                window.removeEventListener(ev, onActivity);
            }
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, [user]); // reconfigura quando usuário muda

    const refreshProfile = async () => {
        if (user?.id) {
            console.log('🔄 Atualizando perfil manualmente...');
            const success = await fetchProfile(user.id, true); // Força refresh
            if (success) {
                console.log('✅ Perfil atualizado com sucesso no contexto');
            } else {
                console.log('❌ Falha ao atualizar perfil no contexto');
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, authError, clearAuthError }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext };
