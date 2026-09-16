import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  History, ArrowRight, Loader2, Sparkles, FileEdit,
  Calendar, Hash, CircleDot,
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampoAlterado {
  campo: string;
  label: string;
  de: any;
  para: any;
}

interface Versao {
  id: string;
  versao: number;
  situacao_conlicitacao: string | null;
  campos_alterados: CampoAlterado[];
  total_mudancas: number;
  boletim_id: number | null;
  created_at: string;
}

interface Props {
  licitacaoId: string;
}

function formatVal(v: any): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try { return format(new Date(v), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return v; }
  }
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  return String(v);
}

function dateLabel(d: Date): string {
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function LicitacaoHistorico({ licitacaoId }: Props) {
  const { data: versoes, isLoading } = useQuery({
    queryKey: ['licitacao-versoes', licitacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('licitacao_versoes')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('versao', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Versao[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!versoes || versoes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center text-muted-foreground text-sm">
          <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-foreground/80">Nenhum histórico registrado</p>
          <p className="text-xs mt-1">As atualizações desta licitação aparecerão aqui.</p>
        </CardContent>
      </Card>
    );
  }

  const totalMudancas = versoes.reduce((acc, v) => acc + (v.total_mudancas || 0), 0);
  const ultima = new Date(versoes[0].created_at);

  // group by date (yyyy-mm-dd)
  const groups: Record<string, Versao[]> = {};
  for (const v of versoes) {
    const k = format(new Date(v.created_at), 'yyyy-MM-dd');
    (groups[k] ||= []).push(v);
  }
  const groupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold leading-none">{versoes.length}</div>
              <div className="text-xs text-muted-foreground mt-1">versões registradas</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <FileEdit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold leading-none">{totalMudancas}</div>
              <div className="text-xs text-muted-foreground mt-1">mudanças no total</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20 col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                {formatDistanceToNow(ultima, { locale: ptBR, addSuffix: true })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                última: {format(ultima, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline agrupada por data */}
      <div className="space-y-6">
        {groupKeys.map((k) => {
          const groupDate = new Date(k + 'T00:00:00');
          const items = groups[k];
          return (
            <div key={k}>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs font-medium gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {dateLabel(groupDate)}
                </Badge>
                <Separator className="flex-1" />
                <span className="text-[11px] text-muted-foreground">{items.length} versão(ões)</span>
              </div>

              <div className="relative pl-7 space-y-3 before:content-[''] before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-border">
                {items.map((v) => {
                  const isFirst = v.versao === 1;
                  const mudancas = Array.isArray(v.campos_alterados) ? v.campos_alterados : [];
                  const time = format(new Date(v.created_at), "HH:mm", { locale: ptBR });

                  return (
                    <div key={v.id} className="relative">
                      <span
                        className={`absolute -left-[22px] top-3.5 h-3.5 w-3.5 rounded-full ring-4 ring-background flex items-center justify-center ${
                          isFirst ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                      >
                        <CircleDot className="h-2 w-2 text-white" />
                      </span>

                      <Card className={`overflow-hidden transition-shadow hover:shadow-md ${
                        isFirst ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-amber-500'
                      }`}>
                        <CardContent className="p-0">
                          {/* header */}
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/30 border-b flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={isFirst ? 'secondary' : 'default'} className="font-mono text-[11px]">
                                v{v.versao}
                              </Badge>
                              {isFirst ? (
                                <Badge variant="outline" className="text-blue-600 border-blue-500/40 gap-1 text-[11px]">
                                  <Sparkles className="h-3 w-3" /> Versão inicial
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1 text-[11px]">
                                  <FileEdit className="h-3 w-3" />
                                  {v.total_mudancas} {v.total_mudancas === 1 ? 'mudança' : 'mudanças'}
                                </Badge>
                              )}
                              {v.situacao_conlicitacao && (
                                <Badge variant="outline" className="text-[11px]">
                                  Situação: {v.situacao_conlicitacao}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="font-medium tabular-nums">{time}</span>
                              {v.boletim_id && (
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  Boletim {v.boletim_id}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* body */}
                          {isFirst ? (
                            <div className="px-4 py-3 text-xs text-muted-foreground italic">
                              Primeira recepção desta licitação no sistema.
                            </div>
                          ) : mudancas.length > 0 ? (
                            <div className="divide-y">
                              {mudancas.map((c, idx) => (
                                <div key={idx} className="px-4 py-2.5 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-4 text-sm hover:bg-muted/20 transition-colors">
                                  <span className="font-medium text-foreground/80 text-xs uppercase tracking-wide">
                                    {c.label}
                                  </span>
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="line-through text-muted-foreground break-words text-xs px-2 py-0.5 rounded bg-destructive/5">
                                      {formatVal(c.de)}
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-semibold text-foreground break-words text-xs px-2 py-0.5 rounded bg-emerald-500/10">
                                      {formatVal(c.para)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-4 py-3 text-xs text-muted-foreground">
                              Atualização registrada sem detalhamento de campos.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
