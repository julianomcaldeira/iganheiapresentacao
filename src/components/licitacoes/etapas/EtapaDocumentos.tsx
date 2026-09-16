import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderOpen, Plus, FileText, Upload, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';

interface DocumentoChecklist {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  obrigatorio: boolean;
  arquivo_url: string | null;
}

export function EtapaDocumentos({ etapa, licitacaoId, onStatusChange }: EtapaComponentProps) {
  const [documentos, setDocumentos] = useState<DocumentoChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoDoc, setNovoDoc] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('cnd');

  useEffect(() => {
    fetchDocumentos();
  }, [licitacaoId]);

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from('licitacao_documentos_checklist')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .order('categoria, nome');

    if (data) setDocumentos(data);
    setLoading(false);
  };

  const handleAddDocumento = async () => {
    if (!novoDoc.trim()) return;

    if (etapa.status === 'nao_iniciada') {
      await onStatusChange('preparacao_documentos', 'em_analise');
    }

    const { error } = await supabase
      .from('licitacao_documentos_checklist')
      .insert({
        licitacao_id: licitacaoId,
        nome: novoDoc.trim(),
        categoria: novaCategoria,
      });

    if (error) {
      toast.error('Erro ao adicionar documento');
      return;
    }

    setNovoDoc('');
    fetchDocumentos();
    toast.success('Documento adicionado!');
  };

  const handleToggleStatus = async (doc: DocumentoChecklist) => {
    const newStatus = doc.status === 'concluido' ? 'pendente' : 'concluido';
    await supabase
      .from('licitacao_documentos_checklist')
      .update({ status: newStatus })
      .eq('id', doc.id);
    fetchDocumentos();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('licitacao_documentos_checklist').delete().eq('id', id);
    fetchDocumentos();
  };

  const handleFinalizarAnalise = async () => {
    const pendentes = documentos.filter(d => d.obrigatorio && d.status !== 'concluido');
    if (pendentes.length > 0) {
      toast.error(`Ainda há ${pendentes.length} documento(s) obrigatório(s) pendente(s)`);
      return;
    }
    await onStatusChange('preparacao_documentos', 'documentos_analisados');
  };

  const categorias = [
    { value: 'cnd', label: 'CNDs (Online)', icon: '🌐' },
    { value: 'atestado', label: 'Atestados de Capacidade Técnica', icon: '📋' },
    { value: 'declaracao', label: 'Declarações', icon: '📄' },
    { value: 'outro', label: 'Outros Documentos', icon: '📁' },
  ];

  const docsByCategoria = categorias.map(cat => ({
    ...cat,
    docs: documentos.filter(d => d.categoria === cat.value),
  }));

  const totalPendentes = documentos.filter(d => d.status !== 'concluido').length;
  const totalConcluidos = documentos.filter(d => d.status === 'concluido').length;

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span>{totalConcluidos} concluído(s)</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span>{totalPendentes} pendente(s)</span>
        </div>
      </div>

      {/* Add document */}
      <div className="flex gap-2">
        <select
          value={novaCategoria}
          onChange={e => setNovaCategoria(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {categorias.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Input
          value={novoDoc}
          onChange={e => setNovoDoc(e.target.value)}
          placeholder="Nome do documento..."
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleAddDocumento()}
        />
        <Button size="sm" onClick={handleAddDocumento}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Categorized list */}
      {docsByCategoria.map(cat => (
        cat.docs.length > 0 && (
          <div key={cat.value}>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {cat.icon} {cat.label} ({cat.docs.length})
            </p>
            <div className="space-y-1">
              {cat.docs.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group"
                >
                  <Checkbox
                    checked={doc.status === 'concluido'}
                    onCheckedChange={() => handleToggleStatus(doc)}
                  />
                  <span className={`text-sm flex-1 ${doc.status === 'concluido' ? 'line-through text-muted-foreground' : ''}`}>
                    {doc.nome}
                  </span>
                  {doc.obrigatorio && (
                    <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>
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
          </div>
        )
      ))}

      {documentos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Adicione os documentos necessários para esta licitação.
        </p>
      )}

      {etapa.status === 'em_analise' && documentos.length > 0 && (
        <Button onClick={handleFinalizarAnalise} size="sm" className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Finalizar Análise de Documentos
        </Button>
      )}
    </div>
  );
}
