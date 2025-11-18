// src/pages/EquipmentManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Building2, Wrench, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { Equipment, Company, Page } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { getManufacturers, getModelsByManufacturer } from '../data/equipmentCatalog';

interface EquipmentManagementProps {
    setPage: (page: Page) => void;
}

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({ setPage }) => {
    const { profile } = useAuth();
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    const [formData, setFormData] = useState({
        company_id: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        internal_location: '',
        installation_location: '',
        application_type: '' as 'Acesso' | 'Ponto' | '',
        tecnology: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [useCustomManufacturer, setUseCustomManufacturer] = useState(false);
    const [useCustomModel, setUseCustomModel] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    // Verificar permissões
    const canManage = profile?.role === 'admin' || profile?.role === 'tecnico';

    useEffect(() => {
        console.log('🚀 [EquipmentManagement] Componente montado, iniciando loadData...');

        // Resetar estados antes de carregar
        setEquipments([]);
        setCompanies([]);

        loadData();

        return () => {
            console.log('🧹 [EquipmentManagement] Componente desmontado');
        };
    }, []);

    const loadData = async () => {
        console.log('📥 Carregando dados...');
        setLoading(true);
        setError(null);

        // Usar supabaseAdmin para admin/técnico para evitar problemas com RLS
        const client = (profile?.role === 'admin' || profile?.role === 'tecnico') && supabaseAdmin
            ? supabaseAdmin
            : supabase;

        console.log('🔧 [loadData] Usando client:', supabaseAdmin && (profile?.role === 'admin' || profile?.role === 'tecnico') ? 'ADMIN' : 'NORMAL');

        try {
            // Carregar empresas PRIMEIRO
            console.log('📥 Buscando empresas...');
            const companiesPromise = client
                .from('companies')
                .select('*')
                .order('name');

            const { data: companiesData, error: companiesError } = await companiesPromise;

            if (companiesError) {
                console.error('❌ Erro ao carregar empresas:', companiesError);
                throw companiesError;
            }

            console.log('✅ Empresas carregadas:', companiesData?.length);
            setCompanies(companiesData || []);

            // Carregar equipamentos DEPOIS
            console.log('📥 Buscando equipamentos...');
            const equipmentsPromise = client
                .from('equipments')
                .select('*')
                .order('created_at', { ascending: false });

            const { data: equipmentsData, error: equipmentsError } = await equipmentsPromise;

            if (equipmentsError) {
                console.error('❌ Erro ao carregar equipamentos:', equipmentsError);
                console.error('❌ Código do erro:', equipmentsError.code);
                console.error('❌ Mensagem:', equipmentsError.message);

                if (equipmentsError.code === 'PGRST116') {
                    setError('Erro de permissão ao carregar equipamentos. Verifique as políticas RLS.');
                    return;
                }

                throw equipmentsError;
            }

            console.log('✅ Equipamentos carregados:', equipmentsData?.length);
            setEquipments(equipmentsData || []);

        } catch (error) {
            console.error('❌ Erro geral ao carregar dados:', error);
            setError('Erro ao carregar dados. Verifique o console para mais detalhes.');
        } finally {
            console.log('✅ loadData finalizado, setando loading=false');
            setLoading(false);
        }
    };

    const handleOpenModal = (equipment?: Equipment) => {
        if (equipment) {
            setEditingEquipment(equipment);
            setFormData({
                company_id: equipment.company_id,
                manufacturer: equipment.manufacturer,
                model: equipment.model,
                serial_number: equipment.serial_number || '',
                internal_location: equipment.internal_location || '',
                installation_location: equipment.installation_location || '',
                application_type: equipment.application_type || '',
                tecnology: equipment.tecnology || ''
            });

            // Verificar se o fabricante está na lista de sugestões
            const manufacturers = getManufacturers();
            const isCustomManufacturer = !manufacturers.includes(equipment.manufacturer);
            setUseCustomManufacturer(isCustomManufacturer);

            // Carregar modelos do fabricante
            if (!isCustomManufacturer) {
                const models = getModelsByManufacturer(equipment.manufacturer);
                setAvailableModels(models);
                setUseCustomModel(!models.includes(equipment.model));
            } else {
                setAvailableModels([]);
                setUseCustomModel(true);
            }
        } else {
            setEditingEquipment(null);
            setFormData({
                company_id: '',
                manufacturer: '',
                model: '',
                serial_number: '',
                internal_location: '',
                installation_location: '',
                application_type: '',
                tecnology: ''
            });
            setUseCustomManufacturer(false);
            setUseCustomModel(false);
            setAvailableModels([]);
        }
        setShowModal(true);
    };

    const handleManufacturerChange = (value: string) => {
        setFormData({ ...formData, manufacturer: value, model: '' });

        if (value === 'custom') {
            setUseCustomManufacturer(true);
            setAvailableModels([]);
            setFormData({ ...formData, manufacturer: '', model: '' });
        } else {
            setUseCustomManufacturer(false);
            const models = getModelsByManufacturer(value);
            setAvailableModels(models);
            setUseCustomModel(false);
        }
    };

    const handleModelChange = (value: string) => {
        if (value === 'custom') {
            setUseCustomModel(true);
            setFormData({ ...formData, model: '' });
        } else {
            setUseCustomModel(false);
            setFormData({ ...formData, model: value });
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEquipment(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return;

        setSubmitting(true);
        console.log('🚀 [handleSubmit] Iniciando submissão...');

        // Usar supabaseAdmin para admin/técnico para evitar problemas com RLS
        const client = (profile?.role === 'admin' || profile?.role === 'tecnico') && supabaseAdmin
            ? supabaseAdmin
            : supabase;

        console.log('🔧 Usando client:', supabaseAdmin && (profile?.role === 'admin' || profile?.role === 'tecnico') ? 'ADMIN' : 'NORMAL');

        try {
            if (editingEquipment) {
                // Atualizar
                console.log('🔄 Atualizando equipamento:', editingEquipment.id, formData);

                const updatePromise = client
                    .from('equipments')
                    .update({
                        company_id: formData.company_id,
                        manufacturer: formData.manufacturer,
                        model: formData.model,
                        serial_number: formData.serial_number || null,
                        internal_location: formData.internal_location || null,
                        installation_location: formData.installation_location || null,
                        application_type: formData.application_type || null,
                        tecnology: formData.tecnology || null
                    })
                    .eq('id', editingEquipment.id)
                    .select();

                // Adicionar timeout de 15 segundos
                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('⏱️ Timeout: A atualização demorou mais de 15 segundos. Verifique as RLS policies.')), 15000)
                );

                console.log('⏳ Aguardando resposta do Supabase...');
                const { data, error } = await Promise.race([
                    updatePromise,
                    timeoutPromise
                ]) as Awaited<typeof updatePromise>;
                console.log('📨 Resposta recebida:', { data, error });

                if (error) {
                    console.error('❌ Erro do Supabase:', error);
                    throw error;
                }

                console.log('✅ Equipamento atualizado:', data);
                alert('✅ Equipamento atualizado com sucesso!');
            } else {
                // Criar novo
                console.log('➕ Criando equipamento:', formData);

                const { data, error } = await client
                    .from('equipments')
                    .insert({
                        company_id: formData.company_id,
                        manufacturer: formData.manufacturer,
                        model: formData.model,
                        serial_number: formData.serial_number || null,
                        internal_location: formData.internal_location || null,
                        installation_location: formData.installation_location || null,
                        application_type: formData.application_type || null,
                        tecnology: formData.tecnology || null
                    })
                    .select();

                if (error) {
                    console.error('❌ Erro do Supabase:', error);
                    throw error;
                }

                console.log('✅ Equipamento criado:', data);
                alert('✅ Equipamento adicionado com sucesso!');
            }

            handleCloseModal();
            loadData();
        } catch (error) {
            console.error('❌ Erro ao salvar equipamento:', error);

            // Mensagens de erro mais específicas
            let errorMessage = '❌ Erro ao salvar equipamento.';

            if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
                errorMessage += '\n\n🔒 Erro de permissão (RLS). Verifique se as políticas estão corretas.';
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage += `\n\nDetalhes: ${error.message}`;
            }

            alert(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (equipment: Equipment) => {
        if (!canManage) return;

        const confirmDelete = confirm(
            `Tem certeza que deseja excluir o equipamento:\n${equipment.manufacturer} - ${equipment.model}?`
        );

        if (!confirmDelete) return;

        // Usar supabaseAdmin para admin/técnico
        const client = (profile?.role === 'admin' || profile?.role === 'tecnico') && supabaseAdmin
            ? supabaseAdmin
            : supabase;

        try {
            const { error } = await client
                .from('equipments')
                .delete()
                .eq('id', equipment.id);

            if (error) throw error;

            alert('✅ Equipamento excluído com sucesso!');
            loadData();
        } catch (error) {
            console.error('Erro ao excluir equipamento:', error);
            alert('❌ Erro ao excluir equipamento. Tente novamente.');
        }
    };

    // Filtrar equipamentos
    const filteredEquipments = equipments.filter(equipment => {
        const matchesSearch =
            equipment.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            equipment.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            equipment.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCompany = selectedCompany === 'all' || equipment.company_id === selectedCompany;

        return matchesSearch && matchesCompany;
    });

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || 'Empresa não encontrada';
    };

    if (!canManage) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">❌ Acesso negado. Apenas administradores e técnicos podem gerenciar equipamentos.</p>
                <Button onClick={() => setPage('dashboard')} className="mt-4">
                    Voltar ao Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Equipamentos</h1>
                    <p className="text-gray-600 mt-1">Gerencie todos os equipamentos cadastrados no sistema</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Novo Equipamento
                    </Button>
                    <button
                        onClick={() => setPage('dashboard')}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium">Voltar</span>
                    </button>
                </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">❌ {error}</p>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por fabricante, modelo ou número de série..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <label htmlFor="company-select" className="sr-only">
                        Empresa
                    </label>
                    <select
                        id="company-select"
                        aria-label="Empresa"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Todas as empresas</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabela de Equipamentos */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : filteredEquipments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum equipamento encontrado</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fabricante
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Modelo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Número de Série
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Localização
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEquipments.map((equipment) => (
                                    <tr key={equipment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {getCompanyName(equipment.company_id)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {equipment.manufacturer}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {equipment.model}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {equipment.serial_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {equipment.application_type ? (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${equipment.application_type === 'Acesso'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {equipment.application_type}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {equipment.internal_location || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenModal(equipment)}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(equipment)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Excluir"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Adicionar/Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                    aria-label="Fechar modal"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Select
                                    label="Empresa *"
                                    value={formData.company_id}
                                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione uma empresa</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </Select>

                                {/* Fabricante - Dropdown com opção de campo livre */}
                                <div className="space-y-2">
                                    {!useCustomManufacturer ? (
                                        <>
                                            <Select
                                                label="Fabricante *"
                                                value={formData.manufacturer}
                                                onChange={(e) => handleManufacturerChange(e.target.value)}
                                                required
                                            >
                                                <option value="">Selecione um fabricante</option>
                                                {getManufacturers().map(manufacturer => (
                                                    <option key={manufacturer} value={manufacturer}>
                                                        {manufacturer}
                                                    </option>
                                                ))}
                                                <option value="custom">➕ Outro (digitar manualmente)</option>
                                            </Select>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        label="Fabricante *"
                                                        value={formData.manufacturer}
                                                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                                        placeholder="Digite o nome do fabricante"
                                                        required
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                        title="Voltar para lista de fabricantes"
                                                    onClick={() => {
                                                        setUseCustomManufacturer(false);
                                                        setFormData({ ...formData, manufacturer: '', model: '' });
                                                        setAvailableModels([]);
                                                    }}
                                                    className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
                                                >
                                                    Lista
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Modelo - Dropdown com opção de campo livre */}
                                <div className="space-y-2">
                                    {!useCustomModel && availableModels.length > 0 ? (
                                        <>
                                            <Select
                                                label="Modelo *"
                                                value={formData.model}
                                                onChange={(e) => handleModelChange(e.target.value)}
                                                required
                                                disabled={!formData.manufacturer}
                                            >
                                                <option value="">Selecione um modelo</option>
                                                {availableModels.map(model => (
                                                    <option key={model} value={model}>
                                                        {model}
                                                    </option>
                                                ))}
                                                <option value="custom">➕ Outro (digitar manualmente)</option>
                                            </Select>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        label="Modelo *"
                                                        value={formData.model}
                                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                        placeholder="Digite o modelo do equipamento"
                                                        required
                                                        disabled={!formData.manufacturer}
                                                    />
                                                </div>
                                                {availableModels.length > 0 && (
                                                    <button
                                                        type="button"
                                                            title="Voltar para lista de modelos"
                                                        onClick={() => {
                                                            setUseCustomModel(false);
                                                            setFormData({ ...formData, model: '' });
                                                        }}
                                                        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
                                                    >
                                                        Lista
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <Input
                                    label="Número de Série"
                                    value={formData.serial_number}
                                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                />

                                <Select
                                    label="Tipo de Aplicação"
                                    value={formData.application_type}
                                    onChange={(e) => setFormData({ ...formData, application_type: e.target.value as 'Acesso' | 'Ponto' | '' })}
                                >
                                    <option value="">Selecione</option>
                                    <option value="Acesso">Acesso</option>
                                    <option value="Ponto">Ponto</option>
                                </Select>

                                <Input
                                    label="Tecnologia"
                                    value={formData.tecnology}
                                    onChange={(e) => setFormData({ ...formData, tecnology: e.target.value })}
                                    placeholder="Ex: Biometria, Proximidade, etc."
                                />

                                <Input
                                    label="Localização Interna"
                                    value={formData.internal_location}
                                    onChange={(e) => setFormData({ ...formData, internal_location: e.target.value })}
                                    placeholder="Ex: Portaria Principal"
                                />

                                <Input
                                    label="Local de Instalação"
                                    value={formData.installation_location}
                                    onChange={(e) => setFormData({ ...formData, installation_location: e.target.value })}
                                    placeholder="Ex: Próximo à recepção"
                                />

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCloseModal}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Salvando...
                                            </>
                                        ) : (
                                            editingEquipment ? 'Atualizar' : 'Adicionar'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
