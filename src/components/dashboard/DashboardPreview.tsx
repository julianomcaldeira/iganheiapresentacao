import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BarChart3, LineChart, PieChart, Hash, ArrowLeft, Loader2,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart as ReLineChart, Line, PieChart as RePieChart, Pie, Cell,
} from 'recharts';

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

interface DashboardPreviewProps {
  clienteId: string;
  clienteNome: string;
  widgets: DashboardWidget[];
  onBack: () => void;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const getWidgetColSpan = (size: string) => {
  switch (size) {
    case 'small': return 'col-span-1';
    case 'medium': return 'col-span-2';
    case 'large': return 'col-span-3';
    default: return 'col-span-1';
  }
};

const getWidgetIcon = (type: WidgetType) => {
  switch (type) {
    case 'bar_chart': return BarChart3;
    case 'line_chart': return LineChart;
    case 'pie_chart': return PieChart;
    default: return Hash;
  }
};

async function fetchWidgetData(dataSource: string, clienteId: string): Promise<{ value?: number; chartData?: any[] }> {
  try {
    switch (dataSource) {
      case 'licitacoes_abertas': {
        const { count } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('status', 'nova');
        return { value: count || 0 };
      }
      case 'licitacoes_ganhas': {
        const { count } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('status', 'ganha');
        return { value: count || 0 };
      }
      case 'licitacoes_perdidas': {
        const { count } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('status', 'perdida');
        return { value: count || 0 };
      }
      case 'licitacoes_por_status': {
        const { data } = await supabase.from('licitacoes').select('status').eq('cliente_id', clienteId);
        const counts: Record<string, number> = {};
        (data || []).forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
        return { chartData: Object.entries(counts).map(([name, value]) => ({ name, value })) };
      }
      case 'valor_licitacoes': {
        const { data } = await supabase.from('licitacoes').select('valor_estimado').eq('cliente_id', clienteId);
        const total = (data || []).reduce((s, l) => s + (l.valor_estimado || 0), 0);
        return { value: total };
      }
      case 'contratos_ativos': {
        const { count } = await supabase.from('licitacoes').select('*', { count: 'exact', head: true }).eq('cliente_id', clienteId).eq('status', 'contrato');
        return { value: count || 0 };
      }
      case 'documentos_vencidos': {
        return { value: 0 };
      }
      case 'documentos_vencendo': {
        return { value: 0 };
      }
      case 'tarefas_pendentes': {
        return { value: 0 };
      }
      case 'tarefas_concluidas': {
        return { value: 0 };
      }
      case 'total_clientes': {
        const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true);
        return { value: count || 0 };
      }
      case 'clientes_ativos': {
        const { count } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true);
        return { value: count || 0 };
      }
      default:
        return { value: 0 };
    }
  } catch {
    return { value: 0 };
  }
}

function formatValue(value: number, dataSource: string): string {
  if (dataSource.includes('valor')) {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
    return `R$ ${value.toFixed(0)}`;
  }
  return value.toLocaleString('pt-BR');
}

export function DashboardPreview({ clienteId, clienteNome, widgets, onBack }: DashboardPreviewProps) {
  const navigate = useNavigate();
  const [widgetData, setWidgetData] = useState<Record<string, { value?: number; chartData?: any[]; loading: boolean }>>({});

  useEffect(() => {
    const initial: Record<string, { loading: boolean }> = {};
    widgets.forEach(w => { initial[w.id] = { loading: true }; });
    setWidgetData(initial);

    widgets.forEach(async (w) => {
      const data = await fetchWidgetData(w.dataSource, clienteId);
      setWidgetData(prev => ({ ...prev, [w.id]: { ...data, loading: false } }));
    });
  }, [widgets, clienteId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Construtor
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard de {clienteNome}</h2>
          <p className="text-sm text-muted-foreground">Prévia em tempo real dos dados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget, index) => {
          const data = widgetData[widget.id];
          const Icon = getWidgetIcon(widget.type);

          return (
            <motion.div
              key={widget.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'group relative cursor-pointer',
                getWidgetColSpan(widget.size)
              )}
              onClick={() => widget.navigationPath && navigate(widget.navigationPath)}
            >
              <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">{widget.title}</p>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  {data?.loading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : widget.type === 'number' ? (
                    <p className="text-3xl font-bold text-foreground">
                      {formatValue(data?.value || 0, widget.dataSource)}
                    </p>
                  ) : (
                    <div className="h-32">
                      {widget.type === 'bar_chart' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                      {widget.type === 'line_chart' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={data?.chartData || []}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      )}
                      {widget.type === 'pie_chart' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={data?.chartData || []}
                              cx="50%"
                              cy="50%"
                              outerRadius={50}
                              dataKey="value"
                              label={({ name }) => name}
                            >
                              {(data?.chartData || []).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  )}

                  {widget.navigationPath && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Ver detalhes</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>Nenhum widget configurado para este cliente.</p>
        </div>
      )}
    </div>
  );
}
