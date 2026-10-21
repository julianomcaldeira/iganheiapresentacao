/**
 * Garante que uma licitação tenha etapas inicializadas em
 * licitacao_etapa_execucao, usando APENAS as etapas ativas
 * configuradas do cliente em licitacao_etapas_config.
 *
 * NÃO inventa etapas padrão: se o cliente não tem configuração
 * ativa, retorna `semConfig` para o chamador exibir um aviso.
 *
 * Fluxo:
 * 1. Se já existem etapas de execução, retorna.
 * 2. Tenta a RPC SECURITY DEFINER inicializar_etapas_licitacao
 *    (lê a config do cliente e grava a execução).
 * 3. Se a RPC não inseriu nada (ou falhou), retorna semConfig /
 *    erro de permissão para o chamador reportar.
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

export interface InitResult {
  etapas: EtapaExecucaoRow[];
  /** existentes: já havia; rpc: inicializou agora; semConfig: cliente sem etapas ativas; erro: falha de permissão/rede */
  origem: 'existentes' | 'rpc' | 'semConfig' | 'erro';
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

async function fetchConfigAtiva(clienteId: string): Promise<number> {
  const { data, error } = await supabase
    .from('licitacao_etapas_config')
    .select('etapa_codigo')
    .eq('cliente_id', clienteId)
    .eq('ativo', true);
  if (error) return -1;
  return (data || []).length;
}

export async function ensureEtapasInicializadas(
  licitacaoId: string,
  clienteId: string
): Promise<InitResult> {
  const existing = await fetchExecucao(licitacaoId);
  if (existing.length > 0) {
    return { etapas: existing, origem: 'existentes' };
  }

  const cfgCount = await fetchConfigAtiva(clienteId);
  if (cfgCount === 0) {
    return { etapas: [], origem: 'semConfig' };
  }
  if (cfgCount < 0) {
    return { etapas: [], origem: 'erro', permissaoBloqueada: 'Não foi possível ler licitacao_etapas_config' };
  }

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

  const afterRpc = await fetchExecucao(licitacaoId);
  if (afterRpc.length > 0) {
    return { etapas: afterRpc, origem: 'rpc' };
  }

  if (rpcError) {
    return { etapas: [], origem: 'erro', permissaoBloqueada: rpcError };
  }
  return { etapas: [], origem: 'semConfig' };
}

export interface BatchReport {
  populadas: string[];
  semConfig: string[];
  bloqueadas: Array<{ licitacaoId: string; erro: string }>;
}

/**
 * Inicializa etapas para várias licitações (listagem).
 * Retorna o relatório de quais foram populadas, quais ficaram sem
 * configuração do cliente e quais falharam por permissão.
 */
export async function ensureEtapasEmLote(
  licitacoes: Array<{ id: string; cliente_id: string | null }>
): Promise<BatchReport> {
  const report: BatchReport = { populadas: [], semConfig: [], bloqueadas: [] };
  const configCache = new Map<string, number>();

  for (const lic of licitacoes) {
    if (!lic.cliente_id) {
      report.bloqueadas.push({ licitacaoId: lic.id, erro: 'licitação sem cliente_id' });
      continue;
    }

    let cfgCount = configCache.get(lic.cliente_id);
    if (cfgCount === undefined) {
      cfgCount = await fetchConfigAtiva(lic.cliente_id);
      configCache.set(lic.cliente_id, cfgCount);
    }
    if (cfgCount === 0) {
      report.semConfig.push(lic.id);
      continue;
    }

    const result = await ensureEtapasInicializadas(lic.id, lic.cliente_id);
    if (result.origem === 'rpc') report.populadas.push(lic.id);
    else if (result.origem === 'erro') {
      report.bloqueadas.push({ licitacaoId: lic.id, erro: result.permissaoBloqueada || 'erro desconhecido' });
    }
    // 'existentes' não precisa entrar no relatório (já tinha etapas)
  }
  return report;
}
