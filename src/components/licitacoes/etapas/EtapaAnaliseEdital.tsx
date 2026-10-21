import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, FileText, Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';
import { ClienteQuestionsPanel } from '../ClienteQuestionsPanel';
import DOMPurify from 'dompurify';

export function EtapaAnaliseEdital({ etapa, licitacaoId, clienteId, licitacaoData, onStatusChange }: EtapaComponentProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(
    (etapa.dados?.analise_resumo as string) || null
  );

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Start the etapa if not started
      if (etapa.status === 'nao_iniciada') {
        await onStatusChange('analise_edital', 'edital_pendente_analise');
      }

      const { data, error } = await supabase.functions.invoke('analyze-licitacao', {
        body: {
          licitacaoId,
          licitacaoData: licitacaoData || {},
        },
      });

      if (error) throw error;

      const content = data?.analysis?.conteudo || 'Análise concluída sem conteúdo.';
      setAnalysisResult(content);
      toast.success('Análise do edital concluída!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao analisar edital');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMarkAnalyzed = async () => {
    await onStatusChange('analise_edital', 'edital_analisado', { analise_resumo: analysisResult });
  };

  const handleSolicitarEsclarecimento = async () => {
    await onStatusChange('analise_edital', 'edital_analisado', { 
      analise_resumo: analysisResult,
      acao: 'solicitar_esclarecimento' 
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
          {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
          {analyzing ? 'Analisando...' : 'Analisar com IA'}
        </Button>

        {etapa.status === 'edital_pendente_analise' && analysisResult && (
          <>
            <Button onClick={handleMarkAnalyzed} size="sm" variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Analisado
            </Button>
            <Button onClick={handleSolicitarEsclarecimento} size="sm" variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Solicitar Esclarecimento
            </Button>
          </>
        )}
      </div>

      {analysisResult && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Resumo da Análise</span>
            </div>
            <div 
              className="prose prose-sm max-w-none text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(
                  analysisResult.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                ) 
              }} 
            />
          </CardContent>
        </Card>
      )}

      {!analysisResult && etapa.status === 'nao_iniciada' && (
        <p className="text-sm text-muted-foreground">
          Clique em "Analisar com IA" para iniciar a análise automática do edital.
        </p>
      )}

      {/* Perguntas do Edital respondidas pela IA */}
      {clienteId && (
        <ClienteQuestionsPanel
          clienteId={clienteId}
          licitacaoId={licitacaoId}
          relevancia={licitacaoData?.relevancia || 'media'}
        />
      )}
    </div>
  );
}
