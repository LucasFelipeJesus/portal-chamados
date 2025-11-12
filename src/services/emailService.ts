// src/services/emailService.ts
// Serviço de envio de emails usando Resend API

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
}

interface TicketCreatedEmailData {
    ticketId: number;
    clientName: string;
    clientEmail: string;
    companyName: string;
    equipmentInfo: string;
    problemDescription: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    internalLocation: string;
    fullAddress: string;
}

interface CommentNotificationData {
    ticketId: number;
    commentAuthor: string;
    commentText: string;
    recipientName: string;
    recipientEmail: string;
    companyName: string;
}

class EmailService {
    private apiKey: string;
    private fromEmail: string;
    private apiUrl = 'https://api.resend.com/emails';

    constructor() {
        // Busca as configurações do .env
        this.apiKey = import.meta.env.VITE_RESEND_API_KEY || '';
        this.fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL || 'onboarding@resend.dev';

        if (!this.apiKey) {
            console.warn('⚠️ VITE_RESEND_API_KEY não configurado. Emails serão apenas logados no console.');
        }
    }

    /**
     * Envia um email usando a API do Resend
     */
    private async sendEmail(options: EmailOptions): Promise<boolean> {
        // Se não tiver API key, apenas loga no console (modo desenvolvimento)
        if (!this.apiKey) {
            console.log('📧 [EMAIL - DEV MODE] Email que seria enviado:', {
                to: options.to,
                subject: options.subject,
                htmlPreview: options.html.substring(0, 300) + '...'
            });
            return true;
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.fromEmail,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject,
                    html: options.html,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ Erro ao enviar email:', errorData);
                return false;
            }

            const data = await response.json();
            console.log('✅ Email enviado com sucesso:', data.id);
            return true;
        } catch (error) {
            console.error('❌ Erro na chamada da API de email:', error);
            return false;
        }
    }

    /**
     * Template HTML base para os emails
     */
    private getEmailTemplate(content: string): string {
        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 0;
                        background-color: #f4f4f4;
                    }
                    .email-container {
                        background-color: white;
                        margin: 20px;
                        border-radius: 8px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 40px 30px;
                        text-align: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 600;
                    }
                    .header p {
                        margin: 10px 0 0 0;
                        font-size: 16px;
                        opacity: 0.9;
                    }
                    .content {
                        padding: 30px;
                    }
                    .info-box {
                        background: #f9fafb;
                        padding: 20px;
                        border-left: 4px solid #667eea;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .info-row {
                        margin: 12px 0;
                        display: flex;
                        flex-wrap: wrap;
                    }
                    .info-label {
                        font-weight: 600;
                        min-width: 150px;
                        color: #667eea;
                        margin-bottom: 4px;
                    }
                    .info-value {
                        color: #333;
                        flex: 1;
                    }
                    .problem-box {
                        background: white;
                        padding: 20px;
                        border: 2px solid #e5e7eb;
                        border-radius: 6px;
                        margin: 20px 0;
                    }
                    .problem-box h3 {
                        margin: 0 0 10px 0;
                        color: #667eea;
                        font-size: 16px;
                    }
                    .problem-box p {
                        margin: 0;
                        line-height: 1.6;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px 30px;
                        background: #f9fafb;
                        color: #6b7280;
                        font-size: 13px;
                        border-top: 1px solid #e5e7eb;
                    }
                    .footer p {
                        margin: 5px 0;
                    }
                    @media only screen and (max-width: 600px) {
                        .email-container {
                            margin: 0;
                            border-radius: 0;
                        }
                        .header {
                            padding: 30px 20px;
                        }
                        .content {
                            padding: 20px;
                        }
                        .info-row {
                            flex-direction: column;
                        }
                        .info-label {
                            margin-bottom: 5px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    ${content}
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Envia email quando um novo chamado é criado
     * Notifica: 1) Cliente que abriu, 2) Responsável no local (contact), 3) Administradores
     */
    async sendTicketCreatedNotification(data: TicketCreatedEmailData, adminEmails: string[] = []): Promise<boolean> {
        // Email para o CLIENTE que abriu o chamado
        const clientEmailContent = `
            <div class="header">
                <h1>🎫 Chamado Criado com Sucesso</h1>
                <p>Chamado #${data.ticketId}</p>
            </div>
            <div class="content">
                <p>Olá <strong>${data.clientName}</strong>,</p>
                <p>Seu chamado foi registrado com sucesso no sistema. Nossa equipe já foi notificada e em breve entrará em contato.</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">Número do Chamado:</span>
                        <span class="info-value"><strong>#${data.ticketId}</strong></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Empresa:</span>
                        <span class="info-value">${data.companyName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Equipamento:</span>
                        <span class="info-value">${data.equipmentInfo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Localização:</span>
                        <span class="info-value">${data.internalLocation}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Endereço:</span>
                        <span class="info-value">${data.fullAddress}</span>
                    </div>
                </div>

                <div class="problem-box">
                    <h3>📝 Descrição do Problema</h3>
                    <p>${data.problemDescription}</p>
                </div>

                <div class="info-box" style="background: #ecfdf5; border-left-color: #10b981;">
                    <p style="margin: 0; color: #047857;">
                        <strong>✓ Responsável Local Notificado</strong><br>
                        ${data.contactName} (${data.contactEmail})
                    </p>
                </div>

                <p style="margin-top: 30px; color: #6b7280;">
                    <strong>Próximos passos:</strong>
                </p>
                <ul style="color: #6b7280; margin: 10px 0;">
                    <li>Nossa equipe analisará o chamado</li>
                    <li>Você receberá atualizações por email</li>
                    <li>Em caso de dúvidas, responda este email</li>
                </ul>
            </div>
            <div class="footer">
                <p><strong>Portal de Chamados</strong></p>
                <p>Esta é uma mensagem automática. Guarde este email para referência futura.</p>
                <p>© ${new Date().getFullYear()} Todos os direitos reservados.</p>
            </div>
        `;

        // Email para o RESPONSÁVEL LOCAL (contact)
        const contactEmailContent = `
            <div class="header">
                <h1>🔔 Novo Chamado Registrado</h1>
                <p>Chamado #${data.ticketId} - ${data.companyName}</p>
            </div>
            <div class="content">
                <p>Olá <strong>${data.contactName}</strong>,</p>
                <p>Você foi indicado como responsável local para acompanhamento de um novo chamado técnico:</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">Número do Chamado:</span>
                        <span class="info-value"><strong>#${data.ticketId}</strong></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Aberto por:</span>
                        <span class="info-value">${data.clientName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Empresa:</span>
                        <span class="info-value">${data.companyName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Equipamento:</span>
                        <span class="info-value">${data.equipmentInfo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Localização Interna:</span>
                        <span class="info-value">${data.internalLocation}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Endereço Completo:</span>
                        <span class="info-value">${data.fullAddress}</span>
                    </div>
                </div>

                <div class="problem-box">
                    <h3>📝 Descrição do Problema</h3>
                    <p>${data.problemDescription}</p>
                </div>

                <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
                    <p style="margin: 0; color: #92400e;">
                        <strong>⚠️ Sua Responsabilidade</strong><br>
                        Como responsável local, você poderá ser contatado por nossa equipe técnica para:<br>
                        • Fornecer acesso ao local<br>
                        • Acompanhar o atendimento<br>
                        • Validar a solução do problema
                    </p>
                </div>

                <p style="margin-top: 20px;">
                    <strong>Seus dados de contato registrados:</strong><br>
                    📧 Email: ${data.contactEmail}<br>
                    📱 Telefone: ${data.contactPhone}
                </p>
            </div>
            <div class="footer">
                <p><strong>Portal de Chamados</strong></p>
                <p>Esta é uma mensagem automática. Em caso de dúvidas, entre em contato com ${data.clientName}.</p>
                <p>© ${new Date().getFullYear()} Todos os direitos reservados.</p>
            </div>
        `;

        // Email para os ADMINISTRADORES
        const adminEmailContent = `
            <div class="header">
                <h1>🚨 Novo Chamado Registrado</h1>
                <p>Chamado #${data.ticketId} - Requer Atenção</p>
            </div>
            <div class="content">
                <p>Olá <strong>Administrador</strong>,</p>
                <p>Um novo chamado foi registrado no sistema e aguarda atendimento:</p>
                
                <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
                    <div class="info-row">
                        <span class="info-label">🆔 Número do Chamado:</span>
                        <span class="info-value"><strong style="font-size: 18px;">#${data.ticketId}</strong></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">👤 Cliente:</span>
                        <span class="info-value">${data.clientName} (${data.clientEmail})</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🏢 Empresa:</span>
                        <span class="info-value">${data.companyName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🔧 Equipamento:</span>
                        <span class="info-value">${data.equipmentInfo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">📍 Localização Interna:</span>
                        <span class="info-value">${data.internalLocation}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🗺️ Endereço:</span>
                        <span class="info-value">${data.fullAddress}</span>
                    </div>
                </div>

                <div class="problem-box">
                    <h3>📝 Descrição do Problema</h3>
                    <p>${data.problemDescription}</p>
                </div>

                <div class="info-box">
                    <p style="margin: 0 0 10px 0;"><strong>👨‍💼 Responsável Local no Cliente:</strong></p>
                    <div class="info-row">
                        <span class="info-label">Nome:</span>
                        <span class="info-value">${data.contactName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${data.contactEmail}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Telefone:</span>
                        <span class="info-value">${data.contactPhone}</span>
                    </div>
                </div>

                <div class="info-box" style="background: #dbeafe; border-left-color: #3b82f6;">
                    <p style="margin: 0; color: #1e40af;">
                        <strong>⚡ Ação Necessária:</strong><br>
                        • Revisar o chamado no sistema<br>
                        • Atribuir um técnico responsável<br>
                        • Definir prioridade de atendimento<br>
                        • Entrar em contato se necessário
                    </p>
                </div>

                <p style="margin-top: 30px; text-align: center;">
                    <a href="${typeof window !== 'undefined' ? window.location.origin : ''}" 
                       style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                        Acessar Portal de Chamados
                    </a>
                </p>
            </div>
            <div class="footer">
                <p><strong>Portal de Chamados - Notificação Administrativa</strong></p>
                <p>Esta é uma mensagem automática enviada apenas para administradores.</p>
                <p>© ${new Date().getFullYear()} Todos os direitos reservados.</p>
            </div>
        `;

        // Enviar email para o cliente
        const clientEmailSent = await this.sendEmail({
            to: data.clientEmail,
            subject: `✅ Chamado #${data.ticketId} Criado - ${data.companyName}`,
            html: this.getEmailTemplate(clientEmailContent)
        });

        // Enviar email para o responsável local
        const contactEmailSent = await this.sendEmail({
            to: data.contactEmail,
            subject: `🔔 Novo Chamado #${data.ticketId} - Você é o Responsável Local - ${data.companyName}`,
            html: this.getEmailTemplate(contactEmailContent)
        });

        // Enviar email para os administradores (se houver)
        let adminEmailsSent = true;
        if (adminEmails && adminEmails.length > 0) {
            console.log(`📧 Enviando notificação para ${adminEmails.length} administrador(es)...`);
            adminEmailsSent = await this.sendEmail({
                to: adminEmails,
                subject: `🚨 Novo Chamado #${data.ticketId} - ${data.companyName} - Ação Necessária`,
                html: this.getEmailTemplate(adminEmailContent)
            });
        }

        return clientEmailSent && contactEmailSent && adminEmailsSent;
    }

    /**
     * Envia email quando há um novo comentário no chamado
     */
    async sendCommentNotification(data: CommentNotificationData): Promise<boolean> {
        const emailContent = `
            <div class="header">
                <h1>💬 Novo Comentário no Chamado</h1>
                <p>Chamado #${data.ticketId}</p>
            </div>
            <div class="content">
                <p>Olá <strong>${data.recipientName}</strong>,</p>
                <p>Há uma nova atualização no chamado #${data.ticketId}:</p>
                
                <div class="info-box">
                    <div class="info-row">
                        <span class="info-label">Chamado:</span>
                        <span class="info-value"><strong>#${data.ticketId}</strong></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Empresa:</span>
                        <span class="info-value">${data.companyName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Comentado por:</span>
                        <span class="info-value">${data.commentAuthor}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Data:</span>
                        <span class="info-value">${new Date().toLocaleString('pt-BR')}</span>
                    </div>
                </div>

                <div class="problem-box">
                    <h3>💬 Comentário</h3>
                    <p>${data.commentText}</p>
                </div>

                <div class="info-box" style="background: #dbeafe; border-left-color: #3b82f6;">
                    <p style="margin: 0; color: #1e40af;">
                        💡 <strong>Dica:</strong> Acesse o portal para visualizar o chamado completo e responder ao comentário.
                    </p>
                </div>
            </div>
            <div class="footer">
                <p><strong>Portal de Chamados - Notificação de Atualização</strong></p>
                <p>Esta é uma mensagem automática. Não responda este email.</p>
                <p>© ${new Date().getFullYear()} Todos os direitos reservados.</p>
            </div>
        `;

        return this.sendEmail({
            to: data.recipientEmail,
            subject: `💬 Novo Comentário no Chamado #${data.ticketId} - ${data.companyName}`,
            html: this.getEmailTemplate(emailContent)
        });
    }
}

// Exporta uma instância única do serviço
export const emailService = new EmailService();
