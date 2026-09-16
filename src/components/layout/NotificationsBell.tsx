import { Bell, Check, CheckCheck, AlertTriangle, Info, CircleAlert, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'sucesso' | 'erro';
  link: string | null;
  lida: boolean;
  created_at: string;
}

const tipoIcon = {
  info: { icon: Info, color: 'text-blue-500' },
  alerta: { icon: AlertTriangle, color: 'text-amber-500' },
  sucesso: { icon: CircleCheck, color: 'text-emerald-500' },
  erro: { icon: CircleAlert, color: 'text-destructive' },
};

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notificacoes')
      .select('id, titulo, mensagem, tipo, link, lida, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error && data) setItems(data as Notificacao[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notificacoes-bell')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${user.id}` },
        () => fetchItems()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchItems]);

  const naoLidas = items.filter((i) => !i.lida).length;

  const marcarLida = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, lida: true } : i)));
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  };

  const marcarTodasLidas = async () => {
    if (!user) return;
    setItems((prev) => prev.map((i) => ({ ...i, lida: true })));
    await supabase.from('notificacoes').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
    toast.success('Todas as notificações foram marcadas como lidas');
  };

  const handleClick = async (n: Notificacao) => {
    if (!n.lida) await marcarLida(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="w-5 h-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {naoLidas > 0 && (
              <Badge variant="secondary" className="h-5">
                {naoLidas} nova{naoLidas > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" onClick={marcarTodasLidas} className="h-7 text-xs gap-1">
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[480px]">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma notificação
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const cfg = tipoIcon[n.tipo] ?? tipoIcon.info;
                const Icon = cfg.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 group',
                        !n.lida && 'bg-primary/5'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm leading-tight', !n.lida && 'font-semibold')}>
                            {n.titulo}
                          </p>
                          {!n.lida && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.mensagem}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!n.lida && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarLida(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
