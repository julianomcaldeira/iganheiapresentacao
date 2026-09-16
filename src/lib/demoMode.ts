/**
 * DEMO MODE
 * Este ambiente é uma base de demonstração. Todas as chamadas para Edge Functions
 * de IA são interceptadas e devolvem respostas canned (simuladas). Os dados já
 * estão persistidos no banco como se a IA os tivesse processado.
 *
 * Para reativar a IA real, basta colocar DEMO_MODE = false.
 */
import { supabase } from '@/integrations/supabase/client';

export const DEMO_MODE = true;

// Conjunto de Edge Functions classificadas como IA / processamento pesado.
// Quando DEMO_MODE = true, essas chamadas retornam payloads simulados sem
// gastar créditos/quotas.
const AI_FUNCTIONS = new Set<string>([
  'analyze-licitacao',
  'analyze-edital-ocr',
  'analyze-estrategico',
  'analyze-estrategico-batch',
  'chat-edital',
  'generate-peca',
  'compliance-checker',
  'news-intelligence',
  'support-ai-assistant',
  'ipesquisei-sync',
  'idocumentei-sync',
  'cron-newsletter',
  'apply-status-rules',
]);

// Respostas canned por função — mantém o formato que o front espera.
function cannedResponse(fnName: string, body: any): { data: any; error: null } {
  const now = new Date().toISOString();

  switch (fnName) {
    case 'analyze-licitacao': {
      const conteudo = `## 📋 Resumo Inteligente do Edital — Perguntas-Chave

**1. Qual é o objeto da licitação?**
Conforme termo de referência anexo ao edital.

**2. Qual a modalidade e o critério de julgamento?**
Modalidade compatível — critério de **menor preço por item**.

**3. Qual o valor estimado e a margem aceitável?**
Margem de lance sugerida pela IA: **8% a 15%** abaixo do estimado.

**4. Qual o prazo de entrega/execução?**
Até **30 dias corridos** após emissão da Nota de Empenho.

**5. Quais documentos de habilitação são exigidos?**
CND Federal, FGTS, INSS, Estadual, Municipal, CNDT, Atestado de Capacidade Técnica e Balanço Patrimonial.

**6. Há exigência de visita técnica ou amostra?**
Não obrigatória — declaração de conhecimento das condições é suficiente.

**7. Principais penalidades?**
Multa de **0,5%/dia** (limite 10%) + suspensão até 2 anos (Lei 14.133/21).

**8. Pontos de risco identificados:**
- ⚠️ Atestado com quantitativo mínimo de 50% pode restringir competição.
- ⚠️ Prazo de impugnação curto: 3 dias úteis.
- ✅ Pagamento em até 30 dias — fluxo saudável.

**9. Recomendação estratégica:**
**PARTICIPAR** — Aderência alta ao portfólio e baixo risco operacional.`;

      return {
        data: {
          success: true,
          demo: true,
          analysis: { conteudo },
          analise: { resumo: conteudo, recomendacao: 'PARTICIPAR', score: 87, relevancia: 'alta' },
          message: 'Análise gerada (modo demonstração)',
        },
        error: null,
      };
    }

    case 'analyze-edital-ocr':
      return {
        data: {
          success: true,
          demo: true,
          extracted: {
            numero: body?.numero || '000/2026',
            modalidade: 'Pregão Eletrônico',
            objeto: 'Objeto extraído por OCR (demonstração).',
            valor_estimado: 1250000,
            data_abertura: now,
          },
        },
        error: null,
      };

    case 'analyze-estrategico':
    case 'analyze-estrategico-batch':
      return {
        data: {
          success: true,
          demo: true,
          relatorio: {
            periodo: 'últimos 30 dias',
            taxa_sucesso: 38.5,
            ticket_medio: 412000,
            recomendacoes: [
              'Focar em pregões de TI no Sudeste',
              'Revisar margem em equipamentos médicos',
              'Acompanhar 3 concorrentes recorrentes',
            ],
          },
        },
        error: null,
      };

    case 'chat-edital':
      return {
        data: {
          success: true,
          demo: true,
          resposta:
            'Resposta simulada (modo demonstração). A IA real foi desativada nesta base. Os dados já estão pré-processados no banco.',
        },
        error: null,
      };

    case 'generate-peca':
      return {
        data: {
          success: true,
          demo: true,
          conteudo:
            '<h1>Documento Gerado (Demo)</h1><p>Este é um conteúdo simulado. Em produção a IA gera a peça jurídica completa com base no edital e no template configurado.</p>',
          message: 'Peça gerada (modo demonstração)',
        },
        error: null,
      };

    case 'compliance-checker':
      return {
        data: {
          success: true,
          demo: true,
          conformidade: 92,
          itens: [
            { item: 'Habilitação jurídica', status: 'ok' },
            { item: 'Regularidade fiscal', status: 'ok' },
            { item: 'Qualificação técnica', status: 'atencao' },
            { item: 'Qualificação econômico-financeira', status: 'ok' },
          ],
        },
        error: null,
      };

    case 'news-intelligence':
      return {
        data: { success: true, demo: true, processed: 0, message: 'Sem novidades (demo)' },
        error: null,
      };

    case 'support-ai-assistant':
      return {
        data: {
          success: true,
          demo: true,
          resposta:
            'Atendimento simulado. Em produção a IA responde com base na FAQ e histórico do cliente.',
        },
        error: null,
      };

    case 'ipesquisei-sync':
    case 'idocumentei-sync':
      return {
        data: { success: true, demo: true, synced: 0, message: 'Sincronização simulada (demo)' },
        error: null,
      };

    case 'cron-newsletter':
      return {
        data: { success: true, demo: true, sent: 0, message: 'Newsletter não enviada (demo)' },
        error: null,
      };

    case 'apply-status-rules':
      return { data: { success: true, demo: true, atualizadas: 0 }, error: null };

    default:
      return {
        data: { success: true, demo: true, message: 'Resposta simulada (modo demonstração)' },
        error: null,
      };
  }
}

let installed = false;

export function installDemoModeInterceptor() {
  if (!DEMO_MODE || installed) return;
  installed = true;

  const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

  // @ts-ignore — substituição em runtime
  supabase.functions.invoke = async (fnName: string, options?: any) => {
    if (AI_FUNCTIONS.has(fnName)) {
      // Pequeno delay para simular processamento
      await new Promise((r) => setTimeout(r, 350));
      // eslint-disable-next-line no-console
      console.info(`[DEMO] Interceptado: ${fnName}`);
      return cannedResponse(fnName, options?.body);
    }
    return originalInvoke(fnName, options);
  };
}
