export interface DocumentoBaseItem {
  categoria: SecaoDocumento;
  nome: string;
  descricao: string;
  status: string;
  obrigatorio: boolean;
  data_validade: string | null;
  observacoes: string | null;
}

/**
 * Calcula a base de documentos de um cliente SEM gravar nada.
 *
 * Usada pela aba Documentos para garantir que as 4 seções apareçam
 * preenchidas mesmo quando a gravação no banco é bloqueada por RLS.
 */
export async function buscarBaseDocumentosDoCliente(
  clienteId: string
): Promise<DocumentoBaseItem[]> {
  if (!clienteId) return [];

  const [licRes, empRes, cliRes, tplRes] = await Promise.all([
    supabase
      .from('licitacoes')
      .select('id, numero, objeto, orgao, modalidade, portal, valor_estimado')
      .eq('cliente_id', clienteId),
    supabase
      .from('empresas')
      .select('id, cliente_id, razao_social, cnpj')
      .eq('cliente_id', clienteId),
    supabase.from('clientes').select('id, nome').eq('id', clienteId).maybeSingle(),
    supabase
      .from('declaracoes_templates')
      .select('id, nome, titulo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true),
  ]);

  const licitacoes = (licRes.data || []) as any[];
  const empresas = (empRes.data || []) as any[];
  const licIds = licitacoes.map((l) => l.id);

  const [docsRes, idocRes] = await Promise.all([
    licIds.length > 0
      ? supabase
          .from('licitacao_documentos_checklist')
          .select('id, licitacao_id, nome, descricao, categoria, status, obrigatorio, data_validade, observacoes')
          .in('licitacao_id', licIds)
      : Promise.resolve({ data: [], error: null } as any),
    empresas.length > 0
      ? supabase
          .from('idocumentei_documentos')
          .select('id, empresa_id, tipo, nome, status, data_validade')
          .in('empresa_id', empresas.map((e) => e.id))
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const base = new Map<string, DocumentoBaseItem>();

  // (a) documentos já existentes nas licitações do cliente
  for (const doc of (docsRes.data || []) as any[]) {
    const categoria: SecaoDocumento = SECOES_DOCUMENTOS.includes(doc.categoria)
      ? doc.categoria
      : inferirSecaoDocumento(doc.nome);
    const k = chave(doc.nome);
    const atual = base.get(k);
    if (!atual || (atual.status !== 'concluido' && doc.status === 'concluido')) {
      base.set(k, {
        categoria,
        nome: doc.nome,
        descricao: doc.descricao || 'Documento da base de habilitação do cliente.',
        status: doc.status || 'pendente',
        obrigatorio: doc.obrigatorio ?? true,
        data_validade: doc.data_validade,
        observacoes: doc.observacoes,
      });
    }
  }

  // (b) CNDs do i-Documentei
  for (const doc of (idocRes.data || []) as any[]) {
    const emp = empresas.find((e) => e.id === doc.empresa_id);
    if (!emp) continue;
    const nome = `${doc.nome}${emp.razao_social ? ` — ${emp.razao_social}` : ''}`;
    const k = chave(nome);
    if (base.has(k)) continue;
    base.set(k, {
      categoria: 'cnd',
      nome,
      descricao: `Certidão obtida via i-Documentei (${doc.tipo || 'CND'}).`,
      status: doc.status === 'vencido' ? 'pendente' : 'concluido',
      obrigatorio: true,
      data_validade: doc.data_validade,
      observacoes: 'Disponível na base do cliente (i-Documentei).',
    });
  }

  // (c) templates de declaração do cliente
  for (const t of (tplRes.data || []) as any[]) {
    const nome = t.nome || t.titulo;
    if (!nome) continue;
    const k = chave(nome);
    if (base.has(k)) continue;
    base.set(k, {
      categoria: 'declaracao',
      nome,
      descricao: 'Declaração modelada a partir do template do cliente.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: hojeMais(90),
      observacoes: 'Gerada a partir do template do cliente.',
    });
  }

  // (d) completa as seções vazias com a listagem padrão do perfil
  const secoesPresentes = new Set(Array.from(base.values()).map((d) => d.categoria));
  if (!SECOES_DOCUMENTOS.every((s) => secoesPresentes.has(s))) {
    const lic = licitacoes[0];
    const nomeCliente = (cliRes.data as any)?.nome || 'Licitante';
    const ctx: ContextoExemplo = {
      licitacaoId: lic?.id || clienteId,
      numero: lic?.numero || '000/0000',
      objeto: lic?.objeto || 'Objeto da licitação',
      orgao: lic?.orgao || 'Órgão Licitante',
      modalidade: lic?.modalidade || 'Pregão Eletrônico',
      portal: lic?.portal || '',
      valorEstimado: Number(lic?.valor_estimado || 0),
      clienteNome: nomeCliente,
      ano: new Date().getFullYear(),
    };
    const padrao = gerarDocumentosChecklist(
      ctx,
        [],
      docsExtrasDoPerfil(inferirPerfil({ nome: nomeCliente }))
    );
    for (const doc of padrao) {
      if (secoesPresentes.has(doc.categoria)) continue;
      const k = chave(doc.nome);
      if (base.has(k)) continue;
      base.set(k, {
        categoria: doc.categoria as SecaoDocumento,
        nome: doc.nome,
        descricao: doc.descricao,
        status: doc.status,
        obrigatorio: doc.obrigatorio,
        data_validade: doc.data_validade,
        observacoes: doc.observacoes,
      });
    }
  }

  return Array.from(base.values());
}

/**
 * Garante a listagem de documentos nas seções controladas pelo
 * i-Ganhei, para TODOS os clientes da plataforma:
 *
 *   cnd        -> CNDs (Certidões Negativas)
 *   atestado   -> Atestados de Capacidade Técnica
 *   declaracao -> Declarações
 *   outro      -> Outros Documentos
 *
 * Como funciona, por CLIENTE:
 *
 * 1. Monta a "base" de documentos do cliente unindo 3 fontes:
 *    a) documentos já existentes nas licitações desse cliente;
 *    b) CNDs do i-Documentei (idocumentei_documentos das empresas);
 *    c) templates de declaração do cliente (declaracoes_templates).
 *
 * 2. Garante que as 4 seções existam: se alguma seção estiver vazia na
 *    base, completa com a listagem padrão de exemplo daquela seção.
 *
 * 3. Replica a base em TODAS as licitações do cliente (insere só o que
 *    falta, por nome) e reclassifica documentos com categoria inválida.
 *
 * 4. A etapa "preparacao_documentos" passa a refletir a situação real.
 *
 * Tudo é idempotente e não destrutivo: nada é apagado.
 */
import { supabase } from '@/integrations/supabase/client';
import { gerarDocumentosChecklist, type ContextoExemplo } from '@/lib/exemplosProcessoLicitatorio';
import { inferirPerfil, docsExtrasDoPerfil } from '@/lib/cenariosCliente';

export const SECOES_DOCUMENTOS = ['cnd', 'atestado', 'declaracao', 'outro'] as const;
export type SecaoDocumento = (typeof SECOES_DOCUMENTOS)[number];

export interface RelatorioDocumentos {
  clientes: number;
  licitacoes: number;
  basePorCliente: Record<string, number>;
  documentosInseridos: number;
  documentosReclassificados: number;
  etapasAtualizadas: number;
  erros: string[];
}

interface DocBase {
  categoria: SecaoDocumento;
  nome: string;
  descricao: string;
  status: string;
  obrigatorio: boolean;
  data_validade: string | null;
  observacoes: string | null;
}

/** Normaliza o nome para comparar documentos entre licitações. */
function chave(nome: string): string {
  return (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Descobre a seção a partir do nome do documento. */
export function inferirSecaoDocumento(nome: string): SecaoDocumento {
  const n = (nome || '').toLowerCase();
  if (/atestado/.test(n)) return 'atestado';
  if (/declara[çc][ãa]o/.test(n)) return 'declaracao';
  if (/\bcnd\b/.test(n) || /certid[ãa]o/.test(n) || /caepf|crne/.test(n)) return 'cnd';
  return 'outro';
}

function hojeMais(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function garantirDocumentosLicitacao(
  licitacoes: Array<{ id: string; cliente_id: string | null; numero?: string }>
): Promise<RelatorioDocumentos> {
  const relatorio: RelatorioDocumentos = {
    clientes: 0,
    licitacoes: 0,
    basePorCliente: {},
    documentosInseridos: 0,
    documentosReclassificados: 0,
    etapasAtualizadas: 0,
    erros: [],
  };
  if (licitacoes.length === 0) return relatorio;

  const licIds = licitacoes.map((l) => l.id);
  const clienteIds = Array.from(
    new Set(licitacoes.map((l) => l.cliente_id).filter(Boolean) as string[])
  );
  if (clienteIds.length === 0) return relatorio;

  const [docsRes, licRes, templatesRes, empresasRes, clientesRes] = await Promise.all([
    supabase
      .from('licitacao_documentos_checklist')
      .select('id, licitacao_id, nome, descricao, categoria, status, obrigatorio, data_validade, observacoes')
      .in('licitacao_id', licIds),
    supabase
      .from('licitacoes')
      .select('id, cliente_id, numero, objeto, orgao, modalidade, portal, valor_estimado')
      .in('id', licIds),
    supabase
      .from('declaracoes_templates')
      .select('cliente_id, nome, titulo')
      .in('cliente_id', clienteIds)
      .eq('ativo', true),
    supabase.from('empresas').select('id, cliente_id, razao_social, cnpj').in('cliente_id', clienteIds),
    supabase.from('clientes').select('id, nome').in('id', clienteIds),
  ]);

  // CNDs do i-Documentei (a base real de documentos do cliente)
  const empresaIds = (empresasRes.data || []).map((e: any) => e.id);
  const idocRes = await supabase
    .from('idocumentei_documentos')
    .select('id, empresa_id, tipo, nome, status, data_validade, arquivo_url')
    .in('empresa_id', empresaIds.length > 0 ? empresaIds : ['00000000-0000-0000-0000-000000000000']);

  const empresaPorId = new Map<string, any>((empresasRes.data || []).map((e: any) => [e.id, e]));
  const licPorId = new Map<string, any>((licRes.data || []).map((l: any) => [l.id, l]));
  const nomeCliente = new Map<string, string>(
    (clientesRes.data || []).map((c: any) => [c.id, c.nome as string])
  );

  // Documentos agrupados por cliente
  const docsPorLic = new Map<string, any[]>();
  (docsRes.data || []).forEach((d: any) => {
    if (!docsPorLic.has(d.licitacao_id)) docsPorLic.set(d.licitacao_id, []);
    docsPorLic.get(d.licitacao_id)!.push(d);
  });

  // ---- Monta a base de cada cliente ----
  const basePorCliente = new Map<string, Map<string, DocBase>>();

  const getBase = (clienteId: string) => {
    if (!basePorCliente.has(clienteId)) basePorCliente.set(clienteId, new Map());
    return basePorCliente.get(clienteId)!;
  };

  // (a) documentos já existentes nas licitações do cliente
  for (const lic of licitacoes) {
    if (!lic.cliente_id) continue;
    const base = getBase(lic.cliente_id);
    for (const doc of docsPorLic.get(lic.id) || []) {
      const categoria: SecaoDocumento = SECOES_DOCUMENTOS.includes(doc.categoria)
        ? doc.categoria
        : inferirSecaoDocumento(doc.nome);
      const k = chave(doc.nome);
      const atual = base.get(k);
      // mantém o status "concluido" se alguma ocorrência já estiver concluída
      if (!atual || (atual.status !== 'concluido' && doc.status === 'concluido')) {
        base.set(k, {
          categoria,
          nome: doc.nome,
          descricao: doc.descricao || 'Documento da base de habilitação do cliente.',
          status: doc.status || 'pendente',
          obrigatorio: doc.obrigatorio ?? true,
          data_validade: doc.data_validade,
          observacoes: doc.observacoes,
        });
      }
    }
  }

  // (b) CNDs do i-Documentei
  for (const doc of (idocRes.data || []) as any[]) {
    const emp = empresaPorId.get(doc.empresa_id);
    if (!emp?.cliente_id) continue;
    const base = getBase(emp.cliente_id);
    const nome = `${doc.nome}${emp.razao_social ? ` — ${emp.razao_social}` : ''}`;
    const k = chave(nome);
    if (base.has(k)) continue;
    base.set(k, {
      categoria: 'cnd',
      nome,
      descricao: `Certidão obtida via i-Documentei (${doc.tipo || 'CND'}).`,
      status: doc.status === 'vencido' ? 'pendente' : 'concluido',
      obrigatorio: true,
      data_validade: doc.data_validade,
      observacoes: 'Disponível na base do cliente (i-Documentei).',
    });
  }

  // (c) templates de declaração do cliente
  for (const t of (templatesRes.data || []) as any[]) {
    const base = getBase(t.cliente_id);
    const nome = t.nome || t.titulo;
    if (!nome) continue;
    const k = chave(nome);
    if (base.has(k)) continue;
    base.set(k, {
      categoria: 'declaracao',
      nome,
      descricao: 'Declaração modelada a partir do template do cliente.',
      status: 'concluido',
      obrigatorio: true,
      data_validade: hojeMais(90),
      observacoes: 'Gerada a partir do template do cliente.',
    });
  }

  // ---- Completa as seções vazias com a listagem padrão ----
  for (const clienteId of clienteIds) {
    const base = getBase(clienteId);
    const secoesPresentes = new Set(Array.from(base.values()).map((d) => d.categoria));
    if (SECOES_DOCUMENTOS.every((s) => secoesPresentes.has(s))) {
      relatorio.basePorCliente[clienteId] = base.size;
      continue;
    }
    const licSample = licitacoes.find((l) => l.cliente_id === clienteId);
    const dados = licSample ? licPorId.get(licSample.id) : null;
    const ctx: ContextoExemplo = {
      licitacaoId: licSample?.id || clienteId,
      numero: dados?.numero || '000/0000',
      objeto: dados?.objeto || 'Objeto da licitação',
      orgao: dados?.orgao || 'Órgão Licitante',
      modalidade: dados?.modalidade || 'Pregão Eletrônico',
      portal: dados?.portal || '',
      valorEstimado: Number(dados?.valor_estimado || 0),
      clienteNome: nomeCliente.get(clienteId) || 'Licitante',
      ano: new Date().getFullYear(),
    };
    const padrao = gerarDocumentosChecklist(
      ctx,
        [],
        docsExtrasDoPerfil(inferirPerfil({ nome: nomeCliente.get(clienteId) || '' }))
    );
    for (const doc of padrao) {
      if (!SECOES_DOCUMENTOS.every((s) => secoesPresentes.has(s)) && secoesPresentes.has(doc.categoria)) {
        // seção já tem documento do cliente — não duplicar com o padrão
        continue;
      }
      const k = chave(doc.nome);
      if (base.has(k)) continue;
      base.set(k, {
        categoria: doc.categoria as SecaoDocumento,
        nome: doc.nome,
        descricao: doc.descricao,
        status: doc.status,
        obrigatorio: doc.obrigatorio,
        data_validade: doc.data_validade,
        observacoes: doc.observacoes,
      });
    }
    relatorio.basePorCliente[clienteId] = base.size;
  }

  // ---- Replica a base em todas as licitações ----
  for (const lic of licitacoes) {
    if (!lic.cliente_id) continue;
    relatorio.licitacoes++;
    const base = getBase(lic.cliente_id);
    const existentes = docsPorLic.get(lic.id) || [];
    const nomesExistentes = new Set(existentes.map((d) => chave(d.nome)));

    // reclassifica categorias inválidas
    for (const doc of existentes) {
      if (!SECOES_DOCUMENTOS.includes(doc.categoria)) {
        const novaSecao = inferirSecaoDocumento(doc.nome);
        const { error } = await supabase
          .from('licitacao_documentos_checklist')
          .update({ categoria: novaSecao })
          .eq('id', doc.id);
        if (error) relatorio.erros.push(`reclassificar "${doc.nome}": ${error.message}`);
        else relatorio.documentosReclassificados++;
      }
    }

    // insere o que falta da base
    const faltantes = Array.from(base.values()).filter((d) => !nomesExistentes.has(chave(d.nome)));
    if (faltantes.length > 0) {
      const rows = faltantes.map((d) => ({
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
        relatorio.erros.push(`licitação ${lic.numero || lic.id}: ${error.message}`);
      } else {
        relatorio.documentosInseridos += rows.length;
        docsPorLic.set(lic.id, [...existentes, ...rows]);
      }
    }
  }

  relatorio.clientes = clienteIds.length;

  // ---- Reflete o estado dos documentos na etapa ----
  relatorio.etapasAtualizadas = await atualizarEtapaDocumentos(licIds, docsPorLic, relatorio);

  return relatorio;
}

/**
 * Garante a listagem de documentos para TODOS os clientes da plataforma.
 * Busca todos os clientes e todas as suas licitações e delega o trabalho
 * por cliente. As políticas de RLS limitam o escopo ao que o usuário logado
 * pode ver (admin vê todos).
 */
export async function garantirDocumentosDeTodosOsClientes(): Promise<RelatorioDocumentos> {
  const relatorio: RelatorioDocumentos = {
    clientes: 0,
    licitacoes: 0,
    basePorCliente: {},
    documentosInseridos: 0,
    documentosReclassificados: 0,
    etapasAtualizadas: 0,
    erros: [],
  };

  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('ativo', true);
  if (error) {
    relatorio.erros.push(`clientes: ${error.message}`);
    return relatorio;
  }
  if (!clientes || clientes.length === 0) return relatorio;

  const clienteIds = clientes.map((c: any) => c.id);
  const { data: licitacoes, error: licErr } = await supabase
    .from('licitacoes')
    .select('id, cliente_id, numero')
    .in('cliente_id', clienteIds);
  if (licErr) {
    relatorio.erros.push(`licitacoes: ${licErr.message}`);
    return relatorio;
  }

  const lista = (licitacoes || []) as Array<{ id: string; cliente_id: string; numero: string }>;
  const parcial = await garantirDocumentosLicitacao(
    lista.map((l) => ({ id: l.id, cliente_id: l.cliente_id, numero: l.numero }))
  );

  relatorio.clientes = new Set(lista.map((l) => l.cliente_id)).size;
  relatorio.licitacoes = parcial.licitacoes;
  relatorio.basePorCliente = parcial.basePorCliente;
  relatorio.documentosInseridos = parcial.documentosInseridos;
  relatorio.documentosReclassificados = parcial.documentosReclassificados;
  relatorio.etapasAtualizadas = parcial.etapasAtualizadas;
  relatorio.erros = parcial.erros;
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
): Promise<number> {
  const { data: etapas } = await supabase
    .from('licitacao_etapa_execucao')
    .select('id, licitacao_id, status')
    .eq('etapa_codigo', 'preparacao_documentos')
    .in('licitacao_id', licIds);

  let atualizadas = 0;
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
    else atualizadas++;
  }
  return atualizadas;
}
