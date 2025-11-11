import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { UserProfile, Company, Page } from '../types';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

interface UserManagementPageProps {
    setPage: (page: Page) => void;
}

interface UserFormData {
    full_name: string;
    email: string;
    password: string;
    role: 'cliente' | 'tecnico' | 'admin' | '';
    company_id: string;
    additional_company_ids: string[];
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ setPage }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [formData, setFormData] = useState<UserFormData>({
        full_name: '',
        email: '',
        password: '',
        role: '',
        company_id: '',
        additional_company_ids: []
    });

    useEffect(() => {
        fetchUsers();
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Erro ao buscar empresas:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);

            if (!supabaseAdmin) {
                console.error('Service Role Key não configurada. Configure VITE_SUPABASE_SERVICE_ROLE_KEY no .env.local');
                setSuccessMessage('❌ Erro: Service Role Key não configurada');
                setTimeout(() => setSuccessMessage(''), 5000);
                return;
            }

            const { data, error } = await supabaseAdmin
                .from('user_profiles')
                .select(`
                    *,
                    company:companies!company_id(*)
                `)
                .order('full_name');

            if (error) throw error;

            // Buscar empresas adicionais para cada usuário
            const usersWithCompanies = await Promise.all(
                (data || []).map(async (user) => {
                    if (user.additional_company_ids && user.additional_company_ids.length > 0 && supabaseAdmin) {
                        const { data: additionalCompanies } = await supabaseAdmin
                            .from('companies')
                            .select('*')
                            .in('id', user.additional_company_ids);

                        return {
                            ...user,
                            companies: [user.company, ...(additionalCompanies || [])]
                        };
                    }
                    return {
                        ...user,
                        companies: [user.company]
                    };
                })
            );

            setUsers(usersWithCompanies);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user?: UserProfile) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                full_name: user.full_name,
                email: user.email,
                password: '',
                role: user.role,
                company_id: user.company_id,
                additional_company_ids: user.additional_company_ids || []
            });
        } else {
            setEditingUser(null);
            setFormData({
                full_name: '',
                email: '',
                password: '',
                role: '',
                company_id: '',
                additional_company_ids: []
            });
        }
        setFormError('');
        setShowPassword(false);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormError('');
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setFormError('');

            // Validações detalhadas
            if (!formData.full_name.trim()) {
                setFormError('⚠️ O nome completo é obrigatório');
                return;
            }

            if (!formData.email.trim()) {
                setFormError('⚠️ O email é obrigatório');
                return;
            }

            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setFormError('⚠️ Por favor, insira um email válido');
                return;
            }

            if (!formData.role) {
                setFormError('⚠️ Selecione um perfil (Admin, Técnico ou Cliente)');
                return;
            }

            if (!formData.company_id) {
                setFormError('⚠️ Selecione a empresa principal do usuário');
                return;
            }

            if (!editingUser && !formData.password) {
                setFormError('⚠️ A senha é obrigatória para novos usuários');
                return;
            }

            if (!editingUser && formData.password && formData.password.length < 6) {
                setFormError('⚠️ A senha deve ter no mínimo 6 caracteres');
                return;
            }

            if (editingUser) {
                // ATUALIZAR USUÁRIO EXISTENTE

                // Validar senha se fornecida
                if (formData.password && formData.password.length < 6) {
                    setFormError('⚠️ A nova senha deve ter no mínimo 6 caracteres');
                    return;
                }

                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .update({
                        full_name: formData.full_name,
                        role: formData.role,
                        company_id: formData.company_id,
                        additional_company_ids: formData.additional_company_ids
                    })
                    .eq('id', editingUser.id);

                if (profileError) throw profileError;

                // Se forneceu senha, atualizar (requer admin API)
                if (formData.password) {
                    if (!supabaseAdmin) {
                        throw new Error('❌ Service Role Key não configurada. Configure VITE_SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
                    }
                    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                        editingUser.id,
                        { password: formData.password }
                    );
                    if (passwordError) throw passwordError;
                }

                // Sucesso na edição
                // (mensagem será exibida no final do bloco try)
            } else {
                // CRIAR NOVO USUÁRIO
                if (!supabaseAdmin) {
                    throw new Error('❌ Service Role Key não configurada.\n\nPara criar usuários, você precisa:\n1. Ir no Supabase Dashboard → Settings → API\n2. Copiar a "service_role" key\n3. Criar arquivo .env na raiz do projeto\n4. Adicionar: VITE_SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
                }

                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: formData.email,
                    password: formData.password,
                    email_confirm: true
                });

                if (authError) {
                    console.error('Erro ao criar usuário no Auth:', authError);
                    if (authError.message.includes('User not allowed') || authError.message.includes('403')) {
                        throw new Error('❌ Erro de permissão: Configure a Service Role Key no arquivo .env para criar usuários.');
                    }
                    if (authError.message.includes('already registered')) {
                        throw new Error('❌ Este email já está cadastrado no sistema.');
                    }
                    throw new Error(`❌ Erro ao criar usuário: ${authError.message}`);
                }

                // Criar perfil usando supabaseAdmin para bypass do RLS
                const { error: profileError } = await supabaseAdmin
                    .from('user_profiles')
                    .insert({
                        id: authData.user.id,
                        full_name: formData.full_name,
                        email: formData.email,
                        role: formData.role,
                        company_id: formData.company_id,
                        additional_company_ids: formData.additional_company_ids,
                        force_password_change: true // Obrigar troca de senha no primeiro acesso
                    });

                if (profileError) {
                    console.error('Erro ao criar perfil:', profileError);
                    // Se falhou ao criar perfil, tentar deletar o usuário do Auth
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    throw new Error(`❌ Erro ao criar perfil: ${profileError.message || 'Tente novamente'}`);
                }

                // Fechar modal e atualizar lista
                handleCloseModal();
                await fetchUsers();

                // Mostrar mensagem de sucesso
                setSuccessMessage('✅ Usuário criado com sucesso! Ele precisará trocar a senha no primeiro acesso.');
                setTimeout(() => setSuccessMessage(''), 5000);
            }

            // Atualizar lista para edição
            if (editingUser) {
                await fetchUsers();
                handleCloseModal();
                setSuccessMessage('✅ Usuário atualizado com sucesso!');
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch (error: unknown) {
            console.error('Erro ao salvar usuário:', error);
            const errorMessage = error instanceof Error ? error.message : '❌ Erro desconhecido ao salvar usuário';
            setFormError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user: UserProfile) => {
        if (!window.confirm(`Tem certeza que deseja excluir ${user.full_name}?`)) {
            return;
        }

        if (!supabaseAdmin) {
            setSuccessMessage('❌ Service Role Key não configurada. Não é possível excluir usuários.');
            setTimeout(() => setSuccessMessage(''), 5000);
            return;
        }

        try {
            // Deletar do Auth (requer Service Role Key)
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
            if (authError) throw authError;

            // O perfil será deletado automaticamente via CASCADE no banco
            await fetchUsers();
            setSuccessMessage('✅ Usuário excluído com sucesso!');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            setSuccessMessage('❌ Erro ao excluir usuário');
            setTimeout(() => setSuccessMessage(''), 5000);
        }
    };

    const handleAdditionalCompanyToggle = (companyId: string) => {
        setFormData(prev => {
            const current = prev.additional_company_ids || [];
            if (current.includes(companyId)) {
                return {
                    ...prev,
                    additional_company_ids: current.filter(id => id !== companyId)
                };
            } else {
                return {
                    ...prev,
                    additional_company_ids: [...current, companyId]
                };
            }
        });
    };

    const handleSelectAllCompanies = () => {
        const availableCompanies = companies
            .filter(c => c.id !== formData.company_id)
            .map(c => c.id);

        const currentAdditional = formData.additional_company_ids || [];
        const allSelected = availableCompanies.every(id => currentAdditional.includes(id));

        if (allSelected) {
            // Desmarcar todas
            setFormData(prev => ({ ...prev, additional_company_ids: [] }));
        } else {
            // Selecionar todas
            setFormData(prev => ({ ...prev, additional_company_ids: availableCompanies }));
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        tecnicos: users.filter(u => u.role === 'tecnico').length,
        clientes: users.filter(u => u.role === 'cliente').length
    };

    const availableAdditionalCompanies = companies.filter(c => c.id !== formData.company_id);
    const allAdditionalSelected = availableAdditionalCompanies.length > 0 &&
        availableAdditionalCompanies.every(c => (formData.additional_company_ids || []).includes(c.id));

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-gray-600">Carregando usuários...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Mensagem de Sucesso */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 animate-slide-in">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="font-medium">{successMessage}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Users className="h-8 w-8 mr-2 text-green-600" />
                        Gerenciamento de Usuários
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Gerencie usuários do sistema
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Total de Usuários</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Administradores</div>
                    <div className="text-2xl font-bold text-red-600">{stats.admins}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Técnicos</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.tecnicos}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Clientes</div>
                    <div className="text-2xl font-bold text-green-600">{stats.clientes}</div>
                </div>
            </div>

            {/* Search and Add */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full sm:max-w-md">
                        <Input
                            label=""
                            placeholder="Buscar por nome, email ou empresa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 whitespace-nowrap"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Novo Usuário
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nome
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Perfil
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Empresas
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                        user.role === 'tecnico' ? 'bg-blue-100 text-blue-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                        {user.role === 'admin' ? 'Admin' : user.role === 'tecnico' ? 'Técnico' : 'Cliente'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                        <span className="inline-flex items-center gap-1">
                                            {user.company?.name}
                                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Principal</span>
                                        </span>
                                        {user.companies && user.companies.length > 1 && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                {user.companies.slice(1).map(c => c.name).join(', ')}
                                                <span className="ml-1 text-gray-400">
                                                    (+{user.companies.length - 1} adicional{user.companies.length - 1 !== 1 ? 'is' : ''})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => handleOpenModal(user)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                        title="Editar"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum usuário encontrado
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
                        {/* Header fixo */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Fechar"
                                aria-label="Fechar modal"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Conteúdo scrollável */}
                        <div className="overflow-y-auto flex-1 p-6">
                            {formError && (
                                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start shadow-sm animate-shake">
                                    <AlertCircle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-900 mb-1">Erro de Validação</p>
                                        <p className="text-sm text-red-800">{formError}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-xs text-blue-800">
                                    <strong>Campos obrigatórios:</strong> Todos os campos marcados com <span className="text-red-600 font-bold">*</span> devem ser preenchidos.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Nome Completo *"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="João da Silva"
                                />

                                <Input
                                    label="Email *"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="joao@empresa.com"
                                    disabled={!!editingUser}
                                />

                                <div className="relative">
                                    <Input
                                        label={editingUser ? "Nova Senha (deixe em branco para manter)" : "Senha *"}
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="********"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded p-1 transition-colors"
                                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                <Select
                                    label="Perfil *"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'cliente' | 'tecnico' | 'admin' | '' })}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="admin">Administrador</option>
                                    <option value="tecnico">Técnico</option>
                                    <option value="cliente">Cliente</option>
                                </Select>

                                <Select
                                    label="Empresa Principal *"
                                    value={formData.company_id}
                                    onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                                >
                                    <option value="">Selecione...</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>

                                {/* Empresas Adicionais */}
                                {formData.company_id && availableAdditionalCompanies.length > 0 && (
                                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-semibold text-gray-800">
                                                Empresas Adicionais (opcional)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleSelectAllCompanies}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                            >
                                                {allAdditionalSelected ? '✓ Desmarcar todas' : '☐ Selecionar todas'}
                                            </button>
                                        </div>
                                        <div className="space-y-2.5 max-h-48 overflow-y-auto bg-white rounded-md p-3 border border-gray-200">
                                            {availableAdditionalCompanies.map((company) => (
                                                <label
                                                    key={company.id}
                                                    className="flex items-center p-2 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.additional_company_ids || []).includes(company.id)}
                                                        onChange={() => handleAdditionalCompanyToggle(company.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                                    />
                                                    <span className="ml-3 text-sm text-gray-700 font-medium">{company.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="mt-2 text-xs text-gray-600 italic">
                                            Selecione empresas adicionais além da empresa principal
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer fixo */}
                        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                            <button
                                onClick={handleCloseModal}
                                disabled={saving}
                                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : (
                                    editingUser ? 'Atualizar Usuário' : 'Criar Usuário'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
