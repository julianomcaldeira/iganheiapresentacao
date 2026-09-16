import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Swords, ExternalLink, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';

export function EtapaDisputa({ etapa, licitacaoData, onStatusChange }: EtapaComponentProps) {
  const [linkPortal, setLinkPortal] = useState<string>(etapa.dados?.link_portal as string || '');
  const [motivoFinalizacao, setMotivoFinalizacao] = useState<string>(etapa.dados?.motivo_finalizacao as string || '');

  const handleIniciarDisputa = async () => {
    await onStatusChange('disputa_pregao', 'em_disputa', { link_portal: linkPortal });
    toast.success('Disputa iniciada!');
  };

  const handleRecurso = async () => {
    await onStatusChange('disputa_pregao', 'recurso_contrarrazao');
  };

  const handleFinalizar = async () => {
    if (!motivoFinalizacao.trim()) {
      toast.error('Informe o motivo da finalização');
      return;
    }
    await onStatusChange('disputa_pregao', 'disputa_finalizada', { motivo_finalizacao: motivoFinalizacao });
    toast.success('Disputa finalizada!');
  };

  return (
    <div className="space-y-4">
      {(etapa.status === 'nao_iniciada' || etapa.status === 'pendente') && (
        <div className="space-y-3">
          <div>
            <Label>Link do Portal de Compras</Label>
            <Input
              value={linkPortal}
              onChange={e => setLinkPortal(e.target.value)}
              placeholder="https://comprasnet.gov.br/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              A IA tentará identificar o portal automaticamente com base nos dados do edital.
            </p>
          </div>
          <Button onClick={handleIniciarDisputa} size="sm">
            <Play className="h-4 w-4 mr-2" />
            Iniciar Disputa
          </Button>
        </div>
      )}

      {etapa.status === 'em_disputa' && (
        <div className="space-y-3">
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-600">Disputa em Andamento</span>
              </div>
              {linkPortal && (
                <a
                  href={linkPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  Acessar Portal de Compras
                </a>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleRecurso} variant="outline" size="sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Recurso / Contrarrazão
            </Button>
            <Button onClick={() => {}} variant="outline" size="sm" disabled>
              Finalizar Disputa
            </Button>
          </div>
        </div>
      )}

      {etapa.status === 'recurso_contrarrazao' && (
        <div className="space-y-3">
          <Badge className="bg-orange-500/20 text-orange-600">Fase de Recurso / Contrarrazão</Badge>
          <p className="text-sm text-muted-foreground">
            Gerencie recursos e contrarrazões na aba de Peças Jurídicas.
          </p>
        </div>
      )}

      {(etapa.status === 'em_disputa' || etapa.status === 'recurso_contrarrazao') && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label>Motivo da Finalização</Label>
            <Textarea
              value={motivoFinalizacao}
              onChange={e => setMotivoFinalizacao(e.target.value)}
              placeholder="Descreva o resultado da disputa..."
              rows={2}
            />
          </div>
          <Button onClick={handleFinalizar} size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Disputa
          </Button>
        </div>
      )}

      {etapa.status === 'disputa_finalizada' && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Disputa Finalizada</span>
            </div>
            {etapa.dados?.motivo_finalizacao && (
              <p className="text-sm text-muted-foreground">
                {etapa.dados.motivo_finalizacao as string}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
