import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Workflow, ArrowRight, ArrowLeft, Plus, CheckCircle2, Settings } from 'lucide-react';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

interface WorkflowData {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  etapas_count?: number;
}

export function OnboardingStep5Workflow({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: 'Workflow Padrão',
    descricao: ''
  });

  useEffect(() => {
    fetchWorkflows();
  }, [clienteId]);

  const fetchWorkflows = async () => {
    const { data: workflowsData } = await supabase
      .from('licitacao_workflows')
      .select('id, nome, descricao, ativo')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);

    if (workflowsData) {
      // Get etapas count for each workflow
      const workflowsWithEtapas = await Promise.all(
        workflowsData.map(async (w) => {
          const { count } = await supabase
            .from('workflow_etapas')
            .select('*', { count: 'exact', head: true })
            .eq('workflow_id', w.id);
          return { ...w, etapas_count: count || 0 };
        })
      );
      setWorkflows(workflowsWithEtapas);
    }
    setLoading(false);
  };

  const createDefaultWorkflow = async () => {
    setSaving(true);
    try {
      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('licitacao_workflows')
        .insert({
          cliente_id: clienteId,
          nome: formData.nome,
          descricao: formData.descricao || 'Workflow padrão para gestão de licitações'
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create default steps
      const defaultEtapas = [
        { nome: 'Triagem', descricao: 'Análise inicial da licitação', cor: '#3B82F6', ordem: 1 },
        { nome: 'Análise do Edital', descricao: 'Leitura e análise detalhada do edital', cor: '#8B5CF6', ordem: 2 },
        { nome: 'Preparação de Documentos', descricao: 'Preparação da documentação necessária', cor: '#F59E0B', ordem: 3 },
        { nome: 'Elaboração da Proposta', descricao: 'Elaboração da proposta comercial', cor: '#10B981', ordem: 4 },
        { nome: 'Revisão', descricao: 'Revisão final antes do envio', cor: '#EF4444', ordem: 5 },
        { nome: 'Enviado', descricao: 'Proposta enviada', cor: '#06B6D4', ordem: 6 },
        { nome: 'Acompanhamento', descricao: 'Acompanhamento do resultado', cor: '#EC4899', ordem: 7 },
        { nome: 'Concluído', descricao: 'Processo finalizado', cor: '#22C55E', ordem: 8 },
      ];

      const { error: etapasError } = await supabase
        .from('workflow_etapas')
        .insert(
          defaultEtapas.map(e => ({
            ...e,
            workflow_id: workflow.id
          }))
        );

      if (etapasError) throw etapasError;

      toast.success('Workflow criado com etapas padrão!');
      setShowForm(false);
      fetchWorkflows();
    } catch (error: any) {
      toast.error('Erro ao criar workflow: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Workflow className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <CardTitle>Workflow de Licitações</CardTitle>
              <CardDescription>
                Configure o fluxo de trabalho que o cliente usará para gerenciar suas licitações.
                Defina as etapas do processo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {workflows.length > 0 ? (
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div 
                  key={workflow.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{workflow.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {workflow.etapas_count} etapas configuradas
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10">
                    Ativo
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Workflow className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum workflow configurado</p>
              <p className="text-sm mb-4">Crie um workflow para gerenciar as licitações</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Workflow Padrão
              </Button>
            </div>
          )}

          {workflows.length > 0 && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo Workflow
            </Button>
          )}

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Você pode personalizar as etapas do workflow posteriormente 
              na área de configurações do cliente.
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button onClick={onBack} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={onComplete} size="lg">
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Workflow</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Workflow Padrão"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do workflow..."
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Etapas padrão que serão criadas:</p>
              <div className="flex flex-wrap gap-2">
                {['Triagem', 'Análise do Edital', 'Preparação de Documentos', 'Elaboração da Proposta', 'Revisão', 'Enviado', 'Acompanhamento', 'Concluído'].map((etapa, idx) => (
                  <Badge key={idx} variant="secondary">{etapa}</Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={createDefaultWorkflow} disabled={saving}>
                {saving ? 'Criando...' : 'Criar Workflow'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}