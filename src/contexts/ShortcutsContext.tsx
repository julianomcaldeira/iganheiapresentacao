import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/layout/CommandPalette';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface ShortcutsContextValue {
  openPalette: () => void;
  openShortcutsHelp: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error('useShortcuts must be used inside ShortcutsProvider');
  return ctx;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], altKeys: ['Ctrl', 'K'], action: 'Abrir busca global / paleta de comandos' },
  { keys: ['/'], action: 'Focar barra de busca' },
  { keys: ['G', 'L'], action: 'Ir para Licitações' },
  { keys: ['G', 'C'], action: 'Ir para Clientes' },
  { keys: ['G', 'D'], action: 'Ir para Documentos' },
  { keys: ['G', 'T'], action: 'Ir para Tarefas' },
  { keys: ['G', 'A'], action: 'Ir para Agenda' },
  { keys: ['G', 'H'], action: 'Ir para Dashboard (Home)' },
  { keys: ['N'], action: 'Criar novo (na página atual)' },
  { keys: ['Esc'], action: 'Fechar modais e diálogos' },
  { keys: ['?'], action: 'Mostrar esta ajuda' },
];

const isTypingTarget = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t.isContentEditable
  );
};

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openShortcutsHelp = useCallback(() => setHelpOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — global, even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Single-key shortcuts
      if (e.key === '/') {
        e.preventDefault();
        const search = document.querySelector<HTMLInputElement>('[data-global-search]');
        if (search) search.focus();
        else setPaletteOpen(true);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const newBtn = document.querySelector<HTMLButtonElement>('[data-page-new-action]');
        if (newBtn) newBtn.click();
        return;
      }

      // Two-key g+x sequences
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setPendingG(true);
        setTimeout(() => setPendingG(false), 1200);
        return;
      }
      if (pendingG) {
        const map: Record<string, string> = {
          l: '/licitacoes', c: '/clientes', d: '/documentos',
          t: '/tarefas', a: '/agenda', h: '/', p: '/produtos',
          r: '/relatorios',
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          navigate(path);
          setPendingG(false);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, pendingG]);

  return (
    <ShortcutsContext.Provider value={{ openPalette, openShortcutsHelp }}>
      {children}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atalhos de teclado</DialogTitle>
            <DialogDescription>
              Acelere sua navegação na plataforma. Pressione <kbd className="kbd">?</kbd> a qualquer momento para reabrir esta ajuda.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-foreground">{s.action}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-border bg-muted text-[11px] font-mono font-semibold text-foreground"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ShortcutsContext.Provider>
  );
}
