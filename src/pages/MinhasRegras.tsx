import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Info, Loader2, Shield, Building2, Tag, TagIcon, Users, Workflow,
  CheckCircle2, MessageSquare, Mail, Bot, FileText, ListChecks, Target,
} from "lucide-react";

interface ClienteOption {
  id: string;
  nome: string;
}

interface ResumoRegras {
  cliente: any | null;
  empresas: any[];
  etapasConfig: any[];
  aprovacoes: any[];
  workflows: { workflow: any; etapas: any[] }[];
  integracoes: any[];
  iaPrompts: any[];
  regrasManuais: any[];
  
  declaracoes: any[];
}

const EMPTY_RESUMO: ResumoRegras = {
  cliente: null,
  empresas: [],
  etapasConfig: [],
  aprovacoes: [],
  workflows: [],
  integracoes: [],
  iaPrompts: [],
  regrasManuais: [],
  
  declaracoes: [],
};

function SectionCard({
  icon: Icon,
  title,
  description,
  empty,
  children,
}: {
  icon: any;
  title: string;
  description?: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground italic">Nenhuma configuração definida.</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export default function MinhasRegras() {
  const { profile, isAdmin } = useAuth();
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [resumo, setResumo] = useState<ResumoRegras>(EMPTY_RESUMO);

  // Init: carrega clientes (admin) ou cliente do usuário
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (isAdmin) {
        const { data } = await supabase
          .from("clientes")
          .select("id, nome")
          .eq("ativo", true)
          .order("nome");
        if (data) {
          setClientes(data);
          if (data.length > 0) setSelectedClienteId((prev) => prev ?? data[0].id);
        }
      } else if (profile?.cliente_id) {
        setSelectedClienteId(profile.cliente_id);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.cliente_id, isAdmin]);

  // Carrega resumo consolidado
  useEffect(() => {
    if (!selectedClienteId) return;
    const fetchResumo = async () => {
      setLoadingResumo(true);
      const id = selectedClienteId;

      const [
        clienteRes,
        empresasRes,
        etapasRes,
        aprovRes,
        workflowsRes,
        integRes,
        iaRes,
        regrasRes,
        declRes,
      ] = await Promise.all([
        supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
        supabase.from("empresas").select("id, razao_social, nome_fantasia, cnpj, ativo").eq("cliente_id", id).eq("ativo", true).order("razao_social"),
        supabase.from("licitacao_etapas_config").select("*").eq("cliente_id", id).eq("ativo", true).order("ordem"),
        supabase.from("cliente_aprovacao_config").select("*").eq("cliente_id", id).eq("ativo", true).order("ordem"),
        supabase.from("licitacao_workflows" as any).select("id, nome, descricao, ativo").eq("cliente_id", id).eq("ativo", true),
        supabase.from("integracao_mensageria").select("tipo, provedor, ativo, email_remetente, numero_telefone").eq("cliente_id", id),
        supabase.from("ia_prompts").select("nome, tipo, descricao, modelo, ativo").eq("cliente_id", id).eq("ativo", true).order("tipo"),
        supabase.from("cliente_regras").select("titulo, descricao, categoria").eq("cliente_id", id).eq("ativo", true).order("categoria").order("ordem"),
        supabase.from("declaracoes_templates").select("nome, titulo").eq("cliente_id", id).eq("ativo", true).order("nome"),
      ]);

      // Para cada workflow, busca suas etapas
      const workflowsList = (workflowsRes.data as any[]) || [];
      const workflowsCom = await Promise.all(
        workflowsList.map(async (wf) => {
          const { data: etapas } = await supabase
            .from("workflow_etapas")
            .select("nome, descricao, ordem, cor")
            .eq("workflow_id", wf.id)
            .order("ordem");
          return { workflow: wf, etapas: etapas || [] };
        })
      );

      setResumo({
        cliente: clienteRes.data,
        empresas: empresasRes.data || [],
        etapasConfig: etapasRes.data || [],
        aprovacoes: aprovRes.data || [],
        workflows: workflowsCom,
        integracoes: integRes.data || [],
        iaPrompts: iaRes.data || [],
        regrasManuais: regrasRes.data || [],
        
        declaracoes: declRes.data || [],
      });
      setLoadingResumo(false);
    };
    fetchResumo();
  }, [selectedClienteId]);

  if (loading) {
    return (
      <MainLayout title="Minhas Regras" subtitle="Carregando...">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin && !profile?.cliente_id) {
    return (
      <MainLayout title="Minhas Regras" subtitle="Informações não disponíveis">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Você não está vinculado a nenhum cliente.</p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const c = resumo.cliente;
  const palavrasPos = c?.palavras_positivas || [];
  const palavrasNeg = c?.palavras_negativas || [];
  const concorrentes = c?.concorrentes || [];

  return (
    <MainLayout
      title={isAdmin ? "Regras Parametrizadas por Cliente" : "Minhas Regras"}
      subtitle={
        isAdmin
          ? "Visão consolidada de todas as parametrizações configuradas para o cliente"
          : `Resumo das regras e parâmetros configurados pelo administrador para ${c?.nome || "seu cliente"}`
      }
    >
      {/* Banner */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4 flex items-start gap-3">
          {isAdmin ? (
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          )}
          <div className="text-sm text-foreground/80">
            {isAdmin ? (
              <>
                <strong>Modo administrador:</strong> esta tela apresenta a visão consolidada (somente leitura)
                de todas as regras já parametrizadas para o cliente — palavras-chave, concorrentes monitorados,
                etapas do workflow, fluxo de aprovações, integrações de mensageria, prompts de IA e demais
                ajustes. Para alterar, utilize as telas de configuração específicas (Clientes, Workflows,
                Aprovações, Mensageria, IA etc.).
              </>
            ) : (
              <>
                Aqui você encontra um resumo de todas as regras configuradas pelo administrador para a sua
                operação. Em caso de divergências, entre em contato com o suporte.
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de cliente (admin) */}
      {isAdmin && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Cliente em visualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente ativo cadastrado.</p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Label className="shrink-0 sm:w-32">Selecionar cliente</Label>
                <Select
                  value={selectedClienteId ?? undefined}
                  onValueChange={(v) => setSelectedClienteId(v)}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Escolha um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loadingResumo ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedClienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um cliente para visualizar suas regras.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Identificação */}
          <SectionCard icon={Building2} title="Identificação do cliente">
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Nome:</span> <strong>{c?.nome}</strong></div>
              {c?.cnpj && <div><span className="text-muted-foreground">CNPJ:</span> {c.cnpj}</div>}
              {c?.email && <div><span className="text-muted-foreground">Email:</span> {c.email}</div>}
              {c?.cidade && <div><span className="text-muted-foreground">Cidade/UF:</span> {c.cidade}/{c.estado}</div>}
              <div className="pt-1">
                <Badge variant={c?.terceirizacao ? "default" : "outline"}>
                  {c?.terceirizacao ? "Operação terceirizada" : "Operação própria"}
                </Badge>
              </div>
            </div>
          </SectionCard>

          {/* Empresas */}
          <SectionCard
            icon={Building2}
            title="Empresas vinculadas"
            description={`${resumo.empresas.length} empresa(s) ativa(s)`}
            empty={resumo.empresas.length === 0}
          >
            <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
              {resumo.empresas.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">{e.nome_fantasia || e.razao_social}</span>
                  {e.cnpj && <span className="text-muted-foreground text-xs shrink-0">{e.cnpj}</span>}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Palavras-chave positivas */}
          <SectionCard
            icon={Tag}
            title="Palavras-chave positivas"
            description="Termos que aumentam a relevância de uma licitação"
            empty={palavrasPos.length === 0}
          >
            <div className="flex flex-wrap gap-1.5">
              {palavrasPos.map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">{p}</Badge>
              ))}
            </div>
          </SectionCard>

          {/* Palavras-chave negativas */}
          <SectionCard
            icon={TagIcon}
            title="Palavras-chave negativas"
            description="Termos que reduzem a relevância ou descartam a oportunidade"
            empty={palavrasNeg.length === 0}
          >
            <div className="flex flex-wrap gap-1.5">
              {palavrasNeg.map((p: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-destructive/10 text-destructive">{p}</Badge>
              ))}
            </div>
          </SectionCard>

          {/* Concorrentes */}
          <SectionCard
            icon={Users}
            title="Concorrentes monitorados"
            description={`${concorrentes.length} concorrente(s)`}
            empty={concorrentes.length === 0}
          >
            <div className="flex flex-wrap gap-1.5">
              {concorrentes.map((p: string, i: number) => (
                <Badge key={i} variant="outline">{p}</Badge>
              ))}
            </div>
          </SectionCard>

          {/* Etapas do passo a passo */}
          <SectionCard
            icon={ListChecks}
            title="Passo a passo da licitação"
            description="Etapas configuradas para o fluxo operacional"
            empty={resumo.etapasConfig.length === 0}
          >
            <ol className="space-y-2 text-sm">
              {resumo.etapasConfig.map((e: any, i: number) => (
                <li key={e.id} className="flex gap-2">
                  <span className="font-medium text-muted-foreground w-6 shrink-0">{(e.ordem ?? i) + 1}.</span>
                  <div>
                    <div className="font-medium">{e.nome || e.etapa_codigo}</div>
                    {e.descricao && <div className="text-xs text-muted-foreground">{e.descricao}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Fluxo de aprovações */}
          <SectionCard
            icon={CheckCircle2}
            title="Fluxo de aprovações"
            description="Etapas que exigem aprovação antes de prosseguir"
            empty={resumo.aprovacoes.length === 0}
          >
            <ol className="space-y-2 text-sm">
              {resumo.aprovacoes.map((a: any, i: number) => (
                <li key={a.id} className="flex gap-2">
                  <span className="font-medium text-muted-foreground w-6 shrink-0">{(a.ordem ?? i) + 1}.</span>
                  <div className="min-w-0">
                    <div className="font-medium">{a.nome_etapa}</div>
                    {a.area && <div className="text-xs text-muted-foreground">Área: {a.area}</div>}
                    {a.descricao && <div className="text-xs text-muted-foreground">{a.descricao}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          {/* Workflows */}
          <SectionCard
            icon={Workflow}
            title="Workflows configurados"
            description="Fluxos de trabalho personalizados e suas etapas"
            empty={resumo.workflows.length === 0}
          >
            <div className="space-y-3">
              {resumo.workflows.map(({ workflow, etapas }) => (
                <div key={workflow.id} className="border rounded-md p-3">
                  <div className="font-medium text-sm">{workflow.nome}</div>
                  {workflow.descricao && (
                    <div className="text-xs text-muted-foreground mb-2">{workflow.descricao}</div>
                  )}
                  {etapas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {etapas.map((et: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {i + 1}. {et.nome}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Integrações de mensageria */}
          <SectionCard
            icon={Mail}
            title="Integrações de mensageria"
            description="Canais configurados para notificações ao cliente"
            empty={resumo.integracoes.length === 0}
          >
            <div className="space-y-2 text-sm">
              {resumo.integracoes.map((i: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  {i.tipo === "whatsapp" ? <MessageSquare className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-muted-foreground" />}
                  <span className="capitalize font-medium">{i.tipo}</span>
                  {i.provedor && <span className="text-muted-foreground">· {i.provedor}</span>}
                  <Badge variant={i.ativo ? "default" : "outline"} className="ml-auto text-xs">
                    {i.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Prompts de IA */}
          <SectionCard
            icon={Bot}
            title="Configurações de IA"
            description="Prompts personalizados ativos"
            empty={resumo.iaPrompts.length === 0}
          >
            <div className="space-y-2 text-sm">
              {resumo.iaPrompts.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs shrink-0">{p.tipo}</Badge>
                  <div className="min-w-0">
                    <div className="font-medium">{p.nome}</div>
                    {p.modelo && <div className="text-xs text-muted-foreground">Modelo: {p.modelo}</div>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Declarações */}
          <SectionCard
            icon={FileText}
            title="Modelos de declarações"
            description="Templates disponíveis para geração automática"
            empty={resumo.declaracoes.length === 0}
          >
            <ul className="space-y-1 text-sm">
              {resumo.declaracoes.map((d: any, i: number) => (
                <li key={i}>
                  <span className="font-medium">{d.titulo}</span>
                  <span className="text-muted-foreground"> · {d.nome}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Regras manuais (full width) */}
          <div className="lg:col-span-2">
            <SectionCard
              icon={FileText}
              title="Regras e procedimentos adicionais"
              description="Regras textuais cadastradas pelo administrador"
              empty={resumo.regrasManuais.length === 0}
            >
              <div className="space-y-3">
                {resumo.regrasManuais.map((r: any, i: number) => (
                  <div key={i}>
                    {i > 0 && <Separator className="mb-3" />}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{r.categoria}</Badge>
                      <span className="font-medium text-sm">{r.titulo}</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.descricao}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
