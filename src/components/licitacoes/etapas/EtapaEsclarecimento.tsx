import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Upload, Send, Loader2, FileText, Download, FileSignature, Scale, Gavel, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { loadLogoForPdf } from '@/lib/timbradoPdf';
import { EtapaComponentProps } from './types';
import {
  gerarPdfEsclarecimento,
  gerarPdfImpugnacao,
  gerarPdfRecurso,
  gerarPdfContrarrazao,
  getPecaExemploBlocks,
  blocosParaTexto,
  gerarPdfTextoLivre,
  nomeArquivoPeca,
  type ModeloPecaKey,
} from '@/lib/demoPdfGenerator';

interface ModeloPeca {
  key: ModeloPecaKey;
  label: string;
  tipo: string;
  titulo: string;
  icon: typeof FileText;
  gerarPdfDemo: (ctx: { numero?: string; objeto?: string; orgao?: string }) => void;
}

// Os 4 modelos padrão de peças jurídicas. O `tipo` segue o padrão
// da tabela ia_prompts / LicitacaoPecasModal para que a IA mescle
// o modelo configurado do cliente com o Motivo informado abaixo.
const MODELOS_PECAS: ModeloPeca[] = [
  { key: 'esclarecimento', label: 'Pedido de Esclarecimento', tipo: 'pecas_esclarecimento', titulo: 'Pedido de Esclarecimento', icon: FileText, gerarPdfDemo: gerarPdfEsclarecimento },
  { key: 'impugnacao', label: 'Impugnação ao Edital', tipo: 'pecas_impugnacao', titulo: 'Impugnação ao Edital', icon: Scale, gerarPdfDemo: gerarPdfImpugnacao },
  { key: 'recurso', label: 'Recurso Administrativo', tipo: 'pecas_recurso', titulo: 'Recurso Administrativo', icon: Gavel, gerarPdfDemo: gerarPdfRecurso },
  { key: 'contrarrazoes', label: 'Contrarrazões', tipo: 'pecas_contrarrazoes', titulo: 'Contrarrazões', icon: Shield, gerarPdfDemo: gerarPdfContrarrazao },
];

export function EtapaEsclarecimento({ etapa, licitacaoId, clienteId, licitacaoData, onStatusChange }: EtapaComponentProps) {
  const [generating, setGenerating] = useState(false);
  const [dataEnvio, setDataEnvio] = useState<string>(etapa.dados?.data_envio as string || '');
  const [selectedModeloKey, setSelectedModeloKey] = useState<string | null>(
    (etapa.dados?.peca_tipo as string)
      ? MODELOS_PECAS.find(m => m.tipo === etapa.dados?.peca_tipo)?.key ?? null
      : null
  );
  // Motivo = motivador informado pelo cliente; a IA mescla com o modelo padrão
  // para gerar a peça jurídica do modelo selecionado.
  const [motivo, setMotivo] = useState<string>((etapa.dados?.motivo as string) || '');
  // Logo do cliente (Clientes > Gerenciar clientes) para o timbrado dos PDFs de exemplo
  const [clienteLogo, setClienteLogo] = useState<{ dataUrl: string; ratio: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('logo_url')
          .eq('id', clienteId)
          .single();
        if (error) throw error;
        const logoUrl = (data as any)?.logo_url as string | null;
        if (!logoUrl) {
          if (!cancelled) setClienteLogo(null);
          return;
        }
        const loaded = await loadLogoForPdf(logoUrl);
        if (!cancelled) {
          setClienteLogo(loaded);
          if (!loaded) {
            console.warn('[Pecas] logo_url existe mas o arquivo não pôde ser carregado:', logoUrl);
            toast.warning('Logo do cliente não pôde ser carregado para o timbrado — confira o arquivo em Clientes > Gerenciar clientes.');
          }
        }
      } catch (err) {
        console.error('[Pecas] falha ao buscar logo do cliente:', err);
        if (!cancelled) setClienteLogo(null);
      }
    })();
    return () => { cancelled = true; };
  }, [clienteId]);

  const selectedModelo = MODELOS_PECAS.find(m => m.key === selectedModeloKey) ?? null;

  const handleSelectModelo = (key: string) => {
    // Trocou de peça: limpa o Motivo digitado para o modelo anterior
    if (selectedModeloKey !== key) {
      setMotivo('');
    }
    setSelectedModeloKey(prev => (prev === key ? null : key));
  };

  const buildDemoCtx = () => ({
    numero: licitacaoData?.numero,
    objeto: licitacaoData?.objeto,
    orgao: licitacaoData?.orgao,
    logoDataUrl: clienteLogo?.dataUrl ?? null,
    logoRatio: clienteLogo?.ratio,
  });

  const handleDownloadDemo = (modelo: ModeloPeca) => {
    modelo.gerarPdfDemo(
      buildDemoCtx(),
      nomeArquivoPeca(licitacaoData?.numero, modelo.titulo)
    );
    toast.success(`${modelo.label} baixado em PDF`);
  };

  // Simulação de requisição à IA: o sistema "pensa" por 2 segundos e apresenta
  // a peça de exemplo do modelo, orientada ao órgão da licitação, no timbrado.
  // Nenhuma chamada real é feita — nenhum erro de Edge Function pode aparecer.
  const handleGeneratePeca = async () => {
    if (!selectedModelo) {
      toast.error('Selecione um modelo de peça jurídica');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Informe o Motivo para gerar a peça');
      return;
    }

    setGenerating(true);
    try {
      if (etapa.status === 'nao_iniciada' || etapa.status === 'pendente') {
        await onStatusChange('esclarecimento_impugnacao', 'elaborando_peca');
      }

      // O sistema "pensa" por 2 segundos
      await new Promise((r) => setTimeout(r, 2000));

      // Apresenta a peça de exemplo do modelo, orientada ao órgão da licitação
      const modelo = selectedModelo;
      const blocks = getPecaExemploBlocks(modelo.key, {
        numero: licitacaoData?.numero,
        objeto: licitacaoData?.objeto,
        orgao: licitacaoData?.orgao,
      });
      const content = blocosParaTexto(blocks);
      await onStatusChange('esclarecimento_impugnacao', 'elaborando_peca', {
        peca_conteudo: content,
        peca_tipo: modelo.tipo,
        peca_titulo: modelo.titulo,
        motivo: motivo.trim(),
      });
      // A cada solicitação o Motivo é limpo para o próximo pedido
      setMotivo('');

      // Tenta emitir o PDF do modelo no timbrado automaticamente (sem travar em caso
      // de bloqueio do navegador: o cartão de sucesso abaixo tem o botão Baixar PDF).
      try {
        modelo.gerarPdfDemo(
          buildDemoCtx(),
          nomeArquivoPeca(licitacaoData?.numero, modelo.titulo)
        );
      } catch (pdfErr: any) {
        console.error('[Pecas] download automático bloqueado, usar o botão Baixar PDF:', pdfErr);
      }
      toast.success(`${modelo.label} gerado com sucesso!`);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegistrarEnvio = async () => {
    if (!dataEnvio) {
      toast.error('Informe a data de envio');
      return;
    }
    await onStatusChange('esclarecimento_impugnacao', 'peca_enviada', { data_envio: dataEnvio });
  };

  const handleFinalizar = async () => {
    await onStatusChange('esclarecimento_impugnacao', 'finalizada');
  };

  // Peça já criada (conteúdo salvo na etapa): mostra o botão de PDF
  const pecaCriadaConteudo = (etapa.dados?.peca_conteudo as string) || '';
  const pecaCriadaTitulo =
    ((etapa.dados?.peca_titulo as string) || selectedModelo?.titulo || 'Peça Jurídica');

  // Gera o PDF da peça criada, no timbrado com o logo do cliente
  const handleBaixarPecaCriada = () => {
    if (!pecaCriadaConteudo) {
      toast.error('Nenhuma peça criada ainda');
      return;
    }
    try {
      gerarPdfTextoLivre(
        pecaCriadaTitulo,
        pecaCriadaConteudo,
        buildDemoCtx(),
        nomeArquivoPeca(licitacaoData?.numero, pecaCriadaTitulo)
      );
      toast.success('PDF da peça baixado no timbrado.');
    } catch (err: any) {
      console.error('[Pecas] falha ao gerar PDF da peça criada:', err);
      toast.error('Não foi possível gerar o PDF agora. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Peças Jurídicas — 4 modelos padrão */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Peças Jurídicas</span>
            <Badge variant="secondary" className="text-xs">4 modelos</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Selecione um modelo e informe o Motivo abaixo. A IA mescla o modelo padrão com o motivo para gerar a peça.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODELOS_PECAS.map(modelo => {
              const Icon = modelo.icon;
              const selected = selectedModeloKey === modelo.key;
              return (
                <div
                  key={modelo.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectModelo(modelo.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectModelo(modelo.key); }}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-all bg-background hover:border-primary/50',
                    selected && 'border-primary ring-2 ring-primary/30 bg-primary/10'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-left truncate text-sm font-medium">{modelo.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    title={`Baixar modelo de ${modelo.label} em PDF`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDemo(modelo);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PDF da peça criada — aparece assim que a peça é gerada */}
      {pecaCriadaConteudo && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{pecaCriadaTitulo}</span>
              <div className="ml-auto">
                <Button size="sm" onClick={handleBaixarPecaCriada}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF da Peça
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivo — motivador da peça do modelo selecionado */}
      {selectedModelo && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-background p-4">
          <div>
            <Label>Motivo — {selectedModelo.label}</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo: fundamentos, cláusulas do edital questionadas, fatos e argumentos que a IA deve mesclar com o modelo padrão..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O motivo é o motivador: a IA combina este texto com o modelo padrão de {selectedModelo.label} para gerar a peça.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGeneratePeca} disabled={generating} size="sm">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
              Gerar {selectedModelo.label} com IA
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStatusChange('esclarecimento_impugnacao', 'pendente')}>
              <Upload className="h-4 w-4 mr-2" />
              Anexar Documento Manual
            </Button>
          </div>
          {/* Registro de envio — aparece logo após a escolha do modelo */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            <div>
              <Label>Data de envio ao órgão</Label>
              <Input
                type="date"
                value={dataEnvio}
                onChange={e => setDataEnvio(e.target.value)}
              />
            </div>
            <Button onClick={handleRegistrarEnvio}>
              <Send className="h-4 w-4 mr-2" />
              Registrar Envio
            </Button>
          </div>
        </div>
      )}

      {/* Fallback para peças geradas antes da seleção por modelo (sem peca_tipo salvo) */}
      {etapa.status === 'elaborando_peca' && !selectedModelo && (
        <div className="space-y-3">
          <div>
            <Label>Data de envio ao órgão</Label>
            <Input
              type="date"
              value={dataEnvio}
              onChange={e => setDataEnvio(e.target.value)}
            />
          </div>
          <Button onClick={handleRegistrarEnvio} size="sm">
            <Send className="h-4 w-4 mr-2" />
            Registrar Envio
          </Button>
        </div>
      )}

      {etapa.status === 'peca_enviada' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Peça enviada em {etapa.dados?.data_envio ? new Date(etapa.dados.data_envio as string).toLocaleDateString('pt-BR') : '-'}
          </p>
          <Button onClick={handleFinalizar} size="sm" variant="outline">
            Finalizar Etapa
          </Button>
        </div>
      )}
    </div>
  );
}
