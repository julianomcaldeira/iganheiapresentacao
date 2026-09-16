import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  Link2,
  Globe,
  FileCheck,
  FileX,
  AlertTriangle,
  Loader2,
  Download,
  Play,
  CheckCircle,
  Clock,
  ExternalLink,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface IDocumenteiEmpresa {
  id: string;
  empresa_id: string;
  idocumentei_id: string;
  status_sync: string;
  ultimo_processamento: string | null;
}

interface IDocumenteiDoc {
  id: string;
  empresa_id: string;
  tipo: string;
  nome: string;
  status: string;
  data_emissao: string | null;
  data_validade: string | null;
  arquivo_url: string | null;
  dados_raw: any;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
}

interface Props {
  clienteId: string;
}

const getDocStatusConfig = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'valida' || s === 'válida' || s === 'valido' || s === 'concluido' || s === 'disponivel')
    return { label: 'Válida', icon: FileCheck, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
  if (s === 'vencida' || s === 'vencido' || s === 'expirado')
    return { label: 'Vencida', icon: FileX, className: 'bg-destructive/10 text-destructive border-destructive/20' };
  if (s === 'processando' || s === 'pendente' || s === 'aguardando')
    return { label: 'Processando', icon: Clock, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
  return { label: status || 'N/A', icon: AlertTriangle, className: 'bg-muted text-muted-foreground' };
};

export function IDocumenteiPanel({ clienteId }: Props) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [mappings, setMappings] = useState<IDocumenteiEmpresa[]>([]);
  const [documentos, setDocumentos] = useState<IDocumenteiDoc[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [idocEmpresas, setIdocEmpresas] = useState<any[]>([]);
  const [linkingEmpresaId, setLinkingEmpresaId] = useState('');
  const [linkingIdocId, setLinkingIdocId] = useState('');

  useEffect(() => {
    fetchData();
  }, [clienteId]);

  useEffect(() => {
    if (selectedEmpresa) {
      fetchDocumentos(selectedEmpresa);
    }
  }, [selectedEmpresa]);

  const fetchData = async () => {
    setLoading(true);
    const [empresasRes, mappingsRes] = await Promise.all([
      supabase.from('empresas').select('id, razao_social, nome_fantasia, cnpj').eq('cliente_id', clienteId).eq('ativo', true),
      supabase.from('idocumentei_empresas' as any).select('*'),
    ]);

    if (empresasRes.data) setEmpresas(empresasRes.data);
    if (mappingsRes.data) setMappings(mappingsRes.data as any);

    // Auto-select first mapped empresa
    if (mappingsRes.data && mappingsRes.data.length > 0) {
      setSelectedEmpresa((mappingsRes.data as any)[0].empresa_id);
    }
    setLoading(false);
  };

  const fetchDocumentos = async (empresaId: string) => {
    setFetchingDocs(true);
    const mapping = mappings.find(m => m.empresa_id === empresaId);

    if (mapping) {
      // Fetch from i-Documentei API
      try {
        const { data, error } = await supabase.functions.invoke('idocumentei-sync', {
          body: { action: 'listar_documentos', empresa_id: empresaId, idocumentei_id: mapping.idocumentei_id },
        });
        if (error) throw error;
      } catch (err) {
        console.error('Erro ao buscar documentos da API:', err);
      }
    }

    // Always load from local DB
    const { data } = await supabase
      .from('idocumentei_documentos' as any)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_validade', { ascending: true });

    if (data) setDocumentos(data as any);
    setFetchingDocs(false);
  };

  const handleListIdocEmpresas = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('idocumentei-sync', {
        body: { action: 'listar_empresas' },
      });
      if (error) throw error;
      setIdocEmpresas(Array.isArray(data?.data) ? data.data : []);
      setLinkDialog(true);
    } catch (err: any) {
      toast.error('Erro ao listar empresas do i-Documentei: ' + (err.message || err));
    } finally {
      setSyncing(false);
    }
  };

  const handleLink = async () => {
    if (!linkingEmpresaId || !linkingIdocId) {
      toast.error('Selecione ambos os campos');
      return;
    }

    const { error } = await supabase.from('idocumentei_empresas' as any).insert({
      empresa_id: linkingEmpresaId,
      idocumentei_id: linkingIdocId,
    });

    if (error) {
      toast.error('Erro ao vincular: ' + error.message);
      return;
    }

    toast.success('Empresa vinculada ao i-Documentei!');
    setLinkDialog(false);
    setLinkingEmpresaId('');
    setLinkingIdocId('');
    fetchData();
  };

  const handleProcessar = async () => {
    const mapping = mappings.find(m => m.empresa_id === selectedEmpresa);
    if (!mapping) {
      toast.error('Empresa não vinculada ao i-Documentei');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('idocumentei-sync', {
        body: { action: 'processar', empresa_id: selectedEmpresa, idocumentei_id: mapping.idocumentei_id },
      });
      if (error) throw error;
      toast.success('Processamento solicitado! Os documentos serão atualizados em breve.');
      // Refresh after a delay
      setTimeout(() => fetchDocumentos(selectedEmpresa), 3000);
    } catch (err: any) {
      toast.error('Erro ao processar: ' + (err.message || err));
    } finally {
      setProcessing(false);
    }
  };

  const currentMapping = mappings.find(m => m.empresa_id === selectedEmpresa);
  const unmappedEmpresas = empresas.filter(e => !mappings.find(m => m.empresa_id === e.id));

  const docStats = {
    total: documentos.length,
    validas: documentos.filter(d => ['valida', 'válida', 'valido', 'concluido', 'disponivel'].includes(d.status?.toLowerCase())).length,
    vencidas: documentos.filter(d => ['vencida', 'vencido', 'expirado'].includes(d.status?.toLowerCase())).length,
    processando: documentos.filter(d => ['processando', 'pendente', 'aguardando'].includes(d.status?.toLowerCase())).length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">CNDs — i-Documentei</h3>
            <p className="text-sm text-muted-foreground">Consulta automática e manual de certidões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleListIdocEmpresas} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link2 className="h-4 w-4 mr-1.5" />}
            Vincular Empresa
          </Button>
        </div>
      </div>

      {/* Empresa selector + actions */}
      {mappings.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-xs text-muted-foreground mb-1.5 block">Empresa</label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {mappings.map(m => {
                      const emp = empresas.find(e => e.id === m.empresa_id);
                      return (
                        <SelectItem key={m.empresa_id} value={m.empresa_id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {emp?.nome_fantasia || emp?.razao_social || m.empresa_id}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4 sm:pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedEmpresa && fetchDocumentos(selectedEmpresa)}
                  disabled={!selectedEmpresa || fetchingDocs}
                >
                  {fetchingDocs ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  onClick={handleProcessar}
                  disabled={!selectedEmpresa || processing || !currentMapping}
                  className="gradient-primary text-primary-foreground"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                  Processar CNDs
                </Button>
              </div>
            </div>

            {currentMapping?.ultimo_processamento && (
              <p className="text-xs text-muted-foreground mt-3">
                Último processamento: {new Date(currentMapping.ultimo_processamento).toLocaleString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {selectedEmpresa && documentos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: docStats.total, color: 'text-foreground', bg: 'bg-card' },
            { label: 'Válidas', value: docStats.validas, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Vencidas', value: docStats.vencidas, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Processando', value: docStats.processando, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn('p-3 rounded-xl border border-border/60', stat.bg)}
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Documents Table */}
      {selectedEmpresa && (
        <Card className="border-border/60 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Certidões e Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {fetchingDocs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : documentos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Globe className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum documento encontrado</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Clique em "Processar CNDs" para solicitar a emissão das certidões
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="font-semibold text-xs">Documento</TableHead>
                    <TableHead className="font-semibold text-xs">Tipo</TableHead>
                    <TableHead className="font-semibold text-xs">Emissão</TableHead>
                    <TableHead className="font-semibold text-xs">Validade</TableHead>
                    <TableHead className="font-semibold text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {documentos.map((doc, idx) => {
                      const sc = getDocStatusConfig(doc.status);
                      const Icon = sc.icon;
                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="group hover:bg-secondary/20"
                        >
                          <TableCell className="font-medium text-sm">{doc.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.data_validade ? new Date(doc.data_validade).toLocaleDateString('pt-BR') : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('flex items-center gap-1 w-fit text-xs', sc.className)}>
                              <Icon className="w-3 h-3" />
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {doc.arquivo_url && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" title="Abrir">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={doc.arquivo_url} download title="Download">
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no mappings */}
      {mappings.length === 0 && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Link2 className="h-7 w-7 text-primary" />
            </div>
            <h4 className="text-base font-semibold mb-1">Nenhuma empresa vinculada</h4>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Vincule suas empresas ao i-Documentei para consultar CNDs automaticamente.
            </p>
            <Button onClick={handleListIdocEmpresas} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link2 className="h-4 w-4 mr-1.5" />}
              Vincular Empresa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Vincular Empresa ao i-Documentei
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Empresa do sistema</label>
              <Select value={linkingEmpresaId} onValueChange={setLinkingEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {unmappedEmpresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social} {e.cnpj ? `(${e.cnpj})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Empresa no i-Documentei</label>
              {idocEmpresas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Nenhuma empresa encontrada no i-Documentei. Verifique se a chave de API está correta.
                </p>
              ) : (
                <Select value={linkingIdocId} onValueChange={setLinkingIdocId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa correspondente" />
                  </SelectTrigger>
                  <SelectContent>
                    {idocEmpresas.map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.razao_social || e.nome || e.name || `ID: ${e.id}`}
                        {e.cnpj ? ` (${e.cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancelar</Button>
              <Button onClick={handleLink} disabled={!linkingEmpresaId || !linkingIdocId}>
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
