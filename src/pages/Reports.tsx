import React, { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Loader2, FileText, FileDown } from 'lucide-react';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { Ticket, Page, TicketStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsPageProps {
    setPage: (page: Page) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ setPage }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    // Filtros
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterEquipmentManufacturer, setFilterEquipmentManufacturer] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [filterUser, setFilterUser] = useState('');

    useEffect(() => {
        const fetchTickets = async () => {
            console.log('🚀 [Reports] Iniciando fetchTickets...');
            setLoading(true);
            setError(null);

            try {
                console.log('📊 [Reports] Iniciando fetch...');

                // Usa supabaseAdmin para bypassar RLS
                const client = supabaseAdmin || supabase;
                console.log('🔧 [Reports] Usando client:', supabaseAdmin ? 'ADMIN' : 'NORMAL');

                // Adiciona timeout na query principal
                const ticketsPromise = client
                    .from('tickets')
                    .select('*')
                    .order('created_at', { ascending: false });

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('⏱️ Timeout: A consulta demorou mais de 10 segundos')), 10000)
                );

                const { data: ticketsData, error: fetchError } = await Promise.race([
                    ticketsPromise,
                    timeoutPromise
                ]) as Awaited<typeof ticketsPromise>;

                console.log('📊 [Reports] Resultado:', { success: !fetchError, count: ticketsData?.length });

                if (fetchError) {
                    console.error('❌ [Reports] Erro ao buscar chamados:', fetchError);
                    setError(fetchError.message);
                    setLoading(false);
                    return;
                }

                // Buscar perfis de usuários e empresas
                if (ticketsData && ticketsData.length > 0) {
                    console.log('🔄 [Reports] Buscando detalhes (profiles e companies)...');

                    const clientIds = [...new Set(ticketsData.map(t => t.client_id))];
                    const companyIds = [...new Set(ticketsData.map(t => t.company_id))];

                    console.log('📋 [Reports] IDs únicos:', { clientIds: clientIds.length, companyIds: companyIds.length });

                    // Buscar perfis (usando o mesmo client)
                    const { data: profilesData } = await client
                        .from('user_profiles')
                        .select('id, full_name, email')
                        .in('id', clientIds);

                    console.log('✅ [Reports] Profiles encontrados:', profilesData?.length);

                    // Buscar empresas (usando o mesmo client)
                    const { data: companiesData } = await client
                        .from('companies')
                        .select('id, name, cnpj')
                        .in('id', companyIds);

                    console.log('✅ [Reports] Companies encontradas:', companiesData?.length);

                    // Mapear perfis e empresas aos tickets
                    const ticketsWithDetails = ticketsData.map(ticket => ({
                        ...ticket,
                        client: profilesData?.find(p => p.id === ticket.client_id) || null,
                        company: companiesData?.find(c => c.id === ticket.company_id) || null
                    }));

                    setTickets(ticketsWithDetails);
                    setFilteredTickets(ticketsWithDetails);
                } else {
                    setTickets([]);
                    setFilteredTickets([]);
                }
            } catch (err) {
                console.error('💥 [Reports] Erro:', err);
                setError(err instanceof Error ? err.message : 'Erro inesperado');
            } finally {
                console.log('🏁 [Reports] Finalizado');
                setLoading(false);
            }
        };

        fetchTickets();
    }, []);

    // Aplicar filtros
    useEffect(() => {
        let filtered = [...tickets];

        // Filtro por status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        // Filtro por data de início
        if (filterDateStart) {
            filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filterDateStart));
        }

        // Filtro por data de fim
        if (filterDateEnd) {
            const endDate = new Date(filterDateEnd);
            endDate.setHours(23, 59, 59, 999); // Inclui todo o dia
            filtered = filtered.filter(t => new Date(t.created_at) <= endDate);
        }

        // Filtro por fabricante
        if (filterEquipmentManufacturer) {
            filtered = filtered.filter(t =>
                t.equipment_manufacturer.toLowerCase().includes(filterEquipmentManufacturer.toLowerCase())
            );
        }

        // Filtro por empresa
        if (filterCompany) {
            filtered = filtered.filter(t =>
                t.company?.name.toLowerCase().includes(filterCompany.toLowerCase()) ||
                t.company?.cnpj.includes(filterCompany)
            );
        }

        // Filtro por usuário
        if (filterUser) {
            filtered = filtered.filter(t =>
                t.client?.full_name.toLowerCase().includes(filterUser.toLowerCase()) ||
                t.client?.email.toLowerCase().includes(filterUser.toLowerCase())
            );
        }

        setFilteredTickets(filtered);
    }, [filterStatus, filterDateStart, filterDateEnd, filterEquipmentManufacturer, filterCompany, filterUser, tickets]);

    const handleClearFilters = () => {
        setFilterStatus('all');
        setFilterDateStart('');
        setFilterDateEnd('');
        setFilterEquipmentManufacturer('');
        setFilterCompany('');
        setFilterUser('');
    };

    const handleExportPDF = async () => {
        setExporting(true);

        try {
            const doc = new jsPDF();

            // Título
            doc.setFontSize(18);
            doc.text('Relatório de Chamados', 14, 20);

            // Informações do filtro
            doc.setFontSize(10);
            let yPos = 30;
            doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, 14, yPos);
            yPos += 5;
            doc.text(`Total de chamados: ${filteredTickets.length}`, 14, yPos);
            yPos += 5;

            if (filterStatus !== 'all') {
                doc.text(`Filtro de Status: ${filterStatus}`, 14, yPos);
                yPos += 5;
            }
            if (filterDateStart) {
                doc.text(`Data Início: ${new Date(filterDateStart).toLocaleDateString('pt-BR')}`, 14, yPos);
                yPos += 5;
            }
            if (filterDateEnd) {
                doc.text(`Data Fim: ${new Date(filterDateEnd).toLocaleDateString('pt-BR')}`, 14, yPos);
                yPos += 5;
            }
            if (filterCompany) {
                doc.text(`Filtro de Empresa: ${filterCompany}`, 14, yPos);
                yPos += 5;
            }
            if (filterUser) {
                doc.text(`Filtro de Usuário: ${filterUser}`, 14, yPos);
                yPos += 5;
            }

            // Estatísticas
            yPos += 10;
            doc.setFontSize(12);
            doc.text('Estatísticas:', 14, yPos);
            yPos += 7;
            doc.setFontSize(10);

            const statusCounts = {
                aberto: filteredTickets.filter(t => t.status === 'aberto').length,
                em_atendimento: filteredTickets.filter(t => t.status === 'em_atendimento').length,
                aguardando_cliente: filteredTickets.filter(t => t.status === 'aguardando_cliente').length,
                fechado: filteredTickets.filter(t => t.status === 'fechado').length,
                cancelado: filteredTickets.filter(t => t.status === 'cancelado').length
            };

            // Contagem de empresas e usuários únicos
            const uniqueCompanies = new Set(filteredTickets.map(t => t.company?.name).filter(Boolean)).size;
            const uniqueUsers = new Set(filteredTickets.map(t => t.client?.full_name).filter(Boolean)).size;

            doc.text(`Abertos: ${statusCounts.aberto}`, 14, yPos);
            doc.text(`Em Atendimento: ${statusCounts.em_atendimento}`, 70, yPos);
            doc.text(`Aguardando Cliente: ${statusCounts.aguardando_cliente}`, 130, yPos);
            yPos += 5;
            doc.text(`Fechados: ${statusCounts.fechado}`, 14, yPos);
            doc.text(`Cancelados: ${statusCounts.cancelado}`, 70, yPos);
            yPos += 5;
            doc.text(`Empresas: ${uniqueCompanies}`, 14, yPos);
            doc.text(`Usuários: ${uniqueUsers}`, 70, yPos);

            // Tabela de chamados
            yPos += 10;

            const tableData = filteredTickets.map(ticket => [
                ticket.id.toString(),
                new Date(ticket.created_at).toLocaleDateString('pt-BR'),
                ticket.company?.name || '-',
                ticket.client?.full_name || '-',
                ticket.equipment_manufacturer,
                ticket.equipment_model,
                ticket.status.replace('_', ' ')
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['#', 'Data', 'Empresa', 'Usuário', 'Fabricante', 'Modelo', 'Status']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 7 },
                columnStyles: {
                    0: { cellWidth: 12 },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 28 },
                    6: { cellWidth: 'auto' }
                }
            });

            // Salvar PDF
            const filename = `relatorio-chamados-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            alert('Relatório exportado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            console.error('Detalhes do erro:', error instanceof Error ? error.message : String(error));
            alert(`Erro ao exportar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }

        setExporting(false);
    };

    const getStatusBadge = (status: TicketStatus) => {
        switch (status) {
            case 'aberto': return 'bg-green-100 text-green-800';
            case 'em_atendimento': return 'bg-blue-100 text-blue-800';
            case 'aguardando_cliente': return 'bg-yellow-100 text-yellow-800';
            case 'fechado': return 'bg-gray-100 text-gray-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: TicketStatus) => {
        switch (status) {
            case 'aberto': return 'Aberto';
            case 'em_atendimento': return 'Em Atendimento';
            case 'aguardando_cliente': return 'Aguardando Cliente';
            case 'fechado': return 'Fechado';
            case 'cancelado': return 'Cancelado';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="p-6 md:p-10">
                <div className="flex justify-center items-center p-10 bg-white rounded-lg shadow-md">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-gray-600">Carregando relatórios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Relatórios de Chamados</h1>
                    <p className="text-sm text-gray-500 mt-1">Visualize e exporte relatórios com filtros personalizados</p>
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

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">
                    <strong className="font-bold">Erro ao carregar dados!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-center mb-4">
                    <Filter className="h-6 w-6 text-blue-600 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900">Filtros</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select
                        id="filterStatus"
                        label="Status"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
                    >
                        <option value="all">Todos</option>
                        <option value="aberto">Aberto</option>
                        <option value="em_atendimento">Em Atendimento</option>
                        <option value="aguardando_cliente">Aguardando Cliente</option>
                        <option value="fechado">Fechado</option>
                        <option value="cancelado">Cancelado</option>
                    </Select>

                    <Input
                        id="filterDateStart"
                        label="Data Início"
                        type="date"
                        value={filterDateStart}
                        onChange={(e) => setFilterDateStart(e.target.value)}
                    />

                    <Input
                        id="filterDateEnd"
                        label="Data Fim"
                        type="date"
                        value={filterDateEnd}
                        onChange={(e) => setFilterDateEnd(e.target.value)}
                    />

                    <Input
                        id="filterManufacturer"
                        label="Fabricante"
                        value={filterEquipmentManufacturer}
                        onChange={(e) => setFilterEquipmentManufacturer(e.target.value)}
                        placeholder="Ex: DIMEP"
                    />

                    <Input
                        id="filterCompany"
                        label="Empresa"
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        placeholder="Nome ou CNPJ"
                    />

                    <Input
                        id="filterUser"
                        label="Usuário"
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        placeholder="Nome ou e-mail"
                    />
                </div>

                <div className="flex flex-wrap gap-3 mt-6 items-center">
                    <Button
                        onClick={handleClearFilters}
                        variant="secondary"
                        className="shadow-sm hover:shadow transition-shadow"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Limpar Filtros
                    </Button>

                    {/* Botão Exportar PDF Moderno */}
                    <div className="relative group">
                        <button
                            onClick={handleExportPDF}
                            disabled={exporting || filteredTickets.length === 0}
                            className={`
                                relative inline-flex items-center justify-center px-8 py-3.5 
                                font-semibold text-white rounded-lg overflow-hidden
                                transition-all duration-300 ease-out
                                ${filteredTickets.length === 0 || exporting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                }
                            `}
                            title={filteredTickets.length === 0 ? 'Nenhum chamado para exportar' : 'Exportar relatório em PDF'}
                        >
                            {/* Efeito de brilho animado */}
                            {!exporting && filteredTickets.length > 0 && (
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></span>
                            )}

                            {/* Conteúdo do botão */}
                            <span className="relative flex items-center gap-2">
                                {exporting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Gerando PDF...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="h-5 w-5" />
                                        <span>Exportar PDF</span>
                                        <span className="hidden sm:inline-flex items-center ml-1 px-2 py-0.5 rounded-full text-xs bg-white/20 backdrop-blur-sm">
                                            {filteredTickets.length} {filteredTickets.length === 1 ? 'chamado' : 'chamados'}
                                        </span>
                                    </>
                                )}
                            </span>
                        </button>

                        {/* Tooltip quando desabilitado */}
                        {filteredTickets.length === 0 && !exporting && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Nenhum chamado para exportar
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Estilos customizados para animação de brilho */}
                <style>{`
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-shimmer {
                        animation: shimmer 2.5s infinite;
                    }
                `}</style>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredTickets.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-green-600">Abertos</p>
                    <p className="text-2xl font-bold text-green-900">
                        {filteredTickets.filter(t => t.status === 'aberto').length}
                    </p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-blue-600">Em Atendimento</p>
                    <p className="text-2xl font-bold text-blue-900">
                        {filteredTickets.filter(t => t.status === 'em_atendimento').length}
                    </p>
                </div>
                <div className="bg-yellow-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-yellow-600">Aguardando</p>
                    <p className="text-2xl font-bold text-yellow-900">
                        {filteredTickets.filter(t => t.status === 'aguardando_cliente').length}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-gray-600">Fechados</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {filteredTickets.filter(t => t.status === 'fechado').length}
                    </p>
                </div>
                <div className="bg-purple-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-purple-600">Empresas</p>
                    <p className="text-2xl font-bold text-purple-900">
                        {new Set(filteredTickets.map(t => t.company?.name).filter(Boolean)).size}
                    </p>
                </div>
                <div className="bg-indigo-50 rounded-lg shadow-md p-4">
                    <p className="text-sm text-indigo-600">Usuários</p>
                    <p className="text-2xl font-bold text-indigo-900">
                        {new Set(filteredTickets.map(t => t.client?.full_name).filter(Boolean)).size}
                    </p>
                </div>
            </div>

            {/* Lista de Chamados */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Chamados Filtrados ({filteredTickets.length})
                        </h2>
                    </div>
                </div>

                {filteredTickets.length === 0 ? (
                    <div className="text-center p-10">
                        <p className="text-gray-500">Nenhum chamado encontrado com os filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Empresa
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuário
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Equipamento
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Local
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            #{ticket.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                            <br />
                                            <span className="text-xs text-gray-500">
                                                {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <p className="font-medium">{ticket.company?.name || '-'}</p>
                                            <p className="text-xs text-gray-500">{ticket.company?.cnpj || ''}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <p className="font-medium">{ticket.client?.full_name || '-'}</p>
                                            <p className="text-xs text-gray-500">{ticket.client?.email || ''}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            <p className="font-medium">{ticket.equipment_manufacturer}</p>
                                            <p className="text-gray-500">{ticket.equipment_model}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {ticket.internal_location || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                                                {getStatusText(ticket.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
