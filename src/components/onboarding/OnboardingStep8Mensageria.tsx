import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle, ArrowRight, ArrowLeft, Mail, Bell, CheckCircle2, Plus } from 'lucide-react';

interface Props {
  clienteId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function OnboardingStep8Mensageria({ clienteId, onComplete, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    ativo: false,
    email_remetente: ''
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [canais, setCanais] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [clienteId]);

  const fetchData = async () => {
    try {
      // Fetch email integration config
      const { data: integracaoData } = await supabase
        .from('integracao_mensageria')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('tipo', 'email')
        .maybeSingle();

      if (integracaoData) {
        setEmailConfig({
          ativo: integracaoData.ativo,
          email_remetente: integracaoData.email_remetente || ''
        });
      }

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('email_templates')
        .select('id, nome, evento, ativo')
        .eq('cliente_id', clienteId);

      setTemplates(templatesData || []);

      // Fetch canais
      const { data: canaisData } = await supabase
        .from('mensageria_canais')
        .select('id, nome, tipo, ativo')
        .eq('cliente_id', clienteId);

      setCanais(canaisData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('integracao_mensageria')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('tipo', 'email')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('integracao_mensageria')
          .update({
            ativo: emailConfig.ativo,
            email_remetente: emailConfig.email_remetente
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('integracao_mensageria')
          .insert({
            cliente_id: clienteId,
            tipo: 'email',
            ativo: emailConfig.ativo,
            email_remetente: emailConfig.email_remetente
          });
      }

      toast.success('Configuração de email salva!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const createDefaultTemplates = async () => {
    setSaving(true);
    try {
      const defaultTemplates = [
        {
          cliente_id: clienteId,
          nome: 'Nova Licitação',
          evento: 'nova_licitacao',
          assunto: 'Nova Licitação Disponível',
          conteudo_html: '<h2>Nova licitação identificada!</h2><p>Uma nova oportunidade foi encontrada para você.</p>',
          ativo: true
        },
        {
          cliente_id: clienteId,
          nome: 'Lembrete de Prazo',
          evento: 'lembrete_prazo',
          assunto: 'Prazo de Licitação se Aproximando',
          conteudo_html: '<h2>Atenção ao Prazo!</h2><p>Uma licitação em andamento tem prazo próximo.</p>',
          ativo: true
        },
        {
          cliente_id: clienteId,
          nome: 'Mudança de Etapa',
          evento: 'mudanca_etapa',
          assunto: 'Licitação Avançou de Etapa',
          conteudo_html: '<h2>Atualização de Status</h2><p>Uma licitação mudou de etapa no workflow.</p>',
          ativo: true
        }
      ];

      const { error } = await supabase
        .from('email_templates')
        .insert(defaultTemplates);

      if (error) throw error;

      toast.success('Templates padrão criados!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar templates: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const createDefaultChannel = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('mensageria_canais')
        .insert({
          cliente_id: clienteId,
          nome: 'Geral',
          tipo: 'grupo',
          descricao: 'Canal principal de comunicação da equipe',
          ativo: true
        });

      if (error) throw error;

      toast.success('Canal criado!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao criar canal: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <MessageCircle className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <CardTitle>Mensageria e Comunicação</CardTitle>
            <CardDescription>
              Configure os canais de comunicação, templates de email e notificações do cliente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="email">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="canais" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Canais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Email Ativo</Label>
                  <p className="text-sm text-muted-foreground">Habilitar envio de emails para o cliente</p>
                </div>
                <Switch
                  checked={emailConfig.ativo}
                  onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, ativo: checked }))}
                />
              </div>

              <div>
                <Label>Email Remetente</Label>
                <Input
                  type="email"
                  value={emailConfig.email_remetente}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, email_remetente: e.target.value }))}
                  placeholder="notificacoes@empresa.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este email será usado como remetente das notificações
                </p>
              </div>

              <Button onClick={handleSaveEmailConfig} disabled={saving}>
                Salvar Configuração
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-4">
            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium">{template.nome}</p>
                        <p className="text-sm text-muted-foreground">{template.evento}</p>
                      </div>
                    </div>
                    <Badge variant={template.ativo ? 'default' : 'secondary'}>
                      {template.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum template configurado</p>
                <Button onClick={createDefaultTemplates} className="mt-3" disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Templates Padrão
                </Button>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Templates podem ser personalizados posteriormente na área de Mensageria.
            </p>
          </TabsContent>

          <TabsContent value="canais" className="space-y-4 mt-4">
            {canais.length > 0 ? (
              <div className="space-y-2">
                {canais.map((canal) => (
                  <div key={canal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{canal.nome}</p>
                        <p className="text-sm text-muted-foreground">{canal.tipo}</p>
                      </div>
                    </div>
                    <Badge variant={canal.ativo ? 'default' : 'secondary'}>
                      {canal.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum canal de comunicação</p>
                <Button onClick={createDefaultChannel} className="mt-3" disabled={saving}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Canal Geral
                </Button>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Canais de chat interno para comunicação da equipe do cliente.
            </p>
          </TabsContent>
        </Tabs>

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
  );
}
