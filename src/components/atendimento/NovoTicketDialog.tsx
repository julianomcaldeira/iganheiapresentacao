import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NovoTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: () => void;
}

export function NovoTicketDialog({ open, onOpenChange, onTicketCreated }: NovoTicketDialogProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [userProfile, setUserProfile] = useState<{ cliente_id: string | null } | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    categoria: "duvida" as string,
    prioridade: "media" as string,
    cliente_id: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('cliente_id')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);

      // If admin, fetch all clients
      if (isAdmin) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');
        
        setClientes(clientesData || []);
      } else if (profile?.cliente_id) {
        setFormData(prev => ({ ...prev, cliente_id: profile.cliente_id! }));
      }
    };

    if (open) {
      fetchData();
    }
  }, [open, user, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um ticket.",
        variant: "destructive",
      });
      return;
    }

    const clienteId = isAdmin ? formData.cliente_id : userProfile?.cliente_id;

    if (!clienteId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para o ticket.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('tickets')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao,
          categoria: formData.categoria as 'duvida' | 'erro' | 'sugestao' | 'outro',
          prioridade: formData.prioridade as 'baixa' | 'media' | 'alta' | 'urgente',
          cliente_id: clienteId,
          criado_por: user.id,
        });

      if (error) throw error;

      toast({
        title: "Ticket criado",
        description: "Seu ticket foi criado com sucesso.",
      });

      setFormData({
        titulo: "",
        descricao: "",
        categoria: "duvida",
        prioridade: "media",
        cliente_id: "",
      });

      onTicketCreated();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Ticket de Suporte</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
              placeholder="Resumo do problema"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descreva o problema em detalhes..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
