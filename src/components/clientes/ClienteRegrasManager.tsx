import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Edit2, Trash2, FileText, GripVertical, X, Upload, Paperclip } from "lucide-react";
import { FilePreview } from "@/components/ui/file-preview";
import { PdfFilePreview } from "@/components/ui/pdf-file-preview";
import { RegraFieldsBuilder, type RegraCampo } from "./RegraFieldsBuilder";

interface Regra {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  anexo_url: string | null;
  anexo_nome: string | null;
  campos: RegraCampo[];
}

interface ClienteRegrasManagerProps {
  clienteId: string;
  readOnly?: boolean;
}

const CATEGORIAS = [
  { value: "geral", label: "Geral" },
  { value: "licitacao", label: "Licitações" },
  { value: "documento", label: "Documentos" },
  { value: "workflow", label: "Workflows" },
  { value: "financeiro", label: "Financeiro" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "prazo", label: "Prazos" },
  { value: "outro", label: "Outro" },
];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
];

export function ClienteRegrasManager({ clienteId, readOnly = false }: ClienteRegrasManagerProps) {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<Regra | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    categoria: "geral",
    anexo_url: null as string | null,
    anexo_nome: null as string | null,
    campos: [] as RegraCampo[],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const fetchRegras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cliente_regras")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("ativo", true)
      .order("categoria")
      .order("ordem");

    if (error) {
      console.error("Error fetching regras:", error);
    } else {
      const parsed = (data || []).map((r: any) => ({
        ...r,
        campos: Array.isArray(r.campos) ? r.campos : [],
      }));
      setRegras(parsed);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clienteId) {
      fetchRegras();
    }
  }, [clienteId]);

  const handleOpenDialog = (regra?: Regra) => {
    if (regra) {
      setEditingRegra(regra);
      setFormData({
        titulo: regra.titulo,
        descricao: regra.descricao,
        categoria: regra.categoria,
        anexo_url: regra.anexo_url,
        anexo_nome: regra.anexo_nome,
        campos: regra.campos || [],
      });
    } else {
      setEditingRegra(null);
      setFormData({ titulo: "", descricao: "", categoria: "geral", anexo_url: null, anexo_nome: null, campos: [] });
    }
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não permitido",
        description: "Apenas PDF, Word, Excel e imagens são permitidos",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${clienteId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("regras-anexos")
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("regras-anexos")
      .getPublicUrl(fileName);

    setFormData(prev => ({
      ...prev,
      anexo_url: publicUrl,
      anexo_nome: file.name,
    }));

    setUploading(false);
    toast({ title: "Arquivo enviado com sucesso" });
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({
      ...prev,
      anexo_url: null,
      anexo_nome: null,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o título e a descrição da regra",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const payload = {
      titulo: formData.titulo,
      descricao: formData.descricao,
      categoria: formData.categoria,
      anexo_url: formData.anexo_url,
      anexo_nome: formData.anexo_nome,
      campos: JSON.parse(JSON.stringify(formData.campos)),
    };

    if (editingRegra) {
      const { error } = await supabase
        .from("cliente_regras")
        .update(payload)
        .eq("id", editingRegra.id);

      if (error) {
        toast({ title: "Erro ao atualizar regra", variant: "destructive" });
      } else {
        toast({ title: "Regra atualizada com sucesso" });
        fetchRegras();
        setDialogOpen(false);
      }
    } else {
      const maxOrdem = regras.length > 0 ? Math.max(...regras.map(r => r.ordem)) + 1 : 0;

      const { error } = await supabase.from("cliente_regras").insert({
        cliente_id: clienteId,
        titulo: payload.titulo,
        descricao: payload.descricao,
        categoria: payload.categoria,
        anexo_url: payload.anexo_url,
        anexo_nome: payload.anexo_nome,
        campos: payload.campos,
        ordem: maxOrdem,
      });

      if (error) {
        toast({ title: "Erro ao criar regra", variant: "destructive" });
      } else {
        toast({ title: "Regra criada com sucesso" });
        fetchRegras();
        setDialogOpen(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("cliente_regras")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir regra", variant: "destructive" });
    } else {
      toast({ title: "Regra excluída" });
      fetchRegras();
    }
  };

  const groupedRegras = regras.reduce((acc, regra) => {
    if (!acc[regra.categoria]) {
      acc[regra.categoria] = [];
    }
    acc[regra.categoria].push(regra);
    return acc;
  }, {} as Record<string, Regra[]>);

  const getCategoriaLabel = (value: string) => {
    return CATEGORIAS.find(c => c.value === value)?.label || value;
  };

  const FIELD_TYPE_LABELS: Record<string, string> = {
    texto: "Texto",
    numero: "Número",
    data: "Data",
    booleano: "Sim/Não",
    selecao: "Seleção",
    textarea: "Texto longo",
    email: "E-mail",
    telefone: "Telefone",
    moeda: "Moeda (R$)",
    percentual: "Percentual (%)",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Regras Específicas do Cliente
          </h3>
          <p className="text-sm text-muted-foreground">
            Regras e procedimentos específicos para este cliente
          </p>
        </div>
        {isAdmin && !readOnly && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRegra ? "Editar Regra" : "Nova Regra"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select
                      value={formData.categoria}
                      onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Prazo mínimo para envio de propostas"
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva a regra em detalhes..."
                    rows={3}
                  />
                </div>

                {/* Form Fields Builder */}
                <RegraFieldsBuilder
                  campos={formData.campos}
                  onChange={(campos) => setFormData({ ...formData, campos })}
                />

                <div>
                  <Label>Anexo (opcional)</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  {formData.anexo_url ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{formData.anexo_nome}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleRemoveFile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Anexar arquivo
                        </>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel ou imagens (máx. 10MB)
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {regras.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma regra específica cadastrada para este cliente.</p>
            {isAdmin && !readOnly && (
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeira regra
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRegras).map(([categoria, categRegras]) => (
            <Card key={categoria}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline">{getCategoriaLabel(categoria)}</Badge>
                  <span className="text-muted-foreground text-sm">
                    ({categRegras.length} {categRegras.length === 1 ? "regra" : "regras"})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {categRegras.map((regra) => (
                    <div
                      key={regra.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
                    >
                      <div className="flex-shrink-0 text-muted-foreground">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{regra.titulo}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {regra.descricao}
                        </p>
                        {regra.campos && regra.campos.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {regra.campos.map((campo) => (
                              <Badge key={campo.id} variant="secondary" className="text-xs">
                                {campo.nome} ({FIELD_TYPE_LABELS[campo.tipo] || campo.tipo})
                                {campo.obrigatorio && " *"}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {regra.anexo_url && (
                          <div className="mt-3">
                            {(regra.anexo_nome || regra.anexo_url).toLowerCase().includes('.pdf') ? (
                              <PdfFilePreview
                                url={regra.anexo_url}
                                fileName={regra.anexo_nome || undefined}
                                compact
                              />
                            ) : (
                              <FilePreview
                                url={regra.anexo_url}
                                fileName={regra.anexo_nome || undefined}
                                compact
                              />
                            )}
                          </div>
                        )}
                      </div>
                      {isAdmin && !readOnly && (
                        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(regra)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(regra.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
