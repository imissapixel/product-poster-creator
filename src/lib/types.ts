export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoFrame {
  id: string;
  file: File;
  src: string;
  aspectRatio: number;
  naturalWidth: number;
  naturalHeight: number;
  layout: NormalizedRect;
}

export interface ThemePalette {
  background: string;
  card: string;
  muted: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  border: string;
}
