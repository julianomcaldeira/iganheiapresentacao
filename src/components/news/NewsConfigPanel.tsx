import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2, Play, Building2, ChevronDown, ChevronRight, Edit, CheckCircle2, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const TIPO_EVENTO_OPTIONS = ['trabalhista','operacional','regulatorio','financeiro','oportunidade'];

interface EmpresaConfig {
  id?: string;
  empresa_id: string;
  palavras_chave: string[];
  tipos_evento: string[];
  cnaes_prioritarios: string[];
  ufs_monitoradas: string[];
  ativo: boolean;
  empresa_nome?: string;
}

export function NewsConfigPanel() {
  const { profile, isAdmin } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [configs, setConfigs] = useState<EmpresaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<EmpresaConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCnae, setNewCnae] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedNewEmpresaId, setSelectedNewEmpresaId] = useState('');

  // Load clientes list for admins
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (data) {
        setClientes(data);
        if (data.length > 0 && !selectedClienteId) {
          setSelectedClienteId(data[0].id);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.cliente_id, selectedClienteId, isAdmin]);

  const activeClienteId = isAdmin ? selectedClienteId : profile?.cliente_id;

  const fetchData = async () => {
    setLoading(true);

    // Admin sem cliente selecionado ainda — limpa
    if (isAdmin && !selectedClienteId) {
      setEmpresas([]);
      setConfigs([]);
      setLoading(false);
      return;
    }

    // Fetch empresas — sempre filtradas pelo cliente ativo
    let empQuery = supabase.from('empresas').select('id, razao_social, nome_fantasia, cliente_id').eq('ativo', true).order('razao_social');
    if (activeClienteId) empQuery = empQuery.eq('cliente_id', activeClienteId);
    const { data: empData } = await empQuery;
    setEmpresas(empData || []);

    // Fetch configs apenas das empresas desse cliente
    const empIds = (empData || []).map((e: any) => e.id);
    let cfgData: any[] = [];
    if (empIds.length > 0) {
      const { data } = await supabase
        .from('empresa_news_config')
        .select('*, empresa:empresas(razao_social, nome_fantasia)')
        .in('empresa_id', empIds);
      cfgData = data || [];
    }

    const mappedConfigs: EmpresaConfig[] = (cfgData || []).map((c: any) => ({
      id: c.id,
      empresa_id: c.empresa_id,
      palavras_chave: c.palavras_chave || [],
      tipos_evento: c.tipos_evento || TIPO_EVENTO_OPTIONS,
      cnaes_prioritarios: c.cnaes_prioritarios || [],
      ufs_monitoradas: c.ufs_monitoradas || [],
      ativo: c.ativo,
      empresa_nome: c.empresa?.nome_fantasia || c.empresa?.razao_social || 'Empresa',
    }));

    setConfigs(mappedConfigs);
    setLoading(false);
  };

  const getEmpresaName = (id: string) => {
    const emp = empresas.find(e => e.id === id);
    return emp?.nome_fantasia || emp?.razao_social || 'Empresa';
  };

  const unconfiguredEmpresas = empresas.filter(e => !configs.find(c => c.empresa_id === e.id));

  const startEdit = (config: EmpresaConfig) => {
    setEditingConfig({ ...config });
    setExpandedId(config.empresa_id);
    setShowNewForm(false);
  };

  const startNew = () => {
    if (isAdmin && !selectedClienteId) {
      toast.info('Selecione um cliente para criar a configuração');
      return;
    }

    if (empresas.length === 0) {
      toast.info('Este cliente não possui empresas cadastradas. Cadastre uma empresa antes de configurar o monitoramento.');
      return;
    }

    if (unconfiguredEmpresas.length === 0) {
      toast.info('Todas as empresas deste cliente já estão configuradas');
      return;
    }

    setSelectedNewEmpresaId(unconfiguredEmpresas[0].id);
    setEditingConfig({
      empresa_id: unconfiguredEmpresas[0].id,
      palavras_chave: [],
      tipos_evento: [...TIPO_EVENTO_OPTIONS],
      cnaes_prioritarios: [],
      ufs_monitoradas: [],
      ativo: true,
    });
    setShowNewForm(true);
    setExpandedId(null);
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    setSaving(true);
    try {
      const empresaId = showNewForm ? selectedNewEmpresaId : editingConfig.empresa_id;
      const payload = {
        empresa_id: empresaId,
        palavras_chave: editingConfig.palavras_chave,
        tipos_evento: editingConfig.tipos_evento,
        cnaes_prioritarios: editingConfig.cnaes_prioritarios,
        ufs_monitoradas: editingConfig.ufs_monitoradas,
        ativo: editingConfig.ativo,
      };

      if (editingConfig.id) {
        await supabase.from('empresa_news_config').update(payload).eq('id', editingConfig.id);
      } else {
        await supabase.from('empresa_news_config').insert(payload);
      }

      toast.success('Configuração salva!');
      setEditingConfig(null);
      setExpandedId(null);
      setShowNewForm(false);
      await fetchData();
    } catch (e) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (empresaId: string) => {
    setRunning(empresaId);
    try {
      const { data, error } = await supabase.functions.invoke('news-intelligence', {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      toast.success(`Coleta concluída! ${data?.results?.[0]?.new_events || 0} novas notícias.`);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setRunning(null);
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || !editingConfig) return;
    setEditingConfig({ ...editingConfig, palavras_chave: [...editingConfig.palavras_chave, newKeyword.trim()] });
    setNewKeyword('');
  };

  const removeKeyword = (idx: number) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, palavras_chave: editingConfig.palavras_chave.filter((_, i) => i !== idx) });
  };

  const addCnae = () => {
    if (!newCnae.trim() || !editingConfig) return;
    setEditingConfig({ ...editingConfig, cnaes_prioritarios: [...editingConfig.cnaes_prioritarios, newCnae.trim()] });
    setNewCnae('');
  };

  const removeCnae = (idx: number) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, cnaes_prioritarios: editingConfig.cnaes_prioritarios.filter((_, i) => i !== idx) });
  };

  const toggleUf = (uf: string) => {
    if (!editingConfig) return;
    const current = editingConfig.ufs_monitoradas;
    const updated = current.includes(uf) ? current.filter(u => u !== uf) : [...current, uf];
    setEditingConfig({ ...editingConfig, ufs_monitoradas: updated });
  };

  const toggleTipoEvento = (tipo: string) => {
    if (!editingConfig) return;
    const current = editingConfig.tipos_evento;
    const updated = current.includes(tipo) ? current.filter(t => t !== tipo) : [...current, tipo];
    setEditingConfig({ ...editingConfig, tipos_evento: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderForm = () => {
    if (!editingConfig) return null;
    return (
      <div className="space-y-5 pt-4 border-t border-border mt-4">
        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <Switch checked={editingConfig.ativo} onCheckedChange={(v) => setEditingConfig({ ...editingConfig, ativo: v })} />
          <Label>Monitoramento Ativo</Label>
        </div>

        {/* Keywords */}
        <div>
          <Label className="mb-2 block">Palavras-chave</Label>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Ex: acidente trabalho industrial" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKeyword()} />
            <Button variant="outline" size="icon" onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingConfig.palavras_chave.map((kw, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                {kw}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeKeyword(idx)} />
              </Badge>
            ))}
            {editingConfig.palavras_chave.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma — serão usadas palavras-chave padrão</p>
            )}
          </div>
        </div>

        {/* UFs */}
        <div>
          <Label className="mb-2 block">UFs Monitoradas</Label>
          <div className="flex flex-wrap gap-1.5">
            {UF_OPTIONS.map(uf => (
              <Badge
                key={uf}
                variant={editingConfig.ufs_monitoradas.includes(uf) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleUf(uf)}
              >
                {uf}
              </Badge>
            ))}
          </div>
          {editingConfig.ufs_monitoradas.length === 0 && (
            <p className="text-sm text-muted-foreground mt-1">Nenhuma selecionada — buscará em todo o Brasil</p>
          )}
        </div>

        {/* Tipos de Evento */}
        <div>
          <Label className="mb-2 block">Tipos de Evento</Label>
          <div className="flex flex-wrap gap-2">
            {TIPO_EVENTO_OPTIONS.map(tipo => (
              <Badge
                key={tipo}
                variant={editingConfig.tipos_evento.includes(tipo) ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => toggleTipoEvento(tipo)}
              >
                {tipo}
              </Badge>
            ))}
          </div>
        </div>

        {/* CNAEs */}
        <div>
          <Label className="mb-2 block">CNAEs Prioritários</Label>
          <div className="flex gap-2 mb-2">
            <Input placeholder="Ex: 4120400" value={newCnae} onChange={(e) => setNewCnae(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCnae()} />
            <Button variant="outline" size="icon" onClick={addCnae}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {editingConfig.cnaes_prioritarios.map((cnae, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                {cnae}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeCnae(idx)} />
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
          <Button variant="outline" onClick={() => { setEditingConfig(null); setExpandedId(null); setShowNewForm(false); }}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configurações de Monitoramento
          </h3>
          <p className="text-sm text-muted-foreground">Gerencie o monitoramento de notícias por empresa</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select
              value={selectedClienteId ?? undefined}
              onValueChange={(v) => {
                setSelectedClienteId(v);
                setEditingConfig(null);
                setExpandedId(null);
                setShowNewForm(false);
              }}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={startNew}
            disabled={isAdmin && !selectedClienteId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </Button>
        </div>
      </div>

      {isAdmin && !selectedClienteId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Selecione um cliente acima para visualizar e configurar o monitoramento de suas empresas.
          </CardContent>
        </Card>
      )}
      {isAdmin && selectedClienteId && empresas.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Este cliente não possui empresas cadastradas. Cadastre uma empresa antes de configurar o monitoramento.
          </CardContent>
        </Card>
      )}

      {/* New config form */}
      {showNewForm && editingConfig && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nova Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label>Empresa</Label>
              <Select
                value={selectedNewEmpresaId}
                onValueChange={(v) => {
                  setSelectedNewEmpresaId(v);
                  setEditingConfig({ ...editingConfig, empresa_id: v });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                <SelectContent>
                  {unconfiguredEmpresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderForm()}
          </CardContent>
        </Card>
      )}

      {/* Existing configs as collapsible cards */}
      {configs.length === 0 && !showNewForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma empresa configurada ainda.</p>
            <p className="text-sm">Clique em "Nova Configuração" para começar.</p>
          </CardContent>
        </Card>
      )}

      {configs.map((config) => {
        const isExpanded = expandedId === config.empresa_id && editingConfig?.empresa_id === config.empresa_id;

        return (
          <Card key={config.empresa_id} className={cn("transition-all", isExpanded && "border-primary/30")}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 rounded-t-lg"
              onClick={() => {
                if (isExpanded) {
                  setExpandedId(null);
                  setEditingConfig(null);
                } else {
                  startEdit(config);
                }
              }}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{config.empresa_nome}</span>
                <Badge variant={config.ativo ? 'default' : 'secondary'} className="text-[10px]">
                  {config.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {/* Summary badges */}
                <span className="text-xs text-muted-foreground hidden md:inline">
                  {config.palavras_chave.length} palavras · {config.ufs_monitoradas.length} UFs
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    runNow(config.empresa_id);
                  }}
                  disabled={running === config.empresa_id || !config.id}
                >
                  {running === config.empresa_id ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  Coletar
                </Button>
              </div>
            </div>

            {/* Expanded edit form */}
            {isExpanded && editingConfig && (
              <CardContent className="pt-0">
                {renderForm()}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
