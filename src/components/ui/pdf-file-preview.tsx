import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Maximize2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { PdfViewer } from "@/components/ui/pdf-viewer";

interface PdfFilePreviewProps {
  url: string;
  fileName?: string;
  className?: string;
  compact?: boolean;
}

export function PdfFilePreview({ url, fileName, className, compact = false }: PdfFilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-primary hover:underline",
            className
          )}
        >
          <FileText className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{fileName || "Documento PDF"}</span>
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <PdfFilePreviewDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          url={url}
          fileName={fileName}
        />
      </>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <div className="p-4 flex items-center justify-between gap-3 bg-muted/50">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{fileName || "Documento PDF"}</p>
          <p className="text-xs text-muted-foreground">Pré-visualização do PDF</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
          <Maximize2 className="h-4 w-4 mr-2" />
          Ampliar
        </Button>
      </div>
      <div className="p-4">
        <PdfViewer url={url} />
      </div>

      <PdfFilePreviewDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        url={url}
        fileName={fileName}
      />
    </div>
  );
}

function PdfFilePreviewDialog({
  isOpen,
  onClose,
  url,
  fileName,
}: {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fileName?: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate pr-4">{fileName || "Documento PDF"}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={fileName}>
                  <Download className="h-4 w-4 mr-1" />
                  Baixar
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="p-4 overflow-auto max-h-[70vh] bg-muted/30">
          <PdfViewer url={url} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
