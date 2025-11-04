import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MoveDiagonal2 } from 'lucide-react';
import { cn, formatNumberWithCommas } from '@/lib/utils';
import type { NormalizedRect, PhotoFrame, ThemePalette } from '@/lib/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { CANVAS_HEIGHT, CANVAS_WIDTH, MIN_TEXT_RATIO } from '@/lib/constants';
import { fitPriceFontSize, fitTextBlock } from '@/lib/textFit';

interface ListingPreviewProps {
  frames: PhotoFrame[];
  onFrameChange: (id: string, layout: NormalizedRect) => void;
  onFocusFrame?: (id: string) => void;
  title: string;
  price: number;
  currencyLabel: string;
  description: string;
  location: string;
  isLoading?: boolean;
  photoAreaWidth: number;
  palette: ThemePalette;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const MIN_FRAME_WIDTH_PX = 80;
const WIDTH_MAX = 1;
const SNAP_THRESHOLD = 0.02;
const MAX_DESCRIPTION_PARAGRAPHS = 8;
const MAX_LOCATION_LENGTH = 34;
const LOCATION_WIDTH_RATIO = 0.8;

export const ListingPreview = ({
  frames,
  onFrameChange,
  onFocusFrame,
  title,
  price,
  currencyLabel,
  description,
  location,
  isLoading = false,
  photoAreaWidth,
  palette,
}: ListingPreviewProps) => {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const photoAreaRef = useRef<HTMLDivElement>(null);
  const measurementCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pinchState = useRef<{
    id: string;
    initialDistance: number;
    initialWidth: number;
    initialHeight: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const dragState = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialRect: NormalizedRect;
  } | null>(null);
  const resizeState = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialRect: NormalizedRect;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  });
  const [isMeasured, setIsMeasured] = useState(false);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setPreviewSize((prev) => {
          if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
            return prev;
          }
          return { width, height };
        });
        setIsMeasured(true);
      }
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      updateSize(width, height);
    });

    const rect = node.getBoundingClientRect();
    updateSize(rect.width, rect.height);

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const getMeasurementContext = () => {
    if (measurementCtxRef.current) {
      return measurementCtxRef.current;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const canvas = document.createElement('canvas');
    measurementCtxRef.current = canvas.getContext('2d');
    return measurementCtxRef.current;
  };

  useEffect(() => {
    if (!frames.find((frame) => frame.id === activeId)) {
      setActiveId(null);
    }
  }, [frames, activeId]);

  const freeLabel = t('priceFree');
  const invalidLabel = t('priceInvalid');

  const priceLabel = useMemo(() => {
    if (!Number.isFinite(price) || price < 0) {
      return `${currencyLabel} ${invalidLabel}`;
    }

    if (price === 0) {
      return freeLabel;
    }

    return `${currencyLabel} ${formatNumberWithCommas(price)}`;
  }, [price, currencyLabel, freeLabel, invalidLabel]);

  const handleFrameUpdate = (id: string, layout: NormalizedRect) => {
    onFrameChange(id, {
      ...layout,
      x: Number(layout.x.toFixed(6)),
      y: Number(layout.y.toFixed(6)),
      width: Number(layout.width.toFixed(6)),
      height: Number(layout.height.toFixed(6)),
    });
  };

  const normalizedHeightFromWidth = (
    width: number,
    aspectRatio: number,
    containerAspect: number,
  ) => {
    if (!Number.isFinite(width) || width < 0) return 0;
    if (
      !Number.isFinite(aspectRatio) ||
      aspectRatio <= 0 ||
      !Number.isFinite(containerAspect) ||
      containerAspect <= 0
    ) {
      return Math.max(0, Math.min(1, width));
    }
    const height = width * (containerAspect / aspectRatio);
    return Math.max(0, Math.min(1, height));
  };

  const getContainerMetrics = () => {
    const width = previewSize.width * photoRatio;
    const height = previewSize.height;
    if (width <= 0 || height <= 0) {
      return null;
    }
    return {
      width,
      height,
      aspect: width / height,
    };
  };

  const snapCoordinate = (
    value: number,
    size: number,
    axis: 'x' | 'y',
    frameId: string,
  ) => {
    const candidates: number[] = [];
    candidates.push(0);
    candidates.push(1 - size);

    frames.forEach((frame) => {
      if (frame.id === frameId) return;
      const other = frame.layout;
      if (axis === 'x') {
        candidates.push(other.x);
        candidates.push(other.x + other.width);
        candidates.push(other.x - size);
        candidates.push(other.x + other.width - size);
      } else {
        candidates.push(other.y);
        candidates.push(other.y + other.height);
        candidates.push(other.y - size);
        candidates.push(other.y + other.height - size);
      }
    });

    for (const candidate of candidates) {
      if (Math.abs(value - candidate) <= SNAP_THRESHOLD) {
        return candidate;
      }
    }

    return value;
  };

  const clampPosition = (value: number, size: number) => {
    if (!Number.isFinite(size)) {
      return Math.min(1, Math.max(0, value));
    }
    const max = Math.max(0, 1 - size);
    return Math.min(max, Math.max(0, value));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, frame: PhotoFrame) => {
    if (event.button === 1 || event.button === 2) return;
    if (resizeState.current || isPinching) return;

    const metrics = getContainerMetrics();
    if (!metrics) return;

    const rect = frame.layout;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      id: frame.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialRect: rect,
    };
    setActiveId(frame.id);
    onFocusFrame?.(frame.id);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPinching) return;
    const drag = dragState.current;
    const resize = resizeState.current;

    if (drag && event.pointerId === drag.pointerId) {
      const metrics = getContainerMetrics();
      if (!metrics) return;

      const deltaX = (event.clientX - drag.startX) / metrics.width;
      const deltaY = (event.clientY - drag.startY) / metrics.height;

      const frame = frames.find((item) => item.id === drag.id);
      if (!frame) return;

      let newX = drag.initialRect.x + deltaX;
      let newY = drag.initialRect.y + deltaY;

      newX = snapCoordinate(newX, frame.layout.width, 'x', frame.id);
      newY = snapCoordinate(newY, frame.layout.height, 'y', frame.id);

      newX = clampPosition(newX, frame.layout.width);
      newY = clampPosition(newY, frame.layout.height);

      handleFrameUpdate(frame.id, {
        ...frame.layout,
        x: newX,
        y: newY,
      });
      return;
    }

    if (resize && event.pointerId === resize.pointerId) {
      const frame = frames.find((item) => item.id === resize.id);
      if (!frame) return;
      const metrics = getContainerMetrics();
      if (!metrics) return;

      const deltaX = (event.clientX - resize.startX) / metrics.width;
      const minWidthNormalized = Math.max(
        MIN_FRAME_WIDTH_PX / metrics.width,
        0.04 // guardrail minimal percent
      );

      const candidateWidth = resize.initialRect.width + deltaX;
      const availableWidth = Math.max(0, 1 - resize.initialRect.x);
      const availableHeight = Math.max(0, 1 - resize.initialRect.y);
      const maxWidthFromHeight =
        availableHeight > 0 ? availableHeight * (frame.aspectRatio / metrics.aspect) : 0;
      const maxWidthBound = Math.max(
        0,
        Math.min(WIDTH_MAX, availableWidth, maxWidthFromHeight),
      );
      const minWidth = Math.min(minWidthNormalized, maxWidthBound);
      const maxWidth = Math.max(minWidth, maxWidthBound);
      const nextWidth = clamp(candidateWidth, minWidth, maxWidth);
      const nextHeight = normalizedHeightFromWidth(nextWidth, frame.aspectRatio, metrics.aspect);

      handleFrameUpdate(frame.id, {
        ...frame.layout,
        width: nextWidth,
        height: nextHeight,
      });
    }
  };

  const clearPointerStates = (pointerId: number) => {
    if (dragState.current && dragState.current.pointerId === pointerId) {
      dragState.current = null;
    }
    if (resizeState.current && resizeState.current.pointerId === pointerId) {
      resizeState.current = null;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    clearPointerStates(event.pointerId);
  };

  const handleResizePointerDown = (event: React.PointerEvent<HTMLElement>, frame: PhotoFrame) => {
    event.stopPropagation();
    if (isPinching) return;

    const metrics = getContainerMetrics();
    if (!metrics) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    resizeState.current = {
      id: frame.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initialRect: frame.layout,
    };
    setActiveId(frame.id);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>, frame: PhotoFrame) => {
    if (event.touches.length === 2) {
      const [a, b] = Array.from(event.touches);
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const metrics = getContainerMetrics();
      if (!metrics) return;

      const rect = frame.layout;
      const centerX = (rect.x + rect.width / 2) * metrics.width;
      const centerY = (rect.y + rect.height / 2) * metrics.height;

      pinchState.current = {
        id: frame.id,
        initialDistance: distance,
        initialWidth: rect.width * metrics.width,
        initialHeight: rect.height * metrics.height,
        centerX,
        centerY,
      };
      setIsPinching(true);
      setActiveId(frame.id);
    }
    if (event.touches.length === 1) {
      onFocusFrame?.(frame.id);
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!pinchState.current) return;
    if (event.touches.length !== 2) return;
    event.preventDefault();

    const metrics = getContainerMetrics();
    if (!metrics) return;

    const [a, b] = Array.from(event.touches);
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const pinch = pinchState.current;
    const frame = frames.find((item) => item.id === pinch.id);
    if (!frame) return;

    const scale = distance / pinch.initialDistance;
    const minWidthPx = Math.max(MIN_FRAME_WIDTH_PX, frame.layout.width * metrics.width * 0.5);

    const maxWidthFromWidth = Math.min(pinch.centerX * 2, (metrics.width - pinch.centerX) * 2);

    const maxHeightPx = Math.min(pinch.centerY * 2, (metrics.height - pinch.centerY) * 2);
    const maxWidthFromHeight = maxHeightPx * frame.aspectRatio;

    const maxWidthPx = Math.min(maxWidthFromWidth, maxWidthFromHeight, metrics.width);
    const nextWidthPx = clamp(pinch.initialWidth * scale, minWidthPx, maxWidthPx);
    const nextHeightPx = nextWidthPx / frame.aspectRatio;

    const nextWidth = nextWidthPx / metrics.width;
    const nextHeight = nextHeightPx / metrics.height;
    let nextX = (pinch.centerX - nextWidthPx / 2) / metrics.width;
    let nextY = (pinch.centerY - nextHeightPx / 2) / metrics.height;

    nextX = snapCoordinate(nextX, nextWidth, 'x', frame.id);
    nextY = snapCoordinate(nextY, nextHeight, 'y', frame.id);

    nextX = clampPosition(nextX, nextWidth);
    nextY = clampPosition(nextY, nextHeight);

    handleFrameUpdate(frame.id, {
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    });
  };

  const handleTouchEnd = () => {
    if (pinchState.current) {
      pinchState.current = null;
      setIsPinching(false);
    }
  };

  const hasImages = frames.length > 0;
  const placeholderTitle = title || t('previewTitleFallback');
  const placeholderDescription = description || t('previewDescriptionFallback');
  const locationPlaceholderText = t('locationPlaceholder');
  const rawLocation = location.trim().slice(0, MAX_LOCATION_LENGTH);
  const hasLocation = rawLocation.length > 0;
  const locationText = hasLocation ? rawLocation : locationPlaceholderText;

  const clampedPhotoWidth = Math.min(photoAreaWidth, CANVAS_WIDTH * (2 / 3));
  let textRatio = 1 - clampedPhotoWidth / CANVAS_WIDTH;
  if (textRatio < MIN_TEXT_RATIO) {
    textRatio = MIN_TEXT_RATIO;
  }
  const photoRatio = 1 - textRatio;

  const typography = useMemo(() => {
    const ctx = getMeasurementContext();
    if (!ctx) {
      return {
        title: { lines: [placeholderTitle], fontSize: 28, lineHeight: 32 },
        price: { label: priceLabel, fontSize: 22, lineHeight: 28 },
        location: {
          lines: [locationText],
          fontSize: 22,
          lineHeight: 26,
          isPlaceholder: !hasLocation,
        },
        description: { lines: [placeholderDescription], fontSize: 20, lineHeight: 26 },
        priceMarginTop: 0,
        titleMarginTop: 12,
        dividerMarginTop: 12,
        descriptionMarginTop: 24,
      };
    }

    const previewWidth = Math.max(previewSize.width, 1);
    const previewHeight = Math.max(previewSize.height, 1);
    const canvasScale = previewHeight / CANVAS_HEIGHT;

    const paddingX = 56;
    const paddingY = 64;
    const canvasPhotoWidth = Math.min(photoAreaWidth, CANVAS_WIDTH * (2 / 3));
    const canvasTextWidth = CANVAS_WIDTH - canvasPhotoWidth;
    const innerCanvasWidth = Math.max(canvasTextWidth - paddingX * 2, 80);
    const availableCanvasHeight = Math.max(CANVAS_HEIGHT - paddingY * 2, 80);

    const titleFit = fitTextBlock(ctx, placeholderTitle, {
      maxWidth: innerCanvasWidth,
      maxHeight: availableCanvasHeight * 0.45,
      maxLines: 3,
      maxFontSize: 56,
      minFontSize: 28,
      fontWeight: '700',
      lineHeightMultiplier: 1.12,
    });

    const priceFontSizeCanvas = fitPriceFontSize(ctx, priceLabel, innerCanvasWidth, 48, 24);
    const priceLineHeightCanvas = priceFontSizeCanvas * 1.1;
    const priceBaseline = paddingY + priceLineHeightCanvas;
    const titleStartY = priceBaseline + priceLineHeightCanvas * 0.4;

    const titleBlockHeight =
      titleFit.lines.length > 0
        ? titleFit.fontSize + (titleFit.lines.length - 1) * titleFit.lineHeight
        : 0;

    const dividerY = titleStartY + titleBlockHeight + titleFit.lineHeight * 0.6;
    const descriptionStartY = dividerY + 24;
    const remainingHeightCanvas = Math.max(CANVAS_HEIGHT - paddingY - descriptionStartY, 0);

    const descriptionOptions = {
      maxWidth: innerCanvasWidth,
      maxHeight: remainingHeightCanvas,
      maxLines: 60,
      maxFontSize: 44,
      minFontSize: 16,
      fontWeight: '400',
      lineHeightMultiplier: 1.28,
    } as const;

    let descriptionFit = fitTextBlock(ctx, placeholderDescription, descriptionOptions);

    if (remainingHeightCanvas > 0) {
      const blockHeightCanvas = descriptionFit.lines.length * descriptionFit.lineHeight;
      if (blockHeightCanvas > 0) {
        const fillRatio = blockHeightCanvas / remainingHeightCanvas;
        const perLineCap = Math.floor(
          (remainingHeightCanvas / Math.max(descriptionFit.lines.length, 1)) /
            descriptionOptions.lineHeightMultiplier
        );
        const dynamicCap = Math.max(
          descriptionOptions.minFontSize,
          Math.min(56, perLineCap || descriptionOptions.maxFontSize)
        );

        if (fillRatio < 0.65 && dynamicCap > descriptionFit.fontSize) {
          const desiredSize = Math.min(
            dynamicCap,
            Math.max(
              descriptionFit.fontSize + 1,
              Math.floor(descriptionFit.fontSize / Math.max(fillRatio, 0.15))
            )
          );

          if (desiredSize > descriptionFit.fontSize) {
            descriptionFit = fitTextBlock(ctx, placeholderDescription, {
              ...descriptionOptions,
              maxFontSize: desiredSize,
            });
          }
        }
      }
    }

    const titleFontSize = titleFit.fontSize * canvasScale;
    const titleLineHeight = titleFit.lineHeight * canvasScale;
    const priceFontSize = priceFontSizeCanvas * canvasScale;
    const priceLineHeight = priceLineHeightCanvas * canvasScale;
    const priceMarginTop = 0;
    const titleMarginTop = priceLineHeightCanvas * 0.4 * canvasScale;
    const dividerMarginTop = titleFit.lineHeight * 0.6 * canvasScale;
    const descriptionMarginTop = 24 * canvasScale;

    const descriptionFontSize = descriptionFit.fontSize * canvasScale;
    const descriptionLineHeight = descriptionFit.lineHeight * canvasScale;
    const locationFit = fitTextBlock(ctx, locationText, {
      maxWidth: innerCanvasWidth * LOCATION_WIDTH_RATIO,
      maxHeight: priceLineHeightCanvas * 1.5,
      maxLines: 1,
      maxFontSize: 34,
      minFontSize: 18,
      fontWeight: '500',
      lineHeightMultiplier: 1.2,
    });

    const locationValue = {
      lines: locationFit.lines.length ? locationFit.lines : [locationText],
      fontSize: locationFit.fontSize * canvasScale,
      lineHeight: locationFit.lineHeight * canvasScale,
      isPlaceholder: !hasLocation,
    };

    return {
      title: {
        lines: titleFit.lines.length ? titleFit.lines : [placeholderTitle],
        fontSize: titleFontSize,
        lineHeight: titleLineHeight,
      },
      price: {
        label: priceLabel,
        fontSize: priceFontSize,
        lineHeight: priceLineHeight,
      },
      location: locationValue,
      titleMarginTop,
      description: {
        lines: descriptionFit.lines.length ? descriptionFit.lines : [placeholderDescription],
        fontSize: descriptionFontSize,
        lineHeight: descriptionLineHeight,
      },
      priceMarginTop,
      dividerMarginTop,
      descriptionMarginTop,
      paddingX: 56 * canvasScale,
      paddingY: 64 * canvasScale,
    };
  }, [
    locationText,
    placeholderTitle,
    placeholderDescription,
    photoAreaWidth,
    priceLabel,
    previewSize.height,
    previewSize.width,
    hasLocation,
  ]);

  const descriptionParagraphs = useMemo(() => {
    const paragraphs: string[][] = [];
    let current: string[] = [];

    typography.description.lines.forEach((line) => {
      if (line === '') {
        if (current.length > 0) {
          paragraphs.push(current);
          current = [];
        } else {
          paragraphs.push([]);
        }
        return;
      }

      current.push(line);
    });

    if (current.length > 0) {
      paragraphs.push(current);
    }

    while (paragraphs.length > 1 && paragraphs[paragraphs.length - 1].length === 0) {
      paragraphs.pop();
    }

    while (paragraphs.length > 1 && paragraphs[paragraphs.length - 1].length === 0) {
      paragraphs.pop();
    }

    if (paragraphs.length > MAX_DESCRIPTION_PARAGRAPHS) {
      const limited = paragraphs.slice(0, MAX_DESCRIPTION_PARAGRAPHS);
      const overflow = paragraphs.slice(MAX_DESCRIPTION_PARAGRAPHS);
      const tail = limited[limited.length - 1] ?? [];
      overflow.forEach((segment, index) => {
        if (segment.length === 0) {
          tail.push('');
          return;
        }
        if ((index > 0 || tail.length > 0) && tail[tail.length - 1] !== '') {
          tail.push('');
        }
        tail.push(...segment);
      });
      limited[limited.length - 1] = tail;
      if (limited.length === 0) {
        return [[]];
      }
      return limited;
    }

    if (paragraphs.length === 0) {
      return [[]];
    }

    return paragraphs;
  }, [typography.description.lines]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative aspect-[16/10] w-full overflow-hidden rounded-lg border transition-opacity duration-150',
          !isMeasured && 'opacity-0'
        )}
        style={{ backgroundColor: palette.card, borderColor: palette.border }}
        ref={containerRef}
      >
        <div className="absolute inset-0 flex">
          <div
            className="relative h-full shrink-0"
            ref={photoAreaRef}
            style={{
              flexBasis: `${photoRatio * 100}%`,
              width: `${photoRatio * 100}%`,
              backgroundColor: palette.muted,
            }}
          >
            {hasImages ? (
              <>
                {frames.map((frame, index) => (
                  <div
                    key={frame.id}
                    className={cn(
                      'absolute cursor-grab touch-none overflow-hidden border shadow-sm transition select-none',
                      activeId === frame.id ? 'ring-2 ring-primary' : 'ring-0'
                    )}
                    style={{
                      left: `${frame.layout.x * 100}%`,
                      top: `${frame.layout.y * 100}%`,
                      width: `${frame.layout.width * 100}%`,
                      height: `${frame.layout.height * 100}%`,
                      zIndex: activeId === frame.id ? 20 : 10 + index,
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    }}
                    onPointerDown={(event) => handlePointerDown(event, frame)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onTouchStart={(event) => handleTouchStart(event, frame)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                  >
                    <img
                      src={frame.src}
                      alt={t('previewImageAlt')}
                      className="h-full w-full select-none object-contain"
                      style={{ backgroundColor: palette.muted }}
                      draggable={false}
                    />
                    <button
                      type="button"
                      aria-label={t('resizeHandleLabel')}
                      className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full shadow transition"
                      style={{
                        backgroundColor: palette.background,
                        color: palette.mutedForeground,
                        borderColor: palette.border,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                      onPointerDown={(event) => handleResizePointerDown(event, frame)}
                    >
                      <MoveDiagonal2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {t('previewLoading')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div
                className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm"
                style={{ color: palette.mutedForeground }}
              >
                <span>{t('previewHintPrimary')}</span>
                <span className="text-xs opacity-70">{t('previewHintSecondary')}</span>
              </div>
            )}
          </div>

          <div
            className="flex h-full flex-col justify-between"
            style={{
              flexBasis: `${textRatio * 100}%`,
              width: `${textRatio * 100}%`,
              backgroundColor: palette.background,
              padding: `${typography.paddingY}px ${typography.paddingX}px`,
            }}
          >
            <div className="flex h-full flex-col gap-3 sm:gap-4" style={{ color: palette.foreground }}>
              <div>
                <div className="flex items-baseline justify-between gap-1">
                  <div
                    className="font-medium"
                    style={{
                      fontSize: `${typography.location.fontSize}px`,
                      lineHeight: `${typography.location.lineHeight}px`,
                      color: palette.mutedForeground,
                      maxWidth: `${LOCATION_WIDTH_RATIO * 100}%`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      opacity: typography.location.isPlaceholder ? 0.6 : 1,
                      fontStyle: 'italic',
                    }}
                  >
                    {typography.location.lines.join(' ')}
                  </div>
                  <div
                    className="text-right font-semibold"
                    style={{
                      marginTop: `${typography.priceMarginTop}px`,
                      fontSize: `${typography.price.fontSize}px`,
                      lineHeight: `${typography.price.lineHeight}px`,
                      color: palette.primary,
                    }}
                  >
                    {typography.price.label}
                  </div>
                </div>
                <div
                  className="text-balance font-semibold"
                  style={{
                    marginTop: `${typography.titleMarginTop}px`,
                    fontSize: `${typography.title.fontSize}px`,
                    lineHeight: `${typography.title.lineHeight}px`,
                    color: palette.foreground,
                  }}
                >
                  {typography.title.lines.map((line, idx) => (
                    <div key={`${line}-${idx}`}>{line}</div>
                  ))}
                </div>
                <div
                  className="w-full bg-border"
                  style={{
                    height: '1px',
                    marginTop: `${typography.dividerMarginTop}px`,
                    backgroundColor: palette.border,
                  }}
                />
              </div>
              <div
                className="text-muted-foreground"
                style={{
                  marginTop: `${typography.descriptionMarginTop}px`,
                  fontSize: `${typography.description.fontSize}px`,
                  lineHeight: `${typography.description.lineHeight}px`,
                  color: palette.mutedForeground,
                }}
              >
                {descriptionParagraphs.map((lines, paragraphIdx) => (
                  <div
                    key={`description-paragraph-${paragraphIdx}`}
                    style={{
                      marginTop: paragraphIdx === 0 ? undefined : `${typography.description.lineHeight}px`,
                    }}
                  >
                    {lines.length > 0 ? (
                      lines.map((line, idx) => (
                        <div key={`description-line-${paragraphIdx}-${idx}`}>{line}</div>
                      ))
                    ) : (
                      <div aria-hidden="true">&nbsp;</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
