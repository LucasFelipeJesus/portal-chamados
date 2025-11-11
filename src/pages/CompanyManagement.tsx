import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Plus, Edit2, Trash2, Loader2, Search, Save, X } from 'lucide-react';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { Company, Page } from '../types';
import { Input } from '../components/ui/Input';

interface CompanyManagementProps {
    setPage: (page: Page) => void;
}

export const CompanyManagementPage: React.FC<CompanyManagementProps> = ({ setPage }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [saving, setSaving] = useState(false);
    const [searchingCnpj, setSearchingCnpj] = useState(false);

    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        full_address: ''
    });

    // Fetch companies
    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        console.log('🚀 [CompanyManagement] Iniciando fetchCompanies...');
        setLoading(true);
        setError(null);

        try {
            // Usa supabaseAdmin para bypassar RLS
            const client = supabaseAdmin || supabase;
            console.log('🔧 [CompanyManagement] Usando client:', supabaseAdmin ? 'ADMIN' : 'NORMAL');

            // Adiciona timeout
            const companiesPromise = client
                .from('companies')
                .select('*')
                .order('name', { ascending: true });

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('⏱️ Timeout: A consulta demorou mais de 10 segundos')), 10000)
            );

            const { data, error: fetchError } = await Promise.race([
                companiesPromise,
                timeoutPromise
            ]) as Awaited<typeof companiesPromise>;

            console.log('📊 [CompanyManagement] Resultado:', { success: !fetchError, count: data?.length });

            if (fetchError) {
                console.error('❌ [CompanyManagement] Erro ao buscar empresas:', fetchError);
                setError(fetchError.message);
            } else {
                setCompanies(data || []);
                setFilteredCompanies(data || []);
            }
        } catch (err) {
            console.error('💥 [CompanyManagement] Erro:', err);
            setError(err instanceof Error ? err.message : 'Erro inesperado');
        } finally {
            console.log('🏁 [CompanyManagement] Finalizado');
            setLoading(false);
        }
    };

    // Filter companies
    useEffect(() => {
        if (!searchTerm) {
            setFilteredCompanies(companies);
        } else {
            const filtered = companies.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.cnpj.includes(searchTerm)
            );
            setFilteredCompanies(filtered);
        }
    }, [searchTerm, companies]);

    // Open modal for creating
    const handleCreate = () => {
        setModalMode('create');
        setEditingCompany(null);
        setFormData({ name: '', cnpj: '', full_address: '' });
        setIsModalOpen(true);
    };

    // Open modal for editing
    const handleEdit = (company: Company) => {
        setModalMode('edit');
        setEditingCompany(company);
        setFormData({
            name: company.name,
            cnpj: company.cnpj,
            full_address: company.full_address || ''
        });
        setIsModalOpen(true);
    };

    // Close modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCompany(null);
        setFormData({ name: '', cnpj: '', full_address: '' });
    };

    // Search CNPJ
    const handleCnpjSearch = async () => {
        if (!formData.cnpj || formData.cnpj.replace(/\D/g, '').length !== 14) {
            alert('Digite um CNPJ válido (14 dígitos)');
            return;
        }

        setSearchingCnpj(true);

        try {
            const cnpjNumeros = formData.cnpj.replace(/\D/g, '');
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjNumeros}`);

            if (!response.ok) {
                throw new Error('CNPJ não encontrado');
            }

            const data = await response.json();

            // Monta o endereço completo com CEP
            const endereco = `${data.logradouro}, ${data.numero || 'S/N'}, ${data.bairro}, ${data.municipio} - ${data.uf}, CEP: ${data.cep}`;

            setFormData(prev => ({
                ...prev,
                name: data.razao_social || data.nome_fantasia || prev.name,
                full_address: endereco
            }));

            alert('Dados da empresa carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            alert(`Erro ao buscar CNPJ: ${error instanceof Error ? error.message : 'CNPJ não encontrado ou inválido'}`);
        }

        setSearchingCnpj(false);
    };

    // Remover função de busca de CEP (não precisamos mais)
    // A BrasilAPI já retorna o endereço completo

    // Save company
    const handleSave = async () => {
        // Validation
        if (!formData.name.trim()) {
            alert('Nome da empresa é obrigatório');
            return;
        }
        if (!formData.cnpj.trim()) {
            alert('CNPJ é obrigatório');
            return;
        }

        setSaving(true);

        try {
            if (modalMode === 'create') {
                const { error: insertError } = await supabase
                    .from('companies')
                    .insert([{
                        name: formData.name,
                        cnpj: formData.cnpj,
                        full_address: formData.full_address || null
                    }]);

                if (insertError) throw insertError;
                alert('Empresa criada com sucesso!');
            } else {
                const { error: updateError } = await supabase
                    .from('companies')
                    .update({
                        name: formData.name,
                        cnpj: formData.cnpj,
                        full_address: formData.full_address || null
                    })
                    .eq('id', editingCompany!.id);

                if (updateError) throw updateError;
                alert('Empresa atualizada com sucesso!');
            }

            handleCloseModal();
            fetchCompanies();
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            alert(`Erro ao salvar empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }

        setSaving(false);
    };

    // Delete company
    const handleDelete = async (id: string) => {
        setDeleting(true);

        try {
            const { error: deleteError } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            alert('Empresa excluída com sucesso!');
            setDeleteConfirmId(null);
            fetchCompanies();
        } catch (error) {
            console.error('Erro ao excluir empresa:', error);
            alert(`Erro ao excluir empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }

        setDeleting(false);
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10">
                <div className="flex justify-center items-center p-10 bg-white rounded-lg shadow-md">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-gray-600">Carregando empresas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Empresas</h1>
                    <p className="text-sm text-gray-500 mt-1">Visualize, crie, edite e exclua empresas cadastradas</p>
                </div>
                <button
                    onClick={() => setPage('dashboard')}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="font-medium">Voltar</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">
                    <strong className="font-bold">Erro ao carregar dados!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {/* Search and Actions */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full md:max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleCreate}
                        className="relative inline-flex items-center justify-center px-6 py-2.5 font-semibold text-white rounded-lg overflow-hidden transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Nova Empresa
                    </button>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total de Empresas</p>
                    <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-blue-600">Resultados Filtrados</p>
                    <p className="text-2xl font-bold text-blue-900">{filteredCompanies.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-green-600">Empresas Ativas</p>
                    <p className="text-2xl font-bold text-green-900">{companies.length}</p>
                </div>
            </div>

            {/* Companies List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Empresas Cadastradas ({filteredCompanies.length})
                        </h2>
                    </div>
                </div>

                {filteredCompanies.length === 0 ? (
                    <div className="text-center p-10">
                        <p className="text-gray-500">
                            {searchTerm ? 'Nenhuma empresa encontrada com os critérios de busca.' : 'Nenhuma empresa cadastrada.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        CNPJ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Endereço Completo
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredCompanies.map((company) => (
                                    <tr key={company.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{company.name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {company.cnpj}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                                            {company.full_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {deleteConfirmId === company.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDelete(company.id)}
                                                        disabled={deleting}
                                                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:bg-red-400"
                                                    >
                                                        {deleting ? 'Excluindo...' : 'Confirmar'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        disabled={deleting}
                                                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(company)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="Editar empresa"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(company.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Excluir empresa"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal for Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {modalMode === 'create' ? 'Nova Empresa' : 'Editar Empresa'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CNPJ <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.cnpj}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                                        placeholder="00.000.000/0000-00"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                    <button
                                        onClick={handleCnpjSearch}
                                        disabled={searchingCnpj}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Buscar dados pelo CNPJ"
                                    >
                                        {searchingCnpj ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Search className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Digite o CNPJ e clique na lupa para buscar os dados automaticamente
                                </p>
                            </div>

                            <Input
                                id="name"
                                label="Nome da Empresa"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Empresa XYZ Ltda"
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Endereço Completo
                                </label>
                                <textarea
                                    value={formData.full_address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, full_address: e.target.value }))}
                                    placeholder="Rua, número, bairro, cidade - UF (será preenchido automaticamente ao buscar o CNPJ)"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    O endereço será preenchido automaticamente ao buscar pelo CNPJ
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                disabled={saving}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                <X className="h-5 w-5 inline mr-2" />
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 inline mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 inline mr-2" />
                                        Salvar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
