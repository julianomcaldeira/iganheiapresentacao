/**
 * Organiza a base: distribui as licitações existentes entre os clientes
 * cadastrados, de forma que a base de licitações represente cada cliente.
 *
 * Critérios:
 * 1. Cada cliente ativo recebe ao menos 1 licitação (quando há licitações
 *    suficientes), e o restante é distribuído de forma equilibrada.
 * 2. A distribuição prioriza o encaixe por palavras-chave: as palavras
 *    positivas do cliente (objeto + órgão da licitação) pesam mais, e as
 *    negativas penalizam.
 * 3. Para cada cliente que passa a ter licitações, garante a estrutura
 *    mínima: etapas ativas (licitacao_etapas_config), templates de
 *    declaração e ao menos uma empresa.
 *
 * Tudo é executado pelo frontend (admin), sem exigir migration.
 */
import { supabase } from '@/integrations/supabase/client';
import { gerarTemplatesDeclaracaoPadrao, type ContextoExemplo } from '@/lib/exemplosProcessoLicitatorio';
import { ensureEtapasInicializadas } from '@/lib/ensureEtapas';

/** Etapas padrão do cliente (mesma ordem configurada em Clientes → Etapas & Regras). */
export const ETAPAS_PADRAO_CLIENTE: Array<{ etapa_codigo: string; ordem: number }> = [
  { etapa_codigo: 'analise_edital', ordem: 1 },
  { etapa_codigo: 'esclarecimento_impugnacao', ordem: 2 },
  { etapa_codigo: 'aprovacoes', ordem: 3 },
  { etapa_codigo: 'preparacao_documentos', ordem: 4 },
  { etapa_codigo: 'proposta', ordem: 5 },
  { etapa_codigo: 'disputa_pregao', ordem: 6 },
  { etapa_codigo: 'resultado', ordem: 7 },
  { etapa_codigo: 'impugnacao_contrarrazao', ordem: 8 },
];

export interface ClienteOrganizacao {
  id: string;
  nome: string;
  palavras_positivas: string[];
  palavras_negativas: string[];
  licitacoesAtuais: number;
  alvo: number;
  licitacoesAtribuidas: string[];
  novas: boolean;
}

export interface SimulacaoOrganizacao {
  clientes: ClienteOrganizacao[];
  totalLicitacoes: number;
  mudancas: Array<{
    licitacaoId: string;
    numero: string;
    objeto: string;
    clienteAtual: string | null;
    clienteNovo: string;
    score: number;
  }>;
}

export interface RelatorioOrganizacao extends SimulacaoOrganizacao {
  aplicadas: number;
  etapasCriadas: string[];
  templatesCriados: string[];
  empresasCriadas: string[];
  erros: string[];
}

interface LicitacaoRow {
  id: string;
  cliente_id: string | null;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string | null;
  portal: string | null;
  valor_estimado: number | null;
  status: string | null;
}

function normalizar(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Pontua o encaixe da licitação com o cliente. */
function pontuar(lic: LicitacaoRow, pos: string[], neg: string[]): number {
  const texto = normalizar(`${lic.objeto} ${lic.orgao} ${lic.modalidade ?? ''}`);
  let score = 0;
  for (const p of pos) {
    const t = normalizar(p).trim();
    if (t.length >= 3 && texto.includes(t)) score += 10;
  }
  for (const n of neg) {
    const t = normalizar(n).trim();
    if (t.length >= 3 && texto.includes(t)) score -= 15;
  }
  return score;
}

/** Calcula a distribuição sem gravar nada. */
export async function simularOrganizacaoBase(): Promise<SimulacaoOrganizacao> {
  const [cliRes, licRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, palavras_positivas, palavras_negativas')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('licitacoes')
      .select('id, cliente_id, numero, objeto, orgao, modalidade, portal, valor_estimado, status')
      .order('created_at', { ascending: true }),
  ]);

  const clientes = (cliRes.data || []) as any[];
  const licitacoes = (licRes.data || []) as LicitacaoRow[];

  const nomeCliente = new Map<string, string>(clientes.map((c: any) => [c.id, c.nome as string]));
  const atuais = new Map<string, number>();
  licitacoes.forEach((l) => {
    if (l.cliente_id) atuais.set(l.cliente_id, (atuais.get(l.cliente_id) || 0) + 1);
  });

  // Quota: distribui as licitações de forma equilibrada, com no mínimo 1 por cliente
  const nCli = clientes.length;
  const nLic = licitacoes.length;
  const base = nCli > 0 ? Math.floor(nLic / nCli) : 0;
  const resto = nCli > 0 ? nLic % nCli : 0;
  const alvoPorCliente = new Map<string, number>();
  clientes.forEach((c: any, i) => {
    const extra = i < resto ? 1 : 0;
    alvoPorCliente.set(c.id, Math.min(base + extra, nLic));
  });
  // Se não há licitações suficientes para 1 por cliente, prioriza quem já tem
  if (nLic < nCli) {
    const ordenados = [...clientes].sort(
      (a: any, b: any) => (atuais.get(b.id) || 0) - (atuais.get(a.id) || 0)
    );
    ordenados.forEach((c: any, i) => alvoPorCliente.set(c.id, i < nLic ? 1 : 0));
  }

  // Pontua cada (cliente, licitação)
  const pontuacoes: Array<{ cliId: string; licId: string; score: number }> = [];
  for (const c of clientes) {
    const pos = (c.palavras_positivas || []) as string[];
    const neg = (c.palavras_negativas || []) as string[];
    for (const l of licitacoes) {
      pontuacoes.push({ cliId: c.id, licId: l.id, score: pontuar(l, pos, neg) });
    }
  }

  // Atribuição gulosa: melhor encaixe primeiro, respeitando a quota
  const atribuidasPorCliente = new Map<string, string[]>();
  const licPorId = new Map(licitacoes.map((l) => [l.id, l]));
  const usadas = new Set<string>();
  const ordenadas = [...pontuacoes].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.cliId.localeCompare(b.cliId);
  });
  for (const p of ordenadas) {
    if (usadas.has(p.licId)) continue;
    const atual = atribuidasPorCliente.get(p.cliId) || [];
    if (atual.length >= (alvoPorCliente.get(p.cliId) || 0)) continue;
    atual.push(p.licId);
    atribuidasPorCliente.set(p.cliId, atual);
    usadas.add(p.licId);
  }
  // Sobras: preenche as cotas que ficaram vagas
  for (const c of clientes) {
    const atual = atribuidasPorCliente.get(c.id) || [];
    const cota = alvoPorCliente.get(c.id) || 0;
    if (atual.length >= cota) continue;
    for (const l of licitacoes) {
      if (usadas.has(l.id)) continue;
      atual.push(l.id);
      usadas.add(l.id);
      atribuidasPorCliente.set(c.id, atual);
      if (atual.length >= cota) break;
    }
  }

  const clientesOut: ClienteOrganizacao[] = clientes.map((c: any) => {
    const lics = atribuidasPorCliente.get(c.id) || [];
    return {
      id: c.id,
      nome: c.nome as string,
      palavras_positivas: (c.palavras_positivas || []) as string[],
      palavras_negativas: (c.palavras_negativas || []) as string[],
      licitacoesAtuais: atuais.get(c.id) || 0,
      alvo: lics.length,
      licitacoesAtribuidas: lics,
      novas: (atuais.get(c.id) || 0) === 0 && lics.length > 0,
    };
  });

  const mudancas: SimulacaoOrganizacao['mudancas'] = [];
  for (const c of clientesOut) {
    for (const licId of c.licitacoesAtribuidas) {
      const lic = licPorId.get(licId);
      if (!lic) continue;
      if (lic.cliente_id === c.id) continue;
      mudancas.push({
        licitacaoId: lic.id,
        numero: lic.numero,
        objeto: lic.objeto,
        clienteAtual: lic.cliente_id ? nomeCliente.get(lic.cliente_id) ?? null : null,
        clienteNovo: c.nome,
        score: 0,
      });
    }
  }

  return { clientes: clientesOut, totalLicitacoes: licitacoes.length, mudancas };
}

/**
 * Ajusta a esteira da licitação às etapas ativas do novo cliente:
 * cria as que faltam e remove as que não pertencem a ele.
 */
async function sincronizarEtapasDaLicitacao(
  licitacaoId: string,
  clienteId: string,
  relatorio: RelatorioOrganizacao
) {
  try {
    await ensureEtapasInicializadas(licitacaoId, clienteId);
    const { data: cfgs } = await supabase
      .from('licitacao_etapas_config')
      .select('etapa_codigo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);
    const permitidos = new Set(((cfgs || []) as any[]).map((c) => c.etapa_codigo as string));

    const { data: exec } = await supabase
      .from('licitacao_etapa_execucao')
      .select('id, etapa_codigo')
      .eq('licitacao_id', licitacaoId);
    const remover = ((exec || []) as any[])
      .filter((e) => !permitidos.has(e.etapa_codigo))
      .map((e) => e.id);
    if (remover.length > 0) {
      const { error } = await supabase
        .from('licitacao_etapa_execucao')
        .delete()
        .in('id', remover);
      if (error) relatorio.erros.push(`limpar etapas: ${error.message}`);
    }
  } catch (e: any) {
    relatorio.erros.push(`sincronizar etapas: ${e?.message || e}`);
  }
}

/**
 * Vincula a licitação ao workflow do novo cliente e recria as etapas
 * legadas (licitacao_etapas), usadas no cálculo de "Progresso".
 */
async function sincronizarWorkflowLegado(
  licitacaoId: string,
  clienteId: string,
  relatorio: RelatorioOrganizacao
) {
  try {
    const { data: workflows } = await supabase
      .from('licitacao_workflows')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .order('created_at', { ascending: true })
      .limit(1);
    if (!workflows || workflows.length === 0) return;

    const workflowId = workflows[0].id;
    const { error } = await supabase
      .from('licitacoes')
      .update({ workflow_id: workflowId })
      .eq('id', licitacaoId);
    if (error) {
      relatorio.erros.push(`workflow ${licitacaoId}: ${error.message}`);
      return;
    }

    const { data: steps } = await supabase
      .from('workflow_etapas')
      .select('id')
      .eq('workflow_id', workflowId)
      .order('ordem');

    await supabase.from('licitacao_etapas').delete().eq('licitacao_id', licitacaoId);
    if (steps && steps.length > 0) {
      const { error: insErr } = await supabase.from('licitacao_etapas').insert(
        steps.map((s: any) => ({
          licitacao_id: licitacaoId,
          etapa_id: s.id,
          status: 'pendente',
        }))
      );
      if (insErr) relatorio.erros.push(`etapas legadas: ${insErr.message}`);
    }
  } catch (e: any) {
    relatorio.erros.push(`sincronizar workflow: ${e?.message || e}`);
  }
}

/** Aplica a distribuição e garante a estrutura mínima de cada cliente. */
export async function aplicarOrganizacaoBase(
  simulacao: SimulacaoOrganizacao
): Promise<RelatorioOrganizacao> {
  const relatorio: RelatorioOrganizacao = {
    ...simulacao,
    aplicadas: 0,
    etapasCriadas: [],
    templatesCriados: [],
    empresasCriadas: [],
    erros: [],
  };

  // 1. Reatribui as licitações
  for (const m of simulacao.mudancas) {
    const cliente = simulacao.clientes.find((c) => c.nome === m.clienteNovo);
    if (!cliente) continue;
    const { error } = await supabase
      .from('licitacoes')
      .update({ cliente_id: cliente.id })
      .eq('id', m.licitacaoId);
    if (error) {
      relatorio.erros.push(`reatribuir ${m.numero}: ${error.message}`);
    } else {
      relatorio.aplicadas++;
      // a esteira passa a refletir as etapas do novo cliente
      await sincronizarEtapasDaLicitacao(m.licitacaoId, cliente.id, relatorio);
      // o workflow legado (que alimenta o "Progresso" do detalhe) acompanha o cliente
      await sincronizarWorkflowLegado(m.licitacaoId, cliente.id, relatorio);
    }
  }

  // 2. Garante a estrutura mínima de cada cliente com licitações
  for (const cliente of simulacao.clientes) {
    if (cliente.licitacoesAtribuidas.length === 0) continue;

    // 2.1 etapas ativas
    const { data: etapas } = await supabase
      .from('licitacao_etapas_config')
      .select('id')
      .eq('cliente_id', cliente.id);
    if (!etapas || etapas.length === 0) {
      const { error } = await supabase.from('licitacao_etapas_config').upsert(
        ETAPAS_PADRAO_CLIENTE.map((e) => ({
          cliente_id: cliente.id,
          etapa_codigo: e.etapa_codigo,
          ativo: true,
          ordem: e.ordem,
        })),
        { onConflict: 'cliente_id,etapa_codigo', ignoreDuplicates: true }
      );
      if (error) relatorio.erros.push(`etapas ${cliente.nome}: ${error.message}`);
      else relatorio.etapasCriadas.push(cliente.nome);
    }

    // 2.2 templates de declaração
    const { data: templates } = await supabase
      .from('declaracoes_templates')
      .select('id')
      .eq('cliente_id', cliente.id)
      .eq('ativo', true);
    if (!templates || templates.length === 0) {
      const lic = await supabase
        .from('licitacoes')
        .select('numero, objeto, orgao, modalidade, valor_estimado')
        .eq('id', cliente.licitacoesAtribuidas[0])
        .single();
      const ctx: ContextoExemplo = {
        licitacaoId: cliente.licitacoesAtribuidas[0],
        numero: lic.data?.numero || '000/0000',
        objeto: lic.data?.objeto || 'Objeto da licitação',
        orgao: lic.data?.orgao || 'Órgão Licitante',
        modalidade: lic.data?.modalidade || 'Pregão Eletrônico',
        portal: '',
        valorEstimado: Number(lic.data?.valor_estimado || 0),
        clienteNome: cliente.nome,
        ano: new Date().getFullYear(),
      };
      const { error } = await supabase.from('declaracoes_templates').insert(
        gerarTemplatesDeclaracaoPadrao(ctx).map((t) => ({
          ...t,
          cliente_id: cliente.id,
          ativo: true,
        }))
      );
      if (error) relatorio.erros.push(`templates ${cliente.nome}: ${error.message}`);
      else relatorio.templatesCriados.push(cliente.nome);
    }

    // 2.3 ao menos uma empresa
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id')
      .eq('cliente_id', cliente.id);
    if (!empresas || empresas.length === 0) {
      const { error } = await supabase.from('empresas').insert({
        cliente_id: cliente.id,
        razao_social: `${cliente.nome} LTDA`,
        nome_fantasia: cliente.nome,
        ativo: true,
      });
      if (error) relatorio.erros.push(`empresa ${cliente.nome}: ${error.message}`);
      else relatorio.empresasCriadas.push(cliente.nome);
    }
  }

  return relatorio;
}
