import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowUp, ArrowDown, UserCheck, GripVertical, Pencil, Loader2, ShieldCheck, Paperclip, Eye, X, Mail, Building2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FilePreview } from '@/components/ui/file-preview';

interface AprovacaoConfig {
  id: string;
  cliente_id: string;
  nome_etapa: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  area: string | null;
  anexo_url: string | null;
  anexo_nome: string | null;
  aprovadores_ids: string[];
  emails_area: string[];
  aprovadores_nomes?: string[];
}

interface Profile {
  id: string;
  nome: string;
}

interface AprovacaoConfigManagerProps {
  clienteId: string;
}

interface FormData {
  nome_etapa: string;
  descricao: string;
  aprovadores_ids: string[];
  area: string;
  emails_area: string[];
  anexo_url: string;
  anexo_nome: string;
}

const INITIAL_FORM: FormData = {
  nome_etapa: '',
  descricao: '',
  aprovadores_ids: [],
  area: '',
  emails_area: [],
  anexo_url: '',
  anexo_nome: '',
};

export function AprovacaoConfigManager({ clienteId }: AprovacaoConfigManagerProps) {
  const [etapas, setEtapas] = useState<AprovacaoConfig[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEtapas();
    fetchProfiles();
  }, [clienteId]);

  const fetchEtapas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cliente_aprovacao_config')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('ordem', { ascending: true });

    if (!error && data) {
      // Collect all approver IDs from all etapas
      const allIds = new Set<string>();
      data.forEach(e => {
        const ids = (e as any).aprovadores_ids as string[] | null;
        if (ids) ids.forEach(id => allIds.add(id));
        // fallback to old single field
        if (e.aprovador_id && (!ids || ids.length === 0)) allIds.add(e.aprovador_id);
      });

      let namesMap: Record<string, string> = {};
      if (allIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', Array.from(allIds));
        if (profs) profs.forEach(p => { namesMap[p.id] = p.nome || 'Usuário'; });
      }

      setEtapas(data.map(e => {
        const ids = ((e as any).aprovadores_ids as string[] | null) || [];
        const emailsArr = ((e as any).emails_area as string[] | null) || [];
        // fallback
        const finalIds = ids.length > 0 ? ids : (e.aprovador_id ? [e.aprovador_id] : []);
        const finalEmails = emailsArr.length > 0 ? emailsArr : (e.email_area ? [e.email_area] : []);
        return {
          id: e.id,
          cliente_id: e.cliente_id,
          nome_etapa: e.nome_etapa,
          descricao: e.descricao,
          ordem: e.ordem,
          ativo: e.ativo,
          area: e.area,
          anexo_url: e.anexo_url,
          anexo_nome: e.anexo_nome,
          aprovadores_ids: finalIds,
          emails_area: finalEmails,
          aprovadores_nomes: finalIds.map(id => namesMap[id] || 'Usuário'),
        };
      }));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('cliente_id', clienteId)
      .eq('ativo', true);
    if (data) setProfiles(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Arquivo deve ter no máximo 10MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${clienteId}/aprovacoes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('workflow-files').upload(path, file);
    if (error) { toast.error('Erro ao enviar arquivo'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('workflow-files').getPublicUrl(path);
    setFormData(prev => ({ ...prev, anexo_url: urlData.publicUrl, anexo_nome: file.name }));
    setUploading(false);
    toast.success('Arquivo enviado!');
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, anexo_url: '', anexo_nome: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddEmail = () => {
    const email = newEmail.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('E-mail inválido'); return; }
    if (formData.emails_area.includes(email)) { toast.error('E-mail já adicionado'); return; }
    setFormData(prev => ({ ...prev, emails_area: [...prev.emails_area, email] }));
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setFormData(prev => ({ ...prev, emails_area: prev.emails_area.filter(e => e !== email) }));
  };

  const handleToggleAprovador = (profileId: string) => {
    setFormData(prev => {
      const exists = prev.aprovadores_ids.includes(profileId);
      return {
        ...prev,
        aprovadores_ids: exists
          ? prev.aprovadores_ids.filter(id => id !== profileId)
          : [...prev.aprovadores_ids, profileId],
      };
    });
  };

  const handleSave = async () => {
    if (!formData.nome_etapa.trim()) { toast.error('Informe o nome da etapa'); return; }
    if (formData.aprovadores_ids.length === 0) { toast.error('Selecione ao menos um aprovador'); return; }

    const payload = {
      nome_etapa: formData.nome_etapa.trim(),
      descricao: formData.descricao.trim() || null,
      aprovadores_ids: formData.aprovadores_ids,
      aprovador_id: formData.aprovadores_ids[0] || null,
      area: formData.area.trim() || null,
      emails_area: formData.emails_area,
      email_area: formData.emails_area[0] || null,
      anexo_url: formData.anexo_url || null,
      anexo_nome: formData.anexo_nome || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from('cliente_aprovacao_config').update(payload).eq('id', editingId);
      if (error) { toast.error('Erro ao salvar'); return; }
      toast.success('Etapa atualizada!');
    } else {
      const { error } = await supabase.from('cliente_aprovacao_config').insert({
        ...payload,
        cliente_id: clienteId,
        ordem: etapas.length,
      });
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Etapa criada!');
    }
    resetForm();
    fetchEtapas();
  };

  const handleEdit = (etapa: AprovacaoConfig) => {
    setEditingId(etapa.id);
    setFormData({
      nome_etapa: etapa.nome_etapa,
      descricao: etapa.descricao || '',
      aprovadores_ids: etapa.aprovadores_ids,
      area: etapa.area || '',
      emails_area: etapa.emails_area,
      anexo_url: etapa.anexo_url || '',
      anexo_nome: etapa.anexo_nome || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('cliente_aprovacao_config').delete().eq('id', id);
    if (!error) { toast.success('Etapa removida'); fetchEtapas(); }
  };

  const handleToggleAtivo = async (etapa: AprovacaoConfig) => {
    await supabase.from('cliente_aprovacao_config').update({ ativo: !etapa.ativo, updated_at: new Date().toISOString() }).eq('id', etapa.id);
    fetchEtapas();
  };

  const handleMover = async (etapa: AprovacaoConfig, direcao: 'cima' | 'baixo') => {
    const idx = etapas.findIndex(e => e.id === etapa.id);
    const targetIdx = direcao === 'cima' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= etapas.length) return;
    const other = etapas[targetIdx];
    await Promise.all([
      supabase.from('cliente_aprovacao_config').update({ ordem: targetIdx }).eq('id', etapa.id),
      supabase.from('cliente_aprovacao_config').update({ ordem: idx }).eq('id', other.id),
    ]);
    fetchEtapas();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setPreviewUrl(null);
    setNewEmail('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Fluxo de Aprovação Padrão
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Etapas aplicadas automaticamente a cada nova licitação
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Etapa
        </Button>
      </div>

      {etapas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma etapa de aprovação configurada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {etapas.map((etapa, idx) => (
            <Card key={etapa.id} className={!etapa.ativo ? 'opacity-50' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{etapa.nome_etapa}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {etapa.aprovadores_nomes && etapa.aprovadores_nomes.length > 0
                        ? etapa.aprovadores_nomes.join(', ')
                        : 'Sem aprovadores'}
                    </span>
                    {etapa.area && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        <Building2 className="h-2.5 w-2.5 mr-0.5" />
                        {etapa.area}
                      </Badge>
                    )}
                    {etapa.emails_area.length > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Mail className="h-2.5 w-2.5" />
                        {etapa.emails_area.length} email(s)
                      </span>
                    )}
                    {etapa.anexo_nome && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                        {etapa.anexo_nome}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {etapa.anexo_url && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewUrl(etapa.anexo_url)} title="Visualizar anexo">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Switch checked={etapa.ativo} onCheckedChange={() => handleToggleAtivo(etapa)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(etapa)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMover(etapa, 'cima')} disabled={idx === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMover(etapa, 'baixo')} disabled={idx === etapas.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(etapa.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Etapa' : 'Nova Etapa de Aprovação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Nome da Etapa *</Label>
              <Input
                value={formData.nome_etapa}
                onChange={e => setFormData({ ...formData, nome_etapa: e.target.value })}
                placeholder="Ex: Aprovação Diretoria"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o que será aprovado..."
                rows={2}
              />
            </div>
            <div>
              <Label>Área</Label>
              <Input
                value={formData.area}
                onChange={e => setFormData({ ...formData, area: e.target.value })}
                placeholder="Ex: Jurídico, Diretoria"
              />
            </div>

            {/* Multiple Approvers */}
            <div>
              <Label className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Aprovadores *
              </Label>
              <p className="text-[10px] text-muted-foreground mb-2">Selecione os usuários que poderão aprovar esta etapa</p>
              <div className="border rounded-md p-2 max-h-[140px] overflow-y-auto space-y-1">
                {profiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum usuário encontrado</p>
                ) : (
                  profiles.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={formData.aprovadores_ids.includes(p.id)}
                        onCheckedChange={() => handleToggleAprovador(p.id)}
                      />
                      <span className="text-sm">{p.nome}</span>
                    </label>
                  ))
                )}
              </div>
              {formData.aprovadores_ids.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.aprovadores_ids.map(id => {
                    const prof = profiles.find(p => p.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs gap-1">
                        <UserCheck className="h-3 w-3" />
                        {prof?.nome || 'Usuário'}
                        <button onClick={() => handleToggleAprovador(id)} className="ml-0.5 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Multiple Emails */}
            <div>
              <Label className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                E-mails de Notificação
              </Label>
              <p className="text-[10px] text-muted-foreground mb-2">Todos os e-mails listados receberão notificação de aprovação</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddEmail(); } }}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.emails_area.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.emails_area.map(email => (
                    <Badge key={email} variant="outline" className="text-xs gap-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button onClick={() => handleRemoveEmail(email)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Anexo */}
            <div>
              <Label>Anexo</Label>
              {formData.anexo_url ? (
                <div className="mt-1">
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{formData.anexo_nome}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewUrl(formData.anexo_url)} title="Visualizar">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleRemoveFile} title="Remover">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
                    {uploading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enviando...</> : <><Paperclip className="h-4 w-4 mr-1" /> Selecionar arquivo</>}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF, DOC, XLS, imagens — máx 10MB</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Criar Etapa'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Visualização do Anexo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="w-full h-[60vh]">
              <FilePreview url={previewUrl} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
