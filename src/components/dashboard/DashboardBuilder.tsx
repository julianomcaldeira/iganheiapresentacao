import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, GripVertical, Trash2, BarChart3, LineChart, PieChart, Hash, Settings2, 
  Building2, ExternalLink, Save, RefreshCw, Layers, MousePointerClick, ChevronRight, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import { DashboardPreview } from './DashboardPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type WidgetType = 'number' | 'bar_chart' | 'line_chart' | 'pie_chart';

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  size: 'small' | 'medium' | 'large';
  navigationPath?: string;
  position: number;
}

interface Cliente {
  id: string;
  nome: string;
}

const widgetTypes = [
  { value: 'number', label: 'Número', icon: Hash, description: 'Exibe um valor numérico' },
  { value: 'bar_chart', label: 'Gráfico de Barras', icon: BarChart3, description: 'Comparação de valores' },
  { value: 'line_chart', label: 'Gráfico de Linhas', icon: LineChart, description: 'Evolução temporal' },
  { value: 'pie_chart', label: 'Gráfico de Pizza', icon: PieChart, description: 'Distribuição percentual' },
];

const dataSources = [
  // Dashboard
  { value: 'clientes_ativos', label: 'Clientes Ativos', category: 'Dashboard', path: '/clientes' },
  { value: 'usuarios_ativos', label: 'Usuários Ativos', category: 'Dashboard', path: '/admin' },
  // Tarefas
  { value: 'tarefas_pendentes', label: 'Tarefas Pendentes', category: 'Tarefas', path: '/tarefas' },
  { value: 'tarefas_concluidas', label: 'Tarefas Concluídas', category: 'Tarefas', path: '/tarefas' },
  { value: 'tarefas_por_status', label: 'Tarefas por Status', category: 'Tarefas', path: '/tarefas' },
  { value: 'tarefas_por_prioridade', label: 'Tarefas por Prioridade', category: 'Tarefas', path: '/tarefas' },
  { value: 'tarefas_vencidas', label: 'Tarefas Vencidas', category: 'Tarefas', path: '/tarefas' },
  // Clientes
  { value: 'total_clientes', label: 'Total de Clientes', category: 'Clientes', path: '/clientes' },
  { value: 'clientes_por_estado', label: 'Clientes por Estado', category: 'Clientes', path: '/clientes' },
  { value: 'empresas_por_cliente', label: 'Empresas por Cliente', category: 'Clientes', path: '/clientes' },
  // Licitações
  { value: 'licitacoes_abertas', label: 'Licitações Abertas', category: 'Licitações', path: '/licitacoes' },
  { value: 'licitacoes_ganhas', label: 'Licitações Ganhas', category: 'Licitações', path: '/licitacoes' },
  { value: 'licitacoes_perdidas', label: 'Licitações Perdidas', category: 'Licitações', path: '/licitacoes' },
  { value: 'licitacoes_por_status', label: 'Licitações por Status', category: 'Licitações', path: '/licitacoes' },
  { value: 'valor_licitacoes', label: 'Valor Total Licitações', category: 'Licitações', path: '/licitacoes' },
  // Contratos
  { value: 'contratos_ativos', label: 'Contratos Ativos', category: 'Contratos', path: '/contratos' },
  { value: 'contratos_vencendo', label: 'Contratos Vencendo', category: 'Contratos', path: '/contratos' },
  { value: 'valor_contratos', label: 'Valor Total Contratos', category: 'Contratos', path: '/contratos' },
  // Documentos
  { value: 'documentos_validos', label: 'Documentos Válidos', category: 'Documentos', path: '/documentos' },
  { value: 'documentos_vencidos', label: 'Documentos Vencidos', category: 'Documentos', path: '/documentos' },
  { value: 'documentos_vencendo', label: 'Docs Próximos Vencer', category: 'Documentos', path: '/documentos' },
  // Importação
  { value: 'importacoes_sucesso', label: 'Importações com Sucesso', category: 'Importação', path: '/importacao' },
  { value: 'importacoes_erro', label: 'Importações com Erro', category: 'Importação', path: '/importacao' },
  // Relatórios
  { value: 'relatorios_gerados', label: 'Relatórios Gerados', category: 'Relatórios', path: '/relatorios' },
  // Agenda
  { value: 'eventos_hoje', label: 'Eventos de Hoje', category: 'Agenda', path: '/agenda' },
  { value: 'eventos_semana', label: 'Eventos da Semana', category: 'Agenda', path: '/agenda' },
];

const groupedDataSources = dataSources.reduce((acc, source) => {
  if (!acc[source.category]) {
    acc[source.category] = [];
  }
  acc[source.category].push(source);
  return acc;
}, {} as Record<string, typeof dataSources>);

// Sample data per data source — used to render preview charts in the builder
const SAMPLE_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
];

function getSampleData(dataSource: string): { value: string; chartData: { name: string; value: number }[] } {
  const samples: Record<string, { value: string; chartData: { name: string; value: number }[] }> = {
    clientes_ativos:        { value: '24',         chartData: [{name:'Jan',value:18},{name:'Fev',value:20},{name:'Mar',value:22},{name:'Abr',value:24}] },
    usuarios_ativos:        { value: '186',        chartData: [{name:'Jan',value:120},{name:'Fev',value:145},{name:'Mar',value:170},{name:'Abr',value:186}] },
    tarefas_pendentes:      { value: '42',         chartData: [{name:'Seg',value:8},{name:'Ter',value:12},{name:'Qua',value:9},{name:'Qui',value:7},{name:'Sex',value:6}] },
    tarefas_concluidas:     { value: '128',        chartData: [{name:'Seg',value:22},{name:'Ter',value:28},{name:'Qua',value:30},{name:'Qui',value:25},{name:'Sex',value:23}] },
    tarefas_por_status:     { value: '4',          chartData: [{name:'Pendente',value:42},{name:'Em andamento',value:28},{name:'Revisão',value:14},{name:'Concluída',value:128}] },
    tarefas_por_prioridade: { value: '3',          chartData: [{name:'Alta',value:18},{name:'Média',value:32},{name:'Baixa',value:20}] },
    tarefas_vencidas:       { value: '7',          chartData: [{name:'Sem 1',value:3},{name:'Sem 2',value:5},{name:'Sem 3',value:6},{name:'Sem 4',value:7}] },
    total_clientes:         { value: '36',         chartData: [{name:'Q1',value:22},{name:'Q2',value:28},{name:'Q3',value:32},{name:'Q4',value:36}] },
    clientes_por_estado:    { value: '12 UFs',     chartData: [{name:'SP',value:14},{name:'RJ',value:8},{name:'MG',value:5},{name:'PR',value:4},{name:'RS',value:3},{name:'Outros',value:2}] },
    empresas_por_cliente:   { value: '2.4',        chartData: [{name:'STARTGI',value:3},{name:'ABC',value:5},{name:'Cliente C',value:2},{name:'Cliente D',value:1}] },
    licitacoes_abertas:     { value: '18',         chartData: [{name:'Jan',value:12},{name:'Fev',value:15},{name:'Mar',value:14},{name:'Abr',value:18}] },
    licitacoes_ganhas:      { value: '34',         chartData: [{name:'Jan',value:6},{name:'Fev',value:8},{name:'Mar',value:9},{name:'Abr',value:11}] },
    licitacoes_perdidas:    { value: '12',         chartData: [{name:'Jan',value:4},{name:'Fev',value:3},{name:'Mar',value:2},{name:'Abr',value:3}] },
    licitacoes_por_status:  { value: '6',          chartData: [{name:'Nova',value:18},{name:'Análise',value:12},{name:'Proposta',value:8},{name:'Disputa',value:5},{name:'Ganha',value:34},{name:'Perdida',value:12}] },
    valor_licitacoes:       { value: 'R$ 12.4M',   chartData: [{name:'Jan',value:1800},{name:'Fev',value:2400},{name:'Mar',value:3100},{name:'Abr',value:5100}] },
    contratos_ativos:       { value: '9',          chartData: [{name:'Jan',value:5},{name:'Fev',value:6},{name:'Mar',value:8},{name:'Abr',value:9}] },
    contratos_vencendo:     { value: '3',          chartData: [{name:'30d',value:1},{name:'60d',value:1},{name:'90d',value:3}] },
    valor_contratos:        { value: 'R$ 8.7M',    chartData: [{name:'Q1',value:2100},{name:'Q2',value:3400},{name:'Q3',value:4800},{name:'Q4',value:8700}] },
    documentos_validos:     { value: '142',        chartData: [{name:'Federal',value:38},{name:'Estadual',value:42},{name:'Municipal',value:36},{name:'Trabalh.',value:26}] },
    documentos_vencidos:    { value: '8',          chartData: [{name:'Jan',value:2},{name:'Fev',value:3},{name:'Mar',value:5},{name:'Abr',value:8}] },
    documentos_vencendo:    { value: '15',         chartData: [{name:'7d',value:4},{name:'15d',value:6},{name:'30d',value:15}] },
    importacoes_sucesso:    { value: '94%',        chartData: [{name:'Jan',value:88},{name:'Fev',value:91},{name:'Mar',value:93},{name:'Abr',value:94}] },
    importacoes_erro:       { value: '6%',         chartData: [{name:'Jan',value:12},{name:'Fev',value:9},{name:'Mar',value:7},{name:'Abr',value:6}] },
    relatorios_gerados:     { value: '47',         chartData: [{name:'Jan',value:8},{name:'Fev',value:12},{name:'Mar',value:14},{name:'Abr',value:13}] },
    eventos_hoje:           { value: '5',          chartData: [{name:'Manhã',value:2},{name:'Tarde',value:2},{name:'Noite',value:1}] },
    eventos_semana:         { value: '23',         chartData: [{name:'Seg',value:4},{name:'Ter',value:5},{name:'Qua',value:3},{name:'Qui',value:6},{name:'Sex',value:5}] },
  };
  return samples[dataSource] || { value: '128', chartData: [{name:'A',value:12},{name:'B',value:18},{name:'C',value:9},{name:'D',value:22}] };
}

function WidgetPreviewChart({ type, dataSource }: { type: WidgetType; dataSource?: string }) {
  const sample = getSampleData(dataSource || '');

  if (type === 'number') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-3xl font-bold text-foreground tracking-tight">{sample.value}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">exemplo</span>
      </div>
    );
  }

  if (type === 'bar_chart') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sample.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
          <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'line_chart') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sample.chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id={`grad-${dataSource}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
          <Tooltip contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
          <Area type="monotone" dataKey="value" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill={`url(#grad-${dataSource})`} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'pie_chart') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie data={sample.chartData} cx="50%" cy="50%" innerRadius={22} outerRadius={42} paddingAngle={2} dataKey="value">
            {sample.chartData.map((_, i) => (
              <Cell key={i} fill={SAMPLE_COLORS[i % SAMPLE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6 }} />
        </RePieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}



export function DashboardBuilder() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<DashboardWidget>>({
    type: 'number',
    size: 'small',
  });

  // Fetch clientes
  useEffect(() => {
    const fetchClientes = async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (error) {
        toast.error('Erro ao carregar clientes');
        return;
      }
      setClientes(data || []);
      setLoading(false);
    };
    fetchClientes();
  }, []);

  // Fetch widgets when client is selected
  useEffect(() => {
    if (!selectedClienteId) {
      setWidgets([]);
      return;
    }

    const fetchWidgets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('cliente_id', selectedClienteId)
        .order('position');
      
      if (error) {
        toast.error('Erro ao carregar widgets');
        setLoading(false);
        return;
      }

      setWidgets((data || []).map(w => ({
        id: w.id,
        type: w.widget_type as WidgetType,
        title: w.title,
        dataSource: w.data_source,
        size: w.size as 'small' | 'medium' | 'large',
        navigationPath: w.navigation_path || undefined,
        position: w.position,
      })));
      setLoading(false);
    };
    fetchWidgets();
  }, [selectedClienteId]);

  const handleAddWidget = async () => {
    if (!newWidget.title || !newWidget.dataSource || !selectedClienteId) return;

    const source = dataSources.find(s => s.value === newWidget.dataSource);
    const widget: DashboardWidget = {
      id: Date.now().toString(),
      type: newWidget.type as WidgetType,
      title: newWidget.title,
      dataSource: newWidget.dataSource,
      size: newWidget.size as 'small' | 'medium' | 'large',
      navigationPath: source?.path,
      position: widgets.length,
    };

    // Save to database
    const { data, error } = await supabase
      .from('dashboard_widgets')
      .insert({
        cliente_id: selectedClienteId,
        title: widget.title,
        widget_type: widget.type,
        data_source: widget.dataSource,
        size: widget.size,
        navigation_path: widget.navigationPath,
        position: widget.position,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao adicionar widget');
      return;
    }

    setWidgets([...widgets, { ...widget, id: data.id }]);
    setNewWidget({ type: 'number', size: 'small' });
    setIsAddDialogOpen(false);
    toast.success('Widget adicionado com sucesso');
  };

  const handleRemoveWidget = async (id: string) => {
    const { error } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao remover widget');
      return;
    }

    setWidgets(widgets.filter((w) => w.id !== id));
    toast.success('Widget removido');
  };

  const handleWidgetClick = (widget: DashboardWidget) => {
    if (widget.navigationPath) {
      navigate(widget.navigationPath);
    }
  };

  const getWidgetIcon = (type: WidgetType) => {
    const found = widgetTypes.find((w) => w.value === type);
    return found ? found.icon : Hash;
  };

  const getWidgetColSpan = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'medium':
        return 'col-span-2';
      case 'large':
        return 'col-span-3';
      default:
        return 'col-span-1';
    }
  };

  const selectedCliente = clientes.find(c => c.id === selectedClienteId);

  if (isPreviewMode && selectedClienteId && selectedCliente) {
    return (
      <DashboardPreview
        clienteId={selectedClienteId}
        clienteNome={selectedCliente.nome}
        widgets={widgets}
        onBack={() => setIsPreviewMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Selector Card */}
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Selecione o Cliente
          </CardTitle>
          <CardDescription>
            Escolha um cliente para configurar ou visualizar o dashboard personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:max-w-md">
              <Label className="mb-2 block">Cliente</Label>
              <Select value={selectedClienteId || ''} onValueChange={setSelectedClienteId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {cliente.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCliente && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <Badge variant="secondary" className="h-8 px-3">
                  <Layers className="h-3 w-3 mr-1" />
                  {widgets.length} widgets
                </Badge>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Builder - Only show when client is selected */}
      <AnimatePresence mode="wait">
        {selectedClienteId ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Dashboard de {selectedCliente?.nome}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="h-3 w-3" />
                      Clique nos cards para navegar às respectivas telas
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {widgets.length > 0 && (
                    <Button variant="outline" onClick={() => setIsPreviewMode(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                  )}
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Widget
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-40 rounded-lg" />
                    ))}
                  </div>
                ) : widgets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {widgets.map((widget, index) => {
                      const Icon = getWidgetIcon(widget.type);
                      const source = dataSources.find(s => s.value === widget.dataSource);
                      return (
                        <motion.div
                          key={widget.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            'group relative rounded-xl border-2 border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer',
                            getWidgetColSpan(widget.size)
                          )}
                          onClick={() => handleWidgetClick(widget)}
                        >
                          {/* Remove button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-destructive/10 hover:bg-destructive/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWidget(widget.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>

                          {/* Drag handle */}
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>

                          {/* Widget content */}
                          <div className="flex items-start gap-4 mt-4">
                            <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{widget.title}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {source?.label}
                              </p>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {source?.category}
                              </Badge>
                            </div>
                          </div>

                          {/* Preview area with sample chart */}
                          <div className="mt-4 h-28 bg-muted/30 rounded-lg p-2 overflow-hidden">
                            <WidgetPreviewChart type={widget.type} dataSource={widget.dataSource} />
                          </div>


                          {/* Navigation indicator */}
                          {widget.navigationPath && (
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <span>Ir para {source?.category}</span>
                                <ChevronRight className="h-3 w-3" />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Layers className="h-8 w-8 opacity-50" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">Nenhum widget configurado</h3>
                    <p className="text-sm mb-4">Comece adicionando widgets ao dashboard deste cliente</p>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar primeiro widget
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Selecione um cliente</h3>
            <p className="text-muted-foreground max-w-md">
              Escolha um cliente acima para criar ou editar o dashboard personalizado. 
              Cada cliente pode ter sua própria configuração de widgets.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Widget Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Widget
            </DialogTitle>
            <DialogDescription>
              Configure um novo widget para o dashboard de {selectedCliente?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título do Widget</Label>
              <Input
                value={newWidget.title || ''}
                onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                placeholder="Ex: Total de Licitações Abertas"
              />
            </div>

            {/* Widget Type */}
            <div className="space-y-2">
              <Label>Tipo de Visualização</Label>
              <div className="grid grid-cols-2 gap-3">
                {widgetTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewWidget({ ...newWidget, type: type.value as WidgetType })}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                      newWidget.type === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-md',
                      newWidget.type === type.value ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <type.icon className={cn(
                        'h-4 w-4',
                        newWidget.type === type.value ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Source */}
            <div className="space-y-2">
              <Label>Fonte de Dados</Label>
              <Select
                value={newWidget.dataSource}
                onValueChange={(value) => setNewWidget({ ...newWidget, dataSource: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fonte de dados..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(groupedDataSources).map(([category, sources]) => (
                    <SelectGroup key={category}>
                      <SelectLabel className="font-semibold text-primary">{category}</SelectLabel>
                      {sources.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          <div className="flex items-center gap-2">
                            <span>{source.label}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {source.path}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label>Tamanho</Label>
              <Select
                value={newWidget.size}
                onValueChange={(value) => setNewWidget({ ...newWidget, size: value as 'small' | 'medium' | 'large' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-3 border rounded bg-muted" />
                      Pequeno (1 coluna)
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-3 border rounded bg-muted" />
                      Médio (2 colunas)
                    </div>
                  </SelectItem>
                  <SelectItem value="large">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-3 border rounded bg-muted" />
                      Grande (3 colunas)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live preview of the widget being built */}
            {newWidget.type && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  Pré-visualização (dados de exemplo)
                </Label>
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {newWidget.title || 'Título do widget'}
                    </p>
                    <Badge variant="outline" className="text-[10px]">exemplo</Badge>
                  </div>
                  <div className="h-32 bg-card rounded-md p-2">
                    <WidgetPreviewChart
                      type={newWidget.type as WidgetType}
                      dataSource={newWidget.dataSource}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleAddWidget} 
              className="w-full"
              disabled={!newWidget.title || !newWidget.dataSource}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Widget
            </Button>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}