import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Download, FileArchive, File, FileSpreadsheet, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import JSZip from 'jszip';

interface EditalFile {
  id: string;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  status: string;
  created_at: string;
}

interface ZipEntry {
  name: string;
  size: number;
  isDirectory: boolean;
}

interface EditalPreviewTabProps {
  licitacaoId: string;
}

function getFileIcon(name: string) {
  const lower = name.toLowerCase();
  if (/\.(pdf)$/i.test(lower)) return FileText;
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lower)) return ImageIcon;
  if (/\.(xlsx?|csv)$/i.test(lower)) return FileSpreadsheet;
  if (/\.(zip|rar|7z|tar|gz)$/i.test(lower)) return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isZipFile(name: string | null, url: string | null): boolean {
  const str = (name || url || '').toLowerCase();
  return /\.(zip)(\?|$)/i.test(str);
}

export function EditalPreviewTab({ licitacaoId }: EditalPreviewTabProps) {
  const [files, setFiles] = useState<EditalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [zipContents, setZipContents] = useState<Record<string, ZipEntry[]>>({});
  const [loadingZip, setLoadingZip] = useState<Record<string, boolean>>({});
  const [expandedZips, setExpandedZips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchFiles = async () => {
      if (!licitacaoId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('licitacao_analises')
        .select('id, arquivo_nome, arquivo_url, status, created_at')
        .eq('licitacao_id', licitacaoId)
        .not('arquivo_url', 'is', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFiles(data);
        data.forEach((file) => {
          if (isZipFile(file.arquivo_nome, file.arquivo_url) && file.arquivo_url) {
            extractZipContents(file.id, file.arquivo_url);
          }
        });
      }
      setLoading(false);
    };
    fetchFiles();
  }, [licitacaoId]);

  const extractZipContents = useCallback(async (fileId: string, url: string) => {
    setLoadingZip(prev => ({ ...prev, [fileId]: true }));
    setExpandedZips(prev => ({ ...prev, [fileId]: true }));
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);
      const entries: ZipEntry[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          entries.push({ name: relativePath, size: (zipEntry as any)._data?.uncompressedSize || 0, isDirectory: false });
        }
      });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      setZipContents(prev => ({ ...prev, [fileId]: entries }));
    } catch (err) {
      console.error('Error extracting ZIP:', err);
      setZipContents(prev => ({ ...prev, [fileId]: [] }));
    }
    setLoadingZip(prev => ({ ...prev, [fileId]: false }));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-3 flex items-center justify-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-center">
        <FileArchive className="h-4 w-4 mx-auto text-muted-foreground/40 mb-1" />
        <p className="text-[10px] text-muted-foreground">Sem edital</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
        <FileArchive className="h-3 w-3 text-primary" />
        <span className="text-[11px] font-semibold text-foreground">Edital</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{files.length} arquivo{files.length > 1 ? 's' : ''}</span>
      </div>

      {/* Files */}
      <div className="divide-y divide-border">
        {files.map((file) => {
          const isZip = isZipFile(file.arquivo_nome, file.arquivo_url);
          const entries = zipContents[file.id] || [];
          const isExpanded = expandedZips[file.id] || false;
          const isLoadingZip = loadingZip[file.id] || false;
          const Icon = getFileIcon(file.arquivo_nome || '');

          return (
            <div key={file.id}>
              <div className="flex items-center gap-1.5 px-3 py-2">
                <div className="p-1 rounded bg-primary/10 shrink-0">
                  {isZip ? <FileArchive className="h-3 w-3 text-primary" /> : <Icon className="h-3 w-3 text-primary" />}
                </div>
                <span className="flex-1 truncate text-[11px] font-medium">{file.arquivo_nome || 'Edital'}</span>
                <div className="flex items-center shrink-0">
                  {isZip && (
                    <Button
                      variant="ghost" size="icon" className="h-5 w-5"
                      onClick={() => setExpandedZips(prev => ({ ...prev, [file.id]: !isExpanded }))}
                    >
                      {isExpanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                    </Button>
                  )}
                  {file.arquivo_url && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                      <a href={file.arquivo_url} download={file.arquivo_nome || 'edital'}>
                        <Download className="h-2.5 w-2.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {isZip && isExpanded && (
                <div className="bg-muted/30 px-3 py-1.5 border-t border-border">
                  {isLoadingZip ? (
                    <div className="flex items-center gap-1.5 py-1 justify-center">
                      <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Lendo ZIP...</span>
                    </div>
                  ) : entries.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-1">Não foi possível ler</p>
                  ) : (
                    <div className="max-h-28 overflow-y-auto space-y-px">
                      {entries.map((entry, idx) => {
                        const EntryIcon = getFileIcon(entry.name);
                        const fileName = entry.name.split('/').pop() || entry.name;
                        return (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/60 text-[10px]">
                            <EntryIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                            <span className="truncate flex-1 text-foreground/80">{fileName}</span>
                            {entry.size > 0 && (
                              <span className="text-muted-foreground shrink-0">{formatFileSize(entry.size)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
