import { useMemo, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ImageUploadProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
}

export const ImageUpload = ({ images, onImagesChange }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);

  const thumbnailLayout = useMemo(() => {
    const count = images.length;

    if (count === 0) {
      return {
        size: 'min(12rem, 70vw)',
        gap: 12,
        padding: '0.75rem',
      };
    }

    if (count === 1) {
      return {
        size: 'min(12rem, 70vw)',
        gap: 12,
        padding: '0.75rem',
      };
    }

    if (count === 2) {
      return {
        size: 'min(9rem, calc((100% - 12px)/2), 45vw)',
        gap: 12,
        padding: '0.75rem',
      };
    }

    const gap = 8;
    const maxSize = count === 3 ? '7rem' : '6rem';

    return {
      size: `min(${maxSize}, calc((100% - ${(count - 1) * gap}px) / ${count}), 26vw)`,
      gap,
      padding: '0.5rem',
    };
  }, [images.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = [...images, ...validFiles].slice(0, 4);
    onImagesChange(newImages);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    const newImages = [...images, ...validFiles].slice(0, 4);
    onImagesChange(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label={t('chooseFiles')}
        className={`w-full min-h-[120px] rounded-lg border-2 border-dashed transition-all cursor-pointer flex items-center justify-center ${
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-muted/30 hover:border-primary hover:bg-muted/50'
        }`}
      >
        {images.length > 0 ? (
          <div
            className="flex w-full flex-wrap items-center justify-center"
            style={{
              gap: `${thumbnailLayout.gap}px`,
              padding: thumbnailLayout.padding,
            }}
          >
            {images.map((file, index) => (
              <div
                key={index}
                className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted shadow-sm"
                style={{
                  width: thumbnailLayout.size,
                  height: thumbnailLayout.size,
                }}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`${t('uploadedImageAltPrefix')} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-2">
              {t('chooseFiles')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('uploadHint')}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length > 0 && `${images.length} ${t('imagesSelected')}`}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        aria-label={t('chooseFiles')}
        className="hidden"
      />
    </div>
  );
};
