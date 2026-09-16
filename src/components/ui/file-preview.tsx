import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  ExternalLink, 
  Maximize2,
  FileSpreadsheet,
  File,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface FilePreviewProps {
  url: string;
  fileName?: string;
  className?: string;
  compact?: boolean;
}

type FileType = "image" | "pdf" | "excel" | "word" | "other";

function getFileType(url: string, fileName?: string): FileType {
  const name = fileName?.toLowerCase() || url.toLowerCase();
  
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(name) || name.includes("image")) {
    return "image";
  }
  if (/\.pdf(\?|$)/i.test(name) || name.includes("pdf")) {
    return "pdf";
  }
  if (/\.(xlsx?|csv)(\?|$)/i.test(name)) {
    return "excel";
  }
  if (/\.(docx?|rtf)(\?|$)/i.test(name)) {
    return "word";
  }
  return "other";
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case "image":
      return ImageIcon;
    case "pdf":
      return FileText;
    case "excel":
      return FileSpreadsheet;
    case "word":
      return FileText;
    default:
      return File;
  }
}

export function FilePreview({ url, fileName, className, compact = false }: FilePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileType = getFileType(url, fileName);
  const FileIcon = getFileIcon(fileType);

  const canPreview = fileType === "image" || fileType === "pdf";

  if (compact) {
    return (
      <>
        <button
          onClick={() => canPreview && setIsOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-primary hover:underline",
            !canPreview && "cursor-default hover:no-underline",
            className
          )}
        >
          <FileIcon className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{fileName || "Anexo"}</span>
          {canPreview ? (
            <Maximize2 className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>

        {canPreview && (
          <FilePreviewDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            url={url}
            fileName={fileName}
            fileType={fileType}
            imageError={imageError}
            onImageError={() => setImageError(true)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
        {fileType === "image" && !imageError ? (
          <div className="relative group">
            <img
              src={url}
              alt={fileName || "Preview"}
              className="w-full h-auto max-h-48 object-cover cursor-pointer"
              onClick={() => setIsOpen(true)}
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
                <Maximize2 className="h-4 w-4 mr-1" />
                Ampliar
              </Button>
            </div>
          </div>
        ) : fileType === "pdf" ? (
          <div className="relative">
            <div 
              className="bg-muted/50 p-4 flex items-center gap-3 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setIsOpen(true)}
            >
              <div className="p-2 rounded-lg bg-destructive/10">
                <FileText className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{fileName || "Documento PDF"}</p>
                <p className="text-xs text-muted-foreground">Clique para visualizar</p>
              </div>
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{fileName || "Arquivo"}</p>
              <p className="text-xs text-muted-foreground">Baixar para visualizar</p>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}
      </div>

      {canPreview && (
        <FilePreviewDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          url={url}
          fileName={fileName}
          fileType={fileType}
          imageError={imageError}
          onImageError={() => setImageError(true)}
        />
      )}
    </>
  );
}

interface FilePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  fileName?: string;
  fileType: FileType;
  imageError: boolean;
  onImageError: () => void;
}

function FilePreviewDialog({
  isOpen,
  onClose,
  url,
  fileName,
  fileType,
  imageError,
  onImageError,
}: FilePreviewDialogProps) {
  const [pdfError, setPdfError] = useState(false);

  const handleIframeError = () => {
    setPdfError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setPdfError(false);
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">
              {fileName || (fileType === "pdf" ? "Documento PDF" : "Imagem")}
            </DialogTitle>
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
          <VisuallyHidden>
            <DialogDescription>Visualização do arquivo {fileName}</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30">
          {fileType === "image" && !imageError ? (
            <div className="flex items-center justify-center p-4">
              <img
                src={url}
                alt={fileName || "Preview"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={onImageError}
              />
            </div>
          ) : fileType === "pdf" ? (
            pdfError ? (
              <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                <div className="p-4 rounded-full bg-muted">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Pré-visualização não disponível</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O navegador bloqueou a exibição do PDF. Use os botões acima para abrir ou baixar.
                  </p>
                </div>
                <Button variant="default" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em nova aba
                  </a>
                </Button>
              </div>
            ) : (
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                className="w-full h-[70vh] border-0"
                title={fileName || "PDF Preview"}
                onError={handleIframeError}
                onLoad={(e) => {
                  // Check if iframe loaded successfully by trying to access content
                  try {
                    const iframe = e.target as HTMLIFrameElement;
                    // If we can't access contentDocument due to CORS, the PDF might still be loading
                    // Set a timeout to check if the iframe is empty
                    setTimeout(() => {
                      if (iframe.contentDocument?.body?.innerHTML === '') {
                        setPdfError(true);
                      }
                    }, 2000);
                  } catch {
                    // Cross-origin error means the PDF is loading from external source
                    // This is expected behavior, not an error
                  }
                }}
              />
            )
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <p>Não foi possível carregar a pré-visualização</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
