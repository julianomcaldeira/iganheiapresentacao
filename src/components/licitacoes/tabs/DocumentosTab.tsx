import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  FileText, Plus, CheckCircle, AlertCircle, Loader2, Trash2, Download,
  Globe, ClipboardList, FileCheck, FolderOpen, ChevronDown, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    fetchDocumentos();
  }, [licitacaoId]);

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

  const handleToggle = async (doc: DocumentoChecklist) => {
    const newStatus = doc.status === 'concluido' ? 'pendente' : 'concluido';
    await supabase.from('licitacao_documentos_checklist').update({ status: newStatus }).eq('id', doc.id);
    fetchDocumentos();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('licitacao_documentos_checklist').delete().eq('id', id);
    fetchDocumentos();
  };

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const docsByCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    docs: documentos.filter(d => d.categoria === cat.value),
  }));

  const isDisponivel = (d: DocumentoChecklist) => d.status === 'concluido' || !!d.arquivo_url;
  const totalConcluidos = documentos.filter(isDisponivel).length;
  const totalPendentes = documentos.length - totalConcluidos;

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
      </div>

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
                        key={doc.id}
                        className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50 group"
                      >
                        <Checkbox
                          checked={doc.status === 'concluido'}
                          onCheckedChange={() => handleToggle(doc)}
                        />
                        <span className={`text-sm flex-1 ${isDisponivel(doc) ? 'text-foreground' : ''}`}>
                          {doc.nome}
                        </span>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => handleRemove(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
