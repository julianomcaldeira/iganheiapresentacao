import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { to, subject, html, from, fromName, replyTo }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error("Campos obrigatórios: to, subject, html");
    }

    const smtpUsername = Deno.env.get("AWS_SES_SMTP_USERNAME");
    const smtpPassword = Deno.env.get("AWS_SES_SMTP_PASSWORD");

    if (!smtpUsername || !smtpPassword) {
      throw new Error("Credenciais SMTP AWS SES não configuradas");
    }

    console.log("Iniciando envio de email via AWS SES SMTP...");
    console.log("Para:", to);
    console.log("Assunto:", subject);

    // Configurar cliente SMTP para AWS SES (região sa-east-1 - São Paulo)
    const client = new SMTPClient({
      connection: {
        hostname: "email-smtp.sa-east-1.amazonaws.com",
        port: 587,
        tls: true,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    });

    const senderEmail = from || "licitacoesalb@iganheicrm.com.br";
    const senderName = fromName || "i-Ganhei CRM";

    // Preparar destinatários
    const recipients = Array.isArray(to) ? to : [to];

    // Enviar email
    await client.send({
      from: `${senderName} <${senderEmail}>`,
      to: recipients,
      subject: subject,
      content: "auto",
      html: html,
      replyTo: replyTo || senderEmail,
    });

    await client.close();

    console.log("Email enviado com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso",
        to: recipients,
        subject 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
