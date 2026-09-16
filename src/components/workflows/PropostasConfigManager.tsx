import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, FileSpreadsheet, Eye, EyeOff, Settings } from 'lucide-react';

interface PropostasConfigManagerProps {
  clienteId: string;
  clienteNome: string;
  onClose: () => void;
}

interface PropostaConfig {
  id: string;
  nome: string;
  modelo_cabecalho: string | null;
  modelo_rodape: string | null;
  campos_obrigatorios: string[] | null;
  incluir_logo: boolean;
  incluir_assinatura: boolean;
  formato_preco: string;
  casas_decimais: number;
  ativo: boolean;
}

const CAMPOS_DISPONIVEIS = [
  'item', 'descricao', 'unidade', 'quantidade', 
  'marca', 'modelo', 'valor_unitario', 'valor_total'
];

export function PropostasConfigManager({ clienteId, clienteNome, onClose }: PropostasConfigManagerProps) {
  const [configs, setConfigs] = useState<PropostaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PropostaConfig | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    modelo_cabecalho: '',
    modelo_rodape: '',
    campos_obrigatorios: ['item', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'],
    incluir_logo: true,
    incluir_assinatura: true,
    formato_preco: 'unitario_total',
    casas_decimais: 2,
    ativo: true,
  });

  useEffect(() => {
    fetchConfigs();
  }, [clienteId]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('propostas_config')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar configurações');
    } else {
      setConfigs(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (config?: PropostaConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        nome: config.nome,
        modelo_cabecalho: config.modelo_cabecalho || '',
        modelo_rodape: config.modelo_rodape || '',
        campos_obrigatorios: config.campos_obrigatorios || [],
        incluir_logo: config.incluir_logo,
        incluir_assinatura: config.incluir_assinatura,
        formato_preco: config.formato_preco,
        casas_decimais: config.casas_decimais,
        ativo: config.ativo,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        nome: '',
        modelo_cabecalho: '',
        modelo_rodape: '',
        campos_obrigatorios: ['item', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'],
        incluir_logo: true,
        incluir_assinatura: true,
        formato_preco: 'unitario_total',
        casas_decimais: 2,
        ativo: true,
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingConfig) {
      const { error } = await supabase
        .from('propostas_config')
        .update({
          nome: formData.nome,
          modelo_cabecalho: formData.modelo_cabecalho || null,
          modelo_rodape: formData.modelo_rodape || null,
          campos_obrigatorios: formData.campos_obrigatorios,
          incluir_logo: formData.incluir_logo,
          incluir_assinatura: formData.incluir_assinatura,
          formato_preco: formData.formato_preco,
          casas_decimais: formData.casas_decimais,
          ativo: formData.ativo,
        })
        .eq('id', editingConfig.id);

      if (error) {
        toast.error('Erro ao atualizar configuração');
      } else {
        toast.success('Configuração atualizada');
        fetchConfigs();
        setShowDialog(false);
      }
    } else {
      const { error } = await supabase
        .from('propostas_config')
        .insert({
          cliente_id: clienteId,
          nome: formData.nome,
          modelo_cabecalho: formData.modelo_cabecalho || null,
          modelo_rodape: formData.modelo_rodape || null,
          campos_obrigatorios: formData.campos_obrigatorios,
          incluir_logo: formData.incluir_logo,
          incluir_assinatura: formData.incluir_assinatura,
          formato_preco: formData.formato_preco,
          casas_decimais: formData.casas_decimais,
          ativo: formData.ativo,
        });

      if (error) {
        toast.error('Erro ao criar configuração');
      } else {
        toast.success('Configuração criada');
        fetchConfigs();
        setShowDialog(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('propostas_config').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir configuração');
    } else {
      toast.success('Configuração excluída');
      setConfigs(configs.filter(c => c.id !== id));
    }
  };

  const handleToggleAtivo = async (config: PropostaConfig) => {
    const { error } = await supabase
      .from('propostas_config')
      .update({ ativo: !config.ativo })
      .eq('id', config.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setConfigs(configs.map(c => 
        c.id === config.id ? { ...c, ativo: !c.ativo } : c
      ));
    }
  };

  const toggleCampoObrigatorio = (campo: string) => {
    if (formData.campos_obrigatorios.includes(campo)) {
      setFormData({
        ...formData,
        campos_obrigatorios: formData.campos_obrigatorios.filter(c => c !== campo),
      });
    } else {
      setFormData({
        ...formData,
        campos_obrigatorios: [...formData.campos_obrigatorios, campo],
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold">Configurações de Propostas</h2>
          <p className="text-sm text-muted-foreground">{clienteNome}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {configs.map(config => (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className={!config.ativo ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{config.nome}</CardTitle>
                      </div>
                      <Badge variant={config.ativo ? 'default' : 'secondary'}>
                        {config.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {config.formato_preco === 'unitario' ? 'Só Unitário' :
                           config.formato_preco === 'total' ? 'Só Total' : 'Unitário + Total'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {config.casas_decimais} decimais
                        </Badge>
                      </div>

                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className={config.incluir_logo ? 'text-green-600' : ''}>
                          {config.incluir_logo ? '✓' : '✗'} Logo
                        </span>
                        <span className={config.incluir_assinatura ? 'text-green-600' : ''}>
                          {config.incluir_assinatura ? '✓' : '✗'} Assinatura
                        </span>
                      </div>

                      {config.campos_obrigatorios && config.campos_obrigatorios.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Campos obrigatórios:</p>
                          <div className="flex flex-wrap gap-1">
                            {config.campos_obrigatorios.map(c => (
                              <Badge key={c} variant="secondary" className="text-xs">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenDialog(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleAtivo(config)}
                      >
                        {config.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {configs.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma configuração cadastrada</p>
            <p className="text-sm">Configure como as propostas serão geradas para este cliente</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuração' : 'Nova Configuração de Proposta'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome da Configuração *</Label>
              <Input 
                value={formData.nome} 
                onChange={e => setFormData({...formData, nome: e.target.value})}
                placeholder="Ex: Proposta Padrão"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Formato de Preço</Label>
                <Select 
                  value={formData.formato_preco} 
                  onValueChange={v => setFormData({...formData, formato_preco: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unitario">Somente Unitário</SelectItem>
                    <SelectItem value="total">Somente Total</SelectItem>
                    <SelectItem value="unitario_total">Unitário e Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Casas Decimais</Label>
                <Select 
                  value={String(formData.casas_decimais)} 
                  onValueChange={v => setFormData({...formData, casas_decimais: parseInt(v)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Campos Obrigatórios na Proposta</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CAMPOS_DISPONIVEIS.map(campo => (
                  <Button
                    key={campo}
                    size="sm"
                    variant={formData.campos_obrigatorios.includes(campo) ? 'default' : 'outline'}
                    onClick={() => toggleCampoObrigatorio(campo)}
                  >
                    {campo}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Modelo de Cabeçalho</Label>
              <Textarea 
                value={formData.modelo_cabecalho} 
                onChange={e => setFormData({...formData, modelo_cabecalho: e.target.value})}
                placeholder="Texto que aparecerá no cabeçalho da proposta..."
                rows={3}
              />
            </div>

            <div>
              <Label>Modelo de Rodapé</Label>
              <Textarea 
                value={formData.modelo_rodape} 
                onChange={e => setFormData({...formData, modelo_rodape: e.target.value})}
                placeholder="Texto que aparecerá no rodapé da proposta..."
                rows={3}
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.incluir_logo} 
                  onCheckedChange={v => setFormData({...formData, incluir_logo: v})}
                />
                <Label>Incluir logo da empresa</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.incluir_assinatura} 
                  onCheckedChange={v => setFormData({...formData, incluir_assinatura: v})}
                />
                <Label>Incluir assinatura</Label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.ativo} 
                onCheckedChange={v => setFormData({...formData, ativo: v})}
              />
              <Label>Configuração ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {editingConfig ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
