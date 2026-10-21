/**
 * Aplica variedade de status às licitações da base de demonstração.
 *
 * Os status válidos são os do sistema (src/lib/licitacaoStatus.ts):
 *   pendente_analise | em_andamento | finalizado | recusado
 *
 * A distribuição é feita em rodízio sobre as licitações, de forma que a
 * listagem ilustre todos os status. Cada gravação é verificada e o
 * relatório traz o antes/depois (quantas licitações em cada status).
 */
import { supabase } from '@/integrations/supabase/client';
import { gravarStatusLicitacao } from '@/lib/statusLicitacao';

export const STATUS_DEMO = [
  'finalizado',
  'em_andamento',
  'recusado',
  'pendente_analise',
] as const;

export type StatusDemo = (typeof STATUS_DEMO)[number];

export interface RelatorioStatus {
  total: number;
  antes: Record<string, number>;
  depois: Record<string, number>;
  atualizados: number;
  /** Licitações em que o banco gravou um valor equivalente (ex.: 'concluida' em vez de 'finalizado') */
  adapted: Array<{ licitacao: string; desejado: string; gravado: string }>;
  erros: string[];
}

export async function aplicarStatusVariado(opts: {
  clienteId?: string | null;
  /** Se true, licitações da mesma empresa recebem o mesmo status */
  porEmpresa?: boolean;
} = {}): Promise<RelatorioStatus> {
  const relatorio: RelatorioStatus = {
    total: 0,
    antes: {},
    depois: {},
    atualizados: 0,
    adapted: [],
    erros: [],
  };

  let query = supabase
    .from('licitacoes')
    .select('id, numero, status, empresa_id, cliente_id')
    .order('numero', { ascending: true });
  if (opts.clienteId) query = query.eq('cliente_id', opts.clienteId);

  const { data, error } = await query;
  if (error) {
    relatorio.erros.push(`leitura das licitações: ${error.message}`);
    return relatorio;
  }

  const licitacoes = (data || []) as any[];
  relatorio.total = licitacoes.length;
  for (const l of licitacoes) {
    relatorio.antes[l.status || 'sem status'] = (relatorio.antes[l.status || 'sem status'] || 0) + 1;
  }

  // índice do status por empresa (para manter o cenário coeso por empresa)
  const statusPorEmpresa = new Map<string, StatusDemo>();
  let i = 0;

  for (const l of licitacoes) {
    let status: StatusDemo;
    if (opts.porEmpresa && l.empresa_id) {
      if (!statusPorEmpresa.has(l.empresa_id)) {
        statusPorEmpresa.set(l.empresa_id, STATUS_DEMO[i % STATUS_DEMO.length]);
        i++;
      }
      status = statusPorEmpresa.get(l.empresa_id)!;
    } else {
      status = STATUS_DEMO[i % STATUS_DEMO.length];
      i++;
    }

    const res = await gravarStatusLicitacao(l.id, status);
    if (!res.ok) {
      relatorio.erros.push(`${l.numero}: ${res.erro}`);
    } else {
      relatorio.atualizados++;
      if (res.valor !== status) {
        relatorio.adapted.push({
          licitacao: l.numero,
          desejado: status,
          gravado: res.valor as string,
        });
      }
    }
  }

  // releitura para confirmar o estado final
  const { data: depois } = await supabase.from('licitacoes').select('status');
  (depois || []).forEach((l: any) => {
    relatorio.depois[l.status || 'sem status'] = (relatorio.depois[l.status || 'sem status'] || 0) + 1;
  });

  return relatorio;
}

/**
 * Diagnóstico: tenta gravar cada status candidato e relê o valor atual.
 * Serve para descobrir (a) se a gravação é recusada e (b) quais valores
 * o banco aceita — o schema real pode diferir do app (CHECK constraint
 * com os valores antigos, por exemplo).
 */
export const STATUS_CANDIDATOS = [
  'finalizado',
  'recusado',
  'pendente_analise',
  'concluida',
  'ganha',
  'perdida',
  'aguardando_aprovacao',
  'rascunho',
  'cancelada',
];

export async function diagnosticarStatus(
  licitacaoId: string
): Promise<{
  antes: string | null;
  resultados: Array<{ valor: string; ok: boolean; erro?: string; atual?: string | null }>;
  melhorStatus: string | null;
}> {
  const { data: antes } = await supabase
    .from('licitacoes')
    .select('status')
    .eq('id', licitacaoId)
    .maybeSingle();

  const resultados: Array<{ valor: string; ok: boolean; erro?: string; atual?: string | null }> = [];
  let melhorStatus: string | null = null;

  for (const valor of STATUS_CANDIDATOS) {
    const { error } = await supabase
      .from('licitacoes')
      .update({ status: valor })
      .eq('id', licitacaoId);

    const { data: leitura } = await supabase
      .from('licitacoes')
      .select('status')
      .eq('id', licitacaoId)
      .maybeSingle();

    const atual = leitura?.status ?? null;
    const ok = !error && atual === valor;
    resultados.push({ valor, ok, erro: error?.message, atual });
    if (ok && !melhorStatus) melhorStatus = valor;
  }

  return {
    antes: antes?.status ?? null,
    resultados,
    melhorStatus,
  };
}
