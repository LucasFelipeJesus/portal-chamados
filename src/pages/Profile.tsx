import React, { useState } from 'react';
import { UserCircle, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Page } from '../types';

interface ProfilePageProps {
    setPage: (page: Page) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setPage }) => {
    const { profile, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Estado para informações pessoais
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');

    // Estado para troca de senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleUpdateProfile = async () => {
        try {
            setLoading(true);
            setMessage(null);

            if (!fullName.trim()) {
                setMessage({ type: 'error', text: 'Nome é obrigatório' });
                return;
            }

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: fullName,
                    phone: phone || null
                })
                .eq('id', user?.id);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });

            // Recarregar a página após 1 segundo para atualizar o contexto
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            setMessage({ type: 'error', text: 'Erro ao atualizar perfil' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            setLoading(true);
            setMessage(null);

            // Validações
            if (!currentPassword || !newPassword || !confirmPassword) {
                setMessage({ type: 'error', text: 'Preencha todos os campos de senha' });
                return;
            }

            if (newPassword !== confirmPassword) {
                setMessage({ type: 'error', text: 'As senhas não coincidem' });
                return;
            }

            if (newPassword.length < 6) {
                setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
                return;
            }

            // Validar senha atual fazendo login
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: profile?.email || '',
                password: currentPassword
            });

            if (signInError) {
                setMessage({ type: 'error', text: 'Senha atual incorreta' });
                return;
            }

            // Atualizar senha
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setMessage({ type: 'error', text: 'Erro ao alterar senha' });
        } finally {
            setLoading(false);
        }
    };

    if (!profile) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-gray-600">Carregando perfil...</div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <UserCircle className="h-8 w-8 mr-2 text-blue-600" />
                        Meu Perfil
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Gerencie suas informações pessoais e senha
                    </p>
                </div>
                <button
                    onClick={() => setPage('dashboard')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Voltar ao Dashboard"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="font-medium">Voltar</span>
                </button>
            </div>

            {/* Mensagem de sucesso/erro */}
            {message && (
                <div className={`mb-6 p-4 rounded-md flex items-start ${message.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Grid de 2 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Coluna 1: Informações Pessoais */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h2>

                    <div className="space-y-4">
                        <Input
                            label="Nome Completo"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Seu nome completo"
                        />

                        <Input
                            label="Email"
                            type="email"
                            value={profile.email}
                            disabled
                            className="bg-gray-50 cursor-not-allowed"
                        />

                        <Input
                            label="Telefone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Perfil
                            </label>
                            <input
                                type="text"
                                value={
                                    profile.role === 'admin' ? 'Administrador' :
                                        profile.role === 'tecnico' ? 'Técnico' :
                                            'Cliente'
                                }
                                disabled
                                title="Perfil do usuário"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Empresa
                            </label>
                            <input
                                type="text"
                                value={profile.company?.name || 'N/A'}
                                disabled
                                title="Empresa do usuário"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleUpdateProfile}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>

                {/* Coluna 2: Alterar Senha */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Alterar Senha</h2>

                    <div className="space-y-4">
                        <div className="relative">
                            <Input
                                label="Senha Atual"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Digite sua senha atual"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                                title={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="relative">
                            <Input
                                label="Nova Senha"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Digite a nova senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                                title={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="relative">
                            <Input
                                label="Confirmar Nova Senha"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Digite a nova senha novamente"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                                title={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-xs text-blue-800">
                                <strong>Dicas de segurança:</strong>
                            </p>
                            <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-1">
                                <li>Use pelo menos 6 caracteres</li>
                                <li>Misture letras, números e símbolos</li>
                                <li>Não use senhas óbvias ou repetidas</li>
                            </ul>
                        </div>

                        <Button
                            onClick={handleChangePassword}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {loading ? 'Alterando...' : 'Alterar Senha'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
