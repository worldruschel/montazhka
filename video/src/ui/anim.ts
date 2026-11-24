/**
 * Хелперы анимации строго от useCurrentFrame() — без useState и CSS-переходов.
 */

export interface CaptionWord {
  index: number;
  word: string;
  start: number;
  end: number;
  startFrame: number;
  endFrame: number;
}

export interface CaptionsData {
  fps: number;
  duration: number;
  durationInFrames: number;
  words: CaptionWord[];
}

export const clamp = (v: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, v));

export const easeOut = (t: number): number => {
  const x = clamp(t);
  return 1 - Math.pow(1 - x, 3);
};

export const easeInOut = (t: number): number => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const easeBack = (t: number): number => {
  const x = clamp(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

/**
 * Плавный прогресс от 0 до 1 на интервале [start, end] с easing.
 */
export function prog(
  frame: number,
  start: number,
  end: number,
  easing: (t: number) => number = easeOut
): number {
  if (end <= start) {
    return frame >= start ? 1 : 0;
  }
  const raw = clamp((frame - start) / (end - start));
  return easing(raw);
}

/**
 * Линейная интерполяция значения по прогрессу t ∈ [0, 1].
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Плавное появление и исчезновение (окно видимости сцены).
 */
export function fadeWindow(
  frame: number,
  start: number,
  end: number,
  fadeIn = 10,
  fadeOut = 10
): number {
  const enter = prog(frame, start, start + fadeIn, easeOut);
  const exit = 1 - prog(frame, end - fadeOut, end, easeOut);
  return clamp(Math.min(enter, exit));
}

/**
 * Детерминированный генератор псевдослучайных чисел [0, 1) по целому или строковому seed.
 */
export function rnd(seed: number | string): number {
  let h = typeof seed === 'number' ? seed | 0 : 2166136261;
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const normalizeWord = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '');

/**
 * Привязка сцен и событий к конкретным словам из captions.json.
 */
export function cues(data: CaptionsData) {
  const words = data.words ?? [];
  return {
    words,
    fps: data.fps || 30,
    duration: data.durationInFrames || 300,

    /** Кадр начала слова по индексу (0-based). */
    at(index: number, offsetFrames = 0): number {
      if (words.length === 0) return Math.max(0, offsetFrames);
      const clamped = Math.min(words.length - 1, Math.max(0, index));
      return Math.max(0, words[clamped].startFrame + offsetFrames);
    },

    /** Кадр окончания слова по индексу (0-based). */
    endAt(index: number, offsetFrames = 0): number {
      if (words.length === 0) return Math.max(0, offsetFrames);
      const clamped = Math.min(words.length - 1, Math.max(0, index));
      return Math.max(0, words[clamped].endFrame + offsetFrames);
    },

    /** Поиск кадра начала слова по подстроке (без учёта регистра и знаков). */
    find(query: string, occurrence = 0, offsetFrames = 0): number {
      const needle = normalizeWord(query);
      let seen = 0;
      for (const w of words) {
        if (normalizeWord(w.word).includes(needle)) {
          if (seen === occurrence) {
            return Math.max(0, w.startFrame + offsetFrames);
          }
          seen++;
        }
      }
      return Math.max(0, offsetFrames);
    },
  };
}
