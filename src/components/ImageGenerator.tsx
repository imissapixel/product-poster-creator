import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/lib/constants';
import type { PhotoFrame, ThemePalette } from '@/lib/types';
import { fitPriceFontSize, fitTextBlock } from '@/lib/textFit';
import { formatNumberWithCommas } from '@/lib/utils';

interface GenerateListingImageProps {
  frames: PhotoFrame[];
  title: string;
  price: number;
  description: string;
  location: string;
  fallbackTitle: string;
  fallbackDescription: string;
  currencyPrefix: string;
  freeLabel: string;
  photoAreaWidth: number;
  palette: ThemePalette;
}

export const generateListingImage = async ({
  frames,
  title,
  price,
  description,
  location,
  fallbackTitle,
  fallbackDescription,
  currencyPrefix,
  freeLabel,
  photoAreaWidth,
  palette,
}: GenerateListingImageProps): Promise<string> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const photoBackground = palette.muted;
  const textBackground = palette.background;
  const textPrimary = palette.foreground;
  const textMuted = palette.mutedForeground;
  const accent = palette.primary;
  const dividerColor = palette.border;

  // Background
  ctx.fillStyle = textBackground;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const clampedPhotoWidth = Math.min(Math.max(photoAreaWidth, 1), CANVAS_WIDTH * (2 / 3));
  const textAreaWidth = CANVAS_WIDTH - clampedPhotoWidth;

  // Photo area backdrop
  ctx.fillStyle = photoBackground;
  ctx.fillRect(0, 0, clampedPhotoWidth, CANVAS_HEIGHT);

  if (frames.length > 0) {
    const loadedFrames = await Promise.all(
      frames.map(
        (frame) =>
          new Promise<{ frame: PhotoFrame; image: HTMLImageElement }>((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve({ frame, image });
            image.onerror = reject;
            image.src = frame.src;
          })
      )
    );

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    loadedFrames.forEach(({ frame, image }) => {
      const layoutX = frame.layout.x * clampedPhotoWidth;
      const layoutY = frame.layout.y * CANVAS_HEIGHT;
      const layoutWidth = frame.layout.width * clampedPhotoWidth;
      const layoutHeight = frame.layout.height * CANVAS_HEIGHT;

      const frameAspect = layoutWidth / layoutHeight;
      const imageAspect = image.naturalWidth / image.naturalHeight;

      let drawWidth = layoutWidth;
      let drawHeight = layoutHeight;
      let drawX = layoutX;
      let drawY = layoutY;

      if (Math.abs(frameAspect - imageAspect) > 0.001) {
        if (imageAspect > frameAspect) {
          drawWidth = layoutWidth;
          drawHeight = drawWidth / imageAspect;
          drawY = layoutY + (layoutHeight - drawHeight) / 2;
        } else {
          drawHeight = layoutHeight;
          drawWidth = drawHeight * imageAspect;
          drawX = layoutX + (layoutWidth - drawWidth) / 2;
        }
      }

      ctx.fillStyle = palette.card;
      ctx.fillRect(layoutX, layoutY, layoutWidth, layoutHeight);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      if (layoutWidth > 2 && layoutHeight > 2) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = palette.border;
        ctx.strokeRect(layoutX + 1, layoutY + 1, layoutWidth - 2, layoutHeight - 2);
      }
    });
  }

  // Text area background
  ctx.fillStyle = textBackground;
  ctx.fillRect(clampedPhotoWidth, 0, textAreaWidth, CANVAS_HEIGHT);

  const paddingX = 56;
  const paddingY = 64;
  const textAreaX = clampedPhotoWidth + paddingX;
  const innerTextWidth = Math.max(textAreaWidth - paddingX * 2, 100);

  const availableHeight = CANVAS_HEIGHT - paddingY * 2;

  const titleText = title.trim() || fallbackTitle;
  const titleFit = fitTextBlock(ctx, titleText, {
    maxWidth: innerTextWidth,
    maxHeight: availableHeight * 0.45,
    maxLines: 3,
    maxFontSize: 56,
    minFontSize: 28,
    fontWeight: '700',
    lineHeightMultiplier: 1.12,
  });

  const priceLabel =
    price === 0 ? freeLabel : `${currencyPrefix} ${formatNumberWithCommas(price)}`;
  const priceFontSize = fitPriceFontSize(ctx, priceLabel, innerTextWidth, 48, 24);
  const priceLineHeight = priceFontSize * 1.1;
  const priceBaseline = paddingY + priceLineHeight;

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = accent;
  ctx.font = `600 ${priceFontSize}px "Inter", "Arial", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(priceLabel, clampedPhotoWidth + textAreaWidth - paddingX, priceBaseline);

  const locationText = location.trim().slice(0, 34);
  if (locationText.length > 0) {
    const locationFit = fitTextBlock(ctx, locationText, {
      maxWidth: innerTextWidth * 0.8,
      maxHeight: priceLineHeight * 1.5,
      maxLines: 1,
      maxFontSize: 34,
      minFontSize: 18,
      fontWeight: '500',
      lineHeightMultiplier: 1.2,
    });

    ctx.fillStyle = textMuted;
    ctx.textAlign = 'left';
    ctx.font = `italic 500 ${locationFit.fontSize}px "Inter", "Arial", sans-serif`;
    const locationBaseline = priceBaseline;
    ctx.fillText(locationFit.lines.join(' '), textAreaX, locationBaseline);
  }

  const titleStartY = priceBaseline + priceLineHeight * 0.4;

  ctx.fillStyle = textPrimary;
  ctx.textAlign = 'left';
  ctx.font = `700 ${titleFit.fontSize}px "Inter", "Arial", sans-serif`;

  let currentBaseline = titleStartY + titleFit.fontSize;
  titleFit.lines.forEach((line, index) => {
    ctx.fillText(line, textAreaX, currentBaseline);
    if (index < titleFit.lines.length - 1) {
      currentBaseline += titleFit.lineHeight;
    }
  });

  const dividerY = currentBaseline + titleFit.lineHeight * 0.6;
  const descriptionText = description.trim() || fallbackDescription;

  ctx.fillStyle = dividerColor;
  ctx.fillRect(textAreaX, dividerY, innerTextWidth, 1);

  const descriptionStartY = dividerY + 24;

  if (descriptionStartY < CANVAS_HEIGHT - paddingY) {
    const descFit = fitTextBlock(ctx, descriptionText, {
      maxWidth: innerTextWidth,
      maxHeight: CANVAS_HEIGHT - paddingY - descriptionStartY,
      maxLines: 60,
      maxFontSize: 38,
      minFontSize: 16,
      fontWeight: '400',
      lineHeightMultiplier: 1.32,
    });

    ctx.fillStyle = textMuted;
    ctx.textAlign = 'left';
    ctx.font = `400 ${descFit.fontSize}px "Inter", "Arial", sans-serif`;

    let descBaseline = descriptionStartY + descFit.fontSize;
    descFit.lines.forEach((line) => {
      if (descBaseline <= CANVAS_HEIGHT - paddingY) {
        if (line) {
          ctx.fillText(line, textAreaX, descBaseline);
        }
        descBaseline += descFit.lineHeight;
      }
    });
  }

  return canvas.toDataURL('image/jpeg', 0.95);
};
