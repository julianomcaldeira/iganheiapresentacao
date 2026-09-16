import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2, Radio, MessageSquare, Gavel, User, Bot, Calendar,
  Download, ArrowDownCircle, FileText, FileSpreadsheet, FileType,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { exportReport } from '@/lib/exportUtils';

interface Mensagem {
  id: string;
  licitacao_id: string;
  autor_tipo: string;
  autor_nome: string | null;
  mensagem: string;
  data_mensagem: string;
  origem: string;
}

interface Props {
  licitacaoId: string;
  licitacaoNumero?: string;
}

function dateLabel(d: Date): string {
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

const AUTOR_INFO: Record<string, { label: string; Icon: typeof User; color: string; bg: string }> = {
  pregoeiro: { label: 'Pregoeiro',  Icon: Gavel,          color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-500/10 border-purple-500/30' },
  sistema:   { label: 'Sistema',    Icon: Bot,            color: 'text-slate-600 dark:text-slate-300',   bg: 'bg-muted/60 border-border' },
  licitante: { label: 'Licitante',  Icon: User,           color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
};

export function LicitacaoMonitoramento({ licitacaoId, licitacaoNumero }: Props) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const { data: mensagens, isLoading } = useQuery({
    queryKey: ['licitacao-monitoramento', licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licitacao_monitoramento_mensagens')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('data_mensagem', { ascending: true });
      if (error) throw error;
      return (data || []) as Mensagem[];
    },
  });

  // Realtime: novas mensagens chegam automaticamente
  useEffect(() => {
    const channel = supabase
      .channel(`monitoramento-${licitacaoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'licitacao_monitoramento_mensagens',
          filter: `licitacao_id=eq.${licitacaoId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['licitacao-monitoramento', licitacaoId] });
          if (!autoScroll) setNewCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [licitacaoId, queryClient, autoScroll]);

  // Auto-scroll para o fim quando chegar nova mensagem (se habilitado)
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setNewCount(0);
    }
  }, [mensagens?.length, autoScroll]);

  // Detecta scroll manual do usuário para pausar/retomar auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 60;
    if (atBottom && !autoScroll) {
      setAutoScroll(true);
      setNewCount(0);
    } else if (!atBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setAutoScroll(true);
    setNewCount(0);
  };

  const handleExport = (fmt: 'pdf' | 'excel' | 'csv') => {
    if (!mensagens || mensagens.length === 0) {
      toast.warning('Nenhuma mensagem para exportar');
      return;
    }
    const filename = `monitoramento-pregao-${licitacaoNumero || licitacaoId.slice(0, 8)}-${format(new Date(), 'yyyyMMdd-HHmm')}`;
    const data = mensagens.map((m) => ({
      data: format(new Date(m.data_mensagem), 'dd/MM/yyyy HH:mm:ss'),
      autor_tipo: AUTOR_INFO[m.autor_tipo]?.label || m.autor_tipo,
      autor_nome: m.autor_nome || '-',
      mensagem: m.mensagem,
      origem: m.origem,
    }));
    exportReport(fmt, {
      filename,
      title: `Monitoramento do Pregão${licitacaoNumero ? ` — ${licitacaoNumero}` : ''}`,
      columns: [
        { key: 'data', label: 'Data/Hora' },
        { key: 'autor_tipo', label: 'Autor' },
        { key: 'autor_nome', label: 'Identificação' },
        { key: 'mensagem', label: 'Mensagem' },
        { key: 'origem', label: 'Origem' },
      ],
      data,
    });
    toast.success(`Relatório ${fmt.toUpperCase()} gerado com sucesso`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!mensagens || mensagens.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center text-muted-foreground text-sm">
          <Radio className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground/80">Sem monitoramento ativo</p>
          <p className="text-xs mt-1">Esta licitação ainda não possui mensagens do chat do pregão capturadas.</p>
        </CardContent>
      </Card>
    );
  }

  // group by date
  const groups: Record<string, Mensagem[]> = {};
  for (const m of mensagens) {
    const k = format(new Date(m.data_mensagem), 'yyyy-MM-dd');
    (groups[k] ||= []).push(m);
  }
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-4">
      {/* Topbar: resumo + ações */}
      <div className="flex items-center gap-3 flex-wrap">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 flex-1 min-w-[180px]">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">{mensagens.length}</div>
              <div className="text-[11px] text-muted-foreground mt-1">mensagens capturadas</div>
            </div>
          </CardContent>
        </Card>
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium">Tempo real</span>
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Exportar relatório
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              <FileType className="h-4 w-4 mr-2 text-red-500" /> PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileText className="h-4 w-4 mr-2 text-blue-500" /> CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Feed com scroll */}
      <Card className="relative overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[55vh] overflow-y-auto p-5"
        >
          <div className="space-y-6">
            {groupKeys.map((k) => {
              const groupDate = new Date(k + 'T00:00:00');
              const items = groups[k];
              return (
                <div key={k}>
                  <div className="flex items-center gap-3 mb-3 sticky top-0 bg-card/95 backdrop-blur-sm py-1 z-10">
                    <Badge variant="outline" className="text-xs font-medium gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {dateLabel(groupDate)}
                    </Badge>
                    <Separator className="flex-1" />
                    <span className="text-[11px] text-muted-foreground">{items.length} mensagem(ns)</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((m) => {
                      const info = AUTOR_INFO[m.autor_tipo] || AUTOR_INFO.sistema;
                      const Icon = info.Icon;
                      const time = format(new Date(m.data_mensagem), "HH:mm:ss", { locale: ptBR });
                      const isSystem = m.autor_tipo === 'sistema';

                      return (
                        <div key={m.id} className={`flex gap-3 ${isSystem ? 'opacity-90' : ''}`}>
                          <div className={`h-9 w-9 rounded-full border flex items-center justify-center shrink-0 ${info.bg}`}>
                            <Icon className={`h-4 w-4 ${info.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap mb-1">
                              <span className={`text-sm font-semibold ${info.color}`}>
                                {m.autor_nome || info.label}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                {info.label}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">
                                {time}
                              </span>
                            </div>
                            <div className={`rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                              isSystem ? 'bg-muted/40 italic text-muted-foreground' : 'bg-card'
                            }`}>
                              {m.mensagem}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Botão flutuante "novas mensagens" / "ir para o fim" */}
        {!autoScroll && (
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="absolute bottom-4 right-4 gap-2 shadow-lg"
          >
            <ArrowDownCircle className="h-4 w-4" />
            {newCount > 0 ? `${newCount} nova${newCount > 1 ? 's' : ''} mensage${newCount > 1 ? 'ns' : 'm'}` : 'Ir para o fim'}
          </Button>
        )}
      </Card>
    </div>
  );
}
