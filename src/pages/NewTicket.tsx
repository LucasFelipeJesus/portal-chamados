// src/pages/NewTicket.tsx - Wizard multi-etapas
import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, Loader2, Building2, AlertCircle, Wrench, Plus, ArrowLeft, Mail, Phone, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import { emailService } from '../services/emailService';
import type { TicketFormData, Page, Company, Equipment } from '../types';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import EquipmentModal from '../components/EquipmentModal';
import { FormSection } from '../components/FormSection';

interface NewTicketPageProps {
    setPage: (page: Page) => void;
    onOpenCompanyModal: (cnpj: string, onCreated?: (company: Company) => void) => void;
}

type WizardStep = 'cnpj-search' | 'equipment-selection' | 'ticket-form';

export const NewTicketPage: React.FC<NewTicketPageProps> = ({ setPage, onOpenCompanyModal }) => {
    const { profile } = useAuth();

    // Controle das etapas do wizard
    const [currentStep, setCurrentStep] = useState<WizardStep>('cnpj-search');

    // Dados da empresa selecionada
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    // Dados do equipamento selecionado/cadastrado
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    // Estado para busca de CNPJ (Etapa 1)
    const [cnpj, setCNPJ] = useState('');
    const [cnpjLoading, setCNPJLoading] = useState(false);
    const [cnpjError, setCNPJError] = useState<string | null>(null);
    // Lista de empresas exibida no select (clientes: vinculadas; admin/técnico: todas)
    const [companies, setCompanies] = useState<Company[]>([]);

    // Estado para equipamentos (Etapa 2)
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [equipmentsLoading, setEquipmentsLoading] = useState(false);
    const [showNewEquipmentForm, setShowNewEquipmentForm] = useState(false);

    // Estado do formulário de chamado (Etapa 3)
    const [formData, setFormData] = useState<TicketFormData>({
        manufacturer: '',
        model: '',
        application_type: '',
        problem_description: '',
        card_type: '',
        previous_procedures: '',
        address_cep: '',
        full_address: '',
        internal_location: '',
        integration_needed: false,
        integration_requirements: '',
        contact_name: profile?.full_name || '',
        contact_email: profile?.email || '',
        contact_phone: '',
        company_cnpj: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado para endereço de atendimento
    const [useCompanyAddress, setUseCompanyAddress] = useState<boolean | null>(null);

    // Função para resetar todos os estados
    const resetForm = () => {
        setCurrentStep('cnpj-search');
        setSelectedCompany(null);
        setSelectedEquipment(null);
        setCNPJ('');
        setCNPJLoading(false);
        setCNPJError(null);
        setEquipments([]);
        setEquipmentsLoading(false);
        setShowNewEquipmentForm(false);
        // newEquipment state removed; modal handles its own state now
        setFormData({
            manufacturer: '',
            model: '',
            application_type: '',
            problem_description: '',
            card_type: '',
            previous_procedures: '',
            address_cep: '',
            full_address: '',
            internal_location: '',
            integration_needed: false,
            integration_requirements: '',
            contact_name: profile?.full_name || '',
            contact_email: profile?.email || '',
            contact_phone: '',
            company_cnpj: ''
        });
        setIsSubmitting(false);
        setCepLoading(false);
        setUseCompanyAddress(null);
        setError(null);
    };

    // ==================== FUNÇÕES AUXILIARES ====================

    const loadEquipments = async (company: Company) => {
        console.log('📥 Carregando equipamentos para empresa:', company.name);
        setEquipmentsLoading(true);
        try {
            const { data, error } = await supabase
                .from('equipments')
                .select('*')
                .eq('company_id', company.id);

            if (error) throw error;

            setEquipments(data || []);
            setCurrentStep('equipment-selection');
            console.log('✅ Equipamentos carregados:', data?.length);
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('❌ Erro ao carregar equipamentos:', error);
                alert(`Erro ao carregar equipamentos: ${error.message}`);
            } else {
                console.error('❌ Erro ao carregar equipamentos:', error);
                alert('Erro ao carregar equipamentos: erro desconhecido');
            }
        } finally {
            setEquipmentsLoading(false);
        }
    };

    // ==================== ETAPA 1: BUSCA DE CNPJ ====================

    const formatCNPJ = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        const limited = numbers.slice(0, 14);

        if (limited.length <= 2) return limited;
        if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
        if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
        if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
        return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
    };

    const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCNPJ(e.target.value);
        setCNPJ(formatted);
        setCNPJError(null);
    };

    const validateCNPJ = (cnpj: string): boolean => {
        const numbers = cnpj.replace(/\D/g, '');
        return numbers.length === 14;
    };

    const handleCNPJSearch = async () => {
        if (!validateCNPJ(cnpj)) {
            setCNPJError('CNPJ inválido. Deve conter 14 dígitos.');
            return;
        }

        setCNPJLoading(true);
        setCNPJError(null);

        const cleanCNPJ = cnpj.replace(/\D/g, '');
        console.log('🔍 Buscando CNPJ:', cleanCNPJ);
        console.log('👤 Perfil do usuário:', { role: profile?.role, company_id: profile?.company_id });

        let query = supabase.from('companies').select('*');

        // Para clientes: filtrar apenas empresas vinculadas
        if (profile?.role === 'cliente') {
            const allowedCompanyIds: string[] = [];

            // Adicionar empresa principal se existir
            if (profile.company_id) {
                allowedCompanyIds.push(profile.company_id);
            }

            // Adicionar empresas adicionais se existirem
            if (profile.additional_company_ids && profile.additional_company_ids.length > 0) {
                allowedCompanyIds.push(...profile.additional_company_ids);
            }

            if (allowedCompanyIds.length > 0) {
                // Filtrar apenas empresas permitidas
                query = query.in('id', allowedCompanyIds);
                console.log('🔒 Cliente - Buscando apenas empresas vinculadas:', allowedCompanyIds);
            } else {
                // Cliente sem empresas vinculadas - não permitir busca
                console.log('🚫 Cliente sem empresas vinculadas - bloqueando busca');
                setCNPJError('Você não possui empresas vinculadas para abrir chamados.');
                setCNPJLoading(false);
                return;
            }
        } else {
            // Técnicos e admins podem ver todas as empresas
            console.log('🔓 Técnico/Admin - Buscando todas as empresas');
        }

        const { data: allCompanies, error } = await query;

        setCNPJLoading(false);

        if (error) {
            console.error('❌ Erro ao buscar empresas:', error);
            setCNPJError(`Erro na busca: ${error.message}`);
            return;
        }

        // Filtra localmente removendo a formatação para comparação exata
        const foundCompany = allCompanies?.find(company => {
            const dbCNPJ = company.cnpj.replace(/\D/g, '');
            console.log('🔎 Comparando:', dbCNPJ, '===', cleanCNPJ);
            return dbCNPJ === cleanCNPJ;
        });

        if (!foundCompany) {
            console.log('❌ CNPJ não encontrado. Total de empresas:', allCompanies?.length);
            if (profile?.role === 'cliente') {
                setCNPJError('CNPJ não vinculado a este usuário. Contatar o administrador do sistema.');
            } else {
                setCNPJError('CNPJ não encontrado no sistema.');
            }
            return;
        }

        console.log('✅ Empresa encontrada:', foundCompany);
        setSelectedCompany(foundCompany);
        setCNPJError(null);
    };

    const loadCompanies = async () => {
        if (!profile) return;

        // Para clientes: buscar apenas empresas vinculadas; para admin/técnico: buscar todas
        const allowedCompanyIds: string[] = [];
        if (profile.role === 'cliente') {
            if (profile.company_id) allowedCompanyIds.push(profile.company_id);
            if (profile.additional_company_ids && profile.additional_company_ids.length > 0) {
                allowedCompanyIds.push(...profile.additional_company_ids);
            }
        }

        try {
            let query = supabase.from('companies').select('*');

            if (profile.role === 'cliente') {
                if (allowedCompanyIds.length === 0) {
                    setCompanies([]);
                    return;
                }
                query = query.in('id', allowedCompanyIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            setCompanies(data || []);
        } catch (err) {
            console.error('Erro ao carregar empresas:', err);
            setCompanies([]);
        }
    };

    useEffect(() => {
        // Carrega empresas ao montar o componente
        loadCompanies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id]);

    const handleCNPJConfirm = async () => {
        if (!selectedCompany) return;
        await loadEquipments(selectedCompany);
    };

    // ==================== ETAPA 2: SELEÇÃO/CADASTRO DE EQUIPAMENTO ====================

    const handleEquipmentSelect = (equipment: Equipment) => {
        console.log('🔧 Equipamento selecionado:', equipment);
        setSelectedEquipment(equipment);
        setFormData(prev => ({
            ...prev,
            manufacturer: equipment.manufacturer,
            model: equipment.model,
            internal_location: equipment.internal_location || '',
            application_type: equipment.application_type || '', // Preenche com o tipo do equipamento
            card_type: (equipment.tecnology || '') as TicketFormData['card_type'], // Preenche com a tecnologia do equipamento
            company_cnpj: cnpj
        }));
        setCurrentStep('ticket-form');
    };


    // ==================== ETAPA 3: FORMULÁRIO DE CHAMADO ====================

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | boolean = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        }
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleCepSearch = async () => {
        const cep = formData.address_cep.replace(/\D/g, '');

        if (cep.length !== 8) {
            setError("CEP inválido. Deve conter 8 números.");
            return;
        }

        setCepLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) {
                throw new Error('Erro ao buscar CEP. Verifique a rede.');
            }
            const data = await response.json();
            if (data.erro) {
                throw new Error('CEP não encontrado.');
            }

            setFormData(prev => ({
                ...prev,
                full_address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
            }));

        } catch (err: unknown) {
            console.error("Erro ao buscar CEP:", err);
            setError(err instanceof Error ? err.message : "Não foi possível buscar o CEP.");
            setFormData(prev => ({ ...prev, full_address: '' }));
        } finally {
            setCepLoading(false);
        }
    };

    

    const validateForm = (): boolean => {
        if (!formData.manufacturer || !formData.model) {
            setError('Fabricante e Modelo são obrigatórios.'); return false;
        }
        if (formData.problem_description.length < 30) {
            setError('Descrição do problema deve ter no mínimo 30 caracteres.'); return false;
        }
        if (!formData.full_address) {
            setError('Endereço completo é obrigatório (use a busca por CEP).'); return false;
        }
        if (!formData.contact_name || !formData.contact_email || !formData.contact_phone) {
            setError('Todos os campos de contato são obrigatórios.'); return false;
        }
        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (!selectedCompany || !selectedEquipment || !profile) return;

        setIsSubmitting(true);

        const newTicketPayload = {
            client_id: profile.id,
            company_id: selectedCompany.id,
            status: 'aberto',
            equipment_manufacturer: formData.manufacturer,
            equipment_model: formData.model,
            application_type: formData.application_type,
            internal_location: formData.internal_location,
            form_data: formData
        };

        console.log('🎫 Criando ticket com payload:', newTicketPayload);
        console.log('👤 User ID atual (auth.uid()):', profile.id);
        console.log('🔑 Role do usuário:', profile.role);

        const { data, error: insertError } = await supabase
            .from('tickets')
            .insert([newTicketPayload])
            .select();

        if (insertError) {
            console.error('❌ Erro ao criar ticket:', insertError);
            console.error('📋 Detalhes do erro:', {
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                code: insertError.code
            });
            setError(`Erro ao criar chamado: ${insertError.message}`);
            setIsSubmitting(false);
        } else {
            console.log('✅ Chamado criado:', data);
            const ticketId = data[0].id;

            // 📧 Buscar emails dos administradores
            console.log('📧 Buscando administradores para notificar...');
            const { data: admins } = await supabase
                .from('user_profiles')
                .select('email, full_name')
                .eq('role', 'admin');

            const adminEmails = admins?.map(admin => admin.email) || [];
            console.log(`📧 Encontrados ${adminEmails.length} administrador(es)`);

            // 📧 Enviar emails de notificação
            console.log('📧 Enviando notificações por email...');

            const equipmentInfo = `${formData.manufacturer} - ${formData.model}`;

            try {
                const emailSent = await emailService.sendTicketCreatedNotification({
                    ticketId: ticketId,
                    clientName: profile.full_name,
                    clientEmail: profile.email,
                    clientPhone: profile.phone,
                    companyName: selectedCompany.name,
                    equipmentInfo: equipmentInfo,
                    serialNumber: selectedEquipment?.serial_number,
                    problemDescription: formData.problem_description,
                    contactName: formData.contact_name,
                    contactEmail: formData.contact_email,
                    contactPhone: formData.contact_phone,
                    internalLocation: formData.internal_location,
                    fullAddress: formData.full_address
                }, adminEmails);

                if (emailSent) {
                    console.log('✅ Emails enviados com sucesso!');
                } else {
                    console.warn('⚠️ Erro ao enviar emails (chamado criado com sucesso)');
                }
            } catch (emailError) {
                console.error('❌ Erro ao enviar emails:', emailError);
                // Não bloqueia o fluxo, apenas loga o erro
            }

            setIsSubmitting(false);
            alert(
                `✅ Chamado #${ticketId} criado com sucesso!\n\n` +
                `📧 Notificações enviadas para:\n` +
                `   • Você: ${profile.email}\n` +
                `   • Responsável local: ${formData.contact_name} (${formData.contact_email})\n` +
                `   • Administradores: ${adminEmails.length} pessoa(s)`
            );

            // Resetar o formulário antes de voltar ao dashboard
            resetForm();
            setPage('dashboard');
        }
    };

    // ==================== RENDERIZAÇÃO DAS ETAPAS ====================

    const renderStepIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                <div className={`flex items-center ${currentStep === 'cnpj-search' ? 'text-blue-600' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'cnpj-search' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>
                        {currentStep === 'cnpj-search' ? '1' : <CheckCircle className="h-5 w-5" />}
                    </div>
                    <span className="ml-2 font-medium">CNPJ</span>
                </div>
                <div className="flex-1 h-1 mx-4 bg-gray-300">
                    <div className={`h-full transition-all ${currentStep !== 'cnpj-search' ? 'bg-green-600 w-full' : 'bg-gray-300 w-0'}`} />
                </div>
                <div className={`flex items-center ${currentStep === 'equipment-selection' ? 'text-blue-600' : currentStep === 'ticket-form' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'equipment-selection' ? 'bg-blue-600 text-white' : currentStep === 'ticket-form' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {currentStep === 'ticket-form' ? <CheckCircle className="h-5 w-5" /> : '2'}
                    </div>
                    <span className="ml-2 font-medium">Equipamento</span>
                </div>
                <div className="flex-1 h-1 mx-4 bg-gray-300">
                    <div className={`h-full transition-all ${currentStep === 'ticket-form' ? 'bg-green-600 w-full' : 'bg-gray-300 w-0'}`} />
                </div>
                <div className={`flex items-center ${currentStep === 'ticket-form' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'ticket-form' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        3
                    </div>
                    <span className="ml-2 font-medium">Chamado</span>
                </div>
            </div>
        </div>
    );

    const renderCNPJSearch = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <Building2 className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-1">
                            Etapa 1: Identificação da Empresa
                        </h3>
                        <p className="text-sm text-blue-700">
                            Informe o CNPJ da empresa para a qual o chamado será aberto.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-4">
                    {/* Mostrar select de empresas para todos os perfis (clientes verão só as vinculadas) */}
                    {profile && (
                        <div className="mb-4">
                            <Select
                                id="company_select"
                                label="Escolha uma empresa (ou deixe em branco para digitar CNPJ)"
                                value={selectedCompany?.id || ''}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const companyId = e.target.value;
                                    if (!companyId) {
                                        setSelectedCompany(null);
                                        setCNPJ('');
                                        return;
                                    }
                                    const found = companies.find(c => c.id === companyId);
                                    if (found) {
                                        setSelectedCompany(found);
                                        setCNPJ(formatCNPJ(found.cnpj || ''));
                                        setCNPJError(null);
                                    }
                                }}
                            >
                                <option value="">-- Selecione uma empresa --</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>{company.name} — {company.cnpj}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className="relative">
                        <Input
                            id="cnpj"
                            label="CNPJ da Empresa"
                            value={cnpj}
                            onChange={handleCNPJChange}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            disabled={cnpjLoading || !!selectedCompany}
                        />
                        {!selectedCompany && (
                            <Button
                                type="button"
                                onClick={handleCNPJSearch}
                                disabled={cnpjLoading || !cnpj}
                                className="absolute right-1 bottom-1 !py-2 !px-3"
                            >
                                {cnpjLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </div>

                    {cnpjError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-900">Erro na busca</p>
                                    <p className="text-sm text-red-700 mt-1">{cnpjError}</p>

                                    {/* Botão para cadastrar empresa (apenas admin) */}
                                    {cnpjError.includes('não encontrado') && profile?.role === 'admin' && (
                                        <button
                                            type="button"
                                            onClick={() => onOpenCompanyModal(cnpj, async (company: Company) => {
                                                console.log('✅ Empresa criada recebida:', company);
                                                setSelectedCompany(company);
                                                setCNPJError(null);
                                                await loadEquipments(company);
                                            })}
                                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Building2 className="h-4 w-4" />
                                            Cadastrar esta empresa
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedCompany && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start">
                                    <Building2 className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900">Empresa encontrada!</p>
                                        <p className="text-lg font-bold text-green-900 mt-1">{selectedCompany.name}</p>
                                        <p className="text-sm text-green-700 mt-1">CNPJ: {cnpj}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedCompany(null);
                                        setCNPJ('');
                                    }}
                                    className="text-sm text-green-700 hover:text-green-900 underline"
                                >
                                    Alterar
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-green-200">
                                <Button
                                    type="button"
                                    onClick={handleCNPJConfirm}
                                    variant="primary"
                                    className="w-full"
                                >
                                    Continuar para Seleção de Equipamentos
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!selectedCompany && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-600">
                        <strong>Nota:</strong> Se o CNPJ da sua empresa não for encontrado,
                        entre em contato com o suporte para realizar o cadastro.
                    </p>
                </div>
            )}
        </div>
    );

    const renderEquipmentSelection = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start">
                        <Wrench className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-1">
                                Etapa 2: Seleção de Equipamento
                            </h3>
                            <p className="text-sm text-blue-700">
                                Selecione o equipamento com problema ou cadastre um novo.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Empresa: <strong>{selectedCompany?.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCurrentStep('cnpj-search')}
                        className="text-sm text-blue-700 hover:text-blue-900 flex items-center"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                {equipmentsLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {equipments.length > 0 ? (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">
                                    Equipamentos Cadastrados ({equipments.length})
                                </h4>
                                <div className="space-y-2">
                                    {equipments.map((equipment) => (
                                        <button
                                            key={equipment.id}
                                            type="button"
                                            onClick={() => handleEquipmentSelect(equipment)}
                                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-900 text-lg">
                                                        {equipment.manufacturer} - {equipment.model}
                                                    </p>
                                                    {equipment.internal_location && (
                                                        <p className="text-sm text-gray-700 mt-1">
                                                            <span className="font-medium">Local:</span> {equipment.internal_location}
                                                        </p>
                                                    )}
                                                    {equipment.serial_number && (
                                                        <p className="text-sm text-gray-600 mt-0.5">
                                                            <span className="font-medium">Serial:</span> {equipment.serial_number}
                                                        </p>
                                                    )}
                                                </div>
                                                <Wrench className="h-5 w-5 text-gray-400" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                                <h4 className="font-semibold text-yellow-900 mb-2">
                                    Nenhum equipamento cadastrado
                                </h4>
                                <p className="text-sm text-yellow-700 mb-4">
                                    Não encontramos equipamentos cadastrados para <strong>{selectedCompany?.name}</strong>.
                                    <br />
                                    Cadastre um novo equipamento para continuar.
                                </p>
                            </div>
                        )}

                        {!showNewEquipmentForm ? (
                            <Button
                                type="button"
                                onClick={() => setShowNewEquipmentForm(true)}
                                variant="secondary"
                                className="w-full"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Cadastrar Novo Equipamento
                            </Button>
                        ) : (
                            <EquipmentModal
                                isOpen={showNewEquipmentForm}
                                onClose={() => { setShowNewEquipmentForm(false); setError(null); }}
                                companies={selectedCompany ? [selectedCompany] : companies}
                                onSaved={(equipment) => {
                                    // Adiciona o novo equipamento à lista local e seleciona
                                    setEquipments(prev => [equipment, ...prev]);
                                    setSelectedEquipment(equipment);
                                    setFormData(prev => ({
                                        ...prev,
                                        manufacturer: equipment.manufacturer,
                                        model: equipment.model,
                                        internal_location: equipment.internal_location || '',
                                        company_cnpj: cnpj
                                    }));
                                    setShowNewEquipmentForm(false);
                                    setCurrentStep('ticket-form');
                                }}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderTicketForm = () => {
        // Calcula os números das seções dinamicamente
        let sectionNum = 0;
        const hasApplicationType = !!selectedEquipment?.application_type;
        const hasTecnology = !!selectedEquipment?.tecnology;

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start">
                            <CheckCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                                    Etapa 3: Detalhes do Chamado
                                </h3>
                                <p className="text-sm text-blue-700">
                                    Preencha as informações sobre o problema.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCurrentStep('equipment-selection')}
                            className="text-sm text-blue-700 hover:text-blue-900 flex items-center"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Voltar
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8 space-y-6">

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Equipamento Selecionado:</p>
                        <div className="space-y-2">
                            <p className="text-lg font-bold text-gray-900">
                                {selectedEquipment?.manufacturer} - {selectedEquipment?.model}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                {selectedEquipment?.internal_location && (
                                    <p className="text-gray-700">
                                        <span className="font-medium">Local:</span> {selectedEquipment.internal_location}
                                    </p>
                                )}
                                {selectedEquipment?.serial_number && (
                                    <p className="text-gray-700">
                                        <span className="font-medium">Nº Série:</span> {selectedEquipment.serial_number}
                                    </p>
                                )}
                                {selectedEquipment?.application_type && (
                                    <p className="text-gray-700">
                                        <span className="font-medium">Aplicação:</span> {selectedEquipment.application_type}
                                    </p>
                                )}
                                {selectedEquipment?.tecnology && (
                                    <p className="text-gray-700">
                                        <span className="font-medium">Tecnologia:</span> {selectedEquipment.tecnology}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Só mostra a seção de Tipo de Aplicação se o equipamento NÃO tiver */}
                    {!hasApplicationType && (
                        <FormSection number={++sectionNum} title="Tipo de aplicação">
                            <Select
                                id="application_type"
                                name="application_type"
                                label="Tipo de Aplicação"
                                value={formData.application_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selecione...</option>
                                <option value="Acesso">Acesso</option>
                                <option value="Ponto">Ponto</option>
                            </Select>
                        </FormSection>
                    )}

                    <FormSection number={++sectionNum} title="Descreva o problema">
                        <div className="md:col-span-2">
                            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-500 rounded-lg shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-800 mb-2">
                                            � Importante: Envie também um vídeo do problema!
                                        </p>
                                        <p className="text-sm text-gray-700 mb-2">
                                            Se possível, grave um vídeo mostrando o problema e envie para um dos nossos telefones WhatsApp mencionando o número do chamado que você está abrindo assim como nome da empresa:
                                        </p>
                                        <div className="flex flex-wrap gap-3 mt-3">
                                            <a
                                                href="https://wa.me/5519999492176"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                                            >
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.304-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                19 99949-2176
                                            </a>
                                            <a
                                                href="https://wa.me/554730395061"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                                            >
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.304-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                47 3039-5061
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Textarea
                                id="problem_description"
                                name="problem_description"
                                label="Descrição Detalhada (mínimo 30 caracteres)"
                                value={formData.problem_description}
                                onChange={handleChange}
                                minLength={30}
                                required
                            />
                        </div>
                    </FormSection>

                    {/* Só mostra a seção de Tecnologia/Cartão se o equipamento NÃO tiver */}
                    {!hasTecnology && (
                        <FormSection number={++sectionNum} title="Tipo de cartão utilizado">
                            <Select
                                id="card_type"
                                name="card_type"
                                label="Tipo de Cartão/Tecnologia"
                                value={formData.card_type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selecione...</option>
                                <option value="Smartcard">Cartão smartcard</option>
                                <option value="Proximidade HID">Proximidade HID</option>
                                <option value="Biometria">Biometria</option>
                                <option value="Facial">Facial</option>
                            </Select>
                        </FormSection>
                    )}

                    <FormSection number={++sectionNum} title="Procedimentos já executados">
                        <div className="md:col-span-2">
                            <Textarea
                                id="previous_procedures"
                                name="previous_procedures"
                                label="Procedimentos Prévios (opcional)"
                                value={formData.previous_procedures}
                                onChange={handleChange}
                            />
                        </div>
                    </FormSection>

                    <FormSection number={++sectionNum} title="Endereço para atendimento">
                        <div className="md:col-span-2 space-y-4">
                            {/* Mostra endereço cadastrado da empresa */}
                            {selectedCompany?.full_address && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-blue-900 mb-2">
                                        Endereço cadastrado da empresa:
                                    </p>
                                    <p className="text-gray-900">{selectedCompany.full_address}</p>
                                </div>
                            )}

                            {/* Pergunta se o atendimento será neste endereço */}
                            {useCompanyAddress === null && selectedCompany?.full_address && (
                                <div className="flex flex-col gap-3">
                                    <p className="text-sm font-medium text-gray-900">
                                        O atendimento será realizado neste endereço?
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setUseCompanyAddress(true);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    full_address: selectedCompany.full_address || ''
                                                }));
                                            }}
                                            className="flex-1"
                                        >
                                            Sim, utilizar este endereço
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setUseCompanyAddress(false)}
                                            variant="secondary"
                                            className="flex-1"
                                        >
                                            Não, informar outro endereço
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Mostra campos para editar apenas se escolheu "Não" ou não tem endereço cadastrado */}
                            {(useCompanyAddress === false || !selectedCompany?.full_address) && (
                                <>
                                    {useCompanyAddress === false && selectedCompany?.full_address && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-blue-900">
                                                    Você optou por informar outro endereço
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCompanyAddress(null)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    ← Voltar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Input
                                            id="address_cep"
                                            name="address_cep"
                                            label="CEP"
                                            value={formData.address_cep}
                                            onChange={handleChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCepSearch}
                                            disabled={cepLoading}
                                            className="absolute right-1 bottom-1 bg-gray-200 p-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                        >
                                            {cepLoading ? (
                                                <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4 text-gray-600" />
                                            )}
                                        </button>
                                    </div>
                                    <Input
                                        id="full_address"
                                        name="full_address"
                                        label="Endereço Completo"
                                        value={formData.full_address}
                                        onChange={handleChange}
                                        required
                                    />
                                </>
                            )}

                            {/* Se escolheu "Sim", mostra apenas resumo confirmado */}
                            {useCompanyAddress === true && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-green-900 mb-1">
                                                ✓ Endereço confirmado para atendimento:
                                            </p>
                                            <p className="text-gray-900">{formData.full_address}</p>
                                            {formData.address_cep && (
                                                <p className="text-sm text-gray-600 mt-1">CEP: {formData.address_cep}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUseCompanyAddress(null);
                                                setFormData(prev => ({ ...prev, full_address: '', address_cep: '' }));
                                            }}
                                            className="text-sm text-blue-600 hover:text-blue-800 ml-4"
                                        >
                                            Alterar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </FormSection>

                    <FormSection number={++sectionNum} title="Local interno">
                        <Input
                            id="internal_location"
                            name="internal_location"
                            label="Ex: Portaria 1, Catraca Refeitório"
                            value={formData.internal_location}
                            onChange={handleChange}
                            required
                        />
                    </FormSection>

                    <FormSection number={++sectionNum} title="Necessário integração?">
                        <div className="md:col-span-2 space-y-4">
                            <div className="flex items-center">
                                <input
                                    id="integration_needed"
                                    name="integration_needed"
                                    type="checkbox"
                                    checked={formData.integration_needed}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="integration_needed" className="ml-2 block text-sm text-gray-900">
                                    Sim, é necessário
                                </label>
                            </div>
                            {formData.integration_needed && (
                                <Textarea
                                    id="integration_requirements"
                                    name="integration_requirements"
                                    label="Quais são as exigências?"
                                    value={formData.integration_requirements}
                                    onChange={handleChange}
                                />
                            )}
                        </div>
                    </FormSection>

                    <FormSection number={++sectionNum} title="Responsável pelo acompanhamento">
                        <Input
                            id="contact_name"
                            name="contact_name"
                            label="Nome Completo"
                            icon={<User />}
                            value={formData.contact_name}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            id="contact_email"
                            name="contact_email"
                            label="E-mail"
                            type="email"
                            icon={<Mail />}
                            value={formData.contact_email}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            id="contact_phone"
                            name="contact_phone"
                            label="Telefone/Celular"
                            type="tel"
                            icon={<Phone />}
                            value={formData.contact_phone}
                            onChange={handleChange}
                            required
                        />
                    </FormSection>

                    <div className="mt-8 pt-5 border-t border-gray-200">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
                                <strong className="font-bold">Erro!</strong>
                                <span className="block sm:inline"> {error}</span>
                            </div>
                        )}
                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setPage('dashboard')}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Enviar Chamado
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Abrir Novo Chamado</h1>
                <button
                    onClick={() => setPage('dashboard')}
                    className="text-gray-600 hover:text-gray-900"
                    title="Voltar para o dashboard"
                    aria-label="Voltar para o dashboard"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
            </div>

            {renderStepIndicator()}

            {currentStep === 'cnpj-search' && renderCNPJSearch()}
            {currentStep === 'equipment-selection' && renderEquipmentSelection()}
            {currentStep === 'ticket-form' && renderTicketForm()}

        </div>
    );
};
