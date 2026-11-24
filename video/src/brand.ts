/**
 * Единая система дизайна: Светлый минимализм (Light Minimalism).
 * Все цвета, шрифты, отступы и адаптивные метрики для 16:9 и 9:16.
 */

export const BRAND = {
  colors: {
    bg: '#F7F8FA',
    bgSubtle: '#EEF2F6',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',

    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',

    accent: '#2563EB',
    accentDark: '#1D4ED8',
    accentSoft: '#EFF6FF',
    accentBorder: '#BFDBFE',

    success: '#059669',
    successSoft: '#ECFDF5',
    warning: '#D97706',
    warningSoft: '#FFFBEB',
    danger: '#E11D48',
    dangerSoft: '#FFF1F2',
  },
  fonts: {
    sans: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
    mono: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  },
  radius: {
    sm: 10,
    md: 18,
    lg: 26,
    pill: 999,
  },
  shadow: {
    sm: '0 2px 8px rgba(15, 23, 42, 0.04)',
    md: '0 12px 32px rgba(15, 23, 42, 0.07), 0 2px 6px rgba(15, 23, 42, 0.03)',
    lg: '0 24px 60px rgba(15, 23, 42, 0.10), 0 4px 12px rgba(15, 23, 42, 0.04)',
  },
} as const;

export const FORMATS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
} as const;

export type VideoFormat = keyof typeof FORMATS;

export interface LayoutMetrics {
  isVertical: boolean;
  width: number;
  height: number;
  padX: number;
  padY: number;
  captionBottom: number;
  titleSize: number;
  h2Size: number;
  bodySize: number;
  captionSize: number;
}

export function getLayout(width: number, height: number): LayoutMetrics {
  const isVertical = height > width;
  if (isVertical) {
    return {
      isVertical: true,
      width,
      height,
      padX: 72,
      padY: 140,
      captionBottom: 150,
      titleSize: 72,
      h2Size: 44,
      bodySize: 32,
      captionSize: 42,
    };
  }
  return {
    isVertical: false,
    width,
    height,
    padX: 120,
    padY: 84,
    captionBottom: 56,
    titleSize: 80,
    h2Size: 46,
    bodySize: 30,
    captionSize: 38,
  };
}
