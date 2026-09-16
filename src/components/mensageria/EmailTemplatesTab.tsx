import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Mail, Edit, Trash2, Eye, Search, Sparkles, Type, Workflow } from 'lucide-react';
import { DefaultEditor } from 'react-simple-wysiwyg';

interface CTA {
  texto: string;
  url: string;
  cor?: string;
}

interface EmailTemplate {
  id: string;
  cliente_id: string;
  nome: string;
  assunto: string;
  conteudo_html: string;
  conteudo_texto: string | null;
  evento: string;
  variaveis: string[];
  cta_texto: string | null;
  cta_url: string | null;
  ctas: CTA[];
  workflow_etapa_id: string | null;
  ativo: boolean;
  created_at: string;
}

interface WorkflowEtapa {
  id: string;
  nome: string;
  workflow_id: string;
  workflow_nome: string;
}

const EVENTOS_DISPONIVEIS = [
  { value: 'nova_licitacao', label: 'Nova Licitação' },
  { value: 'prazo_licitacao', label: 'Prazo de Licitação' },
  { value: 'resultado_licitacao', label: 'Resultado de Licitação' },
  { value: 'nova_tarefa', label: 'Nova Tarefa' },
  { value: 'tarefa_concluida', label: 'Tarefa Concluída' },
  { value: 'ticket_aberto', label: 'Ticket Aberto' },
  { value: 'ticket_respondido', label: 'Ticket Respondido' },
  { value: 'ticket_resolvido', label: 'Ticket Resolvido' },
  { value: 'novo_empenho', label: 'Novo Empenho' },
  { value: 'vencimento_contrato', label: 'Vencimento de Contrato' },
  { value: 'boas_vindas', label: 'Boas-vindas' },
  { value: 'relatorio_semanal', label: 'Relatório Semanal' },
  { value: 'relatorio_mensal', label: 'Relatório Mensal' },
  { value: 'etapa_workflow', label: 'Etapa do Workflow' },
  { value: 'custom', label: 'Personalizado' },
];

const VARIAVEIS_DISPONIVEIS = [
  { key: '{{nome_cliente}}', label: 'Nome do Cliente', category: 'cliente' },
  { key: '{{cnpj_cliente}}', label: 'CNPJ do Cliente', category: 'cliente' },
  { key: '{{endereco_cliente}}', label: 'Endereço do Cliente', category: 'cliente' },
  { key: '{{telefone_cliente}}', label: 'Telefone do Cliente', category: 'cliente' },
  { key: '{{email_cliente}}', label: 'Email do Cliente', category: 'cliente' },
  { key: '{{nome_usuario}}', label: 'Nome do Usuário', category: 'usuario' },
  { key: '{{email_usuario}}', label: 'Email do Usuário', category: 'usuario' },
  { key: '{{cargo_usuario}}', label: 'Cargo do Usuário', category: 'usuario' },
  { key: '{{titulo_licitacao}}', label: 'Título da Licitação', category: 'licitacao' },
  { key: '{{numero_licitacao}}', label: 'Número da Licitação', category: 'licitacao' },
  { key: '{{orgao}}', label: 'Órgão', category: 'licitacao' },
  { key: '{{modalidade}}', label: 'Modalidade', category: 'licitacao' },
  { key: '{{data_abertura}}', label: 'Data de Abertura', category: 'licitacao' },
  { key: '{{valor_estimado}}', label: 'Valor Estimado', category: 'licitacao' },
  { key: '{{titulo_tarefa}}', label: 'Título da Tarefa', category: 'tarefa' },
  { key: '{{data_vencimento}}', label: 'Data de Vencimento', category: 'tarefa' },
  { key: '{{link}}', label: 'Link', category: 'sistema' },
  { key: '{{data_atual}}', label: 'Data Atual', category: 'sistema' },
  { key: '{{ano_atual}}', label: 'Ano Atual', category: 'sistema' },
];

const CATEGORIAS_VARIAVEIS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'usuario', label: 'Usuário' },
  { key: 'licitacao', label: 'Licitação' },
  { key: 'tarefa', label: 'Tarefa' },
  { key: 'sistema', label: 'Sistema' },
];

export function EmailTemplatesTab() {
  const { profile, isAdmin } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [workflowEtapas, setWorkflowEtapas] = useState<WorkflowEtapa[]>([]);
  const [showVariablesFor, setShowVariablesFor] = useState<'conteudo' | 'assinatura' | null>(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    nome: '',
    assunto: '',
    conteudo_html: '',
    conteudo_texto: '',
    evento: '',
    variaveis: [] as string[],
    cta_texto: '',
    cta_url: '',
    ctas: [] as CTA[],
    workflow_etapa_id: '',
    ativo: true
  });

  useEffect(() => {
    if (isAdmin) {
      fetchClientes();
    }
    fetchAllTemplates();
  }, [isAdmin]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setClientes(data || []);
  };

  const fetchAllTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('nome');

      if (!isAdmin && profile?.cliente_id) {
        query = query.eq('cliente_id', profile.cliente_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      const mappedData = (data || []).map(t => ({
        ...t,
        ctas: (Array.isArray(t.ctas) ? t.ctas as unknown as CTA[] : [])
      }));
      setTemplates(mappedData);
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowEtapas = async (clienteId: string) => {
    try {
      const { data: workflows } = await supabase
        .from('licitacao_workflows')
        .select('id, nome')
        .eq('cliente_id', clienteId)
        .eq('ativo', true);

      if (!workflows || workflows.length === 0) {
        setWorkflowEtapas([]);
        return;
      }

      const workflowIds = workflows.map(w => w.id);
      const { data: etapas } = await supabase
        .from('workflow_etapas')
        .select('id, nome, workflow_id')
        .in('workflow_id', workflowIds)
        .order('ordem');

      if (etapas) {
        const etapasWithWorkflow = etapas.map(e => ({
          ...e,
          workflow_nome: workflows.find(w => w.id === e.workflow_id)?.nome || ''
        }));
        setWorkflowEtapas(etapasWithWorkflow);
      }
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
    }
  };

  useEffect(() => {
    if (formData.cliente_id) {
      fetchWorkflowEtapas(formData.cliente_id);
    } else {
      setWorkflowEtapas([]);
    }
  }, [formData.cliente_id]);

  const handleSave = async () => {
    if (!formData.cliente_id || !formData.nome.trim() || !formData.assunto.trim() || !formData.conteudo_html.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const ctasToSave = formData.ctas.length > 0 
        ? formData.ctas 
        : (formData.cta_texto && formData.cta_url 
          ? [{ texto: formData.cta_texto, url: formData.cta_url }] 
          : []);

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            cliente_id: formData.cliente_id,
            nome: formData.nome,
            assunto: formData.assunto,
            conteudo_html: formData.conteudo_html,
            conteudo_texto: formData.conteudo_texto || null,
            evento: formData.evento,
            variaveis: formData.variaveis,
            cta_texto: formData.ctas[0]?.texto || formData.cta_texto || null,
            cta_url: formData.ctas[0]?.url || formData.cta_url || null,
            ctas: ctasToSave as unknown as null,
            workflow_etapa_id: formData.workflow_etapa_id || null,
            ativo: formData.ativo
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template atualizado!');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert([{
            cliente_id: formData.cliente_id,
            nome: formData.nome,
            assunto: formData.assunto,
            conteudo_html: formData.conteudo_html,
            conteudo_texto: formData.conteudo_texto || null,
            evento: formData.evento,
            variaveis: formData.variaveis,
            cta_texto: formData.ctas[0]?.texto || formData.cta_texto || null,
            cta_url: formData.ctas[0]?.url || formData.cta_url || null,
            ctas: ctasToSave as unknown as null,
            workflow_etapa_id: formData.workflow_etapa_id || null,
            ativo: formData.ativo,
            created_by: profile?.id
          }]);

        if (error) throw error;
        toast.success('Template criado!');
      }

      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      fetchAllTemplates();
    } catch (error: any) {
      toast.error('Erro ao salvar template: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template excluído!');
      fetchAllTemplates();
    } catch (error: any) {
      toast.error('Erro ao excluir template: ' + error.message);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    const existingCtas = template.ctas?.length > 0 
      ? template.ctas 
      : (template.cta_texto && template.cta_url 
        ? [{ texto: template.cta_texto, url: template.cta_url }] 
        : []);
    
    setFormData({
      cliente_id: template.cliente_id,
      nome: template.nome,
      assunto: template.assunto,
      conteudo_html: template.conteudo_html,
      conteudo_texto: template.conteudo_texto || '',
      evento: template.evento,
      variaveis: template.variaveis || [],
      cta_texto: template.cta_texto || '',
      cta_url: template.cta_url || '',
      ctas: existingCtas,
      workflow_etapa_id: template.workflow_etapa_id || '',
      ativo: template.ativo
    });
    setShowForm(true);
  };

  const handleToggleAtivo = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ ativo: !template.ativo })
        .eq('id', template.id);

      if (error) throw error;
      setTemplates(prev =>
        prev.map(t => t.id === template.id ? { ...t, ativo: !t.ativo } : t)
      );
    } catch (error: any) {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: profile?.cliente_id || '',
      nome: '',
      assunto: '',
      conteudo_html: '',
      conteudo_texto: '',
      evento: '',
      variaveis: [],
      cta_texto: '',
      cta_url: '',
      ctas: [],
      workflow_etapa_id: '',
      ativo: true
    });
    setWorkflowEtapas([]);
  };

  const addCTA = () => {
    setFormData(prev => ({
      ...prev,
      ctas: [...prev.ctas, { texto: '', url: '', cor: '' }]
    }));
  };

  const removeCTA = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ctas: prev.ctas.filter((_, i) => i !== index)
    }));
  };

  const updateCTA = (index: number, field: keyof CTA, value: string) => {
    setFormData(prev => ({
      ...prev,
      ctas: prev.ctas.map((cta, i) => 
        i === index ? { ...cta, [field]: value } : cta
      )
    }));
  };

  const insertVariable = (variable: string, field: 'conteudo_html' | 'conteudo_texto') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] + variable,
      variaveis: prev.variaveis.includes(variable) ? prev.variaveis : [...prev.variaveis, variable]
    }));
    setShowVariablesFor(null);
  };

  const filteredTemplates = templates.filter(t =>
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.evento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEventoLabel = (evento: string) => {
    return EVENTOS_DISPONIVEIS.find(e => e.value === evento)?.label || evento;
  };

  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || 'Cliente não encontrado';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Templates de Email</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {isAdmin && (
                <Button onClick={() => { resetForm(); setEditingTemplate(null); setShowForm(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className={`${!template.ativo ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">{template.nome}</h4>
                    </div>
                    <Switch
                      checked={template.ativo}
                      onCheckedChange={() => handleToggleAtivo(template)}
                      disabled={!isAdmin}
                    />
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {getClienteNome(template.cliente_id)}
                    </p>
                  )}
                  <Badge variant="secondary" className="mb-2">
                    {getEventoLabel(template.evento)}
                  </Badge>
                  {template.workflow_etapa_id && (
                    <Badge variant="outline" className="mb-2 ml-1">
                      <Workflow className="h-3 w-3 mr-1" />
                      Etapa Workflow
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.assunto}
                  </p>
                  {(template.ctas?.length > 0 || template.cta_texto) && (
                    <Badge variant="outline" className="mb-3">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {template.ctas?.length > 0 
                        ? `${template.ctas.length} CTA${template.ctas.length > 1 ? 's' : ''}`
                        : `CTA: ${template.cta_texto}`
                      }
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPreviewTemplate(template); setShowPreview(true); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum template encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Cliente Selection */}
            {isAdmin && (
              <div>
                <Label>Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value, workflow_etapa_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Template *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Notificação Nova Licitação"
                />
              </div>
              <div>
                <Label>Evento *</Label>
                <Select
                  value={formData.evento}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, evento: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENTOS_DISPONIVEIS.map(e => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Workflow Step Selection */}
            {formData.cliente_id && workflowEtapas.length > 0 && (
              <div>
                <Label>Vincular a Etapa do Workflow (opcional)</Label>
                <Select
                  value={formData.workflow_etapa_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, workflow_etapa_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {workflowEtapas.map(etapa => (
                      <SelectItem key={etapa.id} value={etapa.id}>
                        {etapa.workflow_nome} → {etapa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Se vinculado, o email será disparado quando a licitação entrar nesta etapa.
                </p>
              </div>
            )}

            <div>
              <Label>Assunto do Email *</Label>
              <Input
                value={formData.assunto}
                onChange={(e) => setFormData(prev => ({ ...prev, assunto: e.target.value }))}
                placeholder="Ex: Nova licitação disponível: {{titulo_licitacao}}"
              />
            </div>

            {/* Conteúdo HTML - WYSIWYG Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo do Email *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariablesFor(showVariablesFor === 'conteudo' ? null : 'conteudo')}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Inserir Variável
                </Button>
              </div>
              
              {showVariablesFor === 'conteudo' && (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-sm text-muted-foreground">Clique em uma variável para inserir no conteúdo:</p>
                  {CATEGORIAS_VARIAVEIS.map(cat => (
                    <div key={cat.key}>
                      <span className="text-xs font-semibold text-muted-foreground">{cat.label}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {VARIAVEIS_DISPONIVEIS.filter(v => v.category === cat.key).map(v => (
                          <Button
                            key={v.key}
                            variant="secondary"
                            size="sm"
                            onClick={() => insertVariable(v.key, 'conteudo_html')}
                            className="text-xs h-6 px-2"
                          >
                            {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <DefaultEditor
                  value={formData.conteudo_html}
                  onChange={(e) => setFormData(prev => ({ ...prev, conteudo_html: e.target.value }))}
                  style={{ minHeight: '200px' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use a barra de ferramentas para formatar o texto: negrito, itálico, listas, links, etc.
              </p>
            </div>

            {/* Assinatura */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assinatura do Email</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVariablesFor(showVariablesFor === 'assinatura' ? null : 'assinatura')}
                >
                  <Type className="h-4 w-4 mr-1" />
                  Inserir Variável
                </Button>
              </div>
              
              {showVariablesFor === 'assinatura' && (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <p className="text-sm text-muted-foreground">Clique em uma variável para inserir na assinatura:</p>
                  {CATEGORIAS_VARIAVEIS.map(cat => (
                    <div key={cat.key}>
                      <span className="text-xs font-semibold text-muted-foreground">{cat.label}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {VARIAVEIS_DISPONIVEIS.filter(v => v.category === cat.key).map(v => (
                          <Button
                            key={v.key}
                            variant="secondary"
                            size="sm"
                            onClick={() => insertVariable(v.key, 'conteudo_texto')}
                            className="text-xs h-6 px-2"
                          >
                            {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <DefaultEditor
                  value={formData.conteudo_texto || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, conteudo_texto: e.target.value }))}
                  style={{ minHeight: '100px' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A assinatura será adicionada ao final de cada email enviado.
              </p>
            </div>

            {/* Multiple CTAs Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>CTAs (Botões de Ação)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCTA}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar CTA
                </Button>
              </div>
              
              {formData.ctas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum CTA adicionado. Clique em "Adicionar CTA" para incluir botões de ação no email.
                </p>
              )}

              {formData.ctas.map((cta, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="col-span-4">
                    <Label className="text-xs">Texto do Botão</Label>
                    <Input
                      value={cta.texto}
                      onChange={(e) => updateCTA(index, 'texto', e.target.value)}
                      placeholder="Ex: Ver Licitação"
                    />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs">URL</Label>
                    <Input
                      value={cta.url}
                      onChange={(e) => updateCTA(index, 'url', e.target.value)}
                      placeholder="Ex: {{link}}"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Cor (hex)</Label>
                    <Input
                      value={cta.cor || ''}
                      onChange={(e) => updateCTA(index, 'cor', e.target.value)}
                      placeholder="#3B82F6"
                    />
                  </div>
                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCTA(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label>Template ativo</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.nome}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="bg-muted p-2 rounded">
                <strong>Assunto:</strong> {previewTemplate.assunto}
              </div>
              <div
                className="border rounded p-4 bg-white dark:bg-background"
                dangerouslySetInnerHTML={{ __html: previewTemplate.conteudo_html }}
              />
              {(previewTemplate.ctas?.length > 0 || previewTemplate.cta_texto) && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {previewTemplate.ctas?.length > 0 ? (
                    previewTemplate.ctas.map((cta, idx) => (
                      <Button 
                        key={idx} 
                        style={cta.cor ? { backgroundColor: cta.cor } : undefined}
                      >
                        {cta.texto}
                      </Button>
                    ))
                  ) : (
                    <Button>{previewTemplate.cta_texto}</Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}