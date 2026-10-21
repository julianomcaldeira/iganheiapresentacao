import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Send, CheckCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ClienteQuestionsPanelProps {
  clienteId: string;
  licitacaoId: string;
  relevancia: string;
}

interface RegraQuestion {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
}

interface ChatAnswer {
  id: string;
  pergunta: string;
  resposta: string | null;
  status: string;
}

export function ClienteQuestionsPanel({ clienteId, licitacaoId, relevancia }: ClienteQuestionsPanelProps) {
  const [regras, setRegras] = useState<RegraQuestion[]>([]);
  const [answers, setAnswers] = useState<ChatAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [askingId, setAskingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [clienteId, licitacaoId]);

  const fetchData = async () => {
    setLoading(true);
    const [regrasRes, chatRes] = await Promise.all([
      supabase
        .from('cliente_regras')
        .select('id, titulo, descricao, categoria')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('ordem'),
      supabase
        .from('licitacao_chat')
        .select('id, pergunta, resposta, status')
        .eq('licitacao_id', licitacaoId)
        .order('created_at', { ascending: false }),
    ]);

    if (regrasRes.data) setRegras(regrasRes.data);
    if (chatRes.data) setAnswers(chatRes.data as ChatAnswer[]);
    setLoading(false);
  };

  const textoDaRegra = (regra: RegraQuestion) => regra.descricao || regra.titulo;

  const handleAskQuestion = async (regra: RegraQuestion) => {
    setAskingId(regra.id);
    try {
      // Check if already asked
      const alreadyAsked = answers.find(a => a.pergunta === textoDaRegra(regra));
      if (alreadyAsked?.resposta) {
        toast.info('Esta pergunta já foi respondida. Veja abaixo.');
        setAskingId(null);
        return;
      }

      // Create chat entry
      const { data: chatEntry, error: chatError } = await supabase
        .from('licitacao_chat')
        .insert({
          licitacao_id: licitacaoId,
          pergunta: textoDaRegra(regra),
          status: 'processando',
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Call AI
      const { data, error } = await supabase.functions.invoke('chat-edital', {
        body: {
          licitacaoId,
          chatId: chatEntry.id,
          pergunta: regra.descricao,
        },
      });

      if (error) throw error;

      toast.success('Resposta recebida!');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pergunta');
    }
    setAskingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (regras.length === 0) return null;

  // Group regras by category
  const grouped = regras.reduce((acc, r) => {
    if (!acc[r.categoria]) acc[r.categoria] = [];
    acc[r.categoria].push(r);
    return acc;
  }, {} as Record<string, RegraQuestion[]>);

  const respondidas = regras.filter((r) =>
    answers.some((a) => a.pergunta === textoDaRegra(r) && a.resposta)
  ).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Perguntas do Edital</h3>
            <Badge variant="secondary" className="text-[10px]">
              {regras.length} perguntas configuradas
            </Badge>
            {respondidas > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">
                {respondidas} respondida(s) pela IA
              </Badge>
            )}
          {relevancia === 'alta' && (
            <Badge className="bg-amber-500/20 text-amber-600 text-[10px]">
              Alta Relevância — análise recomendada
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {Object.entries(grouped).map(([categoria, items]) => (
            <div key={categoria}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{categoria}</p>
              <div className="space-y-2">
                    {items.map(regra => {
                      const answer = answers.find(a => a.pergunta === textoDaRegra(regra));
                  const isAsking = askingId === regra.id;
                  const hasAnswer = answer?.resposta;

                  return (
                    <div
                      key={regra.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5">
                        {hasAnswer ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{regra.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{regra.descricao}</p>
                        {hasAnswer && (
                          <div className="mt-2 p-2 rounded bg-background border text-xs text-foreground/80 whitespace-pre-wrap">
                            {answer.resposta}
                          </div>
                        )}
                      </div>
                      {!hasAnswer && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAskQuestion(regra)}
                          disabled={isAsking}
                          className="shrink-0"
                        >
                          {isAsking ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
