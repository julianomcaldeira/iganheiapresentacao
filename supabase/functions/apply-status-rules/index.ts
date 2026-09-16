// Edge function: aplica as regras automáticas de status nas licitações
// Pode ser invocada manualmente pelo admin ou agendada via cron
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRegra {
  id: string;
  cliente_id: string;
  nome: string;
  status_destino: string;
  ordem: number;
  ativo: boolean;
  condicao_sem_analise_ia: boolean | null;
  condicao_dias_sem_analise: number | null;
  condicao_etapa_workflow_id: string | null;
  condicao_etapa_finalizada: boolean | null;
  condicao_dias_apos_encerramento: number | null;
  condicao_valor_minimo: number | null;
  condicao_valor_maximo: number | null;
}

interface Licitacao {
  id: string;
  cliente_id: string;
  status: string;
  valor_estimado: number | null;
  data_encerramento: string | null;
  etapa_atual_id: string | null;
  analise_ia_data: string | null;
  analise_ia_status: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const clienteId: string | undefined = body.cliente_id;

    let regrasQuery = supabase
      .from('licitacao_status_regras')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    if (clienteId) regrasQuery = regrasQuery.eq('cliente_id', clienteId);
    const { data: regras, error: regrasErr } = await regrasQuery;
    if (regrasErr) throw regrasErr;

    let licQuery = supabase
      .from('licitacoes')
      .select('id, cliente_id, status, valor_estimado, data_encerramento, etapa_atual_id, analise_ia_data, analise_ia_status');
    if (clienteId) licQuery = licQuery.eq('cliente_id', clienteId);
    const { data: licitacoes, error: licErr } = await licQuery;
    if (licErr) throw licErr;

    const now = Date.now();
    const updates: { id: string; status: string; regra: string }[] = [];

    for (const lic of (licitacoes || []) as Licitacao[]) {
      const aplicaveis = (regras || []).filter((r: StatusRegra) => r.cliente_id === lic.cliente_id);
      for (const r of aplicaveis as StatusRegra[]) {
        if (!matches(r, lic, now)) continue;
        if (lic.status !== r.status_destino) {
          updates.push({ id: lic.id, status: r.status_destino, regra: r.nome });
        }
        break; // primeira regra que casa (por ordem) ganha
      }
    }

    // Aplicar em batches
    let applied = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: u.status })
        .eq('id', u.id);
      if (!error) applied++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_regras: regras?.length || 0,
        total_licitacoes: licitacoes?.length || 0,
        atualizadas: applied,
        detalhes: updates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('apply-status-rules error', e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function matches(r: StatusRegra, lic: Licitacao, now: number): boolean {
  // Sem análise IA
  if (r.condicao_sem_analise_ia && lic.analise_ia_status === 'concluida') return false;
  if (r.condicao_sem_analise_ia && lic.analise_ia_data) return false;

  // Dias sem análise (criação/última análise há X dias)
  if (r.condicao_dias_sem_analise != null) {
    const ref = lic.analise_ia_data ? new Date(lic.analise_ia_data).getTime() : 0;
    if (ref === 0) return true; // sem análise sempre conta
    const dias = (now - ref) / (1000 * 60 * 60 * 24);
    if (dias < r.condicao_dias_sem_analise) return false;
  }

  // Etapa específica do workflow
  if (r.condicao_etapa_workflow_id && lic.etapa_atual_id !== r.condicao_etapa_workflow_id) return false;

  // Dias após encerramento
  if (r.condicao_dias_apos_encerramento != null && lic.data_encerramento) {
    const enc = new Date(lic.data_encerramento).getTime();
    const dias = (now - enc) / (1000 * 60 * 60 * 24);
    if (dias < r.condicao_dias_apos_encerramento) return false;
  }

  // Valor
  if (r.condicao_valor_minimo != null && (lic.valor_estimado || 0) < r.condicao_valor_minimo) return false;
  if (r.condicao_valor_maximo != null && (lic.valor_estimado || 0) > r.condicao_valor_maximo) return false;

  return true;
}
