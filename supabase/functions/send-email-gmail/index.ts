/// <reference types="https://deno.land/x/deno@v1.30.0/cli/tsc/dts/lib.deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"



const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
}

interface EmailRecipient {
    email: string
}

interface BrevoSender {
    name: string
    email: string
}

interface BrevoEmailRequest {
    sender: BrevoSender
    to: EmailRecipient[]
    subject: string
    htmlContent: string
}

interface EmailRequestBody {
    to: string | string[]
    subject: string
    html: string
}

interface BrevoSuccessResponse {
    messageId: string
}

interface BrevoErrorResponse {
    code?: string
    message?: string
}

interface SuccessResponseBody {
    success: true
    messageId: string
}

interface ErrorResponseBody {
    success: false
    error: string | BrevoErrorResponse
}

serve(async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { to, subject, html }: EmailRequestBody = await req.json()

        // Obter credenciais do Brevo
        const brevoApiKey: string | undefined = Deno.env.get("BREVO_API_KEY")
        const fromEmail: string = Deno.env.get("BREVO_FROM_EMAIL") || "noreply@example.com"
        const fromName: string = Deno.env.get("BREVO_FROM_NAME") || "Portal de Chamados"

        if (!brevoApiKey) {
            console.error("BREVO_API_KEY não configurada")
            return new Response(
                JSON.stringify({ success: false, error: "Brevo não configurado" } as ErrorResponseBody),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        // Preparar destinatários
        const recipients: EmailRecipient[] = Array.isArray(to)
            ? to.map((email: string) => ({ email }))
            : [{ email: to }]

        // Enviar via Brevo API
        const response: Response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": brevoApiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: {
                    name: fromName,
                    email: fromEmail,
                },
                to: recipients,
                subject: subject,
                htmlContent: html,
            } as BrevoEmailRequest),
        })

        const data: BrevoSuccessResponse | BrevoErrorResponse = await response.json()

        if (!response.ok) {
            console.error("Erro Brevo:", data)
            return new Response(
                JSON.stringify({ success: false, error: data } as ErrorResponseBody),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        console.log("Email enviado via Brevo:", data)

        return new Response(
            JSON.stringify({ success: true, messageId: (data as BrevoSuccessResponse).messageId } as SuccessResponseBody),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (error) {
        console.error("Erro ao enviar email:", error)
        const errorMessage: string = error instanceof Error ? error.message : String(error)
        return new Response(
            JSON.stringify({ success: false, error: errorMessage } as ErrorResponseBody),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
function serve(arg0: (req: Request) => Promise<Response>) {
    throw new Error("Function not implemented.")
}

