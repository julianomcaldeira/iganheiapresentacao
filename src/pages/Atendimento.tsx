import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Plus, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TicketList } from "@/components/atendimento/TicketList";
import { TicketChat } from "@/components/atendimento/TicketChat";
import { NovoTicketDialog } from "@/components/atendimento/NovoTicketDialog";
import { ClienteTicketView } from "@/components/atendimento/ClienteTicketView";

type TicketStatus = 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'resolvido' | 'fechado';

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  cliente_id: string;
  criado_por: string;
  atendente_id: string | null;
  resolvido_em: string | null;
  correcao_aplicada: boolean | null;
  correcao_data: string | null;
  correcao_aplicada_por: string | null;
  correcao_link: string | null;
  correcao_descricao: string | null;
  cliente?: { nome: string };
  criador?: { nome: string };
  atendente?: { nome: string };
  correcao_autor?: { nome: string };
}

export default function Atendimento() {
  const { isAdmin, isAtendente } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "todos">("todos");
  const [showNovoTicket, setShowNovoTicket] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tickets')
        .select(`
          *,
          cliente:clientes(nome),
          criador:profiles!tickets_criado_por_fkey(nome),
          atendente:profiles!tickets_atendente_id_fkey(nome),
          correcao_autor:profiles!tickets_correcao_aplicada_por_fkey(nome)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== "todos") {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tickets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const filteredTickets = tickets.filter(ticket =>
    ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusCounts = () => {
    return {
      aberto: tickets.filter(t => t.status === 'aberto').length,
      em_atendimento: tickets.filter(t => t.status === 'em_atendimento').length,
      aguardando_cliente: tickets.filter(t => t.status === 'aguardando_cliente').length,
      resolvido: tickets.filter(t => t.status === 'resolvido').length,
      fechado: tickets.filter(t => t.status === 'fechado').length,
    };
  };

  const counts = getStatusCounts();

  // Client view - simplified interface for customers
  const isSupport = isAdmin || isAtendente;
  
  if (!isSupport) {
    return (
      <MainLayout title="Atendimento" subtitle="Suporte ao Cliente i-Ganhei">
        <ClienteTicketView />
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Atendimento" subtitle="Gestão de tickets de suporte">
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        {/* Left Panel - Ticket List */}
        <div className="w-1/3 flex flex-col border-r border-border pr-4">
          <div className="flex items-center justify-between mb-4">
            <Button onClick={() => setShowNovoTicket(true)} size="sm" data-page-new-action>
              <Plus className="h-4 w-4 mr-1" />
              Novo Ticket
            </Button>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Card className="p-3 cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('aberto')}>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Abertos</span>
                <Badge variant="destructive" className="ml-auto">{counts.aberto}</Badge>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('em_atendimento')}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Em Atendimento</span>
                <Badge variant="secondary" className="ml-auto">{counts.em_atendimento}</Badge>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('aguardando_cliente')}>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Aguardando</span>
                <Badge variant="outline" className="ml-auto">{counts.aguardando_cliente}</Badge>
              </div>
            </Card>
            <Card className="p-3 cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('resolvido')}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Resolvidos</span>
                <Badge className="ml-auto bg-green-500">{counts.resolvido}</Badge>
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as TicketStatus | "todos")} className="mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="todos" className="flex-1">Todos</TabsTrigger>
              <TabsTrigger value="aberto" className="flex-1">Abertos</TabsTrigger>
              <TabsTrigger value="em_atendimento" className="flex-1">Em Atend.</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto">
            <TicketList
              tickets={filteredTickets}
              loading={loading}
              selectedTicket={selectedTicket}
              onSelectTicket={(ticket) => setSelectedTicket(ticket)}
            />
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col">
          {selectedTicket ? (
            <TicketChat
              ticket={selectedTicket}
              onTicketUpdate={fetchTickets}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um ticket para visualizar</p>
              </div>
            </div>
          )}
        </div>

        <NovoTicketDialog
          open={showNovoTicket}
          onOpenChange={setShowNovoTicket}
          onTicketCreated={() => {
            fetchTickets();
            setShowNovoTicket(false);
          }}
        />
      </div>
    </MainLayout>
  );
}
