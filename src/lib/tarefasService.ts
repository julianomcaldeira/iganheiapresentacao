import { supabase } from '@/integrations/supabase/client';

interface CreateTarefaInput {
  titulo: string;
  descricao?: string | null;
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  data_vencimento?: string | null;
  responsaveis_ids: string[];
  licitacao_id?: string | null;
  tags?: string[] | null;
  criador_id: string;
  criador_nome: string;
  cliente_id: string | null;
}

/**
 * Creates a tarefa with status 'pendente' (default), assigns multiple responsaveis,
 * and dispatches in-system notifications to each responsavel (excluding criador).
 */
export async function createTarefaWithNotifications(input: CreateTarefaInput) {
  const responsaveis = Array.from(new Set(input.responsaveis_ids.filter(Boolean)));

  const { data: tarefa, error } = await supabase
    .from('tarefas')
    .insert({
      titulo: input.titulo,
      descricao: input.descricao || null,
      status: 'pendente',
      prioridade: input.prioridade || 'media',
      data_vencimento: input.data_vencimento || null,
      responsavel_id: responsaveis[0] || null, // legacy single field
      responsaveis_ids: responsaveis,
      cliente_id: input.cliente_id,
      licitacao_id: input.licitacao_id || null,
      tags: input.tags || null,
      criado_por: input.criador_id,
    })
    .select()
    .single();

  if (error) throw error;

  // Dispatch notifications to each responsavel (skip the creator)
  const notifyTargets = responsaveis.filter((id) => id !== input.criador_id);
  if (notifyTargets.length > 0) {
    const notifPayload = notifyTargets.map((uid) => ({
      user_id: uid,
      cliente_id: input.cliente_id,
      titulo: 'Você foi marcado em uma tarefa',
      mensagem: `${input.criador_nome} marcou você na tarefa "${input.titulo}".`,
      tipo: 'info' as const,
      link: input.licitacao_id ? `/licitacoes` : `/tarefas`,
    }));
    // best-effort; do not fail the task creation if notifications fail
    await supabase.from('notificacoes').insert(notifPayload);
  }

  return tarefa;
}

interface UpdateTarefaInput {
  id: string;
  titulo?: string;
  descricao?: string | null;
  status?: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente';
  data_vencimento?: string | null;
  responsaveis_ids?: string[];
  licitacao_id?: string | null;
  tags?: string[] | null;
  data_conclusao?: string | null;
  /** when provided, notifies newly added responsaveis */
  previousResponsaveisIds?: string[];
  criador_id?: string;
  criador_nome?: string;
  cliente_id?: string | null;
  tarefa_titulo?: string;
}

export async function updateTarefaWithNotifications(input: UpdateTarefaInput) {
  const payload: Record<string, unknown> = {};
  if (input.titulo !== undefined) payload.titulo = input.titulo;
  if (input.descricao !== undefined) payload.descricao = input.descricao;
  if (input.status !== undefined) payload.status = input.status;
  if (input.prioridade !== undefined) payload.prioridade = input.prioridade;
  if (input.data_vencimento !== undefined) payload.data_vencimento = input.data_vencimento;
  if (input.licitacao_id !== undefined) payload.licitacao_id = input.licitacao_id;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (input.data_conclusao !== undefined) payload.data_conclusao = input.data_conclusao;

  let newResponsaveis: string[] | undefined;
  if (input.responsaveis_ids !== undefined) {
    newResponsaveis = Array.from(new Set(input.responsaveis_ids.filter(Boolean)));
    payload.responsaveis_ids = newResponsaveis;
    payload.responsavel_id = newResponsaveis[0] || null;
  }

  const { error } = await supabase.from('tarefas').update(payload).eq('id', input.id);
  if (error) throw error;

  // Notify newly added responsaveis
  if (newResponsaveis && input.previousResponsaveisIds && input.criador_id && input.criador_nome) {
    const added = newResponsaveis.filter(
      (id) => !input.previousResponsaveisIds!.includes(id) && id !== input.criador_id,
    );
    if (added.length > 0) {
      const notifPayload = added.map((uid) => ({
        user_id: uid,
        cliente_id: input.cliente_id ?? null,
        titulo: 'Você foi marcado em uma tarefa',
        mensagem: `${input.criador_nome} marcou você na tarefa "${input.tarefa_titulo || ''}".`,
        tipo: 'info' as const,
        link: input.licitacao_id ? `/licitacoes` : `/tarefas`,
      }));
      await supabase.from('notificacoes').insert(notifPayload);
    }
  }
}
