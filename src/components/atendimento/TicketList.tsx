import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  Wrench
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface TicketListProps {
  tickets: Ticket[];
  loading: boolean;
  selectedTicket: Ticket | null;
  onSelectTicket: (ticket: Ticket) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  aberto: { label: "Aberto", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
  em_atendimento: { label: "Em Atendimento", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  aguardando_cliente: { label: "Aguardando", variant: "outline", icon: <User className="h-3 w-3" /> },
  resolvido: { label: "Resolvido", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  fechado: { label: "Fechado", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

const prioridadeConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  media: { label: "Média", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  alta: { label: "Alta", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  urgente: { label: "Urgente", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const categoriaConfig: Record<string, string> = {
  duvida: "Dúvida",
  erro: "Erro",
  sugestao: "Sugestão",
  outro: "Outro",
};

export function TicketList({ tickets, loading, selectedTicket, onSelectTicket }: TicketListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>Nenhum ticket encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => {
        const status = statusConfig[ticket.status] || statusConfig.aberto;
        const prioridade = prioridadeConfig[ticket.prioridade] || prioridadeConfig.media;
        const isSelected = selectedTicket?.id === ticket.id;

        return (
          <Card
            key={ticket.id}
            className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
              isSelected ? "border-primary bg-accent" : ""
            }`}
            onClick={() => onSelectTicket(ticket)}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-medium text-sm line-clamp-1">{ticket.titulo}</h3>
                {ticket.correcao_aplicada && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900">
                          <Wrench className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Correção aplicada via Lovable</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Badge variant={status.variant} className="shrink-0 text-xs">
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {ticket.descricao}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {categoriaConfig[ticket.categoria] || ticket.categoria}
              </Badge>
              <Badge className={`text-xs ${prioridade.className}`}>
                {prioridade.label}
              </Badge>
              {ticket.cliente?.nome && (
                <span className="text-xs text-muted-foreground">
                  {ticket.cliente.nome}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{ticket.criador?.nome || "Anônimo"}</span>
              <span>
                {format(new Date(ticket.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
