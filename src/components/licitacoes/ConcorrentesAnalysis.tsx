import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Users, 
  ChevronDown, 
  Building2, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Plus,
  History,
  Trophy,
  XCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConcorrentesAnalysisProps {
  clienteId: string;
  licitacaoId: string;
  licitacaoObjeto: string;
}

interface Cliente {
  id: string;
  nome: string;
  concorrentes: string[] | null;
}

interface HistoricoParticipacao {
  id: string;
  nome_concorrente: string;
  participou: boolean;
  ganhou: boolean | null;
  valor_proposta: number | null;
  observacoes: string | null;
  created_at: string;
  licitacao?: {
    numero: string;
    objeto: string;
    status: string;
  };
}

interface ConcorrenteStats {
  nome: string;
  totalParticipacoes: number;
  vitorias: number;
  taxaVitoria: number;
  ultimaParticipacao: string | null;
}

export function ConcorrentesAnalysis({ clienteId, licitacaoId, licitacaoObjeto }: ConcorrentesAnalysisProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [historico, setHistorico] = useState<HistoricoParticipacao[]>([]);
  const [concorrenteStats, setConcorrenteStats] = useState<ConcorrenteStats[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedConcorrente, setSelectedConcorrente] = useState('');
  const [formData, setFormData] = useState({
    participou: 'true',
    ganhou: 'false',
    valor_proposta: '',
    observacoes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [participacaoAtual, setParticipacaoAtual] = useState<HistoricoParticipacao[]>([]);

  useEffect(() => {
    fetchData();
  }, [clienteId, licitacaoId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch cliente with concorrentes
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id, nome, concorrentes')
        .eq('id', clienteId)
        .maybeSingle();

      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Fetch all historical participation for this client
      const { data: historicoData, error: historicoError } = await supabase
        .from('licitacao_concorrentes')
        .select(`
          id, nome_concorrente, participou, ganhou, valor_proposta, observacoes, created_at,
          licitacao:licitacoes(numero, objeto, status)
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (historicoError) throw historicoError;
      
      const typedHistorico = (historicoData || []).map((h: any) => ({
        ...h,
        licitacao: h.licitacao
      }));
      setHistorico(typedHistorico);

      // Filter participation for current licitacao
      const atual = typedHistorico.filter((h: HistoricoParticipacao) => 
        historicoData?.some((hd: any) => hd.id === h.id && hd.licitacao?.numero)
      );
      
      // Get participation for THIS specific licitacao
      const { data: participacaoAtualData } = await supabase
        .from('licitacao_concorrentes')
        .select('*')
        .eq('licitacao_id', licitacaoId);
      
      setParticipacaoAtual(participacaoAtualData || []);

      // Calculate stats per concorrente
      const concorrentes = clienteData?.concorrentes || [];
      const stats: ConcorrenteStats[] = concorrentes.map((nome: string) => {
        const participacoes = typedHistorico.filter((h: HistoricoParticipacao) => 
          h.nome_concorrente.toLowerCase() === nome.toLowerCase() && h.participou
        );
        const vitorias = participacoes.filter((p: HistoricoParticipacao) => p.ganhou).length;
        const ultimaParticipacao = participacoes.length > 0 ? participacoes[0].created_at : null;

        return {
          nome,
          totalParticipacoes: participacoes.length,
          vitorias,
          taxaVitoria: participacoes.length > 0 ? Math.round((vitorias / participacoes.length) * 100) : 0,
          ultimaParticipacao
        };
      });

      setConcorrenteStats(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipacao = async () => {
    if (!selectedConcorrente) {
      toast.error('Selecione um concorrente');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('licitacao_concorrentes')
        .insert({
          licitacao_id: licitacaoId,
          cliente_id: clienteId,
          nome_concorrente: selectedConcorrente,
          participou: formData.participou === 'true',
          ganhou: formData.ganhou === 'true',
          valor_proposta: formData.valor_proposta ? parseFloat(formData.valor_proposta) : null,
          observacoes: formData.observacoes || null
        });

      if (error) throw error;

      toast.success('Participação registrada com sucesso!');
      setShowAddDialog(false);
      setSelectedConcorrente('');
      setFormData({ participou: 'true', ganhou: 'false', valor_proposta: '', observacoes: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding participacao:', error);
      toast.error('Erro ao registrar participação');
    } finally {
      setIsSaving(false);
    }
  };

  const concorrentes = cliente?.concorrentes || [];

  // Calculate risk based on historical data
  const getRiskLevel = (stats: ConcorrenteStats) => {
    if (stats.totalParticipacoes === 0) return 'desconhecido';
    if (stats.taxaVitoria >= 50) return 'alto';
    if (stats.taxaVitoria >= 25) return 'medio';
    return 'baixo';
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (concorrentes.length === 0) {
    return (
      <Card className="border-border bg-muted/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Users className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium">Nenhum concorrente cadastrado</p>
              <p className="text-xs">Cadastre concorrentes no perfil do cliente para análise comparativa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highRiskCount = concorrenteStats.filter(s => getRiskLevel(s) === 'alto').length;
  const totalParticipacoes = concorrenteStats.reduce((acc, s) => acc + s.totalParticipacoes, 0);

  return (
    <>
      <Card className="border-border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Análise de Concorrentes
                  <Badge variant="outline" className="ml-2 bg-orange-500/10 text-orange-600 border-orange-500/30">
                    {concorrentes.length}
                  </Badge>
                  {totalParticipacoes > 0 && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      <History className="w-3 h-3 mr-1" />
                      {totalParticipacoes} registros
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {highRiskCount > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {highRiskCount} alto risco
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    isOpen && "transform rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Análise comparativa baseada no histórico de participações.
                </p>
                <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Registrar Participação
                </Button>
              </div>

              {/* Participação nesta licitação */}
              {participacaoAtual.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Participação nesta licitação
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {participacaoAtual.map((p) => (
                      <Badge
                        key={p.id}
                        variant="outline"
                        className={cn(
                          "text-xs",
                          p.ganhou
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Building2 className="w-3 h-3 mr-1" />
                        {p.nome_concorrente}
                        {p.ganhou && <Trophy className="w-3 h-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {concorrenteStats.map((stats, index) => {
                  const risco = getRiskLevel(stats);
                  const participacaoNestaLicitacao = participacaoAtual.find(
                    p => p.nome_concorrente.toLowerCase() === stats.nome.toLowerCase()
                  );

                  return (
                    <div 
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        risco === 'alto' 
                          ? "bg-destructive/5 border-destructive/20" 
                          : risco === 'medio'
                          ? "bg-warning/5 border-warning/20"
                          : risco === 'baixo'
                          ? "bg-success/5 border-success/20"
                          : "bg-muted/50 border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            risco === 'alto' 
                              ? "bg-destructive/10" 
                              : risco === 'medio'
                              ? "bg-warning/10"
                              : risco === 'baixo'
                              ? "bg-success/10"
                              : "bg-muted"
                          )}>
                            <Building2 className={cn(
                              "w-4 h-4",
                              risco === 'alto' 
                                ? "text-destructive" 
                                : risco === 'medio'
                                ? "text-warning"
                                : risco === 'baixo'
                                ? "text-success"
                                : "text-muted-foreground"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-2">
                              {stats.nome}
                              {participacaoNestaLicitacao && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  Nesta licitação
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <History className="w-3 h-3" />
                                {stats.totalParticipacoes} participações
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {stats.vitorias} vitórias ({stats.taxaVitoria}%)
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            risco === 'alto' 
                              ? "bg-destructive/10 text-destructive border-destructive/30" 
                              : risco === 'medio'
                              ? "bg-warning/10 text-warning border-warning/30"
                              : risco === 'baixo'
                              ? "bg-success/10 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {risco === 'alto' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {risco === 'medio' && <TrendingUp className="w-3 h-3 mr-1" />}
                          {risco === 'baixo' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {risco === 'desconhecido' && <XCircle className="w-3 h-3 mr-1" />}
                          {risco === 'desconhecido' ? 'Sem histórico' : `Risco ${risco}`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Recomendação Estratégica</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {highRiskCount > 0 
                        ? `Atenção: ${highRiskCount} concorrente(s) com alto índice de vitórias. Considere uma proposta mais agressiva.`
                        : totalParticipacoes > 0
                        ? 'Cenário favorável com base no histórico. Concorrência moderada identificada.'
                        : 'Sem dados históricos suficientes. Registre participações para análises mais precisas.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Dialog para adicionar participação */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Participação de Concorrente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Concorrente *</Label>
              <Select value={selectedConcorrente} onValueChange={setSelectedConcorrente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o concorrente" />
                </SelectTrigger>
                <SelectContent>
                  {concorrentes.map((c, i) => (
                    <SelectItem key={i} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Participou?</Label>
                <Select 
                  value={formData.participou} 
                  onValueChange={(v) => setFormData({ ...formData, participou: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Resultado</Label>
                <Select 
                  value={formData.ganhou} 
                  onValueChange={(v) => setFormData({ ...formData, ganhou: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Venceu</SelectItem>
                    <SelectItem value="false">Perdeu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Valor da Proposta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_proposta}
                onChange={(e) => setFormData({ ...formData, valor_proposta: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais sobre a participação..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddParticipacao} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
