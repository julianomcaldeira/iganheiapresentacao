/**
 * Aplica a configuração da base de demonstração.
 *
 * Pipeline:
 * 1. (opcional) vincula as licitações às empresas do cliente;
 * 2. (opcional) gera as certidões de cada empresa;
 * 3. (opcional) popula o processo licitatório (etapas, IA, peças);
 * 4. (opcional) aplica o cenário distinto por empresa;
 * 5. (opcional) replica a base de documentos;
 * 6. distribui as licitações nos status conforme as quantidades configuradas.
 */
import { supabase } from '@/integrations/supabase/client';
import { aplicarCenariosPorEmpresa } from '@/lib/cenariosEmpresa';
import { aplicarCenariosAClientes } from '@/lib/cenariosCliente';
import { garantirDocumentosDeTodosOsClientes } from '@/lib/garantirDocumentosLicitacao';
import { popularCertidoesEmpresas } from '@/lib/popularCertidoesEmpresas';
import { popularExemplosPendentes } from '@/lib/popularProcessoLicitatorio';
import { gravarStatusLicitacao } from '@/lib/statusLicitacao';
import { simularOrganizacaoBase, aplicarOrganizacaoBase } from '@/lib/organizarBaseLicitacoes';
import type { ConfigBaseDemo } from '@/lib/configBaseDemo';

export interface RelatorioBaseDemo {
  licitacoes: number;
  statusFinal: Record<string, number>;
  certidoes: number;
  certidoesVencidas: number;
  empresas: number;
  cenarios: number;
  documentos: number;
  etapas: number;
  erros: string[];
  duracaoMs: number;
}

/**
 * Distribui as licitações em exatamente N por status, de forma
 * determinística (embaralhamento por hash do id).
 */
export async function distribuirStatusPorQuantidade(
  porStatus: Record<string, number>
): Promise<{ ok: number; erros: string[]; distribuicao: Record<string, number> }> {
  const erros: string[] = [];
  const distribuicao: Record<string, number> = {};
  let ok = 0;

  const { data: licitacoes } = await supabase
    .from('licitacoes')
    .select('id, numero, status')
    .order('numero', { ascending: true });

  const lista = (licitacoes || []) as any[];
  if (lista.length === 0) {
    return { ok: 0, erros: ['nenhuma licitação encontrada'], distribuicao };
  }

  // embaralhamento determinístico (ordena por hash do id)
  const hash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const embaralhadas = [...lista].sort((a, b) => hash(a.id) - hash(b.id));

  // monta a lista de status desejada (N por status)
  const desejados: string[] = [];
  for (const [status, qtd] of Object.entries(porStatus)) {
    for (let i = 0; i < (Number(qtd) || 0); i++) desejados.push(status);
  }
  // se a configuração pede mais do que existe, completa com 'em_andamento'
  while (desejados.length < embaralhadas.length) desejados.push('em_andamento');
  // se pede menos, ignora o excedente
  desejados.length = Math.min(desejados.length, embaralhadas.length);

  for (let i = 0; i < embaralhadas.length; i++) {
    const lic = embaralhadas[i];
    const status = desejados[i];
    const res = await gravarStatusLicitacao(lic.id, status);
    if (res.ok) {
      ok++;
      const valor = res.valor || status;
      distribuicao[valor] = (distribuicao[valor] || 0) + 1;
    } else {
      erros.push(`${lic.numero}: ${res.erro}`);
    }
  }

  return { ok, erros, distribuicao };
}

export async function aplicarBaseDemo(
  config: ConfigBaseDemo,
  userId?: string
): Promise<RelatorioBaseDemo> {
  const inicio = Date.now();
  const relatorio: RelatorioBaseDemo = {
    licitacoes: 0,
    statusFinal: {},
    certidoes: 0,
    certidoesVencidas: 0,
    empresas: 0,
    cenarios: 0,
    documentos: 0,
    etapas: 0,
    erros: [],
    duracaoMs: 0,
  };

  // 1. vinculação de empresas (distribui as licitações entre os clientes)
  if (config.vincularEmpresas) {
    const sim = await simularOrganizacaoBase();
    const org = await aplicarOrganizacaoBase(sim);
    relatorio.erros.push(...org.erros);
  }

  // 2. certidões por empresa
  if (config.certidoesPorEmpresa > 0) {
    const cert = await popularCertidoesEmpresas({
      porEmpresa: config.certidoesPorEmpresa,
      incluirVencida: config.incluirCertidaoVencida,
    });
    relatorio.certidoes = cert.certidoes;
    relatorio.certidoesVencidas = cert.vencidas;
    relatorio.empresas = cert.empresas;
    relatorio.erros.push(...cert.erros);
  }

  // 3. processo licitatório
  if (config.popularProcesso) {
    const { data: lics } = await supabase
      .from('licitacoes')
      .select('id, numero')
      .order('numero', { ascending: true });
    const proc = await popularExemplosPendentes(
      (lics || []).map((l: any) => ({ id: l.id, numero: l.numero })),
      userId
    );
    relatorio.etapas = proc.etapas;
    relatorio.erros.push(...proc.erros);
  }

  // 4. cenários por cliente
  if (config.cenariosPorCliente) {
    const cen = await aplicarCenariosAClientes();
    relatorio.erros.push(...cen.erros);
  }

  // 5. cenários por empresa
  if (config.cenariosPorEmpresa) {
    const cen = await aplicarCenariosPorEmpresa({
      perfisPorEmpresa: config.perfisPorEmpresa,
    });
    relatorio.cenarios = cen.licitacoes;
    relatorio.erros.push(...cen.erros);
  }

  // 6. base de documentos
  if (config.sincronizarDocumentos) {
    const docs = await garantirDocumentosDeTodosOsClientes();
    relatorio.documentos = docs.documentosInseridos;
    relatorio.erros.push(...docs.erros);
  }

  // 7. status conforme as quantidades configuradas (por último)
  const dist = await distribuirStatusPorQuantidade(config.porStatus);
  relatorio.statusFinal = dist.distribuicao;
  relatorio.licitacoes = dist.ok;
  relatorio.erros.push(...dist.erros);

  relatorio.duracaoMs = Date.now() - inicio;
  return relatorio;
}
