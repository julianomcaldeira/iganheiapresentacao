import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Building, MoreVertical, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCNPJLookup } from '@/hooks/useCNPJLookup';
import { toast } from 'sonner';

interface Empresa {
  id: string;
  cliente_id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
}

interface EmpresasManagerProps {
  clienteId: string;
  clienteNome: string;
}

const emptyEmpresa = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  inscricao_municipal: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  email: '',
};

export function EmpresasManager({ clienteId, clienteNome }: EmpresasManagerProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyEmpresa);

  const { lookupCNPJ, isLoading: isCNPJLoading } = useCNPJLookup();

  const fetchEmpresas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('razao_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) {
      fetchEmpresas();
    }
  }, [clienteId]);

  const handleCNPJBlur = async () => {
    if (formData.cnpj && formData.cnpj.replace(/\D/g, '').length >= 14) {
      const data = await lookupCNPJ(formData.cnpj);
      if (data) {
        setFormData(prev => ({
          ...prev,
          razao_social: data.razaoSocial || prev.razao_social,
          nome_fantasia: data.nomeFantasia || prev.nome_fantasia,
          email: data.email || prev.email,
          telefone: data.telefone || prev.telefone,
          endereco: data.logradouro || prev.endereco,
          numero: data.numero || prev.numero,
          bairro: data.bairro || prev.bairro,
          cidade: data.cidade || prev.cidade,
          estado: data.estado || prev.estado,
          cep: data.cep || prev.cep,
        }));
      }
    }
  };

  const handleOpenDialog = (empresa?: Empresa) => {
    if (empresa) {
      setSelectedEmpresa(empresa);
      setFormData({
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj || '',
        inscricao_estadual: empresa.inscricao_estadual || '',
        inscricao_municipal: empresa.inscricao_municipal || '',
        cep: empresa.cep || '',
        endereco: empresa.endereco || '',
        numero: empresa.numero || '',
        complemento: empresa.complemento || '',
        bairro: empresa.bairro || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        telefone: empresa.telefone || '',
        email: empresa.email || '',
      });
    } else {
      setSelectedEmpresa(null);
      setFormData(emptyEmpresa);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.razao_social) {
      toast.error('A razão social é obrigatória');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        cliente_id: clienteId,
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia || null,
        cnpj: formData.cnpj || null,
        inscricao_estadual: formData.inscricao_estadual || null,
        inscricao_municipal: formData.inscricao_municipal || null,
        cep: formData.cep || null,
        endereco: formData.endereco || null,
        numero: formData.numero || null,
        complemento: formData.complemento || null,
        bairro: formData.bairro || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        telefone: formData.telefone || null,
        email: formData.email || null,
      };

      if (selectedEmpresa) {
        const { error } = await supabase
          .from('empresas')
          .update(payload)
          .eq('id', selectedEmpresa.id);

        if (error) throw error;
        toast.success('Empresa atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('empresas')
          .insert(payload);

        if (error) throw error;
        toast.success('Empresa criada com sucesso!');
      }

      setIsDialogOpen(false);
      fetchEmpresas();
    } catch (error: any) {
      console.error('Error saving empresa:', error);
      toast.error(error.message || 'Erro ao salvar empresa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmpresa) return;

    try {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', selectedEmpresa.id);

      if (error) throw error;
      
      toast.success('Empresa excluída com sucesso');
      setIsDeleteDialogOpen(false);
      setSelectedEmpresa(null);
      fetchEmpresas();
    } catch (error) {
      console.error('Error deleting empresa:', error);
      toast.error('Erro ao excluir empresa');
    }
  };

  const filteredEmpresas = empresas.filter(
    (e) =>
      e.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.cnpj?.includes(searchTerm)
  );

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredEmpresas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma empresa cadastrada</p>
          <p className="text-sm">Clique em "Nova Empresa" para adicionar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filteredEmpresas.map((empresa, index) => (
              <motion.div
                key={empresa.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{empresa.razao_social}</p>
                      {empresa.nome_fantasia && (
                        <p className="text-sm text-muted-foreground">{empresa.nome_fantasia}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {empresa.cnpj && (
                          <span className="text-xs font-mono text-muted-foreground">{empresa.cnpj}</span>
                        )}
                        {empresa.cidade && (
                          <span className="text-xs text-muted-foreground">
                            • {empresa.cidade}{empresa.estado && `/${empresa.estado}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={empresa.ativo ? 'default' : 'secondary'}>
                      {empresa.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(empresa)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedEmpresa(empresa);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label>CNPJ</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                  />
                  {isCNPJLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={formData.razao_social}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  placeholder="Razão social da empresa"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={formData.nome_fantasia}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  placeholder="Nome fantasia"
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input
                  value={formData.inscricao_estadual}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input
                  value={formData.inscricao_municipal}
                  onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedEmpresa ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A empresa "{selectedEmpresa?.razao_social}" será
              permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
