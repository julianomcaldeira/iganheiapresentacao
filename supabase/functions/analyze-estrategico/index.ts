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

    const { clienteId, dataInicio, dataFim } = await req.json();

    if (!clienteId || !dataInicio || !dataFim) {
      return new Response(
        JSON.stringify({ success: false, error: "Parâmetros obrigatórios não informados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client data
    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch licitacoes data for the period
    const { data: licitacoes } = await supabase
      .from("licitacoes")
      .select("*")
      .eq("cliente_id", clienteId)
      .gte("created_at", dataInicio)
      .lte("created_at", dataFim);

    // Fetch concorrentes data
    const { data: concorrentes } = await supabase
      .from("licitacao_concorrentes")
      .select("*")
      .eq("cliente_id", clienteId);

    // Fetch empenhos data
    const { data: empenhos } = await supabase
      .from("empenhos")
      .select("*")
      .eq("cliente_id", clienteId)
      .gte("data_emissao", dataInicio)
      .lte("data_emissao", dataFim);

    // Check for custom prompt
    const { data: customPrompt } = await supabase
      .from("ia_prompts")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("tipo", "analise_estrategica")
      .eq("ativo", true)
      .single();

    // Calculate basic metrics
    const totalLicitacoes = licitacoes?.length || 0;
    const licitacoesGanhas = licitacoes?.filter(l => l.status === "ganha") || [];
    const licitacoesPerdidas = licitacoes?.filter(l => l.status === "perdida") || [];
    const licitacoesParticipando = licitacoes?.filter(l => ["participando", "em_analise", "aprovada"].includes(l.status)) || [];
    
    const taxaSucesso = totalLicitacoes > 0 ? (licitacoesGanhas.length / totalLicitacoes) * 100 : 0;
    const taxaParticipacao = totalLicitacoes > 0 ? (licitacoesParticipando.length / totalLicitacoes) * 100 : 0;
    
    const valorTotalGanho = licitacoesGanhas.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
    const valorTotalPerdido = licitacoesPerdidas.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
    const ticketMedio = licitacoesGanhas.length > 0 ? valorTotalGanho / licitacoesGanhas.length : 0;

    // Group by orgao
    const orgaoCounts: Record<string, number> = {};
    licitacoes?.forEach(l => {
      orgaoCounts[l.orgao] = (orgaoCounts[l.orgao] || 0) + 1;
    });
    const principaisOrgaos = Object.entries(orgaoCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([orgao]) => orgao);

    // Group by modalidade
    const modalidadeCounts: Record<string, number> = {};
    licitacoes?.forEach(l => {
      if (l.modalidade) {
        modalidadeCounts[l.modalidade] = (modalidadeCounts[l.modalidade] || 0) + 1;
      }
    });
    const modalidadesFrequentes = Object.entries(modalidadeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([mod]) => mod);

    // Process concorrentes
    const concorrenteStats: Record<string, { nome: string; participacoes: number; vitorias: number }> = {};
    concorrentes?.forEach(c => {
      if (!concorrenteStats[c.nome_concorrente]) {
        concorrenteStats[c.nome_concorrente] = { nome: c.nome_concorrente, participacoes: 0, vitorias: 0 };
      }
      if (c.participou) concorrenteStats[c.nome_concorrente].participacoes++;
      if (c.ganhou) concorrenteStats[c.nome_concorrente].vitorias++;
    });

    const concorrentesProcessados = Object.values(concorrenteStats)
      .map(c => ({
        nome: c.nome,
        frequencia: c.participacoes,
        taxa_vitoria: c.participacoes > 0 ? (c.vitorias / c.participacoes) * 100 : 0,
        nivel_risco: c.participacoes > 10 && (c.vitorias / c.participacoes) > 0.5 ? "Alto" :
                     c.participacoes > 5 ? "Médio" : "Baixo"
      }))
      .sort((a, b) => b.frequencia - a.frequencia)
      .slice(0, 5);

    // Build context for AI
    const dataContext = {
      cliente: cliente.nome,
      periodo: { inicio: dataInicio, fim: dataFim },
      licitacoes: {
        total: totalLicitacoes,
        ganhas: licitacoesGanhas.length,
        perdidas: licitacoesPerdidas.length,
        participando: licitacoesParticipando.length,
        taxa_sucesso: taxaSucesso.toFixed(1),
        valor_ganho: valorTotalGanho,
        valor_perdido: valorTotalPerdido,
        ticket_medio: ticketMedio,
        principais_orgaos: principaisOrgaos,
        modalidades: modalidadesFrequentes,
      },
      concorrentes: concorrentesProcessados,
      empenhos: {
        total: empenhos?.length || 0,
        valor_total: empenhos?.reduce((sum, e) => sum + (e.valor_empenhado || 0), 0) || 0,
      },
      palavras_positivas: cliente.palavras_positivas || [],
      palavras_negativas: cliente.palavras_negativas || [],
    };

    // Default system prompt
    const defaultSystemPrompt = `Você é um especialista em análise estratégica de licitações públicas no Brasil. 
Analise os dados fornecidos e gere insights acionáveis para melhorar a performance em licitações.

Seja específico, prático e focado em resultados. Use os dados reais fornecidos para embasar suas análises.
Considere aspectos como:
- Performance histórica e tendências
- Análise competitiva e posicionamento de mercado
- Oportunidades de melhoria operacional
- Riscos e ameaças identificadas
- Recomendações estratégicas priorizadas

Responda SEMPRE em formato JSON válido seguindo exatamente a estrutura especificada.`;

    const systemPrompt = customPrompt?.prompt_sistema || defaultSystemPrompt;

    const userPrompt = `Analise os seguintes dados de licitações do cliente "${cliente.nome}" no período de ${dataInicio} a ${dataFim}:

${JSON.stringify(dataContext, null, 2)}

Gere uma análise estratégica completa em formato JSON com a seguinte estrutura:
{
  "resumo_executivo": "Texto resumindo os principais pontos da análise (3-5 parágrafos)",
  "indicadores": {
    "total_licitacoes": ${totalLicitacoes},
    "taxa_sucesso": ${taxaSucesso},
    "taxa_participacao": ${taxaParticipacao},
    "valor_total_ganho": ${valorTotalGanho},
    "valor_total_perdido": ${valorTotalPerdido},
    "ticket_medio": ${ticketMedio},
    "principais_orgaos": ${JSON.stringify(principaisOrgaos)},
    "modalidades_frequentes": ${JSON.stringify(modalidadesFrequentes)}
  },
  "analise_competitiva": {
    "posicionamento": "Descrição do posicionamento competitivo",
    "principais_concorrentes": ${JSON.stringify(concorrentesProcessados)},
    "vantagens_competitivas": ["lista de vantagens identificadas"],
    "ameacas": ["lista de ameaças identificadas"]
  },
  "tendencias": {
    "crescimento": "Análise de tendência de crescimento",
    "setores_promissores": ["setores com maior potencial"],
    "alertas": ["alertas importantes"],
    "previsoes": ["previsões para o próximo período"]
  },
  "recomendacoes": {
    "estrategicas": ["recomendações de longo prazo"],
    "operacionais": ["melhorias operacionais"],
    "urgentes": ["ações urgentes necessárias"]
  },
  "score_geral": numero de 0 a 100 representando a performance geral
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Lovable AI for strategic analysis...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Erro ao processar análise com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "Resposta vazia da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response
    let analysis;
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Return a default structure with the raw content
      analysis = {
        resumo_executivo: content,
        indicadores: {
          total_licitacoes: totalLicitacoes,
          taxa_sucesso: taxaSucesso,
          taxa_participacao: taxaParticipacao,
          valor_total_ganho: valorTotalGanho,
          valor_total_perdido: valorTotalPerdido,
          ticket_medio: ticketMedio,
          principais_orgaos: principaisOrgaos,
          modalidades_frequentes: modalidadesFrequentes,
        },
        analise_competitiva: {
          posicionamento: "Análise em processamento",
          principais_concorrentes: concorrentesProcessados,
          vantagens_competitivas: [],
          ameacas: [],
        },
        tendencias: {
          crescimento: "Dados insuficientes para análise",
          setores_promissores: [],
          alertas: [],
          previsoes: [],
        },
        recomendacoes: {
          estrategicas: [],
          operacionais: [],
          urgentes: [],
        },
        score_geral: Math.round(taxaSucesso),
      };
    }

    console.log("Strategic analysis completed successfully");

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in analyze-estrategico:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
