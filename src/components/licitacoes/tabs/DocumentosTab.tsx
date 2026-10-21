import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  FileText, Plus, CheckCircle, AlertCircle, Loader2, Trash2, Download,
  Globe, ClipboardList, FileCheck, FolderOpen, ChevronDown, ChevronRight, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { garantirDocumentosLicitacao, buscarBaseDocumentosDoCliente, type DocumentoBaseItem } from '@/lib/garantirDocumentosLicitacao';

interface DocumentoChecklist {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  obrigatorio: boolean;
  arquivo_url: string | null;
  data_validade: string | null;
}

interface DeclaracaoTemplate {
  id: string;
  nome: string;
  conteudo: string;
}

interface Props {
  licitacaoId: string;
  clienteId: string;
  declaracaoTemplates: DeclaracaoTemplate[];
  generateDeclaracao: (template: DeclaracaoTemplate) => string;
}

const CATEGORIAS = [
  { value: 'cnd', label: 'CNDs (Certidões Negativas)', icon: Globe, color: 'text-blue-500' },
  { value: 'atestado', label: 'Atestados de Capacidade Técnica', icon: ClipboardList, color: 'text-amber-500' },
  { value: 'declaracao', label: 'Declarações', icon: FileCheck, color: 'text-emerald-500' },
  { value: 'outro', label: 'Outros Documentos', icon: FolderOpen, color: 'text-muted-foreground' },
];

export function DocumentosTab({ licitacaoId, clienteId, declaracaoTemplates, generateDeclaracao }: Props) {
  const [documentos, setDocumentos] = useState<DocumentoChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoDoc, setNovoDoc] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('cnd');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ cnd: true, atestado: true, declaracao: true, outro: true });
  const [sincronizando, setSincronizando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [erroBase, setErroBase] = useState<string | null>(null);
  const [base, setBase] = useState<DocumentoBaseItem[]>([]);

  useEffect(() => {
    fetchDocumentos();
  }, [licitacaoId, tentativas]);

  /**
   * Base de documentos do cliente (calculada no front, sem depender de
   * gravação). Garante que as 4 seções apareçam preenchidas na demo,
   * mesmo que o banco bloqueie a gravação.
   */
  useEffect(() => {
    let ativo = true;
    (async () => {
      const itens = await buscarBaseDocumentosDoCliente(clienteId);
      if (ativo) setBase(itens);
    })();
    return () => { ativo = false; };
  }, [clienteId]);

  /** Lista exibida: gravados no banco + base do cliente (sem duplicar). */
  const listaExibida = useMemo(() => {
    const porNome = new Map<string, any>();
    for (const d of documentos) {
      porNome.set(
        d.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(),
        { ...d, origem: 'gravado' }
      );
    }
    for (const b of base) {
      const k = b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
      if (porNome.has(k)) continue;
      porNome.set(k, {
        id: null,
        nome: b.nome,
        categoria: b.categoria,
        status: b.status,
        obrigatorio: b.obrigatorio,
        data_validade: b.data_validade,
        descricao: b.descricao,
        observacoes: b.observacoes,
        origem: 'base',
      });
    }
    return Array.from(porNome.values());
  }, [documentos, base]);

  /**
   * Garante que a listagem exista ao abrir a aba: se alguma seção está
   * vazia (ou os documentos estão com categoria inválida), sincroniza a
   * base do cliente e recarrega.
   */
  useEffect(() => {
    if (loading || tentativas > 2) return;
    const secoesVazias = CATEGORIAS.some((c) => !documentos.some((d) => d.categoria === c.value));
    if (!secoesVazias) {
      setErroBase(null);
      return;
    }
    let ativo = true;
    (async () => {
      const rel = await garantirDocumentosLicitacao([{ id: licitacaoId, cliente_id: clienteId }]);
      if (!ativo) return;
      console.info('[Documentos] Garantia automática na aba:', rel);
      if (rel.erros.length > 0) {
        setErroBase(rel.erros[0]);
      } else if (rel.documentosInseridos > 0 || rel.documentosReclassificados > 0) {
        setErroBase(null);
        setTentativas((t) => t + 1);
      }
    })();
    return () => { ativo = false; };
  }, [loading, documentos, licitacaoId, clienteId, tentativas]);

  /** Sincroniza a base de documentos do cliente nesta licitação. */
  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const rel = await garantirDocumentosLicitacao([
        { id: licitacaoId, cliente_id: clienteId },
      ]);
      console.info('[Documentos] Sincronização manual:', rel);
      if (rel.erros.length > 0) {
        toast.error(`Falha ao sincronizar: ${rel.erros[0]}`);
      } else {
        toast.success(
          `Base sincronizada — ${rel.documentosInseridos} documento(s) inserido(s), ${rel.documentosReclassificados} reclassificado(s)`
        );
      }
      await fetchDocumentos();
      setTentativas((t) => t + 1);
    } catch (e: any) {
      console.error('[Documentos] Erro na sincronização:', e);
      toast.error(e?.message || 'Erro ao sincronizar a base de documentos');
    } finally {
      setSincronizando(false);
    }
  };

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from('licitacao_documentos_checklist')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .order('categoria', { ascending: true });

    if (data) setDocumentos(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!novoDoc.trim()) return;
    const { error } = await supabase
      .from('licitacao_documentos_checklist')
      .insert({ licitacao_id: licitacaoId, nome: novoDoc.trim(), categoria: novaCategoria });

    if (error) { toast.error('Erro ao adicionar'); return; }
    setNovoDoc('');
    fetchDocumentos();
    toast.success('Documento adicionado!');
  };

  const handleToggle = async (doc: any) => {
    const newStatus = doc.status === 'concluido' ? 'pendente' : 'concluido';
    if (doc.id) {
      const { error } = await supabase
        .from('licitacao_documentos_checklist')
        .update({ status: newStatus })
        .eq('id', doc.id);
      if (error) {
        toast.error(`Não foi possível salvar: ${error.message}`);
        return;
      }
    } else {
      // documento veio da base do cliente (ainda não gravado nesta licitação)
      const { error } = await supabase.from('licitacao_documentos_checklist').insert({
        licitacao_id: licitacaoId,
        nome: doc.nome,
        categoria: doc.categoria,
        status: newStatus,
        obrigatorio: doc.obrigatorio ?? true,
        descricao: doc.descricao || null,
        data_validade: doc.data_validade || null,
        observacoes: doc.observacoes || null,
      });
      if (error) {
        toast.error(`Não foi possível gravar na base: ${error.message}`);
        return;
      }
    }
    fetchDocumentos();
  };

  const handleRemove = async (id: string) => {
    if (!id) return;
    await supabase.from('licitacao_documentos_checklist').delete().eq('id', id);
    fetchDocumentos();
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const docsByCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    docs: listaExibida.filter(d => d.categoria === cat.value),
  }));

  const isDisponivel = (d: any) => d.status === 'concluido' || !!d.arquivo_url;
  const totalConcluidos = listaExibida.filter(isDisponivel).length;
  const totalPendentes = listaExibida.length - totalConcluidos;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="font-medium">{totalConcluidos}</span>
            <span className="text-muted-foreground">disponível(is) na base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{totalPendentes}</span>
            <span className="text-muted-foreground">não disponível(is) — providenciar</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSincronizar}
          disabled={sincronizando}
          title="Sincronizar a base de documentos do cliente nesta licitação"
        >
          {sincronizando ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sincronizar base
        </Button>
      </div>

      {listaExibida.length === 0 && !erroBase && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            Nenhum documento na listagem desta licitação. Clique em “Sincronizar base” para
            importar a base de documentos do cliente.
          </span>
        </div>
      )}

      {erroBase && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Não foi possível montar a base de documentos desta licitação:</p>
          <p className="mt-1 font-mono text-xs break-words">{erroBase}</p>
        </div>
      )}

      {/* Add document */}
      <div className="flex gap-2">
        <select
          value={novaCategoria}
          onChange={e => setNovaCategoria(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {CATEGORIAS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Input
          value={novoDoc}
          onChange={e => setNovoDoc(e.target.value)}
          placeholder="Nome do documento..."
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Documents by category */}
      {docsByCategoria.map(cat => {
        const CatIcon = cat.icon;
        const isExpanded = expandedCats[cat.value];
        const concluidos = cat.docs.filter(d => d.status === 'concluido').length;

        return (
          <Card key={cat.value} className="overflow-hidden">
            <button
              onClick={() => toggleCat(cat.value)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CatIcon className={`h-5 w-5 ${cat.color}`} />
                <span className="text-sm font-semibold">{cat.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {concluidos}/{cat.docs.length}
                </Badge>
              </div>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-3 px-4">
                {cat.docs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 pl-8">Nenhum documento nesta categoria.</p>
                ) : (
                  <div className="space-y-0.5">
                    {cat.docs.map(doc => (
                      <div
                        key={doc.id || `base-${doc.nome}`}
                        className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50 group"
                      >
                        <Checkbox
                          checked={doc.status === 'concluido'}
                          onCheckedChange={() => handleToggle(doc)}
                        />
                        <span className={`text-sm flex-1 ${isDisponivel(doc) ? 'text-foreground' : ''}`}>
                          {doc.nome}
                        </span>
                        {doc.origem === 'base' && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            da base do cliente
                          </Badge>
                        )}
                        {isDisponivel(doc) ? (
                          <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
                            ✓ Disponível na base
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-700 dark:text-yellow-500">
                            Não disponível — providenciar
                          </Badge>
                        )}
                        {doc.data_validade && (
                          <span className="text-xs text-muted-foreground">
                            Val: {new Date(doc.data_validade).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {doc.obrigatorio && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">Obrigatório</Badge>
                        )}
                        {doc.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemove(doc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Declaration Templates */}
      {declaracaoTemplates.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Templates de Declaração</span>
            <Badge variant="secondary" className="text-xs">{declaracaoTemplates.length}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {declaracaoTemplates.map(t => (
              <Card key={t.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{t.nome}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const blob = new Blob([generateDeclaracao(t)], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${t.nome}.txt`;
                      a.click();
                      toast.success('Declaração gerada!');
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Gerar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
