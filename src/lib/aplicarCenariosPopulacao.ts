/**
 * Aplica a configuração de etapas para todas as licitações de uma vez.
 *
 * Fluxo:
 * 1. Para cada cliente, busca as etapas ativas de licitacao_etapas_config.
 * 2. Para cada licitação do cliente, verifica quais etapas faltam.
 * 3. Insere apenas as etapas faltantes (ON CONFLICT DO NOTHING).
 * 4. Tenta usar a RPC inicializar_etapas_licitacao se existir; caso contrário,
 *    insere diretamente.
 *
 * É idempotente: pode ser executado quantas vezes quiser.
 */
import { supabase } from '@/integrations/supabase/client';

export interface EtapaConfig {
  etapa_codigo: string;
  ordem: number;
}

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

export interface RelatorioPopulacao {
  licitacoes: number;
  statusFinal: Record<string, number>;
  certificacoes: number;
  certificacoesVencidas: number;
  erros: string[];
}

/**
 * Busca as etapas ativas configuradas para um cliente.
 */
async function buscarEtapasAtivas(clienteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('licitacao_etapas_config')
    .select('etapa_codigo')
    .eq('cliente_id', clienteId)
    .eq('ativo', true)
    .order('ordem');

  if (error) {
    console.error(`Erro ao buscar etapas do cliente ${clienteId}:`, error);
    return [];
  }

  return (data || []).map((c: any) => c.etapa_codigo);
}

/**
 * Aplica a configuração de etapas para uma licitação específica.
 * Usa a RPC inicializar_etapas_licitacao se existir; caso contrário insere
 * diretamente as etapas faltantes.
 */
export async function aplicarCenarioParaLicitacao(
  licitacaoId: string,
  clienteId: string
): Promise<{ inseridas: number; erro?: string }> {
  // Busca etapas ativas do cliente
  const { data: configs, error: cfgErr } = await supabase
    .from('licitacao_etapas_config')
    .select('etapa_codigo')
    .eq('cliente_id', clienteId)
    .eq('ativo', true)
    .order('ordem');

  if (cfgError || !configs || configs.length === 0) {
    return {
      inseridas: 0,
      erro: cfgError
        ? `Cliente ${clienteId}: ${cfgError.message}`
        : 'Cliente sem etapas configuradas',
    };
  }

  const codigos = (configs as any[]).map((c: any) => c.etapa_codigo);

  // Verifica quais já existem para esta licitação
  const { data: existentes } = await supabase
    .from('licitacao_etapa_execucao')
    .select('etapa_codigo')
    .eq('licitacao_id', licitacaoId);

  const existentesCodigos = new Set((existentes || []).map((r: any) => r.etapa_codigo));

  const faltantes = codigos.filter((codigo) => !existentesCodigos.has(codigo));

  if (faltantes.length === 0) {
    return { inseridas: 0, erro: undefined };
  }

  // Tenta primeiro via RPC (mais limpo, respeita triggers)
  try {
    const { error: rpcErr } = await supabase.rpc('inicializar_etapas_licitacao', {
      p_licitacao_id: licitacaoId,
      p_cliente_id: clienteId,
    });

    if (!rpcErr) {
      return { inseridas: faltantes.length, erro: undefined };
    }

    // RPC falhou (função pode não existir). Tenta insert direto.
    console.warn('RPC inicializar_etapas_licitacao falhou, tentando insert direto:', rpcErr);
  } catch (e) {
    console.warn('RPC inicializar_etapas_licitacao indisponível:', e);
  }

  // Fallback: insert direto
  const { error: insErr } = await supabase
    .from('licitacao_etapa_execucao')
    .insert(
      faltantes.map((codigo) => ({
        licitacao_id: licitacaoId,
        etapa_codigo: codigo,
        status: 'nao_iniciada',
      }))
    );

    if (insErr) {
      return { inseridas: 0, erro: insErr.message };
    }

    return { inseridas: faltantes.length, erro: undefined };
  }
}

/**
 * Aplica a configuração de etapas para várias licitações de uma vez.
 */
export async function aplicarCenariosPorEmpresa(
  licitacoes: Array<{ id: string; cliente_id: string | null }>
): Promise<RelatorioPopulacao> {
  const relatorio: RelatorioPopulacao = {
    licitacoes: licitacoes.length,
    statusFinal: {},
    certificacoes: 0,
    certificadosVencidas: 0,
    erros: [],
  };

  // Agrupa licitações por cliente para buscar config de cada cliente apenas uma vez
  const porCliente = new Map<string, Array<{ id: string; cliente_id: string | null }>>();
  for (const lic of licitacoes) {
    if (!lic.cliente_id) {
      relatorio.erros.push(`Licitação ${lic.id} não tem cliente_id`);
      continue;
    }

    if (!porCliente.has(lic.cliente_id)) {
      porCliente.set(lic.cliente_id, []);
    }
    porCliente.get(lic.cliente_id)!.push(lic);
  }

  for (const [clienteId, licitacoesDoCliente] of porCliente) {
    // Busca etapas ativas do cliente
    const { data: cfg, error: cfgErr } = await supabase
      .from('licitacao_etapas_config')
      .select('etapa_codigo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .order('ordem');

    if (cfgError) {
      relatorio.erros.push(`Cliente ${clienteId}: ${cfgErr.message}`);
      continue;
    }

    const codigos = (cfg || []).map((c: any) => c.etapa_codigo);

    for (const lic of licitacoesDoCliente) {
      // Verifica quais etapas já existem para esta licitação
      const { data: existentes } = await supabase
        .from('licitacao_etapa_execucao')
        .select('etapa_codigo')
        .eq('licitacao_id', lic.id);

      const existentesCodigos = new Set((existentes || []).map((r: any) => r.etapa_codigo));

      // Filtra apenas as que faltam
      const faltantes = codigos.filter((c) => !existentesCodigos.has(c));

      if (faltantes.length === 0) {
        // Todas as etapas já existem
        for (const c of codigos) {
          relatorio.statusFinal[c] = (relatorio.statusFinal[c] || 0) + 1;
        }
        continue;
      }

      // Tenta via RPC primeiro
      try {
        await supabase.rpc('inicializar_etapas_licitacao', {
          p_licitacao_id: lic.id,
          p_cliente_id: clienteId,
        });
        relatorio.atualizadas += faltantes.length;
        continue;
      } catch (rpcErr) {
        // RPC falhou (função pode não existir), tenta insert direto
        const { error: insErr } = await supabase
          .from('licitacao_etapa_execucao')
          .insert(
            faltantes.map((codigo) => ({
              licitacao_id: lic.id,
              etapa_codigo: codigo,
              status: 'nao_iniciada',
            }))
          );

        if (insErr) {
          relatorio.erros.push(
            `Licitação ${lic.id}: ${insErr.message}`
          );
        } else {
          relatorio.atualizadas += faltantes.length;
        }
      }
    }
  }

  return relatorio;
}
