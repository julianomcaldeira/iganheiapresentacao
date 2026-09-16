import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketPayload {
  ticket_id: string;
  action: 'resolved' | 'created' | 'updated' | 'correction_applied';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticket_id, action }: TicketPayload = await req.json();

    console.log(`Processing webhook for ticket ${ticket_id}, action: ${action}`);

    if (!ticket_id || !action) {
      return new Response(
        JSON.stringify({ error: 'ticket_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ticket details with related data
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        cliente:clientes(id, nome, webhook_url, webhook_ativo),
        criador:profiles!tickets_criado_por_fkey(nome),
        atendente:profiles!tickets_atendente_id_fkey(nome),
        correcao_autor:profiles!tickets_correcao_aplicada_por_fkey(nome)
      `)
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Error fetching ticket:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Ticket found: ${ticket.titulo}, Client: ${ticket.cliente?.nome}`);

    // Check if client has webhook configured and active
    const webhookUrl = ticket.cliente?.webhook_url;
    const webhookAtivo = ticket.cliente?.webhook_ativo;
    const clienteId = ticket.cliente?.id;

    if (!webhookUrl || !webhookAtivo) {
      console.log('Webhook not configured or inactive for this client');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook not configured or inactive for this client',
          webhook_sent: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      event: action,
      timestamp: new Date().toISOString(),
      source: 'iganhei-licitacoes',
      data: {
        ticket_id: ticket.id,
        titulo: ticket.titulo,
        descricao: ticket.descricao,
        categoria: ticket.categoria,
        prioridade: ticket.prioridade,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        resolvido_em: ticket.resolvido_em,
        criador: ticket.criador?.nome,
        atendente: ticket.atendente?.nome,
        cliente: {
          id: ticket.cliente?.id,
          nome: ticket.cliente?.nome
        },
        correcao: ticket.correcao_aplicada ? {
          aplicada: true,
          data: ticket.correcao_data,
          aplicada_por: ticket.correcao_autor?.nome,
          link: ticket.correcao_link,
          descricao: ticket.correcao_descricao
        } : null
      }
    };

    console.log(`Sending webhook to: ${webhookUrl}`);

    // Send webhook and measure response time
    const startTime = Date.now();
    let webhookLog: {
      cliente_id: string;
      ticket_id: string;
      evento: string;
      webhook_url: string;
      payload: typeof webhookPayload;
      status_code: number | null;
      response_body: string | null;
      sucesso: boolean;
      erro: string | null;
      tempo_resposta_ms: number | null;
    } = {
      cliente_id: clienteId,
      ticket_id: ticket_id,
      evento: action,
      webhook_url: webhookUrl,
      payload: webhookPayload,
      status_code: null,
      response_body: null,
      sucesso: false,
      erro: null,
      tempo_resposta_ms: null,
    };

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'iganhei-licitacoes',
          'X-Webhook-Event': action
        },
        body: JSON.stringify(webhookPayload)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const responseStatus = webhookResponse.status;
      
      let responseBody = '';
      try {
        responseBody = await webhookResponse.text();
      } catch {
        responseBody = 'Unable to read response body';
      }

      console.log(`Webhook response status: ${responseStatus}, time: ${responseTime}ms`);

      webhookLog = {
        ...webhookLog,
        status_code: responseStatus,
        response_body: responseBody.substring(0, 1000), // Limit response body size
        sucesso: webhookResponse.ok,
        tempo_resposta_ms: responseTime,
      };

      // Save webhook log
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert(webhookLog);

      if (logError) {
        console.error('Error saving webhook log:', logError);
      }

      if (!webhookResponse.ok) {
        console.error(`Webhook failed with status ${responseStatus}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Webhook returned status ${responseStatus}`,
            webhook_sent: true,
            webhook_status: responseStatus
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook sent successfully',
          webhook_sent: true,
          webhook_status: responseStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (webhookError: unknown) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const errorMessage = webhookError instanceof Error ? webhookError.message : 'Unknown error';
      
      console.error('Error sending webhook:', webhookError);

      // Log failed webhook attempt
      webhookLog = {
        ...webhookLog,
        sucesso: false,
        erro: errorMessage,
        tempo_resposta_ms: responseTime,
      };

      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert(webhookLog);

      if (logError) {
        console.error('Error saving webhook log:', logError);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Failed to send webhook: ${errorMessage}`,
          webhook_sent: false
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
