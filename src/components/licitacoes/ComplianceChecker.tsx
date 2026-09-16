import { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  Loader2,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ComplianceItem {
  documento: string;
  categoria: string;
  status: 'OK' | 'PENDENTE' | 'VENCIDO' | 'NAO_APLICAVEL';
  observacao: string;
  acao: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface ComplianceData {
  status_geral: 'CONFORME' | 'PARCIALMENTE_CONFORME' | 'NAO_CONFORME';
  score: number;
  checklist: ComplianceItem[];
  alertas_criticos: string[];
  alertas_atencao: string[];
  recomendacoes: string[];
  resumo: string;
}

interface ComplianceCheckerProps {
  licitacaoId?: string;
  clienteId: string;
  empresaId?: string;
  documentosExigidos?: any;
  onComplete?: (data: ComplianceData) => void;
}

export function ComplianceChecker({ 
  licitacaoId, 
  clienteId, 
  empresaId, 
  documentosExigidos,
  onComplete 
}: ComplianceCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const runComplianceCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('compliance-checker', {
        body: { licitacaoId, clienteId, empresaId, documentosExigidos }
      });

      if (error) throw error;

      if (data.success && data.data) {
        setComplianceData(data.data);
        onComplete?.(data.data);
        toast.success('Verificação de compliance concluída');
      } else {
        throw new Error(data.error || 'Erro na verificação');
      }
    } catch (error) {
      console.error('Erro no compliance check:', error);
      toast.error('Erro ao verificar compliance');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'PENDENTE':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'VENCIDO':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'CONFORME': 'default',
      'PARCIALMENTE_CONFORME': 'secondary',
      'NAO_CONFORME': 'destructive'
    };
    const labels: Record<string, string> = {
      'CONFORME': 'Conforme',
      'PARCIALMENTE_CONFORME': 'Parcialmente Conforme',
      'NAO_CONFORME': 'Não Conforme'
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'text-red-500';
      case 'media': return 'text-yellow-500';
      case 'baixa': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const groupedChecklist = complianceData?.checklist?.reduce((acc, item) => {
    const cat = item.categoria || 'outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ComplianceItem[]>) || {};

  const categoryLabels: Record<string, string> = {
    'juridico': 'Documentos Jurídicos',
    'fiscal': 'Documentos Fiscais e Trabalhistas',
    'tecnico': 'Qualificação Técnica',
    'economico': 'Qualificação Econômico-Financeira',
    'declaracao': 'Declarações',
    'outros': 'Outros Documentos'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Verificador de Compliance</CardTitle>
              <CardDescription>
                Análise automática de conformidade documental
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={runComplianceCheck} 
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : complianceData ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reverificar
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Verificar Compliance
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!complianceData && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Clique em "Verificar Compliance" para analisar os documentos</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando documentos...</p>
          </div>
        )}

        {complianceData && !loading && (
          <div className="space-y-6">
            {/* Score e Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className={cn(
                    "text-3xl font-bold",
                    complianceData.score >= 80 ? "text-green-500" :
                    complianceData.score >= 50 ? "text-yellow-500" : "text-red-500"
                  )}>
                    {complianceData.score}%
                  </div>
                  <div className="text-xs text-muted-foreground">Score</div>
                </div>
                <div className="w-32">
                  <Progress value={complianceData.score} className="h-2" />
                </div>
              </div>
              {getStatusBadge(complianceData.status_geral)}
            </div>

            {/* Alertas Críticos */}
            {complianceData.alertas_criticos?.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                <h4 className="font-medium text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4" />
                  Alertas Críticos
                </h4>
                <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                  {complianceData.alertas_criticos.map((alerta, i) => (
                    <li key={i}>• {alerta}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alertas de Atenção */}
            {complianceData.alertas_atencao?.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alertas de Atenção
                </h4>
                <ul className="space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {complianceData.alertas_atencao.map((alerta, i) => (
                    <li key={i}>• {alerta}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist por Categoria */}
            <div className="space-y-2">
              <h4 className="font-medium">Checklist de Documentos</h4>
              {Object.entries(groupedChecklist).map(([category, items]) => (
                <Collapsible 
                  key={category}
                  open={expandedCategories.includes(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {categoryLabels[category] || category}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {items.filter(i => i.status === 'OK').length}/{items.length}
                        </Badge>
                      </div>
                      {expandedCategories.includes(category) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-2">
                      {items.map((item, i) => (
                        <div 
                          key={i}
                          className="flex items-start gap-3 p-2 rounded border bg-background"
                        >
                          {getStatusIcon(item.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.documento}</span>
                              <span className={cn("text-xs", getPriorityColor(item.prioridade))}>
                                ({item.prioridade})
                              </span>
                            </div>
                            {item.observacao && (
                              <p className="text-xs text-muted-foreground mt-1">{item.observacao}</p>
                            )}
                            {item.acao && item.status !== 'OK' && (
                              <p className="text-xs text-primary mt-1">→ {item.acao}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Recomendações */}
            {complianceData.recomendacoes?.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                  Recomendações
                </h4>
                <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
                  {complianceData.recomendacoes.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resumo */}
            {complianceData.resumo && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Resumo</h4>
                <p className="text-sm text-muted-foreground">{complianceData.resumo}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
