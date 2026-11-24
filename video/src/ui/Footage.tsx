import React from 'react';
import { AbsoluteFill, OffthreadVideo } from 'remotion';
import { BRAND } from '../brand';

export interface FootageProps {
  /** Путь через staticFile('001/clip.mp4') */
  src: string;
  /** Смещение начала клипа в кадрах (при 30 fps: 1 сек = 30) */
  startFrom?: number;
  /** Конец клипа в кадрах */
  endAt?: number;
  /** Громкость оригинального звука (0 = без звука, 1 = 100%) */
  volume?: number;
  /** Отключить звук полностью (удобно для B-roll поверх диктора) */
  muted?: boolean;
  /** Режим заполнения контейнера */
  objectFit?: 'cover' | 'contain';
  /** Тёмный градиент снизу/поверх видео для читаемости текста и субтитров (0..1) */
  dim?: number;
  /** Скругление углов (для PiP / карточек с видео) */
  borderRadius?: number;
  /** Произвольные стили контейнера */
  style?: React.CSSProperties;
}

/**
 * Обёртка над <OffthreadVideo> для работы со снятым видеорядом (Reels / Shorts / YouTube B-roll).
 * Подходит как для полноэкранного фона с затемнением под субтитры, так и для видео-карточек (PiP).
 */
export const Footage: React.FC<FootageProps> = ({
  src,
  startFrom = 0,
  endAt,
  volume = 1,
  muted = false,
  objectFit = 'cover',
  dim = 0,
  borderRadius = 0,
  style,
}) => {
  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        borderRadius,
        backgroundColor: '#0F172A',
        boxShadow: borderRadius > 0 ? BRAND.shadow.md : undefined,
        ...style,
      }}
    >
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        endAt={endAt}
        volume={muted ? 0 : volume}
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
        }}
      />
      {dim > 0 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(180deg, rgba(15,23,42,${(dim * 0.45).toFixed(2)}) 0%, rgba(15,23,42,${(dim * 0.25).toFixed(2)}) 45%, rgba(15,23,42,${Math.min(0.85, dim).toFixed(2)}) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
