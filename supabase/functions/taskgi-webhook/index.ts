import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-taskgi-signature',
};

const TASKGI_API_KEY = Deno.env.get('TASKGI_API_KEY');

// Mapeamento de status TaskGI -> Local
const statusMapFromTaskGI: Record<string, string> = {
  'todo': 'pendente',
  'in_progress': 'em_andamento',
  'done': 'concluida',
  'cancelled': 'cancelada'
};

// Mapeamento de prioridade TaskGI -> Local
const priorityMapFromTaskGI: Record<string, string> = {
  'low': 'baixa',
  'medium': 'media',
  'high': 'alta',
  'urgent': 'urgente'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar assinatura do webhook (se TaskGI usar)
    const signature = req.headers.get('x-taskgi-signature');
    console.log('Received TaskGI webhook, signature:', signature ? 'present' : 'missing');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log('TaskGI webhook payload:', JSON.stringify(payload));

    const { event, task } = payload;

    if (!event || !task) {
      console.error('Invalid webhook payload - missing event or task');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (event) {
      case 'task.created':
      case 'task.updated': {
        // Verificar se já existe uma tarefa com esse taskgi_id
        const { data: existingTask } = await supabaseClient
          .from('tarefas')
          .select('id, updated_at')
          .eq('taskgi_id', task.id)
          .single();

        const taskData = {
          titulo: task.title,
          descricao: task.description,
          status: statusMapFromTaskGI[task.status] || 'pendente',
          prioridade: priorityMapFromTaskGI[task.priority] || 'media',
          data_vencimento: task.due_date,
          tags: task.tags,
          taskgi_id: task.id,
        };

        if (existingTask) {
          // Só atualizar se a versão do TaskGI for mais recente
          const taskgiUpdated = new Date(task.updated_at);
          const localUpdated = new Date(existingTask.updated_at);

          if (taskgiUpdated > localUpdated) {
            const { error } = await supabaseClient
              .from('tarefas')
              .update(taskData)
              .eq('id', existingTask.id);

            if (error) {
              console.error('Error updating task:', error);
              throw error;
            }
            console.log('Task updated from TaskGI webhook:', existingTask.id);
          } else {
            console.log('Local task is more recent, skipping update');
          }
        } else {
          // Criar nova tarefa
          const { data: adminUser } = await supabaseClient
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1)
            .single();

          if (adminUser) {
            const { error } = await supabaseClient
              .from('tarefas')
              .insert({
                ...taskData,
                criado_por: adminUser.user_id,
              });

            if (error) {
              console.error('Error creating task:', error);
              throw error;
            }
            console.log('Task created from TaskGI webhook');
          }
        }
        break;
      }

      case 'task.deleted': {
        // Buscar e deletar tarefa local
        const { data: existingTask } = await supabaseClient
          .from('tarefas')
          .select('id')
          .eq('taskgi_id', task.id)
          .single();

        if (existingTask) {
          const { error } = await supabaseClient
            .from('tarefas')
            .delete()
            .eq('id', existingTask.id);

          if (error) {
            console.error('Error deleting task:', error);
            throw error;
          }
          console.log('Task deleted from TaskGI webhook:', existingTask.id);
        }
        break;
      }

      default:
        console.log('Unknown event type:', event);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('TaskGI webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
