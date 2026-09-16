import { motion } from 'framer-motion';
import { Users, Building2, FileWarning, FileText, CheckCircle, Clock } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { DashboardMetrics } from '@/hooks/useDashboardData';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminMetricsGridProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export function AdminMetricsGrid({ metrics, loading }: AdminMetricsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <MetricCard
        title="Clientes Ativos"
        value={metrics.clientesAtivos}
        icon={Building2}
        iconColor="bg-primary"
        delay={0}
      />
      <MetricCard
        title="Usuários Ativos"
        value={metrics.usuariosAtivos}
        icon={Users}
        iconColor="bg-success"
        delay={0.05}
      />
      <MetricCard
        title="Docs Vencidos"
        value={metrics.documentosVencidos}
        icon={FileWarning}
        iconColor="bg-destructive"
        delay={0.1}
      />
      <MetricCard
        title="Novas Licitações"
        value={metrics.novasLicitacoes}
        icon={FileText}
        iconColor="bg-warning"
        delay={0.15}
      />
      <MetricCard
        title="Tarefas Pendentes"
        value={metrics.tarefasPendentes}
        icon={Clock}
        iconColor="bg-orange-500"
        delay={0.2}
      />
      <MetricCard
        title="Tarefas Concluídas"
        value={metrics.tarefasConcluidas}
        icon={CheckCircle}
        iconColor="bg-success"
        delay={0.25}
      />
    </div>
  );
}
