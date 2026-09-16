import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send,
  Plus,
  MessageSquare,
  User,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Bug,
  ArrowLeft,
  Headphones,
  BookOpen,
  Ticket,
} from "lucide-react";
import FAQKnowledgeBase from "./FAQKnowledgeBase";

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolvido_em: string | null;
}

interface Mensagem {
  id: string;
  ticket_id: string;
  autor_id: string | null;
  conteudo: string;
  is_ia: boolean;
  is_interno: boolean;
  created_at: string;
  autor?: { nome: string };
}

export function ClienteTicketView() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showNovoTicket, setShowNovoTicket] = useState(false);
  const [criandoTicket, setCriandoTicket] = useState(false);
  const [userProfile, setUserProfile] = useState<{ cliente_id: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [novoTicket, setNovoTicket] = useState({
    titulo: "",
    descricao: "",
    categoria: "duvida",
    prioridade: "media",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("cliente_id")
        .eq("id", user.id)
        .single();
      setUserProfile(data);
    };
    fetchUserProfile();
  }, [user]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas solicitações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMensagens = async (ticketId: string) => {
    try {
      setLoadingMensagens(true);
      const { data, error } = await supabase
        .from("ticket_mensagens")
        .select(`
          *,
          autor:profiles!ticket_mensagens_autor_id_fkey(nome)
        `)
        .eq("ticket_id", ticketId)
        .eq("is_interno", false)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMensagens(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("cliente-tickets")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          fetchTickets();
          const newData = payload.new as Ticket;
          const oldData = payload.old as Ticket;
          if (newData.status !== oldData.status) {
            toast({
              title: "Atualização na solicitação",
              description: `O status do ticket "${newData.titulo}" foi alterado para "${statusConfig[newData.status]?.label || newData.status}"`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Notificações de novas mensagens (quando não está na conversa)
  useEffect(() => {
    const channel = supabase
      .channel("cliente-mensagens-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_mensagens" },
        async (payload) => {
          const newMsg = payload.new as Mensagem;
          // Só notifica se não for mensagem do próprio usuário e se não estiver visualizando o ticket
          if (newMsg.autor_id !== user?.id && newMsg.ticket_id !== selectedTicket?.id) {
            // Busca o ticket para mostrar o título
            const { data: ticketData } = await supabase
              .from("tickets")
              .select("titulo")
              .eq("id", newMsg.ticket_id)
              .single();
            
            toast({
              title: "Nova resposta do suporte",
              description: ticketData?.titulo || "Você recebeu uma nova mensagem",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, selectedTicket?.id]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMensagens(selectedTicket.id);

      const channel = supabase
        .channel(`cliente-ticket-${selectedTicket.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ticket_mensagens",
            filter: `ticket_id=eq.${selectedTicket.id}`,
          },
          (payload) => {
            const newMsg = payload.new as Mensagem;
            fetchMensagens(selectedTicket.id);
            // Notifica apenas se for mensagem de outra pessoa
            if (newMsg.autor_id !== user?.id) {
              toast({
                title: "Nova mensagem",
                description: "O suporte respondeu sua solicitação",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const criarTicket = async () => {
    if (!user || !userProfile?.cliente_id) {
      toast({
        title: "Erro",
        description: "Você precisa estar vinculado a um cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!novoTicket.titulo.trim() || !novoTicket.descricao.trim()) {
      toast({
        title: "Atenção",
        description: "Preencha o título e a descrição da solicitação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCriandoTicket(true);
      const { error } = await supabase.from("tickets").insert({
        titulo: novoTicket.titulo,
        descricao: novoTicket.descricao,
        categoria: novoTicket.categoria as "duvida" | "erro" | "sugestao" | "outro",
        prioridade: novoTicket.prioridade as "baixa" | "media" | "alta" | "urgente",
        cliente_id: userProfile.cliente_id,
        criado_por: user.id,
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "O time i-Ganhei irá atender sua demanda em breve.",
      });

      setNovoTicket({
        titulo: "",
        descricao: "",
        categoria: "duvida",
        prioridade: "media",
      });
      setShowNovoTicket(false);
      fetchTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setCriandoTicket(false);
    }
  };

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !user || !selectedTicket) return;

    try {
      setEnviando(true);
      const { error } = await supabase.from("ticket_mensagens").insert({
        ticket_id: selectedTicket.id,
        autor_id: user.id,
        conteudo: novaMensagem,
        is_ia: false,
        is_interno: false,
      });

      if (error) throw error;
      setNovaMensagem("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    aberto: { label: "Aberto", icon: AlertCircle, color: "text-red-500" },
    em_atendimento: { label: "Em Atendimento", icon: Clock, color: "text-yellow-500" },
    aguardando_cliente: { label: "Aguardando Resposta", icon: HelpCircle, color: "text-blue-500" },
    resolvido: { label: "Resolvido", icon: CheckCircle, color: "text-green-500" },
    fechado: { label: "Fechado", icon: CheckCircle, color: "text-muted-foreground" },
  };

  const categoriaConfig: Record<string, { label: string; icon: React.ElementType }> = {
    duvida: { label: "Dúvida", icon: HelpCircle },
    erro: { label: "Erro/Bug", icon: Bug },
    sugestao: { label: "Sugestão", icon: Lightbulb },
    outro: { label: "Outro", icon: MessageSquare },
  };

  if (showNovoTicket) {
    return (
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setShowNovoTicket(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Nova Solicitação de Atendimento
            </CardTitle>
            <CardDescription>
              Descreva sua dúvida, problema ou sugestão. O time i-Ganhei irá responder o mais breve possível.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="Resumo da sua solicitação"
                value={novoTicket.titulo}
                onChange={(e) => setNovoTicket((prev) => ({ ...prev, titulo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva em detalhes o que você precisa..."
                className="min-h-[120px]"
                value={novoTicket.descricao}
                onChange={(e) => setNovoTicket((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={novoTicket.categoria}
                  onValueChange={(value) => setNovoTicket((prev) => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="duvida">Dúvida</SelectItem>
                    <SelectItem value="erro">Erro/Bug</SelectItem>
                    <SelectItem value="sugestao">Sugestão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urgência</Label>
                <Select
                  value={novoTicket.prioridade}
                  onValueChange={(value) => setNovoTicket((prev) => ({ ...prev, prioridade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNovoTicket(false)}>
                Cancelar
              </Button>
              <Button onClick={criarTicket} disabled={criandoTicket}>
                {criandoTicket && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enviar Solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedTicket) {
    const StatusIcon = statusConfig[selectedTicket.status]?.icon || AlertCircle;
    
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        <Button
          variant="ghost"
          className="mb-4 w-fit"
          onClick={() => setSelectedTicket(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar às solicitações
        </Button>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{selectedTicket.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTicket.descricao}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${statusConfig[selectedTicket.status]?.color}`} />
                <span className="text-sm font-medium">
                  {statusConfig[selectedTicket.status]?.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <Badge variant="outline">
                {categoriaConfig[selectedTicket.categoria]?.label || selectedTicket.categoria}
              </Badge>
              <span>
                Criado em {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              {selectedTicket.resolvido_em && (
                <span className="text-green-600">
                  Resolvido em {format(new Date(selectedTicket.resolvido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversa com o Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 px-4">
              {loadingMensagens ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Headphones className="h-10 w-10 mb-2 opacity-50" />
                  <p>Aguardando resposta do suporte...</p>
                  <p className="text-xs">Você será notificado quando houver uma resposta.</p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {mensagens.map((mensagem) => {
                    const isOwn = mensagem.autor_id === user?.id;
                    return (
                      <div
                        key={mensagem.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {isOwn ? "Você" : mensagem.autor?.nome || "Suporte i-Ganhei"}
                            </span>
                            <span className="text-xs opacity-70">
                              {format(new Date(mensagem.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {selectedTicket.status !== "fechado" && selectedTicket.status !== "resolvido" && (
              <>
                <Separator />
                <div className="p-4 flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        enviarMensagem();
                      }
                    }}
                  />
                  <Button
                    onClick={enviarMensagem}
                    disabled={enviando || !novaMensagem.trim()}
                    className="self-end"
                  >
                    {enviando ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState("faq");

  const handleNeedSupport = () => {
    setActiveTab("tickets");
    setShowNovoTicket(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Central de Atendimento</h2>
          <p className="text-muted-foreground">
            Tire suas dúvidas e solicite suporte ao time i-Ganhei
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Minhas Solicitações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-4">
          <FAQKnowledgeBase onNeedSupport={handleNeedSupport} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowNovoTicket(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <Card className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma solicitação ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Clique no botão acima para abrir sua primeira solicitação de atendimento.
                </p>
                <Button onClick={() => setShowNovoTicket(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status]?.icon || AlertCircle;
                const CategoriaIcon = categoriaConfig[ticket.categoria]?.icon || MessageSquare;

                return (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CategoriaIcon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{ticket.titulo}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.descricao}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {categoriaConfig[ticket.categoria]?.label || ticket.categoria}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <StatusIcon className={`h-5 w-5 ${statusConfig[ticket.status]?.color}`} />
                          <span className="text-sm font-medium whitespace-nowrap">
                            {statusConfig[ticket.status]?.label}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
