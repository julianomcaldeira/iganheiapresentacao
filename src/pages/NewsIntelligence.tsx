import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsConfigPanel } from '@/components/news/NewsConfigPanel';
import { NewsEventsPanel } from '@/components/news/NewsEventsPanel';
import { NewsletterPanel } from '@/components/news/NewsletterPanel';
import { Newspaper, Settings, Mail } from 'lucide-react';

export default function NewsIntelligence() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <MainLayout title="📡 Inteligência de Notícias" subtitle="Monitoramento automatizado de notícias empresariais com classificação por IA">
      <div className="space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Notícias
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Newsletter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <NewsEventsPanel />
          </TabsContent>
          <TabsContent value="config">
            <NewsConfigPanel />
          </TabsContent>
          <TabsContent value="newsletter">
            <NewsletterPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
