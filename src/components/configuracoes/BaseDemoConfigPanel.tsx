import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles, RefreshCw, Save, Loader2, TriangleAlert, CheckCircle2, Users, FileCheck, Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  STATUS_DISPONIVEIS,
  carregarConfigBaseDemo,
  salvarConfigBaseDemo,
  restaurarConfigBaseDemo,
  totalConfigurado,
  type ConfigBaseDemo,
} from '@/lib/configBaseDemo';
import { aplicarBaseDemo, type RelatorioBaseDemo } from '@/lib/aplicarBaseDemo';
import { PERFIS_EMPRESA, type PerfilEmpresa } from '@/lib/cenariosEmpresa';
import { getStatusConfig } from '@/lib/licitacaoStatus';

export function BaseDemoConfigPanel() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<ConfigBaseDemo>(() => carregarConfigBaseDemo());
  const [aplicando, setAplicando] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioBaseDemo | null>(null);
  const [empresas, setEmpresas] = useState<
    Array<{ id: string; razao_social: string; nome_fantasia: string | null; licitacoes: number }>
  >([]);

  useEffect(() => {
    (async () => {
      const { data: emp } = await supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cliente_id')
        .eq('ativo', true)
        .order('razao_social');
      const lista = (emp || []) as any[];
      const { data: lics } = await supabase.from('licitacoes').select('id, empresa_id');
      const porEmpresa = new Map<string, number>();
      (lics || []).forEach((l: any) => {
        if (l.empresa_id) porEmpresa.set(l.empresa_id, (porEmpresa.get(l.empresa_id) || 0) + 1);
      });
      setEmpresas(
        lista.map((e: any) => ({
          id: e.id,
          razao_social: e.razao_social,
          nome_fantasia: e.nome_fantasia,
          licitacoes: porEmpresa.get(e.id) || 0,
        }))
      );
    })();
  }, []);

  const total = totalConfigurado(config);
  const totalBase = useMemo(
    () => empresas.reduce((s, e) => s + e.licitacoes, 0),
    [empresas]
  );

  const setStatus = (status: string, qtd: number) => {
    setConfig((c) => ({ ...c, porStatus: { ...c.porStatus, [status]: Math.max(0, qtd || 0) } }));
  };

  const setPerfil = (empresaId: string, perfil: PerfilEmpresa | 'auto') => {
    setConfig((c) => {
      const perfis = { ...c.perfisPorEmpresa };
      if (perfil === 'auto') delete perfis[empresaId];
      else perfis[empresaId] = perfil;
      return { ...c, perfisPorEmpresa: perfis };
    });
  };

  const handleSalvar = () => {
    salvarConfigBaseDemo(config);
    toast.success('Configuração da base de demonstração salva');
  };

  const handleRestaurar = () => {
    const cfg = restaurarConfigBaseDemo();
    setConfig(cfg);
    toast.success('Padrões restaurados');
  };

  const handleAplicar = async () => {
    salvarConfigBaseDemo(config);
    setAplicando(true);
    try {
      const rel = await aplicarBaseDemo(config, profile?.id);
      setRelatorio(rel);
      console.info('[Base Demo] Relatório:', rel);
      if (rel.erros.length > 0) {
        toast.error(`Base aplicada com ${rel.erros.length} erro(s) — ${rel.erros[0]}`);
      } else {
        toast.success(
          `Base aplicada em ${(rel.duracaoMs / 1000).toFixed(1)}s — ${rel.licitacoes} licitações, ${rel.certidoes} certidões, ${rel.etapas} etapas`
        );
      }
    } catch (e: any) {
      console.error('[Base Demo] Erro:', e);
      toast.error(e?.message || 'Erro ao aplicar a base de demonstração');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Base de demonstração</CardTitle>
              <CardDescription className="mt-1">
                Monte o cenário das licitações para apresentar aos clientes: quantidade por status,
                certidões de cada empresa e o nível de avanço do processo. As preferências ficam
                salvas neste navegador.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                Quantidade de licitações por status
              </Label>
              <Badge variant={total === totalBase ? 'default' : 'secondary'}>
                {total} de {totalBase || '—'} licitações
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STATUS_DISPONIVEIS.map((status) => {
                const cfg = getStatusConfig(status);
                const qtd = config.porStatus[status] ?? 0;
                return (
                  <div key={status} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cfg.color.split(' ')[0]}`} />
                      <span className="text-sm font-medium">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setStatus(status, qtd - 1)}
                        disabled={qtd <= 0}
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={qtd}
                        onChange={(e) => setStatus(status, parseInt(e.target.value || '0', 10))}
                        className="h-8 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setStatus(status, qtd + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {total !== totalBase && totalBase > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5" />
                A soma ({total}) difere do total de licitações ({totalBase}). A diferença fica como
                “Em Andamento”.
              </p>
            )}
          </div>

          <Separator />

          {/* Certidões */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground" />
              Certidões da base (por empresa)
            </Label>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quantidade</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      certidoesPorEmpresa: Math.max(0, c.certidoesPorEmpresa - 1),
                    }))
                  }
                >
                  −
                </Button>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={config.certidoesPorEmpresa}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      certidoesPorEmpresa: Math.max(0, parseInt(e.target.value || '0', 10)),
                    }))
                  }
                  className="h-8 w-32 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setConfig((c) => ({ ...c, certidoesPorEmpresa: c.certidoesPorEmpresa + 1 }))
                  }
                >
                  +
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.incluirCertidaoVencida}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, incluirCertidaoVencida: v }))}
                />
                <Label className="text-sm">Incluir ao menos uma certidão vencida</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Etapas do processo */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">O que aplicar</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  key: 'vincularEmpresas' as const,
                  label: 'Vincular licitações às empresas do cliente',
                },
                {
                  key: 'popularProcesso' as const,
                  label: 'Popular o processo (etapas, IA, peças, resultado)',
                },
                {
                  key: 'cenariosPorEmpresa' as const,
                  label: 'Cenário distinto por empresa (nível de avanço)',
                },
                {
                  key: 'cenariosPorCliente' as const,
                  label: 'Cenário distinto por cliente (etapas, perguntas, templates)',
                },
                {
                  key: 'sincronizarDocumentos' as const,
                  label: 'Replicar a base de documentos nas licitações',
                },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <Switch
                    checked={config[item.key]}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, [item.key]: v }))}
                  />
                  <Label className="text-sm">{item.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Perfil por empresa */}
          {config.cenariosPorEmpresa && empresas.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Cenário por empresa
              </Label>
              <div className="rounded-lg border divide-y max-h-80 overflow-y-auto">
                {empresas.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.nome_fantasia || emp.razao_social}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.licitacoes} licitação(ões) vinculada(s)
                      </p>
                    </div>
                    <select
                      value={config.perfisPorEmpresa[emp.id] || 'auto'}
                      onChange={(e) =>
                        setPerfil(emp.id, e.target.value as PerfilEmpresa | 'auto')
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="auto">Automático</option>
                      {Object.entries(PERFIS_EMPRESA).map(([key, p]) => (
                        <option key={key} value={key}>
                          {p.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleRestaurar} disabled={aplicando}>
              Restaurar padrões
            </Button>
            <Button variant="outline" onClick={handleSalvar} disabled={aplicando}>
              <Save className="h-4 w-4 mr-2" />Salvar
            </Button>
            <Button onClick={handleAplicar} disabled={aplicando}>
              {aplicando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />Aplicando na base...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />Aplicar agora
                </>
              )}
            </Button>
          </div>

          {relatorio && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                relatorio.erros.length > 0
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-emerald-500/40 bg-emerald-500/5'
              }`}
            >
              <p className="font-medium flex items-center gap-2">
                {relatorio.erros.length > 0 ? (
                  <TriangleAlert className="h-4 w-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                Última aplicação ({relatorio.duracaoMs / 1000}s)
              </p>
              <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <li>
                  Status:{' '}
                  {Object.entries(relatorio.statusFinal)
                    .map(([k, v]) => `${getStatusConfig(k).label}: ${v}`)
                    .join(' · ') || '—'}
                </li>
                <li>
                  Certidões: {relatorio.certidoes} ({relatorio.certidoesVencidas} vencida(s)) em{' '}
                  {relatorio.empresas} empresa(s)
                </li>
                <li>
                  Etapas populadas: {relatorio.etapas} · Cenários por empresa:{' '}
                  {relatorio.cenarios} · Documentos: {relatorio.documentos}
                </li>
                {relatorio.erros.length > 0 && (
                  <li className="text-amber-600">Erros: {relatorio.erros.slice(0, 3).join(' | ')}</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
