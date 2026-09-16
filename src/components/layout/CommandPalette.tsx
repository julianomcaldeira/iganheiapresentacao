import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, FileText, Users, Building2, Package, ListTodo,
  Calendar, BarChart3, Newspaper, Brain, Sparkles, Settings, Mail,
  ShieldCheck, MessageSquare, Search, Briefcase, Headphones,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RemoteResult {
  id: string;
  label: string;
  hint?: string;
  type: 'licitacao' | 'cliente';
  path: string;
}

const STATIC_PAGES = [
  { label: 'Dashboard', path: '/', Icon: LayoutDashboard, group: 'Páginas' },
  { label: 'Licitações', path: '/licitacoes', Icon: FileText, group: 'Páginas' },
  { label: 'Clientes', path: '/clientes', Icon: Building2, group: 'Páginas' },
  { label: 'Documentos', path: '/documentos', Icon: FileText, group: 'Páginas' },
  { label: 'Produtos & Serviços', path: '/produtos', Icon: Package, group: 'Páginas' },
  { label: 'Tarefas', path: '/tarefas', Icon: ListTodo, group: 'Páginas' },
  { label: 'Pendências', path: '/pendencias', Icon: ListTodo, group: 'Páginas' },
  { label: 'Agenda', path: '/agenda', Icon: Calendar, group: 'Páginas' },
  { label: 'Relatórios', path: '/relatorios', Icon: BarChart3, group: 'Páginas' },
  { label: 'Concorrentes', path: '/concorrentes', Icon: Users, group: 'Páginas' },
  { label: 'Análise Estratégica', path: '/analise-estrategica', Icon: Brain, group: 'Páginas' },
  { label: 'Atendimento', path: '/atendimento', Icon: Headphones, group: 'Páginas' },
  { label: 'Mensageria', path: '/mensageria', Icon: Mail, group: 'Páginas' },
  { label: 'News Intelligence', path: '/news-intelligence', Icon: Newspaper, group: 'Páginas' },
  { label: 'Inteligência iPesquisei', path: '/inteligencia-pesquisei', Icon: Search, group: 'Páginas' },

  { label: 'IA — Análise de Edital', path: '/ia/analise-edital', Icon: Sparkles, group: 'IA' },
  { label: 'IA — Análise Estratégica', path: '/ia/analise-estrategica', Icon: Sparkles, group: 'IA' },
  
  { label: 'IA — Monitor de Pregão', path: '/ia/monitor', Icon: Sparkles, group: 'IA' },
  { label: 'IA — Peças', path: '/ia/pecas', Icon: Sparkles, group: 'IA' },
  { label: 'IA — Conhecimento', path: '/ia/conhecimento', Icon: Brain, group: 'IA' },

  { label: 'Administração', path: '/admin', Icon: ShieldCheck, group: 'Admin' },
  { label: 'Auditoria', path: '/auditoria', Icon: ShieldCheck, group: 'Admin' },
  { label: 'Importação de Dados', path: '/importacao', Icon: Briefcase, group: 'Admin' },
  { label: 'Onboarding de Cliente', path: '/onboarding', Icon: Briefcase, group: 'Admin' },
  

  { label: 'Configurações', path: '/configuracoes', Icon: Settings, group: 'Conta' },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<RemoteResult[]>([]);
  const [loadingRemote, setLoadingRemote] = useState(false);

  // Debounced backend search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }
    setLoadingRemote(true);
    const handle = setTimeout(async () => {
      try {
        const [licRes, cliRes] = await Promise.all([
          supabase
            .from('licitacoes')
            .select('id, numero, objeto, orgao')
            .or(`numero.ilike.%${q}%,objeto.ilike.%${q}%,orgao.ilike.%${q}%`)
            .limit(6),
          supabase
            .from('clientes')
            .select('id, nome, cnpj')
            .or(`nome.ilike.%${q}%,cnpj.ilike.%${q}%`)
            .limit(5),
        ]);
        const results: RemoteResult[] = [
          ...(licRes.data || []).map((l: any) => ({
            id: l.id,
            label: l.numero || l.objeto?.slice(0, 60) || 'Licitação',
            hint: l.orgao || l.objeto?.slice(0, 80),
            type: 'licitacao' as const,
            path: `/licitacoes?id=${l.id}`,
          })),
          ...(cliRes.data || []).map((c: any) => ({
            id: c.id,
            label: c.nome,
            hint: c.cnpj || undefined,
            type: 'cliente' as const,
            path: `/clientes?id=${c.id}`,
          })),
        ];
        setRemote(results);
      } catch {
        setRemote([]);
      }
      setLoadingRemote(false);
    }, 220);
    return () => clearTimeout(handle);
  }, [query, open]);

  const groupedPages = useMemo(() => {
    const groups: Record<string, typeof STATIC_PAGES> = {};
    STATIC_PAGES.forEach((p) => {
      (groups[p.group] ||= []).push(p);
    });
    return groups;
  }, []);

  const go = (path: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(path);
  };

  const licitacoesRemote = remote.filter((r) => r.type === 'licitacao');
  const clientesRemote = remote.filter((r) => r.type === 'cliente');

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar páginas, licitações, clientes…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loadingRemote ? 'Buscando…' : 'Nada encontrado.'}
        </CommandEmpty>

        {licitacoesRemote.length > 0 && (
          <>
            <CommandGroup heading="Licitações">
              {licitacoesRemote.map((r) => (
                <CommandItem key={r.id} value={`lic-${r.id}-${r.label}`} onSelect={() => go(r.path)}>
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{r.label}</span>
                    {r.hint && <span className="truncate text-xs text-muted-foreground">{r.hint}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {clientesRemote.length > 0 && (
          <>
            <CommandGroup heading="Clientes">
              {clientesRemote.map((r) => (
                <CommandItem key={r.id} value={`cli-${r.id}-${r.label}`} onSelect={() => go(r.path)}>
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{r.label}</span>
                    {r.hint && <span className="truncate text-xs text-muted-foreground">{r.hint}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {Object.entries(groupedPages).map(([group, pages]) => (
          <CommandGroup key={group} heading={group}>
            {pages.map((p) => (
              <CommandItem key={p.path} value={`${group}-${p.label}`} onSelect={() => go(p.path)}>
                <p.Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{p.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{p.path}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandSeparator />
        <CommandGroup heading="Ações rápidas">
          <CommandItem onSelect={() => go('/licitacoes?action=new')}>
            <FileText className="mr-2 h-4 w-4" /> Nova licitação
          </CommandItem>
          <CommandItem onSelect={() => go('/tarefas?action=new')}>
            <ListTodo className="mr-2 h-4 w-4" /> Nova tarefa
          </CommandItem>
          <CommandItem onSelect={() => go('/clientes?action=new')}>
            <Building2 className="mr-2 h-4 w-4" /> Novo cliente
          </CommandItem>
          <CommandItem onSelect={() => go('/atendimento?action=new')}>
            <MessageSquare className="mr-2 h-4 w-4" /> Novo ticket
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
