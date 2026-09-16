import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

    const { ticketId, mensagem, historico, ticketInfo } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    const systemPrompt = `Você é um assistente de IA especializado em ajudar atendentes de suporte técnico de um sistema de licitações. Seu papel é:

1. ANALISAR a mensagem do cliente e entender o problema
2. IDENTIFICAR se é um BUG/ERRO no sistema, dúvida de uso, ou solicitação de funcionalidade
3. Se for um BUG/ERRO, gerar um PROMPT PRONTO PARA O LOVABLE corrigir o código
4. SUGERIR respostas apropriadas para o atendente enviar ao cliente

INFORMAÇÕES DO TICKET:
- Título: ${ticketInfo?.titulo || 'N/A'}
- Categoria: ${ticketInfo?.categoria || 'N/A'}
- Prioridade: ${ticketInfo?.prioridade || 'N/A'}
- Status: ${ticketInfo?.status || 'N/A'}
- Descrição original: ${ticketInfo?.descricao || 'N/A'}

CONTEXTO DO SISTEMA:
- Sistema de gestão de licitações públicas
- Stack: React, TypeScript, Tailwind CSS, Supabase
- Funcionalidades: Clientes, Empresas, Licitações, Workflows, Tarefas, Produtos, Empenhos, IA para análise de editais

DIRETRIZES:
- Seja conciso e objetivo
- Identifique palavras-chave técnicas e tente mapear para componentes/páginas do sistema
- Se for um erro, tente identificar qual página/funcionalidade está com problema
- Gere prompts claros e específicos para o Lovable

Responda SEMPRE neste formato estruturado:

## 🔍 Análise do Problema
[Sua análise detalhada do problema reportado]

## 🏷️ Classificação
- **Tipo:** [BUG | DÚVIDA | SUGESTÃO | OUTRO]
- **Área Afetada:** [Nome da página/funcionalidade, ex: "Licitações", "Atendimento", etc.]
- **Severidade:** [CRÍTICO | ALTO | MÉDIO | BAIXO]

## 💬 Sugestão de Resposta ao Cliente
[Texto profissional e empático para enviar ao cliente]

## 🔧 Prompt para o Lovable
\`\`\`
[SE FOR BUG: Prompt claro e específico que o atendente pode copiar e colar diretamente no Lovable para corrigir o problema. Inclua:
- O que está acontecendo (erro)
- O que deveria acontecer (comportamento esperado)
- Onde está o problema (página/componente se identificável)
- Qualquer contexto técnico relevante

SE NÃO FOR BUG: Escreva "N/A - Não é um bug de código"]
\`\`\`

## ✅ Próximos Passos
[Lista numerada de ações recomendadas para o atendente]`;

    const messages: Message[] = [
      { role: 'user', content: mensagem }
    ];

    // Add conversation history if available
    if (historico && historico.length > 0) {
      const historyContext = historico.map((h: { is_ia: boolean; conteudo: string }) => 
        `${h.is_ia ? 'IA' : 'Atendente/Cliente'}: ${h.conteudo}`
      ).join('\n\n');
      
      messages[0].content = `HISTÓRICO DA CONVERSA:\n${historyContext}\n\nNOVA MENSAGEM DO CLIENTE:\n${mensagem}`;
    }

    console.log('Calling Lovable AI for support assistance...');

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
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Entre em contato com o administrador.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const sugestao = data.choices?.[0]?.message?.content;

    if (!sugestao) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('AI suggestion generated successfully');

    return new Response(JSON.stringify({ sugestao }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in support-ai-assistant:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
