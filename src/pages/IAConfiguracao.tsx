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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Bot,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  Sparkles,
  Settings2,
  Copy,
  Play,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface IAConfiguracaoProps {
  tipo: 'analise_edital' | 'monitor_pregao' | 'analise_estrategica';
  title: string;
  subtitle: string;
  description: string;
}

const MODELOS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

export default function IAConfiguracao({ tipo, title, subtitle, description }: IAConfiguracaoProps) {
  const { isAdmin } = useAuth();
  const [prompts, setPrompts] = useState<IAPrompt[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<IAPrompt | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>('all');

  const [formData, setFormData] = useState({
    cliente_id: '',
    nome: '',
    descricao: '',
    prompt_sistema: '',
    prompt_usuario: '',
    modelo: 'google/gemini-2.5-flash',
    temperatura: 0.7,
    max_tokens: 4096,
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
        .eq('tipo', tipo)
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

  const filteredPrompts = prompts.filter(p => 
    selectedCliente === 'all' || p.cliente_id === selectedCliente
  );

  const handleOpenDialog = (prompt?: IAPrompt) => {
    if (prompt) {
      setSelectedPrompt(prompt);
      setFormData({
        cliente_id: prompt.cliente_id,
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
        nome: '',
        descricao: '',
        prompt_sistema: '',
        prompt_usuario: '',
        modelo: 'google/gemini-2.5-flash',
        temperatura: 0.7,
        max_tokens: 4096,
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
        tipo,
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

  const handleDuplicate = (prompt: IAPrompt) => {
    setSelectedPrompt(null);
    setFormData({
      cliente_id: prompt.cliente_id,
      nome: `${prompt.nome} (Cópia)`,
      descricao: prompt.descricao || '',
      prompt_sistema: prompt.prompt_sistema,
      prompt_usuario: prompt.prompt_usuario || '',
      modelo: prompt.modelo,
      temperatura: prompt.temperatura,
      max_tokens: prompt.max_tokens,
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout title={title} subtitle={subtitle}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={title} subtitle={subtitle}>
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-glow">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <Settings2 className="w-3 h-3" />
                  Configuração
                </Badge>
                <span className="text-xs text-muted-foreground">→</span>
                <Badge variant="secondary" className="text-xs gap-1">
                  {tipo === 'analise_edital' && (
                    <Link to="/licitacoes" className="hover:underline">Aplicado em: Licitações → Análise IA</Link>
                  )}
                  {tipo === 'analise_estrategica' && (
                    <Link to="/analise-estrategica" className="hover:underline">Aplicado em: Dashboard → Análise Estratégica</Link>
                  )}
                  
                  {tipo === 'monitor_pregao' && 'Aplicado em: Licitações → Etapas → Disputa'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total de Prompts</p>
            <p className="text-2xl font-bold">{prompts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Clientes Configurados</p>
            <p className="text-2xl font-bold">{new Set(prompts.map(p => p.cliente_id)).size}</p>
          </CardContent>
        </Card>
      </div>


      {/* Prompts Grid */}
      {filteredPrompts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Settings2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Configure os prompts de IA para cada cliente começar a usar {title.toLowerCase()}.
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
          {filteredPrompts.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{prompt.nome}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />
                        {prompt.cliente?.nome}
                      </CardDescription>
                    </div>


                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {prompt.descricao || prompt.prompt_sistema.slice(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Temp: {prompt.temperatura}</span>
                    <span>Tokens: {prompt.max_tokens}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(prompt)}>
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(prompt)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(prompt)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {selectedPrompt ? 'Editar Configuração' : 'Nova Configuração'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basico" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="avancado">Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
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
                <Label>Nome da Configuração *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Análise Padrão, Análise Detalhada..."
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o propósito desta configuração..."
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
                  placeholder="Instruções para a IA sobre como se comportar e analisar..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Define a personalidade e comportamento da IA. Use variáveis como {'{edital}'}, {'{cliente}'}.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Template de Prompt do Usuário</Label>
                <Textarea
                  value={formData.prompt_usuario}
                  onChange={(e) => setFormData({ ...formData, prompt_usuario: e.target.value })}
                  placeholder="Template para o prompt enviado com cada análise..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="avancado" className="space-y-6 mt-4">


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
                  Menor = mais focado e determinístico. Maior = mais criativo e variado.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de Tokens</Label>
                <Input
                  type="number"
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 4096 })}
                  min={100}
                  max={32000}
                />
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
