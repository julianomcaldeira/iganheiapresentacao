import { useState } from 'react';
import { 
  FileSearch, 
  Loader2, 
  Upload, 
  FileText, 
  Calendar, 
  Building2,
  DollarSign,
  Clock,
  FileCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExtractedData {
  dados_basicos?: {
    numero?: string;
    orgao?: string;
    modalidade?: string;
    tipo?: string;
    objeto?: string;
    valor_estimado?: string;
    data_abertura?: string;
    data_limite_propostas?: string;
    local_realizacao?: string;
  };
  documentos_habilitacao?: {
    juridicos?: string[];
    fiscais_trabalhistas?: string[];
    qualificacao_tecnica?: string[];
    qualificacao_economica?: string[];
    declaracoes?: string[];
    atestados?: string[];
  };
  requisitos_tecnicos?: any;
  prazos?: {
    impugnacao?: string;
    esclarecimentos?: string;
    entrega_execucao?: string;
    vigencia_contrato?: string;
    garantia?: string;
  };
  condicoes_comerciais?: {
    forma_pagamento?: string;
    reajuste?: string;
    garantia_contratual?: string;
    penalidades?: string;
  };
  criterios_julgamento?: {
    criterio?: string;
    margem_preferencia?: string;
    beneficios_me_epp?: string;
    modo_disputa?: string;
  };
  checklist_documentos?: string[];
  alertas?: string[];
  resumo_executivo?: string;
  raw_content?: string;
  parse_error?: boolean;
}

interface EditalOCRExtractorProps {
  onDataExtracted?: (data: ExtractedData) => void;
  clienteId?: string;
}

export function EditalOCRExtractor({ onDataExtracted, clienteId }: EditalOCRExtractorProps) {
  const [loading, setLoading] = useState(false);
  const [editalText, setEditalText] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['dados_basicos']);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!editalText.trim()) {
      toast.error('Cole o texto do edital antes de extrair');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-edital-ocr', {
        body: { editalContent: editalText, clienteId }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setExtractedData(data.data);
        onDataExtracted?.(data.data);
        toast.success('Dados extraídos com sucesso!');
      } else {
        throw new Error(data.error || 'Erro na extração');
      }
    } catch (error) {
      console.error('Erro na extração OCR:', error);
      toast.error('Erro ao extrair dados do edital');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copiado!');
  };

  const renderSection = (
    title: string, 
    key: string, 
    icon: React.ReactNode, 
    content: React.ReactNode
  ) => (
    <Collapsible
      open={expandedSections.includes(key)}
      onOpenChange={() => toggleSection(key)}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
          </div>
          {expandedSections.includes(key) ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-3 bg-background border rounded-lg">
          {content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  const renderField = (label: string, value: string | undefined, fieldKey: string) => {
    if (!value || value === 'não informado') return null;
    return (
      <div className="flex items-start justify-between gap-2 py-1">
        <div className="flex-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          <p className="text-sm">{value}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => copyToClipboard(value, fieldKey)}
        >
          {copiedField === fieldKey ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  };

  const renderList = (items: string[] | undefined) => {
    if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-primary">•</span>
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Extração Inteligente de Edital</CardTitle>
            <CardDescription>
              Cole o texto do edital para extração automática de dados via IA
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!extractedData && (
          <>
            <Textarea
              placeholder="Cole aqui o texto completo do edital..."
              value={editalText}
              onChange={(e) => setEditalText(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {editalText.length.toLocaleString()} caracteres
              </p>
              <Button 
                onClick={handleExtract} 
                disabled={loading || !editalText.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraindo dados...
                  </>
                ) : (
                  <>
                    <FileSearch className="h-4 w-4 mr-2" />
                    Extrair Dados
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando edital com IA...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </div>
        )}

        {extractedData && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="text-xs">
                Extração concluída
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setExtractedData(null);
                  setEditalText('');
                }}
              >
                Nova Extração
              </Button>
            </div>

            {/* Resumo Executivo */}
            {extractedData.resumo_executivo && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo Executivo
                </h4>
                <p className="text-sm">{extractedData.resumo_executivo}</p>
              </div>
            )}

            {/* Alertas */}
            {extractedData.alertas && extractedData.alertas.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  Alertas
                </h4>
                <ul className="space-y-1">
                  {extractedData.alertas.map((alerta, i) => (
                    <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400">• {alerta}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dados Básicos */}
            {extractedData.dados_basicos && renderSection(
              'Dados Básicos',
              'dados_basicos',
              <Building2 className="h-4 w-4" />,
              <div className="space-y-2">
                {renderField('Número', extractedData.dados_basicos.numero, 'numero')}
                {renderField('Órgão', extractedData.dados_basicos.orgao, 'orgao')}
                {renderField('Modalidade', extractedData.dados_basicos.modalidade, 'modalidade')}
                {renderField('Tipo', extractedData.dados_basicos.tipo, 'tipo')}
                {renderField('Objeto', extractedData.dados_basicos.objeto, 'objeto')}
                {renderField('Valor Estimado', extractedData.dados_basicos.valor_estimado, 'valor')}
                {renderField('Data de Abertura', extractedData.dados_basicos.data_abertura, 'data_abertura')}
                {renderField('Local/Portal', extractedData.dados_basicos.local_realizacao, 'local')}
              </div>
            )}

            {/* Documentos de Habilitação */}
            {extractedData.documentos_habilitacao && renderSection(
              'Documentos de Habilitação',
              'documentos',
              <FileCheck className="h-4 w-4" />,
              <div className="space-y-4">
                {extractedData.documentos_habilitacao.juridicos?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Jurídicos</h5>
                    {renderList(extractedData.documentos_habilitacao.juridicos)}
                  </div>
                )}
                {extractedData.documentos_habilitacao.fiscais_trabalhistas?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Fiscais e Trabalhistas</h5>
                    {renderList(extractedData.documentos_habilitacao.fiscais_trabalhistas)}
                  </div>
                )}
                {extractedData.documentos_habilitacao.qualificacao_tecnica?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Qualificação Técnica</h5>
                    {renderList(extractedData.documentos_habilitacao.qualificacao_tecnica)}
                  </div>
                )}
                {extractedData.documentos_habilitacao.qualificacao_economica?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Qualificação Econômico-Financeira</h5>
                    {renderList(extractedData.documentos_habilitacao.qualificacao_economica)}
                  </div>
                )}
                {extractedData.documentos_habilitacao.declaracoes?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Declarações</h5>
                    {renderList(extractedData.documentos_habilitacao.declaracoes)}
                  </div>
                )}
              </div>
            )}

            {/* Prazos */}
            {extractedData.prazos && renderSection(
              'Prazos Importantes',
              'prazos',
              <Clock className="h-4 w-4" />,
              <div className="space-y-2">
                {renderField('Impugnação', extractedData.prazos.impugnacao, 'impugnacao')}
                {renderField('Esclarecimentos', extractedData.prazos.esclarecimentos, 'esclarecimentos')}
                {renderField('Entrega/Execução', extractedData.prazos.entrega_execucao, 'entrega')}
                {renderField('Vigência do Contrato', extractedData.prazos.vigencia_contrato, 'vigencia')}
                {renderField('Garantia', extractedData.prazos.garantia, 'garantia')}
              </div>
            )}

            {/* Condições Comerciais */}
            {extractedData.condicoes_comerciais && renderSection(
              'Condições Comerciais',
              'comerciais',
              <DollarSign className="h-4 w-4" />,
              <div className="space-y-2">
                {renderField('Forma de Pagamento', extractedData.condicoes_comerciais.forma_pagamento, 'pagamento')}
                {renderField('Reajuste', extractedData.condicoes_comerciais.reajuste, 'reajuste')}
                {renderField('Garantia Contratual', extractedData.condicoes_comerciais.garantia_contratual, 'garantia_contratual')}
                {renderField('Penalidades', extractedData.condicoes_comerciais.penalidades, 'penalidades')}
              </div>
            )}

            {/* Checklist de Documentos */}
            {extractedData.checklist_documentos && extractedData.checklist_documentos.length > 0 && renderSection(
              'Checklist de Documentos',
              'checklist',
              <FileCheck className="h-4 w-4" />,
              <div className="space-y-1">
                {extractedData.checklist_documentos.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>{doc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
