import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

import {
  LayoutDashboard,
  FileText,
  Users,
  FileCheck,
  Workflow,
  Calendar,
  BarChart3,
  Settings,
  Bot,
  FileSignature,
  
  ChevronDown,
  Package,
  ClipboardList,
  Shield,
  Menu,
  X,
  LogOut,
  CheckSquare,
  Upload,
  History,
  UsersRound,
  Building2,
  Brain,
  Headphones,
  FileText as FileRules,
  MessageCircle,
  Rocket,
  Newspaper,
  Search,
  Truck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import iganheiLogo from '@/assets/iganhei-logo.png';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
  requiredRole?: 'admin' | 'gerente' | 'usuario';
  modulo?: string; // Module name for permission check
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard,
    modulo: 'dashboard',
    children: [
      { label: 'Visão Geral', href: '/', icon: LayoutDashboard, modulo: 'dashboard' },
      { label: 'Contratos', href: '/dashboard/contratos', icon: FileSignature, modulo: 'dashboard' },
      { label: 'Gestão de Contratos', href: '/contratos', icon: FileSignature, modulo: 'dashboard' },
      { label: 'Empenhos', href: '/dashboard/empenhos', icon: FileText, modulo: 'dashboard' },
      { label: 'Concorrentes', href: '/concorrentes', icon: UsersRound, modulo: 'concorrentes' },
      { label: 'Distribuidores', href: '/distribuidores', icon: Truck, modulo: 'dashboard' },
      { label: 'Órgãos', href: '/orgaos', icon: Building2, modulo: 'dashboard' },
      { label: 'Análise Estratégica', href: '/analise-estrategica', icon: Brain, modulo: 'analise_estrategica' },
    ],
  },
  { label: 'Licitações', href: '/licitacoes', icon: FileText, badge: 5, modulo: 'licitacoes' },
  { label: 'Clientes', href: '/clientes', icon: Building2, modulo: 'clientes' },
  { label: 'Tarefas', href: '/tarefas', icon: CheckSquare, modulo: 'tarefas' },
  { label: 'Documentos', href: '/documentos', icon: FileCheck, badge: 2, modulo: 'documentos' },
  { label: 'Produtos', href: '/produtos', icon: Package, modulo: 'produtos' },
  { label: 'Pendências', href: '/pendencias', icon: ClipboardList, badge: 4, modulo: 'pendencias' },
  { label: 'Agenda', href: '/agenda', icon: Calendar, modulo: 'agenda' },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart3, modulo: 'relatorios' },
  {
    label: 'IA i-Ganhei',
    href: '/ia',
    icon: Bot,
    modulo: 'ia',
    children: [
      { label: 'Análise de Edital', href: '/ia/analise-edital', icon: FileText, modulo: 'ia' },
      { label: 'Análise Estratégica', href: '/ia/analise-estrategica', icon: Brain, modulo: 'ia' },
      
      { label: 'Monitor Pregão', href: '/ia/monitor', icon: BarChart3, modulo: 'ia' },
      { label: 'Peças Jurídicas', href: '/ia/pecas', icon: FileSignature, modulo: 'ia' },
      { label: 'Base Conhecimento', href: '/ia/conhecimento', icon: Users, modulo: 'ia' },
    ],
  },
  { label: 'Atendimento', href: '/atendimento', icon: Headphones, modulo: 'atendimento' },
  { label: 'Inteligência News', href: '/news-intelligence', icon: Newspaper, modulo: 'news_intelligence' },
  { label: 'Inteligência iPesquisei', href: '/inteligencia-pesquisei', icon: Search, modulo: 'inteligencia_pesquisei' },
  { label: 'Minhas Regras', href: '/minhas-regras', icon: FileRules, modulo: 'regras' },
  {
    label: 'Administração',
    href: '/admin',
    icon: Shield,
    requiredRole: 'admin',
    children: [
      { label: 'Gestão de Usuários', href: '/admin', icon: Users, requiredRole: 'admin' },
      { label: 'Onboarding', href: '/onboarding', icon: Rocket, requiredRole: 'admin' },
      { label: 'Mensageria', href: '/mensageria', icon: MessageCircle, requiredRole: 'admin' },
      { label: 'Importação', href: '/importacao', icon: Upload, requiredRole: 'admin' },
      
      { label: 'Auditoria', href: '/auditoria', icon: History, requiredRole: 'admin' },
      { label: 'Configurações', href: '/configuracoes', icon: Settings, requiredRole: 'admin' },
    ],
  },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  usuario: 'Usuário',
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut, hasRole, hasPermission } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const canAccessModule = (modulo?: string): boolean => {
    if (!modulo) return true;
    return hasPermission(modulo, 'visualizar');
  };

  const filteredNavItems = useMemo(() => navItems.filter((item) => {
    if (item.requiredRole && !hasRole(item.requiredRole)) return false;
    if (item.modulo && !canAccessModule(item.modulo)) return false;
    return true;
  }).map((item) => {
    if (item.children) {
      const filteredChildren = item.children.filter((child) => {
        if (child.requiredRole && !hasRole(child.requiredRole)) return false;
        if (child.modulo && !canAccessModule(child.modulo)) return false;
        return true;
      });
      return { ...item, children: filteredChildren };
    }
    return item;
  }).filter((item) => {
    if (item.children && item.children.length === 0) return false;
    return true;
  }), [role, hasRole, hasPermission]);

  // Compute which groups should be auto-expanded based on current route
  const activeGroups = useMemo(() => {
    return navItems
      .filter((item) => item.children?.some((child) => location.pathname === child.href))
      .map((item) => item.label);
  }, [location.pathname]);

  const [expandedItems, setExpandedItems] = useState<string[]>(activeGroups);

  useEffect(() => {
    setExpandedItems((prev) => {
      const missing = activeGroups.filter((group) => !prev.includes(group));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
  }, [activeGroups]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => location.pathname === href;
  const isChildActive = (children?: NavItem[]) =>
    children?.some((child) => location.pathname === child.href);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso');
    // Força reload completo para limpar qualquer estado em memória / cache de queries
    window.location.replace('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5 border-b border-sidebar-border bg-white">
        <img src={iganheiLogo} alt="i-Ganhei" className="h-10 w-auto object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <div key={item.label}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isChildActive(item.children)
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      expandedItems.includes(item.label) && 'rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence>
                  {expandedItems.includes(item.label) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-4 mt-1 space-y-1 overflow-hidden"
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                            isActive(child.href)
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <Link
                to={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-destructive text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-3 px-3 py-2 h-auto rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="gradient-primary text-xs font-bold text-primary-foreground">
                  {profile?.nome ? getInitials(profile.nome) : user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.nome || user?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {role ? roleLabels[role] : 'Usuário'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar text-sidebar-foreground shadow-lg"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
