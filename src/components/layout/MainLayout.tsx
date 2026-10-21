import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BackToTop } from '@/components/ui/back-to-top';

declare const __APP_VERSION__: string;

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const versao = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">{children}</main>
        <footer className="px-6 pb-4 text-[10px] text-muted-foreground/60 text-right">
          build {versao}
        </footer>
      </div>
      <BackToTop />
    </div>
  );
}
