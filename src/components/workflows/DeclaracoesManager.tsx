import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, FileText, Copy, Eye, EyeOff, Variable } from 'lucide-react';

interface DeclaracoesManagerProps {
  clienteId: string;
  clienteNome: string;
  onClose: () => void;
}

interface Declaracao {
  id: string;
  nome: string;
  titulo: string;
  conteudo: string;
  variaveis: string[] | null;
  ativo: boolean;
}

const VARIAVEIS_DISPONIVEIS = [
  { nome: '{empresa_razao_social}', descricao: 'Razão social da empresa' },
  { nome: '{empresa_nome_fantasia}', descricao: 'Nome fantasia da empresa' },
  { nome: '{empresa_cnpj}', descricao: 'CNPJ da empresa' },
  { nome: '{empresa_endereco}', descricao: 'Endereço completo' },
  { nome: '{empresa_cidade}', descricao: 'Cidade' },
  { nome: '{empresa_estado}', descricao: 'Estado' },
  { nome: '{data_atual}', descricao: 'Data atual formatada' },
  { nome: '{licitacao_numero}', descricao: 'Número da licitação' },
  { nome: '{licitacao_orgao}', descricao: 'Órgão da licitação' },
  { nome: '{licitacao_objeto}', descricao: 'Objeto da licitação' },
  { nome: '{responsavel_nome}', descricao: 'Nome do responsável' },
  { nome: '{responsavel_cargo}', descricao: 'Cargo do responsável' },
];

export function DeclaracoesManager({ clienteId, clienteNome, onClose }: DeclaracoesManagerProps) {
  const [declaracoes, setDeclaracoes] = useState<Declaracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDeclaracao, setEditingDeclaracao] = useState<Declaracao | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    titulo: '',
    conteudo: '',
    variaveis: [] as string[],
    ativo: true,
  });

  useEffect(() => {
    fetchDeclaracoes();
  }, [clienteId]);

  const fetchDeclaracoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('declaracoes_templates')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar declarações');
    } else {
      setDeclaracoes(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (declaracao?: Declaracao) => {
    if (declaracao) {
      setEditingDeclaracao(declaracao);
      setFormData({
        nome: declaracao.nome,
        titulo: declaracao.titulo,
        conteudo: declaracao.conteudo,
        variaveis: declaracao.variaveis || [],
        ativo: declaracao.ativo,
      });
    } else {
      setEditingDeclaracao(null);
      setFormData({ nome: '', titulo: '', conteudo: '', variaveis: [], ativo: true });
    }
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim() || !formData.titulo.trim() || !formData.conteudo.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Extract variables from content
    const variaveisUsadas = VARIAVEIS_DISPONIVEIS
      .filter(v => formData.conteudo.includes(v.nome))
      .map(v => v.nome);

    if (editingDeclaracao) {
      const { error } = await supabase
        .from('declaracoes_templates')
        .update({
          nome: formData.nome,
          titulo: formData.titulo,
          conteudo: formData.conteudo,
          variaveis: variaveisUsadas,
          ativo: formData.ativo,
        })
        .eq('id', editingDeclaracao.id);

      if (error) {
        toast.error('Erro ao atualizar declaração');
      } else {
        toast.success('Declaração atualizada');
        fetchDeclaracoes();
        setShowDialog(false);
      }
    } else {
      const { error } = await supabase
        .from('declaracoes_templates')
        .insert({
          cliente_id: clienteId,
          nome: formData.nome,
          titulo: formData.titulo,
          conteudo: formData.conteudo,
          variaveis: variaveisUsadas,
          ativo: formData.ativo,
        });

      if (error) {
        toast.error('Erro ao criar declaração');
      } else {
        toast.success('Declaração criada');
        fetchDeclaracoes();
        setShowDialog(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('declaracoes_templates').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir declaração');
    } else {
      toast.success('Declaração excluída');
      setDeclaracoes(declaracoes.filter(d => d.id !== id));
    }
  };

  const handleToggleAtivo = async (declaracao: Declaracao) => {
    const { error } = await supabase
      .from('declaracoes_templates')
      .update({ ativo: !declaracao.ativo })
      .eq('id', declaracao.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      setDeclaracoes(declaracoes.map(d => 
        d.id === declaracao.id ? { ...d, ativo: !d.ativo } : d
      ));
    }
  };

  const handleDuplicate = async (declaracao: Declaracao) => {
    const { error } = await supabase
      .from('declaracoes_templates')
      .insert({
        cliente_id: clienteId,
        nome: `${declaracao.nome} (cópia)`,
        titulo: declaracao.titulo,
        conteudo: declaracao.conteudo,
        variaveis: declaracao.variaveis,
        ativo: true,
      });

    if (error) {
      toast.error('Erro ao duplicar declaração');
    } else {
      toast.success('Declaração duplicada');
      fetchDeclaracoes();
    }
  };

  const insertVariable = (variavel: string) => {
    setFormData({
      ...formData,
      conteudo: formData.conteudo + variavel,
    });
  };

  const getPreviewContent = (conteudo: string) => {
    let preview = conteudo;
    preview = preview.replace('{empresa_razao_social}', 'EMPRESA EXEMPLO LTDA');
    preview = preview.replace('{empresa_nome_fantasia}', 'Empresa Exemplo');
    preview = preview.replace('{empresa_cnpj}', '00.000.000/0001-00');
    preview = preview.replace('{empresa_endereco}', 'Rua Exemplo, 123, Centro');
    preview = preview.replace('{empresa_cidade}', 'São Paulo');
    preview = preview.replace('{empresa_estado}', 'SP');
    preview = preview.replace('{data_atual}', new Date().toLocaleDateString('pt-BR'));
    preview = preview.replace('{licitacao_numero}', 'PE 001/2024');
    preview = preview.replace('{licitacao_orgao}', 'Prefeitura Municipal');
    preview = preview.replace('{licitacao_objeto}', 'Aquisição de materiais de escritório');
    preview = preview.replace('{responsavel_nome}', 'João da Silva');
    preview = preview.replace('{responsavel_cargo}', 'Diretor');
    return preview;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold">Templates de Declarações</h2>
          <p className="text-sm text-muted-foreground">{clienteNome}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Declaração
          </Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {declaracoes.map(declaracao => (
              <motion.div
                key={declaracao.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className={!declaracao.ativo ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{declaracao.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{declaracao.titulo}</p>
                      </div>
                      <Badge variant={declaracao.ativo ? 'default' : 'secondary'}>
                        {declaracao.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {declaracao.conteudo}
                    </p>
                    
                    {declaracao.variaveis && declaracao.variaveis.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {declaracao.variaveis.map(v => (
                          <Badge key={v} variant="outline" className="text-xs">
                            <Variable className="h-3 w-3 mr-1" />
                            {v}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowPreview(showPreview === declaracao.id ? null : declaracao.id)}
                      >
                        {showPreview === declaracao.id ? (
                          <><EyeOff className="h-4 w-4 mr-1" /> Ocultar</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" /> Preview</>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenDialog(declaracao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDuplicate(declaracao)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleAtivo(declaracao)}
                      >
                        {declaracao.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDelete(declaracao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {showPreview === declaracao.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-muted rounded-lg"
                      >
                        <p className="text-xs font-semibold mb-2">Preview:</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {getPreviewContent(declaracao.conteudo)}
                        </p>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {declaracoes.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma declaração cadastrada</p>
            <p className="text-sm">Crie templates de declarações para este cliente</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDeclaracao ? 'Editar Declaração' : 'Nova Declaração'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Template *</Label>
                <Input 
                  value={formData.nome} 
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Declaração ME/EPP"
                />
              </div>
              <div>
                <Label>Título da Declaração *</Label>
                <Input 
                  value={formData.titulo} 
                  onChange={e => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ex: DECLARAÇÃO DE MICROEMPRESA"
                />
              </div>
            </div>

            <div>
              <Label>Variáveis Disponíveis</Label>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-muted rounded-lg">
                {VARIAVEIS_DISPONIVEIS.map(v => (
                  <Button
                    key={v.nome}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => insertVariable(v.nome)}
                    title={v.descricao}
                  >
                    <Variable className="h-3 w-3 mr-1" />
                    {v.nome}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Conteúdo *</Label>
              <Textarea 
                value={formData.conteudo} 
                onChange={e => setFormData({...formData, conteudo: e.target.value})}
                placeholder="Digite o conteúdo da declaração..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.ativo} 
                onCheckedChange={v => setFormData({...formData, ativo: v})}
              />
              <Label>Template ativo</Label>
            </div>

            {formData.conteudo && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">
                    {getPreviewContent(formData.conteudo)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              {editingDeclaracao ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
