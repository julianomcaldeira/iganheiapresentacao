import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  PieChart,
  TrendingUp,
  Clock,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Database,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ReportBuilder } from '@/components/relatorios/ReportBuilder';
import { toast } from 'sonner';
import { exportReport } from '@/lib/exportUtils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Relatorio {
  id: string;
  nome: string;
  descricao?: string;
  categoria: 'licitacoes' | 'contratos' | 'financeiro' | 'documentos' | 'desempenho' | 'personalizado';
  tipo: 'tabela' | 'grafico' | 'dashboard' | 'personalizado';
  ultimaGeracao?: string;
  favorito: boolean;
  fonte?: string;
  campos?: any[];
  filtros?: any[];
}

const mockRelatorios: Relatorio[] = [
  {
    id: '1',
    nome: 'Licitações por Status',
    descricao: 'Distribuição das licitações por status atual',
    categoria: 'licitacoes',
    tipo: 'grafico',
    ultimaGeracao: '2024-01-15',
    favorito: true,
  },
  {
    id: '2',
    nome: 'Taxa de Sucesso',
    descricao: 'Percentual de licitações ganhas vs total participadas',
    categoria: 'desempenho',
    tipo: 'dashboard',
    ultimaGeracao: '2024-01-14',
    favorito: true,
  },
  {
    id: '3',
    nome: 'Contratos Ativos',
    descricao: 'Lista de contratos em vigência com valores e prazos',
    categoria: 'contratos',
    tipo: 'tabela',
    ultimaGeracao: '2024-01-13',
    favorito: false,
  },
  {
    id: '4',
    nome: 'Faturamento por Período',
    descricao: 'Análise de faturamento mensal/trimestral',
    categoria: 'financeiro',
    tipo: 'grafico',
    ultimaGeracao: '2024-01-12',
    favorito: false,
  },
  {
    id: '5',
    nome: 'Documentos Vencidos',
    descricao: 'Listagem de documentos com vencimento expirado',
    categoria: 'documentos',
    tipo: 'tabela',
    ultimaGeracao: '2024-01-10',
    favorito: false,
  },
];

const categoriaConfig: Record<string, { label: string; icon: any; color: string }> = {
  licitacoes: { label: 'Licitações', icon: FileText, color: 'bg-primary/10 text-primary' },
  contratos: { label: 'Contratos', icon: FileSpreadsheet, color: 'bg-info/10 text-info' },
  financeiro: { label: 'Financeiro', icon: BarChart3, color: 'bg-success/10 text-success' },
  documentos: { label: 'Documentos', icon: FileSpreadsheet, color: 'bg-warning/10 text-warning' },
  desempenho: { label: 'Desempenho', icon: TrendingUp, color: 'bg-purple-500/10 text-purple-500' },
  personalizado: { label: 'Personalizado', icon: Database, color: 'bg-accent text-accent-foreground' },
};

const tipoConfig: Record<string, { label: string; icon: any }> = {
  tabela: { label: 'Tabela', icon: FileSpreadsheet },
  grafico: { label: 'Gráfico', icon: BarChart3 },
  dashboard: { label: 'Dashboard', icon: PieChart },
  personalizado: { label: 'Personalizado', icon: Database },
};

export default function Relatorios() {
  const { profile, isAdmin } = useAuth();
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [relatorios, setRelatorios] = useState<Relatorio[]>(mockRelatorios);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const filteredRelatorios = relatorios.filter((relatorio) => {
    const matchesSearch =
      relatorio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      relatorio.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria =
      categoriaFilter === 'todos' || relatorio.categoria === categoriaFilter;
    const matchesTipo = tipoFilter === 'todos' || relatorio.tipo === tipoFilter;
    return matchesSearch && matchesCategoria && matchesTipo;
  });

  const favoritosRelatorios = relatorios.filter((r) => r.favorito);
  const personalizadosCount = relatorios.filter((r) => r.categoria === 'personalizado').length;

  const handleSaveReport = (report: any) => {
    const newRelatorio: Relatorio = {
      id: report.id,
      nome: report.nome,
      descricao: `Relatório personalizado - ${report.campos?.length || 0} campos`,
      categoria: 'personalizado',
      tipo: 'personalizado',
      ultimaGeracao: new Date().toISOString().split('T')[0],
      favorito: false,
      fonte: report.fonte,
      campos: report.campos,
      filtros: report.filtros,
    };
    setRelatorios((prev) => [newRelatorio, ...prev]);
  };

  const handleDeleteReport = (id: string) => {
    setRelatorios((prev) => prev.filter((r) => r.id !== id));
    toast.success('Relatório excluído');
  };

  const handleToggleFavorito = (id: string) => {
    setRelatorios((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorito: !r.favorito } : r))
    );
  };

  // Dados REAIS por categoria de relatório
  const [dadosReais, setDadosReais] = useState<Record<string, { columns: any[]; data: any[] }>>({});

  useEffect(() => {
    const carregar = async () => {
      const clienteId = profile?.cliente_id;
      try {
        let licQ = supabase
          .from('licitacoes')
          .select('numero, orgao, objeto, valor_estimado, status, cliente_id')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!isAdmin && clienteId) licQ = licQ.eq('cliente_id', clienteId);
        const { data: lics } = await licQ;

        const licitacoes: { columns: any[]; data: any[] } = {
          columns: [
            { key: 'numero', label: 'Número', type: 'text' },
            { key: 'orgao', label: 'Órgão', type: 'text' },
            { key: 'objeto', label: 'Objeto', type: 'text' },
            { key: 'valor', label: 'Valor', type: 'currency' },
            { key: 'status', label: 'Status', type: 'text' },
          ],
          data: (lics || []).map((l: any) => ({
            numero: l.numero,
            orgao: l.orgao,
            objeto: l.objeto,
            valor: Number(l.valor_estimado || 0),
            status: l.status,
          })),
        };

        // Documentos (base real do cliente)
        let licIds: string[] = [];
        if (clienteId) {
          const { data: licsCli } = await supabase.from('licitacoes').select('id').eq('cliente_id', clienteId);
          licIds = (licsCli || []).map((l: any) => l.id);
        }
        let empQ = supabase.from('empresas').select('id, razao_social, cliente_id');
        if (!isAdmin && clienteId) empQ = empQ.eq('cliente_id', clienteId);
        const { data: emps } = await empQ;
        const empresaPorId = new Map((emps || []).map((e: any) => [e.id, e.razao_social]));

        let docs: any[] = [];
        if (licIds.length > 0) {
          const { data: checklist } = await supabase
            .from('licitacao_documentos_checklist')
            .select('nome, status, data_validade, licitacao_id')
            .in('licitacao_id', licIds)
            .limit(100);
          const { data: licNumeros } = await supabase.from('licitacoes').select('id, numero').in('id', licIds);
          const numPorLic = new Map((licNumeros || []).map((l: any) => [l.id, l.numero]));
          docs = (checklist || []).map((d: any) => ({
            nome: d.nome,
            empresa: numPorLic.get(d.licitacao_id) || '-',
            dataVencimento: d.data_validade ? new Date(d.data_validade).toLocaleDateString('pt-BR') : '-',
            status: d.status === 'concluido' ? 'Válido' : 'Pendente',
          }));
        }

        const documentos: { columns: any[]; data: any[] } = {
          columns: [
            { key: 'nome', label: 'Documento', type: 'text' },
            { key: 'empresa', label: 'Licitação', type: 'text' },
            { key: 'dataVencimento', label: 'Vencimento', type: 'text' },
            { key: 'status', label: 'Status', type: 'text' },
          ],
          data: docs,
        };

        // Contratos (empenhos do tipo contrato)
        let conQ = supabase
          .from('empenhos')
          .select('numero, orgao_emissor, valor_empenhado, data_emissao, data_vencimento, status, cliente_id')
          .eq('tipo', 'contrato')
          .limit(100);
        if (!isAdmin && clienteId) conQ = conQ.eq('cliente_id', clienteId);
        const { data: cons } = await conQ;
        const contratos: { columns: any[]; data: any[] } = {
          columns: [
            { key: 'numero', label: 'Número', type: 'text' },
            { key: 'orgao', label: 'Órgão', type: 'text' },
            { key: 'valorTotal', label: 'Valor Total', type: 'currency' },
            { key: 'dataInicio', label: 'Início', type: 'date' },
            { key: 'dataFim', label: 'Fim', type: 'date' },
            { key: 'status', label: 'Status', type: 'text' },
          ],
          data: (cons || []).map((c: any) => ({
            numero: c.numero,
            orgao: c.orgao_emissor,
            valorTotal: Number(c.valor_empenhado || 0),
            dataInicio: c.data_emissao,
            dataFim: c.data_vencimento,
            status: c.status,
          })),
        };

        setDadosReais({ licitacoes, documentos, contratos });
      } catch (e) {
        console.error('[Relatórios] Erro ao carregar dados:', e);
      }
    };
    carregar();
  }, [profile?.cliente_id, isAdmin]);

  // Mock data for predefined reports
  const getMockDataForReport = (relatorio: Relatorio) => {
    const mockDataByCategory: Record<string, { columns: any[]; data: any[] }> = {
      licitacoes: {
        columns: [
          { key: 'numero', label: 'Número', type: 'text' },
          { key: 'orgao', label: 'Órgão', type: 'text' },
          { key: 'objeto', label: 'Objeto', type: 'text' },
          { key: 'valor', label: 'Valor', type: 'currency' },
          { key: 'status', label: 'Status', type: 'text' },
        ],
        data: [
          { numero: 'PE-001/2024', orgao: 'Prefeitura de São Paulo', objeto: 'Equipamentos de TI', valor: 150000, status: 'Ganha' },
          { numero: 'PE-002/2024', orgao: 'Governo do Estado', objeto: 'Serviços de manutenção', valor: 80000, status: 'Participando' },
          { numero: 'CC-003/2024', orgao: 'Ministério da Saúde', objeto: 'Medicamentos', valor: 500000, status: 'Em análise' },
        ],
      },
      contratos: {
        columns: [
          { key: 'numero', label: 'Número', type: 'text' },
          { key: 'orgao', label: 'Órgão', type: 'text' },
          { key: 'valorTotal', label: 'Valor Total', type: 'currency' },
          { key: 'dataInicio', label: 'Início', type: 'date' },
          { key: 'dataFim', label: 'Fim', type: 'date' },
          { key: 'status', label: 'Status', type: 'text' },
        ],
        data: [
          { numero: 'CT-001/2024', orgao: 'Prefeitura SP', valorTotal: 150000, dataInicio: '2024-02-01', dataFim: '2025-02-01', status: 'Ativo' },
          { numero: 'CT-002/2024', orgao: 'Governo Estado', valorTotal: 80000, dataInicio: '2024-03-01', dataFim: '2024-09-01', status: 'Ativo' },
        ],
      },
      financeiro: {
        columns: [
          { key: 'mes', label: 'Mês', type: 'text' },
          { key: 'faturamento', label: 'Faturamento', type: 'currency' },
          { key: 'custos', label: 'Custos', type: 'currency' },
          { key: 'lucro', label: 'Lucro', type: 'currency' },
        ],
        data: [
          { mes: 'Janeiro/2024', faturamento: 250000, custos: 150000, lucro: 100000 },
          { mes: 'Fevereiro/2024', faturamento: 320000, custos: 180000, lucro: 140000 },
          { mes: 'Março/2024', faturamento: 280000, custos: 160000, lucro: 120000 },
        ],
      },
      documentos: {
        columns: [
          { key: 'nome', label: 'Documento', type: 'text' },
          { key: 'empresa', label: 'Empresa', type: 'text' },
          { key: 'dataVencimento', label: 'Vencimento', type: 'date' },
          { key: 'status', label: 'Status', type: 'text' },
        ],
        data: [
          { nome: 'CND Federal', empresa: 'Tech Solutions', dataVencimento: '2024-06-15', status: 'Vencido' },
          { nome: 'FGTS', empresa: 'Tech Solutions', dataVencimento: '2024-05-20', status: 'Vencido' },
        ],
      },
      desempenho: {
        columns: [
          { key: 'metrica', label: 'Métrica', type: 'text' },
          { key: 'valor', label: 'Valor', type: 'text' },
          { key: 'variacao', label: 'Variação', type: 'text' },
        ],
        data: [
          { metrica: 'Taxa de Sucesso', valor: '68%', variacao: '+5%' },
          { metrica: 'Licitações Participadas', valor: '45', variacao: '+12' },
          { metrica: 'Valor Total Ganho', valor: 'R$ 2.5M', variacao: '+R$ 500K' },
        ],
      },
    };

    // For custom reports, use saved fields
    if (relatorio.categoria === 'personalizado' && relatorio.campos) {
      return {
        columns: relatorio.campos,
        data: [], // Custom reports would have their own data
      };
    }

    return dadosReais[relatorio.categoria] || mockDataByCategory[relatorio.categoria] || mockDataByCategory.licitacoes;
  };

  const handleExport = (relatorio: Relatorio, format: 'csv' | 'excel' | 'pdf') => {
    const { columns, data } = getMockDataForReport(relatorio);
    
    exportReport(format, {
      filename: relatorio.nome.toLowerCase().replace(/\s+/g, '_'),
      title: relatorio.nome,
      columns,
      data,
    });

    const formatLabels = { csv: 'CSV', excel: 'Excel', pdf: 'PDF' };
    toast.success(`${formatLabels[format]} exportado com sucesso!`);
  };

  return (
    <MainLayout title="Relatórios" subtitle="Análises e exportações de dados">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border shadow-sm"
        >
          <p className="text-sm text-muted-foreground">Total Relatórios</p>
          <p className="text-2xl font-bold text-foreground">{relatorios.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
        >
          <p className="text-sm text-primary">Favoritos</p>
          <p className="text-2xl font-bold text-primary">{favoritosRelatorios.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-success/10 border border-success/20 shadow-sm"
        >
          <p className="text-sm text-success">Personalizados</p>
          <p className="text-2xl font-bold text-success">{personalizadosCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-info/10 border border-info/20 shadow-sm"
        >
          <p className="text-sm text-info">Dashboards</p>
          <p className="text-2xl font-bold text-info">
            {relatorios.filter((r) => r.tipo === 'dashboard').length}
          </p>
        </motion.div>
      </div>

      {/* Quick Access - Favorites */}
      {favoritosRelatorios.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">ACESSO RÁPIDO</h3>
          <div className="flex flex-wrap gap-2">
            {favoritosRelatorios.map((relatorio) => {
              const catConfig = categoriaConfig[relatorio.categoria];
              const CatIcon = catConfig?.icon || Database;
              return (
                <Button
                  key={relatorio.id}
                  variant="outline"
                  className="h-auto py-2 px-4"
                >
                  <CatIcon className="w-4 h-4 mr-2" />
                  {relatorio.nome}
                </Button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row gap-4 mb-6 p-4 rounded-xl bg-card border border-border shadow-sm"
      >
        <div className="relative flex-1">
          <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar relatórios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-secondary border-0"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[150px] bg-secondary border-0">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="licitacoes">Licitações</SelectItem>
              <SelectItem value="contratos">Contratos</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="documentos">Documentos</SelectItem>
              <SelectItem value="desempenho">Desempenho</SelectItem>
              <SelectItem value="personalizado">Personalizados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px] bg-secondary border-0">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="tabela">Tabela</SelectItem>
              <SelectItem value="grafico">Gráfico</SelectItem>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <Button
          className="gradient-primary text-primary-foreground shadow-glow"
          onClick={() => setIsBuilderOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Relatório
        </Button>
      </motion.div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRelatorios.map((relatorio, index) => {
          const catConfig = categoriaConfig[relatorio.categoria] || categoriaConfig.personalizado;
          const tipoConf = tipoConfig[relatorio.tipo] || tipoConfig.personalizado;
          const CatIcon = catConfig.icon;
          const TipoIcon = tipoConf.icon;

          return (
            <motion.div
              key={relatorio.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card className="group hover:shadow-lg transition-all cursor-pointer border-border hover:border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        catConfig.color
                      )}
                    >
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        <TipoIcon className="w-3 h-3 mr-1" />
                        {tipoConf.label}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors mt-3">
                    {relatorio.nome}
                  </CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {relatorio.descricao || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    {relatorio.ultimaGeracao && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Gerado em{' '}
                          {new Date(relatorio.ultimaGeracao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-1 ml-auto">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport(relatorio, 'csv')}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Exportar CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(relatorio, 'pdf')}>
                            <FileText className="w-4 h-4 mr-2" />
                            Exportar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(relatorio, 'excel')}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Exportar Excel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {relatorio.categoria === 'personalizado' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReport(relatorio.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredRelatorios.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum relatório encontrado
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Ajuste os filtros ou crie um novo relatório personalizado.
          </p>
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Relatório
          </Button>
        </motion.div>
      )}

      {/* Report Builder Dialog */}
      <ReportBuilder
        open={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        onSave={handleSaveReport}
      />
    </MainLayout>
  );
}
