import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BackToTop } from '@/components/ui/back-to-top';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:ml-64">
        <Header title={title} subtitle={subtitle} />
        <main className="p-6">{children}</main>
      </div>
      <BackToTop />
    </div>
  );
}
