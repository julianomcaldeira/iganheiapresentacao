import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { NotificacoesTab } from '@/components/mensageria/NotificacoesTab';
import { EmailTemplatesTab } from '@/components/mensageria/EmailTemplatesTab';
import { IntegracoesTab } from '@/components/mensageria/IntegracoesTab';
import { EmailEnviosTab } from '@/components/mensageria/EmailEnviosTab';

export default function Mensageria() {
  const [activeTab, setActiveTab] = useState('notificacoes');

  return (
    <MainLayout title="Mensageria" subtitle="Notificações, templates de email e integrações">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Templates Email</span>
            </TabsTrigger>
            <TabsTrigger value="envios" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico Envios</span>
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notificacoes">
            <NotificacoesTab />
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplatesTab />
          </TabsContent>

          <TabsContent value="envios">
            <EmailEnviosTab />
          </TabsContent>

          <TabsContent value="integracoes">
            <IntegracoesTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}