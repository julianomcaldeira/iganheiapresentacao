import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Send, Hash, Users, Megaphone, Paperclip, Search } from 'lucide-react';

interface Canal {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  icone: string | null;
  ativo: boolean;
}

interface Mensagem {
  id: string;
  canal_id: string;
  autor_id: string | null;
  conteudo: string;
  tipo: string;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  created_at: string;
  autor?: {
    nome: string;
    avatar_url: string | null;
  };
}

export function ChatInternoTab() {
  const { profile, isAdmin } = useAuth();
  const [canais, setCanais] = useState<Canal[]>([]);
  const [selectedCanal, setSelectedCanal] = useState<Canal | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNovoCanal, setShowNovoCanal] = useState(false);
  const [novoCanal, setNovoCanal] = useState({ nome: '', descricao: '', tipo: 'grupo' });
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(profile?.cliente_id || null);

  useEffect(() => {
    if (isAdmin && !profile?.cliente_id) {
      fetchClientes();
    }
  }, [isAdmin, profile?.cliente_id]);

  useEffect(() => {
    const clienteId = profile?.cliente_id || selectedClienteId;
    if (clienteId) {
      fetchCanais(clienteId);
    } else {
      setLoading(false);
    }
  }, [profile?.cliente_id, selectedClienteId]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    setClientes(data || []);
    if (data && data.length > 0 && !selectedClienteId) {
      setSelectedClienteId(data[0].id);
    }
  };

  const fetchCanais = async (clienteId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensageria_canais')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCanais(data || []);
      if (data && data.length > 0 && !selectedCanal) {
        setSelectedCanal(data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentClienteId = profile?.cliente_id || selectedClienteId;

  const fetchMensagens = async (canalId: string) => {
    try {
      const { data, error } = await supabase
        .from('mensageria_mensagens')
        .select(`
          *,
          autor:profiles!mensageria_mensagens_autor_id_fkey(nome, avatar_url)
        `)
        .eq('canal_id', canalId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMensagens(data || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleCriarCanal = async () => {
    if (!currentClienteId || !novoCanal.nome.trim()) return;

    try {
      const { data, error } = await supabase
        .from('mensageria_canais')
        .insert({
          cliente_id: currentClienteId,
          nome: novoCanal.nome,
          descricao: novoCanal.descricao || null,
          tipo: novoCanal.tipo,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('mensageria_membros')
        .insert({
          canal_id: data.id,
          user_id: profile.id,
          role: 'admin'
        });

      toast.success('Canal criado com sucesso!');
      setShowNovoCanal(false);
      setNovoCanal({ nome: '', descricao: '', tipo: 'grupo' });
      if (currentClienteId) fetchCanais(currentClienteId);
    } catch (error: any) {
      toast.error('Erro ao criar canal: ' + error.message);
    }
  };

  const handleEnviarMensagem = async () => {
    if (!selectedCanal || !novaMensagem.trim() || !profile?.id) return;

    try {
      const { error } = await supabase
        .from('mensageria_mensagens')
        .insert({
          canal_id: selectedCanal.id,
          autor_id: profile.id,
          conteudo: novaMensagem,
          tipo: 'texto'
        });

      if (error) throw error;
      setNovaMensagem('');
    } catch (error: any) {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCanalIcon = (tipo: string) => {
    switch (tipo) {
      case 'grupo':
        return <Users className="h-4 w-4" />;
      case 'anuncio':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const filteredCanais = canais.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
      {/* Lista de Canais */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Canais</CardTitle>
            {isAdmin && (
              <Dialog open={showNovoCanal} onOpenChange={setShowNovoCanal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Canal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={novoCanal.nome}
                        onChange={(e) => setNovoCanal(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome do canal"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={novoCanal.descricao}
                        onChange={(e) => setNovoCanal(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Descrição do canal"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={novoCanal.tipo}
                        onValueChange={(value) => setNovoCanal(prev => ({ ...prev, tipo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grupo">Grupo</SelectItem>
                          <SelectItem value="anuncio">Anúncio</SelectItem>
                          <SelectItem value="direto">Direto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCriarCanal} className="w-full">
                      Criar Canal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100%-100px)]">
            <div className="space-y-1">
              {filteredCanais.map((canal) => (
                <button
                  key={canal.id}
                  onClick={() => setSelectedCanal(canal)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                    selectedCanal?.id === canal.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {getCanalIcon(canal.tipo)}
                  <span className="truncate">{canal.nome}</span>
                </button>
              ))}
              {filteredCanais.length === 0 && (
                <p className="text-center text-muted-foreground p-4">
                  Nenhum canal encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Área de Mensagens */}
      <Card className="lg:col-span-3 flex flex-col">
        {selectedCanal ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                {getCanalIcon(selectedCanal.tipo)}
                <div>
                  <CardTitle className="text-lg">{selectedCanal.nome}</CardTitle>
                  {selectedCanal.descricao && (
                    <p className="text-sm text-muted-foreground">{selectedCanal.descricao}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {mensagens.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.autor_id === profile?.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={msg.autor?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {msg.autor?.nome ? getInitials(msg.autor.nome) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[70%] ${
                          msg.autor_id === profile?.id ? 'text-right' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {msg.autor?.nome || 'Desconhecido'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            msg.autor_id === profile?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {msg.conteudo}
                          {msg.arquivo_url && (
                            <a
                              href={msg.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 mt-2 text-sm underline"
                            >
                              <Paperclip className="h-3 w-3" />
                              {msg.arquivo_nome || 'Anexo'}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviarMensagem();
                    }
                  }}
                />
                <Button onClick={handleEnviarMensagem} disabled={!novaMensagem.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione um canal para começar
          </div>
        )}
      </Card>
    </div>
  );
}
