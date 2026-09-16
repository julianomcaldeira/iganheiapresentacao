import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { licitacaoId, chatId, pergunta, contextoEdital, clienteId } = await req.json();
    
    if (!licitacaoId || !pergunta) {
      return new Response(
        JSON.stringify({ error: 'ID da licitação e pergunta são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração de IA não encontrada" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Chat for licitacao: ${licitacaoId}, chatId: ${chatId}`);

    // Get licitação data
    const { data: licitacao, error: licError } = await supabase
      .from('licitacoes')
      .select('numero, objeto, orgao, modalidade, valor_estimado, data_encerramento, analise_ia')
      .eq('id', licitacaoId)
      .single();

    if (licError) {
      console.error('Error fetching licitacao:', licError);
    }

    // Get previous chat history for context
    const { data: chatHistory } = await supabase
      .from('licitacao_chat')
      .select('pergunta, resposta')
      .eq('licitacao_id', licitacaoId)
      .eq('status', 'concluida')
      .order('created_at', { ascending: false })
      .limit(5);

    const licitacaoInfo = licitacao ? `
INFORMAÇÕES DA LICITAÇÃO:
- Número: ${licitacao.numero || 'N/A'}
- Órgão: ${licitacao.orgao || 'N/A'}
- Objeto: ${licitacao.objeto || 'N/A'}
- Modalidade: ${licitacao.modalidade || 'N/A'}
- Valor Estimado: ${licitacao.valor_estimado ? `R$ ${licitacao.valor_estimado.toLocaleString('pt-BR')}` : 'N/A'}
- Data de Encerramento: ${licitacao.data_encerramento || 'N/A'}
` : '';

    // Include previous analysis if available
    const analiseAnterior = licitacao?.analise_ia?.conteudo 
      ? `\n\nANÁLISE ANTERIOR DO EDITAL:\n${licitacao.analise_ia.conteudo.substring(0, 30000)}`
      : '';

    // Include chat history for context
    const historicoChat = chatHistory && chatHistory.length > 0
      ? `\n\nHISTÓRICO DE PERGUNTAS ANTERIORES:\n${chatHistory.map(c => 
          `Pergunta: ${c.pergunta}\nResposta: ${c.resposta?.substring(0, 500)}...`
        ).join('\n\n')}`
      : '';

    // Include edital context if provided
    const contexto = contextoEdital 
      ? `\n\nCONTEÚDO DO EDITAL:\n${contextoEdital.substring(0, 50000)}`
      : '';

    // Fetch client's IA prompt configuration
    let promptConfig = null;
    if (clienteId) {
      const { data } = await supabase
        .from('ia_prompts')
        .select('prompt_sistema, prompt_usuario, modelo, temperatura, max_tokens')
        .eq('cliente_id', clienteId)
        .eq('tipo', 'analise_edital')
        .eq('ativo', true)
        .limit(1)
        .single();
      promptConfig = data;
      if (promptConfig) {
        console.log(`Using custom IA config for client ${clienteId}, model: ${promptConfig.modelo}`);
      }
    }

    // Fetch knowledge base for context enrichment
    let conhecimentoContext = '';
    if (clienteId) {
      const { data: conhecimentos } = await supabase
        .from('ia_conhecimento')
        .select('titulo, conteudo')
        .or(`cliente_id.eq.${clienteId},cliente_id.is.null`)
        .eq('ativo', true)
        .order('relevancia', { ascending: false })
        .limit(3);
      if (conhecimentos && conhecimentos.length > 0) {
        conhecimentoContext = '\n\nBASE DE CONHECIMENTO:\n' + 
          conhecimentos.map(c => `- ${c.titulo}: ${c.conteudo.substring(0, 300)}`).join('\n');
      }
    }

    const defaultSystemPrompt = `Você é um especialista em licitações públicas brasileiras. 
Sua função é responder perguntas sobre editais e processos licitatórios de forma clara e objetiva.

Considere:
- Lei 14.133/2021 (Nova Lei de Licitações)
- Lei 8.666/93 (para processos anteriores)
- Legislação específica do órgão licitante
- Jurisprudência do TCU

Seja específico e cite artigos/normas quando relevante.
Se não souber a resposta com base nas informações disponíveis, indique claramente.
Formate a resposta de forma estruturada usando bullet points quando apropriado.`;

    const systemPrompt = promptConfig?.prompt_sistema || defaultSystemPrompt;
    const modelo = promptConfig?.modelo || "google/gemini-2.5-flash";

    const userPrompt = `${licitacaoInfo}${analiseAnterior}${historicoChat}${contexto}${conhecimentoContext}

PERGUNTA DO USUÁRIO:
${pergunta}

Responda de forma clara, objetiva e fundamentada.`;

    console.log(`Calling AI for chat response with model: ${modelo}...`);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      const errorMessage = response.status === 429 
        ? "Limite de requisições excedido. Tente novamente mais tarde."
        : response.status === 402 
        ? "Créditos de IA insuficientes."
        : "Erro na API de IA";
      
      if (chatId) {
        await supabase
          .from('licitacao_chat')
          .update({ status: 'erro', resposta: errorMessage })
          .eq('id', chatId);
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const resposta = aiData.choices?.[0]?.message?.content;

    if (!resposta) {
      throw new Error("No response content from AI");
    }

    console.log('Chat response received, length:', resposta.length);

    // Update chat record if exists
    if (chatId) {
      await supabase
        .from('licitacao_chat')
        .update({ 
          status: 'concluida', 
          resposta 
        })
        .eq('id', chatId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        resposta
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in chat-edital:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao processar pergunta' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
