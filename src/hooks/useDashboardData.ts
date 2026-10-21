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
  // Métricas do processo licitatório (dados reais)
  totalLicitacoes: number;
  licitacoesRelevantes: number;
  emAnalise: number;
  aprovadas: number;
  taxaSucesso: number;
  valorTotalGanho: number;
  contratoAtivos: number;
  documentosVencendo: number;
}

export interface DashboardFilters {
  startDate: Date | null;
  endDate: Date | null;
  clienteId: string | null;
}

export function useDashboardData(filters: DashboardFilters) {
  const { isAdmin, profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    clientesAtivos: 0,
    usuariosAtivos: 0,
    documentosVencidos: 0,
    novasLicitacoes: 0,
    tarefasPendentes: 0,
    tarefasConcluidas: 0,
    totalLicitacoes: 0,
    licitacoesRelevantes: 0,
    emAnalise: 0,
    aprovadas: 0,
    taxaSucesso: 0,
    valorTotalGanho: 0,
    contratoAtivos: 0,
    documentosVencendo: 0,
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

        // ===== Métricas do processo licitatório (dados reais) =====
        const clienteEfetivo = filters.clienteId || (!isAdmin ? profile?.cliente_id : null);

        let licQuery = supabase.from('licitacoes').select('id, status, relevancia, valor_estimado, cliente_id');
        if (clienteEfetivo) licQuery = licQuery.eq('cliente_id', clienteEfetivo);

        let relQuery = supabase.from('licitacoes').select('id', { count: 'exact' }).eq('relevancia', 'alta');
        if (clienteEfetivo) relQuery = relQuery.eq('cliente_id', clienteEfetivo);

        let analiseQuery = supabase
          .from('licitacoes')
          .select('id', { count: 'exact' })
          .in('status', ['em_analise', 'em_andamento']);
        if (clienteEfetivo) analiseQuery = analiseQuery.eq('cliente_id', clienteEfetivo);

        let itensQuery = supabase.from('licitacao_resultado_itens').select('resultado, valor_vencedor, licitacao_id');
        let etapaAprovQuery = supabase
          .from('licitacao_etapa_execucao')
          .select('id', { count: 'exact' })
          .eq('etapa_codigo', 'aprovacoes')
          .eq('status', 'concluido');

        let contratoQuery = supabase
          .from('empenhos')
          .select('id', { count: 'exact' })
          .eq('tipo', 'contrato')
          .eq('status', 'ativo');
        if (clienteEfetivo) contratoQuery = contratoQuery.eq('cliente_id', clienteEfetivo);

        const [
          { data: licRows },
          { count: licitacoesRelevantes },
          { count: emAnalise },
          { data: itens },
          { count: aprovadas },
          { count: contratoAtivos },
        ] = await Promise.all([
          licQuery,
          relQuery,
          analiseQuery,
          itensQuery,
          etapaAprovQuery,
          contratoQuery,
        ]);

        const licIds = new Set((licRows || []).map((l: any) => l.id as string));
        const itensDoCliente = (itens || []).filter((i: any) => licIds.has(i.licitacao_id));
        const ganhos = itensDoCliente.filter((i: any) => i.resultado === 'ganhou' || i.resultado === 'ganho');
        const perdidos = itensDoCliente.filter((i: any) => i.resultado === 'perdeu' || i.resultado === 'perdido');
        const totalItens = ganhos.length + perdidos.length;
        const valorTotalGanho = ganhos.reduce((s, i: any) => s + Number(i.valor_vencedor || 0), 0);

        setMetrics({
          clientesAtivos: clientesAtivos || 0,
          usuariosAtivos: usuariosAtivos || 0,
          documentosVencidos: 0,
          novasLicitacoes: 0,
          tarefasPendentes: tarefasPendentes || 0,
          tarefasConcluidas: tarefasConcluidas || 0,
          totalLicitacoes: licRows?.length || 0,
          licitacoesRelevantes: licitacoesRelevantes || 0,
          emAnalise: emAnalise || 0,
          aprovadas: aprovadas || 0,
          taxaSucesso: totalItens > 0 ? Math.round((ganhos.length / totalItens) * 100) : 0,
          valorTotalGanho,
          contratoAtivos: contratoAtivos || 0,
          documentosVencendo: 0,
        });
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [filters.startDate, filters.endDate, filters.clienteId, isAdmin, profile?.cliente_id]);

  return { metrics, loading, clientes };
}
