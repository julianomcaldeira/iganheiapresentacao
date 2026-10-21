/**
 * Popula o Processo Licitatório de uma licitação com dados de EXEMPLO,
 * para demonstração: todas as etapas ativas do cliente ficam preenchidas
 * (status, dados, observações, datas) e as tabelas de apoio ganham conteúdo
 * coerente (análise da IA, respostas às perguntas do edital, peças,
 * concorrentes, documentos, fluxo de aprovação, resultado, contratos,
 * empenhos, tarefas, chat interno e sessão pública).
 *
 * Tudo é reexecutável: a função apaga o conteúdo de exemplo anterior da
 * licitação antes de gravar, então pode ser chamada quantas vezes forem.
 */
import { supabase } from '@/integrations/supabase/client';
import { ensureEtapasInicializadas } from '@/lib/ensureEtapas';
import { gerarMensagensMonitoramento } from '@/lib/monitoramentoSimulado';
import {
  gerarAnaliseEdital,
  gerarConteudoPeca,
  gerarConteudoProposta,
  gerarConcorrentes,
  gerarDocumentosChecklist,
  gerarFluxoAprovacao,
  gerarItensExemplo,
  gerarMensagensInternas,
  gerarMotivoDisputa,
  gerarLinkPortal,
  gerarRespostaPergunta,
  gerarTarefas,
  gerarTemplatesDeclaracaoPadrao,
  type ContextoExemplo,
} from '@/lib/exemplosProcessoLicitatorio';

export interface RelatorioPopular {
  licitacaoId: string;
  etapasPopuladas: string[];
  etapasSemSuporte: string[];
  tabelas: Record<string, number>;
  /** Documentos criados por seção da aba Documentos */
  documentosPorSecao: Record<string, number>;
  erros: string[];
  perguntasRespondidas: number;
}

const ETAPAS_SEM_SUPORTE = ['custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5'];

/** Remove o conteúdo de exemplo anterior da licitação (idempotência). */
async function limparExemplo(licitacaoId: string, erros: string[]) {
  const tabelas: Array<[string, string]> = [
    ['licitacao_analises', 'licitacao_id'],
    ['licitacao_chat', 'licitacao_id'],
    ['licitacao_pecas', 'licitacao_id'],
    ['licitacao_concorrentes', 'licitacao_id'],
    ['licitacao_produtos', 'licitacao_id'],
    ['licitacao_documentos_checklist', 'licitacao_id'],
    ['licitacao_resultado_itens', 'licitacao_id'],
    ['licitacao_fluxo_aprovacao', 'licitacao_id'],
    ['licitacao_mensagens_internas', 'licitacao_id'],
    ['licitacao_monitoramento_mensagens', 'licitacao_id'],
  ];
  for (const [tabela, coluna] of tabelas) {
    const { error } = await supabase.from(tabela).delete().eq(coluna, licitacaoId);
    if (error) erros.push(`limpeza ${tabela}: ${error.message}`);
  }
  // Empenhos e contratos (tabela compartilhada) e tarefas
  const { error: eErr } = await supabase.from('empenhos').delete().eq('licitacao_id', licitacaoId);
  if (eErr) erros.push(`limpeza empenhos: ${eErr.message}`);
  const { error: tErr } = await supabase.from('tarefas').delete().eq('licitacao_id', licitacaoId);
  if (tErr) erros.push(`limpeza tarefas: ${tErr.message}`);
}

export async function popularProcessoLicitatorio(
  licitacaoId: string,
  userId?: string
): Promise<RelatorioPopular> {
  const erros: string[] = [];
  const tabelas: Record<string, number> = {};
  const etapasPopuladas: string[] = [];
  const etapasSemSuporte: string[] = [];
  let documentosPorSecao: Record<string, number> = {};

  // ===== Contexto =====
  const { data: lic, error: licErr } = await supabase
    .from('licitacoes')
    .select('id, cliente_id, numero, objeto, orgao, modalidade, portal, valor_estimado, data_abertura, data_encerramento, empresa_id')
    .eq('id', licitacaoId)
    .single();
  if (licErr || !lic) {
    return {
      licitacaoId,
      etapasPopuladas: [],
      etapasSemSuporte: [],
      tabelas,
      documentosPorSecao: {},
      erros: [`licitação não encontrada: ${licErr?.message ?? 'sem dados'}`],
      perguntasRespondidas: 0,
    };
  }

  const [cfgRes, clienteRes, perfisRes, regrasRes, templatesRes] = await Promise.all([
    supabase
      .from('licitacao_etapas_config')
      .select('etapa_codigo, ordem, configuracoes')
      .eq('cliente_id', lic.cliente_id)
      .eq('ativo', true)
      .order('ordem'),
    supabase.from('clientes').select('nome').eq('id', lic.cliente_id).single(),
    supabase.from('profiles').select('id, nome').eq('cliente_id', lic.cliente_id).eq('ativo', true),
    supabase
      .from('cliente_regras')
      .select('id, titulo, descricao, categoria')
      .eq('cliente_id', lic.cliente_id)
      .eq('ativo', true)
      .order('ordem'),
    supabase
      .from('declaracoes_templates')
      .select('id, nome')
      .eq('cliente_id', lic.cliente_id)
      .eq('ativo', true)
      .order('nome'),
  ]);

  const cfg = cfgRes.data || [];
  const perfis = (perfisRes.data || []).map((p: any) => ({ id: p.id as string, nome: (p.nome as string) || 'Usuário' }));
  const regras = (regrasRes.data || []) as Array<{ id: string; titulo: string; descricao: string; categoria: string }>;
  const templatesCliente = (templatesRes.data || []) as Array<{ id: string; nome: string }>;

  const ctx: ContextoExemplo = {
    licitacaoId,
    numero: lic.numero,
    objeto: lic.objeto,
    orgao: lic.orgao,
    modalidade: lic.modalidade || 'Pregão Eletrônico',
    portal: lic.portal || '',
    valorEstimado: Number(lic.valor_estimado || 0),
    clienteNome: (clienteRes.data as any)?.nome || 'Licitante',
    ano: new Date().getFullYear(),
  };

  const itens = gerarItensExemplo(ctx);
  const analise = gerarAnaliseEdital(ctx, itens);
  const proposta = gerarConteudoProposta(ctx, itens);

  await limparExemplo(licitacaoId, erros);

  // ===== 1. Estágios (etapas) =====
  await ensureEtapasInicializadas(licitacaoId, lic.cliente_id);
  const { data: execRows } = await supabase
    .from('licitacao_etapa_execucao')
    .select('id, etapa_codigo')
    .eq('licitacao_id', licitacaoId);

  const base = new Date();
  const aprovadores = perfis.slice(0, 3);
  const dataAprov = (dias: number) => new Date(base.getTime() - dias * 86400000).toISOString();

  const conteudoPorEtapa: Record<string, { status: string; dados: Record<string, unknown>; observacoes: string }> = {
    analise_edital: {
      status: 'edital_analisado',
      dados: {
        analise_resumo: analise,
        perguntas_respondidas: regras.length,
        risco: 'medio',
        pontos_criticos: [
          'Exigência de atestado de capacidade técnica',
          'Prazo de 8 dias para impugnação ao edital',
          'Estimativa concentrada em um único lote',
        ],
        estrategia: 'Proposta com 12,4% de desconto e pedido de esclarecimento sobre o atestado.',
      },
      observacoes: `Análise do edital concluída por IA. ${regras.length} pergunta(s) do edital respondida(s) automaticamente.`,
    },
    esclarecimento_impugnacao: {
      status: 'finalizada',
      dados: {
        peca_tipo: 'pecas_esclarecimento',
        motivo:
          'Divergência entre a exigência de atestado de capacidade técnica nos últimos 5 anos e a exigência de comprovação de entrega de, no mínimo, 50% do volume ofertado, situação não prevista em nenhuma hipótese licitatória do edital.',
        data_envio: dataAprov(9),
        numero_protocolo: `E-${ctx.ano}/0142`,
        prazo_resposta: dataAprov(4),
        resposta_organ: 'Esclarecimento publicado no portal em 02/10/2026, item 4 do edital.',
      },
      observacoes: 'Pedido de esclarecimento protocolado e respondido pelo pregoeiro.',
    },
    impugnacao_contrarrazao: {
      status: 'finalizada',
      dados: {
        peca_tipo: 'pecas_impugnacao',
        motivo:
          'A exigência de registro ANVISA para item de uso exclusivo em ambiente hospitalar sem previsão de dispensa para itens equivalentes certificado.',
        data_envio: dataAprov(8),
        numero_protocolo: `I-${ctx.ano}/0311`,
        resultado: 'Parcialmente acolhida — o item 3 foi excluído da itemização.',
      },
      observacoes: 'Impugnação protocolada; item 3 excluído após análise.',
    },
    aprovacoes: {
      status: 'concluido',
      dados: {
        aprovadores: aprovadores.map((a, i) => ({
          id: a.id,
          nome: a.nome,
          status: 'aprovado',
          comentario:
            i === 0
              ? 'Especificações e custos compatíveis com o mercado. Acompanhar o registro ANVISA.'
              : 'Aprovado sem ressalvas.',
          data_resposta: dataAprov(7 - i),
        })),
        parecer: 'Processo aprovado para protocolo da proposta.',
      },
      observacoes: 'Aprovação concluída por todos os responsáveis designados.',
    },
    concorrentes: {
      status: 'concluido',
      dados: {
        total: 5,
        analise: 'Disputa concentrada em 4 licitantes; ponto de atenção em itens com poucas propostas.',
        proposta_melhor: fmtValor(ctx.valorEstimado * 0.876),
      },
      observacoes: 'Análise de concorrência concluída com base nas propostas da sessão pública.',
    },
    preparacao_documentos: {
      status: 'documentos_analisados',
      dados: {
        documentos_validos: 6,
        documentos_pendentes: 1,
        pendencias: ['Registro ANVISA de 1 item do lote 3'],
        alerta: 'Renovar a CND federal 5 dias antes da entrega.',
      },
      observacoes: 'Checklist documental analisado: 6 documentos válidos, 1 pendente.',
    },
    produtos: {
      status: 'concluido',
      dados: {
        total_itens: itens.length,
        valor_total: fmtValor(itens.reduce((s, i) => s + i.valor_total, 0)),
      },
      observacoes: `${itens.length} item(ns) vinculados à licitação.`,
    },
    proposta: {
      status: 'proposta_finalizada',
      dados: {
        proposta_conteudo: proposta,
        valor_proposto: fmtValor(ctx.valorEstimado * 0.876),
        desconto: 12.4,
        prazo_validade: 90,
        garantia: 'Carta de fiança bancária — 5% — validade 120 dias',
      },
      observacoes: 'Proposta comercial gerada com IA e finalizada para protocolo.',
    },
    tarefas: {
      status: 'concluido',
      dados: {
        total: 3,
        concluidas: 1,
        em_andamento: 1,
        pendentes: 1,
      },
      observacoes: 'Tarefas do plano de ação criadas e distribuídas ao time.',
    },
    disputa_pregao: {
      status: 'disputa_finalizada',
      dados: {
        link_portal: gerarLinkPortal(ctx),
        motivo_finalizacao: gerarMotivoDisputa(ctx),
        itens_disputados: itens.length,
        lance_vencedor: fmtValor(ctx.valorEstimado * 0.876),
      },
      observacoes: 'Sessão pública encerrada com adjudicação do item 1.',
    },
    resultado: {
      status: 'resultado_finalizado',
      dados: {
        itens_ganhos: 1,
        itens_perdidos: itens.length - 1,
        total_itens: itens.length,
      },
      observacoes: 'Resultado registrado: 1 item adjudicado.',
    },
    contratos: {
      status: 'concluido',
      dados: {
        numero_contrato: `CT-${ctx.ano}/${String(lic.numero).replace(/\D/g, '').slice(0, 6)}`,
        valor: fmtValor(ctx.valorEstimado * 0.876),
        vigencia: '12 meses a partir da assinatura',
      },
      observacoes: 'Contrato registrado e vinculado à licitação.',
    },
    empenhos: {
      status: 'concluido',
      dados: {
        valor_empenhado: fmtValor(ctx.valorEstimado * 0.876),
        saldo: fmtValor(ctx.valorEstimado * 0.876),
        notas: 'Empenho ordinal vinculado ao contrato.',
      },
      observacoes: 'Empenho emitido e vinculado ao contrato da licitação.',
    },
  };

  const ordemEtapas = new Map(cfg.map((c: any, i: number) => [c.etapa_codigo as string, i]));

  for (const row of (execRows || []) as Array<{ id: string; etapa_codigo: string }>) {
    const codigo = row.etapa_codigo;
    const conteudo = conteudoPorEtapa[codigo];
    if (!conteudo) {
      etapasSemSuporte.push(codigo);
      continue;
    }
    // Datas progressivas conforme a ordem configurada do cliente
    const pos = ordemEtapas.get(codigo) ?? 0;
    const inicio = dataAprov(14 - pos);
    const conclusao = dataAprov(Math.max(13 - pos, 1));
    const { error } = await supabase
      .from('licitacao_etapa_execucao')
      .update({
        status: conteudo.status,
        dados: conteudo.dados,
        observacoes: conteudo.observacoes,
        data_inicio: inicio,
        data_conclusao: conclusao,
      })
      .eq('id', row.id);
    if (error) {
      erros.push(`etapa ${codigo}: ${error.message}`);
    } else {
      etapasPopuladas.push(codigo);
    }
  }

  // ===== 2. Análise da IA (Análise IA) =====
  {
    const { error } = await supabase.from('licitacao_analises').insert({
      licitacao_id: licitacaoId,
      arquivo_nome: `Edital ${lic.numero}.pdf`,
      arquivos_analisados: [`Edital ${lic.numero}.pdf`, 'Anexo I — Termo de Referência'],
      resultado: { conteudo: analise, modelo: 'gpt-4o', demo: true, tokens: 4820 },
      status: 'concluida',
      created_by: userId ?? null,
    });
    if (error) erros.push(`licitacao_analises: ${error.message}`);
    else tabelas.licitacao_analises = 1;
  }

  // ===== 3. Perguntas do Edital respondidas pela IA =====
  let perguntasRespondidas = 0;
  if (regras.length > 0) {
    const chatRows = regras.map((r) => ({
      licitacao_id: licitacaoId,
      pergunta: r.descricao || r.titulo,
      resposta: gerarRespostaPergunta(ctx, r.descricao || r.titulo, r.titulo),
      favorita: false,
      status: 'concluida',
      created_by: userId ?? null,
    }));
    const { error } = await supabase.from('licitacao_chat').insert(chatRows);
    if (error) erros.push(`licitacao_chat: ${error.message}`);
    else {
      tabelas.licitacao_chat = chatRows.length;
      perguntasRespondidas = chatRows.length;
    }
  } else {
    // Sem regras cadastradas: registra as perguntas padrão do edital
    const padroes = [
      {
        titulo: 'Prazo para impugnações e esclarecimentos',
        descricao: 'Qual é o prazo para apresentação de impugnações e pedidos de esclarecimento ao edital?',
      },
      {
        titulo: 'Documentos de habilitação',
        descricao: 'Quais documentos são exigidos para a habilitação nesta licitação e qual a validade mínima?',
      },
      {
        titulo: 'Garantia da proposta',
        descricao: 'É exigida garantia de proposta? Em que percentual, modalidade e prazo?',
      },
    ];
    const chatRows = padroes.map((p) => ({
      licitacao_id: licitacaoId,
      pergunta: p.descricao,
      resposta: gerarRespostaPergunta(ctx, p.descricao, p.titulo),
      favorita: false,
      status: 'concluida',
      created_by: userId ?? null,
    }));
    const { error } = await supabase.from('licitacao_chat').insert(chatRows);
    if (error) erros.push(`licitacao_chat: ${error.message}`);
    else {
      tabelas.licitacao_chat = chatRows.length;
      perguntasRespondidas = chatRows.length;
    }
  }

  // ===== 4. Peças jurídicas =====
  {
    const pecas = [
      { tipo: 'pecas_esclarecimento', titulo: 'Pedido de Esclarecimento', motivo: 'Exigência de atestado de capacidade técnica — escopo de cobertura.' },
      { tipo: 'pecas_impugnacao', titulo: 'Impugnação ao Edital', motivo: 'Exigência de registro ANVISA para item de uso exclusivo hospitalar.' },
      { tipo: 'pecas_recurso', titulo: 'Recurso Administrativo', motivo: 'Divergência no julgamento da fase de lances do item 1.' },
      { tipo: 'pecas_contrarrazoes', titulo: 'Contrarrazões', motivo: 'Manifestação quanto ao recurso interposto pela licitante declarada vencedora.' },
    ];
    const rows = pecas.map((p) => ({
      licitacao_id: licitacaoId,
      cliente_id: lic.cliente_id,
      tipo: p.tipo,
      titulo: p.titulo,
      descricao_solicitacao: p.motivo,
      conteudo_gerado: gerarConteudoPeca(p.tipo, ctx, p.motivo),
      modelo_ia: 'gpt-4o',
      status: 'concluido',
      created_by: userId ?? null,
    }));
    const { error } = await supabase.from('licitacao_pecas').insert(rows);
    if (error) erros.push(`licitacao_pecas: ${error.message}`);
    else tabelas.licitacao_pecas = rows.length;
  }

  // ===== 5. Concorrentes =====
  {
    const rows = gerarConcorrentes(ctx).map((c) => ({ ...c, licitacao_id: licitacaoId, cliente_id: lic.cliente_id }));
    const { error } = await supabase.from('licitacao_concorrentes').insert(rows);
    if (error) erros.push(`licitacao_concorrentes: ${error.message}`);
    else tabelas.licitacao_concorrentes = rows.length;
  }

  // ===== 6. Produtos / itens =====
  {
    const rows = itens.map((i) => ({
      licitacao_id: licitacaoId,
      item_numero: i.item_numero,
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      valor_total: i.valor_total,
      marca: i.marca,
      modelo: i.modelo,
    }));
    const { error } = await supabase.from('licitacao_produtos').insert(rows);
    if (error) erros.push(`licitacao_produtos: ${error.message}`);
    else tabelas.licitacao_produtos = rows.length;
  }

  // ===== 7. Documentos por seção (CNDs, Atestados, Declarações, Outros) =====
  {
    const docs = gerarDocumentosChecklist(ctx, templatesCliente.map((t) => t.nome));
    const rows = docs.map((d) => ({
      ...d,
      licitacao_id: licitacaoId,
      verificado_por: d.status === 'concluido' ? perfis[0]?.id ?? null : null,
      verificado_em: d.status === 'concluido' ? dataAprov(6) : null,
    }));
    const { error } = await supabase.from('licitacao_documentos_checklist').insert(rows);
    if (error) erros.push(`licitacao_documentos_checklist: ${error.message}`);
    else {
      tabelas.licitacao_documentos_checklist = rows.length;
      // Breakdown por seção (para o relatório)
      const porSecao: Record<string, number> = {};
      rows.forEach((r) => { porSecao[r.categoria] = (porSecao[r.categoria] || 0) + 1; });
      documentosPorSecao = porSecao;
    }
  }

  // ===== 7b. Templates de declaração do cliente (seção "Declarações") =====
  if (templatesCliente.length === 0) {
    const rows = gerarTemplatesDeclaracaoPadrao(ctx).map((t) => ({
      ...t,
      cliente_id: lic.cliente_id,
      ativo: true,
    }));
    const { error } = await supabase.from('declaracoes_templates').insert(rows);
    if (error) erros.push(`declaracoes_templates: ${error.message}`);
    else tabelas.declaracoes_templates = rows.length;
  }

  // ===== 8. Fluxo de aprovação =====
  {
    const rows = gerarFluxoAprovacao(ctx, aprovadores).map((f) => ({
      ...f,
      licitacao_id: licitacaoId,
      created_by: userId ?? null,
      data_resposta: dataAprov(6),
    }));
    const { error } = await supabase.from('licitacao_fluxo_aprovacao').insert(rows);
    if (error) erros.push(`licitacao_fluxo_aprovacao: ${error.message}`);
    else tabelas.licitacao_fluxo_aprovacao = rows.length;
  }

  // ===== 9. Resultado por item =====
  {
    const rows = itens.map((i, idx) => ({
      licitacao_id: licitacaoId,
      item_numero: i.item_numero,
      descricao: i.descricao,
      resultado: idx === 0 ? 'ganhou' : 'perdeu',
      valor_proposta: Number((i.valor_total * 0.876).toFixed(2)),
      valor_vencedor: idx === 0 ? Number((i.valor_total * 0.876).toFixed(2)) : null,
      vencedor_nome: idx === 0 ? ctx.clienteNome : null,
      observacoes:
        idx === 0
          ? 'Adjudicado após rodadas de lances, sem interposição de recurso.'
          : 'Não adjudicado — não houve proposta válida após a fase de disputa.',
    }));
    const { error } = await supabase.from('licitacao_resultado_itens').insert(rows);
    if (error) erros.push(`licitacao_resultado_itens: ${error.message}`);
    else tabelas.licitacao_resultado_itens = rows.length;
  }

  // ===== 10. Contrato e empenho =====
  {
    const valorContrato = Number((ctx.valorEstimado * 0.876).toFixed(2));
    const rows = [
      {
        numero: `CT-${ctx.ano}/${String(lic.numero).replace(/\D/g, '').slice(0, 6)}`,
        cliente_id: lic.cliente_id,
        licitacao_id: licitacaoId,
        orgao_emissor: ctx.orgao,
        tipo: 'contrato',
        valor_empenhado: valorContrato,
        valor_utilizado: 0,
        data_emissao: dataAprov(1),
        data_vencimento: new Date(base.getTime() + 365 * 86400000).toISOString(),
        objeto: ctx.objeto,
        natureza_despesa: 'Material de consumo',
        fonte_recurso: 'Fundo Municipal de Saúde',
        unidade_gestora: ctx.orgao,
        status: 'ativo',
        observacoes: 'Contrato assinado eletronicamente.',
      },
      {
        numero: `EMP-${ctx.ano}/${String(lic.numero).replace(/\D/g, '').slice(0, 6)}`,
        cliente_id: lic.cliente_id,
        licitacao_id: licitacaoId,
        orgao_emissor: ctx.orgao,
        tipo: 'ordinario',
        valor_empenhado: valorContrato,
        valor_utilizado: 0,
        data_emissao: dataAprov(1),
        data_vencimento: new Date(base.getTime() + 180 * 86400000).toISOString(),
        objeto: ctx.objeto,
        natureza_despesa: 'Material de consumo',
        fonte_recurso: 'Fundo Municipal de Saúde',
        unidade_gestora: ctx.orgao,
        status: 'ativo',
        observacoes: 'Empenho vinculado ao contrato da licitação.',
      },
    ];
    const { error } = await supabase.from('empenhos').insert(rows);
    if (error) erros.push(`empenhos: ${error.message}`);
    else tabelas.empenhos = rows.length;
  }

  // ===== 11. Tarefas =====
  // A policy de INSERT exige `auth.uid() = criado_por`
  if (perfis.length > 0 && userId) {
    const rows = gerarTarefas(ctx, perfis).map((t) => ({
      ...t,
      licitacao_id: licitacaoId,
      cliente_id: lic.cliente_id,
      criado_por: userId,
      responsavel_id: t.responsavel_id,
      data_conclusao: t.status === 'concluida' ? dataAprov(5) : null,
      tags: ['licitacao', ctx.numero],
    }));
    const { error } = await supabase.from('tarefas').insert(rows);
    if (error) erros.push(`tarefas: ${error.message}`);
    else tabelas.tarefas = rows.length;
  }

  // ===== 12. Chat interno =====
  // Policy de INSERT: `auth.uid() = autor_id` — usuários do cliente só podem
  // gravar mensagens em que são o autor. Admin (FOR ALL) não tem essa restrição.
  if (perfis.length > 0) {
    const ehUsuarioDoCliente = !!userId && perfis.some((p) => p.id === userId);
    const autores = ehUsuarioDoCliente
      ? [userId as string]
      : perfis.slice(0, 3).map((p) => p.id);
    const rows = gerarMensagensInternas(ctx, autores).map((m) => ({
      ...m,
      licitacao_id: licitacaoId,
    }));
    const { error } = await supabase.from('licitacao_mensagens_internas').insert(rows);
    if (error) erros.push(`licitacao_mensagens_internas: ${error.message}`);
    else tabelas.licitacao_mensagens_internas = rows.length;
  }

  // ===== 13. Sessão pública (monitoramento) =====
  {
    const msgs = gerarMensagensMonitoramento({
      licitacaoId,
      numero: lic.numero,
      objeto: lic.objeto,
      orgao: lic.orgao,
      valorEstimado: Number(lic.valor_estimado || 0),
    });
    const rows = msgs.map((m) => ({
      licitacao_id: licitacaoId,
      autor_tipo: m.autor_tipo,
      autor_nome: m.autor_nome,
      mensagem: m.mensagem,
      data_mensagem: m.data_mensagem,
      origem: 'simulado',
      metadata: {},
    }));
    const { error } = await supabase.from('licitacao_monitoramento_mensagens').insert(rows);
    if (error) erros.push(`licitacao_monitoramento_mensagens: ${error.message}`);
    else tabelas.licitacao_monitoramento_mensagens = rows.length;
  }

  // ===== 14. Cabeçalho da licitação (análise IA + etapa atual) =====
  {
    const { error } = await supabase
      .from('licitacoes')
      .update({
        analise_ia: { conteudo: analise, modelo: 'gpt-4o', demo: true },
        analise_ia_status: 'concluida',
        analise_ia_data: dataAprov(12),
        etapa_atual_codigo: 'resultado',
        status: 'em_andamento',
      })
      .eq('id', licitacaoId);
    if (error) erros.push(`licitacoes: ${error.message}`);
  }

  return {
    licitacaoId,
    etapasPopuladas,
    etapasSemSuporte,
    tabelas,
    documentosPorSecao,
    erros,
    perguntasRespondidas,
  };
}

function fmtValor(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface RelatorioLote {
  populadas: string[];
  jaPopuladas: string[];
  etapas: number;
  perguntas: number;
  documentos: number;
  erros: string[];
}

/**
 * Popula em lote as licitações que ainda NÃO foram populadas com exemplo.
 *
 * O marcador de "já populada" é o campo `demo: true` gravado em
 * licitacao_analises.resultado — assim a operação roda uma única vez por
 * licitação e nunca sobrescreve conteúdo já existente.
 */
export async function popularExemplosPendentes(
  licitacoes: Array<{ id: string; numero: string }>,
  userId?: string,
  onProgress?: (feito: number, total: number) => void
): Promise<RelatorioLote> {
  const relatorio: RelatorioLote = {
    populadas: [],
    jaPopuladas: [],
    etapas: 0,
    perguntas: 0,
    documentos: 0,
    erros: [],
  };
  if (licitacoes.length === 0) return relatorio;

  const ids = licitacoes.map((l) => l.id);
  const [analisesRes, etapasRes] = await Promise.all([
    supabase
      .from('licitacao_analises')
      .select('licitacao_id, resultado')
      .in('licitacao_id', ids),
    supabase
      .from('licitacao_etapa_execucao')
      .select('licitacao_id, status')
      .eq('etapa_codigo', 'analise_edital')
      .in('licitacao_id', ids),
  ]);

  // Marcador primário: análise marcada como demo.
  // Marcador secundário: etapa de Análise IA já concluída (conteúdo real).
  const jaPopuladas = new Set<string>();
  (analisesRes.data || []).forEach((a: any) => {
    if ((a.resultado as any)?.demo === true) jaPopuladas.add(a.licitacao_id);
  });
  (etapasRes.data || []).forEach((e: any) => {
    if (e.status === 'edital_analisado') jaPopuladas.add(e.licitacao_id);
  });

  const pendentes = licitacoes.filter((l) => !jaPopuladas.has(l.id));
  relatorio.jaPopuladas = licitacoes.filter((l) => jaPopuladas.has(l.id)).map((l) => l.id);

  let feito = 0;
  for (const lic of pendentes) {
    const rel = await popularProcessoLicitatorio(lic.id, userId);
    if (rel.erros.length > 0) {
      relatorio.erros.push(...rel.erros.map((e) => `${lic.numero}: ${e}`));
    }
    relatorio.populadas.push(lic.id);
    relatorio.etapas += rel.etapasPopuladas.length;
    relatorio.perguntas += rel.perguntasRespondidas;
    relatorio.documentos += Object.values(rel.documentosPorSecao || {}).reduce((a, b) => a + b, 0);
    feito++;
    onProgress?.(feito, pendentes.length);
  }

  return relatorio;
}
