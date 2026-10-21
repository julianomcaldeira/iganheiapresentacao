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

    const { error: updErr } = await supabase
      .from('licitacoes')
      .update({ status })
      .eq('id', l.id);

    if (updErr) {
      relatorio.erros.push(`${l.numero}: ${updErr.message}`);
    } else {
      relatorio.atualizados++;
    }
  }

  // releitura para confirmar o estado final
  const { data: depois } = await supabase.from('licitacoes').select('status');
  (depois || []).forEach((l: any) => {
    relatorio.depois[l.status || 'sem status'] = (relatorio.depois[l.status || 'sem status'] || 0) + 1;
  });

  return relatorio;
}
