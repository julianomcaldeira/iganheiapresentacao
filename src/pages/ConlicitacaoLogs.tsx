import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  RefreshCw, CheckCircle, XCircle, Eye, Loader2, 
  FileText, ArrowDownUp, Calendar as CalendarIcon, Building2, X
} from 'lucide-react';

interface ConlicitacaoLog {
  id: string;
  cliente_id: string | null;
  boletim_id: number | null;
  filtro_id: number | null;
  tipo: string;
  licitacoes_recebidas: number | null;
  licitacoes_novas: number | null;
  licitacoes_atualizadas: number | null;
  acompanhamentos_recebidos: number | null;
  sucesso: boolean;
  erro: string | null;
  dados_brutos: any;
  created_at: string;
  cliente?: { nome: string };
}

interface Cliente {
  id: string;
  nome: string;
}

export default function ConlicitacaoLogsPage() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<ConlicitacaoLog[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteFilter, setClienteFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<ConlicitacaoLog | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const filteredLogs = logs.filter(log => {
    const matchesCliente = clienteFilter === 'all' || log.cliente_id === clienteFilter;
    const matchesTipo = tipoFilter === 'all' || log.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'sucesso' && log.sucesso) || 
      (statusFilter === 'erro' && !log.sucesso);
    
    // Date range filter
    let matchesDateRange = true;
    if (startDate || endDate) {
      const logDate = new Date(log.created_at);
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(logDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate)
        });
      } else if (startDate) {
        matchesDateRange = logDate >= startOfDay(startDate);
      } else if (endDate) {
        matchesDateRange = logDate <= endOfDay(endDate);
      }
    }
    
    return matchesCliente && matchesTipo && matchesStatus && matchesDateRange;
  });

  const hasActiveFilters = clienteFilter !== 'all' || tipoFilter !== 'all' || statusFilter !== 'all' || startDate || endDate;

  const clearAllFilters = () => {
    setClienteFilter('all');
    setTipoFilter('all');
    setStatusFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const { currentPage, totalPages, paginatedItems, goToPage, startIndex, endIndex, totalItems } = 
    usePagination({ items: filteredLogs, itemsPerPage: 20 });

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, clientesRes] = await Promise.all([
        supabase
          .from('conlicitacao_logs')
          .select('*, cliente:clientes(nome)')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('clientes')
          .select('id, nome')
          .eq('ativo', true)
      ]);

      if (logsRes.data) setLogs(logsRes.data as unknown as ConlicitacaoLog[]);
      if (clientesRes.data) setClientes(clientesRes.data);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs');
    }
    setLoading(false);
  };

  const handleViewDetails = (log: ConlicitacaoLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'webhook': return 'Webhook';
      case 'sync': return 'Sincronização';
      case 'manual': return 'Manual';
      default: return tipo;
    }
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'webhook': return 'default';
      case 'sync': return 'secondary';
      case 'manual': return 'outline';
      default: return 'outline';
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout title="Acesso Restrito">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-muted-foreground">Acesso restrito ao administrador.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Logs ConLicitacao" subtitle="Histórico de webhooks e sincronizações">
      <div className="space-y-6">
        {/* Action Button */}
        <div className="flex justify-end">
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ArrowDownUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Logs</p>
                  <p className="text-xl font-bold">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                  <p className="text-xl font-bold">{logs.filter(l => l.sucesso).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-xl font-bold">{logs.filter(l => !l.sucesso).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Licitações Importadas</p>
                  <p className="text-xl font-bold">
                    {logs.reduce((acc, l) => acc + (l.licitacoes_novas || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-48">
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger>
                    <Building2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Clientes</SelectItem>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="sync">Sincronização</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filters */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">até</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Boletim</TableHead>
                      <TableHead className="text-center">Recebidas</TableHead>
                      <TableHead className="text-center">Novas</TableHead>
                      <TableHead className="text-center">Atualizadas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum log encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell>{log.cliente?.nome || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={getTipoBadgeVariant(log.tipo) as any}>
                              {getTipoLabel(log.tipo)}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.boletim_id || '-'}</TableCell>
                          <TableCell className="text-center">{log.licitacoes_recebidas || 0}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-emerald-500 font-medium">{log.licitacoes_novas || 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-blue-500 font-medium">{log.licitacoes_atualizadas || 0}</span>
                          </TableCell>
                          <TableCell>
                            {log.sucesso ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                <XCircle className="w-3 h-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(log)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Log</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedLog.cliente?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <Badge variant={getTipoBadgeVariant(selectedLog.tipo) as any}>
                      {getTipoLabel(selectedLog.tipo)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {selectedLog.sucesso ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Sucesso</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500">Erro</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Boletim</p>
                    <p className="font-medium">{selectedLog.boletim_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Filtro</p>
                    <p className="font-medium">{selectedLog.filtro_id || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{selectedLog.licitacoes_recebidas || 0}</p>
                    <p className="text-xs text-muted-foreground">Recebidas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">{selectedLog.licitacoes_novas || 0}</p>
                    <p className="text-xs text-muted-foreground">Novas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{selectedLog.licitacoes_atualizadas || 0}</p>
                    <p className="text-xs text-muted-foreground">Atualizadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{selectedLog.acompanhamentos_recebidos || 0}</p>
                    <p className="text-xs text-muted-foreground">Acompanhamentos</p>
                  </div>
                </div>

                {selectedLog.erro && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Erro</p>
                    <pre className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm overflow-x-auto">
                      {selectedLog.erro}
                    </pre>
                  </div>
                )}

                {selectedLog.dados_brutos && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Dados Brutos (JSON)</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-60">
                      {JSON.stringify(selectedLog.dados_brutos, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
