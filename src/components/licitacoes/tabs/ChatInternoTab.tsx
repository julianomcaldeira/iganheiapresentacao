import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Trash2, Paperclip, FileText, Image as ImageIcon, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatInternoTabProps {
  licitacaoId: string;
}

interface Mensagem {
  id: string;
  conteudo: string;
  autor_id: string;
  mencoes: string[];
  arquivo_url: string | null;
  arquivo_nome: string | null;
  created_at: string;
  autor?: { id: string; nome: string };
}

interface Profile {
  id: string;
  nome: string;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

function isImageFile(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

export function ChatInternoTab({ licitacaoId }: ChatInternoTabProps) {
  const { user } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [conteudo, setConteudo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`chat-licitacao-${licitacaoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'licitacao_mensagens_internas',
          filter: `licitacao_id=eq.${licitacaoId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMensagens(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            const profile = profiles.find(p => p.id === newMsg.autor_id);
            return [...prev, { ...newMsg, mencoes: newMsg.mencoes || [], autor: profile }];
          });
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'licitacao_mensagens_internas',
          filter: `licitacao_id=eq.${licitacaoId}`,
        },
        (payload) => {
          setMensagens(prev => prev.filter(m => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [licitacaoId]);

  useEffect(() => {
    if (profiles.length > 0) {
      setMensagens(prev => prev.map(m => ({
        ...m,
        autor: profiles.find(p => p.id === m.autor_id) || m.autor,
      })));
    }
  }, [profiles]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [msgsRes, profilesRes] = await Promise.all([
        supabase
          .from('licitacao_mensagens_internas')
          .select('*')
          .eq('licitacao_id', licitacaoId)
          .order('created_at', { ascending: true }),
        supabase.from('profiles').select('id, nome').eq('ativo', true),
      ]);

      const allProfiles = profilesRes.data || [];
      setProfiles(allProfiles);

      const enriched = (msgsRes.data || []).map((m: any) => ({
        ...m,
        mencoes: m.mencoes || [],
        autor: allProfiles.find((p: Profile) => p.id === m.autor_id),
      }));
      setMensagens(enriched);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${licitacaoId}/${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('chat-files')
      .upload(path, file);
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(path);
    
    return { url: urlData.publicUrl, name: file.name };
  };

  const handleSend = async () => {
    if ((!conteudo.trim() && !pendingFile) || !user) return;

    setIsSending(true);
    try {
      let arquivo_url: string | null = null;
      let arquivo_nome: string | null = null;

      if (pendingFile) {
        setIsUploading(true);
        const result = await uploadFile(pendingFile);
        if (result) {
          arquivo_url = result.url;
          arquivo_nome = result.name;
        }
        setIsUploading(false);
      }

      // Extract mentions
      const mentionedIds: string[] = [];
      const mentionRegex = /@(\w[\w\s]*?)(?=\s@|\s*$|[,.])/g;
      let match;
      while ((match = mentionRegex.exec(conteudo)) !== null) {
        const name = match[1].trim().toLowerCase();
        const found = profiles.find(p => p.nome.toLowerCase().startsWith(name));
        if (found && !mentionedIds.includes(found.id)) {
          mentionedIds.push(found.id);
        }
      }

      const { error } = await supabase
        .from('licitacao_mensagens_internas')
        .insert({
          licitacao_id: licitacaoId,
          autor_id: user.id,
          conteudo: conteudo.trim() || (arquivo_nome ? `📎 ${arquivo_nome}` : ''),
          mencoes: mentionedIds,
          arquivo_url,
          arquivo_nome,
        });

      if (error) throw error;
      setConteudo('');
      clearPendingFile();
      scrollToBottom();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('licitacao_mensagens_internas')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMensagens(prev => prev.filter(m => m.id !== id));
    } catch {
      toast.error('Erro ao excluir mensagem');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }
    setPendingFile(file);
    if (isImageFile(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => setPendingFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPendingFilePreview(null);
    }
  };

  const clearPendingFile = () => {
    setPendingFile(null);
    setPendingFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertMention = (profile: Profile) => {
    const before = conteudo.substring(0, cursorPosition);
    const lastAt = before.lastIndexOf('@');
    if (lastAt === -1) return;
    const newText = conteudo.substring(0, lastAt) + `@${profile.nome} ` + conteudo.substring(cursorPosition);
    setConteudo(newText);
    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current?.focus();
  };

  const handleTextChange = (value: string) => {
    setConteudo(value);
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    setCursorPosition(pos);
    const textBefore = value.substring(0, pos);
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || textBefore[lastAt - 1] === ' ')) {
      const filter = textBefore.substring(lastAt + 1);
      if (!filter.includes(' ') || filter.length < 20) {
        setMentionFilter(filter.toLowerCase());
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredProfiles = profiles.filter(
    p => p.id !== user?.id && p.nome.toLowerCase().includes(mentionFilter)
  );

  const getInitials = (nome: string) =>
    nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const renderConteudo = (text: string, mencoes: string[]) => {
    const parts = text.split(/(@\w[\w\s]*?)(?=\s@|\s*$|[,.]|\s)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.substring(1).trim();
        const isMentioned = profiles.some(
          p => p.nome.toLowerCase().startsWith(name.toLowerCase()) && mencoes.includes(p.id)
        );
        if (isMentioned) {
          return (
            <span key={i} className="bg-primary/20 text-primary font-medium rounded px-1">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const renderFileAttachment = (url: string, nome: string, isOwnMessage: boolean) => {
    const isImage = isImageFile(nome);
    if (isImage) {
      return (
        <div className="mt-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={nome}
              className="max-w-[280px] max-h-[200px] rounded-md object-cover border cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
          <div className="flex items-center gap-1 mt-1">
            <ImageIcon className="w-3 h-3 text-muted-foreground" />
            <span className={cn("text-xs", isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground")}>{nome}</span>
          </div>
        </div>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-2 flex items-center gap-2 px-3 py-2 rounded-md border transition-colors",
          isOwnMessage
            ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
            : "border-border hover:bg-accent"
        )}
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span className="text-xs truncate max-w-[200px]">{nome}</span>
        <Download className="w-3 h-3 shrink-0 ml-auto" />
      </a>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {mensagens.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Inicie a conversa!
          </div>
        ) : (
          mensagens.map((msg) => {
            const isOwn = msg.autor_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(msg.autor?.nome || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("max-w-[70%] group", isOwn && "items-end")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{msg.autor?.nome || 'Desconhecido'}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {renderConteudo(msg.conteudo, msg.mencoes)}
                    {msg.arquivo_url && msg.arquivo_nome && renderFileAttachment(msg.arquivo_url, msg.arquivo_nome, isOwn)}
                  </div>
                  {msg.mencoes.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {msg.mencoes.map(uid => {
                        const p = profiles.find(pr => pr.id === uid);
                        return p ? (
                          <Badge key={uid} variant="outline" className="text-[10px] px-1.5 py-0">
                            @{p.nome.split(' ')[0]}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
          {pendingFilePreview ? (
            <img src={pendingFilePreview} alt="" className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pendingFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(pendingFile.size / 1024).toFixed(0)} KB
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearPendingFile}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="border-t pt-3 relative">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
        {showMentions && filteredProfiles.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-64 bg-popover border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
            {filteredProfiles.slice(0, 8).map(p => (
              <button
                key={p.id}
                onClick={() => insertMention(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(p.nome)}
                  </AvatarFallback>
                </Avatar>
                {p.nome}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={conteudo}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... Use @ para mencionar"
            rows={2}
            className="resize-none flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!conteudo.trim() && !pendingFile) || isSending}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}