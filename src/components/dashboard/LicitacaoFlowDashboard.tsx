import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  CalendarIcon,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LicitacaoFlow {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  status: string;
  modalidade: string | null;
  valor_estimado: number | null;
  data_abertura: string | null;
  data_encerramento: string | null;
  cliente_id: string;
  cliente_nome?: string;
  etapas: {
    etapa_codigo: string;
    status: string;
    data_inicio: string | null;
    data_conclusao: string | null;
  }[];
}

const ETAPA_LABELS: Record<string, string> = {
  esclarecimento: 'Esclarecimento',
  aprovacoes: 'Aprovações',
  documentos: 'Documentos',
  proposta: 'Proposta',
  disputa: 'Disputa',
  resultado: 'Resultado',
  analise_edital: 'Análise Edital',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  concluida: { label: 'Concluída', color: 'text-emerald-500', icon: CheckCircle2 },
  em_andamento: { label: 'Em Andamento', color: 'text-primary', icon: Clock },
  nao_iniciada: { label: 'Não Iniciada', color: 'text-muted-foreground', icon: AlertCircle },
  bloqueada: { label: 'Bloqueada', color: 'text-destructive', icon: AlertCircle },
};

const LICITACAO_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pendente_analise', label: 'Pendente de Análise' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'recusado', label: 'Recusado' },
];

const getStatusBadge = (status: string) => {
  const configs: Record<string, { label: string; className: string }> = {
    pendente_analise: { label: 'Pendente de Análise', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
    em_andamento: { label: 'Em Andamento', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    finalizado: { label: 'Finalizado', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    recusado: { label: 'Recusado', className: 'bg-foreground/10 text-foreground border-foreground/20' },
  };
  return configs[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function LicitacaoFlowDashboard() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [licitacoes, setLicitacoes] = useState<LicitacaoFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [isAdmin, profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clientes for admin filter
      if (isAdmin) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        if (clientesData) setClientes(clientesData);
      }

      // Fetch licitações
      let query = supabase
        .from('licitacoes')
        .select('id, numero, objeto, orgao, status, modalidade, valor_estimado, data_abertura, data_encerramento, cliente_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isAdmin && profile?.cliente_id) {
        query = query.eq('cliente_id', profile.cliente_id);
      }

      const { data: licitacoesData } = await query;

      if (!licitacoesData || licitacoesData.length === 0) {
        setLicitacoes([]);
        setLoading(false);
        return;
      }

      // Fetch etapas for all licitações
      const licitacaoIds = licitacoesData.map((l) => l.id);
      const { data: etapasData } = await supabase
        .from('licitacao_etapa_execucao')
        .select('licitacao_id, etapa_codigo, status, data_inicio, data_conclusao')
        .in('licitacao_id', licitacaoIds)
        .order('etapa_codigo');

      // Fetch client names for admin
      let clienteMap: Record<string, string> = {};
      if (isAdmin && licitacoesData.length > 0) {
        const clienteIds = [...new Set(licitacoesData.map((l) => l.cliente_id))];
        const { data: clienteNames } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds);
        if (clienteNames) {
          clienteMap = Object.fromEntries(clienteNames.map((c) => [c.id, c.nome]));
        }
      }

      const mapped: LicitacaoFlow[] = licitacoesData.map((l) => ({
        ...l,
        cliente_nome: clienteMap[l.cliente_id] || undefined,
        etapas: (etapasData || [])
          .filter((e) => e.licitacao_id === l.id)
          .map((e) => ({
            etapa_codigo: e.etapa_codigo,
            status: e.status,
            data_inicio: e.data_inicio,
            data_conclusao: e.data_conclusao,
          })),
      }));

      setLicitacoes(mapped);
    } catch (error) {
      console.error('Error fetching licitacao flow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLicitacoes = useMemo(() => {
    return licitacoes.filter((l) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !l.numero.toLowerCase().includes(term) &&
          !l.objeto.toLowerCase().includes(term) &&
          !l.orgao.toLowerCase().includes(term)
        )
          return false;
      }
      if (selectedCliente !== 'all' && l.cliente_id !== selectedCliente) return false;
      if (selectedStatus !== 'all' && l.status !== selectedStatus) return false;
      if (selectedEtapa !== 'all') {
        const hasEtapaActive = l.etapas.some(
          (e) => e.etapa_codigo === selectedEtapa && e.status === 'em_andamento'
        );
        if (!hasEtapaActive) return false;
      }
      if (dateFrom && l.data_abertura && new Date(l.data_abertura) < dateFrom) return false;
      if (dateTo && l.data_abertura && new Date(l.data_abertura) > dateTo) return false;
      return true;
    });
  }, [licitacoes, searchTerm, selectedCliente, selectedStatus, selectedEtapa, dateFrom, dateTo]);

  const hasActiveFilters =
    searchTerm || selectedCliente !== 'all' || selectedStatus !== 'all' || selectedEtapa !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCliente('all');
    setSelectedStatus('all');
    setSelectedEtapa('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute summary stats
  const summary = useMemo(() => {
    const total = filteredLicitacoes.length;
    const emAndamento = filteredLicitacoes.filter((l) =>
      l.etapas.some((e) => e.status === 'em_andamento')
    ).length;
    const concluidas = filteredLicitacoes.filter((l) =>
      l.etapas.length > 0 && l.etapas.every((e) => e.status === 'concluida')
    ).length;
    const pendentes = total - emAndamento - concluidas;
    return { total, emAndamento, concluidas, pendentes };
  }, [filteredLicitacoes]);

  if (loading) {
    return (
      <div className="rounded-xl bg-card shadow-md border border-border p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl bg-card shadow-md border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-heading font-semibold text-foreground">
              Fluxo de Licitações
            </h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe o progresso de cada processo licitatório
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && 'border-primary text-primary')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{summary.emAndamento}</p>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </div>
          <div className="rounded-lg bg-success/10 p-3 text-center">
            <p className="text-2xl font-bold text-success">{summary.concluidas}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div className="rounded-lg bg-warning/10 p-3 text-center">
            <p className="text-2xl font-bold text-warning">{summary.pendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 pt-4 border-t border-border"
          >
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, objeto ou órgão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Cliente filter (admin only) */}
              {isAdmin && (
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger className="w-[200px]">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {LICITACAO_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Etapa filter */}
              <Select value={selectedEtapa} onValueChange={setSelectedEtapa}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Etapa ativa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {Object.entries(ETAPA_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('justify-start text-left font-normal', !dateFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom
                      ? dateTo
                        ? `${format(dateFrom, 'dd/MM/yy', { locale: ptBR })} - ${format(dateTo, 'dd/MM/yy', { locale: ptBR })}`
                        : format(dateFrom, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Período'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateFrom || new Date()}
                    selected={{ from: dateFrom, to: dateTo }}
                    onSelect={(range) => {
                      setDateFrom(range?.from);
                      setDateTo(range?.to);
                    }}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="mr-1 h-4 w-4" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {filteredLicitacoes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma licitação encontrada</p>
            <p className="text-sm text-muted-foreground/70">Ajuste os filtros para ver resultados</p>
          </div>
        ) : (
          filteredLicitacoes.map((lic, index) => {
            const statusBadge = getStatusBadge(lic.status);
            const isExpanded = expandedIds.has(lic.id);

            return (
              <motion.div
                key={lic.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className="hover:bg-secondary/20 transition-colors"
              >
                {/* Main row */}
                <div
                  className="p-4 cursor-pointer flex items-center gap-4"
                  onClick={() => toggleExpand(lic.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/licitacoes?id=${lic.id}`);
                        }}
                      >
                        {lic.numero}
                      </span>
                      <Badge variant="outline" className={cn('text-[10px]', statusBadge.className)}>
                        {statusBadge.label}
                      </Badge>
                      {isAdmin && lic.cliente_nome && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Building2 className="w-3 h-3 mr-1" />
                          {lic.cliente_nome}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{lic.objeto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lic.orgao}</p>
                  </div>

                  {/* Mini flow indicator */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    {lic.etapas.length > 0 ? (
                      lic.etapas.map((e, i) => {
                        const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.nao_iniciada;
                        return (
                          <div key={i} className="flex items-center">
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full border-2',
                                e.status === 'concluida' && 'bg-emerald-500 border-emerald-500',
                                e.status === 'em_andamento' && 'bg-primary border-primary',
                                e.status === 'nao_iniciada' && 'bg-transparent border-muted-foreground/30',
                                e.status === 'bloqueada' && 'bg-destructive border-destructive'
                              )}
                              title={`${ETAPA_LABELS[e.etapa_codigo] || e.etapa_codigo}: ${cfg.label}`}
                            />
                            {i < lic.etapas.length - 1 && (
                              <div className={cn(
                                'w-4 h-0.5',
                                e.status === 'concluida' ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                              )} />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem etapas</span>
                    )}
                  </div>

                  {/* Value and expand */}
                  <div className="text-right shrink-0 flex items-center gap-3">
                    {lic.valor_estimado && (
                      <span className="text-sm font-bold text-foreground hidden sm:block">
                        {formatCurrency(lic.valor_estimado)}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-4"
                  >
                    <div className="rounded-lg bg-secondary/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-foreground">Progresso das Etapas</span>
                        {lic.data_encerramento && (
                          <span className="text-xs text-muted-foreground">
                            Encerramento: {new Date(lic.data_encerramento).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>

                      {lic.etapas.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma etapa configurada para esta licitação.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {lic.etapas.map((e, i) => {
                            const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.nao_iniciada;
                            const Icon = cfg.icon;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                                  e.status === 'concluida' && 'border-emerald-500/30 bg-emerald-500/5',
                                  e.status === 'em_andamento' && 'border-primary/30 bg-primary/5',
                                  e.status === 'nao_iniciada' && 'border-border bg-background',
                                  e.status === 'bloqueada' && 'border-destructive/30 bg-destructive/5'
                                )}
                              >
                                <Icon className={cn('w-4 h-4', cfg.color)} />
                                <div>
                                  <p className="font-medium text-foreground text-xs">
                                    {ETAPA_LABELS[e.etapa_codigo] || e.etapa_codigo}
                                  </p>
                                  <p className={cn('text-[10px]', cfg.color)}>{cfg.label}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                        {lic.modalidade && <span>📋 {lic.modalidade}</span>}
                        {lic.data_abertura && (
                          <span>📅 Abertura: {new Date(lic.data_abertura).toLocaleDateString('pt-BR')}</span>
                        )}
                        {lic.valor_estimado && (
                          <span className="sm:hidden">💰 {formatCurrency(lic.valor_estimado)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {filteredLicitacoes.length > 0 && (
        <div className="p-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Exibindo {filteredLicitacoes.length} de {licitacoes.length} licitações
          </p>
        </div>
      )}
    </motion.div>
  );
}
