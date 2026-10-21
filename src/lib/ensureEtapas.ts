/**
 * Garante que uma licitação tenha etapas inicializadas em
 * licitacao_etapa_execucao, usando APENAS as etapas ativas
 * configuradas do cliente em licitacao_etapas_config.
 *
 * NÃO inventa etapas padrão: se o cliente não tem configuração
 * ativa, retorna `semConfig` para o chamador exibir um aviso.
 *
 * IMPORTANTE: uma licitação pode já ter execução PARCIAL (ex.: só
 * "proposta"). Neste caso as etapas faltantes da config precisam ser
 * preenchidas — a RPC inicializar_etapas_licitacao usa
 * ON CONFLICT (licitacao_id, etapa_codigo) DO NOTHING, ou seja,
 * preenche exatamente as que faltam, sem duplicar as existentes.
 *
 * Fluxo:
 * 1. Lê config ativa do cliente e etapas de execução da licitação.
 * 2. Se config vazia → semConfig.
 * 3. Se nada faltando → 'existentes'.
 * 4. Chama a RPC (SECURITY DEFINER).
 * 5. Se ainda faltar algo (RPC inexistente/erro) → insere direto as
 *    etapas da config que faltam (RLS permite ao admin/usuário do
 *    cliente em licitacao_etapa_execucao).
 */
import { supabase } from '@/integrations/supabase/client';

export interface EtapaExecucaoRow {
  id: string;
  licitacao_id: string;
  etapa_codigo: string;
  status: string;
  dados: Record<string, unknown>;
  observacoes: string | null;
  responsavel_id: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
}

export type InitOrigem =
  | 'existentes'
  | 'rpc'
  | 'fallback_direto'
  | 'semConfig'
  | 'erro';

export interface InitResult {
  etapas: EtapaExecucaoRow[];
  origem: InitOrigem;
  /** Etapas da config do cliente que não puderam ser criadas */
  faltantes?: string[];
  /** Mensagem de erro de permissão/rede, quando houver */
  permissaoBloqueada?: string;
}

async function fetchExecucao(licitacaoId: string): Promise<EtapaExecucaoRow[]> {
  const { data, error } = await supabase
    .from('licitacao_etapa_execucao')
    .select('*')
    .eq('licitacao_id', licitacaoId);
  if (error) return [];
  return (data || []) as EtapaExecucaoRow[];
}

async function fetchConfigAtiva(
  clienteId: string
): Promise<{ codigos: string[]; erro?: string }> {
  const { data, error } = await supabase
    .from('licitacao_etapas_config')
    .select('etapa_codigo')
    .eq('cliente_id', clienteId)
    .eq('ativo', true);
  if (error) return { codigos: [], erro: error.message };
  return { codigos: (data || []).map((c: any) => c.etapa_codigo as string) };
}

function codigosFaltantes(execucao: EtapaExecucaoRow[], config: string[]): string[] {
  const existentes = new Set(execucao.map((e) => e.etapa_codigo));
  return config.filter((c) => !existentes.has(c));
}

export async function ensureEtapasInicializadas(
  licitacaoId: string,
  clienteId: string
): Promise<InitResult> {
  const cfg = await fetchConfigAtiva(clienteId);
  if (cfg.erro) {
    return { etapas: [], origem: 'erro', permissaoBloqueada: cfg.erro };
  }
  if (cfg.codigos.length === 0) {
    return { etapas: await fetchExecucao(licitacaoId), origem: 'semConfig' };
  }

  const existing = await fetchExecucao(licitacaoId);
  const faltantes = codigosFaltantes(existing, cfg.codigos);
  if (faltantes.length === 0) {
    return { etapas: existing, origem: 'existentes' };
  }

  // Tenta a RPC — preenche apenas as etapas faltantes
  let rpcError: string | undefined;
  try {
    const { error } = await supabase.rpc('inicializar_etapas_licitacao', {
      p_licitacao_id: licitacaoId,
      p_cliente_id: clienteId,
    });
    if (error) rpcError = error.message;
  } catch (e) {
    rpcError = (e as Error).message;
  }

  let atuais = await fetchExecucao(licitacaoId);
  let aindaFaltam = codigosFaltantes(atuais, cfg.codigos);
  if (aindaFaltam.length === 0) {
    return { etapas: atuais, origem: 'rpc' };
  }

  // Fallback: grava direto as etapas da config que faltam
  const { error: insErr } = await supabase
    .from('licitacao_etapa_execucao')
    .upsert(
      aindaFaltam.map((codigo) => ({
        licitacao_id: licitacaoId,
        etapa_codigo: codigo,
        status: 'nao_iniciada',
      })),
      { onConflict: 'licitacao_id,etapa_codigo', ignoreDuplicates: true }
    );

  atuais = await fetchExecucao(licitacaoId);
  aindaFaltam = codigosFaltantes(atuais, cfg.codigos);
  if (aindaFaltam.length === 0) {
    return { etapas: atuais, origem: 'fallback_direto' };
  }

  return {
    etapas: atuais,
    origem: 'erro',
    faltantes: aindaFaltam,
    permissaoBloqueada:
      insErr?.message ||
      rpcError ||
      `Não foi possível criar as etapas: ${aindaFaltam.join(', ')}`,
  };
}

export interface BatchReport {
  populadas: string[];
  semConfig: string[];
  bloqueadas: Array<{ licitacaoId: string; erro: string }>;
}

/**
 * Inicializa/completa as etapas de várias licitações (listagem).
 * Só chama a RPC para as licitações que realmente estão faltando
 * etapas em relação à config do cliente.
 */
export async function ensureEtapasEmLote(
  licitacoes: Array<{ id: string; cliente_id: string | null }>
): Promise<BatchReport> {
  const report: BatchReport = { populadas: [], semConfig: [], bloqueadas: [] };
  if (licitacoes.length === 0) return report;

  const licIds = licitacoes.map((l) => l.id);
  const clienteIds = Array.from(
    new Set(licitacoes.map((l) => l.cliente_id).filter(Boolean) as string[])
  );

  const [execRes, cfgRes] = await Promise.all([
    supabase
      .from('licitacao_etapa_execucao')
      .select('licitacao_id, etapa_codigo')
      .in('licitacao_id', licIds),
    clienteIds.length > 0
      ? supabase
          .from('licitacao_etapas_config')
          .select('cliente_id, etapa_codigo')
          .in('cliente_id', clienteIds)
          .eq('ativo', true)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const execPorLic = new Map<string, Set<string>>();
  (execRes.data || []).forEach((r: any) => {
    if (!execPorLic.has(r.licitacao_id)) execPorLic.set(r.licitacao_id, new Set());
    execPorLic.get(r.licitacao_id)!.add(r.etapa_codigo);
  });

  const cfgPorCliente = new Map<string, string[]>();
  (cfgRes.data || []).forEach((r: any) => {
    if (!cfgPorCliente.has(r.cliente_id)) cfgPorCliente.set(r.cliente_id, []);
    cfgPorCliente.get(r.cliente_id)!.push(r.etapa_codigo);
  });

  const aInicializar: Array<{ id: string; cliente_id: string }> = [];
  for (const lic of licitacoes) {
    if (!lic.cliente_id) {
      report.bloqueadas.push({
        licitacaoId: lic.id,
        erro: 'licitação sem cliente_id — não é possível definir as etapas',
      });
      continue;
    }
    const cfg = cfgPorCliente.get(lic.cliente_id) || [];
    if (cfg.length === 0) {
      report.semConfig.push(lic.id);
      continue;
    }
    const existentes = execPorLic.get(lic.id) || new Set<string>();
    if (cfg.every((c) => existentes.has(c))) continue; // já está completa
    aInicializar.push({ id: lic.id, cliente_id: lic.cliente_id });
  }

  for (const lic of aInicializar) {
    const result = await ensureEtapasInicializadas(lic.id, lic.cliente_id);
    if (result.origem === 'rpc' || result.origem === 'fallback_direto') {
      report.populadas.push(lic.id);
    } else if (result.origem === 'erro') {
      report.bloqueadas.push({
        licitacaoId: lic.id,
        erro:
          result.permissaoBloqueada ||
          `etapas faltantes: ${(result.faltantes || []).join(', ')}`,
      });
    }
  }

  return report;
}
