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

    const { licitacaoId, clienteId, empresaId, documentosExigidos } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar dados da empresa
    let empresaData = null;
    if (empresaId) {
      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .single();
      empresaData = data;
    }

    // Buscar dados do cliente
    let clienteData = null;
    if (clienteId) {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();
      clienteData = data;
    }

    // Buscar análise do edital se houver licitação
    let analiseEdital = null;
    if (licitacaoId) {
      const { data } = await supabase
        .from('licitacao_analises')
        .select('resultado')
        .eq('licitacao_id', licitacaoId)
        .eq('status', 'concluida')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      analiseEdital = data?.resultado;
    }

    const systemPrompt = `Você é um especialista em compliance para licitações públicas brasileiras.
Sua tarefa é verificar a conformidade dos documentos e dados da empresa com os requisitos do edital.

ANALISE os dados fornecidos e gere um relatório de compliance com:

1. STATUS GERAL: (CONFORME, PARCIALMENTE CONFORME, NÃO CONFORME)

2. CHECKLIST DE DOCUMENTOS:
Para cada documento exigido, informe:
- Nome do documento
- Status: (OK, PENDENTE, VENCIDO, NÃO APLICÁVEL)
- Observação
- Ação necessária (se houver)

3. ALERTAS CRÍTICOS:
Liste problemas que impedem a participação

4. ALERTAS DE ATENÇÃO:
Liste problemas que podem causar desclassificação

5. RECOMENDAÇÕES:
Ações prioritárias para regularização

6. SCORE DE COMPLIANCE: (0-100)

RETORNE APENAS um JSON válido no formato:
{
  "status_geral": "CONFORME|PARCIALMENTE_CONFORME|NAO_CONFORME",
  "score": 0-100,
  "checklist": [
    {
      "documento": "...",
      "categoria": "juridico|fiscal|tecnico|economico|declaracao",
      "status": "OK|PENDENTE|VENCIDO|NAO_APLICAVEL",
      "observacao": "...",
      "acao": "...",
      "prioridade": "alta|media|baixa"
    }
  ],
  "alertas_criticos": [...],
  "alertas_atencao": [...],
  "recomendacoes": [...],
  "resumo": "..."
}`;

    const userContent = `
DADOS DA EMPRESA:
${empresaData ? JSON.stringify(empresaData, null, 2) : 'Não informado'}

DADOS DO CLIENTE:
${clienteData ? JSON.stringify(clienteData, null, 2) : 'Não informado'}

DOCUMENTOS EXIGIDOS PELO EDITAL:
${documentosExigidos ? JSON.stringify(documentosExigidos, null, 2) : 'Não informado'}

ANÁLISE DO EDITAL:
${analiseEdital ? JSON.stringify(analiseEdital, null, 2) : 'Não disponível'}

Por favor, analise a conformidade e gere o relatório de compliance.`;

    console.log('Verificando compliance...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    let complianceData;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      complianceData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      complianceData = { raw_content: content, parse_error: true };
    }

    console.log('Verificação de compliance concluída');

    return new Response(JSON.stringify({ 
      success: true,
      data: complianceData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compliance-checker:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
