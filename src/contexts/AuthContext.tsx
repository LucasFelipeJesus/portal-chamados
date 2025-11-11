import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile, AuthContextType } from '../types';
import { supabase } from '../services/supabaseClient';


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

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
                    const currentUserId = user?.id;

                    // Se é o mesmo usuário, ignorar para evitar loop
                    if (newUserId === currentUserId) {
                        console.log('⚠️ SIGNED_IN ignorado - mesmo usuário já logado');
                        return;
                    }

                    console.log('✅ SIGNED_IN - novo login detectado, carregando perfil');
                    setUser(session?.user ?? null);
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
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (error) {
                console.error('Erro no login:', error.message);
                setLoading(false);

                // Mensagens de erro mais amigáveis
                if (error.message.includes('Invalid login credentials')) {
                    return 'Email ou senha incorretos';
                }
                if (error.message.includes('Email not confirmed')) {
                    return 'Por favor, confirme seu email antes de fazer login';
                }
                return error.message;
            }

            // O fetchProfile será chamado pelo listener onAuthStateChange
            setLoading(false);
            return null;
        } catch (err) {
            console.error('Erro inesperado no login:', err);
            setLoading(false);
            return 'Erro inesperado ao fazer login. Tente novamente.';
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 [Auth] Iniciando logout...');

            // Limpa estado imediatamente (não espera Supabase)
            setUser(null);
            setProfile(null);

            // Limpa localStorage primeiro
            localStorage.clear();
            sessionStorage.clear();

            console.log('🧹 [Auth] Estado e storage limpos');

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

            // Força reload da página para limpar qualquer estado residual
            window.location.reload();

        } catch (error) {
            console.error('❌ [Auth] Erro ao fazer logout (ignorando):', error);
            // Mesmo com erro, limpa tudo e recarrega
            setUser(null);
            setProfile(null);
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            console.log('Atualizando perfil manualmente...');
            await fetchProfile(user.id, true); // Força refresh
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext };
