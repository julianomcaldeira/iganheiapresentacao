import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  subtitle?: string;
}

export default function Placeholder({ title, subtitle = "Este módulo está em desenvolvimento" }: PlaceholderProps) {
  return (
    <MainLayout title={title} subtitle={subtitle}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-glow">
          <Construction className="w-10 h-10 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground max-w-md">
          Este módulo será implementado em breve. Ele incluirá todas as funcionalidades 
          descritas na documentação do sistema i-Ganhei 2.0.
        </p>
      </motion.div>
    </MainLayout>
  );
}
