

// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
}

interface SendEmailRequest {
    to: string | string[]
    subject: string
    html: string
}

interface ResendApiResponse {
    id?: string
    [key: string]: unknown
}

serve(async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { to, subject, html }: SendEmailRequest = await req.json()

        const resendApiKey: string | undefined = Deno.env.get("RESEND_API_KEY")
        if (!resendApiKey) {
            console.warn("RESEND_API_KEY não configurada")
            return new Response(
                JSON.stringify({ success: false, error: "RESEND_API_KEY não configurada" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const response: Response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Notificações <onboarding@resend.dev>",
                to,
                subject,
                html,
            }),
        })

        const data: ResendApiResponse = await response.json()

        if (!response.ok) {
            return new Response(
                JSON.stringify({ success: false, error: data }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        return new Response(
            JSON.stringify({ success: true, id: data.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    } catch (error: unknown) {
        const errorMessage: string = error instanceof Error ? error.message : "Erro desconhecido"
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})
