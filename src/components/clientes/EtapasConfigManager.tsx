import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sortEtapasForDisplay } from '@/lib/etapasOrder';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2,
  Scale,
  CheckCircle,
  FolderOpen,
  DollarSign,
  Swords,
  Trophy,
  Plus,
  Trash2,
  Settings2,
  Layers,
  GripVertical,
  Copy,
  ChevronUp,
  ChevronDown,
  Shield,
  Sparkles,
  FormInput,
  Brain,
  Users,
  Package,
  ListTodo,
  FileSignature,
  Receipt,
  Gavel,
  FileText,
} from 'lucide-react';

// ====== System Default Stage Definitions ======
const ETAPAS_SISTEMA = [
  {
    codigo: 'analise_edital',
    nome: 'Análise IA',
    descricao: 'Análise do edital com inteligência artificial, perguntas e respostas',
    icon: Brain,
    obrigatoria: false,
    cor: '#6366F1',
  },
  {
    codigo: 'aprovacoes',
    nome: 'Aprovações',
    descricao: 'Fluxo de aprovação com múltiplos aprovadores',
    icon: CheckCircle,
    obrigatoria: false,
    cor: '#10B981',
  },
  {
    codigo: 'esclarecimento_impugnacao',
    nome: 'Peças Jurídicas',
    descricao: 'Geração de peças jurídicas (esclarecimento, impugnação, recurso e contrarrazões) via IA',
    icon: Scale,
    obrigatoria: false,
    cor: '#8B5CF6',
  },
  {
    codigo: 'impugnacao_contrarrazao',
    nome: 'Impugnação / Contra-Razão',
    descricao: 'Geração de peças de impugnação e contra-razão',
    icon: Gavel,
    obrigatoria: false,
    cor: '#7C3AED',
  },
  {
    codigo: 'concorrentes',
    nome: 'Concorrentes',
    descricao: 'Análise e acompanhamento dos concorrentes na licitação',
    icon: Users,
    obrigatoria: false,
    cor: '#0EA5E9',
  },
  {
    codigo: 'preparacao_documentos',
    nome: 'Preparação de Documentos',
    descricao: 'Checklist de CNDs, atestados e documentos exigidos no edital',
    icon: FolderOpen,
    obrigatoria: true,
    cor: '#F59E0B',
  },
  {
    codigo: 'produtos',
    nome: 'Produtos',
    descricao: 'Gestão dos produtos e itens da licitação',
    icon: Package,
    obrigatoria: false,
    cor: '#F97316',
  },
  {
    codigo: 'proposta',
    nome: 'Proposta',
    descricao: 'Elaboração e finalização da proposta comercial/técnica',
    icon: DollarSign,
    obrigatoria: true,
    cor: '#EC4899',
  },
  {
    codigo: 'tarefas',
    nome: 'Tarefas',
    descricao: 'Gestão de tarefas e atividades relacionadas à licitação',
    icon: ListTodo,
    obrigatoria: false,
    cor: '#06B6D4',
  },
  {
    codigo: 'disputa_pregao',
    nome: 'Disputa do Pregão',
    descricao: 'Monitoramento do pregão e acompanhamento da sessão pública',
    icon: Swords,
    obrigatoria: true,
    cor: '#EF4444',
  },
  {
    codigo: 'resultado',
    nome: 'Resultado',
    descricao: 'Captura do resultado por item (ganhou/perdeu)',
    icon: Trophy,
    obrigatoria: true,
    cor: '#14B8A6',
  },
  {
    codigo: 'contratos',
    nome: 'Contratos',
    descricao: 'Gestão de contratos após resultado da licitação',
    icon: FileSignature,
    obrigatoria: false,
    cor: '#0D9488',
  },
  {
    codigo: 'empenhos',
    nome: 'Empenhos',
    descricao: 'Controle de empenhos e notas de empenho',
    icon: Receipt,
    obrigatoria: false,
    cor: '#84CC16',
  },
];

const CUSTOM_SLOTS = ['custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5'];

// ====== Field Types ======
const FIELD_TYPES = [
  { value: 'text', label: 'Texto', description: 'Campo de texto simples' },
  { value: 'textarea', label: 'Texto Longo', description: 'Área de texto multilinha' },
  { value: 'number', label: 'Numérico', description: 'Apenas números' },
  { value: 'currency', label: 'Monetário', description: 'Valor em R$' },
  { value: 'percentage', label: 'Percentual', description: 'Valor em %' },
  { value: 'date', label: 'Data', description: 'Seletor de data' },
  { value: 'datetime', label: 'Data/Hora', description: 'Data e horário' },
  { value: 'select', label: 'Lista de Opções', description: 'Seleção única' },
  { value: 'checkbox', label: 'Checkbox', description: 'Sim/Não' },
  { value: 'file', label: 'Arquivo', description: 'Upload de arquivo' },
  { value: 'email', label: 'E-mail', description: 'Validação de e-mail' },
  { value: 'phone', label: 'Telefone', description: 'Com máscara de telefone' },
  { value: 'cpf', label: 'CPF', description: 'Com máscara de CPF' },
  { value: 'cnpj', label: 'CNPJ', description: 'Com máscara de CNPJ' },
  { value: 'url', label: 'URL', description: 'Link/endereço web' },
];

const MASK_OPTIONS = [
  { value: '', label: 'Nenhuma' },
  { value: 'cpf', label: 'CPF (000.000.000-00)' },
  { value: 'cnpj', label: 'CNPJ (00.000.000/0000-00)' },
  { value: 'phone', label: 'Telefone (00) 00000-0000' },
  { value: 'cep', label: 'CEP (00000-000)' },
  { value: 'currency', label: 'Moeda (R$ 0,00)' },
  { value: 'percentage', label: 'Percentual (0,00%)' },
  { value: 'custom', label: 'Personalizada' },
];

// ====== Interfaces ======
interface CampoFormulario {
  id: string;
  campo_id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  mascara: string;
  mascara_custom?: string;
  placeholder?: string;
  valor_padrao?: string;
  opcoes?: string[]; // for select type
  ordem: number;
}

interface EtapaConfig {
  id?: string;
  etapa_codigo: string;
  ativo: boolean;
  ordem: number;
  configuracoes: Record<string, unknown>;
}

interface EtapasConfigManagerProps {
  clienteId: string;
}

// ====== Helper to generate campo_id ======
function generateCampoId(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ====== Field Editor Component ======
function CampoEditor({
  campo,
  index,
  totalCampos,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  campo: CampoFormulario;
  index: number;
  totalCampos: number;
  onUpdate: (campo: CampoFormulario) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const fieldTypeInfo = FIELD_TYPES.find(f => f.value === campo.tipo);

  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group">
      <div className="flex items-start gap-2">
        {/* Reorder controls */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
          <button
            onClick={onMoveDown}
            disabled={index >= totalCampos - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Field config */}
        <div className="flex-1 space-y-3">
          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nome do Campo
              </Label>
              <Input
                value={campo.nome}
                onChange={e => {
                  const nome = e.target.value;
                  const autoId = campo.campo_id === generateCampoId(campo.nome)
                    ? generateCampoId(nome)
                    : campo.campo_id;
                  onUpdate({ ...campo, nome, campo_id: autoId });
                }}
                placeholder="Ex: Data de Entrega"
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={campo.tipo}
                onValueChange={v => onUpdate({ ...campo, tipo: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(ft => (
                    <SelectItem key={ft.value} value={ft.value}>
                      <span className="flex items-center gap-2">
                        {ft.label}
                        <span className="text-[10px] text-muted-foreground">
                          — {ft.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ID do Campo
              </Label>
              <Input
                value={campo.campo_id}
                onChange={e => onUpdate({ ...campo, campo_id: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                placeholder="campo_id"
                className="h-8 text-sm font-mono text-xs"
              />
            </div>
            <div className="col-span-1 flex items-end justify-center pb-1">
              <button
                onClick={onDelete}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Remover campo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Options */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Máscara
              </Label>
              <Select
                value={campo.mascara || ''}
                onValueChange={v => onUpdate({ ...campo, mascara: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  {MASK_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={m.value || 'none'}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Placeholder
              </Label>
              <Input
                value={campo.placeholder || ''}
                onChange={e => onUpdate({ ...campo, placeholder: e.target.value })}
                placeholder="Texto de exemplo..."
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-3">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Valor Padrão
              </Label>
              <Input
                value={campo.valor_padrao || ''}
                onChange={e => onUpdate({ ...campo, valor_padrao: e.target.value })}
                placeholder="Valor inicial"
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-3 flex items-end gap-3 pb-1">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`req-${campo.id}`}
                  checked={campo.obrigatorio}
                  onCheckedChange={v => onUpdate({ ...campo, obrigatorio: !!v })}
                />
                <Label htmlFor={`req-${campo.id}`} className="text-xs cursor-pointer">
                  Obrigatório
                </Label>
              </div>
            </div>
          </div>

          {/* Mask custom input */}
          {campo.mascara === 'custom' && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Máscara Personalizada
              </Label>
              <Input
                value={campo.mascara_custom || ''}
                onChange={e => onUpdate({ ...campo, mascara_custom: e.target.value })}
                placeholder="Ex: 000.000.000-00 (use 0 para dígito, A para letra)"
                className="h-8 text-sm font-mono"
              />
            </div>
          )}

          {/* Select options */}
          {campo.tipo === 'select' && (
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Opções (uma por linha)
              </Label>
              <Textarea
                value={(campo.opcoes || []).join('\n')}
                onChange={e => onUpdate({ ...campo, opcoes: e.target.value.split('\n').filter(Boolean) })}
                placeholder={'Opção 1\nOpção 2\nOpção 3'}
                rows={3}
                className="text-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== Main Component ======
export function EtapasConfigManager({ clienteId }: EtapasConfigManagerProps) {
  const [configs, setConfigs] = useState<EtapaConfig[]>([]);
  const [regras, setRegras] = useState<{ id: string; titulo: string; descricao: string; categoria: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedEtapas, setExpandedEtapas] = useState<string[]>([]);
  const [showRegraDialog, setShowRegraDialog] = useState(false);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);

  // New custom stage dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newEtapaForm, setNewEtapaForm] = useState({
    nome: '',
    descricao: '',
    cor: '#6366F1',
    prazo_dias: '',
  });

  useEffect(() => {
    fetchConfigs();
  }, [clienteId]);

  const fetchConfigs = async () => {
    setLoading(true);
    const [cfgRes, regrasRes] = await Promise.all([
      supabase.from('licitacao_etapas_config').select('*').eq('cliente_id', clienteId).order('ordem'),
      supabase.from('cliente_regras').select('id, titulo, descricao, categoria').eq('cliente_id', clienteId).eq('ativo', true).order('ordem'),
    ]);

    setRegras(regrasRes.data || []);

    const data = cfgRes.data;
    if (data && data.length > 0) {
      const loaded = data.map(d => ({
        id: d.id,
        etapa_codigo: d.etapa_codigo,
        ativo: d.ativo,
        ordem: d.ordem,
        configuracoes: (d.configuracoes as Record<string, unknown>) || {},
      }));
      // Normaliza exibição para a ordem canônica quando o banco ainda tem a legada
      // (o usuário persiste ao clicar em Salvar)
      const normalized = sortEtapasForDisplay(
        loaded,
        (c) => c.etapa_codigo,
        (c) => c.ordem
      ).map((c, i) => ({ ...c, ordem: i }));
      setConfigs(normalized);
    } else {
      setConfigs(ETAPAS_SISTEMA.map((e, idx) => ({
        etapa_codigo: e.codigo,
        ativo: false,
        ordem: idx,
        configuracoes: {},
      })));
    }
    setLoading(false);
  };

  // ====== Helpers ======
  const getEtapaSistema = (codigo: string) =>
    ETAPAS_SISTEMA.find(e => e.codigo === codigo);

  const isCustom = (config: EtapaConfig) =>
    config.etapa_codigo.startsWith('custom_');

  const isCustomized = (config: EtapaConfig) => {
    if (isCustom(config)) return false;
    const cfg = config.configuracoes || {};
    return !!(cfg.nome_customizado || cfg.campos || cfg.cor_customizada);
  };

  const getDisplayName = (config: EtapaConfig) => {
    const custom = config.configuracoes?.nome_customizado as string;
    if (custom) return custom;
    return getEtapaSistema(config.etapa_codigo)?.nome || config.etapa_codigo;
  };

  const getDisplayColor = (config: EtapaConfig) => {
    const custom = config.configuracoes?.cor_customizada as string;
    if (custom) return custom;
    return getEtapaSistema(config.etapa_codigo)?.cor || '#666';
  };

  const getDisplayDesc = (config: EtapaConfig) => {
    const custom = config.configuracoes?.descricao_customizada as string;
    if (custom) return custom;
    return getEtapaSistema(config.etapa_codigo)?.descricao || '';
  };

  const getIcon = (config: EtapaConfig) => {
    return getEtapaSistema(config.etapa_codigo)?.icon || Layers;
  };

  const getCampos = (config: EtapaConfig): CampoFormulario[] => {
    return (config.configuracoes?.campos as CampoFormulario[]) || [];
  };

  // ====== Actions ======
  const handleToggle = (codigo: string) => {
    setConfigs(prev =>
      prev.map(c => c.etapa_codigo === codigo ? { ...c, ativo: !c.ativo } : c)
    );
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setConfigs(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((c, i) => ({ ...c, ordem: i }));
    });
  };

  const handleMoveDown = (idx: number) => {
    if (idx >= configs.length - 1) return;
    setConfigs(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((c, i) => ({ ...c, ordem: i }));
    });
  };

  const updateConfig = (codigo: string, updates: Partial<EtapaConfig['configuracoes']>) => {
    setConfigs(prev =>
      prev.map(c =>
        c.etapa_codigo === codigo
          ? { ...c, configuracoes: { ...c.configuracoes, ...updates } }
          : c
      )
    );
  };

  // ====== Campo CRUD ======
  const addCampo = (codigo: string) => {
    const campos = getCampos(configs.find(c => c.etapa_codigo === codigo)!);
    const novo: CampoFormulario = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      campo_id: '',
      nome: '',
      tipo: 'text',
      obrigatorio: false,
      mascara: '',
      placeholder: '',
      valor_padrao: '',
      ordem: campos.length,
    };
    updateConfig(codigo, { campos: [...campos, novo] });
  };

  const updateCampo = (codigo: string, campoId: string, updated: CampoFormulario) => {
    const config = configs.find(c => c.etapa_codigo === codigo);
    if (!config) return;
    const campos = getCampos(config).map(c => (c.id === campoId ? updated : c));
    updateConfig(codigo, { campos });
  };

  const deleteCampo = (codigo: string, campoId: string) => {
    const config = configs.find(c => c.etapa_codigo === codigo);
    if (!config) return;
    const campos = getCampos(config)
      .filter(c => c.id !== campoId)
      .map((c, i) => ({ ...c, ordem: i }));
    updateConfig(codigo, { campos });
  };

  const moveCampo = (codigo: string, from: number, direction: 'up' | 'down') => {
    const config = configs.find(c => c.etapa_codigo === codigo);
    if (!config) return;
    const campos = [...getCampos(config)];
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= campos.length) return;
    [campos[from], campos[to]] = [campos[to], campos[from]];
    updateConfig(codigo, { campos: campos.map((c, i) => ({ ...c, ordem: i })) });
  };

  // ====== Custom Etapa ======
  const handleAddCustomEtapa = () => {
    if (!newEtapaForm.nome.trim()) {
      toast.error('Informe o nome da etapa');
      return;
    }
    const usedSlots = configs.map(c => c.etapa_codigo).filter(c => c.startsWith('custom_'));
    const slot = CUSTOM_SLOTS.find(s => !usedSlots.includes(s));
    if (!slot) {
      toast.error('Limite de 5 etapas personalizadas atingido');
      return;
    }

    const newConfig: EtapaConfig = {
      etapa_codigo: slot,
      ativo: true,
      ordem: configs.length,
      configuracoes: {
        nome_customizado: newEtapaForm.nome,
        descricao_customizada: newEtapaForm.descricao,
        cor_customizada: newEtapaForm.cor,
        prazo_dias: newEtapaForm.prazo_dias || undefined,
        is_custom: true,
        campos: [],
      },
    };
    setConfigs(prev => [...prev, newConfig]);
    setShowNewDialog(false);
    setNewEtapaForm({ nome: '', descricao: '', cor: '#6366F1', prazo_dias: '' });
    // Auto-expand the new stage
    setExpandedEtapas(prev => [...prev, slot]);
    toast.success('Etapa criada! Configure os campos do formulário abaixo.');
  };

  const handleDeleteCustom = (codigo: string) => {
    const config = configs.find(c => c.etapa_codigo === codigo);
    if (!config) return;
    setConfigs(prev =>
      prev.filter(c => c.etapa_codigo !== codigo).map((c, i) => ({ ...c, ordem: i }))
    );
    if (config.id) {
      supabase.from('licitacao_etapas_config').delete().eq('id', config.id);
    }
    toast.success('Etapa removida');
  };
  // ====== Insert regra as step ======
  const handleInsertRegra = (regraId: string) => {
    const regra = regras.find(r => r.id === regraId);
    if (!regra) return;
    // Check if already added
    if (configs.some(c => c.configuracoes?.regra_id === regraId)) {
      toast.error('Esta regra já está inserida como etapa');
      return;
    }
    const usedSlots = configs.map(c => c.etapa_codigo).filter(c => c.startsWith('custom_'));
    const slot = CUSTOM_SLOTS.find(s => !usedSlots.includes(s));
    if (!slot) {
      toast.error('Limite de 5 etapas personalizadas atingido');
      return;
    }
    const insertAt = insertAfterIdx !== null ? insertAfterIdx + 1 : configs.length;
    const newConfig: EtapaConfig = {
      etapa_codigo: slot,
      ativo: true,
      ordem: insertAt,
      configuracoes: {
        nome_customizado: regra.titulo,
        descricao_customizada: regra.descricao,
        cor_customizada: '#8B5CF6',
        is_custom: true,
        is_regra: true,
        regra_id: regraId,
        campos: [],
      },
    };
    setConfigs(prev => {
      const next = [...prev];
      next.splice(insertAt, 0, newConfig);
      return next.map((c, i) => ({ ...c, ordem: i }));
    });
    setShowRegraDialog(false);
    setInsertAfterIdx(null);
    toast.success(`Regra "${regra.titulo}" inserida como etapa`);
  };

  const availableRegras = regras.filter(r => !configs.some(c => c.configuracoes?.regra_id === r.id));


  const handleSave = async () => {
    setSaving(true);
    try {
      for (const config of configs) {
        const payload = {
          cliente_id: clienteId,
          etapa_codigo: config.etapa_codigo as any,
          ativo: config.ativo,
          ordem: config.ordem,
          configuracoes: config.configuracoes as any,
        };
        if (config.id) {
          await supabase.from('licitacao_etapas_config').update(payload).eq('id', config.id);
        } else {
          const { data } = await supabase
            .from('licitacao_etapas_config')
            .insert(payload)
            .select()
            .single();
          if (data) config.id = data.id;
        }
      }
      toast.success('Configuração de etapas salva com sucesso!');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
    setSaving(false);
  };

  const usedCustomSlots = configs.filter(c => c.etapa_codigo.startsWith('custom_')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FormInput className="h-4 w-4 text-primary" />
            Etapas da Licitação
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure as etapas e construa o formulário de cada uma com campos personalizados
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableRegras.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setInsertAfterIdx(configs.length - 1); setShowRegraDialog(true); }}
              disabled={usedCustomSlots >= 5}
            >
              <FileText className="h-4 w-4 mr-1" />
              Inserir Regra
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewDialog(true)}
            disabled={usedCustomSlots >= 5}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Etapa
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Etapas
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span>= Etapa padrão do sistema</span>
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          <span>= Etapa personalizada do cliente</span>
        </span>
        <span className="flex items-center gap-1">
          <Settings2 className="h-3 w-3" />
          <span>= Campos customizados adicionados</span>
        </span>
      </div>

      {/* Stages Accordion */}
      <Accordion
        type="multiple"
        value={expandedEtapas}
        onValueChange={setExpandedEtapas}
        className="space-y-2"
      >
        {configs.map((config, idx) => {
          const sistema = getEtapaSistema(config.etapa_codigo);
          const custom = isCustom(config);
          const customized = isCustomized(config);
          const Icon = custom ? Layers : getIcon(config);
          const displayName = getDisplayName(config);
          const displayColor = getDisplayColor(config);
          const displayDesc = getDisplayDesc(config);
          const campos = getCampos(config);

          return (
            <AccordionItem
              key={config.etapa_codigo}
              value={config.etapa_codigo}
              className="border border-border rounded-lg overflow-hidden data-[state=open]:ring-1 data-[state=open]:ring-primary/20"
            >
              {/* Stage Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-card">
                {/* Reorder */}
                <div className="flex flex-col gap-0">
                  <button
                    onClick={e => { e.stopPropagation(); handleMoveUp(idx); }}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleMoveDown(idx); }}
                    disabled={idx >= configs.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Icon */}
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: `${displayColor}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color: displayColor }} />
                </div>

                {/* Name & Badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{displayName}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {idx + 1}
                    </Badge>
                    {!custom && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 shrink-0 bg-muted/50 gap-1"
                      >
                        <Shield className="h-2.5 w-2.5" />
                        Padrão
                      </Badge>
                    )}
                    {custom && config.configuracoes?.is_regra && (
                      <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-amber-500/15 text-amber-700 gap-1">
                        <FileText className="h-2.5 w-2.5" />
                        Regra
                      </Badge>
                    )}
                    {custom && !config.configuracoes?.is_regra && (
                      <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-indigo-500/15 text-indigo-600 gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Personalizada
                      </Badge>
                    )}
                    {customized && (
                      <Badge className="text-[10px] px-1.5 py-0 shrink-0 bg-primary/10 text-primary gap-1">
                        <Settings2 className="h-2.5 w-2.5" />
                        Customizada
                      </Badge>
                    )}
                    {sistema?.obrigatoria && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        Obrigatória
                      </Badge>
                    )}
                    {campos.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {campos.length} campo{campos.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {displayDesc}
                  </p>
                </div>

                {/* Delete (custom only) */}
                {custom && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => { e.stopPropagation(); handleDeleteCustom(config.etapa_codigo); }}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Toggle */}
                <Switch
                  checked={config.ativo}
                  onCheckedChange={() => handleToggle(config.etapa_codigo)}
                />

                {/* Expand trigger */}
                <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <span className="sr-only">Expandir</span>
                </AccordionTrigger>
              </div>

              <AccordionContent className="px-4 pb-4">
                <Separator className="mb-4" />

                {/* Stage settings */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Nome {!custom ? 'Customizado' : ''}
                    </Label>
                    <Input
                      value={(config.configuracoes?.nome_customizado as string) || ''}
                      onChange={e => updateConfig(config.etapa_codigo, { nome_customizado: e.target.value || undefined })}
                      placeholder={sistema?.nome || 'Nome da etapa'}
                      className="h-8 text-sm"
                    />
                    {!custom && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        Vazio = nome padrão "{sistema?.nome}"
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cor
                    </Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(config.configuracoes?.cor_customizada as string) || displayColor}
                        onChange={e => updateConfig(config.etapa_codigo, { cor_customizada: e.target.value })}
                        className="w-8 h-8 rounded border border-border cursor-pointer"
                      />
                      <Input
                        value={(config.configuracoes?.cor_customizada as string) || ''}
                        onChange={e => updateConfig(config.etapa_codigo, { cor_customizada: e.target.value })}
                        placeholder={sistema?.cor || '#666'}
                        className="h-8 text-sm font-mono flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Prazo (dias)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={(config.configuracoes?.prazo_dias as string) || ''}
                      onChange={e => updateConfig(config.etapa_codigo, { prazo_dias: e.target.value || undefined })}
                      placeholder="Ex: 5"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Descrição
                    </Label>
                    <Input
                      value={(config.configuracoes?.descricao_customizada as string) || ''}
                      onChange={e => updateConfig(config.etapa_codigo, { descricao_customizada: e.target.value || undefined })}
                      placeholder={sistema?.descricao || 'Descrição da etapa'}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Form Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <FormInput className="h-3.5 w-3.5 text-primary" />
                        Campos do Formulário
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Defina os campos que serão preenchidos nesta etapa da licitação
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addCampo(config.etapa_codigo)}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar Campo
                    </Button>
                  </div>

                  {campos.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                      <FormInput className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum campo configurado
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-3">
                        Clique em "Adicionar Campo" para criar os campos do formulário desta etapa
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addCampo(config.etapa_codigo)}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar Campo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {campos.map((campo, cIdx) => (
                        <CampoEditor
                          key={campo.id}
                          campo={campo}
                          index={cIdx}
                          totalCampos={campos.length}
                          onUpdate={updated => updateCampo(config.etapa_codigo, campo.id, updated)}
                          onDelete={() => deleteCampo(config.etapa_codigo, campo.id)}
                          onMoveUp={() => moveCampo(config.etapa_codigo, cIdx, 'up')}
                          onMoveDown={() => moveCampo(config.etapa_codigo, cIdx, 'down')}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifications */}
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                    Notificações
                  </p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`notif-inicio-${config.etapa_codigo}`}
                        checked={config.configuracoes?.notificar_inicio !== false}
                        onCheckedChange={v => updateConfig(config.etapa_codigo, { notificar_inicio: !!v })}
                      />
                      <Label htmlFor={`notif-inicio-${config.etapa_codigo}`} className="text-xs">
                        Ao iniciar etapa
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`notif-conclusao-${config.etapa_codigo}`}
                        checked={config.configuracoes?.notificar_conclusao !== false}
                        onCheckedChange={v => updateConfig(config.etapa_codigo, { notificar_conclusao: !!v })}
                      />
                      <Label htmlFor={`notif-conclusao-${config.etapa_codigo}`} className="text-xs">
                        Ao concluir etapa
                      </Label>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* New Custom Stage Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Nova Etapa Personalizada
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome da Etapa *</Label>
              <Input
                value={newEtapaForm.nome}
                onChange={e => setNewEtapaForm({ ...newEtapaForm, nome: e.target.value })}
                placeholder="Ex: Revisão Jurídica, Contrato, Empenho..."
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={newEtapaForm.descricao}
                onChange={e => setNewEtapaForm({ ...newEtapaForm, descricao: e.target.value })}
                placeholder="Descreva o objetivo desta etapa..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newEtapaForm.cor}
                    onChange={e => setNewEtapaForm({ ...newEtapaForm, cor: e.target.value })}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <Input
                    value={newEtapaForm.cor}
                    onChange={e => setNewEtapaForm({ ...newEtapaForm, cor: e.target.value })}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Prazo (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={newEtapaForm.prazo_dias}
                  onChange={e => setNewEtapaForm({ ...newEtapaForm, prazo_dias: e.target.value })}
                  placeholder="Ex: 5"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Após criar, configure os campos do formulário expandindo a etapa.
              Restam {5 - usedCustomSlots} slot(s) disponíveis.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomEtapa}>
              <Plus className="h-4 w-4 mr-1" />
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Regra Dialog */}
      <Dialog open={showRegraDialog} onOpenChange={setShowRegraDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inserir Regra como Etapa
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Selecione uma regra do cliente para inserir como etapa no fluxo da licitação.
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {availableRegras.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todas as regras já foram inseridas ou não há regras cadastradas.
              </p>
            ) : availableRegras.map(regra => (
              <button
                key={regra.id}
                onClick={() => handleInsertRegra(regra.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-colors"
              >
                <p className="text-sm font-medium">{regra.titulo}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{regra.descricao}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{regra.categoria}</Badge>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
