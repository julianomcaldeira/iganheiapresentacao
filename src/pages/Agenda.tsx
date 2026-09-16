import { useState, useEffect, DragEvent } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Bell,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  FileText,
  Gavel,
  CheckSquare,
  AlertCircle,
  Circle,
  Filter,
  Loader2,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, addWeeks, isSameDay, parseISO, isToday, isFuture, isPast, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ResponsaveisMultiSelect } from '@/components/tarefas/ResponsaveisMultiSelect';
import { createTarefaWithNotifications } from '@/lib/tarefasService';

interface Profile {
  id: string;
  nome: string;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data: Date;
  horaInicio: string;
  horaFim: string;
  tipo: 'licitacao' | 'reuniao' | 'prazo' | 'lembrete';
  local?: string;
  participantes?: string[];
  licitacaoId?: string;
}

const mockEventos: Evento[] = [
  {
    id: '1',
    titulo: 'Abertura Pregão Eletrônico 045/2024',
    descricao: 'Participação no pregão de aquisição de equipamentos de TI',
    data: new Date(),
    horaInicio: '09:00',
    horaFim: '12:00',
    tipo: 'licitacao',
    local: 'ComprasNet',
    licitacaoId: 'lic-1',
  },
  {
    id: '2',
    titulo: 'Reunião de Alinhamento - Proposta Técnica',
    descricao: 'Discussão da proposta técnica para licitação do TJSP',
    data: new Date(),
    horaInicio: '14:00',
    horaFim: '15:30',
    tipo: 'reuniao',
    local: 'Sala de Reuniões 2',
    participantes: ['Carlos', 'Maria', 'João'],
  },
  {
    id: '3',
    titulo: 'Prazo Final - Entrega de Documentos',
    descricao: 'Entrega dos documentos de habilitação para PE 032/2024',
    data: addDays(new Date(), 2),
    horaInicio: '18:00',
    horaFim: '18:00',
    tipo: 'prazo',
  },
  {
    id: '4',
    titulo: 'Lembrete: Renovar CND Federal',
    descricao: 'Renovar certidão negativa de débitos federais',
    data: addDays(new Date(), 5),
    horaInicio: '09:00',
    horaFim: '09:00',
    tipo: 'lembrete',
  },
  {
    id: '5',
    titulo: 'Disputa de Pregão - Prefeitura de Campinas',
    descricao: 'Fase de lances do pregão de serviços de software',
    data: addDays(new Date(), 1),
    horaInicio: '10:00',
    horaFim: '14:00',
    tipo: 'licitacao',
    local: 'BLL Compras',
  },
];

const tipoConfig = {
  licitacao: { label: 'Licitação', icon: Gavel, color: 'bg-primary/10 text-primary border-primary/20' },
  reuniao: { label: 'Reunião', icon: Users, color: 'bg-info/10 text-info border-info/20' },
  prazo: { label: 'Prazo', icon: Clock, color: 'bg-destructive/10 text-destructive border-destructive/20' },
  lembrete: { label: 'Lembrete', icon: Bell, color: 'bg-warning/10 text-warning border-warning/20' },
};

const priorityConfig = {
  alta: { label: 'Alta', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  media: { label: 'Média', color: 'bg-warning/10 text-warning border-warning/20' },
  baixa: { label: 'Baixa', color: 'bg-info/10 text-info border-info/20' },
};

const statusConfig = {
  pendente: { label: 'Pendente', icon: Circle, color: 'text-muted-foreground' },
  em_andamento: { label: 'Em andamento', icon: Clock, color: 'text-info' },
  concluida: { label: 'Concluída', icon: CheckSquare, color: 'text-success' },
  cancelada: { label: 'Cancelada', icon: AlertCircle, color: 'text-destructive' },
};

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  data_vencimento: string | null;
  prioridade: string;
  status: string;
  responsavel_id: string | null;
  responsavel?: { nome: string } | null;
}

export default function Agenda() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [agendaTab, setAgendaTab] = useState<'eventos' | 'tarefas'>('eventos');
  const [eventos] = useState<Evento[]>(mockEventos);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingTarefas, setLoadingTarefas] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTarefaDialogOpen, setIsTarefaDialogOpen] = useState(false);
  const [savingTarefa, setSavingTarefa] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedTarefa, setDraggedTarefa] = useState<Tarefa | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);

  // Filters
  const [filterResponsavel, setFilterResponsavel] = useState<string>('all');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('all');

  // New task form
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    descricao: '',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    prioridade: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    responsaveis_ids: [] as string[],
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch profiles for filter and task creation
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setProfiles(data || []);
      } catch (error) {
        console.error('Erro ao carregar perfis:', error);
      }
    };

    fetchProfiles();
  }, []);

  // Fetch tarefas
  const fetchTarefas = async () => {
    if (!profile) return;
    setLoadingTarefas(true);
    try {
      let query = supabase
        .from('tarefas')
        .select('*, responsavel:profiles!tarefas_responsavel_id_fkey(nome)')
        .not('data_vencimento', 'is', null)
        .order('data_vencimento', { ascending: true });

      if (role !== 'admin' && profile.cliente_id) {
        query = query.eq('cliente_id', profile.cliente_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoadingTarefas(false);
    }
  };

  useEffect(() => {
    fetchTarefas();
  }, [profile, role]);

  // Filter tarefas
  const filteredTarefas = tarefas.filter((tarefa) => {
    if (filterResponsavel !== 'all' && tarefa.responsavel_id !== filterResponsavel) return false;
    if (filterPrioridade !== 'all' && tarefa.prioridade !== filterPrioridade) return false;
    return true;
  });

  // Create new task
  const handleCreateTarefa = async () => {
    if (!novaTarefa.titulo.trim()) {
      toast.error('Informe o título da tarefa');
      return;
    }
    if (!profile) return;

    setSavingTarefa(true);
    try {
      await createTarefaWithNotifications({
        titulo: novaTarefa.titulo,
        descricao: novaTarefa.descricao || null,
        prioridade: novaTarefa.prioridade,
        data_vencimento: novaTarefa.data_vencimento || null,
        responsaveis_ids: novaTarefa.responsaveis_ids,
        criador_id: profile.id,
        criador_nome: profile.nome || 'Usuário',
        cliente_id: profile.cliente_id ?? null,
      });

      toast.success('Tarefa criada com sucesso');
      setIsTarefaDialogOpen(false);
      setNovaTarefa({
        titulo: '',
        descricao: '',
        data_vencimento: format(new Date(), 'yyyy-MM-dd'),
        prioridade: 'media',
        responsaveis_ids: [],
      });
      fetchTarefas();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('Erro ao criar tarefa');
    } finally {
      setSavingTarefa(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, tarefa: Tarefa) => {
    setDraggedTarefa(tarefa);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDate(date);
  };

  const handleDragLeave = () => {
    setDropTargetDate(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetDate: Date) => {
    e.preventDefault();
    setDropTargetDate(null);

    if (!draggedTarefa) return;

    const newDateStr = format(targetDate, 'yyyy-MM-dd');
    
    if (draggedTarefa.data_vencimento === newDateStr) {
      setDraggedTarefa(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ data_vencimento: newDateStr })
        .eq('id', draggedTarefa.id);

      if (error) throw error;

      toast.success(`Tarefa movida para ${format(targetDate, 'dd/MM/yyyy', { locale: ptBR })}`);
      fetchTarefas();
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
    } finally {
      setDraggedTarefa(null);
    }
  };

  const getEventosForDate = (date: Date) => {
    return eventos.filter((evento) => isSameDay(evento.data, date));
  };

  const getTarefasForDate = (date: Date) => {
    return filteredTarefas.filter((tarefa) => {
      if (!tarefa.data_vencimento) return false;
      return isSameDay(parseISO(tarefa.data_vencimento), date);
    });
  };

  const getTarefasCountForDate = (date: Date) => {
    return tarefas.filter((tarefa) => {
      if (!tarefa.data_vencimento) return false;
      return isSameDay(parseISO(tarefa.data_vencimento), date);
    }).length;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart((prev) => addWeeks(prev, direction === 'next' ? 1 : -1));
  };

  // Month calendar days
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const todayEvents = getEventosForDate(new Date());
  const todayTarefas = getTarefasForDate(new Date());
  const upcomingEvents = eventos
    .filter((e) => e.data >= new Date())
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .slice(0, 5);
  
  const upcomingTarefas = filteredTarefas
    .filter((t) => t.data_vencimento && (isToday(parseISO(t.data_vencimento)) || isFuture(parseISO(t.data_vencimento))))
    .filter((t) => t.status !== 'concluida' && t.status !== 'cancelada')
    .slice(0, 5);

  const overdueTarefas = filteredTarefas
    .filter((t) => t.data_vencimento && isPast(parseISO(t.data_vencimento)) && !isToday(parseISO(t.data_vencimento)))
    .filter((t) => t.status !== 'concluida' && t.status !== 'cancelada');

  return (
    <MainLayout title="Agenda" subtitle="Calendário de licitações, compromissos e tarefas">
      {/* Tabs */}
      <Tabs value={agendaTab} onValueChange={(v) => setAgendaTab(v as 'eventos' | 'tarefas')} className="mb-6">
        <TabsList>
          <TabsTrigger value="eventos" className="gap-2">
            <CalendarIcon className="w-4 h-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="tarefas" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            Tarefas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats */}
      {agendaTab === 'eventos' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card border border-border shadow-sm"
          >
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="text-2xl font-bold text-foreground">{todayEvents.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
          >
            <p className="text-sm text-primary">Licitações</p>
            <p className="text-2xl font-bold text-primary">
              {eventos.filter((e) => e.tipo === 'licitacao').length}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm"
          >
            <p className="text-sm text-destructive">Prazos</p>
            <p className="text-2xl font-bold text-destructive">
              {eventos.filter((e) => e.tipo === 'prazo').length}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-info/10 border border-info/20 shadow-sm"
          >
            <p className="text-sm text-info">Reuniões</p>
            <p className="text-2xl font-bold text-info">
              {eventos.filter((e) => e.tipo === 'reuniao').length}
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card border border-border shadow-sm"
          >
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="text-2xl font-bold text-foreground">{todayTarefas.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm"
          >
            <p className="text-sm text-primary">Próximas</p>
            <p className="text-2xl font-bold text-primary">{upcomingTarefas.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm"
          >
            <p className="text-sm text-destructive">Atrasadas</p>
            <p className="text-2xl font-bold text-destructive">{overdueTarefas.length}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-success/10 border border-success/20 shadow-sm"
          >
            <p className="text-sm text-success">Concluídas</p>
            <p className="text-2xl font-bold text-success">
              {tarefas.filter((t) => t.status === 'concluida').length}
            </p>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-4 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="font-semibold ml-2">
                {format(weekStart, "MMMM yyyy", { locale: ptBR })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filters for Tarefas */}
              {agendaTab === 'tarefas' && (
                <>
                  <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="rounded-none"
                >
                  Semana
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-none"
                >
                  Mês
                </Button>
              </div>

              {/* Evento Dialog */}
              {agendaTab === 'eventos' && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary text-primary-foreground shadow-glow">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Evento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Novo Evento</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="titulo">Título</Label>
                        <Input id="titulo" placeholder="Título do evento" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="licitacao">Licitação</SelectItem>
                            <SelectItem value="reuniao">Reunião</SelectItem>
                            <SelectItem value="prazo">Prazo</SelectItem>
                            <SelectItem value="lembrete">Lembrete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="horaInicio">Início</Label>
                          <Input id="horaInicio" type="time" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="horaFim">Fim</Label>
                          <Input id="horaFim" type="time" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="local">Local</Label>
                        <Input id="local" placeholder="Local do evento" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea id="descricao" placeholder="Descrição do evento" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button className="gradient-primary text-primary-foreground">
                          Salvar Evento
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Tarefa Dialog */}
              {agendaTab === 'tarefas' && (
                <Dialog open={isTarefaDialogOpen} onOpenChange={setIsTarefaDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary text-primary-foreground shadow-glow">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Tarefa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nova Tarefa</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="tarefa-titulo">Título *</Label>
                        <Input 
                          id="tarefa-titulo" 
                          placeholder="Título da tarefa"
                          value={novaTarefa.titulo}
                          onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tarefa-prioridade">Prioridade</Label>
                          <Select 
                            value={novaTarefa.prioridade}
                            onValueChange={(v) => setNovaTarefa({ ...novaTarefa, prioridade: v as 'baixa' | 'media' | 'alta' | 'urgente' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgente">Urgente</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="baixa">Baixa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tarefa-data">Data de Vencimento</Label>
                          <Input 
                            id="tarefa-data" 
                            type="date"
                            value={novaTarefa.data_vencimento}
                            onChange={(e) => setNovaTarefa({ ...novaTarefa, data_vencimento: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Responsáveis</Label>
                        <ResponsaveisMultiSelect
                          profiles={profiles}
                          selectedIds={novaTarefa.responsaveis_ids}
                          onChange={(ids) => setNovaTarefa({ ...novaTarefa, responsaveis_ids: ids })}
                          placeholder="Selecionar um ou mais responsáveis"
                        />
                        <p className="text-xs text-muted-foreground">
                          Os responsáveis selecionados receberão uma notificação no sistema.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tarefa-descricao">Descrição</Label>
                        <Textarea 
                          id="tarefa-descricao" 
                          placeholder="Descrição da tarefa"
                          value={novaTarefa.descricao}
                          onChange={(e) => setNovaTarefa({ ...novaTarefa, descricao: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsTarefaDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          className="gradient-primary text-primary-foreground"
                          onClick={handleCreateTarefa}
                          disabled={savingTarefa}
                        >
                          {savingTarefa ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Tarefa'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="rounded-xl bg-card border border-border shadow-md overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-7 border-b border-border bg-secondary/50">
                {weekDays.map((day) => {
                  const tarefasCount = getTarefasCountForDate(day);
                  const eventosCount = getEventosForDate(day).length;
                  const count = agendaTab === 'tarefas' ? tarefasCount : eventosCount;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'p-3 text-center border-r last:border-r-0 border-border relative',
                        isSameDay(day, new Date()) && 'bg-primary/10'
                      )}
                    >
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        <p
                          className={cn(
                            'text-lg font-bold',
                            isSameDay(day, new Date()) ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {format(day, 'd')}
                        </p>
                        {count > 0 && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'h-5 min-w-[20px] px-1.5 text-[10px] font-bold',
                              agendaTab === 'tarefas' ? 'bg-primary text-primary-foreground' : 'bg-info text-info-foreground'
                            )}
                          >
                            {count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Events/Tasks Grid */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekDays.map((day) => {
                  const dayEvents = agendaTab === 'eventos' ? getEventosForDate(day) : [];
                  const dayTarefas = agendaTab === 'tarefas' ? getTarefasForDate(day) : [];
                  const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'p-2 border-r last:border-r-0 border-border min-h-[200px] transition-colors',
                        isSameDay(day, new Date()) && 'bg-primary/5',
                        isDropTarget && 'bg-primary/20 border-primary'
                      )}
                      onDragOver={(e) => agendaTab === 'tarefas' && handleDragOver(e, day)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => agendaTab === 'tarefas' && handleDrop(e, day)}
                    >
                      <div className="space-y-1">
                        {/* Eventos */}
                        {dayEvents.map((evento) => {
                          const config = tipoConfig[evento.tipo];
                          const Icon = config.icon;
                          return (
                            <div
                              key={evento.id}
                              className={cn(
                                'p-2 rounded-lg text-xs cursor-pointer hover:opacity-80 transition-opacity border',
                                config.color
                              )}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <Icon className="w-3 h-3" />
                                <span className="font-medium truncate">{evento.titulo}</span>
                              </div>
                              <p className="text-[10px] opacity-80">{evento.horaInicio}</p>
                            </div>
                          );
                        })}
                        {/* Tarefas */}
                        {dayTarefas.map((tarefa) => {
                          const prioridadeKey = tarefa.prioridade as keyof typeof priorityConfig;
                          const config = priorityConfig[prioridadeKey] || priorityConfig.baixa;
                          const statusKey = tarefa.status as keyof typeof statusConfig;
                          const StatusIcon = statusConfig[statusKey]?.icon || Circle;
                          return (
                            <div
                              key={tarefa.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, tarefa)}
                              onClick={() => navigate('/tarefas')}
                              className={cn(
                                'p-2 rounded-lg text-xs cursor-grab hover:opacity-80 transition-all border group',
                                config.color,
                                draggedTarefa?.id === tarefa.id && 'opacity-50'
                              )}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                <StatusIcon className="w-3 h-3" />
                                <span className="font-medium truncate">{tarefa.titulo}</span>
                              </div>
                              {tarefa.responsavel && (
                                <p className="text-[10px] opacity-80">{tarefa.responsavel.nome}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="rounded-xl bg-card border border-border shadow-md p-4">
              {agendaTab === 'tarefas' ? (
                <div>
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h3 className="font-semibold capitalize">
                      {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Week Days Header */}
                  <div className="grid grid-cols-7 mb-2">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                      <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells before month starts */}
                    {Array.from({ length: adjustedStartDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-20" />
                    ))}
                    
                    {/* Month days */}
                    {monthDays.map((day) => {
                      const tarefasCount = getTarefasCountForDate(day);
                      const dayTarefas = getTarefasForDate(day);
                      const isDropTarget = dropTargetDate && isSameDay(day, dropTargetDate);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'h-20 p-1 border rounded-lg cursor-pointer transition-all hover:border-primary/50',
                            isSameDay(day, new Date()) && 'bg-primary/10 border-primary',
                            isSameDay(day, selectedDate) && 'ring-2 ring-primary',
                            isDropTarget && 'bg-primary/20 border-primary'
                          )}
                          onClick={() => setSelectedDate(day)}
                          onDragOver={(e) => handleDragOver(e, day)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'text-sm font-medium',
                              isSameDay(day, new Date()) && 'text-primary'
                            )}>
                              {format(day, 'd')}
                            </span>
                            {tarefasCount > 0 && (
                              <Badge 
                                variant="secondary" 
                                className="h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-primary text-primary-foreground"
                              >
                                {tarefasCount}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 space-y-0.5 overflow-hidden max-h-[48px]">
                            {dayTarefas.slice(0, 2).map((tarefa) => (
                              <div
                                key={tarefa.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, tarefa)}
                                className={cn(
                                  'text-[9px] px-1 py-0.5 rounded truncate cursor-grab',
                                  priorityConfig[tarefa.prioridade as keyof typeof priorityConfig]?.color || 'bg-muted'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/tarefas');
                                }}
                              >
                                {tarefa.titulo}
                              </div>
                            ))}
                            {dayTarefas.length > 2 && (
                              <p className="text-[9px] text-muted-foreground text-center">
                                +{dayTarefas.length - 2} mais
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="w-full"
                />
              )}
            </div>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {agendaTab === 'eventos' ? (
            <>
              {/* Today's Events */}
              <div className="rounded-xl bg-card border border-border shadow-md p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Eventos de Hoje
                </h3>
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum evento hoje
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayEvents.map((evento) => {
                      const config = tipoConfig[evento.tipo];
                      const Icon = config.icon;
                      return (
                        <div
                          key={evento.id}
                          className="p-3 rounded-lg bg-secondary/50 border border-border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn('text-xs', config.color)}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm truncate">{evento.titulo}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {evento.horaInicio} - {evento.horaFim}
                                </span>
                                {evento.local && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {evento.local}
                                  </span>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                                <DropdownMenuItem>Editar</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming Events */}
              <div className="rounded-xl bg-card border border-border shadow-md p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Próximos Eventos
                </h3>
                <div className="space-y-3">
                  {upcomingEvents.map((evento) => {
                    const config = tipoConfig[evento.tipo];
                    const Icon = config.icon;
                    return (
                      <div
                        key={evento.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                            config.color
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evento.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(evento.data, "dd/MM", { locale: ptBR })} às {evento.horaInicio}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tarefas Atrasadas */}
              {overdueTarefas.length > 0 && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 shadow-md p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    Tarefas Atrasadas ({overdueTarefas.length})
                  </h3>
                  <div className="space-y-3">
                    {overdueTarefas.slice(0, 3).map((tarefa) => {
                      const prioridadeKey = tarefa.prioridade as keyof typeof priorityConfig;
                      const config = priorityConfig[prioridadeKey] || priorityConfig.baixa;
                      return (
                        <div
                          key={tarefa.id}
                          onClick={() => navigate('/tarefas')}
                          className="p-3 rounded-lg bg-card border border-destructive/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn('text-xs', config.color)}>
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm truncate">{tarefa.titulo}</p>
                              <p className="text-xs text-destructive mt-1">
                                Venceu em {tarefa.data_vencimento && format(parseISO(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Today's Tasks */}
              <div className="rounded-xl bg-card border border-border shadow-md p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Tarefas de Hoje
                </h3>
                {todayTarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma tarefa para hoje
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayTarefas.map((tarefa) => {
                      const prioridadeKey = tarefa.prioridade as keyof typeof priorityConfig;
                      const config = priorityConfig[prioridadeKey] || priorityConfig.baixa;
                      const statusKey = tarefa.status as keyof typeof statusConfig;
                      const statusCfg = statusConfig[statusKey] || statusConfig.pendente;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <div
                          key={tarefa.id}
                          onClick={() => navigate('/tarefas')}
                          className="p-3 rounded-lg bg-secondary/50 border border-border cursor-pointer hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={cn('text-xs', config.color)}>
                                  {config.label}
                                </Badge>
                                <StatusIcon className={cn('w-3 h-3', statusCfg.color)} />
                              </div>
                              <p className="font-medium text-sm truncate">{tarefa.titulo}</p>
                              {tarefa.responsavel && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {tarefa.responsavel.nome}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upcoming Tasks */}
              <div className="rounded-xl bg-card border border-border shadow-md p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Próximas Tarefas
                </h3>
                {upcomingTarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma tarefa pendente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingTarefas.map((tarefa) => {
                      const prioridadeKey = tarefa.prioridade as keyof typeof priorityConfig;
                      const config = priorityConfig[prioridadeKey] || priorityConfig.baixa;
                      return (
                        <div
                          key={tarefa.id}
                          onClick={() => navigate('/tarefas')}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
                              config.color
                            )}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tarefa.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                              {tarefa.data_vencimento && format(parseISO(tarefa.data_vencimento), "dd/MM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
