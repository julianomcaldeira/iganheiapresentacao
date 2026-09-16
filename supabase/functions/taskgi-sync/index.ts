import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TASKGI_API_KEY = Deno.env.get('TASKGI_API_KEY');
const TASKGI_API_URL = 'https://api.taskgi.com/v1'; // URL base da API TaskGI

interface TaskGITask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assignee_id?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface LocalTask {
  id: string;
  titulo: string;
  descricao?: string;
  status: string;
  prioridade: string;
  data_vencimento?: string;
  responsavel_id?: string;
  tags?: string[];
  cliente_id?: string;
  criado_por: string;
  taskgi_id?: string;
}

// Mapeamento de status TaskGI -> Local
const statusMapFromTaskGI: Record<string, string> = {
  'todo': 'pendente',
  'in_progress': 'em_andamento',
  'done': 'concluida',
  'cancelled': 'cancelada'
};

// Mapeamento de status Local -> TaskGI
const statusMapToTaskGI: Record<string, string> = {
  'pendente': 'todo',
  'em_andamento': 'in_progress',
  'concluida': 'done',
  'cancelada': 'cancelled'
};

// Mapeamento de prioridade TaskGI -> Local
const priorityMapFromTaskGI: Record<string, string> = {
  'low': 'baixa',
  'medium': 'media',
  'high': 'alta',
  'urgent': 'urgente'
};

// Mapeamento de prioridade Local -> TaskGI
const priorityMapToTaskGI: Record<string, string> = {
  'baixa': 'low',
  'media': 'medium',
  'alta': 'high',
  'urgente': 'urgent'
};

async function fetchTaskGITasks(): Promise<TaskGITask[]> {
  console.log('Fetching tasks from TaskGI...');
  
  const response = await fetch(`${TASKGI_API_URL}/tasks`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${TASKGI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TaskGI API error:', error);
    throw new Error(`TaskGI API error: ${response.status}`);
  }

  const data = await response.json();
  console.log(`Fetched ${data.tasks?.length || 0} tasks from TaskGI`);
  return data.tasks || [];
}

async function createTaskInTaskGI(task: LocalTask): Promise<TaskGITask> {
  console.log('Creating task in TaskGI:', task.titulo);
  
  const response = await fetch(`${TASKGI_API_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TASKGI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.titulo,
      description: task.descricao || '',
      status: statusMapToTaskGI[task.status] || 'todo',
      priority: priorityMapToTaskGI[task.prioridade] || 'medium',
      due_date: task.data_vencimento,
      tags: task.tags || [],
      external_id: task.id, // Guardar referência ao ID local
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TaskGI create error:', error);
    throw new Error(`Failed to create task in TaskGI: ${response.status}`);
  }

  return await response.json();
}

async function updateTaskInTaskGI(taskgiId: string, task: LocalTask): Promise<TaskGITask> {
  console.log('Updating task in TaskGI:', taskgiId);
  
  const response = await fetch(`${TASKGI_API_URL}/tasks/${taskgiId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${TASKGI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.titulo,
      description: task.descricao || '',
      status: statusMapToTaskGI[task.status] || 'todo',
      priority: priorityMapToTaskGI[task.prioridade] || 'medium',
      due_date: task.data_vencimento,
      tags: task.tags || [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TaskGI update error:', error);
    throw new Error(`Failed to update task in TaskGI: ${response.status}`);
  }

  return await response.json();
}

async function deleteTaskInTaskGI(taskgiId: string): Promise<void> {
  console.log('Deleting task in TaskGI:', taskgiId);
  
  const response = await fetch(`${TASKGI_API_URL}/tasks/${taskgiId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${TASKGI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error('TaskGI delete error:', error);
    throw new Error(`Failed to delete task in TaskGI: ${response.status}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuthCheck = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabaseAuthCheck.auth.getUser();
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, task, taskgi_id } = await req.json();
    console.log('TaskGI sync action:', action);

    let result: any = null;

    switch (action) {
      case 'sync_from_taskgi': {
        // Importar tarefas do TaskGI para o sistema local
        const taskgiTasks = await fetchTaskGITasks();
        const syncResults = { created: 0, updated: 0, errors: [] as string[] };

        for (const taskgiTask of taskgiTasks) {
          try {
            // Verificar se já existe uma tarefa com esse taskgi_id
            const { data: existingTask } = await supabaseClient
              .from('tarefas')
              .select('id')
              .eq('taskgi_id', taskgiTask.id)
              .single();

            const taskData = {
              titulo: taskgiTask.title,
              descricao: taskgiTask.description,
              status: statusMapFromTaskGI[taskgiTask.status] || 'pendente',
              prioridade: priorityMapFromTaskGI[taskgiTask.priority] || 'media',
              data_vencimento: taskgiTask.due_date,
              tags: taskgiTask.tags,
              taskgi_id: taskgiTask.id,
            };

            if (existingTask) {
              await supabaseClient
                .from('tarefas')
                .update(taskData)
                .eq('id', existingTask.id);
              syncResults.updated++;
            } else {
              // Precisa de um criado_por - usar system user ou primeiro admin
              const { data: adminUser } = await supabaseClient
                .from('user_roles')
                .select('user_id')
                .eq('role', 'admin')
                .limit(1)
                .single();

              if (adminUser) {
                await supabaseClient
                  .from('tarefas')
                  .insert({
                    ...taskData,
                    criado_por: adminUser.user_id,
                  });
                syncResults.created++;
              }
            }
          } catch (err: any) {
            console.error('Error syncing task:', taskgiTask.id, err);
            syncResults.errors.push(`Task ${taskgiTask.id}: ${err?.message || 'Unknown error'}`);
          }
        }

        result = syncResults;
        break;
      }

      case 'push_to_taskgi': {
        // Enviar tarefa local para o TaskGI
        if (!task) {
          throw new Error('Task data required for push_to_taskgi action');
        }

        if (task.taskgi_id) {
          // Atualizar tarefa existente
          const updated = await updateTaskInTaskGI(task.taskgi_id, task);
          result = { action: 'updated', taskgi_id: updated.id };
        } else {
          // Criar nova tarefa
          const created = await createTaskInTaskGI(task);
          
          // Salvar o taskgi_id na tarefa local
          await supabaseClient
            .from('tarefas')
            .update({ taskgi_id: created.id })
            .eq('id', task.id);

          result = { action: 'created', taskgi_id: created.id };
        }
        break;
      }

      case 'delete_from_taskgi': {
        // Deletar tarefa do TaskGI
        if (!taskgi_id) {
          throw new Error('taskgi_id required for delete_from_taskgi action');
        }

        await deleteTaskInTaskGI(taskgi_id);
        result = { action: 'deleted', taskgi_id };
        break;
      }

      case 'full_sync': {
        // Sincronização completa bidirecional
        const syncResults = {
          from_taskgi: { created: 0, updated: 0 },
          to_taskgi: { created: 0, updated: 0 },
          errors: [] as string[],
        };

        // 1. Buscar todas as tarefas do TaskGI
        const taskgiTasks = await fetchTaskGITasks();
        const taskgiMap = new Map(taskgiTasks.map(t => [t.id, t]));

        // 2. Buscar todas as tarefas locais
        const { data: localTasks } = await supabaseClient
          .from('tarefas')
          .select('*');

        // 3. Sincronizar do TaskGI para local
        for (const taskgiTask of taskgiTasks) {
          try {
            const localTask = localTasks?.find(t => t.taskgi_id === taskgiTask.id);
            
            const taskData = {
              titulo: taskgiTask.title,
              descricao: taskgiTask.description,
              status: statusMapFromTaskGI[taskgiTask.status] || 'pendente',
              prioridade: priorityMapFromTaskGI[taskgiTask.priority] || 'media',
              data_vencimento: taskgiTask.due_date,
              tags: taskgiTask.tags,
              taskgi_id: taskgiTask.id,
            };

            if (localTask) {
              // Comparar updated_at para decidir qual versão é mais recente
              const taskgiUpdated = new Date(taskgiTask.updated_at);
              const localUpdated = new Date(localTask.updated_at);

              if (taskgiUpdated > localUpdated) {
                await supabaseClient
                  .from('tarefas')
                  .update(taskData)
                  .eq('id', localTask.id);
                syncResults.from_taskgi.updated++;
              }
            } else {
              const { data: adminUser } = await supabaseClient
                .from('user_roles')
                .select('user_id')
                .eq('role', 'admin')
                .limit(1)
                .single();

              if (adminUser) {
                await supabaseClient
                  .from('tarefas')
                  .insert({
                    ...taskData,
                    criado_por: adminUser.user_id,
                  });
                syncResults.from_taskgi.created++;
              }
            }
          } catch (err: any) {
            syncResults.errors.push(`Import ${taskgiTask.id}: ${err?.message || 'Unknown error'}`);
          }
        }

        // 4. Sincronizar do local para TaskGI (tarefas sem taskgi_id ou mais recentes)
        for (const localTask of localTasks || []) {
          try {
            if (!localTask.taskgi_id) {
              // Criar no TaskGI
              const created = await createTaskInTaskGI(localTask);
              await supabaseClient
                .from('tarefas')
                .update({ taskgi_id: created.id })
                .eq('id', localTask.id);
              syncResults.to_taskgi.created++;
            } else {
              const taskgiTask = taskgiMap.get(localTask.taskgi_id);
              if (taskgiTask) {
                const taskgiUpdated = new Date(taskgiTask.updated_at);
                const localUpdated = new Date(localTask.updated_at);

                if (localUpdated > taskgiUpdated) {
                  await updateTaskInTaskGI(localTask.taskgi_id, localTask);
                  syncResults.to_taskgi.updated++;
                }
              }
            }
          } catch (err: any) {
            syncResults.errors.push(`Export ${localTask.id}: ${err?.message || 'Unknown error'}`);
          }
        }

        result = syncResults;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('TaskGI sync error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
