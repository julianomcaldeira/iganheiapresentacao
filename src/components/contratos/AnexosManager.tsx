import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Paperclip, Upload, Download, Trash2, Loader2, FileText, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/ui/pdf-viewer';


export type AnexoParentType =
  | 'contrato' | 'empenho' | 'aditivo' | 'apostilamento'
  | 'garantia' | 'medicao' | 'fatura' | 'rescisao' | 'subcontratacao';

interface AnexosManagerProps {
  parentType: AnexoParentType;
  parentId: string;
  clienteId: string;
  compact?: boolean;
}

interface Anexo {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  arquivo_url: string;
  arquivo_path: string;
  arquivo_tamanho: number | null;
  arquivo_tipo: string | null;
  created_at: string;
}

const CATEGORIAS = [
  'Contrato assinado', 'Aditivo', 'Apostilamento', 'Garantia', 'Nota fiscal',
  'Medição', 'Empenho', 'Liquidação', 'Pagamento', 'Ordem de serviço',
  'ART/RRT', 'Comprovante', 'Outro'
];

const BUCKET = 'contrato-empenho-anexos';

export function AnexosManager({ parentType, parentId, clienteId, compact = false }: AnexosManagerProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [preview, setPreview] = useState<{ anexo: Anexo; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);


  useEffect(() => { fetch(); }, [parentId, parentType]);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('contrato_empenho_anexos')
      .select('*')
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: false });
    setAnexos(data || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 25 MB');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clienteId}/${parentType}/${parentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('contrato_empenho_anexos').insert({
        cliente_id: clienteId,
        parent_type: parentType,
        parent_id: parentId,
        nome: file.name,
        descricao: descricao || null,
        categoria: categoria || null,
        arquivo_url: pub.publicUrl,
        arquivo_path: path,
        arquivo_tamanho: file.size,
        arquivo_tipo: file.type,
        uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast.success('Anexo enviado');
      setDescricao(''); setCategoria('');
      if (fileRef.current) fileRef.current.value = '';
      fetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (a: Anexo) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.arquivo_path, 300);
    if (error || !data) { toast.error('Erro ao gerar link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (a: Anexo) => {
    if (!confirm(`Remover "${a.nome}"?`)) return;
    await supabase.storage.from(BUCKET).remove([a.arquivo_path]);
    await supabase.from('contrato_empenho_anexos').delete().eq('id', a.id);
    setAnexos(anexos.filter(x => x.id !== a.id));
    toast.success('Anexo removido');
  };

  const isPreviewable = (a: Anexo) => {
    const n = (a.nome || '').toLowerCase();
    const t = (a.arquivo_tipo || '').toLowerCase();
    return t.startsWith('image/') || t === 'application/pdf' || /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(n);
  };

  const previewKind = (a: Anexo): 'pdf' | 'image' | null => {
    const n = (a.nome || '').toLowerCase();
    const t = (a.arquivo_tipo || '').toLowerCase();
    if (t === 'application/pdf' || /\.pdf$/i.test(n)) return 'pdf';
    if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(n)) return 'image';
    return null;
  };

  const handlePreview = async (a: Anexo) => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.arquivo_path, 600);
      if (error || !data) { toast.error('Erro ao gerar pré-visualização'); return; }
      setPreview({ anexo: a, url: data.signedUrl });
    } finally {
      setPreviewLoading(false);
    }
  };


  const fmtSize = (b: number | null) => {
    if (!b) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Anexos</h4>
          <Badge variant="outline" className="text-[10px]">{anexos.length}</Badge>
        </div>
      )}

      <Card className="p-3 border-dashed">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <Label className="text-xs">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input className="h-8 text-xs" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: 1º termo aditivo" />
          </div>
          <div>
            <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" />
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
              Anexar
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">PDF, imagens, planilhas e documentos até 25 MB.</p>
      </Card>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : anexos.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
          Nenhum anexo. Envie o primeiro documento acima.
        </div>
      ) : (
        <div className="space-y-1.5">
          {anexos.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{a.nome}</span>
                  {a.categoria && <Badge variant="outline" className="text-[10px] shrink-0">{a.categoria}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{fmtSize(a.arquivo_tamanho)}</span>
                  <span>•</span>
                  <span>{format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}</span>
                  {a.descricao && <><span>•</span><span className="truncate">{a.descricao}</span></>}
                </div>
              </div>
              {isPreviewable(a) && (
                <Button
                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                  onClick={() => handlePreview(a)}
                  disabled={previewLoading}
                  title="Pré-visualizar"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(a)} title="Baixar">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(a)} title="Remover">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>

            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="truncate">{preview?.anexo.nome}</span>
              {preview?.anexo.categoria && (
                <Badge variant="outline" className="text-[10px]">{preview.anexo.categoria}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {preview && previewKind(preview.anexo) === 'pdf' && (
              <PdfViewer url={preview.url} />
            )}
            {preview && previewKind(preview.anexo) === 'image' && (
              <div className="flex justify-center bg-muted/30 rounded-lg p-3">
                <img
                  src={preview.url}
                  alt={preview.anexo.nome}
                  className="max-h-[70vh] max-w-full object-contain rounded-md shadow-sm"
                />
              </div>
            )}
          </div>
          {preview && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => handleDownload(preview.anexo)}>
                <Download className="h-3.5 w-3.5 mr-2" /> Baixar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

