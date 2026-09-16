import { Search, HelpCircle, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useShortcuts } from '@/contexts/ShortcutsContext';
import { useEffect, useState } from 'react';
import { NotificationsBell } from './NotificationsBell';


interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isImpersonating, impersonatedUser, stopImpersonation } = useImpersonation();
  const { openPalette, openShortcutsHelp } = useShortcuts();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
  }, []);

  return (
    <>



      {/* Spy Mode Banner */}
      {isImpersonating && impersonatedUser && (
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-amber-500 text-amber-950">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 animate-pulse" />
            <span className="font-semibold text-sm">
              Modo Espião — Visualizando como: {impersonatedUser.nome || 'Usuário'}
            </span>
            {impersonatedUser.cargo && (
              <span className="text-xs opacity-75">({impersonatedUser.cargo})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopImpersonation}
            className="text-amber-950 hover:bg-amber-600 hover:text-amber-950 gap-2"
          >
            <X className="w-4 h-4" />
            Sair do Modo Espião
          </Button>
        </div>
      )}

      <header
        className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-card/80 backdrop-blur-xl border-b border-border"
        style={isImpersonating ? { top: '40px' } : undefined}
      >
        <div className="min-w-0">
          <h1 className="text-xl font-heading font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Global search trigger — opens command palette */}
          <button
            type="button"
            onClick={openPalette}
            className="hidden md:flex items-center gap-2 w-72 px-3 py-1.5 rounded-md border border-border bg-secondary/60 hover:bg-secondary text-left text-sm text-muted-foreground transition-colors group"
            aria-label="Abrir busca global"
          >
            <Search className="w-4 h-4 shrink-0 group-hover:text-foreground transition-colors" />
            <span className="flex-1 truncate">Buscar licitações, clientes, páginas…</span>
            <kbd className="kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
            <kbd className="kbd">K</kbd>
          </button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={openPalette}
            aria-label="Abrir busca global"
          >
            <Search className="w-5 h-5" />
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={openShortcutsHelp}
              aria-label="Atalhos de teclado"
              title="Atalhos de teclado (?)"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>

        </div>
      </header>
    </>
  );
}
