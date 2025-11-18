// src/pages/EquipmentManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Building2, Wrench, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { Equipment, Company, Page } from '../types';
import { Button } from '../components/ui/Button';
import EquipmentModal from '../components/EquipmentModal';


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
            setEditingEquipment(equipment || null);
            setShowModal(true);
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

            <EquipmentModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditingEquipment(null); }}
                companies={companies}
                initialEquipment={editingEquipment}
                onSaved={async () => {
                    alert('✅ Equipamento salvo com sucesso!');
                    await loadData();
                }}
            />
        </div>
    );
};
