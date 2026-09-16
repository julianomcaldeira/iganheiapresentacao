import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const { pecaId, licitacaoId, tipo, titulo, descricao, clienteId } = await req.json();

    if (!licitacaoId || !tipo || !descricao || !clienteId) {
      throw new Error("Missing required fields");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get licitação details for context
    const { data: licitacao, error: licError } = await supabase
      .from("licitacoes")
      .select("numero, objeto, orgao, modalidade, valor_estimado, data_encerramento, observacoes, analise_ia")
      .eq("id", licitacaoId)
      .single();

    if (licError) throw licError;

    // Get the client's configured prompt for this type of piece
    const { data: promptConfig } = await supabase
      .from("ia_prompts")
      .select("prompt_sistema, prompt_usuario, modelo, temperatura, max_tokens")
      .eq("cliente_id", clienteId)
      .eq("tipo", tipo)
      .eq("ativo", true)
      .limit(1)
      .single();

    // Build the system prompt
    const tipoLabels: Record<string, string> = {
      pecas_impugnacao: "Impugnação ao Edital",
      pecas_recurso: "Recurso Administrativo",
      pecas_esclarecimento: "Pedido de Esclarecimento",
      pecas_contrarrazoes: "Contrarrazões",
    };
    const tipoLabel = tipoLabels[tipo] || tipo;

    const defaultSystemPrompt = `Você é um especialista em licitações públicas e direito administrativo brasileiro. 
Sua tarefa é gerar uma peça jurídica do tipo "${tipoLabel}" de alta qualidade, seguindo todas as normas da Lei 14.133/2021 (Nova Lei de Licitações) e legislação correlata.

A peça deve ser:
- Bem fundamentada juridicamente
- Clara e objetiva
- Profissional e formal
- Seguir a estrutura padrão de ${tipoLabel}
- Incluir todas as seções necessárias (cabeçalho, fundamentação, pedidos, etc.)`;

    const systemPrompt = promptConfig?.prompt_sistema || defaultSystemPrompt;
    const modelo = promptConfig?.modelo || "google/gemini-2.5-flash";
    const temperatura = promptConfig?.temperatura || 0.7;
    const maxTokens = promptConfig?.max_tokens || 8192;

    // Build context about the licitação
    let licitacaoContext = `
DADOS DA LICITAÇÃO:
- Número: ${licitacao.numero}
- Órgão: ${licitacao.orgao}
- Modalidade: ${licitacao.modalidade || "Não informado"}
- Objeto: ${licitacao.objeto}
- Valor Estimado: ${licitacao.valor_estimado ? `R$ ${licitacao.valor_estimado.toLocaleString("pt-BR")}` : "Não informado"}
- Data de Encerramento: ${licitacao.data_encerramento ? new Date(licitacao.data_encerramento).toLocaleDateString("pt-BR") : "Não informada"}
${licitacao.observacoes ? `- Observações: ${licitacao.observacoes}` : ""}`;

    // Add AI analysis if available
    if (licitacao.analise_ia?.conteudo) {
      licitacaoContext += `\n\nANÁLISE PRÉVIA DO EDITAL:\n${licitacao.analise_ia.conteudo}`;
    }

    const userPrompt = `${licitacaoContext}

TÍTULO DA PEÇA: ${titulo}

DESCRIÇÃO DETALHADA DO SOLICITANTE:
${descricao}

Por favor, gere a peça jurídica completa do tipo "${tipoLabel}" com base nas informações fornecidas.`;

    console.log(`Generating ${tipoLabel} for licitação ${licitacao.numero}`);

    // Call AI API
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: temperatura,
        max_tokens: maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        await supabase
          .from("licitacao_pecas")
          .update({ status: "erro", erro: "Limite de requisições excedido. Tente novamente em alguns minutos." })
          .eq("id", pecaId);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        await supabase
          .from("licitacao_pecas")
          .update({ status: "erro", erro: "Créditos insuficientes. Adicione créditos ao workspace." })
          .eq("id", pecaId);
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated by AI");
    }

    // Update the peca with the generated content (only if pecaId was provided)
    if (pecaId) {
      const { error: updateError } = await supabase
        .from("licitacao_pecas")
        .update({
          conteudo_gerado: generatedContent,
          modelo_ia: modelo,
          status: "concluido",
        })
        .eq("id", pecaId);

      if (updateError) throw updateError;
    }

    console.log(`Successfully generated ${tipoLabel} for peca ${pecaId}`);

    return new Response(
      JSON.stringify({ success: true, content: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating peca:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Try to update peca status to error if we have the pecaId
    try {
      const { pecaId } = await req.clone().json();
      if (pecaId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase
          .from("licitacao_pecas")
          .update({ status: "erro", erro: errorMessage })
          .eq("id", pecaId);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
