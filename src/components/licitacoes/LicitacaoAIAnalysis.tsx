import { useState, useEffect, useRef } from 'react';
import { IAConfigBadge } from './IAConfigBadge';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import {
  Brain, Sparkles, Loader2, FileText, Upload, ChevronDown, Clock,
  AlertCircle, CheckCircle, History, Trash2, FileArchive, MessageSquare,
  Send, Star, StarOff, Download, FileDown, Eye
} from 'lucide-react';
import { FilePreview } from '@/components/ui/file-preview';
import { PdfFilePreview } from '@/components/ui/pdf-file-preview';

interface AnaliseIA {
  conteudo: string;
  arquivos_analisados: string[];
  data_analise: string;
  modelo: string;
}

interface LicitacaoAnalise {
  id: string;
  licitacao_id: string;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  arquivos_analisados: string[] | null;
  resultado: AnaliseIA | null;
  status: string;
  erro: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  licitacao_id: string;
  pergunta: string;
  resposta: string | null;
  favorita: boolean;
  status: string;
  created_at: string;
}

interface Licitacao {
  id: string;
  numero: string;
  objeto: string;
  orgao: string;
  modalidade: string | null;
  valor_estimado: number | null;
  data_encerramento: string | null;
  analise_ia?: AnaliseIA | null;
  analise_ia_status?: string | null;
  analise_ia_data?: string | null;
}

interface Props {
  licitacao: Licitacao;
  clienteId?: string;
  onAnalysisComplete?: () => void;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const FILE_EXTENSIONS = ['.pdf', '.zip', '.doc', '.docx'];

export function LicitacaoAIAnalysis({ licitacao, clienteId, onAnalysisComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<LicitacaoAnalise[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('atual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [pergunta, setPergunta] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showFavoritas, setShowFavoritas] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnalysisHistory();
    fetchChatMessages();
  }, [licitacao.id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const fetchAnalysisHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('licitacao_analises')
        .select('*')
        .eq('licitacao_id', licitacao.id)
        .order('created_at', { ascending: false }) as { data: LicitacaoAnalise[] | null; error: unknown };

      if (error) throw error;
      setAnalysisHistory(data || []);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchChatMessages = async () => {
    setLoadingChat(true);
    try {
      const { data, error } = await supabase
        .from('licitacao_chat')
        .select('*')
        .eq('licitacao_id', licitacao.id)
        .order('created_at', { ascending: true }) as { data: ChatMessage[] | null; error: unknown };

      if (error) throw error;
      setChatMessages(data || []);
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isValidType = ALLOWED_FILE_TYPES.includes(file.type) || 
                        FILE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast.error('Tipo de arquivo não suportado. Use PDF, ZIP ou DOC/DOCX.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${licitacao.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('editais')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Erro ao fazer upload do arquivo');
      }

      const { data: urlData } = supabase.storage
        .from('editais')
        .getPublicUrl(fileName);

      const { data: analiseData, error: analiseError } = await supabase
        .from('licitacao_analises')
        .insert({
          licitacao_id: licitacao.id,
          arquivo_nome: file.name,
          arquivo_url: urlData.publicUrl,
          status: 'processando'
        })
        .select()
        .single();

      if (analiseError) throw analiseError;

      toast.info('Arquivo enviado. Iniciando análise com IA...');
      setAnalyzing(true);

      const response = await supabase.functions.invoke('analyze-licitacao', {
        body: {
          licitacaoId: licitacao.id,
          analiseId: analiseData.id,
          fileUrl: urlData.publicUrl,
          fileName: file.name,
          clienteId,
          licitacaoData: {
            numero: licitacao.numero,
            objeto: licitacao.objeto,
            orgao: licitacao.orgao,
            modalidade: licitacao.modalidade,
            valor_estimado: licitacao.valor_estimado,
            data_encerramento: licitacao.data_encerramento
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na análise');
      }

      toast.success('Análise concluída com sucesso!');
      fetchAnalysisHistory();
      onAnalysisComplete?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setUploading(false);
      setAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyzeWithoutFile = async () => {
    setAnalyzing(true);
    
    try {
      const { data: analiseData, error: analiseError } = await supabase
        .from('licitacao_analises')
        .insert({
          licitacao_id: licitacao.id,
          status: 'processando'
        })
        .select()
        .single();

      if (analiseError) throw analiseError;

      toast.info('Iniciando análise com IA...');

      const response = await supabase.functions.invoke('analyze-licitacao', {
        body: {
          licitacaoId: licitacao.id,
          analiseId: analiseData.id,
          clienteId,
          licitacaoData: {
            numero: licitacao.numero,
            objeto: licitacao.objeto,
            orgao: licitacao.orgao,
            modalidade: licitacao.modalidade,
            valor_estimado: licitacao.valor_estimado,
            data_encerramento: licitacao.data_encerramento
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro na análise');
      }

      toast.success('Análise concluída com sucesso!');
      fetchAnalysisHistory();
      onAnalysisComplete?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao analisar');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteAnalysis = async (analiseId: string) => {
    try {
      const { error } = await supabase
        .from('licitacao_analises')
        .delete()
        .eq('id', analiseId);

      if (error) throw error;

      toast.success('Análise removida');
      fetchAnalysisHistory();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Erro ao remover análise');
    }
  };

  const handleSendMessage = async () => {
    if (!pergunta.trim() || sendingMessage) return;

    setSendingMessage(true);
    const perguntaTexto = pergunta.trim();
    setPergunta('');

    try {
      // Create chat record first
      const { data: chatData, error: chatError } = await supabase
        .from('licitacao_chat')
        .insert({
          licitacao_id: licitacao.id,
          pergunta: perguntaTexto,
          status: 'processando'
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add to local state immediately
      setChatMessages(prev => [...prev, chatData as ChatMessage]);

      // Call AI
      const response = await supabase.functions.invoke('chat-edital', {
        body: {
          licitacaoId: licitacao.id,
          chatId: chatData.id,
          pergunta: perguntaTexto,
          clienteId
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao processar pergunta');
      }

      // Update local state with response
      setChatMessages(prev => prev.map(msg => 
        msg.id === chatData.id 
          ? { ...msg, status: 'concluida', resposta: response.data.resposta }
          : msg
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pergunta');
      fetchChatMessages();
    } finally {
      setSendingMessage(false);
    }
  };

  const handleToggleFavorita = async (chatId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('licitacao_chat')
        .update({ favorita: !currentValue })
        .eq('id', chatId);

      if (error) throw error;

      setChatMessages(prev => prev.map(msg => 
        msg.id === chatId ? { ...msg, favorita: !currentValue } : msg
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Erro ao atualizar favorito');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('licitacao_chat')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChatMessages(prev => prev.filter(msg => msg.id !== chatId));
      toast.success('Pergunta removida');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Erro ao remover pergunta');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 6;
    const maxWidth = pageWidth - 2 * margin;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      
      for (const line of lines) {
        if (yPos > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      }
    };

    const addSection = (title: string) => {
      yPos += 5;
      addText(title, 14, true);
      yPos += 2;
    };

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Análise de Licitação', margin, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nº ${licitacao.numero}`, margin, 30);
    
    yPos = 50;
    doc.setTextColor(0, 0, 0);

    // Informações Gerais
    addSection('Informações Gerais');
    addText(`Número: ${licitacao.numero}`);
    addText(`Órgão: ${licitacao.orgao}`);
    addText(`Objeto: ${licitacao.objeto}`);
    if (licitacao.modalidade) addText(`Modalidade: ${licitacao.modalidade}`);
    if (licitacao.valor_estimado) addText(`Valor Estimado: R$ ${licitacao.valor_estimado.toLocaleString('pt-BR')}`);
    if (licitacao.data_encerramento) addText(`Encerramento: ${format(new Date(licitacao.data_encerramento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`);

    // Última Análise
    const latestAnalysis = analysisHistory[0];
    if (latestAnalysis?.resultado) {
      addSection('Análise com IA');
      addText(`Data: ${format(new Date(latestAnalysis.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`);
      if (latestAnalysis.arquivo_nome) addText(`Arquivo: ${latestAnalysis.arquivo_nome}`);
      yPos += 3;
      
      // Clean markdown for PDF
      const cleanContent = latestAnalysis.resultado.conteudo
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .replace(/^-\s*/gm, '• ');
      addText(cleanContent, 9);
    }

    // Perguntas Favoritas
    const favoritas = chatMessages.filter(m => m.favorita && m.status === 'concluida');
    if (favoritas.length > 0) {
      addSection('Perguntas Salvas');
      favoritas.forEach((msg, i) => {
        yPos += 3;
        addText(`${i + 1}. Pergunta: ${msg.pergunta}`, 10, true);
        if (msg.resposta) {
          const cleanResposta = msg.resposta
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/^-\s*/gm, '• ');
          addText(`Resposta: ${cleanResposta}`, 9);
        }
      });
    }

    // Histórico do Chat
    const chatConcluido = chatMessages.filter(m => m.status === 'concluida');
    if (chatConcluido.length > 0) {
      addSection('Histórico de Perguntas');
      chatConcluido.forEach((msg, i) => {
        yPos += 2;
        addText(`${format(new Date(msg.created_at), 'dd/MM HH:mm')} - ${msg.pergunta}`, 9, true);
        if (msg.resposta) {
          const cleanResposta = msg.resposta
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/^-\s*/gm, '• ')
            .substring(0, 500);
          addText(cleanResposta + (msg.resposta.length > 500 ? '...' : ''), 8);
        }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - Página ${i} de ${pageCount}`,
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(`analise-licitacao-${licitacao.numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const renderAnalysisContent = (content: string) => {
    const rawHtml = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>');
    
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['strong', 'em', 'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'br', 'div', 'span'],
      ALLOWED_ATTR: ['class'],
    });

    return (
      <div 
        className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:text-sm [&_p]:mb-2 [&_ul]:text-sm [&_ul]:my-1 [&_li]:my-0.5"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }} 
      />
    );
  };

  const latestAnalysis = analysisHistory[0];
  const filteredChat = showFavoritas 
    ? chatMessages.filter(m => m.favorita)
    : chatMessages;
  const favoritasCount = chatMessages.filter(m => m.favorita).length;

  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <Label className="text-base font-semibold">Análise com IA</Label>
          {clienteId && <IAConfigBadge clienteId={clienteId} tipo="analise_edital" />}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportPDF}
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Upload/Analysis Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.zip,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <Button
          size="sm"
          onClick={handleFileSelect}
          disabled={uploading || analyzing}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload de Edital
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyzeWithoutFile}
          disabled={uploading || analyzing}
        >
          {analyzing && !uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analisar sem arquivo
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-3 flex-wrap h-auto gap-1">
          <TabsTrigger value="atual" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Chat ({chatMessages.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-1.5">
            <History className="h-4 w-4" />
            Histórico ({analysisHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Análise Atual */}
        <TabsContent value="atual">
          {loadingHistory ? (
            <Card className="bg-muted/30">
              <CardContent className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </CardContent>
            </Card>
          ) : latestAnalysis ? (
            <div className="space-y-3">
              {latestAnalysis.status === 'processando' ? (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium text-primary">Análise em andamento...</p>
                  </CardContent>
                </Card>
              ) : latestAnalysis.status === 'erro' ? (
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardContent className="py-4 text-center">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Erro na análise</p>
                    <p className="text-xs text-muted-foreground mt-1">{latestAnalysis.erro || 'Tente novamente'}</p>
                  </CardContent>
                </Card>
              ) : latestAnalysis.resultado ? (
                <div className="space-y-3">
                  {latestAnalysis.arquivo_nome && (
                    <div className="flex items-center gap-2 text-xs">
                      <FileArchive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Arquivo:</span>
                      <Badge variant="outline" className="text-xs">{latestAnalysis.arquivo_nome}</Badge>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Análise: {format(new Date(latestAnalysis.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>

                  <Card className="bg-muted/30">
                    <CardContent className="py-4">
                      {renderAnalysisContent(latestAnalysis.resultado.conteudo)}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-6 text-center">
                <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma análise realizada</p>
                <p className="text-xs text-muted-foreground mt-1">Faça upload de um arquivo ou analise sem arquivo</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Chat com Edital */}
        <TabsContent value="chat">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Perguntas sobre o Edital
                </CardTitle>
                {favoritasCount > 0 && (
                  <Button
                    size="sm"
                    variant={showFavoritas ? "default" : "outline"}
                    onClick={() => setShowFavoritas(!showFavoritas)}
                    className="h-7 text-xs"
                  >
                    <Star className={`h-3 w-3 mr-1 ${showFavoritas ? 'fill-current' : ''}`} />
                    Salvas ({favoritasCount})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[300px] pr-4">
                {loadingChat ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChat.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {showFavoritas ? 'Nenhuma pergunta salva' : 'Faça uma pergunta sobre o edital'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredChat.map((msg) => (
                      <div key={msg.id} className="space-y-2">
                        {/* Pergunta */}
                        <div className="flex items-start gap-2">
                          <div className="flex-1 bg-primary/10 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">{msg.pergunta}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleToggleFavorita(msg.id, msg.favorita)}
                                >
                                  {msg.favorita ? (
                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                  ) : (
                                    <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => handleDeleteChat(msg.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(msg.created_at), 'dd/MM HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Resposta */}
                        {msg.status === 'processando' ? (
                          <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processando...
                          </div>
                        ) : msg.resposta ? (
                          <div className="ml-4 bg-muted/50 rounded-lg p-3">
                            {renderAnalysisContent(msg.resposta)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de Pergunta */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Textarea
                  placeholder="Faça uma pergunta sobre o edital..."
                  value={pergunta}
                  onChange={(e) => setPergunta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                  disabled={sendingMessage}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!pergunta.trim() || sendingMessage}
                  className="shrink-0"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico">
          {loadingHistory ? (
            <Card className="bg-muted/30">
              <CardContent className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              </CardContent>
            </Card>
          ) : analysisHistory.length === 0 ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-6 text-center">
                <History className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma análise no histórico</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {analysisHistory.map((analise) => (
                <Collapsible
                  key={analise.id}
                  open={expandedAnalysis === analise.id}
                  onOpenChange={() => setExpandedAnalysis(expandedAnalysis === analise.id ? null : analise.id)}
                >
                  <Card className="bg-muted/20">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {analise.status === 'concluida' ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : analise.status === 'processando' ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {format(new Date(analise.created_at), 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                              {analise.arquivo_nome && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {analise.arquivo_nome}
                                  </p>
                                  {analise.arquivo_url && (
                                    (analise.arquivo_nome || analise.arquivo_url).toLowerCase().includes('.pdf') ? (
                                      <PdfFilePreview
                                        url={analise.arquivo_url}
                                        fileName={analise.arquivo_nome || undefined}
                                        compact
                                      />
                                    ) : (
                                      <FilePreview
                                        url={analise.arquivo_url}
                                        fileName={analise.arquivo_nome}
                                        compact
                                      />
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              analise.status === 'concluida' ? 'default' :
                              analise.status === 'processando' ? 'secondary' : 'destructive'
                            }>
                              {analise.status === 'concluida' ? 'Concluída' :
                               analise.status === 'processando' ? 'Processando' : 'Erro'}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAnalysis(analise.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </Button>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedAnalysis === analise.id ? 'rotate-180' : ''}`} />
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        {analise.resultado ? (
                          <div className="bg-background rounded-lg p-3">
                            {renderAnalysisContent(analise.resultado.conteudo)}
                          </div>
                        ) : analise.erro ? (
                          <p className="text-sm text-destructive">{analise.erro}</p>
                        ) : analise.status === 'processando' ? (
                          <p className="text-sm text-muted-foreground">Análise em andamento...</p>
                        ) : null}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
