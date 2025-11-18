import React, { useState, useEffect } from 'react'; // <--- IMPORTAÇÃO PRINCIPAL FALTANTE
import { PlusCircle, ArrowRight, Loader2, Trash2 } from 'lucide-react'; // <--- ÍCONES FALTANTES
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import type { Ticket, TicketStatus, Page } from '../types';
import { supabase, supabaseAdmin } from '../services/supabaseClient';

interface DashboardPageProps {
    setPage: (page: Page) => void;
    onViewTicket: (ticketId: number) => void;
}




export const DashboardPage: React.FC<DashboardPageProps> = ({ setPage, onViewTicket }) => {
    const { profile } = useAuth();

    // Estados reais para os dados, loading e erro
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    // Função para deletar chamado (apenas admin)
    const handleDelete = async (ticketId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Evita abrir o ticket ao clicar no botão de deletar
        
        if (profile?.role !== 'admin') {
            alert('❌ Apenas administradores podem deletar chamados!');
            return;
        }

        const confirmDelete = confirm(
            `Tem certeza que deseja deletar o chamado #${ticketId}?\n\nEsta ação não pode ser desfeita.`
        );

        if (!confirmDelete) return;

        setDeleting(ticketId);
        try {
            const client = supabaseAdmin || supabase;
            
            const { error: deleteError } = await client
                .from('tickets')
                .delete()
                .eq('id', ticketId);

            if (deleteError) throw deleteError;

            // Remover o ticket da lista local
            setTickets(tickets.filter(t => t.id !== ticketId));
            alert('✅ Chamado deletado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao deletar chamado:', error);
            alert(`❌ Erro ao deletar chamado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        } finally {
            setDeleting(null);
        }
    };

    // useEffect para buscar os dados quando o componente montar
    useEffect(() => {
        const fetchTickets = async () => {
            console.log('🚀 [Dashboard] Iniciando fetchTickets...');
            setLoading(true);
            setError(null);

            try {
                console.log('📊 [Dashboard] Tentando buscar tickets com supabaseAdmin...');

                // Usa supabaseAdmin se disponível, senão supabase normal
                const client = (supabaseAdmin && profile?.role === 'admin') ? supabaseAdmin : supabase;
                console.log('🔧 [Dashboard] Usando client:', (supabaseAdmin && profile?.role === 'admin') ? 'ADMIN' : 'NORMAL');

                // Adiciona timeout na query principal
                const ticketsPromise = client
                    .from('tickets')
                    .select('*')
                    .order('created_at', { ascending: false });

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('⏱️ Timeout: A consulta de tickets demorou mais de 20 segundos, recarregue a página!')), 20000)
                );

                const { data, error: fetchError } = await Promise.race([
                    ticketsPromise,
                    timeoutPromise
                ]) as Awaited<typeof ticketsPromise>;

                console.log('📊 [Dashboard] Resultado da query tickets:', {
                    success: !fetchError,
                    count: data?.length,
                    error: fetchError
                });

                if (fetchError) {
                    console.error('❌ [Dashboard] Erro ao buscar chamados:', fetchError.message);
                    setError(fetchError.message);
                    setLoading(false);
                    return;
                }

                console.log('📋 [Dashboard] Tickets encontrados:', data?.length);

                // Se não há tickets, retornar array vazio
                if (!data || data.length === 0) {
                    console.log('ℹ️ [Dashboard] Nenhum ticket encontrado, exibindo tela vazia');
                    setTickets([]);
                    setLoading(false);
                    return;
                }

                console.log('🔄 [Dashboard] Buscando detalhes dos tickets...');

                // Buscar dados adicionais (cliente e empresa) para cada ticket
                const ticketsWithDetails = await Promise.all(
                    data.map(async (ticket) => {
                        console.log(`🔎 [Dashboard] Buscando dados para ticket #${ticket.id}`);

                        // Buscar dados do cliente (usando o mesmo client)
                        const { data: clientData, error: clientError } = await client
                            .from('user_profiles')
                            .select('id, full_name, email')
                            .eq('id', ticket.client_id)
                            .maybeSingle();

                        if (clientError) {
                            console.error(`❌ [Dashboard] Erro ao buscar cliente:`, clientError);
                        }

                        // Buscar dados da empresa (usando o mesmo client)
                        const { data: companyData, error: companyError } = await client
                            .from('companies')
                            .select('id, name, cnpj')
                            .eq('id', ticket.company_id)
                            .maybeSingle();

                        if (companyError) {
                            console.error(`❌ [Dashboard] Erro ao buscar empresa:`, companyError);
                        }

                        return {
                            ...ticket,
                            client: clientData,
                            company: companyData
                        };
                    })
                );

                console.log('📦 [Dashboard] Tickets com detalhes completos:', ticketsWithDetails.length);
                setTickets(ticketsWithDetails);

            } catch (err) {
                console.error('💥 [Dashboard] Erro inesperado:', err);
                setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar chamados');
            } finally {
                console.log('🏁 [Dashboard] fetchTickets finalizado, setLoading(false)');
                setLoading(false);
            }
        };

        fetchTickets();

    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const getStatusBadge = (status: TicketStatus) => {
        switch (status) {
            case 'aberto': return 'bg-green-100 text-green-800';
            case 'em_atendimento': return 'bg-blue-100 text-blue-800';
            case 'aguardando_cliente': return 'bg-yellow-100 text-yellow-800';
            case 'fechado': return 'bg-gray-100 text-gray-800';
            case 'cancelado': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Função auxiliar para renderizar o conteúdo
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center p-10 bg-white rounded-lg shadow-md">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-gray-600">Buscando chamados...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
                    <strong className="font-bold">Erro ao carregar chamados!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            );
        }

        if (tickets.length === 0) {
            return (
                <div className="text-center p-10 bg-white rounded-lg shadow-md">
                    <h3 className="text-lg font-medium text-gray-900">Nenhum chamado encontrado</h3>
                    <p className="text-sm text-gray-500 mt-1">Parece que você ainda não abriu nenhum chamado. Clique no botão acima para começar.</p>
                </div>
            );
        }

        // Se tiver dados, renderiza a lista
        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <ul role="list" className="divide-y divide-gray-200">
                    {tickets.map((ticket) => {
                        console.log(`🎫 Renderizando ticket #${ticket.id}:`, {
                            client: ticket.client,
                            company: ticket.company,
                            hasClient: !!ticket.client,
                            hasCompany: !!ticket.company
                        });

                        return (
                            <li key={ticket.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadge(ticket.status)} capitalize`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onViewTicket(ticket.id)}>
                                        <p className="text-sm font-medium text-blue-600 truncate">
                                            Chamado #{ticket.id} - {ticket.equipment_manufacturer} {ticket.equipment_model}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            Local: {ticket.internal_location}
                                        </p>
                                        {ticket.client && (
                                            <p className="text-sm text-gray-600 truncate mt-1">
                                                Usuário: {ticket.client.full_name}
                                            </p>
                                        )}
                                        {ticket.company && (
                                            <p className="text-xs text-gray-500 truncate">
                                                Empresa: {ticket.company.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-700">
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {profile?.role === 'admin' && (
                                            <button
                                                onClick={(e) => handleDelete(ticket.id, e)}
                                                disabled={deleting === ticket.id}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Deletar chamado"
                                            >
                                                {deleting === ticket.id ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-5 w-5" />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onViewTicket(ticket.id)}
                                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Ver detalhes"
                                        >
                                            <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Meus Chamados</h1>
                    <p className="text-lg text-gray-600">Bem-vindo, {profile?.full_name}!</p>
                </div>
                <Button onClick={() => setPage('new-ticket')} className="w-auto">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Abrir Novo Chamado
                </Button>
            </div>

            {/* Renderiza o conteúdo (Loading, Erro, Lista ou Vazio) */}
            {renderContent()}

        </div>
    );
};