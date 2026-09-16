import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Upload, Send, Loader2, FileText, Download, FileSignature, Scale, Gavel, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';
import {
  gerarPdfEsclarecimento,
  gerarPdfImpugnacao,
  gerarPdfRecurso,
  gerarPdfContrarrazao,
} from '@/lib/demoPdfGenerator';

export function EtapaEsclarecimento({ etapa, licitacaoId, clienteId, licitacaoData, onStatusChange }: EtapaComponentProps) {
  const [generating, setGenerating] = useState(false);
  const [pecaConteudo, setPecaConteudo] = useState<string>(etapa.dados?.peca_conteudo as string || '');
  const [dataEnvio, setDataEnvio] = useState<string>(etapa.dados?.data_envio as string || '');
  const [descricao, setDescricao] = useState('');

  const handleGeneratePeca = async () => {
    if (!descricao.trim()) {
      toast.error('Descreva o esclarecimento ou impugnação desejado');
      return;
    }

    setGenerating(true);
    try {
      if (etapa.status === 'nao_iniciada' || etapa.status === 'pendente') {
        await onStatusChange('esclarecimento_impugnacao', 'elaborando_peca');
      }

      const { data, error } = await supabase.functions.invoke('generate-peca', {
        body: {
          licitacaoId,
          clienteId,
          tipo: 'esclarecimento',
          titulo: 'Pedido de Esclarecimento',
          descricao,
        },
      });

      if (error) throw error;
      
      const content = data?.content || data?.conteudo_gerado || 'Peça gerada com sucesso';
      setPecaConteudo(content);
      await onStatusChange('esclarecimento_impugnacao', 'elaborando_peca', { peca_conteudo: content });
      toast.success('Peça gerada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar peça');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegistrarEnvio = async () => {
    if (!dataEnvio) {
      toast.error('Informe a data de envio');
      return;
    }
    await onStatusChange('esclarecimento_impugnacao', 'peca_enviada', { data_envio: dataEnvio });
  };

  const handleFinalizar = async () => {
    await onStatusChange('esclarecimento_impugnacao', 'finalizada');
  };

  const ctx = {
    numero: licitacaoData?.numero,
    objeto: licitacaoData?.objeto,
    orgao: licitacaoData?.orgao,
  };

  return (
    <div className="space-y-4">
      {/* Exemplos de peças prontas para demonstração */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Peças de Exemplo (Demonstração)</span>
            <Badge variant="secondary" className="text-xs">PDF</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Modelos prontos gerados pela IA, disponíveis para download como PDF.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Pedido de Esclarecimento', icon: FileText, action: () => gerarPdfEsclarecimento(ctx) },
              { label: 'Impugnação ao Edital', icon: Scale, action: () => gerarPdfImpugnacao(ctx) },
              { label: 'Recurso Administrativo', icon: Gavel, action: () => gerarPdfRecurso(ctx) },
              { label: 'Contrarrazões', icon: Shield, action: () => gerarPdfContrarrazao(ctx) },
            ].map(item => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    item.action();
                    toast.success(`${item.label} baixado em PDF`);
                  }}
                >
                  <Icon className="h-4 w-4 mr-2 text-primary" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  <Download className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {(etapa.status === 'nao_iniciada' || etapa.status === 'pendente') && (
        <div className="space-y-3">
          <div>
            <Label>Descreva o esclarecimento / impugnação</Label>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva os pontos que precisam de esclarecimento ou impugnação..."
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGeneratePeca} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Gerar Peça com IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStatusChange('esclarecimento_impugnacao', 'pendente')}>
              <Upload className="h-4 w-4 mr-2" />
              Anexar Documento Manual
            </Button>
          </div>
        </div>
      )}

      {pecaConteudo && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Peça Gerada</span>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/50 p-3 rounded">
              {pecaConteudo}
            </pre>
          </CardContent>
        </Card>
      )}

      {etapa.status === 'elaborando_peca' && (
        <div className="space-y-3">
          <div>
            <Label>Data de envio ao órgão</Label>
            <Input
              type="date"
              value={dataEnvio}
              onChange={e => setDataEnvio(e.target.value)}
            />
          </div>
          <Button onClick={handleRegistrarEnvio} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Registrar Envio
          </Button>
        </div>
      )}

      {etapa.status === 'peca_enviada' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Peça enviada em {etapa.dados?.data_envio ? new Date(etapa.dados.data_envio as string).toLocaleDateString('pt-BR') : '-'}
          </p>
          <Button onClick={handleFinalizar} size="sm" variant="outline">
            Finalizar Etapa
          </Button>
        </div>
      )}
    </div>
  );
}
