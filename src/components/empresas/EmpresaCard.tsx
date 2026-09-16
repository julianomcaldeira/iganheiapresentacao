import { motion } from 'framer-motion';
import { Building2, MapPin, FileCheck, FileX, MoreVertical, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Empresa } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmpresaCardProps {
  empresa: Empresa;
  index?: number;
}

export function EmpresaCard({ empresa, index = 0 }: EmpresaCardProps) {
  const totalDocumentos = empresa.documentosValidos + empresa.documentosVencidos;
  const percentualValidos = totalDocumentos > 0 
    ? Math.round((empresa.documentosValidos / totalDocumentos) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="group rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
              {empresa.nomeFantasia}
            </h3>
            <p className="text-xs text-muted-foreground">{empresa.cnpj}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'capitalize',
              empresa.situacao === 'ativa'
                ? 'bg-success/10 text-success border-success/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            )}
          >
            {empresa.situacao}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
              <DropdownMenuItem>Editar empresa</DropdownMenuItem>
              <DropdownMenuItem>Ver documentos</DropdownMenuItem>
              <DropdownMenuItem>Consultar CNPJ</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
          {empresa.razaoSocial}
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MapPin className="w-4 h-4" />
          <span>{empresa.cidade}, {empresa.estado}</span>
        </div>

        {/* Documents Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Documentação</span>
            <span className="font-medium text-foreground">{percentualValidos}% válida</span>
          </div>
          
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-success transition-all duration-500"
              style={{ width: `${percentualValidos}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-success">
              <FileCheck className="w-3.5 h-3.5" />
              <span>{empresa.documentosValidos} válidos</span>
            </div>
            {empresa.documentosVencidos > 0 && (
              <div className="flex items-center gap-1.5 text-destructive">
                <FileX className="w-3.5 h-3.5" />
                <span>{empresa.documentosVencidos} vencidos</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-border">
        <Button
          variant="ghost"
          className="flex-1 rounded-none py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Documentos
        </Button>
        <div className="w-px bg-border" />
        <Button
          variant="ghost"
          className="flex-1 rounded-none py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          Licitações
        </Button>
      </div>
    </motion.div>
  );
}
