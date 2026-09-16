import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
  Code,
  MessageSquare,
  Wrench,
  ExternalLink,
  Check,
  Link as LinkIcon
} from "lucide-react";

interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
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

interface Mensagem {
  id: string;
  ticket_id: string;
  autor_id: string | null;
  conteudo: string;
  is_ia: boolean;
  is_interno: boolean;
  sugestao_ia: string | null;
  created_at: string;
  autor?: { nome: string };
}

interface TicketChatProps {
  ticket: Ticket;
  onTicketUpdate: () => void;
  isAdmin: boolean;
}

export function TicketChat({ ticket, onTicketUpdate, isAdmin }: TicketChatProps) {
  const { user } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState<string | null>(null);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [novoStatus, setNovoStatus] = useState(ticket.status);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Correction tracking state
  const [showCorrecaoForm, setShowCorrecaoForm] = useState(false);
  const [correcaoLink, setCorrecaoLink] = useState(ticket.correcao_link || "");
  const [correcaoDescricao, setCorrecaoDescricao] = useState(ticket.correcao_descricao || "");
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);

  const fetchMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_mensagens')
        .select(`
          *,
          autor:profiles!ticket_mensagens_autor_id_fkey(nome)
        `)
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMensagens();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_mensagens', filter: `ticket_id=eq.${ticket.id}` },
        () => {
          fetchMensagens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    setNovoStatus(ticket.status);
  }, [ticket.status]);

  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || !user) return;

    try {
      setEnviando(true);

      const { error } = await supabase
        .from('ticket_mensagens')
        .insert({
          ticket_id: ticket.id,
          autor_id: user.id,
          conteudo: novaMensagem,
          is_ia: false,
          is_interno: false,
          sugestao_ia: sugestaoIA,
        });

      if (error) throw error;

      setNovaMensagem("");
      setSugestaoIA(null);

      // Update ticket status if it was open
      if (ticket.status === 'aberto' && isAdmin) {
        await supabase
          .from('tickets')
          .update({ 
            status: 'em_atendimento',
            atendente_id: user.id 
          })
          .eq('id', ticket.id);
        onTicketUpdate();
      }

      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const solicitarSugestaoIA = async () => {
    if (!novaMensagem.trim()) {
      toast({
        title: "Atenção",
        description: "Digite uma mensagem para obter sugestão da IA.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCarregandoIA(true);

      const { data, error } = await supabase.functions.invoke('support-ai-assistant', {
        body: {
          ticketId: ticket.id,
          mensagem: novaMensagem,
          historico: mensagens.map(m => ({
            conteudo: m.conteudo,
            is_ia: m.is_ia,
          })),
          ticketInfo: {
            titulo: ticket.titulo,
            descricao: ticket.descricao,
            categoria: ticket.categoria,
            prioridade: ticket.prioridade,
            status: ticket.status,
          },
        },
      });

      if (error) throw error;

      if (data?.sugestao) {
        setSugestaoIA(data.sugestao);
        toast({
          title: "Sugestão gerada",
          description: "A IA analisou o problema e gerou uma sugestão.",
        });
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        title: "Erro",
        description: "Não foi possível obter sugestão da IA.",
        variant: "destructive",
      });
    } finally {
      setCarregandoIA(false);
    }
  };

  const atualizarStatus = async (status: string) => {
    try {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'resolvido') {
        updates.resolvido_em = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticket.id);

      if (error) throw error;

      // Trigger webhook if status is resolvido
      if (status === 'resolvido') {
        triggerWebhook('resolved');
      }

      onTicketUpdate();
      toast({
        title: "Status atualizado",
        description: `O ticket foi marcado como "${status}".`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const copiarSugestao = () => {
    if (sugestaoIA) {
      navigator.clipboard.writeText(sugestaoIA);
      toast({
        title: "Copiado",
        description: "Sugestão copiada para a área de transferência.",
      });
    }
  };

  // Extract Lovable prompt from AI suggestion
  const extractLovablePrompt = (suggestion: string): string | null => {
    const match = suggestion.match(/## 🔧 Prompt para o Lovable\s*```([\s\S]*?)```/);
    if (match && match[1]) {
      const prompt = match[1].trim();
      if (prompt.toLowerCase().includes('n/a') || prompt.toLowerCase().includes('não é um bug')) {
        return null;
      }
      return prompt;
    }
    return null;
  };

  const copiarPromptLovable = () => {
    if (sugestaoIA) {
      const prompt = extractLovablePrompt(sugestaoIA);
      if (prompt) {
        navigator.clipboard.writeText(prompt);
        toast({
          title: "Prompt copiado!",
          description: "Cole diretamente no chat do Lovable para corrigir o bug.",
        });
      }
    }
  };

  const lovablePrompt = sugestaoIA ? extractLovablePrompt(sugestaoIA) : null;

  const triggerWebhook = async (action: 'resolved' | 'created' | 'updated' | 'correction_applied') => {
    try {
      console.log(`Triggering webhook for ticket ${ticket.id}, action: ${action}`);
      const { error } = await supabase.functions.invoke('ticket-webhook', {
        body: {
          ticket_id: ticket.id,
          action,
        },
      });
      
      if (error) {
        console.error('Webhook error:', error);
      } else {
        console.log('Webhook triggered successfully');
      }
    } catch (err) {
      console.error('Error triggering webhook:', err);
    }
  };

  const registrarCorrecao = async () => {
    if (!user) return;
    
    try {
      setSalvandoCorrecao(true);
      
      const { error } = await supabase
        .from('tickets')
        .update({
          correcao_aplicada: true,
          correcao_data: new Date().toISOString(),
          correcao_aplicada_por: user.id,
          correcao_link: correcaoLink || null,
          correcao_descricao: correcaoDescricao || null,
        })
        .eq('id', ticket.id);
      
      if (error) throw error;
      
      // Trigger webhook for correction applied
      triggerWebhook('correction_applied');
      
      setShowCorrecaoForm(false);
      onTicketUpdate();
      
      toast({
        title: "Correção registrada!",
        description: "A correção via Lovable foi registrada no ticket.",
      });
    } catch (error) {
      console.error('Error saving correction:', error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a correção.",
        variant: "destructive",
      });
    } finally {
      setSalvandoCorrecao(false);
    }
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    aberto: { label: "Aberto", className: "bg-red-100 text-red-800" },
    em_atendimento: { label: "Em Atendimento", className: "bg-yellow-100 text-yellow-800" },
    aguardando_cliente: { label: "Aguardando Cliente", className: "bg-blue-100 text-blue-800" },
    resolvido: { label: "Resolvido", className: "bg-green-100 text-green-800" },
    fechado: { label: "Fechado", className: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{ticket.titulo}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{ticket.descricao}</p>
            </div>
            <Badge className={statusConfig[ticket.status]?.className}>
              {statusConfig[ticket.status]?.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <span>Cliente: {ticket.cliente?.nome || 'N/A'}</span>
            <span>Criado por: {ticket.criador?.nome || 'N/A'}</span>
            <span>Atendente: {ticket.atendente?.nome || 'Não atribuído'}</span>
            <span>Criado em: {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
          </div>
        </CardHeader>
        {isAdmin && (
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={novoStatus} onValueChange={atualizarStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                  <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Correction Section */}
            {ticket.correcao_aplicada ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Correção Aplicada via Lovable
                  </span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
                  <p>Data: {ticket.correcao_data ? format(new Date(ticket.correcao_data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}</p>
                  <p>Aplicada por: {ticket.correcao_autor?.nome || 'N/A'}</p>
                  {ticket.correcao_link && (
                    <a 
                      href={ticket.correcao_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-green-700 dark:text-green-300 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver commit/versão
                    </a>
                  )}
                  {ticket.correcao_descricao && (
                    <p className="mt-2 text-green-700 dark:text-green-300">
                      <strong>Descrição:</strong> {ticket.correcao_descricao}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {!showCorrecaoForm ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCorrecaoForm(true)}
                    className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Registrar Correção via Lovable
                  </Button>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Registrar Correção
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setShowCorrecaoForm(false)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="url"
                          placeholder="Link do commit/versão (opcional)"
                          value={correcaoLink}
                          onChange={(e) => setCorrecaoLink(e.target.value)}
                          className="flex-1 text-sm px-2 py-1 border rounded-md bg-background"
                        />
                      </div>
                      <Textarea
                        placeholder="Descrição da correção aplicada..."
                        value={correcaoDescricao}
                        onChange={(e) => setCorrecaoDescricao(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                      <Button 
                        size="sm" 
                        onClick={registrarCorrecao}
                        disabled={salvandoCorrecao}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        {salvandoCorrecao ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Confirmar Correção Aplicada
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : mensagens.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_ia ? 'justify-start' : msg.autor_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.is_ia
                    ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                    : msg.autor_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.is_ia ? (
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium">
                    {msg.is_ia ? 'Assistente IA' : msg.autor?.nome || 'Usuário'}
                  </span>
                  <span className="text-xs opacity-70">
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  {msg.is_interno && (
                    <Badge variant="outline" className="text-xs">Interno</Badge>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestion Panel */}
      {sugestaoIA && (
        <Card className="mb-4 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm text-purple-700 dark:text-purple-300">Análise da IA</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={copiarSugestao} title="Copiar tudo">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSugestaoIA(null)} title="Limpar">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue={lovablePrompt ? "lovable" : "analise"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analise" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Análise Completa
                </TabsTrigger>
                <TabsTrigger value="lovable" className="flex items-center gap-1" disabled={!lovablePrompt}>
                  <Code className="h-3 w-3" />
                  Prompt Lovable
                </TabsTrigger>
              </TabsList>
              <TabsContent value="analise" className="mt-3">
                <div className="text-sm whitespace-pre-wrap text-purple-800 dark:text-purple-200 max-h-64 overflow-y-auto">
                  {sugestaoIA}
                </div>
              </TabsContent>
              <TabsContent value="lovable" className="mt-3">
                {lovablePrompt ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md">
                      <Wrench className="h-4 w-4" />
                      <span>Copie o prompt abaixo e cole no chat do Lovable para corrigir o bug</span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {lovablePrompt}
                    </div>
                    <Button 
                      onClick={copiarPromptLovable} 
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Prompt para o Lovable
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    A IA não identificou um bug de código neste ticket.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2 mb-2">
          <Textarea
            placeholder="Digite sua mensagem..."
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={solicitarSugestaoIA}
                disabled={carregandoIA || !novaMensagem.trim()}
              >
                {carregandoIA ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Sugestão IA
              </Button>
            )}
          </div>
          <Button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()}>
            {enviando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
