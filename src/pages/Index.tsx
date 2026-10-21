import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { LicitacoesChart } from '@/components/dashboard/LicitacoesChart';
import { RelevanciaChart } from '@/components/dashboard/RelevanciaChart';
import { PendenciasCard } from '@/components/dashboard/PendenciasCard';
import { LicitacoesRecentes } from '@/components/dashboard/LicitacoesRecentes';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { AdminMetricsGrid } from '@/components/dashboard/AdminMetricsGrid';
import { DashboardBuilder } from '@/components/dashboard/DashboardBuilder';
import { LicitacaoFlowDashboard } from '@/components/dashboard/LicitacaoFlowDashboard';
import { AprovacaoFlowDashboard } from '@/components/dashboard/AprovacaoFlowDashboard';
import { useDashboardData, DashboardFilters as Filters } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Target, Clock, CheckCircle, Trophy, DollarSign, FileSignature, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  return `R$ ${(value / 1000).toFixed(0)}K`;
};

const Index = () => {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    startDate: null,
    endDate: null,
    clienteId: null,
  });
  
  const { metrics, loading, clientes } = useDashboardData(filters);

  return (
    <MainLayout title="Dashboard" subtitle="Visão geral do sistema">
      {isAdmin ? (
        <Tabs defaultValue="visao-geral" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList>
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="fluxo">Fluxo Licitações</TabsTrigger>
              <TabsTrigger value="aprovacoes">Aprovações</TabsTrigger>
              <TabsTrigger value="construtor">Construtor</TabsTrigger>
            </TabsList>
            
            <DashboardFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              clientes={clientes}
            />
          </div>

          <TabsContent value="visao-geral" className="space-y-6">
            {/* Admin Metrics */}
            <AdminMetricsGrid metrics={metrics} loading={loading} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LicitacoesChart />
              </div>
              <RelevanciaChart />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PendenciasCard />
              <LicitacoesRecentes />
            </div>
          </TabsContent>

          <TabsContent value="fluxo">
            <LicitacaoFlowDashboard />
          </TabsContent>

          <TabsContent value="aprovacoes">
            <AprovacaoFlowDashboard />
          </TabsContent>

          <TabsContent value="construtor">
            <DashboardBuilder />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="pendencias" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pendencias">Pendências</TabsTrigger>
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo Licitações</TabsTrigger>
          </TabsList>

          <TabsContent value="pendencias" className="space-y-6">
            <PendenciasCard />
          </TabsContent>

          <TabsContent value="visao-geral" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total de Licitações"
                value={metrics.totalLicitacoes}
                change={12}
                changeType="positive"
                icon={FileText}
                iconColor="gradient-primary"
                delay={0}
              />
              <MetricCard
                title="Alta Relevância"
                value={metrics.licitacoesRelevantes}
                change={8}
                changeType="positive"
                icon={Target}
                iconColor="bg-success"
                delay={0.1}
              />
              <MetricCard
                title="Em Análise"
                value={metrics.emAnalise}
                icon={Clock}
                iconColor="bg-warning"
                delay={0.2}
              />
              <MetricCard
                title="Taxa de Sucesso"
                value={`${metrics.taxaSucesso}%`}
                change={5}
                changeType="positive"
                icon={Trophy}
                iconColor="gradient-success"
                delay={0.3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Valor Total Ganho"
                value={formatCurrency(metrics.valorTotalGanho)}
                change={18}
                changeType="positive"
                icon={DollarSign}
                iconColor="bg-success"
                delay={0.1}
              />
              <MetricCard
                title="Contratos Ativos"
                value={metrics.contratoAtivos}
                icon={FileSignature}
                iconColor="bg-primary"
                delay={0.15}
              />
              <MetricCard
                title="Aprovadas"
                value={metrics.aprovadas}
                icon={CheckCircle}
                iconColor="bg-success"
                delay={0.2}
              />
              <MetricCard
                title="Docs Vencendo"
                value={metrics.documentosVencendo}
                change={-2}
                changeType="negative"
                icon={AlertTriangle}
                iconColor="bg-destructive"
                delay={0.25}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LicitacoesChart />
              </div>
              <RelevanciaChart />
            </div>

            <LicitacoesRecentes />
          </TabsContent>

          <TabsContent value="fluxo">
            <LicitacaoFlowDashboard />
          </TabsContent>
        </Tabs>
      )}
    </MainLayout>
  );
};

export default Index;
