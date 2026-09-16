import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Licitacao {
  id: string;
  status: string;
  valor_estimado: number | null;
  orgao: string;
  modalidade: string | null;
}

interface Concorrente {
  nome_concorrente: string;
  participou: boolean;
  ganhou: boolean | null;
}

interface IAPrompt {
  prompt_sistema: string;
  modelo: string | null;
  temperatura: number | null;
  max_tokens: number | null;
}

async function processClientAnalysis(
  supabase: any,
  cliente: { id: string; nome: string },
  dataInicio: string,
  dataFim: string,
  LOVABLE_API_KEY: string
): Promise<void> {
  console.log(`Processing analysis for client: ${cliente.nome}`);

  try {
    // Fetch licitacoes data for the period
    const { data: licitacoesData } = await supabase
      .from("licitacoes")
      .select("id, status, valor_estimado, orgao, modalidade")
      .eq("cliente_id", cliente.id)
      .gte("created_at", dataInicio)
      .lte("created_at", dataFim);

    const licitacoes: Licitacao[] = licitacoesData || [];

    // Fetch concorrentes data
    const { data: concorrentesData } = await supabase
      .from("licitacao_concorrentes")
      .select("nome_concorrente, participou, ganhou")
      .eq("cliente_id", cliente.id);

    const concorrentes: Concorrente[] = concorrentesData || [];

    // Calculate basic metrics
    const totalLicitacoes = licitacoes.length;
    const licitacoesGanhas = licitacoes.filter(l => l.status === "ganha");
    const licitacoesPerdidas = licitacoes.filter(l => l.status === "perdida");
    
    const taxaSucesso = totalLicitacoes > 0 ? (licitacoesGanhas.length / totalLicitacoes) * 100 : 0;
    const valorTotalGanho = licitacoesGanhas.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
    const valorTotalPerdido = licitacoesPerdidas.reduce((sum, l) => sum + (l.valor_estimado || 0), 0);
    const ticketMedio = licitacoesGanhas.length > 0 ? valorTotalGanho / licitacoesGanhas.length : 0;

    // Group by orgao
    const orgaoCounts: Record<string, number> = {};
    licitacoes.forEach(l => {
      orgaoCounts[l.orgao] = (orgaoCounts[l.orgao] || 0) + 1;
    });
    const principaisOrgaos = Object.entries(orgaoCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([orgao]) => orgao);

    // Group by modalidade
    const modalidadeCounts: Record<string, number> = {};
    licitacoes.forEach(l => {
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
    concorrentes.forEach(c => {
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

    // Check for custom prompt
    const { data: customPromptData } = await supabase
      .from("ia_prompts")
      .select("prompt_sistema, modelo, temperatura, max_tokens")
      .eq("cliente_id", cliente.id)
      .eq("tipo", "analise_estrategica")
      .eq("ativo", true)
      .single();

    const customPrompt: IAPrompt | null = customPromptData;

    // Build context for AI
    const dataContext = {
      cliente: cliente.nome,
      periodo: { inicio: dataInicio, fim: dataFim },
      licitacoes: {
        total: totalLicitacoes,
        ganhas: licitacoesGanhas.length,
        perdidas: licitacoesPerdidas.length,
        taxa_sucesso: taxaSucesso.toFixed(1),
        valor_ganho: valorTotalGanho,
        valor_perdido: valorTotalPerdido,
        ticket_medio: ticketMedio,
        principais_orgaos: principaisOrgaos,
        modalidades: modalidadesFrequentes,
      },
      concorrentes: concorrentesProcessados,
    };

    const defaultSystemPrompt = `Você é um especialista em análise estratégica de licitações públicas no Brasil. 
Analise os dados fornecidos e gere insights acionáveis para melhorar a performance em licitações.
Responda SEMPRE em formato JSON válido seguindo exatamente a estrutura especificada.`;

    const systemPrompt = customPrompt?.prompt_sistema || defaultSystemPrompt;

    const userPrompt = `Analise os seguintes dados de licitações do cliente "${cliente.nome}" no período de ${dataInicio} a ${dataFim}:

${JSON.stringify(dataContext, null, 2)}

Gere uma análise estratégica em formato JSON:
{
  "resumo_executivo": "Texto resumindo os principais pontos",
  "indicadores": {
    "total_licitacoes": ${totalLicitacoes},
    "taxa_sucesso": ${taxaSucesso},
    "valor_total_ganho": ${valorTotalGanho},
    "valor_total_perdido": ${valorTotalPerdido},
    "ticket_medio": ${ticketMedio},
    "principais_orgaos": ${JSON.stringify(principaisOrgaos)},
    "modalidades_frequentes": ${JSON.stringify(modalidadesFrequentes)}
  },
  "analise_competitiva": {
    "posicionamento": "Descrição do posicionamento",
    "principais_concorrentes": ${JSON.stringify(concorrentesProcessados)},
    "vantagens_competitivas": [],
    "ameacas": []
  },
  "tendencias": {
    "crescimento": "Análise de tendência",
    "setores_promissores": [],
    "alertas": [],
    "previsoes": []
  },
  "recomendacoes": {
    "estrategicas": [],
    "operacionais": [],
    "urgentes": []
  },
  "score_geral": numero de 0 a 100
}`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: customPrompt?.modelo || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: customPrompt?.temperatura || 0.7,
        max_tokens: customPrompt?.max_tokens || 4000,
      }),
    });

    if (!aiResponse.ok) {
      console.error(`AI API error for ${cliente.nome}:`, aiResponse.status);
      return;
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error(`Empty AI response for ${cliente.nome}`);
      return;
    }

    // Parse JSON from AI response
    let analysis: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback structure
      analysis = {
        resumo_executivo: content,
        indicadores: {
          total_licitacoes: totalLicitacoes,
          taxa_sucesso: taxaSucesso,
          valor_total_ganho: valorTotalGanho,
          valor_total_perdido: valorTotalPerdido,
        },
        score_geral: Math.round(taxaSucesso),
      };
    }

    // Save to history table
    const { error: insertError } = await supabase
      .from("analise_estrategica_historico")
      .insert({
        cliente_id: cliente.id,
        periodo_inicio: dataInicio,
        periodo_fim: dataFim,
        resultado: analysis,
        score_geral: analysis.score_geral || Math.round(taxaSucesso),
        total_licitacoes: totalLicitacoes,
        taxa_sucesso: taxaSucesso,
        valor_total_ganho: valorTotalGanho,
        valor_total_perdido: valorTotalPerdido,
      });

    if (insertError) {
      console.error(`Error saving analysis for ${cliente.nome}:`, insertError);
    } else {
      console.log(`Analysis saved for ${cliente.nome}`);
    }
  } catch (error) {
    console.error(`Error processing ${cliente.nome}:`, error);
  }
}

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
    const supabaseAuthCheck = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuthCheck.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the previous month date range
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth.getTime() - 1);
    const firstDayOfPreviousMonth = new Date(lastDayOfPreviousMonth.getFullYear(), lastDayOfPreviousMonth.getMonth(), 1);

    const dataInicio = firstDayOfPreviousMonth.toISOString().split('T')[0];
    const dataFim = lastDayOfPreviousMonth.toISOString().split('T')[0];

    console.log(`Running batch analysis for period: ${dataInicio} to ${dataFim}`);

    // Fetch all active clients
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("ativo", true);

    if (clientesError) {
      console.error("Error fetching clients:", clientesError);
      return new Response(
        JSON.stringify({ success: false, error: "Error fetching clients" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientes || clientes.length === 0) {
      console.log("No active clients found");
      return new Response(
        JSON.stringify({ success: true, message: "No active clients to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${clientes.length} clients...`);

    // Process all clients sequentially
    for (const cliente of clientes) {
      await processClientAnalysis(supabase, cliente, dataInicio, dataFim, LOVABLE_API_KEY);
      // Add delay between clients to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("Batch analysis completed for all clients");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Batch analysis completed for ${clientes.length} clients`,
        periodo: { inicio: dataInicio, fim: dataFim }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in batch analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
