import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, ThumbsUp, ThumbsDown, MessageSquare, Users, Trash2, 
  CheckCircle2, XCircle, Clock, AlertCircle, ArrowDown, ArrowUp,
  Send, UserCheck, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AprovacaoEtapa {
  id: string;
  licitacao_id: string;
  nome_etapa: string;
  descricao: string | null;
  ordem: number;
  aprovador_id: string | null;
  status: string;
  comentario: string | null;
  data_resposta: string | null;
  created_by: string | null;
  created_at: string;
  aprovador?: { id: string; nome: string } | null;
  criador?: { id: string; nome: string } | null;
}

interface Profile {
  id: string;
  nome: string;
}

interface AprovacaoTabProps {
  licitacaoId: string;
}

export function AprovacaoTab({ licitacaoId }: AprovacaoTabProps) {
  const { profile } = useAuth();
  const [etapas, setEtapas] = useState<AprovacaoEtapa[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNovaEtapa, setShowNovaEtapa] = useState(false);
  const [showResponder, setShowResponder] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<AprovacaoEtapa | null>(null);
  const [comentarioResposta, setComentarioResposta] = useState('');
  const [formData, setFormData] = useState({
    nome_etapa: '',
    descricao: '',
    aprovador_id: '',
  });

  useEffect(() => {
    fetchEtapas();
    fetchProfiles();
  }, [licitacaoId]);

  const fetchEtapas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .order('ordem', { ascending: true });

    if (!error && data) {
      // If no steps exist, try to auto-populate from client config
      if (data.length === 0 && profile?.cliente_id) {
        await autoPopulateFromConfig();
        return; // fetchEtapas will be called again after populate
      }

      // Fetch approver and creator names
      const userIds = new Set<string>();
      data.forEach(e => {
        if (e.aprovador_id) userIds.add(e.aprovador_id);
        if (e.created_by) userIds.add(e.created_by);
      });

      let profilesMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', Array.from(userIds));
        if (profs) {
          profs.forEach(p => { profilesMap[p.id] = p.nome || 'Usuário'; });
        }
      }

      const enriched: AprovacaoEtapa[] = data.map(e => ({
        ...e,
        aprovador: e.aprovador_id ? { id: e.aprovador_id, nome: profilesMap[e.aprovador_id] || 'Usuário' } : null,
        criador: e.created_by ? { id: e.created_by, nome: profilesMap[e.created_by] || 'Usuário' } : null,
      }));
      setEtapas(enriched);
    }
    setLoading(false);
  };

  const autoPopulateFromConfig = async () => {
    if (!profile?.cliente_id) return;

    const { data: configEtapas } = await supabase
      .from('cliente_aprovacao_config')
      .select('*')
      .eq('cliente_id', profile.cliente_id)
      .eq('ativo', true)
      .order('ordem', { ascending: true });

    if (configEtapas && configEtapas.length > 0) {
      const inserts = configEtapas.map(ce => ({
        licitacao_id: licitacaoId,
        nome_etapa: ce.nome_etapa,
        descricao: ce.descricao,
        ordem: ce.ordem,
        aprovador_id: ce.aprovador_id,
        status: 'pendente',
        created_by: profile.id,
      }));

      await supabase.from('licitacao_fluxo_aprovacao').insert(inserts);
      toast.info('Fluxo de aprovação padrão aplicado automaticamente');
    }

    // Re-fetch to display populated data
    const { data } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .order('ordem', { ascending: true });

    if (data) {
      const userIds = new Set<string>();
      data.forEach(e => {
        if (e.aprovador_id) userIds.add(e.aprovador_id);
        if (e.created_by) userIds.add(e.created_by);
      });
      let profilesMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, nome').in('id', Array.from(userIds));
        if (profs) profs.forEach(p => { profilesMap[p.id] = p.nome || 'Usuário'; });
      }
      setEtapas(data.map(e => ({
        ...e,
        aprovador: e.aprovador_id ? { id: e.aprovador_id, nome: profilesMap[e.aprovador_id] || 'Usuário' } : null,
        criador: e.created_by ? { id: e.created_by, nome: profilesMap[e.created_by] || 'Usuário' } : null,
      })));
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    if (!profile?.cliente_id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('cliente_id', profile.cliente_id)
      .eq('ativo', true);
    if (data) setProfiles(data);
  };

  const handleCriarEtapa = async () => {
    if (!formData.nome_etapa.trim()) {
      toast.error('Informe o nome da etapa');
      return;
    }
    if (!formData.aprovador_id) {
      toast.error('Selecione um aprovador');
      return;
    }

    const novaOrdem = etapas.length;
    const { error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .insert({
        licitacao_id: licitacaoId,
        nome_etapa: formData.nome_etapa.trim(),
        descricao: formData.descricao.trim() || null,
        ordem: novaOrdem,
        aprovador_id: formData.aprovador_id,
        created_by: profile?.id,
        status: 'pendente',
      });

    if (error) {
      toast.error('Erro ao criar etapa');
      return;
    }

    toast.success('Etapa de aprovação criada!');
    setShowNovaEtapa(false);
    setFormData({ nome_etapa: '', descricao: '', aprovador_id: '' });
    fetchEtapas();
  };

  const handleExcluir = async (id: string) => {
    const { error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .delete()
      .eq('id', id);
    if (!error) {
      toast.success('Etapa removida');
      fetchEtapas();
    }
  };

  const handleResponder = async (aprovado: boolean) => {
    if (!selectedEtapa) return;

    const newStatus = aprovado ? 'aprovado' : 'recusado';
    const { error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .update({
        status: newStatus,
        comentario: comentarioResposta.trim() || null,
        data_resposta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedEtapa.id);

    if (error) {
      toast.error('Erro ao responder');
      return;
    }

    toast.success(aprovado ? 'Aprovado com sucesso!' : 'Recusado');
    setShowResponder(false);
    setComentarioResposta('');
    setSelectedEtapa(null);
    fetchEtapas();
  };

  const handleSolicitarEsclarecimento = async () => {
    if (!selectedEtapa) return;

    const { error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .update({
        status: 'esclarecimento',
        comentario: comentarioResposta.trim() || null,
        data_resposta: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedEtapa.id);

    if (!error) {
      toast.info('Esclarecimento solicitado');
      setShowResponder(false);
      setComentarioResposta('');
      setSelectedEtapa(null);
      fetchEtapas();
    }
  };

  const handleReenviar = async (etapa: AprovacaoEtapa) => {
    const { error } = await supabase
      .from('licitacao_fluxo_aprovacao')
      .update({
        status: 'pendente',
        comentario: null,
        data_resposta: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', etapa.id);

    if (!error) {
      toast.success('Reenviado para aprovação');
      fetchEtapas();
    }
  };

  const handleMover = async (etapa: AprovacaoEtapa, direcao: 'cima' | 'baixo') => {
    const idx = etapas.findIndex(e => e.id === etapa.id);
    const targetIdx = direcao === 'cima' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= etapas.length) return;

    const other = etapas[targetIdx];
    await Promise.all([
      supabase.from('licitacao_fluxo_aprovacao').update({ ordem: targetIdx }).eq('id', etapa.id),
      supabase.from('licitacao_fluxo_aprovacao').update({ ordem: idx }).eq('id', other.id),
    ]);
    fetchEtapas();
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'aprovado': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Aprovado', badgeCls: 'bg-emerald-500/20 text-emerald-700' };
      case 'recusado': return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Recusado', badgeCls: 'bg-destructive/20 text-destructive' };
      case 'esclarecimento': return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Esclarecimento', badgeCls: 'bg-orange-500/20 text-orange-700' };
      default: return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Pendente', badgeCls: 'bg-yellow-500/20 text-yellow-700' };
    }
  };

  const totalEtapas = etapas.length;
  const aprovadas = etapas.filter(e => e.status === 'aprovado').length;
  const recusadas = etapas.filter(e => e.status === 'recusado').length;
  const pendentes = etapas.filter(e => e.status === 'pendente').length;
  const esclarecimentos = etapas.filter(e => e.status === 'esclarecimento').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fluxo de Aprovação</h3>
          <p className="text-sm text-muted-foreground">Gerencie as etapas de aprovação desta licitação</p>
        </div>
        <Button size="sm" onClick={() => setShowNovaEtapa(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      {/* Summary cards */}
      {totalEtapas > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-yellow-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{aprovadas}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-lg font-bold">{recusadas}</p>
                <p className="text-xs text-muted-foreground">Recusadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{esclarecimentos}</p>
                <p className="text-xs text-muted-foreground">Esclarecimento</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress bar */}
      {totalEtapas > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso do fluxo</span>
            <span>{aprovadas}/{totalEtapas} aprovadas</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            {aprovadas > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(aprovadas / totalEtapas) * 100}%` }} />}
            {recusadas > 0 && <div className="bg-destructive transition-all" style={{ width: `${(recusadas / totalEtapas) * 100}%` }} />}
            {esclarecimentos > 0 && <div className="bg-orange-500 transition-all" style={{ width: `${(esclarecimentos / totalEtapas) * 100}%` }} />}
          </div>
        </div>
      )}

      {/* Etapas timeline */}
      {etapas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhuma etapa de aprovação criada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie etapas para definir o fluxo de aprovação desta licitação
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {etapas.map((etapa, idx) => {
            const config = getStatusConfig(etapa.status);
            const StatusIcon = config.icon;
            const isMyApproval = etapa.aprovador_id === profile?.id;
            const canRespond = isMyApproval && (etapa.status === 'pendente' || etapa.status === 'esclarecimento');

            return (
              <Card key={etapa.id} className={`border ${config.bg} transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Step number + icon */}
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          etapa.status === 'aprovado' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-700' :
                          etapa.status === 'recusado' ? 'border-destructive bg-destructive/20 text-destructive' :
                          etapa.status === 'esclarecimento' ? 'border-orange-500 bg-orange-500/20 text-orange-700' :
                          'border-muted-foreground/30 bg-muted text-muted-foreground'
                        }`}>
                          {etapa.status === 'aprovado' ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        {idx < etapas.length - 1 && (
                          <div className="w-0.5 h-4 bg-muted-foreground/20" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold">{etapa.nome_etapa}</h4>
                          <Badge className={config.badgeCls}>{config.label}</Badge>
                        </div>
                        {etapa.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">{etapa.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {etapa.aprovador?.nome || 'Sem aprovador'}
                          </span>
                          {etapa.data_resposta && (
                            <span>
                              Respondido em {new Date(etapa.data_resposta).toLocaleDateString('pt-BR')} às {new Date(etapa.data_resposta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {etapa.comentario && (
                          <div className="mt-2 p-2 bg-background/50 rounded-md border text-xs">
                            <MessageSquare className="h-3 w-3 inline mr-1 text-muted-foreground" />
                            {etapa.comentario}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canRespond && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedEtapa(etapa);
                            setComentarioResposta('');
                            setShowResponder(true);
                          }}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Responder
                        </Button>
                      )}
                      {(etapa.status === 'recusado' || etapa.status === 'esclarecimento') && (
                        <Button size="sm" variant="outline" onClick={() => handleReenviar(etapa)}>
                          Reenviar
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMover(etapa, 'cima')} disabled={idx === 0}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMover(etapa, 'baixo')} disabled={idx === etapas.length - 1}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleExcluir(etapa.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Nova Etapa */}
      <Dialog open={showNovaEtapa} onOpenChange={setShowNovaEtapa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa de Aprovação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Etapa *</Label>
              <Input
                value={formData.nome_etapa}
                onChange={e => setFormData({ ...formData, nome_etapa: e.target.value })}
                placeholder="Ex: Aprovação Gerência Comercial"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o que deve ser aprovado nesta etapa..."
              />
            </div>
            <div>
              <Label>Aprovador *</Label>
              <Select value={formData.aprovador_id} onValueChange={v => setFormData({ ...formData, aprovador_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o aprovador" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovaEtapa(false)}>Cancelar</Button>
            <Button onClick={handleCriarEtapa}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Responder */}
      <Dialog open={showResponder} onOpenChange={setShowResponder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder Aprovação: {selectedEtapa?.nome_etapa}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEtapa?.descricao && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                {selectedEtapa.descricao}
              </div>
            )}
            <div>
              <Label>Comentário (opcional)</Label>
              <Textarea
                value={comentarioResposta}
                onChange={e => setComentarioResposta(e.target.value)}
                placeholder="Adicione um comentário sobre sua decisão..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={handleSolicitarEsclarecimento}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Pedir Esclarecimento
            </Button>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => handleResponder(false)}>
                <ThumbsDown className="h-4 w-4 mr-2" />
                Recusar
              </Button>
              <Button onClick={() => handleResponder(true)}>
                <ThumbsUp className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
