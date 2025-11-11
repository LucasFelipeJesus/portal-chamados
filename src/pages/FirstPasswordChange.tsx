import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const FirstPasswordChangePage: React.FC = () => {
    const { profile, user, refreshProfile } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError('');

            // Validações
            if (!newPassword || !confirmPassword) {
                setError('Preencha todos os campos');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('As senhas não coincidem');
                return;
            }

            if (newPassword.length < 6) {
                setError('A senha deve ter pelo menos 6 caracteres');
                return;
            }

            if (!supabaseAdmin) {
                console.error('❌ supabaseAdmin não está configurado!');
                setError('Erro de configuração. Entre em contato com o administrador.');
                return;
            }

            console.log('✅ supabaseAdmin está configurado');
            console.log('🔐 Atualizando senha para userId:', user?.id);

            // Atualizar senha do usuário
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                console.error('❌ Erro ao atualizar senha:', updateError);
                throw updateError;
            }

            console.log('✅ Senha alterada com sucesso!');
            console.log('🔄 Atualizando flag force_password_change para false...');
            console.log('📝 User ID:', user?.id);

            // Primeiro, verificar o valor atual no banco
            const { data: beforeData } = await supabaseAdmin
                .from('user_profiles')
                .select('force_password_change')
                .eq('id', user?.id)
                .single();

            console.log('📊 Valor ANTES da atualização:', beforeData);

            // Atualizar flag no perfil usando supabaseAdmin (bypass RLS)
            const { data: updateData, error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .update({ force_password_change: false })
                .eq('id', user?.id)
                .select();

            if (profileError) {
                console.error('❌ Erro ao atualizar flag:', profileError);
                throw profileError;
            }

            console.log('✅ Flag atualizada no banco - Resposta do UPDATE:', updateData);

            // Verificar se realmente atualizou
            const { data: afterData } = await supabaseAdmin
                .from('user_profiles')
                .select('force_password_change')
                .eq('id', user?.id)
                .single();

            console.log('📊 Valor DEPOIS da atualização:', afterData);

            // Aguardar um momento e atualizar o perfil no contexto
            console.log('⏳ Aguardando 1 segundo para propagação no banco...');
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('🔄 Atualizando perfil no contexto...');

            // Atualizar o perfil diretamente sem recarregar a página
            await refreshProfile();

            console.log('✅ Perfil atualizado no contexto!');
            console.log('📋 Verificando perfil atual após refresh:', profile);

            // Se ainda tiver force_password_change = true, algo está errado
            if (profile?.force_password_change === true) {
                console.error('⚠️ AVISO: Perfil ainda mostra force_password_change=true após atualização!');
                console.error('🔄 Tentando recarregar a página como fallback...');
                await new Promise(resolve => setTimeout(resolve, 500));
                window.location.reload();
            } else {
                console.log('🎉 Sucesso! A tela deve mudar para o dashboard agora.');
            }
        } catch (err) {
            console.error('Erro ao alterar senha:', err);
            setError('Erro ao alterar senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
                {/* Ícone de alerta */}
                <div className="flex justify-center mb-4">
                    <div className="bg-yellow-100 rounded-full p-3">
                        <AlertCircle className="h-12 w-12 text-yellow-600" />
                    </div>
                </div>

                {/* Título */}
                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Alteração de Senha Obrigatória
                </h1>
                <p className="text-sm text-gray-600 text-center mb-6">
                    Por segurança, você precisa alterar sua senha no primeiro acesso
                </p>

                {/* Informações do usuário */}
                <div className="bg-gray-50 rounded-md p-4 mb-6">
                    <p className="text-sm text-gray-700">
                        <strong>Nome:</strong> {profile?.full_name}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                        <strong>Email:</strong> {profile?.email}
                    </p>
                </div>

                {/* Mensagem de erro */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-red-800">{error}</span>
                    </div>
                )}

                {/* Formulário */}
                <div className="space-y-4">
                    <div className="relative">
                        <Input
                            label="Nova Senha"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Digite sua nova senha"
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
                            placeholder="Digite a senha novamente"
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
                            <strong>Requisitos de segurança:</strong>
                        </p>
                        <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-1">
                            <li>Mínimo de 6 caracteres</li>
                            <li>Use uma combinação de letras, números e símbolos</li>
                            <li>Evite senhas óbvias ou fáceis de adivinhar</li>
                        </ul>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? 'Alterando senha...' : 'Confirmar Nova Senha'}
                    </Button>
                </div>

                {/* Nota de segurança */}
                <p className="text-xs text-gray-500 text-center mt-6">
                    Esta é uma medida de segurança para proteger sua conta. Após alterar a senha, você terá acesso completo ao sistema.
                </p>
            </div>
        </div>
    );
};
