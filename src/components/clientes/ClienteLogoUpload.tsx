import { useState, useRef, useCallback } from 'react';
import { Upload, X, Building2, Loader2, ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ClienteLogoUploadProps {
  logoUrl: string | null;
  clienteId?: string;
  clienteNome: string;
  onLogoChange: (url: string | null) => void;
}

// Compress image using canvas
const compressImage = (file: File, maxWidth = 400, maxHeight = 400, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw white background for transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
};

export function ClienteLogoUpload({ logoUrl, clienteId, clienteNome, onLogoChange }: ClienteLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'success'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecione uma imagem');
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);
    setUploadStatus('compressing');
    setUploadProgress(10);

    try {
      // Compress the image
      const compressedBlob = await compressImage(file);
      const originalSize = (file.size / 1024).toFixed(1);
      const compressedSize = (compressedBlob.size / 1024).toFixed(1);
      
      setUploadProgress(40);
      setUploadStatus('uploading');

      const fileName = `${clienteId || 'temp'}-${Date.now()}.jpg`;
      const filePath = `logos/${fileName}`;

      // Upload to storage
      setUploadProgress(60);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      setUploadProgress(90);

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      setUploadStatus('success');
      
      onLogoChange(data.publicUrl);
      toast.success(`Logo enviada! (${originalSize}KB → ${compressedSize}KB)`);
      
      // Reset after success animation
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
        setPreviewUrl(null);
      }, 1500);
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
      setUploadStatus('idle');
      setUploadProgress(0);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Cleanup
      URL.revokeObjectURL(objectUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [clienteId, onLogoChange]);

  const handleRemoveLogo = () => {
    onLogoChange(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'compressing':
        return 'Comprimindo...';
      case 'uploading':
        return 'Enviando...';
      case 'success':
        return 'Sucesso!';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20 border-2 border-border transition-all duration-300">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt="Preview" className="object-cover" />
          ) : (
            <AvatarImage src={logoUrl || undefined} alt={clienteNome} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {clienteNome ? getInitials(clienteNome) : <Building2 className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay with progress */}
        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-full backdrop-blur-sm">
            {uploadStatus === 'success' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500 animate-scale-in" />
            ) : (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 min-w-[160px]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {uploadStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span>{getStatusText()}</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {logoUrl ? 'Alterar Logo' : 'Enviar Logo'}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveLogo}
                className="text-destructive hover:text-destructive gap-2"
              >
                <X className="w-4 h-4" />
                Remover
              </Button>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          PNG, JPG (compressão automática)
        </p>
      </div>
    </div>
  );
}
