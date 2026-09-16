import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CheckSquare,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  User,
  Building2,
  Flag,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
  ArrowRight,
  Filter,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsaveisMultiSelect } from '@/components/tarefas/ResponsaveisMultiSelect';
import { createTarefaWithNotifications, updateTarefaWithNotifications } from '@/lib/tarefasService';

type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
type TaskPriority = 'baixa' | 'media' | 'alta' | 'urgente';

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  status: TaskStatus;
  prioridade: TaskPriority;
  data_vencimento: string | null;
  data_conclusao: string | null;
  responsavel_id: string | null;
  responsaveis_ids: string[] | null;
  cliente_id: string | null;
  licitacao_id: string | null;
  criado_por: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  responsavel?: { nome: string };
  cliente?: { nome: string };
  licitacao?: { id: string; numero: string; objeto: string };
}

interface Licitacao {
  id: string;
  numero: string;
  objeto: string;
}

interface Profile {
  id: string;
  nome: string;
}

interface Cliente {
  id: string;
  nome: string;
}

const statusConfig: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  pendente: { label: 'Pendente', icon: Circle, color: 'text-muted-foreground bg-muted' },
  em_andamento: { label: 'Em Andamento', icon: Clock, color: 'text-blue-600 bg-blue-500/10' },
  concluida: { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  cancelada: { label: 'Cancelada', icon: XCircle, color: 'text-red-600 bg-red-500/10' },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  media: { label: 'Média', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  alta: { label: 'Alta', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  urgente: { label: 'Urgente', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function Tarefas() {
  const { user, profile, hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('admin');
  const canCreate = hasPermission('tarefas', 'criar');
  const canEdit = hasPermission('tarefas', 'editar');
  const canDelete = hasPermission('tarefas', 'excluir');
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('kanban');
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    status: 'pendente' as TaskStatus,
    prioridade: 'media' as TaskPriority,
    data_vencimento: null as Date | null,
    responsaveis_ids: [] as string[],
    licitacao_id: '',
    tags: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tarefasRes, profilesRes, clientesRes, licitacoesRes] = await Promise.all([
        supabase.from('tarefas').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, nome').eq('ativo', true),
        supabase.from('clientes').select('id, nome').eq('ativo', true),
        supabase.from('licitacoes').select('id, numero, objeto').order('created_at', { ascending: false }).limit(200),
      ]);

      if (tarefasRes.error) throw tarefasRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (clientesRes.error) throw clientesRes.error;

      const licitacoesData = licitacoesRes.data || [];

      // Enrich tarefas with names
      const enrichedTarefas = (tarefasRes.data || []).map((t: any) => ({
        ...t,
        responsavel: profilesRes.data?.find(p => p.id === t.responsavel_id),
        cliente: clientesRes.data?.find(c => c.id === t.cliente_id),
        licitacao: licitacoesData.find((l: any) => l.id === t.licitacao_id),
      }));

      setTarefas(enrichedTarefas);
      setProfiles(profilesRes.data || []);
      setClientes(clientesRes.data || []);
      setLicitacoes(licitacoesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredTarefas = tarefas.filter((t) => {
    const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    // Filtro por mês/ano (baseado em created_at)
    const matchesMonth = monthFilter === 'all' || (t.created_at && format(new Date(t.created_at), 'yyyy-MM') === monthFilter);
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const pagination = usePagination<Tarefa>({ items: filteredTarefas, itemsPerPage: 10 });

  const handleOpenDialog = (tarefa?: Tarefa) => {
    if (tarefa) {
      setSelectedTarefa(tarefa);
      const respIds = tarefa.responsaveis_ids && tarefa.responsaveis_ids.length > 0
        ? tarefa.responsaveis_ids
        : (tarefa.responsavel_id ? [tarefa.responsavel_id] : []);
      setFormData({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || '',
        status: tarefa.status,
        prioridade: tarefa.prioridade,
        data_vencimento: tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null,
        responsaveis_ids: respIds,
        licitacao_id: tarefa.licitacao_id || '',
        tags: tarefa.tags?.join(', ') || '',
      });
    } else {
      setSelectedTarefa(null);
      setFormData({
        titulo: '',
        descricao: '',
        status: 'pendente',
        prioridade: 'media',
        data_vencimento: null,
        responsaveis_ids: user?.id ? [user.id] : [],
        licitacao_id: '',
        tags: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.titulo) {
      toast.error('O título é obrigatório');
      return;
    }
    if (!user?.id || !profile) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArr = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null;

      if (selectedTarefa) {
        await updateTarefaWithNotifications({
          id: selectedTarefa.id,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          status: formData.status,
          prioridade: formData.prioridade,
          data_vencimento: formData.data_vencimento?.toISOString() || null,
          responsaveis_ids: formData.responsaveis_ids,
          licitacao_id: formData.licitacao_id || null,
          tags: tagsArr,
          previousResponsaveisIds: selectedTarefa.responsaveis_ids || (selectedTarefa.responsavel_id ? [selectedTarefa.responsavel_id] : []),
          criador_id: user.id,
          criador_nome: profile.nome || user.email || 'Usuário',
          cliente_id: profile.cliente_id ?? selectedTarefa.cliente_id ?? null,
          tarefa_titulo: formData.titulo,
        });
        toast.success('Tarefa atualizada!');
      } else {
        await createTarefaWithNotifications({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          prioridade: formData.prioridade,
          data_vencimento: formData.data_vencimento?.toISOString() || null,
          responsaveis_ids: formData.responsaveis_ids,
          licitacao_id: formData.licitacao_id || null,
          tags: tagsArr,
          criador_id: user.id,
          criador_nome: profile.nome || user.email || 'Usuário',
          cliente_id: profile.cliente_id ?? null,
        });
        toast.success('Tarefa criada!');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || 'Erro ao salvar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (tarefaId: string, newStatus: TaskStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'concluida') {
        updateData.data_conclusao = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('tarefas')
        .update(updateData)
        .eq('id', tarefaId);
      
      if (error) throw error;
      
      setTarefas(tarefas.map(t => 
        t.id === tarefaId ? { ...t, status: newStatus, ...updateData } : t
      ));
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!selectedTarefa) return;
    try {
      const { error } = await supabase.from('tarefas').delete().eq('id', selectedTarefa.id);
      if (error) throw error;
      toast.success('Tarefa excluída');
      setIsDeleteDialogOpen(false);
      setSelectedTarefa(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return isBefore(new Date(date), new Date()) && !isToday(new Date(date));
  };

  const getKanbanTasks = (status: TaskStatus) => 
    filteredTarefas.filter(t => t.status === status);

  const stats = {
    total: filteredTarefas.length,
    pendentes: filteredTarefas.filter(t => t.status === 'pendente').length,
    emAndamento: filteredTarefas.filter(t => t.status === 'em_andamento').length,
    concluidas: filteredTarefas.filter(t => t.status === 'concluida').length,
    atrasadas: filteredTarefas.filter(t => isOverdue(t.data_vencimento) && t.status !== 'concluida').length,
  };

  return (
    <MainLayout title="Tarefas" subtitle="Gerencie todas as tarefas do sistema">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: CheckSquare, color: 'primary' },
          { label: 'Pendentes', value: stats.pendentes, icon: Circle, color: 'muted-foreground' },
          { label: 'Em Andamento', value: stats.emAndamento, icon: Clock, color: 'blue-500' },
          { label: 'Concluídas', value: stats.concluidas, icon: CheckCircle2, color: 'emerald-500' },
          { label: 'Atrasadas', value: stats.atrasadas, icon: AlertCircle, color: 'red-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "p-4 rounded-xl border shadow-sm",
              stat.color === 'primary' ? 'bg-primary/10 border-primary/20' :
              stat.color === 'muted-foreground' ? 'bg-muted border-border' :
              `bg-${stat.color}/10 border-${stat.color}/20`
            )}
          >
            <div className="flex items-center gap-3">
              <stat.icon className={cn("w-5 h-5", `text-${stat.color}`)} />
              <div>
                <p className={cn("text-sm", `text-${stat.color}`)}>{stat.label}</p>
                <p className={cn("text-2xl font-bold", `text-${stat.color}`)}>{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gerenciar Tarefas</CardTitle>
              <CardDescription>Crie, edite e acompanhe suas tarefas</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48 bg-secondary border-0"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluídas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[150px]">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - 12 + i);
                    const value = format(d, 'yyyy-MM');
                    const label = format(d, 'MMMM yyyy', { locale: ptBR });
                    return (
                      <SelectItem key={value} value={value}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
              {canCreate && (
                <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground" data-page-new-action>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Tarefa
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
            </TabsList>

            <TabsContent value="kanban">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(['pendente', 'em_andamento', 'concluida', 'cancelada'] as TaskStatus[]).map((status) => {
                    const config = statusConfig[status];
                    const tasks = getKanbanTasks(status);
                    return (
                      <div key={status} className="flex flex-col">
                        <div className={cn("p-3 rounded-t-lg flex items-center gap-2", config.color)}>
                          <config.icon className="w-4 h-4" />
                          <span className="font-medium">{config.label}</span>
                          <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
                        </div>
                        <div className="flex-1 bg-muted/30 rounded-b-lg p-2 min-h-[300px] space-y-2">
                          <AnimatePresence>
                            {tasks.map((tarefa) => (
                              <motion.div
                                key={tarefa.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleOpenDialog(tarefa)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-medium text-sm line-clamp-2">{tarefa.titulo}</h4>
                                  <Badge variant="outline" className={cn("shrink-0 text-xs", priorityConfig[tarefa.prioridade].color)}>
                                    {priorityConfig[tarefa.prioridade].label}
                                  </Badge>
                                </div>
                                {tarefa.descricao && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarefa.descricao}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {tarefa.data_vencimento && (
                                    <span className={cn(
                                      "text-xs flex items-center gap-1",
                                      isOverdue(tarefa.data_vencimento) && tarefa.status !== 'concluida' ? "text-red-500" : "text-muted-foreground"
                                    )}>
                                      <CalendarIcon className="w-3 h-3" />
                                      {format(new Date(tarefa.data_vencimento), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  )}
                                  {tarefa.licitacao && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Flag className="w-3 h-3" />
                                      {tarefa.licitacao.numero}
                                    </span>
                                  )}
                                  {tarefa.responsavel && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {tarefa.responsavel.nome.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {tasks.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              Nenhuma tarefa
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="lista">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  {pagination.paginatedItems.map((tarefa) => {
                    const statusCfg = statusConfig[tarefa.status];
                    return (
                      <div
                        key={tarefa.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => handleStatusChange(
                            tarefa.id, 
                            tarefa.status === 'concluida' ? 'pendente' : 'concluida'
                          )}
                          className={cn(
                            "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                            tarefa.status === 'concluida' 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-muted-foreground hover:border-primary"
                          )}
                        >
                          {tarefa.status === 'concluida' && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium",
                              tarefa.status === 'concluida' && "line-through text-muted-foreground"
                            )}>
                              {tarefa.titulo}
                            </span>
                            <Badge variant="outline" className={cn("text-xs", priorityConfig[tarefa.prioridade].color)}>
                              {priorityConfig[tarefa.prioridade].label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {tarefa.cliente && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {tarefa.cliente.nome}
                              </span>
                            )}
                            {tarefa.licitacao && (
                              <span className="flex items-center gap-1">
                                <Flag className="w-3 h-3" />
                                {tarefa.licitacao.numero}
                              </span>
                            )}
                            {tarefa.responsavel && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {tarefa.responsavel.nome}
                              </span>
                            )}
                            {tarefa.data_vencimento && (
                              <span className={cn(
                                "flex items-center gap-1",
                                isOverdue(tarefa.data_vencimento) && tarefa.status !== 'concluida' && "text-red-500"
                              )}>
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(tarefa.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>

                        <Select
                          value={tarefa.status}
                          onValueChange={(value) => handleStatusChange(tarefa.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <cfg.icon className="w-3 h-3" />
                                  {cfg.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleOpenDialog(tarefa)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                {canEdit && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTarefa(tarefa);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                  {pagination.paginatedItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma tarefa encontrada
                    </div>
                  )}
                  {pagination.totalPages > 1 && (
                    <div className="mt-4">
                      <PaginationControls
                        currentPage={pagination.currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={pagination.goToPage}
                        startIndex={pagination.startIndex}
                        endIndex={pagination.endIndex}
                        totalItems={pagination.totalItems}
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              {selectedTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}
            </DialogTitle>
            <DialogDescription>
              {selectedTarefa ? 'Atualize os dados da tarefa' : 'Crie uma nova tarefa'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título da tarefa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>
            {selectedTarefa && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TaskStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <cfg.icon className="w-4 h-4" />
                            {cfg.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) => setFormData({ ...formData, prioridade: value as TaskPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {!selectedTarefa && (
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(value) => setFormData({ ...formData, prioridade: value as TaskPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_vencimento
                      ? format(formData.data_vencimento, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Selecionar data'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_vencimento || undefined}
                    onSelect={(date) => setFormData({ ...formData, data_vencimento: date || null })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <ResponsaveisMultiSelect
                profiles={profiles}
                selectedIds={formData.responsaveis_ids}
                onChange={(ids) => setFormData({ ...formData, responsaveis_ids: ids })}
                placeholder="Selecionar um ou mais responsáveis"
              />
              <p className="text-xs text-muted-foreground">
                Os responsáveis selecionados receberão uma notificação no sistema.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Licitação (opcional)</Label>
              <Select
                value={formData.licitacao_id}
                onValueChange={(value) => setFormData({ ...formData, licitacao_id: value === '_none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma licitação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {licitacoes.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.numero} - {l.objeto?.substring(0, 60)}{l.objeto && l.objeto.length > 60 ? '...' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Ex: urgente, cliente-vip, revisão"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gradient-primary text-primary-foreground">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {selectedTarefa ? 'Salvar' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a tarefa <strong>{selectedTarefa?.titulo}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
