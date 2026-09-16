import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit2, Trash2, Bot, Sparkles, Copy, FileSearch, Gavel, MonitorPlay, TrendingUp, Loader2 } from "lucide-react";

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
}

interface ClienteIAManagerProps {
  clienteId: string;
}

const TIPOS_IA = [
  { value: "analise_edital", label: "Análise de Edital", icon: FileSearch, color: "text-blue-500", bg: "bg-blue-500/10" },
  
  { value: "monitor_pregao", label: "Monitor do Pregão", icon: MonitorPlay, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { value: "analise_estrategica", label: "Análise Estratégica", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
];

const MODELOS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Rápido)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Econômico)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avançado)" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano (Econômico)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (Premium)" },
  { value: "openai/gpt-5.2", label: "GPT-5.2 (Máximo)" },
];

export function ClienteIAManager({ clienteId }: ClienteIAManagerProps) {
  const [prompts, setPrompts] = useState<IAPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<IAPrompt | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTipo, setActiveTipo] = useState("analise_edital");
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    tipo: "analise_edital",
    nome: "",
    descricao: "",
    prompt_sistema: "",
    prompt_usuario: "",
    modelo: "google/gemini-2.5-flash",
    temperatura: 0.7,
    max_tokens: 4096,
  });

  useEffect(() => {
    if (clienteId) fetchPrompts();
  }, [clienteId]);

  const fetchPrompts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ia_prompts")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("ativo", true)
      .order("tipo")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prompts:", error);
    } else {
      setPrompts(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (prompt?: IAPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        tipo: prompt.tipo,
        nome: prompt.nome,
        descricao: prompt.descricao || "",
        prompt_sistema: prompt.prompt_sistema,
        prompt_usuario: prompt.prompt_usuario || "",
        modelo: prompt.modelo,
        temperatura: prompt.temperatura,
        max_tokens: prompt.max_tokens,
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        tipo: activeTipo,
        nome: "",
        descricao: "",
        prompt_sistema: "",
        prompt_usuario: "",
        modelo: "google/gemini-2.5-flash",
        temperatura: 0.7,
        max_tokens: 4096,
      });
    }
    setDialogOpen(true);
  };

  const handleDuplicate = (prompt: IAPrompt) => {
    setEditingPrompt(null);
    setFormData({
      tipo: prompt.tipo,
      nome: `${prompt.nome} (Cópia)`,
      descricao: prompt.descricao || "",
      prompt_sistema: prompt.prompt_sistema,
      prompt_usuario: prompt.prompt_usuario || "",
      modelo: prompt.modelo,
      temperatura: prompt.temperatura,
      max_tokens: prompt.max_tokens,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim() || !formData.prompt_sistema.trim()) {
      toast.error("Preencha o nome e o prompt do sistema");
      return;
    }

    setSaving(true);
    const payload = {
      cliente_id: clienteId,
      tipo: formData.tipo,
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      prompt_sistema: formData.prompt_sistema.trim(),
      prompt_usuario: formData.prompt_usuario.trim() || null,
      modelo: formData.modelo,
      temperatura: formData.temperatura,
      max_tokens: formData.max_tokens,
    };

    if (editingPrompt) {
      const { error } = await supabase
        .from("ia_prompts")
        .update(payload)
        .eq("id", editingPrompt.id);

      if (error) {
        toast.error("Erro ao atualizar configuração");
      } else {
        toast.success("Configuração atualizada!");
        fetchPrompts();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from("ia_prompts")
        .insert(payload);

      if (error) {
        toast.error(error.code === "23505" ? "Já existe uma configuração com este nome" : "Erro ao criar configuração");
      } else {
        toast.success("Configuração criada!");
        fetchPrompts();
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja remover esta configuração?")) return;
    const { error } = await supabase
      .from("ia_prompts")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover");
    } else {
      toast.success("Configuração removida");
      fetchPrompts();
    }
  };

  const filteredPrompts = prompts.filter((p) => p.tipo === activeTipo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configurações de IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Parametrize os prompts e modelos de IA para cada funcionalidade
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </Button>
        )}
      </div>

      {/* Tipo Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {TIPOS_IA.map((tipo) => {
          const Icon = tipo.icon;
          const count = prompts.filter((p) => p.tipo === tipo.value).length;
          return (
            <button
              key={tipo.value}
              onClick={() => setActiveTipo(tipo.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                activeTipo === tipo.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <div className={`p-1.5 rounded-md ${tipo.bg}`}>
                <Icon className={`h-4 w-4 ${tipo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{tipo.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {count} {count === 1 ? "config" : "configs"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Prompts List */}
      {filteredPrompts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma configuração para {TIPOS_IA.find((t) => t.value === activeTipo)?.label}.</p>
            {isAdmin && (
              <Button variant="outline" className="mt-3" size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar configuração
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="group hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{prompt.nome}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {MODELOS.find((m) => m.value === prompt.modelo)?.label.split(" (")[0] || prompt.modelo}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {prompt.descricao || prompt.prompt_sistema.slice(0, 120) + "..."}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>Temperatura: {prompt.temperatura}</span>
                      <span>Max Tokens: {prompt.max_tokens}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(prompt)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(prompt)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(prompt.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {editingPrompt ? "Editar Configuração" : "Nova Configuração de IA"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basico" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de IA *</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_IA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                  Define a personalidade e comportamento da IA. Use variáveis como {"{edital}"}, {"{cliente}"}.
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
          </Tabs>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
