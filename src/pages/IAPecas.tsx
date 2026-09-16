import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Sparkles,
  FileWarning,
  Scale,
  MessageSquare,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface IAPrompt {
  id: string;
  cliente_id: string;
  tipo: string;
  nome: string;
  descricao: string | null;
  prompt_sistema: string;
  prompt_usuario: string | null;
  modelo: string;
  temperatura: number;
  max_tokens: number;
  ativo: boolean;
  created_at: string;
  cliente?: { nome: string };
}

interface Cliente {
  id: string;
  nome: string;
}

const TIPOS_PECAS = [
  { value: 'pecas_impugnacao', label: 'Impugnação', icon: FileWarning, color: 'text-orange-500' },
  { value: 'pecas_recurso', label: 'Recurso', icon: Scale, color: 'text-red-500' },
  { value: 'pecas_contrarrazoes', label: 'Contrarrazões', icon: MessageSquare, color: 'text-blue-500' },
  { value: 'pecas_esclarecimento', label: 'Esclarecimento', icon: HelpCircle, color: 'text-green-500' },
];

const MODELOS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

export default function IAPecas() {
  const { isAdmin } = useAuth();
  const [prompts, setPrompts] = useState<IAPrompt[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<IAPrompt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');

  const [formData, setFormData] = useState({
    cliente_id: '',
    tipo: 'pecas_impugnacao',
    nome: '',
    descricao: '',
    prompt_sistema: '',
    prompt_usuario: '',
    modelo: 'google/gemini-2.5-flash',
    temperatura: 0.7,
    max_tokens: 8192,
  });

  useEffect(() => {
    fetchPrompts();
    if (isAdmin) fetchClientes();
  }, [isAdmin]);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('ia_prompts')
        .select('*, cliente:clientes(nome)')
        .in('tipo', TIPOS_PECAS.map(t => t.value))
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts((data as unknown as IAPrompt[]) || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesCliente = selectedCliente === 'all' || p.cliente_id === selectedCliente;
    const matchesTipo = selectedTipo === 'all' || p.tipo === selectedTipo;
    return matchesCliente && matchesTipo;
  });

  const handleOpenDialog = (prompt?: IAPrompt) => {
    if (prompt) {
      setSelectedPrompt(prompt);
      setFormData({
        cliente_id: prompt.cliente_id,
        tipo: prompt.tipo,
        nome: prompt.nome,
        descricao: prompt.descricao || '',
        prompt_sistema: prompt.prompt_sistema,
        prompt_usuario: prompt.prompt_usuario || '',
        modelo: prompt.modelo,
        temperatura: prompt.temperatura,
        max_tokens: prompt.max_tokens,
      });
    } else {
      setSelectedPrompt(null);
      setFormData({
        cliente_id: selectedCliente !== 'all' ? selectedCliente : '',
        tipo: selectedTipo !== 'all' ? selectedTipo : 'pecas_impugnacao',
        nome: '',
        descricao: '',
        prompt_sistema: '',
        prompt_usuario: '',
        modelo: 'google/gemini-2.5-flash',
        temperatura: 0.7,
        max_tokens: 8192,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.cliente_id || !formData.nome || !formData.prompt_sistema) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const promptData = {
        cliente_id: formData.cliente_id,
        tipo: formData.tipo,
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        prompt_sistema: formData.prompt_sistema.trim(),
        prompt_usuario: formData.prompt_usuario.trim() || null,
        modelo: formData.modelo,
        temperatura: formData.temperatura,
        max_tokens: formData.max_tokens,
      };

      if (selectedPrompt) {
        const { error } = await supabase
          .from('ia_prompts')
          .update(promptData)
          .eq('id', selectedPrompt.id);
        if (error) throw error;
        toast.success('Configuração atualizada!');
      } else {
        const { error } = await supabase
          .from('ia_prompts')
          .insert(promptData);
        if (error) throw error;
        toast.success('Configuração criada!');
      }

      setIsDialogOpen(false);
      fetchPrompts();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma configuração com este nome para o cliente');
      } else {
        toast.error('Erro ao salvar configuração');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (prompt: IAPrompt) => {
    if (!confirm('Deseja remover esta configuração?')) return;

    try {
      const { error } = await supabase
        .from('ia_prompts')
        .update({ ativo: false })
        .eq('id', prompt.id);
      if (error) throw error;
      toast.success('Configuração removida!');
      fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Erro ao remover configuração');
    }
  };

  const getTipoPeca = (tipo: string) => TIPOS_PECAS.find(t => t.value === tipo);

  if (loading) {
    return (
      <MainLayout title="Peças Jurídicas" subtitle="Configuração de prompts para geração de peças">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Peças Jurídicas" subtitle="Configuração de prompts para geração de peças">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-glow">
                  <FileText className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Geração de Peças com IA</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure prompts para gerar impugnações, recursos, contrarrazões e esclarecimentos
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">Configuração</Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                    <Badge variant="secondary" className="text-xs">
                      <Link to="/licitacoes" className="hover:underline">
                        Aplicado em: Licitações → Esclarecimento/Recurso e Impugnação/Contrarrazão
                      </Link>
                    </Badge>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Configuração
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Types Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {TIPOS_PECAS.map((tipo) => {
          const count = prompts.filter(p => p.tipo === tipo.value).length;
          const Icon = tipo.icon;
          return (
            <Card 
              key={tipo.value} 
              className={`cursor-pointer transition-all ${selectedTipo === tipo.value ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
              onClick={() => setSelectedTipo(selectedTipo === tipo.value ? 'all' : tipo.value)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${tipo.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">{tipo.label}</p>
                  <p className="text-xs text-muted-foreground">{count} config.</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Configure prompts de IA para cada tipo de peça jurídica por cliente.
          </p>
          {isAdmin && (
            <Button onClick={() => handleOpenDialog()} className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Configuração
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrompts.map((prompt, index) => {
            const tipoPeca = getTipoPeca(prompt.tipo);
            const Icon = tipoPeca?.icon || FileText;
            return (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-muted ${tipoPeca?.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tipoPeca?.label}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {MODELOS.find(m => m.value === prompt.modelo)?.label.split(' ')[0]}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{prompt.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {prompt.cliente?.nome}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {prompt.descricao || prompt.prompt_sistema.slice(0, 100)}...
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(prompt)}>
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedPrompt(null);
                        setFormData({
                          ...formData,
                          cliente_id: prompt.cliente_id,
                          tipo: prompt.tipo,
                          nome: `${prompt.nome} (Cópia)`,
                          descricao: prompt.descricao || '',
                          prompt_sistema: prompt.prompt_sistema,
                          prompt_usuario: prompt.prompt_usuario || '',
                          modelo: prompt.modelo,
                          temperatura: prompt.temperatura,
                          max_tokens: prompt.max_tokens,
                        });
                        setIsDialogOpen(true);
                      }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(prompt)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {selectedPrompt ? 'Editar Configuração' : 'Nova Configuração de Peça'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basico" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Peça *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PECAS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome da Configuração *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Impugnação Padrão, Recurso Técnico..."
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva quando usar esta configuração..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Prompt do Sistema *</Label>
                <Textarea
                  value={formData.prompt_sistema}
                  onChange={(e) => setFormData({ ...formData, prompt_sistema: e.target.value })}
                  placeholder="Instruções para a IA gerar a peça jurídica..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: {'{edital}'}, {'{motivo}'}, {'{fundamentacao}'}, {'{cliente}'}, {'{empresa}'}.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Template de Prompt do Usuário</Label>
                <Textarea
                  value={formData.prompt_usuario}
                  onChange={(e) => setFormData({ ...formData, prompt_usuario: e.target.value })}
                  placeholder="Template enviado junto com os dados da peça..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="avancado" className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select
                  value={formData.modelo}
                  onValueChange={(v) => setFormData({ ...formData, modelo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Recomendado: GPT-5 ou Gemini Pro para peças jurídicas.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Temperatura</Label>
                  <span className="text-sm font-medium">{formData.temperatura}</span>
                </div>
                <Slider
                  value={[formData.temperatura]}
                  onValueChange={([v]) => setFormData({ ...formData, temperatura: v })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Para peças jurídicas, recomendado 0.3-0.5 (mais preciso).
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de Tokens</Label>
                <Input
                  type="number"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 8192 })}
                  min={100}
                  max={32000}
                />
                <p className="text-xs text-muted-foreground">
                  Peças longas podem precisar de 8000+ tokens.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gradient-primary text-primary-foreground">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
