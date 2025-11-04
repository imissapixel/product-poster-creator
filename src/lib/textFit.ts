export interface TextFitOptions {
  maxWidth: number;
  maxHeight: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  fontWeight: string;
  lineHeightMultiplier: number;
}

export const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 999
): string[] => {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i]?.trim() ?? '';
    let currentLine = '';

    if (paragraph.length === 0) {
      if (lines.length < maxLines) {
        lines.push('');
      }
      if (lines.length >= maxLines) {
        return lines.slice(0, maxLines);
      }
      continue;
    }

    const words = paragraph.split(/\s+/);

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      const { width } = ctx.measureText(nextLine);

      if (width > maxWidth && currentLine) {
        if (lines.length < maxLines) {
          lines.push(currentLine);
        }
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    });

    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }

    const hasMoreParagraphs = i < paragraphs.length - 1;
    const canAddBreak = lines.length < maxLines;

    if (hasMoreParagraphs && canAddBreak) {
      lines.push('');
    }

    if (lines.length >= maxLines) {
      return lines.slice(0, maxLines);
    }
  }

  return lines;
};

export const fitTextBlock = (
  ctx: CanvasRenderingContext2D,
  rawText: string,
  options: TextFitOptions
) => {
  const text = rawText.trim() || '';
  const words = text.length > 0 ? text : ' ';

  for (let size = options.maxFontSize; size >= options.minFontSize; size -= 1) {
    ctx.font = `${options.fontWeight} ${size}px "Inter", "Arial", sans-serif`;
    const lines = wrapText(ctx, words, options.maxWidth, options.maxLines);
    const lineHeight = size * options.lineHeightMultiplier;
    const blockHeight = lines.length * lineHeight;

    if (blockHeight <= options.maxHeight) {
      return {
        fontSize: size,
        lineHeight,
        lines,
      };
    }
  }

  const fallbackSize = options.minFontSize;
  ctx.font = `${options.fontWeight} ${fallbackSize}px "Inter", "Arial", sans-serif`;
  const lines = wrapText(ctx, words, options.maxWidth, options.maxLines);
  return {
    fontSize: fallbackSize,
    lineHeight: fallbackSize * options.lineHeightMultiplier,
    lines: lines.length > 0 ? lines : [''],
  };
};

export const fitPriceFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number
) => {
  for (let size = maxFontSize; size >= minFontSize; size -= 1) {
    ctx.font = `600 ${size}px "Inter", "Arial", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
  }
  return minFontSize;
};
