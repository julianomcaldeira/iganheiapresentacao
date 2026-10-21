/**
 * Cenários distintos por EMPRESA na estrutura das licitações.
 *
 * Cada empresa do cliente recebe um perfil de execução diferente, para
 * que a demonstração mostre empresas em situações distintas:
 *
 *   avancado    -> processo completo, com resultado ganho, contrato e empenho
 *   disputa     -> até o encerramento da disputa, sem resultado
 *   proposta    -> até a proposta finalizada
 *   analise     -> até a aprovação
 *   inicial     -> apenas a análise do edital concluída
 *   perdido     -> processo completo, mas com resultado perdido
 *
 * A aplicação é feita sobre as etapas de execução da licitação
 * (licitacao_etapa_execucao), respeitando a ordem configurada pelo
 * cliente em licitacao_etapas_config.
 */
import { supabase } from '@/integrations/supabase/client';
import { inserirChecklistDocumentos } from '@/lib/inserirChecklistDocumentos';

export type PerfilEmpresa =
  | 'avancado'
  | 'disputa'
  | 'proposta'
  | 'analise'
  | 'inicial'
  | 'perdido';

export const PERFIS_EMPRESA: Record<
  PerfilEmpresa,
  { rotulo: string; descricao: string; ateEtapa: number; statusLicitacao: string; resultado: 'ganho' | 'perdeu' | 'pendente' }
> = {
  avancado: {
    rotulo: 'Processo completo — ganho',
    descricao: 'Todas as etapas concluídas, item adjudicado, contrato e empenho firmados.',
    ateEtapa: 99,
    statusLicitacao: 'finalizado',
    resultado: 'ganho',
  },
  disputa: {
    rotulo: 'Disputa encerrada',
    descricao: 'Processo até a finalização da disputa, aguardando análise de resultado.',
    ateEtapa: 6,
    statusLicitacao: 'em_andamento',
    resultado: 'pendente',
  },
  perdido: {
    rotulo: 'Processo completo — não adjudicada',
    descricao: 'Todas as etapas concluídas, porém sem ganho de item.',
    ateEtapa: 99,
    statusLicitacao: 'recusado',
    resultado: 'perdeu',
  },
  analise: {
    rotulo: 'Em análise',
    descricao: 'Etapa de análise e aprovação em curso.',
    ateEtapa: 3,
    statusLicitacao: 'pendente_analise',
    resultado: 'pendente',
  },
  proposta: {
    rotulo: 'Proposta finalizada',
    descricao: 'Análise, aprovação e proposta concluídas; disparo não iniciado.',
    ateEtapa: 5,
    statusLicitacao: 'em_andamento',
    resultado: 'pendente',
  },
  inicial: {
    rotulo: 'Iniciada',
    descricao: 'Análise do edital concluída, demais etapas não iniciadas.',
    ateEtapa: 1,
    statusLicitacao: 'pendente_analise',
    resultado: 'pendente',
  },
};

/**
 * Ordem dos perfis: as 4 primeiras empresas cobrem os 4 status gerais
 * (finalizado, em_andamento, recusado, pendente_analise), garantindo
 * variedade na listagem.
 */
const PERFIS: PerfilEmpresa[] = [
  'avancado',
  'disputa',
  'perdido',
  'analise',
  'proposta',
  'inicial',
];

/** Status final de cada etapa do sistema quando ela entra no cenário. */
const STATUS_FINAL_POR_ETAPA: Record<string, string> = {
  analise_edital: 'edital_analisado',
  esclarecimento_impugnacao: 'finalizada',
  impugnacao_contrarrazao: 'finalizada',
  aprovacoes: 'concluido',
  concorrentes: 'concluido',
  preparacao_documentos: 'documentos_analisados',
  produtos: 'concluido',
  proposta: 'proposta_finalizada',
  tarefas: 'concluido',
  disputa_pregao: 'disputa_finalizada',
  resultado: 'resultado_finalizado',
  contratos: 'concluido',
  empenhos: 'concluido',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Perfil atribuído a uma empresa (rodízio, garantindo variedade). */
export function perfilDaEmpresa(indice: number): PerfilEmpresa {
  return PERFIS[indice % PERFIS.length];
}

export interface RelatorioCenariosEmpresa {
  empresas: number;
  licitacoes: number;
  etapasAplicadas: number;
  resultados: number;
  perfis: Record<string, string[]>;
  erros: string[];
}

export interface EmpresaCenario {
  id: string;
  razao_social: string;
  cliente_id: string;
  perfil: PerfilEmpresa;
  licitacoes: string[];
}

/**
 * Aplica o cenário por empresa em todas as licitações das empresas
 * informadas (por padrão, todas as empresas dos clientes ativos).
 */
export async function aplicarCenariosPorEmpresa(
  opts: { clienteId?: string } = {}
): Promise<RelatorioCenariosEmpresa> {
  const relatorio: RelatorioCenariosEmpresa = {
    empresas: 0,
    licitacoes: 0,
    etapasAplicadas: 0,
    resultados: 0,
    perfis: {},
    erros: [],
  };

  let empQuery = supabase
    .from('empresas')
    .select('id, cliente_id, razao_social, nome_fantasia, ativo')
    .eq('ativo', true);
  if (opts.clienteId) empQuery = empQuery.eq('cliente_id', opts.clienteId);
  const { data: empresas } = await empQuery;

  if (!empresas || empresas.length === 0) {
    relatorio.erros.push('nenhuma empresa encontrada');
    return relatorio;
  }

  const empresaIds = empresas.map((e: any) => e.id);
  const clienteIds = Array.from(new Set((empresas as any[]).map((e: any) => e.cliente_id)));

  const { data: licitacoes } = await supabase
    .from('licitacoes')
    .select('id, cliente_id, numero, empresa_id, objeto, valor_estimado')
    .in('cliente_id', clienteIds);

  const licPorEmpresa = new Map<string, any[]>();
  (licitacoes || []).forEach((l: any) => {
    if (!l.empresa_id) return;
    if (!licPorEmpresa.has(l.empresa_id)) licPorEmpresa.set(l.empresa_id, []);
    licPorEmpresa.get(l.empresa_id)!.push(l);
  });

  const empresasComCenario: EmpresaCenario[] = [...(empresas as any[])]
    .sort((a: any, b: any) =>
      `${a.cliente_id}-${a.id}`.localeCompare(`${b.cliente_id}-${b.id}`)
    )
    .map((e: any, i: number) => ({
      id: e.id,
      razao_social: e.nome_fantasia || e.razao_social,
      cliente_id: e.cliente_id,
      perfil: perfilDaEmpresa(i),
      licitacoes: (licPorEmpresa.get(e.id) || []).map((l: any) => l.id),
    }));

  for (const empresa of empresasComCenario) {
    relatorio.empresas++;
    relatorio.perfis[empresa.perfil] = [...(relatorio.perfis[empresa.perfil] || []), empresa.razao_social];
    if (empresa.licitacoes.length === 0) continue;

    for (const licId of empresa.licitacoes) {
      const lic = (licitacoes || []).find((l: any) => l.id === licId);
      const aplicou = await aplicarCenarioLicitacao(licId, empresa.perfil, empresa.cliente_id, relatorio);
      if (aplicou) {
        relatorio.licitacoes++;
        relatorio.etapasAplicadas += aplicou.etapas;
        relatorio.resultados += aplicou.resultados;
        if (lic) {
          await supabase
            .from('licitacoes')
            .update({ status: PERFIS_EMPRESA[empresa.perfil].statusLicitacao })
            .eq('id', licId);
        }
      }
    }
  }

  // Licitações sem empresa vinculada: também recebem status variety
  const StatusPelaEmpresa = new Set(
    empresasComCenario.flatMap((e) => e.licitacoes)
  );
  const orfas = (licitacoes || []).filter((l: any) => !StatusPelaEmpresa.has(l.id));
  const statusOrfaos: Array<'finalizado' | 'em_andamento' | 'recusado' | 'pendente_analise'> = [
    'em_andamento',
    'pendente_analise',
    'finalizado',
    'recusado',
  ];
  for (let i = 0; i < orfas.length; i++) {
    const status = statusOrfaos[i % statusOrfaos.length];
    const { error } = await supabase
      .from('licitacoes')
      .update({ status })
      .eq('id', orfas[i].id);
    if (error) relatorio.erros.push(`status ${orfas[i].numero}: ${error.message}`);
    else relatorio.licitacoes++;
  }

  return relatorio;
}

interface ResultadoAplicacao {
  etapas: number;
  resultados: number;
}

/**
 * Aplica o perfil de execução nas etapas da licitação, na ordem
 * configurada pelo cliente.
 */
async function aplicarCenarioLicitacao(
  licitacaoId: string,
  perfil: PerfilEmpresa,
  clienteId: string,
  relatorio: RelatorioCenariosEmpresa
): Promise<ResultadoAplicacao> {
  const conf = PERFIS_EMPRESA[perfil];

  const [{ data: cfgs }, { data: exec }] = await Promise.all([
    supabase
      .from('licitacao_etapas_config')
      .select('etapa_codigo, ordem')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .order('ordem'),
    supabase.from('licitacao_etapa_execucao').select('*').eq('licitacao_id', licitacaoId),
  ]);

  if (!exec || exec.length === 0) return { etapas: 0, resultados: 0 };

  const ordem = new Map((cfgs || []).map((c: any, i: number) => [c.etapa_codigo as string, i]));
  const linhas = [...exec].sort(
    (a: any, b: any) =>
      (ordem.get(a.etapa_codigo) ?? 999) - (ordem.get(b.etapa_codigo) ?? 999)
  );

  const agora = new Date();
  const dataInicio = new Date(agora.getTime() - 20 * 86400000).toISOString();
  let aplicadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const dentroDoCenario = i < conf.ateEtapa;
    // etapas de resultado/contrato só existem em cenários completos
    const exigeConclusao =
      linha.etapa_codigo === 'resultado' ||
      linha.etapa_codigo === 'contratos' ||
      linha.etapa_codigo === 'empenhos';
    const status = !dentroDoCenario
      ? 'nao_iniciada'
      : exigeConclusao && conf.ateEtapa < 99
        ? 'nao_iniciada'
        : STATUS_FINAL_POR_ETAPA[linha.etapa_codigo] || linha.status || 'nao_iniciada';

    // preserva o conteúdo já gerado (dados/observações da IA) quando a etapa entra no cenário
    const observacoes =
      status === 'nao_iniciada'
        ? 'Etapa não iniciada neste cenário.'
        : linha.observacoes || `Etapa concluída no cenário "${conf.rotulo}".`;

    const { error } = await supabase
      .from('licitacao_etapa_execucao')
      .update({
        status,
        dados: status === 'nao_iniciada' ? {} : linha.dados || {},
        observacoes,
        data_inicio: status === 'nao_iniciada' ? null : dataInicio,
        data_conclusao:
          status === 'nao_iniciada' || status === 'em_andamento' || status === 'em_analise'
            ? null
            : new Date(agora.getTime() - (15 - i) * 86400000).toISOString(),
      })
      .eq('id', linha.id);

    if (error) relatorio.erros.push(`etapa ${linha.etapa_codigo}: ${error.message}`);
    else aplicadas++;
  }

  // Resultado por item (apenas nos cenários completos)
  let resultados = 0;
  if (conf.resultado !== 'pendente') {
    const { data: itens } = await supabase
      .from('licitacao_produtos')
      .select('id, item_numero, descricao, valor_total')
      .eq('licitacao_id', licitacaoId)
      .order('item_numero');

    if (itens && itens.length > 0) {
      await supabase.from('licitacao_resultado_itens').delete().eq('licitacao_id', licitacaoId);
      const ganhouItem = conf.resultado === 'ganho';
      const rows = itens.map((item: any, idx: number) => ({
        licitacao_id: licitacaoId,
        item_numero: item.item_numero,
        descricao: item.descricao,
        resultado: idx === 0 && ganhouItem ? 'ganhou' : 'perdeu',
        valor_proposta: Number((Number(item.valor_total || 0) * 0.876).toFixed(2)),
        valor_vencedor: idx === 0 && ganhouItem ? Number((Number(item.valor_total || 0) * 0.876).toFixed(2)) : null,
        vencedor_nome: idx === 0 && ganhouItem ? 'Licitante do cenário' : null,
        observacoes:
          idx === 0 && ganhouItem
            ? 'Item adjudicado na fase de disputa.'
            : 'Não adjudicado neste certame.',
      }));
      const ins = await inserirResultadoItens(rows);
      if (!ins.ok) relatorio.erros.push(`resultado: ${ins.erro}`);
      else resultados = rows.length;
    }
  }

  return { etapas: aplicadas, resultados };
}

/** Inserção segura em licitacao_resultado_itens (tolera colunas divergentes). */
async function inserirResultadoItens(rows: any[]) {
  let payload = rows.map((r) => ({ ...r }));
  for (let t = 0; t < 4; t++) {
    const { error } = await supabase.from('licitacao_resultado_itens').insert(payload);
    if (!error) return { ok: true };
    const match = (error.message || '').match(/Could not find the '([a-z_]+)' column/);
    const coluna = match ? match[1] : null;
    if (!coluna || !payload.some((r) => coluna in r)) return { ok: false, erro: error.message };
    payload = payload.map((r) => {
      const copy = { ...r };
      delete copy[coluna];
      return copy;
    });
  }
  return { ok: false, erro: 'falha ao gravar resultado' };
}
