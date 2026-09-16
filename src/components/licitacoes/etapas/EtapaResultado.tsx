import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Plus, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtapaComponentProps } from './types';

interface ResultadoItem {
  id: string;
  item_numero: number;
  descricao: string;
  resultado: string;
  valor_proposta: number | null;
  valor_vencedor: number | null;
  vencedor_nome: string | null;
}

export function EtapaResultado({ etapa, licitacaoId, onStatusChange }: EtapaComponentProps) {
  const [itens, setItens] = useState<ResultadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [novoItem, setNovoItem] = useState({
    item_numero: '',
    descricao: '',
    resultado: 'pendente',
    valor_proposta: '',
    valor_vencedor: '',
    vencedor_nome: '',
  });

  useEffect(() => {
    fetchItens();
  }, [licitacaoId]);

  const fetchItens = async () => {
    const { data } = await supabase
      .from('licitacao_resultado_itens')
      .select('*')
      .eq('licitacao_id', licitacaoId)
      .order('item_numero');

    if (data) setItens(data);
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!novoItem.descricao.trim()) {
      toast.error('Informe a descrição do item');
      return;
    }

    if (etapa.status === 'nao_iniciada' || etapa.status === 'pendente') {
      await onStatusChange('resultado', 'aguardando_resultado');
    }

    const { error } = await supabase.from('licitacao_resultado_itens').insert({
      licitacao_id: licitacaoId,
      item_numero: parseInt(novoItem.item_numero) || itens.length + 1,
      descricao: novoItem.descricao,
      resultado: novoItem.resultado,
      valor_proposta: novoItem.valor_proposta ? parseFloat(novoItem.valor_proposta) : null,
      valor_vencedor: novoItem.valor_vencedor ? parseFloat(novoItem.valor_vencedor) : null,
      vencedor_nome: novoItem.vencedor_nome || null,
    });

    if (error) {
      toast.error('Erro ao adicionar item');
      return;
    }

    setNovoItem({ item_numero: '', descricao: '', resultado: 'pendente', valor_proposta: '', valor_vencedor: '', vencedor_nome: '' });
    setShowAdd(false);
    fetchItens();
    toast.success('Item adicionado!');
  };

  const handleUpdateResultado = async (id: string, resultado: string) => {
    await supabase.from('licitacao_resultado_itens').update({ resultado }).eq('id', id);
    fetchItens();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('licitacao_resultado_itens').delete().eq('id', id);
    fetchItens();
  };

  const handleFinalizar = async () => {
    const ganhos = itens.filter(i => i.resultado === 'ganhou').length;
    const perdidos = itens.filter(i => i.resultado === 'perdeu').length;
    await onStatusChange('resultado', 'resultado_finalizado', {
      itens_ganhos: ganhos,
      itens_perdidos: perdidos,
      total_itens: itens.length,
    });
    toast.success('Resultado finalizado!');
  };

  const formatCurrency = (v: number | null) => {
    if (!v) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  const ganhos = itens.filter(i => i.resultado === 'ganhou').length;
  const perdidos = itens.filter(i => i.resultado === 'perdeu').length;

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {itens.length > 0 && (
        <div className="flex gap-3 text-sm">
          <Badge className="bg-emerald-500/20 text-emerald-600">
            <Trophy className="h-3 w-3 mr-1" /> {ganhos} ganho(s)
          </Badge>
          <Badge className="bg-red-500/20 text-red-600">
            {perdidos} perdido(s)
          </Badge>
          <Badge variant="outline">{itens.length} total</Badge>
        </div>
      )}

      {/* Items table */}
      {itens.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Item</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32">Resultado</TableHead>
                <TableHead className="w-28 text-right">Proposta</TableHead>
                <TableHead className="w-28 text-right">Vencedor</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.item_numero}</TableCell>
                  <TableCell className="text-sm">{item.descricao}</TableCell>
                  <TableCell>
                    <Select
                      value={item.resultado}
                      onValueChange={v => handleUpdateResultado(item.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="ganhou">Ganhou</SelectItem>
                        <SelectItem value="perdeu">Perdeu</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.valor_proposta)}</TableCell>
                  <TableCell className="text-right text-xs">{formatCurrency(item.valor_vencedor)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleRemove(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add item */}
      {showAdd ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nº Item</Label>
                <Input
                  type="number"
                  value={novoItem.item_numero}
                  onChange={e => setNovoItem({ ...novoItem, item_numero: e.target.value })}
                  placeholder={String(itens.length + 1)}
                />
              </div>
              <div>
                <Label className="text-xs">Resultado</Label>
                <Select value={novoItem.resultado} onValueChange={v => setNovoItem({ ...novoItem, resultado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="ganhou">Ganhou</SelectItem>
                    <SelectItem value="perdeu">Perdeu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Input
                value={novoItem.descricao}
                onChange={e => setNovoItem({ ...novoItem, descricao: e.target.value })}
                placeholder="Descrição do item..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor Proposta</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={novoItem.valor_proposta}
                  onChange={e => setNovoItem({ ...novoItem, valor_proposta: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Vencedor</Label>
                <Input
                  value={novoItem.vencedor_nome}
                  onChange={e => setNovoItem({ ...novoItem, vencedor_nome: e.target.value })}
                  placeholder="Nome do vencedor"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddItem}>Adicionar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      )}

      {/* Finalize */}
      {etapa.status === 'aguardando_resultado' && itens.length > 0 && itens.every(i => i.resultado !== 'pendente') && (
        <Button onClick={handleFinalizar} size="sm" className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Finalizar Resultado
        </Button>
      )}
    </div>
  );
}
