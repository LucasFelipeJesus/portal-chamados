import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, LogIn, Mail, User as UserIcon, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [portalName, setPortalName] = useState('Portal de Chamados');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [renderKey, setRenderKey] = useState(0); // Forçar re-renderização
    const { signIn } = useAuth();

    // Log para debug - ver quando o componente renderiza
    console.log('🎨 [Login] Renderizando componente. Estado atual:', { error, loading });

    // Monitor de mudanças no estado de erro
    useEffect(() => {
        if (error) {
            console.log('🔴 [Login] Estado de erro atualizado:', error);
        }
    }, [error]);

    // Buscar configurações do sistema
    useEffect(() => {
        const fetchSettings = async () => {
            const { data: settings } = await supabase
                .from('system_settings')
                .select('setting_key, setting_value')
                .in('setting_key', ['portal_name', 'logo_url']);

            if (settings) {
                const nameConfig = settings.find(s => s.setting_key === 'portal_name');
                const logoConfig = settings.find(s => s.setting_key === 'logo_url');

                if (nameConfig?.setting_value) {
                    setPortalName(nameConfig.setting_value);
                }
                if (logoConfig?.setting_value) {
                    setLogoUrl(logoConfig.setting_value);
                }
            }
        };

        fetchSettings();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        console.log('🔐 [Login] Tentando fazer login com:', email);

        try {
            const errorMessage = await signIn(email, password);

            console.log('📨 [Login] Resposta do signIn:', errorMessage);

            if (errorMessage) {
                console.log('❌ [Login] Definindo erro:', errorMessage);
                setError(errorMessage);
                setLoading(false);
                // Forçar re-renderização para garantir que o erro apareça
                setRenderKey(prev => prev + 1);
            } else {
                console.log('✅ [Login] Login bem-sucedido!');
                setTimeout(() => setLoading(false), 500);
            }
        } catch (err) {
            console.error('💥 [Login] Erro ao fazer login:', err);
            setError('Erro inesperado. Tente novamente.');
            setLoading(false);
            setRenderKey(prev => prev + 1);
        }
    };

    const handleClearSession = async () => {
        setClearing(true);
        setError(null);
        try {
            // Limpa sessão do Supabase
            await supabase.auth.signOut();
            // Limpa localStorage
            localStorage.clear();
            // Limpa sessionStorage
            sessionStorage.clear();
            setError('Sessão limpa com sucesso! Tente fazer login novamente.');
        } catch (err) {
            console.error('Erro ao limpar sessão:', err);
            setError('Erro ao limpar sessão');
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                <div className="flex justify-center mb-6">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            className="h-20 w-auto object-contain"
                        />
                    ) : (
                        <ShieldCheck className="h-16 w-16 text-blue-600" />
                    )}
                </div>
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
                    {portalName}
                </h2>
                <p className="text-center text-gray-600 mb-6">
                    Acesse para abrir e gerenciar seus chamados.
                </p>
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        id="email"
                        label="E-mail"
                        type="email"
                        icon={<Mail />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                    <Input
                        id="password"
                        label="Senha"
                        type="password"
                        icon={<UserIcon />}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                    {error && (
                        <div key={renderKey} className={`rounded-lg p-4 flex items-start space-x-3 ${error.includes('sucesso')
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                            }`}>
                            {error.includes('sucesso') ? (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${error.includes('sucesso') ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {error.includes('sucesso') ? 'Sucesso!' : 'Erro no login'}
                                </p>
                                <p className={`text-sm mt-1 ${error.includes('sucesso') ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="pt-2 space-y-2">
                        <Button type="submit" isLoading={loading}>
                            <LogIn className="h-5 w-5 mr-2" />
                            Entrar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleClearSession}
                            variant="secondary"
                            isLoading={clearing}
                            className="text-sm"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Limpar Sessão (se tiver problemas no login)
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
