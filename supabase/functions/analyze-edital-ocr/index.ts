import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { editalContent, editalUrl, clienteId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    let textContent = editalContent || '';

    // Se tiver URL, baixar o conteúdo
    if (editalUrl && !editalContent) {
      try {
        const fileResponse = await fetch(editalUrl);
        if (fileResponse.ok) {
          const arrayBuffer = await fileResponse.arrayBuffer();
          // Basic text extraction - in production would use proper PDF parser
          const decoder = new TextDecoder('utf-8');
          textContent = decoder.decode(arrayBuffer);
        }
      } catch (e) {
        console.error('Erro ao baixar arquivo:', e);
      }
    }

    const systemPrompt = `Você é um especialista em análise de editais de licitação pública brasileira. 
Sua tarefa é extrair TODAS as informações relevantes do edital de forma estruturada.

EXTRAIA as seguintes informações (retorne "não informado" se não encontrar):

1. DADOS BÁSICOS:
- Número do edital
- Órgão/Entidade
- Modalidade (pregão eletrônico, presencial, concorrência, etc.)
- Tipo (menor preço, técnica e preço, etc.)
- Objeto resumido
- Valor estimado total
- Data e hora de abertura
- Data limite para propostas
- Local/Portal de realização

2. DOCUMENTOS DE HABILITAÇÃO EXIGIDOS:
- Documentos jurídicos (atos constitutivos, etc.)
- Documentos fiscais e trabalhistas
- Documentos de qualificação técnica
- Documentos de qualificação econômico-financeira
- Declarações exigidas
- Atestados de capacidade técnica

3. REQUISITOS TÉCNICOS:
- Especificações técnicas dos itens/serviços
- Requisitos mínimos
- Certificações exigidas
- Experiência mínima requerida

4. PRAZOS IMPORTANTES:
- Prazo para impugnação
- Prazo para esclarecimentos
- Prazo de entrega/execução
- Vigência do contrato
- Prazo de garantia

5. CONDIÇÕES COMERCIAIS:
- Forma de pagamento
- Reajuste
- Garantia contratual (%)
- Penalidades principais

6. CRITÉRIOS DE JULGAMENTO:
- Critério de julgamento
- Margem de preferência
- Benefícios para ME/EPP
- Modo de disputa (aberto, fechado)

RETORNE APENAS um JSON válido no seguinte formato:
{
  "dados_basicos": {...},
  "documentos_habilitacao": {
    "juridicos": [...],
    "fiscais_trabalhistas": [...],
    "qualificacao_tecnica": [...],
    "qualificacao_economica": [...],
    "declaracoes": [...],
    "atestados": [...]
  },
  "requisitos_tecnicos": {...},
  "prazos": {...},
  "condicoes_comerciais": {...},
  "criterios_julgamento": {...},
  "checklist_documentos": [...],
  "alertas": [...],
  "resumo_executivo": "..."
}`;

    console.log('Analisando edital com OCR/IA...');

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
          { role: 'user', content: `Analise o seguinte edital e extraia todas as informações estruturadas:\n\n${textContent.substring(0, 100000)}` }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402,
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

    // Parse JSON from response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      extractedData = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      extractedData = { raw_content: content, parse_error: true };
    }

    console.log('Extração OCR concluída com sucesso');

    return new Response(JSON.stringify({ 
      success: true,
      data: extractedData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-edital-ocr:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
