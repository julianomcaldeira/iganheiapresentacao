import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { 
  Users, Trophy, TrendingUp, TrendingDown, Target, 
  Loader2, Building2, BarChart3, PieChartIcon, LineChartIcon
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConcorrenteRecord {
  id: string;
  nome_concorrente: string;
  participou: boolean;
  ganhou: boolean | null;
  valor_proposta: number | null;
  created_at: string;
  licitacao_id: string;
}

interface ConcorrenteStats {
  nome: string;
  participacoes: number;
  vitorias: number;
  derrotas: number;
  taxaVitoria: number;
}

interface MonthlyData {
  mes: string;
  mesLabel: string;
  participacoes: number;
  vitorias: number;
  derrotas: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(160, 70%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 70%, 50%)',
  'hsl(200, 70%, 50%)',
];

export function ConcorrentesDashboard() {
  const { profile, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<ConcorrenteRecord[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('all');
  const [concorrenteStats, setConcorrenteStats] = useState<ConcorrenteStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [periodo, setPeriodo] = useState('6');

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedCliente, periodo, profile?.cliente_id]);

  const fetchClientes = async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      setClientes(data || []);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const clienteId = isAdmin && selectedCliente !== 'all' 
        ? selectedCliente 
        : profile?.cliente_id;

      let query = supabase
        .from('licitacao_concorrentes')
        .select('*')
        .order('created_at', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      // Filter by period
      const meses = parseInt(periodo);
      const dataInicio = subMonths(new Date(), meses);
      query = query.gte('created_at', dataInicio.toISOString());

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);

      // Calculate stats
      calculateStats(data || []);
      calculateMonthlyData(data || [], meses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: ConcorrenteRecord[]) => {
    const statsMap = new Map<string, ConcorrenteStats>();

    data.forEach(record => {
      if (!record.participou) return;

      const nome = record.nome_concorrente;
      const existing = statsMap.get(nome) || {
        nome,
        participacoes: 0,
        vitorias: 0,
        derrotas: 0,
        taxaVitoria: 0
      };

      existing.participacoes++;
      if (record.ganhou === true) existing.vitorias++;
      if (record.ganhou === false) existing.derrotas++;

      statsMap.set(nome, existing);
    });

    const stats = Array.from(statsMap.values()).map(s => ({
      ...s,
      taxaVitoria: s.participacoes > 0 ? Math.round((s.vitorias / s.participacoes) * 100) : 0
    }));

    stats.sort((a, b) => b.participacoes - a.participacoes);
    setConcorrenteStats(stats);
  };

  const calculateMonthlyData = (data: ConcorrenteRecord[], meses: number) => {
    const monthlyMap = new Map<string, MonthlyData>();

    // Initialize all months
    for (let i = meses - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const mesKey = format(date, 'yyyy-MM');
      const mesLabel = format(date, 'MMM/yy', { locale: ptBR });
      monthlyMap.set(mesKey, {
        mes: mesKey,
        mesLabel,
        participacoes: 0,
        vitorias: 0,
        derrotas: 0
      });
    }

    data.forEach(record => {
      if (!record.participou) return;

      const mesKey = format(new Date(record.created_at), 'yyyy-MM');
      const existing = monthlyMap.get(mesKey);

      if (existing) {
        existing.participacoes++;
        if (record.ganhou === true) existing.vitorias++;
        if (record.ganhou === false) existing.derrotas++;
      }
    });

    setMonthlyData(Array.from(monthlyMap.values()));
  };

  const totalParticipacoes = records.filter(r => r.participou).length;
  const totalVitorias = records.filter(r => r.ganhou === true).length;
  const totalDerrotas = records.filter(r => r.ganhou === false).length;
  const taxaVitoriaGeral = totalParticipacoes > 0 
    ? Math.round((totalVitorias / totalParticipacoes) * 100) 
    : 0;

  const topConcorrentes = concorrenteStats.slice(0, 5);
  const pieData = topConcorrentes.map(c => ({
    name: c.nome.length > 15 ? c.nome.substring(0, 15) + '...' : c.nome,
    value: c.participacoes
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {isAdmin && clientes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cliente:</span>
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concorrentes</p>
                <p className="text-2xl font-bold">{concorrenteStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participações</p>
                <p className="text-2xl font-bold">{totalParticipacoes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-success/10">
                <Trophy className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vitórias</p>
                <p className="text-2xl font-bold text-success">{totalVitorias}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${taxaVitoriaGeral >= 50 ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {taxaVitoriaGeral >= 50 ? (
                  <TrendingUp className="w-6 h-6 text-destructive" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-success" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Vitória</p>
                <p className={`text-2xl font-bold ${taxaVitoriaGeral >= 50 ? 'text-destructive' : 'text-success'}`}>
                  {taxaVitoriaGeral}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">Nenhum dado de concorrentes</p>
            <p className="text-sm text-muted-foreground mt-1">
              Registre participações de concorrentes nas licitações para visualizar análises
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução Mensal */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChartIcon className="w-5 h-5 text-primary" />
                Evolução de Participações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorParticipacoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVitorias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="mesLabel" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="participacoes" 
                    name="Participações"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorParticipacoes)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vitorias" 
                    name="Vitórias Concorrentes"
                    stroke="hsl(var(--destructive))" 
                    fillOpacity={1}
                    fill="url(#colorVitorias)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Concorrentes - Bar Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Top Concorrentes por Participação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topConcorrentes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="nome" 
                    tick={{ fontSize: 11 }}
                    width={100}
                    tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="participacoes" name="Participações" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="vitorias" name="Vitórias" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição - Pie Chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-primary" />
                Distribuição por Concorrente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ranking de Taxa de Vitória */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Ranking por Taxa de Vitória
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {concorrenteStats
                  .filter(c => c.participacoes >= 2)
                  .sort((a, b) => b.taxaVitoria - a.taxaVitoria)
                  .slice(0, 10)
                  .map((concorrente, index) => (
                    <div key={concorrente.nome} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                        index === 1 ? 'bg-gray-300/20 text-gray-500' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{concorrente.nome}</span>
                          <span className="text-sm text-muted-foreground">
                            {concorrente.vitorias}/{concorrente.participacoes} vitórias
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              concorrente.taxaVitoria >= 70 ? 'bg-destructive' :
                              concorrente.taxaVitoria >= 40 ? 'bg-warning' :
                              'bg-success'
                            }`}
                            style={{ width: `${concorrente.taxaVitoria}%` }}
                          />
                        </div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`min-w-[60px] justify-center ${
                          concorrente.taxaVitoria >= 70 ? 'bg-destructive/10 text-destructive border-destructive/30' :
                          concorrente.taxaVitoria >= 40 ? 'bg-warning/10 text-warning border-warning/30' :
                          'bg-success/10 text-success border-success/30'
                        }`}
                      >
                        {concorrente.taxaVitoria}%
                      </Badge>
                    </div>
                  ))}

                {concorrenteStats.filter(c => c.participacoes >= 2).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    É necessário pelo menos 2 participações por concorrente para o ranking
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
