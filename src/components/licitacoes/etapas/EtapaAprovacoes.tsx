import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Send, ThumbsUp, ThumbsDown, MessageSquare, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';

interface Aprovador {
  id: string;
  nome: string;
  status: 'pendente' | 'aprovado' | 'recusado' | 'esclarecimento';
  comentario?: string;
  data_resposta?: string;
}

export function EtapaAprovacoes({ etapa, licitacaoId, clienteId, onStatusChange }: EtapaComponentProps) {
  const { profile } = useAuth();
  const [aprovadores, setAprovadores] = useState<Aprovador[]>(
    (etapa.dados?.aprovadores as Aprovador[]) || []
  );
  const [showRespostaDialog, setShowRespostaDialog] = useState(false);
  const [selectedAprovador, setSelectedAprovador] = useState<Aprovador | null>(null);
  const [comentario, setComentario] = useState('');

  const handleEnviarAprovacao = async () => {
    // Fetch profiles for approval (managers and admins)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('cliente_id', clienteId);

    if (!profiles || profiles.length === 0) {
      toast.error('Nenhum aprovador encontrado');
      return;
    }

    const newAprovadores: Aprovador[] = profiles.map(p => ({
      id: p.id,
      nome: p.nome || 'Usuário',
      status: 'pendente',
    }));

    setAprovadores(newAprovadores);
    await onStatusChange('aprovacoes', 'aguardando_aprovacoes', { aprovadores: newAprovadores });
    toast.success('Solicitação de aprovação enviada!');
  };

  const handleResponder = async (aprovado: boolean) => {
    if (!selectedAprovador) return;

    const updatedAprovadores = aprovadores.map(a =>
      a.id === selectedAprovador.id
        ? {
            ...a,
            status: aprovado ? 'aprovado' as const : 'recusado' as const,
            comentario,
            data_resposta: new Date().toISOString(),
          }
        : a
    );

    setAprovadores(updatedAprovadores);

    // Check if all have responded
    const allResponded = updatedAprovadores.every(a => a.status !== 'pendente');
    const newStatus = allResponded ? 'concluido' : 'aguardando_aprovacoes';

    await onStatusChange('aprovacoes', newStatus, { aprovadores: updatedAprovadores });
    setShowRespostaDialog(false);
    setComentario('');
    setSelectedAprovador(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-emerald-500/20 text-emerald-600';
      case 'recusado': return 'bg-red-500/20 text-red-600';
      case 'esclarecimento': return 'bg-orange-500/20 text-orange-600';
      default: return 'bg-yellow-500/20 text-yellow-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'recusado': return 'Recusado';
      case 'esclarecimento': return 'Solicitou Esclarecimento';
      default: return 'Pendente';
    }
  };

  return (
    <div className="space-y-4">
      {(etapa.status === 'nao_iniciada' || aprovadores.length === 0) && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envie esta licitação para aprovação dos responsáveis.
          </p>
          <Button onClick={handleEnviarAprovacao} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Enviar para Aprovação
          </Button>
        </div>
      )}

      {aprovadores.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Aprovadores</span>
            <Badge variant="outline" className="text-xs">
              {aprovadores.filter(a => a.status !== 'pendente').length}/{aprovadores.length}
            </Badge>
          </div>

          {aprovadores.map(ap => (
            <Card key={ap.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{ap.nome}</p>
                  {ap.comentario && (
                    <p className="text-xs text-muted-foreground mt-1">"{ap.comentario}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(ap.status)}>
                    {getStatusLabel(ap.status)}
                  </Badge>
                  {ap.status === 'pendente' && ap.id === profile?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAprovador(ap);
                        setShowRespostaDialog(true);
                      }}
                    >
                      Responder
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showRespostaDialog} onOpenChange={setShowRespostaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Aprovação</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Comentário</Label>
            <Textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Adicione um comentário (opcional)..."
            />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleResponder(false)}>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Recusar
            </Button>
            <Button onClick={() => handleResponder(true)}>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
