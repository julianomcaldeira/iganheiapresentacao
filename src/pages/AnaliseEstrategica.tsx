import { useState, useEffect } from 'react';
import { DEMO_MODE } from '@/lib/demoMode';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  PieChart,
  Lightbulb,
  Shield,
  DollarSign,
  Users,
  FileText,
  RefreshCw,
  Download,
  Sparkles,
  History,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  resumo_executivo: string;
  indicadores: {
    total_licitacoes: number;
    taxa_sucesso: number;
    taxa_participacao: number;
    valor_total_ganho: number;
    valor_total_perdido: number;
    ticket_medio: number;
    principais_orgaos: string[];
    modalidades_frequentes: string[];
  };
  analise_competitiva: {
    posicionamento: string;
    principais_concorrentes: Array<{
      nome: string;
      frequencia: number;
      taxa_vitoria: number;
      nivel_risco: string;
    }>;
    vantagens_competitivas: string[];
    ameacas: string[];
  };
  tendencias: {
    crescimento: string;
    setores_promissores: string[];
    alertas: string[];
    previsoes: string[];
  };
  recomendacoes: {
    estrategicas: string[];
    operacionais: string[];
    urgentes: string[];
  };
  score_geral: number;
}

interface Cliente {
  id: string;
  nome: string;
}

interface HistoricoAnalise {
  id: string;
  cliente_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  resultado: AnalysisResult;
  score_geral: number;
  total_licitacoes: number;
  taxa_sucesso: number;
  valor_total_ganho: number;
  valor_total_perdido: number;
  created_at: string;
  cliente?: { nome: string };
}

const periodOptions = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'personalizado', label: 'Período personalizado' },
];

export default function AnaliseEstrategica() {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('resumo');
  const [mainTab, setMainTab] = useState<'analise' | 'historico'>('analise');
  const [historico, setHistorico] = useState<HistoricoAnalise[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [selectedHistorico, setSelectedHistorico] = useState<HistoricoAnalise | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchClientes();
    } else if (profile?.cliente_id) {
      setSelectedCliente(profile.cliente_id);
    }
  }, [isAdmin, profile]);

  useEffect(() => {
    if (mainTab === 'historico') {
      fetchHistorico();
    }
  }, [mainTab, selectedCliente]);

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    try {
      let query = supabase
        .from('analise_estrategica_historico')
        .select('*, cliente:clientes(nome)')
        .order('periodo_fim', { ascending: false });

      if (selectedCliente && !isAdmin) {
        query = query.eq('cliente_id', selectedCliente);
      } else if (selectedCliente && selectedCliente !== 'all') {
        query = query.eq('cliente_id', selectedCliente);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setHistorico((data as unknown as HistoricoAnalise[]) || []);
    } catch (error) {
      console.error('Error fetching historico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');

    if (!error && data) {
      setClientes(data);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case '7d':
        return { from: subDays(now, 7), to: now };
      case '30d':
        return { from: subDays(now, 30), to: now };
      case '90d':
        return { from: subDays(now, 90), to: now };
      case 'mes_atual':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'mes_anterior':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'personalizado':
        return customDateRange;
      default:
        return { from: subDays(now, 30), to: now };
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCliente) {
      toast.error('Selecione um cliente para análise');
      return;
    }

    const dateRange = getDateRange();
    if (!dateRange.from || !dateRange.to) {
      toast.error('Selecione um período válido');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Modo demonstração: devolve análise pré-fabricada sem chamar IA real
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 600));
        const demo: AnalysisResult = {
          resumo_executivo:
            'Análise estratégica gerada em modo demonstração. O cliente apresenta desempenho consistente em pregões eletrônicos de TI e equipamentos médicos, com oportunidades de expansão no Sudeste e Centro-Oeste. Recomenda-se priorizar órgãos com histórico de pagamento regular e revisar margens em itens de baixa rotatividade.',
          indicadores: {
            total_licitacoes: 42,
            taxa_sucesso: 38.5,
            taxa_participacao: 71.4,
            valor_total_ganho: 12_480_000,
            valor_total_perdido: 18_920_000,
            ticket_medio: 412_000,
            principais_orgaos: ['Ministério da Educação', 'TRF 3ª Região', 'INSS', 'Banco do Brasil', 'SERPRO'],
            modalidades_frequentes: ['Pregão Eletrônico', 'Pregão Eletrônico SRP', 'Dispensa'],
          },
          analise_competitiva: {
            posicionamento: 'Posicionamento sólido em TI corporativa; concorrência fragmentada em médio porte.',
            principais_concorrentes: [
              { nome: 'TechBR Soluções', frequencia: 14, taxa_vitoria: 32, nivel_risco: 'alto' },
              { nome: 'InfoGov Brasil', frequencia: 9, taxa_vitoria: 22, nivel_risco: 'medio' },
              { nome: 'NetCloud Distribuidora', frequencia: 6, taxa_vitoria: 18, nivel_risco: 'baixo' },
            ],
            vantagens_competitivas: [
              'Documentação habilitatória sempre em dia',
              'Capacidade técnica comprovada em projetos de grande porte',
              'Logística nacional consolidada',
            ],
            ameacas: [
              'Entrada de concorrente regional com preços agressivos',
              'Possível mudança nas regras de SRP no 2º semestre',
            ],
          },
          tendencias: {
            crescimento: 'Crescimento estimado de 14% em pregões de TI nos próximos 6 meses.',
            setores_promissores: ['Saúde pública', 'Educação federal', 'Segurança pública'],
            alertas: ['3 contratos próximos do vencimento sem renovação iniciada'],
            previsoes: [
              'Aumento de demanda por soluções de cibersegurança',
              'Maior fatia para SRP em órgãos federais',
            ],
          },
          recomendacoes: {
            urgentes: [
              'Iniciar renovação dos contratos vincendos nos próximos 60 dias',
              'Reforçar equipe de proposta para pregões SRP',
            ],
            estrategicas: [
              'Expandir cobertura comercial para Centro-Oeste',
              'Desenvolver parceria com distribuidor de equipamentos médicos',
            ],
            operacionais: [
              'Padronizar planilha de composição de custos por modalidade',
              'Automatizar verificação de CND antes da entrega de propostas',
            ],
          },
          score_geral: 78,
        };
        setAnalysisResult(demo);
        toast.success('Análise estratégica concluída (modo demonstração)');
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-estrategico', {
        body: {
          clienteId: selectedCliente,
          dataInicio: format(dateRange.from, 'yyyy-MM-dd'),
          dataFim: format(dateRange.to, 'yyyy-MM-dd'),
        },
      });

      if (error) throw error;

      if (data?.success && data?.analysis) {
        setAnalysisResult(data.analysis);
        toast.success('Análise estratégica concluída');
      } else {
        throw new Error(data?.error || 'Falha na análise');
      }
    } catch (error: any) {
      console.error('Error analyzing:', error);
      toast.error(error.message || 'Erro ao realizar análise estratégica');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRiskBadgeVariant = (risk: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (risk.toLowerCase()) {
      case 'alto':
        return 'destructive';
      case 'médio':
        return 'secondary';
      case 'baixo':
        return 'outline';
      default:
        return 'default';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const viewHistoricoDetail = (item: HistoricoAnalise) => {
    setSelectedHistorico(item);
    setAnalysisResult(item.resultado);
    setMainTab('analise');
  };

  return (
    <MainLayout title="Análise Estratégica" subtitle="Análise inteligente de indicadores e performance em licitações">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Análise Estratégica
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise inteligente de indicadores e performance em licitações
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={mainTab === 'analise' ? 'default' : 'outline'}
              onClick={() => setMainTab('analise')}
            >
              <Brain className="w-4 h-4 mr-2" />
              Nova Análise
            </Button>
            <Button 
              variant={mainTab === 'historico' ? 'default' : 'outline'}
              onClick={() => setMainTab('historico')}
            >
              <History className="w-4 h-4 mr-2" />
              Histórico Mensal
            </Button>
          </div>
        </div>

        {/* Historico Tab */}
        {mainTab === 'historico' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Análises Mensais
              </CardTitle>
              <CardDescription>
                Análises estratégicas geradas automaticamente no final de cada mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum histórico encontrado</h3>
                  <p className="text-muted-foreground text-sm">
                    As análises mensais serão geradas automaticamente no final de cada mês.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historico.map((item) => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "text-3xl font-bold",
                              getScoreColor(item.score_geral || 0)
                            )}>
                              {item.score_geral || 0}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {format(new Date(item.periodo_inicio), 'MMMM yyyy', { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.cliente?.nome || 'Cliente'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Licitações</p>
                              <p className="font-semibold">{item.total_licitacoes}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                              <p className="font-semibold text-green-500">{Number(item.taxa_sucesso || 0).toFixed(1)}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Valor Ganho</p>
                              <p className="font-semibold text-primary">{formatCurrency(Number(item.valor_total_ganho) || 0)}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => viewHistoricoDetail(item)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        {mainTab === 'analise' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Parâmetros da Análise
            </CardTitle>
            <CardDescription>
              Selecione o cliente e período para gerar a análise estratégica com IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              {isAdmin && (
                <div className="space-y-2 min-w-[200px]">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 min-w-[180px]">
                <label className="text-sm font-medium">Período</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPeriod === 'personalizado' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Intervalo</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from ? (
                          customDateRange.to ? (
                            <>
                              {format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                              {format(customDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                            </>
                          ) : (
                            format(customDateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                          )
                        ) : (
                          'Selecione as datas'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={customDateRange.from}
                        selected={{ from: customDateRange.from, to: customDateRange.to }}
                        onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing || !selectedCliente}
                className="min-w-[180px]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Gerar Análise
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Loading State */}
        {mainTab === 'analise' && isAnalyzing && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-8 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {mainTab === 'analise' && analysisResult && !isAnalyzing && (
          <div className="space-y-6">
            {/* Score Card */}
            <Card className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "text-6xl font-bold",
                      getScoreColor(analysisResult.score_geral)
                    )}>
                      {analysisResult.score_geral}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Score Geral</p>
                      <p className="text-lg font-semibold">Performance do Período</p>
                    </div>
                  </div>
                  <div className="flex-1 w-full lg:w-auto">
                    <Progress 
                      value={analysisResult.score_geral} 
                      className="h-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Licitações</p>
                      <p className="text-2xl font-bold">{analysisResult.indicadores.total_licitacoes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold">{analysisResult.indicadores.taxa_sucesso.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <DollarSign className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Ganho</p>
                      <p className="text-2xl font-bold">{formatCurrency(analysisResult.indicadores.valor_total_ganho)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Target className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">{formatCurrency(analysisResult.indicadores.ticket_medio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="resumo">Resumo</TabsTrigger>
                <TabsTrigger value="competitivo">Competitivo</TabsTrigger>
                <TabsTrigger value="tendencias">Tendências</TabsTrigger>
                <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
                <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Resumo Executivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {analysisResult.resumo_executivo}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="competitivo" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Análise Competitiva
                    </CardTitle>
                    <CardDescription>{analysisResult.analise_competitiva.posicionamento}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Principais Concorrentes</h4>
                      <div className="space-y-3">
                        {analysisResult.analise_competitiva.principais_concorrentes.map((concorrente, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{concorrente.nome}</span>
                              <Badge variant={getRiskBadgeVariant(concorrente.nivel_risco)}>
                                Risco {concorrente.nivel_risco}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">
                                {concorrente.frequencia} participações
                              </span>
                              <span className={cn(
                                "font-medium",
                                concorrente.taxa_vitoria >= 50 ? "text-red-500" : "text-green-500"
                              )}>
                                {concorrente.taxa_vitoria.toFixed(1)}% vitórias
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Vantagens Competitivas
                        </h4>
                        <ul className="space-y-2">
                          {analysisResult.analise_competitiva.vantagens_competitivas.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Ameaças Identificadas
                        </h4>
                        <ul className="space-y-2">
                          {analysisResult.analise_competitiva.ameacas.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <XCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tendencias" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Tendências e Previsões
                    </CardTitle>
                    <CardDescription>{analysisResult.tendencias.crescimento}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Setores Promissores</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.tendencias.setores_promissores.map((setor, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {setor}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Alertas
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.tendencias.alertas.map((alerta, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                            {alerta}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                        Previsões
                      </h4>
                      <ul className="space-y-2">
                        {analysisResult.tendencias.previsoes.map((previsao, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            {previsao}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recomendacoes" className="mt-4 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-red-500/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                        <AlertTriangle className="w-5 h-5" />
                        Urgentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysisResult.recomendacoes.urgentes.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-red-500/10">
                            <Shield className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-primary">
                        <Target className="w-5 h-5" />
                        Estratégicas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysisResult.recomendacoes.estrategicas.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-primary/10">
                            <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-500">
                        <PieChart className="w-5 h-5" />
                        Operacionais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {analysisResult.recomendacoes.operacionais.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm p-2 rounded bg-blue-500/10">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="detalhes" className="mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Principais Órgãos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysisResult.indicadores.principais_orgaos.map((orgao, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                              {index + 1}
                            </span>
                            {orgao}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Modalidades Frequentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.indicadores.modalidades_frequentes.map((modalidade, index) => (
                          <Badge key={index} variant="outline" className="px-3 py-1.5">
                            {modalidade}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Taxa de Participação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-bold text-primary">
                          {analysisResult.indicadores.taxa_participacao.toFixed(1)}%
                        </div>
                        <Progress value={analysisResult.indicadores.taxa_participacao} className="flex-1" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Valor Perdido</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-8 h-8 text-red-500" />
                        <div>
                          <p className="text-3xl font-bold text-red-500">
                            {formatCurrency(analysisResult.indicadores.valor_total_perdido)}
                          </p>
                          <p className="text-sm text-muted-foreground">em licitações não ganhas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Empty State */}
        {mainTab === 'analise' && !analysisResult && !isAnalyzing && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Brain className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma análise realizada</h3>
              <p className="text-muted-foreground max-w-md">
                Selecione um cliente e período, depois clique em "Gerar Análise" para obter insights estratégicos sobre as licitações.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
