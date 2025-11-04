import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, Github, ImageIcon, RotateCcw, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { ImageUpload } from '@/components/ImageUpload';
import { ListingPreview } from '@/components/ListingPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useResetContext } from '@/contexts/ResetContext';
import { generateListingImage } from '@/components/ImageGenerator';
import { computeOptimalLayout } from '@/lib/layoutSolver';
import { CANVAS_HEIGHT, CANVAS_WIDTH, MIN_TEXT_RATIO } from '@/lib/constants';
import type { NormalizedRect, PhotoFrame, ThemePalette } from '@/lib/types';
import { readThemePalette } from '@/lib/theme';
import { cn, formatNumberWithCommas } from '@/lib/utils';

const readImageMetadata = (file: File): Promise<{
  url: string;
  width: number;
  height: number;
  aspect: number;
}> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      resolve({
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspect: img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load image'));
    };
    img.src = url;
  });
};

const buildFrameId = (file: File, index: number) =>
  `${file.name}-${file.size}-${file.lastModified}-${index}`;

const MIN_TEXT_WIDTH = CANVAS_WIDTH * MIN_TEXT_RATIO;
const MAX_PHOTO_WIDTH = CANVAS_WIDTH - MIN_TEXT_WIDTH;
const DEFAULT_PHOTO_WIDTH = CANVAS_WIDTH / 2;

const CURRENCY_OPTIONS = ['AED', 'USD', 'EUR'] as const;
type CurrencyCode = (typeof CURRENCY_OPTIONS)[number];
const CURRENCY_PRESETS: Record<CurrencyCode, readonly number[]> = {
  AED: [25, 50, 100, 200, 500, 1000],
  USD: [5, 10, 20, 50, 100, 200],
  EUR: [5, 10, 20, 50, 100, 200],
};
const LOCATION_PRESETS = ['Dubai', 'Abu Dhabi'] as const;
const DUBAI_DISTRICTS = [
  'Al Barsha',
  'Arabian Ranches',
  'Business Bay',
  'Bur Dubai',
  'Deira',
  'Downtown Dubai',
  'Dubai Hills Estate',
  'Dubai Marina',
  'Emirates Hills',
  'Jumeirah',
  'Jumeirah Beach Residence',
  'Jumeirah Lakes Towers',
  'Jumeirah Village Circle',
  'Palm Jumeirah',
  'The Springs',
] as const;
const ABU_DHABI_DISTRICTS = [
  'Al Bateen',
  'Al Khalidiyah',
  'Al Maryah Island',
  'Al Mushrif',
  'Al Raha',
  'Al Raha Beach',
  'Al Reem Island',
  'Corniche',
  'Downtown Abu Dhabi',
  'Khalifa City',
  'Mohammed Bin Zayed City',
  'Saadiyat Island',
  'Shakhbout City',
  'Yas Island',
] as const;
const stripCitySuffix = (name: string, city: 'Dubai' | 'Abu Dhabi') => {
  const trimmed = name.trim();
  const pattern = city === 'Dubai' ? /(?:,\s*)?Dubai$/i : /(?:,\s*)?Abu Dhabi$/i;
  return trimmed.replace(pattern, '').trim();
};
const TITLE_MAX_CHARS = 60;
const LOCATION_MAX_CHARS = 34;
const MIN_DESCRIPTION_CHARS = 250;
const MAX_DESCRIPTION_CHARS = 500;
const COUNTER_THRESHOLD = 5;

const Index = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { setResetHandler } = useResetContext();
  const [images, setImages] = useState<File[]>([]);
  const [frames, setFrames] = useState<PhotoFrame[]>([]);
  const [photoAreaWidth, setPhotoAreaWidth] = useState<number>(DEFAULT_PHOTO_WIDTH);
  const [title, setTitle] = useState('');
  const [priceInput, setPriceInput] = useState('1');
  const [currency, setCurrency] = useState<CurrencyCode>('AED');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLayoutPending, setIsLayoutPending] = useState(false);
  const [hasCustomLayout, setHasCustomLayout] = useState(false);
  const [palette, setPalette] = useState<ThemePalette>(() => readThemePalette());
  const previousUrlsRef = useRef<string[]>([]);
  const [resetKey, setResetKey] = useState(0);

  const descriptionMaxLength = useMemo(() => {
    const clampedPhotoWidth = Math.min(photoAreaWidth, CANVAS_WIDTH * (2 / 3));
    const textWidth = Math.max(CANVAS_WIDTH - clampedPhotoWidth, CANVAS_WIDTH * MIN_TEXT_RATIO);
    const textRatio = textWidth / CANVAS_WIDTH;
    const normalized =
      (Math.min(Math.max(textRatio, MIN_TEXT_RATIO), 1) - MIN_TEXT_RATIO) /
      (1 - MIN_TEXT_RATIO);
    const chars =
      MIN_DESCRIPTION_CHARS + normalized * (MAX_DESCRIPTION_CHARS - MIN_DESCRIPTION_CHARS);
    return Math.round(chars);
  }, [photoAreaWidth]);

  const price = useMemo(() => {
    const parsed = parseInt(priceInput, 10);
    if (Number.isNaN(parsed)) return 1;
    if (parsed < 0) return 0;
    return parsed;
  }, [priceInput]);

  const fallbackTitle = t('previewTitleFallback');
  const fallbackDescription = t('previewDescriptionFallback');
  const freeLabel = t('priceFree');
  const toastLayoutError = t('toastLayoutError');
  const toastGenerateError = t('toastGenerateError');
  const toastDownloadSuccess = t('toastDownloadSuccess');
  const toastCopySuccess = t('toastCopySuccess');
  const toastCopyError = t('toastCopyError');
  const tooltipCopyToClipboard = t('tooltipCopyToClipboard');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      setPalette(readThemePalette());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [theme]);

  useEffect(() => {
    setPalette(readThemePalette());
  }, []);

  const resetFormState = useCallback(() => {
    previousUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previousUrlsRef.current = [];
    setImages([]);
    setFrames([]);
    setPhotoAreaWidth(DEFAULT_PHOTO_WIDTH);
    setTitle('');
    setPriceInput('1');
    setCurrency('AED');
    setDescription('');
    setLocation('');
    setGeneratedImage(null);
    setIsGenerating(false);
    setIsLayoutPending(false);
    setHasCustomLayout(false);
    setPalette(readThemePalette());
    setResetKey((prev) => prev + 1);
  }, [setResetKey]);

  useEffect(() => {
    setDescription((prev) => {
      if (prev.length <= descriptionMaxLength) {
        return prev;
      }
      return prev.slice(0, descriptionMaxLength);
    });
  }, [descriptionMaxLength]);

  useEffect(() => {
    setResetHandler(resetFormState);
    return () => setResetHandler(() => {});
  }, [resetFormState, setResetHandler]);

  useEffect(
    () => () => {
      previousUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    if (images.length === 0) {
      previousUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previousUrlsRef.current = [];
      setFrames([]);
      setPhotoAreaWidth(DEFAULT_PHOTO_WIDTH);
      setIsLayoutPending(false);
      setHasCustomLayout(false);
      return;
    }

    setIsLayoutPending(true);
    const previousUrls = [...previousUrlsRef.current];

    (async () => {
      try {
        const metadata = await Promise.all(images.map((file) => readImageMetadata(file)));
        if (cancelled) {
          metadata.forEach((meta) => URL.revokeObjectURL(meta.url));
          return;
        }

        const aspectRatios = metadata.map((meta) => meta.aspect);
        const { rects, usedWidth } = computeOptimalLayout(aspectRatios, MAX_PHOTO_WIDTH, CANVAS_HEIGHT);
        const safeUsedWidth =
          Number.isFinite(usedWidth) && usedWidth > 0 ? usedWidth : DEFAULT_PHOTO_WIDTH;
        const effectiveWidth = Math.min(
          Math.max(safeUsedWidth, MAX_PHOTO_WIDTH * 0.25),
          MAX_PHOTO_WIDTH
        );

        const nextFrames: PhotoFrame[] = metadata.map((meta, index) => {
          const rect = rects.find((item) => item.index === index) ?? {
            index,
            x: 0,
            y: 0,
            width: effectiveWidth,
            height: CANVAS_HEIGHT,
          };

          const layout: NormalizedRect = {
            x: rect.x / effectiveWidth,
            y: rect.y / CANVAS_HEIGHT,
            width: rect.width / effectiveWidth,
            height: rect.height / CANVAS_HEIGHT,
          };

          return {
            id: buildFrameId(images[index], index),
            file: images[index],
            src: meta.url,
            aspectRatio: meta.aspect,
            naturalWidth: meta.width,
            naturalHeight: meta.height,
            layout,
          };
        });

        previousUrls.forEach((url) => URL.revokeObjectURL(url));
        previousUrlsRef.current = nextFrames.map((frame) => frame.src);
        setFrames(nextFrames);
        setPhotoAreaWidth(effectiveWidth);
        setHasCustomLayout(false);
      } catch (error) {
        console.error('Failed to prepare layout', error);
        toast.error(toastLayoutError);
        setFrames([]);
      } finally {
        if (!cancelled) {
          setIsLayoutPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [images, toastLayoutError]);

  const handleFrameChange = useCallback((id: string, layout: NormalizedRect) => {
    setFrames((prev) =>
      prev.map((frame) => (frame.id === id ? { ...frame, layout } : frame))
    );
    setHasCustomLayout(true);
  }, []);

  const handleFocusFrame = useCallback((id: string) => {
    setFrames((prev) => {
      const index = prev.findIndex((frame) => frame.id === id);
      if (index === -1 || index === prev.length - 1) {
        return prev;
      }
      const next = [...prev];
      const [selected] = next.splice(index, 1);
      next.push(selected);
      return next;
    });
  }, []);

  const handleResetLayout = useCallback(() => {
    setFrames((prev) => {
      if (prev.length === 0) return prev;

      const aspectRatios = prev.map((frame) => frame.aspectRatio);
      const { rects, usedWidth } = computeOptimalLayout(aspectRatios, MAX_PHOTO_WIDTH, CANVAS_HEIGHT);
      const effectiveWidth = Math.min(Math.max(usedWidth, MAX_PHOTO_WIDTH * 0.25), MAX_PHOTO_WIDTH);

      setPhotoAreaWidth(effectiveWidth);
      setHasCustomLayout(false);

      return prev.map((frame, index) => {
        const rect = rects.find((item) => item.index === index) ?? {
          index,
          x: 0,
          y: 0,
          width: effectiveWidth,
          height: CANVAS_HEIGHT,
        };

        return {
          ...frame,
          layout: {
            x: rect.x / effectiveWidth,
            y: rect.y / CANVAS_HEIGHT,
            width: rect.width / effectiveWidth,
            height: rect.height / CANVAS_HEIGHT,
          },
        };
      });
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isLayoutPending) return;

    setIsGenerating(true);
    try {
      const clampedPhotoWidth = Math.min(Math.max(photoAreaWidth, 1), MAX_PHOTO_WIDTH);

      const imageUrl = await generateListingImage({
        frames,
        title: title.trim() || fallbackTitle,
        price,
        description: description.trim() || fallbackDescription,
        location: location.trim(),
        currencyPrefix: currency,
        freeLabel,
        fallbackDescription,
        fallbackTitle,
        photoAreaWidth: clampedPhotoWidth,
        palette,
      });
      setGeneratedImage(imageUrl);
    } catch (error) {
      console.error(error);
      toast.error(toastGenerateError);
    } finally {
      setIsGenerating(false);
    }
  }, [
    frames,
    title,
    price,
    location,
    description,
    isLayoutPending,
    fallbackTitle,
    fallbackDescription,
    currency,
    freeLabel,
    toastGenerateError,
    photoAreaWidth,
    palette,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 500);

    return () => clearTimeout(timer);
  }, [handleGenerate]);

  const buildClipboardContent = useCallback(() => {
    const titleText = (title.trim() || fallbackTitle).trim();
    const priceLine =
      price === 0 ? freeLabel : `${currency} ${formatNumberWithCommas(price)}`;
    const descriptionSource = description.trim() || fallbackDescription;
    const descriptionParagraphs = descriptionSource
      .split(/\r?\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    const descriptionBlock =
      descriptionParagraphs.length > 0
        ? descriptionParagraphs.join('\n\n')
        : descriptionSource;
    const locationText = location.trim().slice(0, LOCATION_MAX_CHARS);

    const clipboardSections = [
      titleText,
      `${t('price')}: ${priceLine}`,
      descriptionBlock,
      locationText ? `${t('location')}: ${locationText}` : null,
    ].filter(Boolean);

    return clipboardSections.join('\n\n');
  }, [
    title,
    fallbackTitle,
    price,
    freeLabel,
    currency,
    description,
    fallbackDescription,
    location,
    t,
  ]);

  const copyListingDetails = useCallback(async () => {
    const clipboardContent = buildClipboardContent();

    if (clipboardContent.length === 0) {
      return false;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(clipboardContent);
      return true;
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      return false;
    }
  }, [buildClipboardContent]);

  const handleDownload = async () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.download = `listing-${Date.now()}.jpg`;
    link.href = generatedImage;
    link.click();

    const copied = await copyListingDetails();
    if (!copied) {
      console.warn('Clipboard copy skipped during download action');
    }

    toast.success(toastDownloadSuccess);
  };

  const handleCopy = async () => {
    const copied = await copyListingDetails();
    if (copied) {
      toast.success(toastCopySuccess);
    } else {
      toast.error(toastCopyError);
    }
  };

  const canDownload =
    Boolean(generatedImage) &&
    !isGenerating &&
    images.length > 0 &&
    title.trim().length > 0 &&
    priceInput.trim().length > 0 &&
    description.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-8 mobile-edge-adjust">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <ImageIcon className="h-5 w-5" />
                  {t('formTitle')}
                </CardTitle>
                {images.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFormState}
                  >
                    {t('clearInputsButton')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload key={resetKey} images={images} onImagesChange={setImages} />

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[7.5rem] flex-1 sm:flex-none sm:w-40">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-2 top-1/2 h-8 -translate-y-1/2 gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground shadow-none hover:bg-accent"
                          aria-label={t('selectCurrency')}
                        >
                          {currency}
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {CURRENCY_OPTIONS.map((option) => (
                          <DropdownMenuItem
                            key={option}
                            onSelect={(event) => {
                              event.preventDefault();
                              setCurrency(option);
                            }}
                          >
                            {option}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={priceInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setPriceInput(digits);
                      }}
                      onBlur={() => {
                        setPriceInput((prev) => {
                          const normalized = prev.slice(0, 8);
                          return normalized === '' ? '1' : normalized;
                        });
                      }}
                      className="pl-16 text-right"
                      aria-label={t('price')}
                    />
                  </div>
                  {CURRENCY_PRESETS[currency].map((preset) => (
                    <Button
                      key={`${currency}-${preset}`}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPriceInput(String(preset).slice(0, 8))}
                      className="flex-1 min-w-[4.75rem] h-10"
                    >
                      {currency} {preset}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder={t('titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_CHARS))}
                  maxLength={TITLE_MAX_CHARS}
                  aria-label={t('title')}
                />
                {TITLE_MAX_CHARS - title.length <= COUNTER_THRESHOLD && (
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <span>
                      {title.length}/{TITLE_MAX_CHARS} {t('maxChars')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder={t('descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, descriptionMaxLength))}
                  maxLength={descriptionMaxLength}
                  rows={4}
                  className="resize-none"
                  aria-label={t('description')}
                />
                {descriptionMaxLength - description.length <= COUNTER_THRESHOLD && (
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <span>
                      {description.length}/{descriptionMaxLength} {t('maxChars')}
                    </span>
                  </div>
                )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className={cn(
                      'flex-1 min-w-[9rem]',
                      currency !== 'AED' && 'w-full'
                    )}
                  >
                    <Input
                      placeholder={t('locationPlaceholder')}
                      value={location}
                      onChange={(e) => setLocation(e.target.value.slice(0, LOCATION_MAX_CHARS))}
                      maxLength={LOCATION_MAX_CHARS}
                      aria-label={t('location')}
                    />
                  </div>
                  {currency === 'AED' &&
                    LOCATION_PRESETS.map((preset) => {
                      const cityButton = (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 flex-shrink-0 px-4"
                          onPointerDown={() => setLocation(preset.slice(0, LOCATION_MAX_CHARS))}
                          onClick={() => setLocation(preset.slice(0, LOCATION_MAX_CHARS))}
                        >
                          {preset}
                        </Button>
                      );

                      if (preset === 'Dubai') {
                        return (
                          <DropdownMenu key={preset}>
                            <DropdownMenuTrigger asChild>{cityButton}</DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                              {DUBAI_DISTRICTS.map((district) => {
                                const label = stripCitySuffix(district, 'Dubai') || district;
                                const formatted = `${label}, Dubai`;
                                return (
                                  <DropdownMenuItem
                                    key={district}
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      setLocation(formatted.slice(0, LOCATION_MAX_CHARS));
                                    }}
                                  >
                                    {label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      }

                      if (preset === 'Abu Dhabi') {
                        return (
                          <DropdownMenu key={preset}>
                            <DropdownMenuTrigger asChild>{cityButton}</DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                              {ABU_DHABI_DISTRICTS.map((district) => {
                                const label = stripCitySuffix(district, 'Abu Dhabi') || district;
                                const formatted = `${label}, Abu Dhabi`;
                                return (
                                  <DropdownMenuItem
                                    key={district}
                                    onSelect={(event) => {
                                      event.preventDefault();
                                      setLocation(formatted.slice(0, LOCATION_MAX_CHARS));
                                    }}
                                  >
                                    {label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      }

                      return null;
                    })}
                </div>
                {LOCATION_MAX_CHARS - location.length <= COUNTER_THRESHOLD && (
                  <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <span>
                      {location.length}/{LOCATION_MAX_CHARS} {t('maxChars')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="p-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t('preview')}</CardTitle>
                {frames.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleResetLayout}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('resetLayout')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ListingPreview
                frames={frames}
                onFrameChange={handleFrameChange}
                onFocusFrame={handleFocusFrame}
                title={title}
                price={price}
                currencyLabel={currency}
                description={description}
                location={location}
                isLoading={isGenerating || isLayoutPending}
                photoAreaWidth={Math.min(Math.max(photoAreaWidth, 1), MAX_PHOTO_WIDTH)}
                palette={palette}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1"
                  size="lg"
                  disabled={!canDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('download')}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handleCopy}
                      disabled={!canDownload}
                      aria-label={tooltipCopyToClipboard}
                      className="h-11 w-11 p-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <span>{tooltipCopyToClipboard}</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">{t('footerPrivacyNotice')}</p>
          <p className="text-xs text-muted-foreground">{t('footerOpenSourceNotice')}</p>
          <a
            href="https://github.com/imissapixel/product-poster-creator"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-transparent text-muted-foreground transition-transform duration-150 hover:-translate-y-0.5 hover:text-primary"
            aria-label="View source code on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
