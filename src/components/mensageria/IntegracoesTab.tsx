import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageSquare, Mail, Smartphone, Settings, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface Integracao {
  id: string;
  tipo: string;
  provedor: string | null;
  webhook_url: string | null;
  numero_telefone: string | null;
  email_remetente: string | null;
  configuracoes: Record<string, any>;
  ativo: boolean;
}

const INTEGRACOES_CONFIG = {
  whatsapp: {
    icon: MessageSquare,
    title: 'WhatsApp',
    description: 'Envie mensagens via WhatsApp Business API ou Evolution API',
    provedores: ['Evolution API', 'Twilio', 'MessageBird', 'Meta Business', 'Vonage'],
    campos: ['numero_telefone', 'webhook_url', 'instance_name'],
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  sms: {
    icon: Smartphone,
    title: 'SMS',
    description: 'Envie mensagens SMS para seus clientes',
    provedores: ['Twilio', 'Zenvia', 'AWS SNS', 'Vonage'],
    campos: ['numero_telefone'],
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  email: {
    icon: Mail,
    title: 'Email',
    description: 'Envio de emails via Amazon SES',
    provedores: ['AWS SES'],
    campos: ['email_remetente'],
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
};

export function IntegracoesTab() {
  const { profile, isAdmin } = useAuth();
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<'whatsapp' | 'sms' | 'email' | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(profile?.cliente_id || null);
  const [formData, setFormData] = useState({
    provedor: '',
    api_key: '',
    webhook_url: '',
    numero_telefone: '',
    email_remetente: '',
    instance_name: '',
    base_url: '',
    ativo: false
  });

  useEffect(() => {
    if (isAdmin && !profile?.cliente_id) {
      fetchClientes();
    }
  }, [isAdmin, profile?.cliente_id]);

  useEffect(() => {
    const clienteId = profile?.cliente_id || selectedClienteId;
    if (clienteId) {
      fetchIntegracoes(clienteId);
    } else {
      setLoading(false);
    }
  }, [profile?.cliente_id, selectedClienteId]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setClientes(data || []);
    if (data && data.length > 0 && !selectedClienteId) {
      setSelectedClienteId(data[0].id);
    }
  };

  const fetchIntegracoes = async (clienteId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integracao_mensageria')
        .select('*')
        .eq('cliente_id', clienteId);

      if (error) throw error;
      setIntegracoes((data || []) as Integracao[]);
    } catch (error) {
      console.error('Erro ao buscar integrações:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentClienteId = profile?.cliente_id || selectedClienteId;

  const handleOpenConfig = (tipo: 'whatsapp' | 'sms' | 'email') => {
    const existing = integracoes.find(i => i.tipo === tipo);
    if (existing) {
      setFormData({
        provedor: existing.provedor || '',
        api_key: '',
        webhook_url: existing.webhook_url || '',
        numero_telefone: existing.numero_telefone || '',
        email_remetente: existing.email_remetente || '',
        instance_name: (existing.configuracoes as any)?.instance_name || '',
        base_url: (existing.configuracoes as any)?.base_url || '',
        ativo: existing.ativo
      });
    } else {
      setFormData({
        provedor: '',
        api_key: '',
        webhook_url: '',
        numero_telefone: '',
        email_remetente: '',
        instance_name: '',
        base_url: '',
        ativo: false
      });
    }
    setSelectedTipo(tipo);
  };

  const handleSave = async () => {
    if (!currentClienteId || !selectedTipo) return;

    try {
      const existing = integracoes.find(i => i.tipo === selectedTipo);
      
      const payload = {
        cliente_id: currentClienteId,
        tipo: selectedTipo,
        provedor: formData.provedor || null,
        api_key_encrypted: formData.api_key || null,
        webhook_url: formData.webhook_url || null,
        numero_telefone: formData.numero_telefone || null,
        email_remetente: formData.email_remetente || null,
        configuracoes: {
          instance_name: formData.instance_name || null,
          base_url: formData.base_url || null
        },
        ativo: formData.ativo
      };

      if (existing) {
        const { error } = await supabase
          .from('integracao_mensageria')
          .update(payload)
          .eq('id', existing.id);

        if (error) throw error;
        toast.success('Integração atualizada!');
      } else {
        const { error } = await supabase
          .from('integracao_mensageria')
          .insert(payload);

        if (error) throw error;
        toast.success('Integração criada!');
      }

      setSelectedTipo(null);
      if (currentClienteId) fetchIntegracoes(currentClienteId);
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  const getIntegracaoStatus = (tipo: string) => {
    const integracao = integracoes.find(i => i.tipo === tipo);
    return integracao?.ativo || false;
  };

  const hasIntegracao = (tipo: string) => {
    return integracoes.some(i => i.tipo === tipo);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrações de Mensageria</CardTitle>
          <CardDescription>
            Configure integrações com WhatsApp, SMS e provedores de email para comunicação automatizada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(INTEGRACOES_CONFIG) as [keyof typeof INTEGRACOES_CONFIG, typeof INTEGRACOES_CONFIG.whatsapp][]).map(([tipo, config]) => {
              const Icon = config.icon;
              const isActive = getIntegracaoStatus(tipo);
              const isConfigured = hasIntegracao(tipo);

              return (
                <Card key={tipo} className={`relative ${isActive ? 'border-primary' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inativo
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{config.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                    {isAdmin && (
                      <Button
                        variant={isConfigured ? 'outline' : 'default'}
                        className="w-full"
                        onClick={() => handleOpenConfig(tipo as any)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {isConfigured ? 'Configurar' : 'Ativar'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card>
        <CardHeader>
          <CardTitle>Documentação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                Evolution API (Recomendado)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Solução open source para integração com WhatsApp. Configure sua própria instância ou utilize um serviço gerenciado.
              </p>
              <a
                href="https://doc.evolution-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
              >
                Documentação Evolution API <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-500" />
                SMS
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Configure um provedor de SMS como Twilio ou Zenvia para enviar mensagens de texto.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-500" />
                Email (Amazon SES)
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                O envio de emails é feito via Amazon SES já configurado. Basta definir o email remetente verificado no SES.
              </p>
              <a
                href="https://docs.aws.amazon.com/ses/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
              >
                Documentação AWS SES <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={!!selectedTipo} onOpenChange={() => setSelectedTipo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Configurar {selectedTipo && INTEGRACOES_CONFIG[selectedTipo].title}
            </DialogTitle>
          </DialogHeader>
          {selectedTipo && (
            <div className="space-y-4">
              <div>
                <Label>Provedor</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md bg-background"
                  value={formData.provedor}
                  onChange={(e) => setFormData(prev => ({ ...prev, provedor: e.target.value }))}
                >
                  <option value="">Selecione um provedor</option>
                  {INTEGRACOES_CONFIG[selectedTipo].provedores.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>API Key / Token</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="Sua chave de API"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe em branco para manter a chave atual
                </p>
              </div>

              {INTEGRACOES_CONFIG[selectedTipo].campos.includes('numero_telefone') && (
                <div>
                  <Label>Número de Telefone</Label>
                  <Input
                    value={formData.numero_telefone}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_telefone: e.target.value }))}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              )}

              {INTEGRACOES_CONFIG[selectedTipo].campos.includes('email_remetente') && (
                <div>
                  <Label>Email Remetente</Label>
                  <Input
                    type="email"
                    value={formData.email_remetente}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_remetente: e.target.value }))}
                    placeholder="noreply@suaempresa.com"
                  />
                </div>
              )}

              {INTEGRACOES_CONFIG[selectedTipo].campos.includes('webhook_url') && (
                <div>
                  <Label>Webhook URL {formData.provedor === 'Evolution API' ? '(URL Base da Evolution API)' : ''}</Label>
                  <Input
                    value={formData.webhook_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder={formData.provedor === 'Evolution API' ? 'https://sua-evolution-api.com' : 'https://...'}
                  />
                </div>
              )}

              {formData.provedor === 'Evolution API' && (
                <div>
                  <Label>Nome da Instância</Label>
                  <Input
                    value={formData.instance_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, instance_name: e.target.value }))}
                    placeholder="minha-instancia"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nome da instância configurada na Evolution API
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label>Integração ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTipo(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar Configuração
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
