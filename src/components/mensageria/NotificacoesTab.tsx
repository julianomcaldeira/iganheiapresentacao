import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, BellOff, Check, CheckCheck, Plus, Info, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface Notificacao {
  id: string;
  cliente_id: string | null;
  user_id: string | null;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export function NotificacoesTab() {
  const { profile, isAdmin } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas');
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(profile?.cliente_id || null);
  const [novaNotificacao, setNovaNotificacao] = useState({
    titulo: '',
    mensagem: '',
    tipo: 'info' as const,
    link: '',
    cliente_id: ''
  });

  useEffect(() => {
    if (isAdmin && !profile?.cliente_id) {
      fetchClientes();
    }
  }, [isAdmin, profile?.cliente_id]);

  useEffect(() => {
    if (profile?.id) {
      fetchNotificacoes();
    } else {
      setLoading(false);
    }

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notificacoes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes'
        },
        (payload) => {
          const newNotif = payload.new as Notificacao;
          const currentCliente = profile?.cliente_id || selectedClienteId;
          if (newNotif.user_id === profile?.id || (!newNotif.user_id && newNotif.cliente_id === currentCliente)) {
            setNotificacoes(prev => [newNotif, ...prev]);
            toast(newNotif.titulo, {
              description: newNotif.mensagem
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.cliente_id, selectedClienteId]);

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

  const fetchNotificacoes = async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      let query = supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      const currentCliente = profile.cliente_id || selectedClienteId;
      // Filter by user_id or cliente_id
      if (currentCliente) {
        query = query.or(`user_id.eq.${profile.id},and(cliente_id.eq.${currentCliente},user_id.is.null)`);
      } else {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotificacoes(data || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentClienteId = profile?.cliente_id || selectedClienteId;

  const marcarComoLida = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;
      setNotificacoes(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
    } catch (error: any) {
      toast.error('Erro ao marcar como lida: ' + error.message);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const naoLidas = notificacoes.filter(n => !n.lida).map(n => n.id);
      if (naoLidas.length === 0) return;

      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .in('id', naoLidas);

      if (error) throw error;
      setNotificacoes(prev =>
        prev.map(n => ({ ...n, lida: true }))
      );
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error: any) {
      toast.error('Erro ao marcar notificações: ' + error.message);
    }
  };

  const criarNotificacao = async () => {
    const clienteParaNotificar = novaNotificacao.cliente_id || currentClienteId;
    if (!clienteParaNotificar || !novaNotificacao.titulo.trim()) {
      toast.error('Selecione um cliente e preencha o título');
      return;
    }

    try {
      const { error } = await supabase
        .from('notificacoes')
        .insert({
          cliente_id: clienteParaNotificar,
          titulo: novaNotificacao.titulo,
          mensagem: novaNotificacao.mensagem,
          tipo: novaNotificacao.tipo,
          link: novaNotificacao.link || null
        });

      if (error) throw error;

      toast.success('Notificação criada para todos os usuários do cliente');
      setShowNova(false);
      setNovaNotificacao({ titulo: '', mensagem: '', tipo: 'info', link: '', cliente_id: '' });
    } catch (error: any) {
      toast.error('Erro ao criar notificação: ' + error.message);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'alerta':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'sucesso':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'erro':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      info: 'default',
      alerta: 'secondary',
      sucesso: 'outline',
      erro: 'destructive'
    };
    const labels: Record<string, string> = {
      info: 'Informação',
      alerta: 'Alerta',
      sucesso: 'Sucesso',
      erro: 'Erro'
    };
    return <Badge variant={variants[tipo] || 'default'}>{labels[tipo] || tipo}</Badge>;
  };

  const filteredNotificacoes = filter === 'nao_lidas'
    ? notificacoes.filter(n => !n.lida)
    : notificacoes;

  const naoLidasCount = notificacoes.filter(n => !n.lida).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Notificações</CardTitle>
            {naoLidasCount > 0 && (
              <Badge variant="destructive">{naoLidasCount} não lidas</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nao_lidas">Não lidas</SelectItem>
              </SelectContent>
            </Select>
            {naoLidasCount > 0 && (
              <Button variant="outline" size="sm" onClick={marcarTodasComoLidas}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas
              </Button>
            )}
            {isAdmin && (
              <Dialog open={showNova} onOpenChange={setShowNova}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Notificação</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {isAdmin && clientes.length > 0 && (
                      <div>
                        <Label>Cliente *</Label>
                        <Select
                          value={novaNotificacao.cliente_id || selectedClienteId || ''}
                          onValueChange={(value) => setNovaNotificacao(prev => ({ ...prev, cliente_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map(cliente => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Título *</Label>
                      <Input
                        value={novaNotificacao.titulo}
                        onChange={(e) => setNovaNotificacao(prev => ({ ...prev, titulo: e.target.value }))}
                        placeholder="Título da notificação"
                      />
                    </div>
                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        value={novaNotificacao.mensagem}
                        onChange={(e) => setNovaNotificacao(prev => ({ ...prev, mensagem: e.target.value }))}
                        placeholder="Mensagem da notificação"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={novaNotificacao.tipo}
                        onValueChange={(value: any) => setNovaNotificacao(prev => ({ ...prev, tipo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Informação</SelectItem>
                          <SelectItem value="alerta">Alerta</SelectItem>
                          <SelectItem value="sucesso">Sucesso</SelectItem>
                          <SelectItem value="erro">Erro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Link (opcional)</Label>
                      <Input
                        value={novaNotificacao.link}
                        onChange={(e) => setNovaNotificacao(prev => ({ ...prev, link: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <Button onClick={criarNotificacao} className="w-full">
                      Criar Notificação
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredNotificacoes.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                notif.lida ? 'bg-background' : 'bg-muted/50 border-primary/20'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getTipoIcon(notif.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${!notif.lida ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {notif.titulo}
                  </h4>
                  {getTipoBadge(notif.tipo)}
                </div>
                <p className="text-sm text-muted-foreground">{notif.mensagem}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(notif.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                  {notif.link && (
                    <a
                      href={notif.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Ver mais <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {!notif.lida && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => marcarComoLida(notif.id)}
                  className="flex-shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {filteredNotificacoes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação encontrada</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
