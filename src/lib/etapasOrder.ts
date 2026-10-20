/**
 * Ordem canônica da esteira de licitação:
 * Análise IA -> Aprovações -> Peças Jurídicas -> ...
 *
 * A ordem exibida na esteira vem do banco (licitacao_etapas_config.ordem).
 * Como a migration de reordenação pode ainda não ter sido aplicada no
 * ambiente remoto, esta camada normaliza APENAS a exibição: se a ordem
 * gravada for exatamente a padrão legada, mostramos na ordem canônica.
 *
 * - Nenhum dado é alterado (zero escrita no banco).
 * - Ordens personalizadas pelo cliente (diferentes da legada) são respeitadas.
 * - Etapas personalizadas (custom_*) mantêm sua posição relativa.
 */

// Nova ordem padrão (Análise IA -> Aprovações -> Peças Jurídicas -> ...)
export const CANONICAL_ETAPA_ORDER: Record<string, number> = {
  analise_edital: 0,
  aprovacoes: 1,
  esclarecimento_impugnacao: 2,
  impugnacao_contrarrazao: 3,
  concorrentes: 4,
  preparacao_documentos: 5,
  produtos: 6,
  proposta: 7,
  tarefas: 8,
  disputa_pregao: 9,
  resultado: 10,
  contratos: 11,
  empenhos: 12,
};

// Ordem padrão legada (antes do ajuste: Aprovações vinha depois das peças)
const LEGACY_ETAPA_ORDER: Record<string, number> = {
  analise_edital: 0,
  esclarecimento_impugnacao: 1,
  impugnacao_contrarrazao: 2,
  aprovacoes: 3,
  concorrentes: 4,
  preparacao_documentos: 5,
  produtos: 6,
  proposta: 7,
  tarefas: 8,
  disputa_pregao: 9,
  resultado: 10,
  contratos: 11,
  empenhos: 12,
};

const isCustom = (codigo: string) => codigo.startsWith('custom_');

/**
 * Retorna true se a sequência de etapas do sistema (ignorando custom_* e a
 * ordem relativa das customs) corresponde exatamente ao padrão legado.
 */
export function isLegacySystemOrder(codigosEmOrdemExibida: string[]): boolean {
  const system = codigosEmOrdemExibida.filter((c) => !isCustom(c));
  if (system.length === 0) return false;
  const byLegacy = [...system].sort(
    (a, b) => (LEGACY_ETAPA_ORDER[a] ?? 999) - (LEGACY_ETAPA_ORDER[b] ?? 999)
  );
  return system.every((c, i) => c === byLegacy[i]);
}

function canonicalRank(codigo: string): number {
  return CANONICAL_ETAPA_ORDER[codigo] ?? 999;
}

/**
 * Ordena itens para exibição na esteira.
 * - Se a ordem gravada for a legada: etapas do sistema seguem a ordem
 *   canônica; etapas custom_* vão ao final mantendo a ordem relativa.
 * - Caso contrário (cliente personalizou): mantém a ordem gravada.
 */
export function sortEtapasForDisplay<T>(
  items: T[],
  getCodigo: (item: T) => string,
  getStoredOrdem: (item: T) => number
): T[] {
  const byStored = [...items].sort((a, b) => getStoredOrdem(a) - getStoredOrdem(b));
  if (!isLegacySystemOrder(byStored.map(getCodigo))) {
    return byStored;
  }
  const customs = byStored.filter((i) => isCustom(getCodigo(i)));
  const system = byStored.filter((i) => !isCustom(getCodigo(i)));
  system.sort((a, b) => canonicalRank(getCodigo(a)) - canonicalRank(getCodigo(b)));
  return [...system, ...customs];
}
