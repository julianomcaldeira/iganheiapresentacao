import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  CalendarIcon,
  User,
  Database,
  RefreshCw,
  Building2,
  X,
  Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  tabela: string;
  registro_id: string | null;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antigos: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  user_id: string | null;
  cliente_id: string | null;
  created_at: string;
  profile?: { nome: string } | null;
  cliente?: { nome: string } | null;
}

const TABELAS = [
  { value: 'all', label: 'Todas as tabelas' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'empresas', label: 'Empresas' },
  { value: 'profiles', label: 'Usuários' },
  { value: 'user_roles', label: 'Papéis de Usuário' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'tarefas', label: 'Tarefas' },
  { value: 'perfis_acesso', label: 'Perfis de Acesso' },
  { value: 'perfil_permissoes', label: 'Permissões' },
  { value: 'dashboard_widgets', label: 'Widgets Dashboard' },
  { value: 'ia_prompts', label: 'Prompts IA' },
  { value: 'ia_conhecimento', label: 'Conhecimento IA' },
  { value: 'importacoes', label: 'Importações' },
];

const ACOES = [
  { value: 'all', label: 'Todas as ações' },
  { value: 'INSERT', label: 'Criação' },
  { value: 'UPDATE', label: 'Atualização' },
  { value: 'DELETE', label: 'Exclusão' },
];

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTabela, setSelectedTabela] = useState('all');
  const [selectedAcao, setSelectedAcao] = useState('all');
  const [selectedCliente, setSelectedCliente] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientesList, setClientesList] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    fetchLogs();
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setClientesList(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Fetch user names for logs
      const userIds = [...new Set((data || []).filter(l => l.user_id).map(l => l.user_id))];
      const clienteIds = [...new Set((data || []).filter(l => l.cliente_id).map(l => l.cliente_id))];
      
      let profiles: Record<string, string> = {};
      let clientes: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);
        profiles = (profilesData || []).reduce((acc, p) => ({ ...acc, [p.id]: p.nome }), {});
      }

      if (clienteIds.length > 0) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds);
        clientes = (clientesData || []).reduce((acc, c) => ({ ...acc, [c.id]: c.nome }), {});
      }

      const enrichedLogs = (data || []).map(log => ({
        ...log,
        profile: log.user_id && profiles[log.user_id] ? { nome: profiles[log.user_id] } : null,
        cliente: log.cliente_id && clientes[log.cliente_id] ? { nome: clientes[log.cliente_id] } : null,
      }));

      setLogs(enrichedLogs as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.tabela.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profile?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.dados_novos || {}).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTabela = selectedTabela === 'all' || log.tabela === selectedTabela;
    const matchesAcao = selectedAcao === 'all' || log.acao === selectedAcao;
    const matchesCliente = selectedCliente === 'all' || log.cliente_id === selectedCliente;
    const logTime = new Date(log.created_at).getTime();
    const matchesDateFrom = !dateFrom || logTime >= new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()).getTime();
    const matchesDateTo = !dateTo || logTime <= new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999).getTime();
    return matchesSearch && matchesTabela && matchesAcao && matchesCliente && matchesDateFrom && matchesDateTo;
  });

  const pagination = usePagination<AuditLog>({ items: filteredLogs, itemsPerPage: 20 });

  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'INSERT':
        return <Plus className="w-4 h-4" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getAcaoBadge = (acao: string) => {
    switch (acao) {
      case 'INSERT':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Criação</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Atualização</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Exclusão</Badge>;
      default:
        return <Badge variant="secondary">{acao}</Badge>;
    }
  };

  const getTabelaLabel = (tabela: string) => {
    const found = TABELAS.find(t => t.value === tabela);
    return found?.label || tabela;
  };

  const exportCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Tabela', 'Ação', 'Cliente', 'ID Registro'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.profile?.nome || 'Sistema',
      getTabelaLabel(log.tabela),
      log.acao === 'INSERT' ? 'Criação' : log.acao === 'UPDATE' ? 'Atualização' : 'Exclusão',
      log.cliente?.nome || '-',
      log.registro_id || '-',
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLogs.length} registros exportados`);
  };

  const openDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // Stats
  const stats = {
    total: logs.length,
    inserts: logs.filter(l => l.acao === 'INSERT').length,
    updates: logs.filter(l => l.acao === 'UPDATE').length,
    deletes: logs.filter(l => l.acao === 'DELETE').length,
  };

  if (loading) {
    return (
      <MainLayout title="Auditoria" subtitle="Histórico de ações do sistema">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Auditoria" subtitle="Histórico de ações do sistema">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-glow">
                  <Shield className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Registro de Auditoria</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitore todas as ações realizadas no sistema em tempo real
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={exportCSV} variant="outline" disabled={filteredLogs.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button onClick={fetchLogs} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Registros</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Plus className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.inserts}</p>
              <p className="text-xs text-muted-foreground">Criações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Edit className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.updates}</p>
              <p className="text-xs text-muted-foreground">Atualizações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.deletes}</p>
              <p className="text-xs text-muted-foreground">Exclusões</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tabela, usuário ou dados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientesList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTabela} onValueChange={setSelectedTabela}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            {TABELAS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedAcao} onValueChange={setSelectedAcao}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            {ACOES.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo || selectedCliente !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
              setSelectedCliente('all');
            }}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Resumo</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.map((log) => (
              <TableRow key={log.id} className="group">
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{log.profile?.nome || 'Sistema'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getTabelaLabel(log.tabela)}</Badge>
                </TableCell>
                <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {log.cliente?.nome || '-'}
                  </span>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  <span className="text-xs text-muted-foreground">
                    {log.acao === 'DELETE' 
                      ? `ID: ${log.registro_id?.slice(0, 8)}...`
                      : String((log.dados_novos as Record<string, unknown>)?.nome || 
                        (log.dados_novos as Record<string, unknown>)?.titulo ||
                        (log.dados_novos as Record<string, unknown>)?.razao_social ||
                        `ID: ${log.registro_id?.slice(0, 8)}...`)
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDetail(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="mt-4">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
          />
        </div>
      )}

      {filteredLogs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum registro encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Os logs de auditoria aparecerão aqui conforme as ações forem realizadas no sistema.
          </p>
        </motion.div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getAcaoIcon(selectedLog.acao)}
              Detalhes da Ação
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 mt-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Data/Hora</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Usuário</p>
                  <p className="text-sm font-medium">{selectedLog.profile?.nome || 'Sistema'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tabela</p>
                  <p className="text-sm font-medium">{getTabelaLabel(selectedLog.tabela)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Ação</p>
                  {getAcaoBadge(selectedLog.acao)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ID do Registro</p>
                  <p className="text-sm font-mono">{selectedLog.registro_id || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{selectedLog.cliente?.nome || '-'}</p>
                </div>
              </div>

              {/* Old Data */}
              {selectedLog.dados_antigos && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Dados Anteriores</p>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-[200px]">
                    {JSON.stringify(selectedLog.dados_antigos, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Data */}
              {selectedLog.dados_novos && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Dados Novos</p>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-[200px]">
                    {JSON.stringify(selectedLog.dados_novos, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
