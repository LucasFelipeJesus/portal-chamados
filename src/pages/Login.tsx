import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, Mail, User as UserIcon, AlertCircle, CheckCircle, X as XIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../services/supabaseClient';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // local visual key to force re-create of the alert when error changes
    const [loading, setLoading] = useState(false);
    const [errorKey, setErrorKey] = useState(0);
    // Auth context provides cross-mount login errors
    const [portalName, setPortalName] = useState('Portal de Chamados');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const { signIn, authError, clearAuthError } = useAuth();

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

    useEffect(() => {
        console.log('🔧 [Login] mount');
        return () => console.log('🔧 [Login] unmount');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        console.trace('🧭 [Login] trace: iniciando signIn');
        setLoading(true);

        console.log('🔐 [Login] Tentando fazer login com:', email);

        try {
            const errorMessage = await signIn(email, password);

            console.log('📨 [Login] Resposta do signIn:', errorMessage);

            if (errorMessage) {
                console.log('❌ [Login] Erro retornado pelo signIn:', errorMessage);
                // signIn já atualiza authError no contexto; forçamos key para re-annouce
                setErrorKey(prev => prev + 1);
                setLoading(false);
            } else {
                console.log('✅ [Login] Login bem-sucedido!');
                setTimeout(() => setLoading(false), 500);
            }
        } catch (err) {
            console.error('💥 [Login] Erro ao fazer login:', err);
            // Em caso de erro inesperado, apenas logamos — context/signIn deve lidar com mensagens
            setLoading(false);
        }
    };

    // Nota: botão de limpar sessão removido — manutenção do fluxo de login simplificada

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

                    {authError && (
                        <div key={errorKey} role="alert" aria-live="assertive" className={`rounded-lg p-4 flex items-start space-x-3 ${authError?.includes('sucesso')
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                            }`}>
                            {authError?.includes('sucesso') ? (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${authError?.includes('sucesso') ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {authError?.includes('sucesso') ? 'Sucesso!' : 'Erro no login'}
                                </p>
                                <p className={`text-sm mt-1 ${authError?.includes('sucesso') ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {authError}
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearAuthError?.();
                                        setErrorKey(0);
                                    }}
                                    aria-label="Fechar mensagem"
                                    className="p-1 rounded hover:bg-gray-100"
                                >
                                    <XIcon className="h-4 w-4 text-gray-500" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 space-y-2">
                        <Button type="submit" isLoading={loading}>
                            <LogIn className="h-5 w-5 mr-2" />
                            Entrar
                        </Button>
                        {/* Botão de limpar sessão removido */}
                    </div>
                </form>
            </div>
        </div>
    );
};
