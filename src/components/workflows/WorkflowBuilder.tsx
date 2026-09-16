import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Settings, FileText, Calculator, Users, Clock, Hash, 
  Calendar, List, Upload, DollarSign, Percent, ChevronRight, 
  GripVertical, ArrowRight, CheckCircle2, Circle, X
} from 'lucide-react';

interface WorkflowBuilderProps {
  clienteId: string;
  clienteNome: string;
  onClose: () => void;
}

interface Workflow {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

interface Etapa {
  id: string;
  workflow_id: string;
  nome: string;
  descricao: string;
  ordem: number;
  cor: string;
  obrigatoria: boolean;
  prazo_dias: number | null;
}

interface Campo {
  id: string;
  etapa_id: string;
  nome: string;
  label: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: number;
  formula: string | null;
  valor_padrao: string | null;
  opcoes: string[] | null;
}

interface Aprovacao {
  id: string;
  etapa_id: string;
  nome: string;
  tipo: string;
  aprovadores_minimos: number;
}

const FIELD_TYPES = [
  { value: 'texto', label: 'Texto', icon: FileText },
  { value: 'textarea', label: 'Texto Longo', icon: FileText },
  { value: 'numero', label: 'Número', icon: Hash },
  { value: 'data', label: 'Data', icon: Calendar },
  { value: 'checkbox', label: 'Checkbox', icon: CheckCircle2 },
  { value: 'selecao', label: 'Seleção', icon: List },
  { value: 'arquivo', label: 'Arquivo', icon: Upload },
  { value: 'calculado', label: 'Calculado', icon: Calculator },
  { value: 'moeda', label: 'Moeda', icon: DollarSign },
  { value: 'percentual', label: 'Percentual', icon: Percent },
  { value: 'email', label: 'E-mail', icon: FileText },
  { value: 'telefone', label: 'Telefone', icon: FileText },
  { value: 'url', label: 'URL/Link', icon: FileText },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function WorkflowBuilder({ clienteId, clienteNome, onClose }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [selectedEtapa, setSelectedEtapa] = useState<Etapa | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [showNewEtapa, setShowNewEtapa] = useState(false);
  const [showNewCampo, setShowNewCampo] = useState(false);
  const [showNewAprovacao, setShowNewAprovacao] = useState(false);
  
  const [newWorkflow, setNewWorkflow] = useState({ nome: '', descricao: '' });
  const [newEtapa, setNewEtapa] = useState({ nome: '', descricao: '', cor: '#3b82f6', prazo_dias: '' });
  const [newCampo, setNewCampo] = useState({ nome: '', label: '', tipo: 'texto', obrigatorio: false, formula: '', opcoes: [] as string[], valor_padrao: '' });
  const [novaOpcao, setNovaOpcao] = useState('');
  const [newAprovacao, setNewAprovacao] = useState({ nome: '', tipo: 'simples', aprovadores_minimos: 1 });

  useEffect(() => { fetchWorkflows(); }, [clienteId]);
  useEffect(() => { if (selectedWorkflow) fetchEtapas(selectedWorkflow.id); }, [selectedWorkflow]);
  useEffect(() => { if (selectedEtapa) { fetchCampos(selectedEtapa.id); fetchAprovacoes(selectedEtapa.id); } }, [selectedEtapa]);

  const fetchWorkflows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('licitacao_workflows')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Erro ao buscar workflows:', error);
    setWorkflows((data || []) as Workflow[]);
    setLoading(false);
  };

  const fetchEtapas = async (workflowId: string) => {
    const { data } = await supabase.from('workflow_etapas').select('*').eq('workflow_id', workflowId).order('ordem');
    setEtapas((data || []) as Etapa[]);
  };

  const fetchCampos = async (etapaId: string) => {
    const { data } = await supabase.from('workflow_campos').select('*').eq('etapa_id', etapaId).order('ordem');
    setCampos((data || []) as Campo[]);
  };

  const fetchAprovacoes = async (etapaId: string) => {
    const { data } = await supabase.from('workflow_aprovacoes').select('*').eq('etapa_id', etapaId).order('ordem');
    setAprovacoes((data || []) as Aprovacao[]);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    
    const { data, error } = await supabase
      .from('licitacao_workflows')
      .insert({ cliente_id: clienteId, nome: newWorkflow.nome, descricao: newWorkflow.descricao || null })
      .select()
      .single();
    
    if (error) { 
      console.error('Erro ao criar workflow:', error);
      toast.error(`Erro ao criar workflow: ${error.message}`); 
    } else { 
      toast.success('Workflow criado!'); 
      setWorkflows([data as Workflow, ...workflows]); 
      setSelectedWorkflow(data as Workflow); 
      setShowNewWorkflow(false); 
      setNewWorkflow({ nome: '', descricao: '' }); 
    }
  };

  const handleCreateEtapa = async () => {
    if (!newEtapa.nome.trim() || !selectedWorkflow) { toast.error('Nome é obrigatório'); return; }
    
    const { data, error } = await supabase
      .from('workflow_etapas')
      .insert({
        workflow_id: selectedWorkflow.id, 
        nome: newEtapa.nome, 
        descricao: newEtapa.descricao || null, 
        cor: newEtapa.cor, 
        prazo_dias: newEtapa.prazo_dias ? parseInt(newEtapa.prazo_dias) : null, 
        ordem: etapas.length
      })
      .select()
      .single();
    
    if (error) { 
      console.error('Erro ao criar etapa:', error);
      toast.error(`Erro ao criar etapa: ${error.message}`); 
    } else { 
      toast.success('Etapa criada!'); 
      setEtapas([...etapas, data as Etapa]); 
      setSelectedEtapa(data as Etapa); 
      setShowNewEtapa(false); 
      setNewEtapa({ nome: '', descricao: '', cor: '#3b82f6', prazo_dias: '' }); 
    }
  };

  const handleCreateCampo = async () => {
    if (!newCampo.nome.trim() || !newCampo.label.trim() || !selectedEtapa) { 
      toast.error('Nome e label são obrigatórios'); 
      return; 
    }
    
    if (newCampo.tipo === 'selecao' && newCampo.opcoes.length < 2) {
      toast.error('Adicione pelo menos 2 opções para o campo de seleção');
      return;
    }
    
    const { data, error } = await supabase
      .from('workflow_campos')
      .insert({
        etapa_id: selectedEtapa.id, 
        nome: newCampo.nome, 
        label: newCampo.label, 
        tipo: newCampo.tipo, 
        obrigatorio: newCampo.obrigatorio, 
        formula: newCampo.formula || null, 
        opcoes: newCampo.tipo === 'selecao' ? newCampo.opcoes : null,
        valor_padrao: newCampo.valor_padrao || null,
        ordem: campos.length
      })
      .select()
      .single();
    
    if (error) { 
      console.error('Erro ao criar campo:', error);
      toast.error(`Erro ao criar campo: ${error.message}`); 
    } else { 
      toast.success('Campo criado!'); 
      setCampos([...campos, data as Campo]); 
      setShowNewCampo(false); 
      setNewCampo({ nome: '', label: '', tipo: 'texto', obrigatorio: false, formula: '', opcoes: [], valor_padrao: '' }); 
    }
  };
  
  const handleAddOpcao = () => {
    if (!novaOpcao.trim()) return;
    if (newCampo.opcoes.includes(novaOpcao.trim())) {
      toast.error('Opção já existe');
      return;
    }
    setNewCampo({ ...newCampo, opcoes: [...newCampo.opcoes, novaOpcao.trim()] });
    setNovaOpcao('');
  };
  
  const handleRemoveOpcao = (opcao: string) => {
    setNewCampo({ ...newCampo, opcoes: newCampo.opcoes.filter(o => o !== opcao) });
  };

  const handleCreateAprovacao = async () => {
    if (!newAprovacao.nome.trim() || !selectedEtapa) { toast.error('Nome é obrigatório'); return; }
    
    const { data, error } = await supabase
      .from('workflow_aprovacoes')
      .insert({
        etapa_id: selectedEtapa.id, 
        nome: newAprovacao.nome, 
        tipo: newAprovacao.tipo, 
        aprovadores_minimos: newAprovacao.aprovadores_minimos, 
        ordem: aprovacoes.length
      })
      .select()
      .single();
    
    if (error) { 
      console.error('Erro ao criar aprovação:', error);
      toast.error(`Erro ao criar aprovação: ${error.message}`); 
    } else { 
      toast.success('Aprovação criada!'); 
      setAprovacoes([...aprovacoes, data as Aprovacao]); 
      setShowNewAprovacao(false); 
      setNewAprovacao({ nome: '', tipo: 'simples', aprovadores_minimos: 1 }); 
    }
  };

  const handleDeleteEtapa = async (id: string) => { 
    const { error } = await supabase.from('workflow_etapas').delete().eq('id', id); 
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } else {
      setEtapas(etapas.filter(e => e.id !== id)); 
      if (selectedEtapa?.id === id) setSelectedEtapa(null);
      toast.success('Etapa excluída'); 
    }
  };
  
  const handleDeleteCampo = async (id: string) => { 
    const { error } = await supabase.from('workflow_campos').delete().eq('id', id); 
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } else {
      setCampos(campos.filter(c => c.id !== id)); 
      toast.success('Campo excluído'); 
    }
  };
  
  const handleDeleteAprovacao = async (id: string) => { 
    const { error } = await supabase.from('workflow_aprovacoes').delete().eq('id', id); 
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } else {
      setAprovacoes(aprovacoes.filter(a => a.id !== id)); 
      toast.success('Aprovação excluída'); 
    }
  };

  const handleReorderEtapas = async (newOrder: Etapa[]) => {
    setEtapas(newOrder);
    // Update order in database
    for (let i = 0; i < newOrder.length; i++) {
      await supabase.from('workflow_etapas').update({ ordem: i }).eq('id', newOrder[i].id);
    }
  };

  const getFieldIcon = (tipo: string) => { 
    const f = FIELD_TYPES.find(t => t.value === tipo); 
    return f ? f.icon : FileText; 
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h2 className="text-xl font-bold">Configurar Workflows</h2>
          <p className="text-sm text-muted-foreground">{clienteNome}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />Fechar
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Workflows List */}
        <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Workflows</h3>
              <Button size="sm" onClick={() => setShowNewWorkflow(true)}>
                <Plus className="h-4 w-4 mr-1" />Novo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione ou crie um workflow para configurar
            </p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {workflows.map(w => (
                <motion.div 
                  key={w.id} 
                  whileHover={{ scale: 1.02 }} 
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedWorkflow?.id === w.id 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-card hover:bg-accent border border-border'
                  }`} 
                  onClick={() => { 
                    setSelectedWorkflow(w); 
                    setSelectedEtapa(null); 
                    setCampos([]); 
                    setAprovacoes([]); 
                  }}
                >
                  <div className="font-medium">{w.nome}</div>
                  {w.descricao && (
                    <p className="text-xs opacity-70 mt-1 line-clamp-2">{w.descricao}</p>
                  )}
                  <Badge 
                    variant={selectedWorkflow?.id === w.id ? 'secondary' : (w.ativo ? 'default' : 'outline')} 
                    className="mt-2 text-xs"
                  >
                    {w.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </motion.div>
              ))}
              {workflows.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhum workflow</p>
                  <p className="text-xs text-muted-foreground mt-1">Crie seu primeiro workflow</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content - Steps Timeline */}
        {selectedWorkflow ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Workflow Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedWorkflow.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {etapas.length} etapas configuradas
                  </p>
                </div>
                <Button onClick={() => setShowNewEtapa(true)}>
                  <Plus className="h-4 w-4 mr-2" />Nova Etapa
                </Button>
              </div>
            </div>

            {/* Steps Timeline View */}
            <div className="flex-1 overflow-auto p-6">
              {etapas.length > 0 ? (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <Reorder.Group 
                    axis="y" 
                    values={etapas} 
                    onReorder={handleReorderEtapas}
                    className="space-y-4"
                  >
                    {etapas.map((etapa, index) => (
                      <Reorder.Item key={etapa.id} value={etapa}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`relative pl-16 ${
                            selectedEtapa?.id === etapa.id ? '' : ''
                          }`}
                        >
                          {/* Step Number Circle */}
                          <div 
                            className="absolute left-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg cursor-grab active:cursor-grabbing z-10"
                            style={{ backgroundColor: etapa.cor }}
                          >
                            {index + 1}
                          </div>

                          {/* Step Card */}
                          <Card 
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedEtapa?.id === etapa.id 
                                ? 'ring-2 ring-primary shadow-lg' 
                                : ''
                            }`}
                            onClick={() => setSelectedEtapa(etapa)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                  <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                      {etapa.nome}
                                      {etapa.obrigatoria && (
                                        <Badge variant="destructive" className="text-xs">Obrigatória</Badge>
                                      )}
                                    </CardTitle>
                                    {etapa.descricao && (
                                      <p className="text-sm text-muted-foreground mt-1">{etapa.descricao}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {etapa.prazo_dias && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />{etapa.prazo_dias} dias
                                    </Badge>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                    onClick={(ev) => { ev.stopPropagation(); handleDeleteEtapa(etapa.id); }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            {selectedEtapa?.id === etapa.id && (
                              <CardContent className="pt-2 border-t border-border mt-2">
                                <p className="text-xs text-muted-foreground mb-3">
                                  Clique abaixo para configurar campos e aprovações desta etapa
                                </p>
                                <div className="flex gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />{campos.length} campos
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />{aprovacoes.length} aprovações
                                  </Badge>
                                </div>
                              </CardContent>
                            )}
                          </Card>

                          {/* Connector Arrow */}
                          {index < etapas.length - 1 && (
                            <div className="absolute left-6 -bottom-4 transform -translate-x-1/2">
                              <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                            </div>
                          )}
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  {/* Add Step Button at End */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative pl-16 mt-4"
                  >
                    <div className="absolute left-0 w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-dashed"
                      onClick={() => setShowNewEtapa(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />Adicionar Etapa
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Settings className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">Nenhuma etapa configurada</h4>
                  <p className="text-muted-foreground mb-4">
                    Adicione etapas para criar o passo a passo do processo de licitação
                  </p>
                  <Button onClick={() => setShowNewEtapa(true)}>
                    <Plus className="h-4 w-4 mr-2" />Criar Primeira Etapa
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg text-muted-foreground">
                Selecione um workflow para configurar
              </p>
            </div>
          </div>
        )}

        {/* Right Panel - Step Configuration */}
        <AnimatePresence>
          {selectedEtapa && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <div className="w-[400px] h-full flex flex-col">
                <div className="p-4 border-b border-border" style={{ borderLeft: `4px solid ${selectedEtapa.cor}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold">{selectedEtapa.nome}</h4>
                      <p className="text-sm text-muted-foreground">Configuração da etapa</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEtapa(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="campos" className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="mx-4 mt-4">
                    <TabsTrigger value="campos" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />Campos ({campos.length})
                    </TabsTrigger>
                    <TabsTrigger value="aprovacoes" className="flex-1">
                      <Users className="h-4 w-4 mr-2" />Aprovações ({aprovacoes.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="campos" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Campos que o usuário preencherá nesta etapa
                      </p>
                      <Button size="sm" onClick={() => setShowNewCampo(true)}>
                        <Plus className="h-4 w-4 mr-1" />Campo
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {campos.map((c, i) => { 
                        const Icon = getFieldIcon(c.tipo); 
                        return (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-3 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{c.label}</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-destructive" 
                                onClick={() => handleDeleteCampo(c.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {FIELD_TYPES.find(f => f.value === c.tipo)?.label}
                              </Badge>
                              {c.obrigatorio && (
                                <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                              )}
                              {c.formula && (
                                <Badge variant="secondary" className="text-xs">Fórmula</Badge>
                              )}
                              {c.opcoes && c.opcoes.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{c.opcoes.length} opções</Badge>
                              )}
                            </div>
                            {c.tipo === 'selecao' && c.opcoes && c.opcoes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {c.opcoes.slice(0, 3).map((opt, idx) => (
                                  <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {opt}
                                  </span>
                                ))}
                                {c.opcoes.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{c.opcoes.length - 3}</span>
                                )}
                              </div>
                            )}
                          </motion.div>
                        ); 
                      })}
                      {campos.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum campo configurado</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="aprovacoes" className="flex-1 overflow-auto p-4 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Aprovações necessárias para avançar
                      </p>
                      <Button size="sm" onClick={() => setShowNewAprovacao(true)}>
                        <Plus className="h-4 w-4 mr-1" />Aprovação
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {aprovacoes.map((a, i) => (
                        <motion.div
                          key={a.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{a.nome}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0 text-destructive" 
                              onClick={() => handleDeleteAprovacao(a.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">{a.tipo}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              Mín. {a.aprovadores_minimos} aprovador(es)
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                      {aprovacoes.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma aprovação configurada</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <Dialog open={showNewWorkflow} onOpenChange={setShowNewWorkflow}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={newWorkflow.nome} 
                onChange={e => setNewWorkflow({ ...newWorkflow, nome: e.target.value })} 
                placeholder="Ex: Pregão Eletrônico" 
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea 
                value={newWorkflow.descricao} 
                onChange={e => setNewWorkflow({ ...newWorkflow, descricao: e.target.value })} 
                placeholder="Descreva o processo" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewWorkflow(false)}>Cancelar</Button>
            <Button onClick={handleCreateWorkflow}>Criar Workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewEtapa} onOpenChange={setShowNewEtapa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={newEtapa.nome} 
                onChange={e => setNewEtapa({ ...newEtapa, nome: e.target.value })} 
                placeholder="Ex: Análise do Edital" 
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea 
                value={newEtapa.descricao} 
                onChange={e => setNewEtapa({ ...newEtapa, descricao: e.target.value })} 
                placeholder="Descreva o que deve ser feito nesta etapa" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full transition-transform ${newEtapa.cor === c ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewEtapa({ ...newEtapa, cor: c })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Prazo (dias)</Label>
                <Input 
                  type="number" 
                  value={newEtapa.prazo_dias} 
                  onChange={e => setNewEtapa({ ...newEtapa, prazo_dias: e.target.value })} 
                  placeholder="Ex: 5" 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEtapa(false)}>Cancelar</Button>
            <Button onClick={handleCreateEtapa}>Criar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCampo} onOpenChange={setShowNewCampo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Campo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome interno *</Label>
                <Input 
                  value={newCampo.nome} 
                  onChange={e => setNewCampo({ ...newCampo, nome: e.target.value })} 
                  placeholder="valor_proposta" 
                />
              </div>
              <div>
                <Label>Label *</Label>
                <Input 
                  value={newCampo.label} 
                  onChange={e => setNewCampo({ ...newCampo, label: e.target.value })} 
                  placeholder="Valor da Proposta" 
                />
              </div>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newCampo.tipo} onValueChange={v => setNewCampo({ ...newCampo, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newCampo.tipo === 'calculado' && (
              <div>
                <Label>Fórmula</Label>
                <Input 
                  value={newCampo.formula} 
                  onChange={e => setNewCampo({ ...newCampo, formula: e.target.value })} 
                  placeholder="Ex: campo1 * campo2" 
                />
              </div>
            )}
            {newCampo.tipo === 'selecao' && (
              <div className="space-y-3">
                <Label>Opções da Seleção *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={novaOpcao}
                    onChange={e => setNovaOpcao(e.target.value)}
                    placeholder="Digite uma opção"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddOpcao())}
                  />
                  <Button type="button" onClick={handleAddOpcao} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newCampo.opcoes.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    {newCampo.opcoes.map((opcao, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="flex items-center gap-1 pr-1"
                      >
                        {opcao}
                        <button 
                          onClick={() => handleRemoveOpcao(opcao)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {newCampo.opcoes.length < 2 && (
                  <p className="text-xs text-muted-foreground">Adicione pelo menos 2 opções</p>
                )}
              </div>
            )}
            {newCampo.tipo !== 'selecao' && newCampo.tipo !== 'calculado' && newCampo.tipo !== 'arquivo' && newCampo.tipo !== 'checkbox' && (
              <div>
                <Label>Valor Padrão</Label>
                <Input 
                  value={newCampo.valor_padrao} 
                  onChange={e => setNewCampo({ ...newCampo, valor_padrao: e.target.value })} 
                  placeholder="Valor padrão do campo (opcional)" 
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch 
                checked={newCampo.obrigatorio} 
                onCheckedChange={c => setNewCampo({ ...newCampo, obrigatorio: c })} 
              />
              <Label>Campo obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCampo(false)}>Cancelar</Button>
            <Button onClick={handleCreateCampo}>Criar Campo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewAprovacao} onOpenChange={setShowNewAprovacao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aprovação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={newAprovacao.nome} 
                onChange={e => setNewAprovacao({ ...newAprovacao, nome: e.target.value })} 
                placeholder="Ex: Aprovação Gerencial" 
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newAprovacao.tipo} onValueChange={v => setNewAprovacao({ ...newAprovacao, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples (qualquer aprovador)</SelectItem>
                  <SelectItem value="sequencial">Sequencial (em ordem)</SelectItem>
                  <SelectItem value="unanime">Unânime (todos devem aprovar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aprovadores mínimos</Label>
              <Input 
                type="number" 
                min={1} 
                value={newAprovacao.aprovadores_minimos} 
                onChange={e => setNewAprovacao({ ...newAprovacao, aprovadores_minimos: parseInt(e.target.value) || 1 })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewAprovacao(false)}>Cancelar</Button>
            <Button onClick={handleCreateAprovacao}>Criar Aprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}