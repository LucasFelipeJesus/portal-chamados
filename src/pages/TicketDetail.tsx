import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Calendar, User, Building2, Wrench, MapPin, Phone, Mail, FileText, CheckCircle, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { emailService } from '../services/emailService';
import type { Ticket, Page, TicketStatus, TicketComment } from '../types';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';

interface TicketDetailPageProps {
    ticketId: number;
    setPage: (page: Page) => void;
}

export const TicketDetailPage: React.FC<TicketDetailPageProps> = ({ ticketId, setPage }) => {
    const { profile } = useAuth();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // Estados para comentários
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    useEffect(() => {
        const fetchTicket = async () => {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (fetchError) {
                console.error('Erro ao buscar chamado:', fetchError);
                setError(fetchError.message);
            } else {
                setTicket(data);
            }
            setLoading(false);
        };

        const fetchComments = async () => {
            setLoadingComments(true);

            const { data, error: fetchError } = await supabase
                .from('ticket_comments')
                .select(`
                    *,
                    user:user_profiles(id, full_name, email, role)
                `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (fetchError) {
                console.error('Erro ao buscar comentários:', fetchError);
            } else {
                setComments(data || []);
            }
            setLoadingComments(false);
        };

        fetchTicket();
        fetchComments();
    }, [ticketId]);

    // Adicionar novo comentário
    const handleAddComment = async () => {
        if (!newComment.trim() || !profile) return;

        setSubmittingComment(true);

        const commentData = {
            ticket_id: ticketId,
            user_id: profile.id,
            comment: newComment.trim(),
            is_internal: isInternalComment && (profile.role === 'admin' || profile.role === 'tecnico')
        };

        const { data, error: insertError } = await supabase
            .from('ticket_comments')
            .insert([commentData])
            .select(`
                *,
                user:user_profiles(id, full_name, email, role)
            `)
            .single();

        if (insertError) {
            console.error('Erro ao adicionar comentário:', insertError);
            alert(`Erro ao adicionar comentário: ${insertError.message}`);
        } else {
            console.log('✅ Comentário adicionado:', data);
            setComments(prev => [...prev, data]);
            setNewComment('');
            setIsInternalComment(false);

            // 📧 Enviar notificações por email (se não for comentário interno)
            if (!commentData.is_internal && ticket) {
                try {
                    // Buscar dados do cliente e empresa
                    const { data: clientData } = await supabase
                        .from('user_profiles')
                        .select('full_name, email')
                        .eq('id', ticket.client_id)
                        .single();

                    const { data: companyData } = await supabase
                        .from('companies')
                        .select('name')
                        .eq('id', ticket.company_id)
                        .single();

                    if (clientData && companyData) {
                        // Enviar email para o cliente (se o comentário não foi dele)
                        if (profile.id !== ticket.client_id) {
                            await emailService.sendCommentNotification({
                                ticketId: ticketId,
                                commentAuthor: profile.full_name,
                                commentText: newComment.trim(),
                                recipientName: clientData.full_name,
                                recipientEmail: clientData.email,
                                companyName: companyData.name
                            });
                        }

                        // Enviar para admins também (se o comentário foi do cliente)
                        if (profile.role === 'cliente') {
                            const { data: admins } = await supabase
                                .from('user_profiles')
                                .select('email')
                                .eq('role', 'admin');

                            const adminEmails = admins?.map(a => a.email) || [];
                            if (adminEmails.length > 0) {
                                await emailService.sendCommentNotification({
                                    ticketId: ticketId,
                                    commentAuthor: profile.full_name,
                                    commentText: newComment.trim(),
                                    recipientName: 'Administrador',
                                    recipientEmail: adminEmails[0], // Simplificado
                                    companyName: companyData.name
                                });
                            }
                        }
                    }
                } catch (emailError) {
                    console.error('Erro ao enviar email de notificação:', emailError);
                }
            }
        }

        setSubmittingComment(false);
    };

    const handleCloseTicket = async () => {
        if (!ticket || ticket.status === 'fechado') return;

        const confirmClose = window.confirm('Tem certeza que deseja finalizar este chamado?');
        if (!confirmClose) return;

        setUpdating(true);
        setError(null);

        const { error: updateError } = await supabase
            .from('tickets')
            .update({
                status: 'fechado',
                closed_at: new Date().toISOString()
            })
            .eq('id', ticketId);

        if (updateError) {
            setError(`Erro ao finalizar chamado: ${updateError.message}`);
        } else {
            // Atualiza o estado local
            setTicket(prev => prev ? { ...prev, status: 'fechado', closed_at: new Date().toISOString() } : null);
            alert('Chamado finalizado com sucesso!');
        }

        setUpdating(false);
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
            <div className="p-6 md:p-10 max-w-5xl mx-auto">
                <div className="flex justify-center items-center p-10 bg-white rounded-lg shadow-md">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="ml-3 text-gray-600">Carregando chamado...</p>
                </div>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="p-6 md:p-10 max-w-5xl mx-auto">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
                    <strong className="font-bold">Erro ao carregar chamado!</strong>
                    <span className="block sm:inline"> {error || 'Chamado não encontrado'}</span>
                </div>
                <Button onClick={() => setPage('dashboard')} variant="secondary" className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Chamado #{ticket.id}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Aberto em {new Date(ticket.created_at).toLocaleDateString('pt-BR')} às {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getStatusBadge(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                    </span>
                    {profile?.role === 'admin' && ticket.status !== 'fechado' && ticket.status !== 'cancelado' && (
                        <div className="relative group">
                            <button
                                onClick={handleCloseTicket}
                                disabled={updating}
                                className={`
                                    relative inline-flex items-center justify-center px-8 py-3.5 
                                    font-semibold text-white rounded-lg overflow-hidden
                                    transition-all duration-300 ease-out
                                    ${updating
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                    }
                                `}
                                title="Finalizar este chamado"
                            >
                                {/* Efeito de brilho animado */}
                                {!updating && (
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></span>
                                )}

                                {/* Conteúdo do botão */}
                                <span className="relative flex items-center gap-2">
                                    {updating ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Finalizando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5" />
                                            <span>Finalizar Chamado</span>
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    )}
                    <Button
                        onClick={() => setPage('dashboard')}
                        variant="secondary"
                        className="shadow-sm hover:shadow transition-shadow"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>

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
            </div>

            <div className="space-y-6">
                {/* Informações do Equipamento */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center mb-4">
                        <Wrench className="h-6 w-6 text-blue-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Equipamento</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Fabricante</p>
                            <p className="text-lg font-medium text-gray-900">{ticket.equipment_manufacturer}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Modelo</p>
                            <p className="text-lg font-medium text-gray-900">{ticket.equipment_model}</p>
                        </div>
                        {ticket.application_type && (
                            <div>
                                <p className="text-sm text-gray-600">Tipo de Aplicação</p>
                                <p className="text-lg font-medium text-gray-900">{ticket.application_type}</p>
                            </div>
                        )}
                        {ticket.internal_location && (
                            <div>
                                <p className="text-sm text-gray-600">Local Interno</p>
                                <p className="text-lg font-medium text-gray-900">{ticket.internal_location}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detalhes do Formulário */}
                {ticket.form_data && (
                    <>
                        {/* Descrição do Problema */}
                        {ticket.form_data.problem_description && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <FileText className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Descrição do Problema</h2>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{ticket.form_data.problem_description}</p>
                            </div>
                        )}

                        {/* Tecnologia/Cartão */}
                        {ticket.form_data.card_type && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <FileText className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Tecnologia Utilizada</h2>
                                </div>
                                <p className="text-lg font-medium text-gray-900">{ticket.form_data.card_type}</p>
                            </div>
                        )}

                        {/* Procedimentos Prévios */}
                        {ticket.form_data.previous_procedures && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <FileText className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Procedimentos Já Executados</h2>
                                </div>
                                <p className="text-gray-700 whitespace-pre-wrap">{ticket.form_data.previous_procedures}</p>
                            </div>
                        )}

                        {/* Endereço de Atendimento */}
                        {ticket.form_data.full_address && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <MapPin className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Endereço para Atendimento</h2>
                                </div>
                                <p className="text-gray-700">{ticket.form_data.full_address}</p>
                                {ticket.form_data.address_cep && (
                                    <p className="text-sm text-gray-600 mt-1">CEP: {ticket.form_data.address_cep}</p>
                                )}
                            </div>
                        )}

                        {/* Integração */}
                        {ticket.form_data.integration_needed && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <Building2 className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Necessidade de Integração</h2>
                                </div>
                                <p className="text-green-700 font-medium mb-2">✓ Integração necessária</p>
                                {ticket.form_data.integration_requirements && (
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-600 mb-1">Exigências:</p>
                                        <p className="text-gray-700 whitespace-pre-wrap">{ticket.form_data.integration_requirements}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Responsável pelo Acompanhamento */}
                        {ticket.form_data.contact_name && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center mb-4">
                                    <User className="h-6 w-6 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-900">Responsável pelo Acompanhamento</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Nome</p>
                                        <p className="text-lg font-medium text-gray-900">{ticket.form_data.contact_name}</p>
                                    </div>
                                    {ticket.form_data.contact_email && (
                                        <div>
                                            <p className="text-sm text-gray-600">E-mail</p>
                                            <div className="flex items-center">
                                                <Mail className="h-4 w-4 text-gray-500 mr-2" />
                                                <a href={`mailto:${ticket.form_data.contact_email}`} className="text-blue-600 hover:underline">
                                                    {ticket.form_data.contact_email}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {ticket.form_data.contact_phone && (
                                        <div>
                                            <p className="text-sm text-gray-600">Telefone</p>
                                            <div className="flex items-center">
                                                <Phone className="h-4 w-4 text-gray-500 mr-2" />
                                                <a href={`tel:${ticket.form_data.contact_phone}`} className="text-blue-600 hover:underline">
                                                    {ticket.form_data.contact_phone}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Seção de Comentários */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center mb-4">
                        <MessageCircle className="h-6 w-6 text-blue-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Comentários</h2>
                    </div>

                    {/* Lista de Comentários */}
                    {loadingComments ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p>Nenhum comentário ainda</p>
                            <p className="text-sm">Seja o primeiro a comentar</p>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-6">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className={`border rounded-lg p-4 ${comment.is_internal
                                            ? 'bg-yellow-50 border-yellow-300'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                                {comment.user?.full_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {comment.user?.full_name || 'Usuário'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(comment.created_at).toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                        {comment.is_internal && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                                                🔒 Interno
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap ml-10">{comment.comment}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Formulário de Novo Comentário */}
                    {ticket.status !== 'fechado' && ticket.status !== 'cancelado' && (
                        <div className="border-t pt-4">
                            <div className="space-y-3">
                                <Textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Adicione um comentário..."
                                    rows={3}
                                    className="w-full"
                                />

                                {/* Checkbox para comentário interno (apenas admin/tecnico) */}
                                {profile?.role !== 'cliente' && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={isInternalComment}
                                            onChange={(e) => setIsInternalComment(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="flex items-center gap-1">
                                            🔒 Comentário interno (visível apenas para administradores e técnicos)
                                        </span>
                                    </label>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddComment}
                                        disabled={submittingComment || !newComment.trim()}
                                        className={`
                                            relative inline-flex items-center justify-center px-6 py-3
                                            font-semibold text-white rounded-lg overflow-hidden
                                            transition-all duration-300 ease-out
                                            ${submittingComment || !newComment.trim()
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                            }
                                        `}
                                    >
                                        {/* Efeito de brilho animado */}
                                        {!submittingComment && newComment.trim() && (
                                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer"></span>
                                        )}

                                        {/* Conteúdo do botão */}
                                        <span className="relative flex items-center gap-2">
                                            {submittingComment ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Enviando...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="h-5 w-5" />
                                                    <span>Enviar Comentário</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé com datas */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Criado em: {new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {ticket.closed_at && (
                            <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>Fechado em: {new Date(ticket.closed_at).toLocaleString('pt-BR')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
