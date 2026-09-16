import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaskGISyncOptions {
  enabled: boolean;
  onSyncComplete?: (result: any) => void;
}

export const useTaskGISync = (options: TaskGISyncOptions = { enabled: false }) => {
  const { toast } = useToast();

  // Sincronizar uma tarefa específica com o TaskGI
  const syncTaskToTaskGI = useCallback(async (task: any) => {
    if (!options.enabled) return;

    try {
      console.log('Syncing task to TaskGI:', task.id);
      
      const { data, error } = await supabase.functions.invoke('taskgi-sync', {
        body: {
          action: 'push_to_taskgi',
          task,
        },
      });

      if (error) {
        console.error('TaskGI sync error:', error);
        throw error;
      }

      console.log('TaskGI sync result:', data);
      return data;
    } catch (error: any) {
      console.error('Failed to sync task to TaskGI:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar a tarefa com o TaskGI',
        variant: 'destructive',
      });
    }
  }, [options.enabled, toast]);

  // Deletar tarefa do TaskGI
  const deleteTaskFromTaskGI = useCallback(async (taskgiId: string) => {
    if (!options.enabled || !taskgiId) return;

    try {
      console.log('Deleting task from TaskGI:', taskgiId);
      
      const { data, error } = await supabase.functions.invoke('taskgi-sync', {
        body: {
          action: 'delete_from_taskgi',
          taskgi_id: taskgiId,
        },
      });

      if (error) {
        console.error('TaskGI delete error:', error);
        throw error;
      }

      console.log('TaskGI delete result:', data);
      return data;
    } catch (error: any) {
      console.error('Failed to delete task from TaskGI:', error);
    }
  }, [options.enabled]);

  // Sincronização completa
  const fullSync = useCallback(async () => {
    try {
      console.log('Starting full TaskGI sync...');
      
      const { data, error } = await supabase.functions.invoke('taskgi-sync', {
        body: { action: 'full_sync' },
      });

      if (error) {
        console.error('TaskGI full sync error:', error);
        throw error;
      }

      console.log('TaskGI full sync result:', data);
      
      toast({
        title: 'Sincronização concluída',
        description: `TaskGI: ${data.result.from_taskgi.created} criadas, ${data.result.from_taskgi.updated} atualizadas | Local: ${data.result.to_taskgi.created} criadas, ${data.result.to_taskgi.updated} atualizadas`,
      });

      options.onSyncComplete?.(data.result);
      return data.result;
    } catch (error: any) {
      console.error('Failed full TaskGI sync:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar com o TaskGI',
        variant: 'destructive',
      });
    }
  }, [toast, options]);

  // Listener para mudanças em tempo real
  useEffect(() => {
    if (!options.enabled) return;

    console.log('Setting up TaskGI realtime sync listener...');

    const channel = supabase
      .channel('taskgi-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas',
        },
        async (payload) => {
          console.log('Tarefa changed, syncing with TaskGI:', payload);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const task = payload.new as any;
            // Evitar loop: só sincronizar se não vier de sync externo
            // Verificar se a tarefa foi atualizada recentemente (< 5 segundos)
            const updatedAt = new Date(task.updated_at);
            const now = new Date();
            const diffMs = now.getTime() - updatedAt.getTime();
            
            if (diffMs < 2000) {
              // Mudança muito recente, pode ser de sync - ignorar para evitar loop
              console.log('Skipping sync - change too recent, might be from webhook');
              return;
            }

            await syncTaskToTaskGI(task);
          } else if (payload.eventType === 'DELETE') {
            const oldTask = payload.old as any;
            if (oldTask.taskgi_id) {
              await deleteTaskFromTaskGI(oldTask.taskgi_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up TaskGI realtime sync listener...');
      supabase.removeChannel(channel);
    };
  }, [options.enabled, syncTaskToTaskGI, deleteTaskFromTaskGI]);

  return {
    syncTaskToTaskGI,
    deleteTaskFromTaskGI,
    fullSync,
  };
};
