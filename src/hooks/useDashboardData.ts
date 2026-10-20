import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  clientesAtivos: number;
  usuariosAtivos: number;
  documentosVencidos: number;
  novasLicitacoes: number;
  tarefasPendentes: number;
  tarefasConcluidas: number;
}

export interface DashboardFilters {
  startDate: Date | null;
  endDate: Date | null;
  clienteId: string | null;
}

export function useDashboardData(filters: DashboardFilters) {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    clientesAtivos: 0,
    usuariosAtivos: 0,
    documentosVencidos: 0,
    novasLicitacoes: 0,
    tarefasPendentes: 0,
    tarefasConcluidas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    const fetchClientes = async () => {
      if (!isAdmin) return;
      
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (data) setClientes(data);
    };

    fetchClientes();
  }, [isAdmin]);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      
      try {
        // Clientes ativos
        let clientesQuery = supabase
          .from('clientes')
          .select('id', { count: 'exact' })
          .eq('ativo', true);

        if (filters.clienteId) {
          clientesQuery = clientesQuery.eq('id', filters.clienteId);
        }

        // Usuários ativos
        let usuariosQuery = supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('ativo', true);

        if (filters.clienteId) {
          usuariosQuery = usuariosQuery.eq('cliente_id', filters.clienteId);
        }

        // Tarefas pendentes
        let tarefasPendentesQuery = supabase
          .from('tarefas')
          .select('id', { count: 'exact' })
          .in('status', ['pendente', 'em_andamento']);

        if (filters.clienteId) {
          tarefasPendentesQuery = tarefasPendentesQuery.eq('cliente_id', filters.clienteId);
        }

        if (filters.startDate) {
          tarefasPendentesQuery = tarefasPendentesQuery.gte('created_at', filters.startDate.toISOString());
        }

        if (filters.endDate) {
          tarefasPendentesQuery = tarefasPendentesQuery.lte('created_at', filters.endDate.toISOString());
        }

        // Tarefas concluídas
        let tarefasConcluidasQuery = supabase
          .from('tarefas')
          .select('id', { count: 'exact' })
          .eq('status', 'concluida');

        if (filters.clienteId) {
          tarefasConcluidasQuery = tarefasConcluidasQuery.eq('cliente_id', filters.clienteId);
        }

        if (filters.startDate) {
          tarefasConcluidasQuery = tarefasConcluidasQuery.gte('data_conclusao', filters.startDate.toISOString());
        }

        if (filters.endDate) {
          tarefasConcluidasQuery = tarefasConcluidasQuery.lte('data_conclusao', filters.endDate.toISOString());
        }

        const [
          { count: clientesAtivos },
          { count: usuariosAtivos },
          { count: tarefasPendentes },
          { count: tarefasConcluidas },
        ] = await Promise.all([
          clientesQuery,
          usuariosQuery,
          tarefasPendentesQuery,
          tarefasConcluidasQuery,
        ]);

        setMetrics({
          clientesAtivos: clientesAtivos || 0,
          usuariosAtivos: usuariosAtivos || 0,
          documentosVencidos: 0, // Será implementado quando tabela de documentos existir
          novasLicitacoes: 0, // Será implementado quando tabela de licitações existir
          tarefasPendentes: tarefasPendentes || 0,
          tarefasConcluidas: tarefasConcluidas || 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [filters.startDate, filters.endDate, filters.clienteId]);

  return { metrics, loading, clientes };
}
