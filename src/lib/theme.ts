import type { ThemePalette } from './types';

const toHsl = (value: string | null | undefined) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return `hsl(${trimmed})`;
};

const FALLBACK_PALETTE: ThemePalette = {
  background: 'hsl(0 0% 98%)',
  card: 'hsl(0 0% 100%)',
  muted: 'hsl(210 15% 95%)',
  foreground: 'hsl(210 20% 15%)',
  mutedForeground: 'hsl(210 15% 45%)',
  primary: 'hsl(185 70% 50%)',
  border: 'hsl(210 20% 88%)',
};

export const readThemePalette = (): ThemePalette => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return FALLBACK_PALETTE;
  }

  const root = document.documentElement;
  const styles = getComputedStyle(root);

  const background = toHsl(styles.getPropertyValue('--background')) ?? FALLBACK_PALETTE.background;
  const card = toHsl(styles.getPropertyValue('--card')) ?? FALLBACK_PALETTE.card;
  const muted = toHsl(styles.getPropertyValue('--muted')) ?? FALLBACK_PALETTE.muted;
  const foreground = toHsl(styles.getPropertyValue('--foreground')) ?? FALLBACK_PALETTE.foreground;
  const mutedForeground =
    toHsl(styles.getPropertyValue('--muted-foreground')) ?? FALLBACK_PALETTE.mutedForeground;
  const primary = toHsl(styles.getPropertyValue('--primary')) ?? FALLBACK_PALETTE.primary;
  const border = toHsl(styles.getPropertyValue('--border')) ?? FALLBACK_PALETTE.border;

  return {
    background,
    card,
    muted,
    foreground,
    mutedForeground,
    primary,
    border,
  };
};
