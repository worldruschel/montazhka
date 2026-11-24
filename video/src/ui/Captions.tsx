import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, getLayout } from '../brand';
import { CaptionWord, prog } from './anim';

export interface CaptionsProps {
  words: CaptionWord[];
  maxWordsPerLine?: number;
}

interface CaptionChunk {
  words: CaptionWord[];
  startFrame: number;
  endFrame: number;
}

function buildChunks(words: CaptionWord[], maxWords: number, maxChars: number): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let buf: CaptionWord[] = [];
  let charCount = 0;

  const flush = () => {
    if (buf.length === 0) return;
    chunks.push({
      words: buf,
      startFrame: buf[0].startFrame,
      endFrame: buf[buf.length - 1].endFrame,
    });
    buf = [];
    charCount = 0;
  };

  for (const w of words) {
    const nextLen = charCount + w.word.length + (buf.length > 0 ? 1 : 0);
    const prevWord = buf.length > 0 ? buf[buf.length - 1].word : '';
    const prevEndedSentence = /[.!?…]$/.test(prevWord);

    if (buf.length > 0 && (buf.length >= maxWords || nextLen > maxChars || prevEndedSentence)) {
      flush();
    }
    buf.push(w);
    charCount += w.word.length + (buf.length > 1 ? 1 : 0);
  }
  flush();
  return chunks;
}

export const Captions: React.FC<CaptionsProps> = ({ words, maxWordsPerLine }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const maxWords = maxWordsPerLine ?? (layout.isVertical ? 4 : 6);
  const maxChars = layout.isVertical ? 28 : 48;

  const chunks = useMemo(
    () => buildChunks(words, maxWords, maxChars),
    [words, maxWords, maxChars]
  );

  const activeChunk = chunks.find(
    (ch, idx) => {
      const nextStart = idx + 1 < chunks.length ? chunks[idx + 1].startFrame : ch.endFrame + 18;
      return frame >= ch.startFrame - 2 && frame < Math.min(ch.endFrame + 14, nextStart);
    }
  );

  if (!activeChunk) return null;

  const appear = prog(frame, activeChunk.startFrame - 2, activeChunk.startFrame + 5);

  return (
    <div
      style={{
        position: 'absolute',
        left: layout.padX,
        right: layout.padX,
        bottom: layout.captionBottom,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: layout.isVertical ? '6px 12px' : '6px 14px',
          padding: layout.isVertical ? '18px 28px' : '16px 32px',
          borderRadius: BRAND.radius.md,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          border: `1px solid ${BRAND.colors.border}`,
          boxShadow: BRAND.shadow.md,
          opacity: appear,
          transform: `translateY(${(1 - appear) * 10}px)`,
          maxWidth: layout.isVertical ? width - layout.padX * 2 : 1360,
        }}
      >
        {activeChunk.words.map((w) => {
          const isCurrent = frame >= w.startFrame && frame < w.endFrame;
          const isSpoken = frame >= w.endFrame;
          const pop = isCurrent ? prog(frame, w.startFrame, w.startFrame + 4) : 0;

          return (
            <span
              key={w.index}
              style={{
                fontFamily: BRAND.fonts.sans,
                fontSize: layout.captionSize,
                fontWeight: isCurrent ? 700 : 500,
                lineHeight: 1.25,
                color: isCurrent
                  ? BRAND.colors.accent
                  : isSpoken
                    ? BRAND.colors.text
                    : BRAND.colors.textMuted,
                backgroundColor: isCurrent ? BRAND.colors.accentSoft : 'transparent',
                padding: '2px 8px',
                borderRadius: 8,
                transform: `scale(${1 + pop * 0.04})`,
                display: 'inline-block',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
