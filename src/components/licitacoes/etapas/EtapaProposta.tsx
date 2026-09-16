import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, CheckCircle, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';
import { gerarPdfProposta } from '@/lib/demoPdfGenerator';

export function EtapaProposta({ etapa, licitacaoId, clienteId, licitacaoData, onStatusChange }: EtapaComponentProps) {
  const [generating, setGenerating] = useState(false);
  const [propostaConteudo, setPropostaConteudo] = useState<string>(
    etapa.dados?.proposta_conteudo as string || ''
  );

  const handleIniciar = async () => {
    await onStatusChange('proposta', 'elaborando_proposta');
  };

  const handleGenerateProposta = async () => {
    setGenerating(true);
    try {
      if (etapa.status === 'nao_iniciada' || etapa.status === 'pendente') {
        await onStatusChange('proposta', 'elaborando_proposta');
      }

      const { data, error } = await supabase.functions.invoke('generate-peca', {
        body: {
          licitacaoId,
          clienteId,
          tipo: 'proposta',
          titulo: 'Proposta Comercial',
          descricao: `Gerar proposta para a licitação ${licitacaoData?.numero || ''} - ${licitacaoData?.objeto || ''}`,
        },
      });

      if (error) throw error;
      
      const content = data?.content || data?.conteudo_gerado || '';
      setPropostaConteudo(content);
      await onStatusChange('proposta', 'elaborando_proposta', { proposta_conteudo: content });
      toast.success('Proposta gerada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar proposta');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalizar = async () => {
    await onStatusChange('proposta', 'proposta_finalizada', { proposta_conteudo: propostaConteudo });
    toast.success('Proposta finalizada!');
  };

  const baixarPdfDemo = () => {
    gerarPdfProposta({
      numero: licitacaoData?.numero,
      objeto: licitacaoData?.objeto,
      orgao: licitacaoData?.orgao,
      valorEstimado: licitacaoData?.valor_estimado,
    });
    toast.success('Proposta Comercial baixada em PDF');
  };

  return (
    <div className="space-y-4">
      {/* Botão de PDF de demonstração sempre disponível */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Proposta Comercial (PDF)</p>
              <p className="text-xs text-muted-foreground">Modelo gerado pela IA pronto para apresentação.</p>
            </div>
            <Badge variant="secondary" className="text-xs">Demo</Badge>
          </div>
          <Button size="sm" variant="outline" onClick={baixarPdfDemo}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </CardContent>
      </Card>

      {(etapa.status === 'nao_iniciada' || etapa.status === 'pendente') && (
        <div className="flex gap-2">
          <Button onClick={handleGenerateProposta} disabled={generating} size="sm">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            Gerar Proposta com IA
          </Button>

          <Button onClick={handleIniciar} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Elaborar Manualmente
          </Button>
        </div>
      )}

      {etapa.status === 'elaborando_proposta' && (
        <div className="space-y-3">
          <div>
            <Label>Conteúdo da Proposta</Label>
            <Textarea
              value={propostaConteudo}
              onChange={e => setPropostaConteudo(e.target.value)}
              rows={10}
              placeholder="Elabore a proposta..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleGenerateProposta} disabled={generating} variant="outline" size="sm">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Regenerar com IA
            </Button>
            <Button onClick={handleFinalizar} size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar Proposta
            </Button>
          </div>
        </div>
      )}

      {etapa.status === 'proposta_finalizada' && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Proposta Finalizada</span>
            </div>
            {propostaConteudo && (
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto bg-muted/50 p-3 rounded">
                {propostaConteudo}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
