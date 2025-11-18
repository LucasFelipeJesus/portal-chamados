import React, { useState, useEffect } from 'react';
import { Settings, Upload, Image, Check, X, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import type { Page } from '../types';

interface SystemSettingsPageProps {
    setPage: (page: Page) => void;
}

interface SystemSetting {
    id: string;
    setting_key: string;
    setting_value: string | null;
    updated_at: string;
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({ setPage }) => {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Estados das configurações
    const [portalName, setPortalName] = useState('Portal de Chamados');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#2563eb');

    // Estado para preview da imagem
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            console.log('🚀 [SystemSettings] Iniciando fetchSettings...');
            setLoading(true);

            // Usa supabaseAdmin para bypassar RLS
            const client = supabaseAdmin || supabase;
            console.log('🔧 [SystemSettings] Usando client:', supabaseAdmin ? 'ADMIN' : 'NORMAL');

            // Adiciona timeout
            const settingsPromise = client
                .from('system_settings')
                .select('*');

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('⏱️ Timeout: A consulta demorou mais de 10 segundos')), 10000)
            );

            const { data, error } = await Promise.race([
                settingsPromise,
                timeoutPromise
            ]) as Awaited<typeof settingsPromise>;

            console.log('📊 [SystemSettings] Resultado:', { success: !error, count: data?.length });

            if (error) throw error;

            if (data) {
                data.forEach((setting: SystemSetting) => {
                    switch (setting.setting_key) {
                        case 'portal_name':
                            setPortalName(setting.setting_value || 'Portal de Chamados');
                            break;
                        case 'logo_url':
                            setLogoUrl(setting.setting_value);
                            setPreviewUrl(setting.setting_value);
                            break;
                        case 'primary_color':
                            setPrimaryColor(setting.setting_value || '#2563eb');
                            break;
                    }
                });
            }
        } catch (error) {
            console.error('💥 [SystemSettings] Erro ao buscar configurações:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Erro ao carregar configurações'
            });
        } finally {
            console.log('🏁 [SystemSettings] Finalizado');
            setLoading(false);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validar tipo de arquivo
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Por favor, selecione uma imagem válida' });
                return;
            }

            // Validar tamanho (máximo 2MB)
            if (file.size > 2 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Imagem muito grande. Máximo 2MB' });
                return;
            }

            setUploading(true);
            setMessage(null);

            // Criar nome único para o arquivo
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // Upload para o Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('portal-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error('Erro no upload:', uploadError);
                throw uploadError;
            }

            // Obter URL pública da imagem
            const { data: urlData } = supabase.storage
                .from('portal-assets')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;

            // Deletar logo antigo se existir
            if (logoUrl) {
                const oldPath = logoUrl.split('/').slice(-2).join('/');
                await supabase.storage
                    .from('portal-assets')
                    .remove([oldPath]);
            }

            // Atualizar no banco
            const { error: updateError } = await supabase
                .from('system_settings')
                .update({
                    setting_value: publicUrl,
                    updated_at: new Date().toISOString(),
                    updated_by: profile?.id
                })
                .eq('setting_key', 'logo_url');

            if (updateError) throw updateError;

            setLogoUrl(publicUrl);
            setPreviewUrl(publicUrl);
            setMessage({ type: 'success', text: 'Logo atualizada com sucesso!' });
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            setMessage({ type: 'error', text: 'Erro ao fazer upload da imagem' });
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (!logoUrl || !confirm('Tem certeza que deseja remover a logo?')) return;

        try {
            setUploading(true);

            // Deletar do storage
            const oldPath = logoUrl.split('/').slice(-2).join('/');
            await supabase.storage
                .from('portal-assets')
                .remove([oldPath]);

            // Atualizar no banco
            const { error } = await supabase
                .from('system_settings')
                .update({
                    setting_value: null,
                    updated_at: new Date().toISOString(),
                    updated_by: profile?.id
                })
                .eq('setting_key', 'logo_url');

            if (error) throw error;

            setLogoUrl(null);
            setPreviewUrl(null);
            setMessage({ type: 'success', text: 'Logo removida com sucesso!' });
        } catch (error) {
            console.error('Erro ao remover logo:', error);
            setMessage({ type: 'error', text: 'Erro ao remover logo' });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            setMessage(null);

            // Atualizar nome do portal
            const { error: nameError } = await supabase
                .from('system_settings')
                .update({
                    setting_value: portalName,
                    updated_at: new Date().toISOString(),
                    updated_by: profile?.id
                })
                .eq('setting_key', 'portal_name');

            if (nameError) throw nameError;

            // Atualizar cor primária
            const { error: colorError } = await supabase
                .from('system_settings')
                .update({
                    setting_value: primaryColor,
                    updated_at: new Date().toISOString(),
                    updated_by: profile?.id
                })
                .eq('setting_key', 'primary_color');

            if (colorError) throw colorError;

            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Settings className="h-8 w-8 mr-2 text-blue-600" />
                        Configurações do Sistema
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Personalize a aparência e informações do portal
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

            {/* Mensagem */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-start ${message.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <Check className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                        <X className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {message.text}
                    </p>
                </div>
            )}

            <div className="space-y-6">
                {/* Logo do Portal */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Image className="h-5 w-5 mr-2 text-blue-600" />
                        Logo do Portal
                    </h2>

                    <div className="space-y-4">
                        {/* Preview da logo */}
                        {previewUrl && (
                            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                                <img
                                    src={previewUrl}
                                    alt="Logo do Portal"
                                    className="max-h-32 object-contain"
                                />
                            </div>
                        )}

                        {/* Botões de ação */}
                        <div className="flex gap-3">
                            <label className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="hidden"
                                />
                                <div className={`
                                    flex items-center justify-center gap-2 px-4 py-3 
                                    bg-blue-600 hover:bg-blue-700 text-white font-medium 
                                    rounded-lg cursor-pointer transition-colors
                                    ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                                `}>
                                    {uploading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Enviando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-5 w-5" />
                                            <span>{previewUrl ? 'Trocar Logo' : 'Enviar Logo'}</span>
                                        </>
                                    )}
                                </div>
                            </label>

                            {previewUrl && (
                                <button
                                    onClick={handleRemoveLogo}
                                    disabled={uploading}
                                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                    title="Remover Logo"
                                    aria-label="Remover Logo"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-gray-500">
                            Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                        </p>
                    </div>
                </div>

                {/* Outras Configurações */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Informações Gerais
                    </h2>

                    <div className="space-y-4">
                        <Input
                            id="portal_name"
                            label="Nome do Portal"
                            value={portalName}
                            onChange={(e) => setPortalName(e.target.value)}
                            placeholder="Ex: Portal de Chamados"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cor Primária
                            </label>
                            <div className="flex items-center gap-4">
                                <div
                                    className="h-10 w-20 rounded border border-gray-300 flex-shrink-0 primary-color-preview"
                                    style={{ ['--primary-color' as string]: primaryColor } as React.CSSProperties}
                                    aria-label="Preview da cor primária"
                                ></div>
                                <Input
                                    id="color_hex"
                                    label=""
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    placeholder="#2563eb"
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                onClick={handleSaveSettings}
                                isLoading={saving}
                                disabled={saving}
                                className="w-full"
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Salvar Configurações
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
