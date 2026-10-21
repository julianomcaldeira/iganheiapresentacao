/**
 * Garante que as licitações da base reflitam a listagem de documentos nas
 * seções controladas pelo i-Ganhei:
 *
 *   cnd        -> CNDs (Certidões Negativas)
 *   atestado   -> Atestados de Capacidade Técnica
 *   declaracao -> Declarações
 *   outro      -> Outros Documentos
 *
 * Duas ações, ambas idempotentes e não destrutivas:
 *
 * 1. Se a licitação NÃO tem nenhum documento no checklist, semeia a listagem
 *    de exemplo (19 documentos nas 4 seções), usando os templates de
 *    declaração do próprio cliente quando existirem.
 *
 * 2. Se alichtão tem documentos gravados com categoria fora das 4 seções
 *    (ex.: 'fiscal', 'tecnico'), reclassifica pelo nome do documento
 *    (CND/Certidão -> cnd, Atestado -> atestado, Declaração -> declaracao,
 *    resto -> outro), para que apareçam na seção correta.
 */
import { supabase } from '@/integrations/supabase/client';
import { gerarDocumentosChecklist, type ContextoExemplo } from '@/lib/exemplosProcessoLicitatorio';

export const SECOES_DOCUMENTOS = ['cnd', 'atestado', 'declaracao', 'outro'] as const;
export type SecaoDocumento = (typeof SECOES_DOCUMENTOS)[number];

export interface RelatorioDocumentos {
  licitacoesSemDocumentos: string[];
  documentosInseridos: number;
  documentosReclassificados: number;
  etapasAtualizadas: string[];
  erros: string[];
}

/** Descobre a seção a partir do nome do documento. */
export function inferirSecaoDocumento(nome: string): SecaoDocumento {
  const n = (nome || '').toLowerCase();
  if (/atestado/.test(n)) return 'atestado';
  if (/declara[çc][ãa]o/.test(n)) return 'declaracao';
  if (/\bcnd\b/.test(n) || /certid[ãa]o/.test(n) || /caepf|crne|certid/.test(n)) return 'cnd';
  if (/procur|identidade|inscri[çc][ãa]o|anvisa|registro|comprovante/.test(n)) return 'outro';
  return 'outro';
}

export async function garantirDocumentosLicitacao(
  licitacoes: Array<{ id: string; cliente_id: string | null }>
): Promise<RelatorioDocumentos> {
  const relatorio: RelatorioDocumentos = {
    licitacoesSemDocumentos: [],
    documentosInseridos: 0,
    documentosReclassificados: 0,
    etapasAtualizadas: [],
    erros: [],
  };
  if (licitacoes.length === 0) return relatorio;

  const licIds = licitacoes.map((l) => l.id);
  const clienteIds = Array.from(
    new Set(licitacoes.map((l) => l.cliente_id).filter(Boolean) as string[])
  );

  const [docsRes, licRes, templatesRes, clientesRes] = await Promise.all([
    supabase
      .from('licitacao_documentos_checklist')
      .select('id, licitacao_id, nome, categoria, status')
      .in('licitacao_id', licIds),
    supabase
      .from('licitacoes')
      .select('id, cliente_id, numero, objeto, orgao, modalidade, portal, valor_estimado')
      .in('id', licIds),
    clienteIds.length > 0
      ? supabase
          .from('declaracoes_templates')
          .select('cliente_id, nome')
          .in('cliente_id', clienteIds)
          .eq('ativo', true)
      : Promise.resolve({ data: [], error: null } as any),
    clienteIds.length > 0
      ? supabase.from('clientes').select('id, nome').in('id', clienteIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const docsPorLic = new Map<string, any[]>();
  (docsRes.data || []).forEach((d: any) => {
    if (!docsPorLic.has(d.licitacao_id)) docsPorLic.set(d.licitacao_id, []);
    docsPorLic.get(d.licitacao_id)!.push(d);
  });

  const licPorId = new Map<string, any>((licRes.data || []).map((l: any) => [l.id, l]));
  const templatesPorCliente = new Map<string, string[]>();
  (templatesRes.data || []).forEach((t: any) => {
    if (!templatesPorCliente.has(t.cliente_id)) templatesPorCliente.set(t.cliente_id, []);
    templatesPorCliente.get(t.cliente_id)!.push(t.nome);
  });
  const nomeCliente = new Map<string, string>(
    (clientesRes.data || []).map((c: any) => [c.id, c.nome as string])
  );

  for (const lic of licitacoes) {
    const dadosLic = licPorId.get(lic.id);
    if (!dadosLic) continue;
    const existentes = docsPorLic.get(lic.id) || [];

    // ---- 2. Reclassifica documentos com categoria fora das seções ----
    for (const doc of existentes) {
      if (!SECOES_DOCUMENTOS.includes(doc.categoria)) {
        const novaSecao = inferirSecaoDocumento(doc.nome);
        const { error } = await supabase
          .from('licitacao_documentos_checklist')
          .update({ categoria: novaSecao })
          .eq('id', doc.id);
        if (error) relatorio.erros.push(`reclassificar ${doc.nome}: ${error.message}`);
        else relatorio.documentosReclassificados++;
      }
    }

    // ---- 1. Semeia a listagem quando a licitação não tem documentos ----
    if (existentes.length > 0) continue;

    const ctx: ContextoExemplo = {
      licitacaoId: lic.id,
      numero: dadosLic.numero,
      objeto: dadosLic.objeto,
      orgao: dadosLic.orgao,
      modalidade: dadosLic.modalidade || 'Pregão Eletrônico',
      portal: dadosLic.portal || '',
      valorEstimado: Number(dadosLic.valor_estimado || 0),
      clienteNome: nomeCliente.get(lic.cliente_id || '') || 'Licitante',
      ano: new Date().getFullYear(),
    };

    const templates = templatesPorCliente.get(lic.cliente_id || '') || [];
    const docs = gerarDocumentosChecklist(ctx, templates);
    const rows = docs.map((d) => ({
      licitacao_id: lic.id,
      categoria: d.categoria,
      nome: d.nome,
      descricao: d.descricao,
      status: d.status,
      obrigatorio: d.obrigatorio,
      data_validade: d.data_validade,
      observacoes: d.observacoes,
    }));

    const { error } = await supabase.from('licitacao_documentos_checklist').insert(rows);
    if (error) {
      relatorio.erros.push(`licitacao ${dadosLic.numero}: ${error.message}`);
    } else {
      relatorio.documentosInseridos += rows.length;
      relatorio.licitacoesSemDocumentos.push(lic.id);
      // registra para o cálculo do status da etapa
      docsPorLic.set(lic.id, rows.map((r) => ({ ...r, obrigatorio: r.obrigatorio })));
    }
  }

  // ---- 3. Reflete o estado dos documentos na etapa "Preparação de Documentos" ----
  await atualizarEtapaDocumentos(licIds, docsPorLic, relatorio);

  return relatorio;
}

/**
 * A etapa "preparacao_documentos" passa a refletir a situação real da
 * listagem: 'documentos_analisados' quando todos os obrigatórios estão
 * concluídos, 'em_analise' enquanto houver pendência.
 */
async function atualizarEtapaDocumentos(
  licIds: string[],
  docsPorLic: Map<string, any[]>,
  relatorio: RelatorioDocumentos
) {
  const { data: etapas } = await supabase
    .from('licitacao_etapa_execucao')
    .select('id, licitacao_id, status')
    .eq('etapa_codigo', 'preparacao_documentos')
    .in('licitacao_id', licIds);

  for (const etapa of etapas || []) {
    if (etapa.status !== 'nao_iniciada') continue;
    const docs = docsPorLic.get(etapa.licitacao_id) || [];
    if (docs.length === 0) continue;

    const obrigatorios = docs.filter((d: any) => d.obrigatorio);
    const pendentes = obrigatorios.filter((d: any) => d.status !== 'concluido');
    const agora = new Date().toISOString();
    const novoStatus = pendentes.length === 0 ? 'documentos_analisados' : 'em_analise';

    const { error } = await supabase
      .from('licitacao_etapa_execucao')
      .update({
        status: novoStatus,
        data_inicio: agora,
        data_conclusao: novoStatus === 'documentos_analisados' ? agora : null,
        observacoes:
          novoStatus === 'documentos_analisados'
            ? `${docs.length} documento(s) conferidos — todos os obrigatórios concluídos.`
            : `${docs.length} documento(s) na listagem — ${pendentes.length} obrigatório(s) pendente(s).`,
      })
      .eq('id', etapa.id);

    if (error) relatorio.erros.push(`etapa documentos: ${error.message}`);
    else relatorio.etapasAtualizadas.push(etapa.licitacao_id);
  }
}
