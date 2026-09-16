import { MainLayout } from '@/components/layout/MainLayout';
import { ConcorrentesDashboard } from '@/components/licitacoes/ConcorrentesDashboard';

export default function Concorrentes() {
  return (
    <MainLayout 
      title="Dashboard de Concorrentes" 
      subtitle="Análise de desempenho e histórico de participação dos concorrentes"
    >
      <ConcorrentesDashboard />
    </MainLayout>
  );
}
