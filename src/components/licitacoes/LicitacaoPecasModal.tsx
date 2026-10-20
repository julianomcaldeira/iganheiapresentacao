import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Loader2,
  FileWarning,
  Scale,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  Eye,
  Trash2,
  Edit,
  Save,
  X,
  FileDown,
  Palette,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  drawTimbradoTop,
  drawTimbradoLogo,
  drawTimbradoFooter,
  getDataUrlImageSize,
  LOGO_TOP,
} from '@/lib/timbradoPdf';
import { nomeArquivoPeca } from '@/lib/demoPdfGenerator';

interface Peca {
  id: string;
  tipo: string;
  titulo: string;
  descricao_solicitacao: string;
  conteudo_gerado: string | null;
  modelo_ia: string | null;
  status: string;
  erro: string | null;
  created_by: string | null;
  created_at: string;
  profile?: { nome: string };
}

interface ClienteData {
  nome: string;
  logo_url: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
}

interface LicitacaoPecasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licitacaoId: string;
  licitacaoNumero: string;
  clienteId: string;
}

const TIPOS_PECAS = [
  { value: 'pecas_impugnacao', label: 'Impugnação', icon: FileWarning, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { value: 'pecas_recurso', label: 'Recurso', icon: Scale, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { value: 'pecas_contrarrazoes', label: 'Contrarrazões', icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'pecas_esclarecimento', label: 'Esclarecimento', icon: HelpCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
];

type PDFLayout = 'professional' | 'minimal' | 'legal' | 'timbrado';

const PDF_LAYOUTS: { value: PDFLayout; label: string; description: string }[] = [
  { value: 'timbrado', label: 'Timbrado i-Ganhei', description: 'Papel timbrado padrão com o logo do cliente centralizado' },
  { value: 'professional', label: 'Profissional', description: 'Cabeçalho colorido com logo e dados completos' },
  { value: 'minimal', label: 'Minimalista', description: 'Layout limpo e simples, foco no conteúdo' },
  { value: 'legal', label: 'Jurídico Formal', description: 'Estilo tradicional de documento legal' },
];

export function LicitacaoPecasModal({
  open,
  onOpenChange,
  licitacaoId,
  licitacaoNumero,
  clienteId,
}: LicitacaoPecasModalProps) {
  const { user } = useAuth();
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('lista');
  const [selectedPeca, setSelectedPeca] = useState<Peca | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<PDFLayout>('timbrado');
  const [pecaToExport, setPecaToExport] = useState<Peca | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: 'pecas_impugnacao',
    titulo: '',
    descricao: '',
  });

  useEffect(() => {
    if (open && licitacaoId) {
      fetchPecas();
      fetchClienteData();
    }
  }, [open, licitacaoId, clienteId]);

  const fetchPecas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('licitacao_pecas')
        .select('*, profile:profiles(nome)')
        .eq('licitacao_id', licitacaoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPecas((data as unknown as Peca[]) || []);
    } catch (error) {
      console.error('Error fetching pecas:', error);
      toast.error('Erro ao carregar peças');
    } finally {
      setLoading(false);
    }
  };

  const fetchClienteData = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('nome, logo_url, cnpj, email, telefone, endereco, cidade, estado')
        .eq('id', clienteId)
        .single();

      if (error) throw error;
      setClienteData(data);

      // Pre-load logo image as base64 for PDF
      if (data?.logo_url) {
        try {
          const response = await fetch(data.logo_url);
          if (!response.ok) throw new Error(`Logo HTTP ${response.status}`);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setLogoImage(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Error loading logo:', err);
          toast.warning('Logo do cliente não pôde ser carregado para o timbrado — confira o arquivo em Clientes > Gerenciar clientes.');
        }
      }
    } catch (error) {
      console.error('Error fetching cliente:', error);
    }
  };

  const handleGenerate = async () => {
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      toast.error('Preencha o título e a descrição detalhada');
      return;
    }

    setGenerating(true);
    try {
      // Create the peca record first
      const { data: newPeca, error: insertError } = await supabase
        .from('licitacao_pecas')
        .insert({
          licitacao_id: licitacaoId,
          cliente_id: clienteId,
          tipo: formData.tipo,
          titulo: formData.titulo.trim(),
          descricao_solicitacao: formData.descricao.trim(),
          status: 'processando',
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.info('Gerando peça com IA, aguarde...');

      // Call the edge function to generate the content
      const { error: fnError } = await supabase.functions.invoke('generate-peca', {
        body: {
          pecaId: newPeca.id,
          licitacaoId,
          tipo: formData.tipo,
          titulo: formData.titulo.trim(),
          descricao: formData.descricao.trim(),
          clienteId,
        },
      });

      if (fnError) throw fnError;

      toast.success('Peça gerada com sucesso!');
      setFormData({ tipo: 'pecas_impugnacao', titulo: '', descricao: '' });
      setActiveTab('lista');
      fetchPecas();
    } catch (error: any) {
      console.error('Error generating peca:', error);
      toast.error(error.message || 'Erro ao gerar peça');
      fetchPecas(); // Refresh to see error status
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (peca: Peca) => {
    if (!confirm('Deseja excluir esta peça?')) return;

    try {
      const { error } = await supabase
        .from('licitacao_pecas')
        .delete()
        .eq('id', peca.id);

      if (error) throw error;
      toast.success('Peça excluída');
      fetchPecas();
      if (selectedPeca?.id === peca.id) setSelectedPeca(null);
    } catch (error) {
      console.error('Error deleting peca:', error);
      toast.error('Erro ao excluir peça');
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Conteúdo copiado para a área de transferência');
  };

  const handleDownload = (peca: Peca) => {
    if (!peca.conteudo_gerado) return;
    
    const blob = new Blob([peca.conteudo_gerado], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivoPeca(licitacaoNumero, peca.titulo).replace(/\.pdf$/i, '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado');
  };

  const openLayoutDialog = (peca: Peca) => {
    setPecaToExport(peca);
    setShowLayoutDialog(true);
  };

  const handleDownloadPDF = async () => {
    const peca = pecaToExport;
    if (!peca?.conteudo_gerado) return;
    
    setShowLayoutDialog(false);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const tipoPeca = getTipoPeca(peca.tipo);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Timbrado i-Ganhei: papel padrão + logo do cliente centralizado no cabeçalho
    const isTimbrado = selectedLayout === 'timbrado';
    let logoRatio = 3;
    if (isTimbrado && logoImage) {
      try {
        const size = await getDataUrlImageSize(logoImage);
        if (size.w > 0 && size.h > 0) logoRatio = size.w / size.h;
      } catch {}
    }
    let logoH = 0;
    if (logoImage) {
      logoH = 70 / logoRatio;
      if (logoH > 20) logoH = 20;
    }
    if (isTimbrado && !logoImage && clienteData && !clienteData.logo_url) {
      toast.info('Cliente sem logo cadastrado em Gerenciar clientes — exportando timbrado sem logo');
    }
    // faixa (12–18) + margem + logo (LOGO_TOP–LOGO_TOP+logoH) + títulos => início do conteúdo
    const timbradoHeaderHeight = LOGO_TOP + logoH + 26;

    // Layout-specific settings
    const layoutConfig = {
      professional: { headerHeight: 45, footerHeight: 25, headerColor: [79, 70, 229] as [number, number, number] },
      minimal: { headerHeight: 25, footerHeight: 15, headerColor: [255, 255, 255] as [number, number, number] },
      legal: { headerHeight: 35, footerHeight: 20, headerColor: [30, 30, 30] as [number, number, number] },
      timbrado: { headerHeight: timbradoHeaderHeight, footerHeight: 22, headerColor: [255, 255, 255] as [number, number, number] },
    };

    const config = layoutConfig[selectedLayout];

    const addProfessionalHeaderFooter = (pageNumber: number, totalPages: number) => {
      // Header background
      doc.setFillColor(...config.headerColor);
      doc.rect(0, 0, pageWidth, config.headerHeight, 'F');
      
      let textStartX = margin;
      if (logoImage) {
        try {
          doc.addImage(logoImage, 'JPEG', margin, 5, 25, 25);
          textStartX = margin + 30;
        } catch (err) {
          console.error('Error adding logo to PDF:', err);
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(tipoPeca?.label?.toUpperCase() || 'PEÇA JURÍDICA', textStartX, 12);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(peca.titulo, textStartX, 19);
      doc.text(`Licitação: ${licitacaoNumero}`, textStartX, 26);
      
      if (clienteData) {
        doc.setFontSize(8);
        doc.text(clienteData.nome, textStartX, 33);
        if (clienteData.cnpj) {
          doc.text(`CNPJ: ${clienteData.cnpj}`, textStartX, 38);
        }
      }

      // Footer
      doc.setFillColor(245, 245, 250);
      doc.rect(0, pageHeight - config.footerHeight, pageWidth, config.footerHeight, 'F');
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Gerado em: ${format(new Date(peca.created_at), "dd/MM/yyyy 'às' HH:mm")}`, margin, pageHeight - 16);
      if (peca.profile?.nome) {
        doc.text(`Por: ${peca.profile.nome}`, margin, pageHeight - 11);
      }
      
      if (clienteData) {
        const contactParts = [];
        if (clienteData.telefone) contactParts.push(clienteData.telefone);
        if (clienteData.email) contactParts.push(clienteData.email);
        if (contactParts.length > 0) {
          doc.text(contactParts.join(' | '), pageWidth / 2, pageHeight - 16, { align: 'center' });
        }
      }
      
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, pageHeight - 11, { align: 'right' });
    };

    const addMinimalHeaderFooter = (pageNumber: number, totalPages: number) => {
      // Minimal header - just title and line
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(peca.titulo, margin, 15);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, 20, pageWidth - margin, 20);
      
      // Minimal footer
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Página ${pageNumber}/${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    };

    const addLegalHeaderFooter = (pageNumber: number, totalPages: number) => {
      // Legal header - centered, formal style
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(14);
      doc.setFont('times', 'bold');
      doc.text(tipoPeca?.label?.toUpperCase() || 'PEÇA JURÍDICA', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      doc.text(peca.titulo, pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Licitação nº ${licitacaoNumero}`, pageWidth / 2, 28, { align: 'center' });
      
      // Double line separator
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.5);
      doc.line(margin, config.headerHeight - 2, pageWidth - margin, config.headerHeight - 2);
      doc.setLineWidth(0.2);
      doc.line(margin, config.headerHeight, pageWidth - margin, config.headerHeight);

      // Legal footer
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - config.footerHeight, pageWidth - margin, pageHeight - config.footerHeight);
      
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('times', 'normal');
      
      if (clienteData) {
        doc.text(clienteData.nome, margin, pageHeight - 12);
        if (clienteData.cnpj) {
          doc.text(`CNPJ: ${clienteData.cnpj}`, margin, pageHeight - 7);
        }
      }
      
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    const addTimbradoHeaderFooter = (pageNumber: number, totalPages: number) => {
      drawTimbradoTop(doc);
      const logoEndY = drawTimbradoLogo(doc, logoImage, LOGO_TOP, 70, 20, logoRatio);
      const titleY = logoEndY + 8;

      doc.setTextColor(30, 30, 30);
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text(tipoPeca?.label?.toUpperCase() || 'PEÇA JURÍDICA', pageWidth / 2, titleY, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text(peca.titulo, pageWidth / 2, titleY + 7, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Licitação nº ${licitacaoNumero}`, pageWidth / 2, titleY + 13, { align: 'center' });

      drawTimbradoFooter(
        doc,
        pageNumber,
        totalPages,
        clienteData ? { nome: clienteData.nome, cnpj: clienteData.cnpj } : null,
        peca.profile?.nome ? `Por: ${peca.profile.nome}` : null
      );
    };

    const addHeaderFooter = (pageNumber: number, totalPages: number) => {
      switch (selectedLayout) {
        case 'minimal':
          addMinimalHeaderFooter(pageNumber, totalPages);
          break;
        case 'legal':
          addLegalHeaderFooter(pageNumber, totalPages);
          break;
        case 'timbrado':
          addTimbradoHeaderFooter(pageNumber, totalPages);
          break;
        default:
          addProfessionalHeaderFooter(pageNumber, totalPages);
      }
    };

    // Content settings based on layout
    const useSerif = selectedLayout === 'legal' || selectedLayout === 'timbrado';
    doc.setFontSize(selectedLayout === 'legal' || selectedLayout === 'timbrado' ? 12 : 11);
    doc.setFont(useSerif ? 'times' : 'helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    
    const lines = doc.splitTextToSize(peca.conteudo_gerado, contentWidth);
    const lineHeight = selectedLayout === 'legal' || selectedLayout === 'timbrado' ? 7 : 6;
    const usableHeight = pageHeight - config.headerHeight - config.footerHeight - margin;
    const linesPerPage = Math.floor(usableHeight / lineHeight);
    const totalPages = Math.ceil(lines.length / linesPerPage);

    let currentLine = 0;
    for (let page = 1; page <= totalPages; page++) {
      if (page > 1) doc.addPage();
      addHeaderFooter(page, totalPages);

      const startY = config.headerHeight + 10;
      const pageLines = lines.slice(currentLine, currentLine + linesPerPage);

      doc.setFontSize(selectedLayout === 'legal' || selectedLayout === 'timbrado' ? 12 : 11);
      doc.setFont(selectedLayout === 'legal' || selectedLayout === 'timbrado' ? 'times' : 'helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      
      pageLines.forEach((line: string, index: number) => {
        doc.text(line, margin, startY + (index * lineHeight));
      });
      
      currentLine += linesPerPage;
    }

    doc.save(nomeArquivoPeca(licitacaoNumero, peca.titulo));
    toast.success('PDF exportado com sucesso');
    setPecaToExport(null);
  };

  const handleStartEdit = (peca: Peca) => {
    setEditedContent(peca.conteudo_gerado || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!selectedPeca) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('licitacao_pecas')
        .update({ conteudo_gerado: editedContent })
        .eq('id', selectedPeca.id);

      if (error) throw error;

      // Update local state
      setSelectedPeca({ ...selectedPeca, conteudo_gerado: editedContent });
      setPecas(pecas.map(p => 
        p.id === selectedPeca.id ? { ...p, conteudo_gerado: editedContent } : p
      ));
      
      setIsEditing(false);
      toast.success('Conteúdo salvo com sucesso');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Erro ao salvar conteúdo');
    } finally {
      setSaving(false);
    }
  };

  const getTipoPeca = (tipo: string) => TIPOS_PECAS.find(t => t.value === tipo);

  const getStatusBadge = (status: string, erro?: string | null) => {
    switch (status) {
      case 'processando':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case 'concluido':
        return (
          <Badge className="bg-green-500/20 text-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'erro':
        return (
          <Badge className="bg-red-500/20 text-red-600" title={erro || ''}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Peças Jurídicas - Licitação {licitacaoNumero}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lista">
              <FileText className="w-4 h-4 mr-2" />
              Peças Geradas ({pecas.length})
            </TabsTrigger>
            <TabsTrigger value="nova">
              <Plus className="w-4 h-4 mr-2" />
              Nova Peça
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="flex-1 mt-4 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pecas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="font-medium">Nenhuma peça gerada ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em "Nova Peça" para gerar uma peça jurídica com IA
                </p>
                <Button onClick={() => setActiveTab('nova')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Peça
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 h-full">
                {/* Lista de Peças */}
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {pecas.map((peca) => {
                      const tipoPeca = getTipoPeca(peca.tipo);
                      const Icon = tipoPeca?.icon || FileText;
                      const isSelected = selectedPeca?.id === peca.id;

                      return (
                        <Card
                          key={peca.id}
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
                          }`}
                          onClick={() => setSelectedPeca(peca)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${tipoPeca?.bgColor} ${tipoPeca?.color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{peca.titulo}</p>
                                  <p className="text-xs text-muted-foreground">{tipoPeca?.label}</p>
                                </div>
                              </div>
                              {getStatusBadge(peca.status, peca.erro)}
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(peca.created_at), "dd/MM/yy HH:mm")}
                              </span>
                              {peca.profile?.nome && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {peca.profile.nome}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Detalhes da Peça Selecionada */}
                <div className="border rounded-lg p-4 flex flex-col min-h-0">
                  {selectedPeca ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{selectedPeca.titulo}</h4>
                        <div className="flex gap-1">
                          {selectedPeca.conteudo_gerado && selectedPeca.status === 'concluido' && !isEditing && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(selectedPeca)}
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyContent(selectedPeca.conteudo_gerado!)}
                                title="Copiar"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(selectedPeca)}
                                title="Baixar TXT"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLayoutDialog(selectedPeca)}
                                title="Exportar PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {isEditing && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                title="Salvar"
                                className="text-green-600"
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDelete(selectedPeca)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-3">
                        <p><strong>Solicitação:</strong></p>
                        <p className="mt-1">{selectedPeca.descricao_solicitacao}</p>
                      </div>

                      {selectedPeca.status === 'processando' ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                            <p className="text-sm text-muted-foreground">Gerando conteúdo...</p>
                          </div>
                        </div>
                      ) : selectedPeca.status === 'erro' ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center text-destructive">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">{selectedPeca.erro || 'Erro ao gerar peça'}</p>
                          </div>
                        </div>
                      ) : selectedPeca.conteudo_gerado ? (
                        isEditing ? (
                          <Textarea
                            className="flex-1 min-h-[300px] font-sans text-sm resize-none"
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                          />
                        ) : (
                          <ScrollArea className="flex-1 border rounded-md p-3 bg-muted/30">
                            <pre className="text-sm whitespace-pre-wrap font-sans">
                              {selectedPeca.conteudo_gerado}
                            </pre>
                          </ScrollArea>
                        )
                      ) : null}

                      {selectedPeca.modelo_ia && !isEditing && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Modelo: {selectedPeca.modelo_ia}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <Eye className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Selecione uma peça para visualizar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nova" className="flex-1 mt-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Gerar Nova Peça com IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Peça *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_PECAS.map((t) => {
                          const Icon = t.icon;
                          return (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${t.color}`} />
                                {t.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Título da Peça *</Label>
                    <Input
                      placeholder="Ex: Impugnação - Requisitos Técnicos"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição Detalhada *</Label>
                  <Textarea
                    placeholder="Descreva detalhadamente todos os pontos que devem ser abordados na peça. Inclua os fundamentos, argumentos principais, cláusulas do edital questionadas, etc."
                    rows={8}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quanto mais detalhes você fornecer, melhor será o resultado gerado pela IA.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setActiveTab('lista')}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !formData.titulo.trim() || !formData.descricao.trim()}
                    className="gradient-primary text-primary-foreground"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar com IA
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Layout Selection Dialog */}
      <AlertDialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Selecionar Layout do PDF
            </AlertDialogTitle>
            <AlertDialogDescription>
              Escolha o estilo de formatação para o documento exportado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <RadioGroup
            value={selectedLayout}
            onValueChange={(v) => setSelectedLayout(v as PDFLayout)}
            className="space-y-3 my-4"
          >
            {PDF_LAYOUTS.map((layout) => (
              <div
                key={layout.value}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedLayout === layout.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedLayout(layout.value)}
              >
                <RadioGroupItem value={layout.value} id={layout.value} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={layout.value} className="font-medium cursor-pointer">
                    {layout.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{layout.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button onClick={handleDownloadPDF} className="gap-2">
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
