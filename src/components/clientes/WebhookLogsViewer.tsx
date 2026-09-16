import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Eye,
  Clock,
  Webhook
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookLog {
  id: string;
  cliente_id: string;
  ticket_id: string | null;
  evento: string;
  webhook_url: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  response_body: string | null;
  sucesso: boolean;
  erro: string | null;
  tempo_resposta_ms: number | null;
  created_at: string;
}

interface WebhookLogsViewerProps {
  clienteId: string;
}

export function WebhookLogsViewer({ clienteId }: WebhookLogsViewerProps) {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data || []) as WebhookLog[]);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      toast.error('Erro ao carregar histórico de webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [clienteId]);

  const getEventLabel = (evento: string) => {
    const labels: Record<string, string> = {
      resolved: 'Ticket Resolvido',
      created: 'Ticket Criado',
      updated: 'Ticket Atualizado',
      correction_applied: 'Correção Aplicada',
    };
    return labels[evento] || evento;
  };

  const openDetails = (log: WebhookLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum webhook enviado ainda</p>
        <p className="text-sm mt-1">Os webhooks serão registrados aqui quando tickets forem resolvidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" />
          <h4 className="font-medium">Histórico de Webhooks</h4>
          <Badge variant="outline">{logs.length} registros</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>HTTP</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {log.sucesso ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {getEventLabel(log.evento)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {log.tempo_resposta_ms !== null ? (
                    <span className="text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.tempo_resposta_ms}ms
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {log.status_code ? (
                    <Badge 
                      variant="outline" 
                      className={
                        log.status_code >= 200 && log.status_code < 300
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : log.status_code >= 400
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                      }
                    >
                      {log.status_code}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => openDetails(log)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.sucesso ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Detalhes do Webhook
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Evento</label>
                    <p className="mt-1">{getEventLabel(selectedLog.evento)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data/Hora</label>
                    <p className="mt-1">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status HTTP</label>
                    <p className="mt-1">{selectedLog.status_code || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tempo de Resposta</label>
                    <p className="mt-1">{selectedLog.tempo_resposta_ms}ms</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL do Webhook</label>
                  <p className="mt-1 font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedLog.webhook_url}
                  </p>
                </div>

                {selectedLog.erro && (
                  <div>
                    <label className="text-sm font-medium text-destructive">Erro</label>
                    <p className="mt-1 text-sm bg-destructive/10 text-destructive p-2 rounded">
                      {selectedLog.erro}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payload Enviado</label>
                  <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-x-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>

                {selectedLog.response_body && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resposta</label>
                    <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-x-auto max-h-[150px]">
                      {selectedLog.response_body}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
