import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, getLayout } from '../brand';
import { lerp, prog } from './anim';

/**
 * Базовый светлый минималистичный фон с тонкой сеткой и мягким свечением.
 */
export const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame / 90) * 28;
  const driftY = Math.cos(frame / 110) * 20;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.colors.bg,
        fontFamily: BRAND.fonts.sans,
        color: BRAND.colors.text,
        overflow: 'hidden',
      }}
    >
      {/* Мягкий фоновый градиент */}
      <div
        style={{
          position: 'absolute',
          inset: -120,
          background: `radial-gradient(circle at ${22 + driftX * 0.15}% ${18 + driftY * 0.15}%, rgba(37, 99, 235, 0.08), transparent 46%),
                       radial-gradient(circle at ${80 - driftX * 0.12}% ${82 - driftY * 0.12}%, rgba(14, 165, 233, 0.07), transparent 44%)`,
        }}
      />
      {/* Едва заметная точечная сетка */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(15, 23, 42, 0.06) 1.25px, transparent 1.25px)',
          backgroundSize: '36px 36px',
          opacity: 0.7,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export interface IntroProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  startFrame?: number;
}

export const Intro: React.FC<IntroProps> = ({
  kicker,
  title,
  subtitle,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const pKicker = prog(frame, startFrame, startFrame + 14);
  const pTitle = prog(frame, startFrame + 5, startFrame + 20);
  const pLine = prog(frame, startFrame + 12, startFrame + 26);
  const pSub = prog(frame, startFrame + 16, startFrame + 30);

  return (
    <AbsoluteFill
      style={{
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 130,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {kicker && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 22px',
            borderRadius: BRAND.radius.pill,
            backgroundColor: BRAND.colors.accentSoft,
            border: `1px solid ${BRAND.colors.accentBorder}`,
            color: BRAND.colors.accent,
            fontSize: layout.isVertical ? 24 : 22,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 28,
            opacity: pKicker,
            transform: `translateY(${lerp(16, 0, pKicker)}px)`,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: BRAND.colors.accent,
            }}
          />
          {kicker}
        </div>
      )}

      <h1
        style={{
          margin: 0,
          fontSize: layout.titleSize,
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: BRAND.colors.text,
          maxWidth: layout.isVertical ? 900 : 1400,
          opacity: pTitle,
          transform: `translateY(${lerp(24, 0, pTitle)}px)`,
        }}
      >
        {title}
      </h1>

      <div
        style={{
          width: lerp(0, layout.isVertical ? 140 : 180, pLine),
          height: 5,
          borderRadius: BRAND.radius.pill,
          backgroundColor: BRAND.colors.accent,
          marginTop: 32,
          marginBottom: subtitle ? 28 : 0,
        }}
      />

      {subtitle && (
        <p
          style={{
            margin: 0,
            fontSize: layout.bodySize + 4,
            fontWeight: 400,
            lineHeight: 1.45,
            color: BRAND.colors.textSecondary,
            maxWidth: layout.isVertical ? 820 : 1080,
            opacity: pSub,
            transform: `translateY(${lerp(16, 0, pSub)}px)`,
          }}
        >
          {subtitle}
        </p>
      )}
    </AbsoluteFill>
  );
};

export interface OutroProps {
  title: string;
  subtitle?: string;
  cta?: string;
  startFrame?: number;
}

export const Outro: React.FC<OutroProps> = ({
  title,
  subtitle,
  cta,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const pCard = prog(frame, startFrame, startFrame + 16);
  const pCta = prog(frame, startFrame + 12, startFrame + 26);

  return (
    <AbsoluteFill
      style={{
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 130,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: layout.isVertical ? 920 : 1180,
          backgroundColor: BRAND.colors.surface,
          border: `1px solid ${BRAND.colors.border}`,
          borderRadius: BRAND.radius.lg,
          boxShadow: BRAND.shadow.lg,
          padding: layout.isVertical ? '64px 48px' : '72px 84px',
          textAlign: 'center',
          opacity: pCard,
          transform: `translateY(${lerp(24, 0, pCard)}px) scale(${lerp(0.97, 1, pCard)})`,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: layout.isVertical ? 58 : 64,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.12,
            color: BRAND.colors.text,
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              margin: '24px auto 0',
              fontSize: layout.bodySize + 2,
              lineHeight: 1.45,
              color: BRAND.colors.textSecondary,
              maxWidth: 820,
            }}
          >
            {subtitle}
          </p>
        )}

        {cta && (
          <div
            style={{
              marginTop: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '18px 36px',
              borderRadius: BRAND.radius.pill,
              backgroundColor: BRAND.colors.accent,
              color: '#FFFFFF',
              fontSize: layout.isVertical ? 28 : 26,
              fontWeight: 700,
              boxShadow: '0 10px 24px rgba(37, 99, 235, 0.25)',
              opacity: pCta,
              transform: `translateY(${lerp(14, 0, pCta)}px)`,
            }}
          >
            {cta}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export interface AlertScreenProps {
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  label: string;
  headline: string;
  detail?: string;
  startFrame?: number;
}

const TONE_MAP = {
  accent: {
    bg: BRAND.colors.accentSoft,
    fg: BRAND.colors.accent,
    border: BRAND.colors.accentBorder,
  },
  success: {
    bg: BRAND.colors.successSoft,
    fg: BRAND.colors.success,
    border: '#A7F3D0',
  },
  warning: {
    bg: BRAND.colors.warningSoft,
    fg: BRAND.colors.warning,
    border: '#FDE68A',
  },
  danger: {
    bg: BRAND.colors.dangerSoft,
    fg: BRAND.colors.danger,
    border: '#FECDD3',
  },
} as const;

export const AlertScreen: React.FC<AlertScreenProps> = ({
  tone = 'accent',
  label,
  headline,
  detail,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);
  const palette = TONE_MAP[tone];

  const p = prog(frame, startFrame, startFrame + 14);

  return (
    <AbsoluteFill
      style={{
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 130,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: layout.isVertical ? 920 : 1240,
          backgroundColor: BRAND.colors.surface,
          border: `2px solid ${palette.border}`,
          borderLeft: `10px solid ${palette.fg}`,
          borderRadius: BRAND.radius.lg,
          boxShadow: BRAND.shadow.lg,
          padding: layout.isVertical ? '52px 44px' : '56px 72px',
          opacity: p,
          transform: `translateY(${lerp(20, 0, p)}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            borderRadius: BRAND.radius.pill,
            backgroundColor: palette.bg,
            color: palette.fg,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 22,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: layout.isVertical ? 52 : 56,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: BRAND.colors.text,
          }}
        >
          {headline}
        </div>
        {detail && (
          <div
            style={{
              marginTop: 20,
              fontSize: layout.bodySize + 2,
              lineHeight: 1.45,
              color: BRAND.colors.textSecondary,
            }}
          >
            {detail}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
