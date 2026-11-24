import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { BRAND, getLayout } from '../brand';
import { lerp, prog } from './anim';

export interface BadgeProps {
  text: string;
  tone?: 'accent' | 'neutral' | 'success';
}

export const Badge: React.FC<BadgeProps> = ({ text, tone = 'accent' }) => {
  const styles =
    tone === 'success'
      ? {
          bg: BRAND.colors.successSoft,
          fg: BRAND.colors.success,
          border: '#A7F3D0',
        }
      : tone === 'neutral'
        ? {
            bg: BRAND.colors.surfaceMuted,
            fg: BRAND.colors.textSecondary,
            border: BRAND.colors.border,
          }
        : {
            bg: BRAND.colors.accentSoft,
            fg: BRAND.colors.accent,
            border: BRAND.colors.accentBorder,
          };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 16px',
        borderRadius: BRAND.radius.pill,
        backgroundColor: styles.bg,
        color: styles.fg,
        border: `1px solid ${styles.border}`,
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      {text}
    </span>
  );
};

export interface CardProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  startFrame?: number;
  active?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  badge,
  startFrame = 0,
  active = false,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const p = prog(frame, startFrame, startFrame + 14);

  return (
    <div
      style={{
        backgroundColor: BRAND.colors.surface,
        border: `1.5px solid ${active ? BRAND.colors.accent : BRAND.colors.border}`,
        borderRadius: BRAND.radius.md,
        boxShadow: active
          ? '0 16px 36px rgba(37, 99, 235, 0.12)'
          : BRAND.shadow.md,
        padding: layout.isVertical ? '30px 32px' : '32px 38px',
        opacity: p,
        transform: `translateY(${lerp(22, 0, p)}px)`,
        ...style,
      }}
    >
      {badge && (
        <div style={{ marginBottom: 14 }}>
          <Badge text={badge} />
        </div>
      )}
      {title && (
        <div
          style={{
            fontSize: layout.isVertical ? 34 : 32,
            fontWeight: 700,
            color: BRAND.colors.text,
            lineHeight: 1.2,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </div>
      )}
      {subtitle && (
        <div
          style={{
            marginTop: 10,
            fontSize: layout.isVertical ? 26 : 24,
            color: BRAND.colors.textSecondary,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
};

export interface StepItem {
  number?: string;
  title: string;
  description?: string;
  appearFrame: number;
}

export interface StepListProps {
  heading?: string;
  kicker?: string;
  items: StepItem[];
  startFrame?: number;
}

export const StepList: React.FC<StepListProps> = ({
  heading,
  kicker,
  items,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const pHead = prog(frame, startFrame, startFrame + 12);

  // Определяем индекс последнего уже появившегося шага
  let activeIndex = -1;
  items.forEach((item, idx) => {
    if (frame >= item.appearFrame) activeIndex = idx;
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {(kicker || heading) && (
        <div
          style={{
            marginBottom: layout.isVertical ? 40 : 34,
            opacity: pHead,
            transform: `translateY(${lerp(16, 0, pHead)}px)`,
          }}
        >
          {kicker && (
            <div style={{ marginBottom: 14 }}>
              <Badge text={kicker} />
            </div>
          )}
          {heading && (
            <h2
              style={{
                margin: 0,
                fontSize: layout.h2Size,
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: BRAND.colors.text,
                lineHeight: 1.15,
              }}
            >
              {heading}
            </h2>
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: layout.isVertical ? 'column' : 'row',
          gap: layout.isVertical ? 24 : 28,
          width: '100%',
        }}
      >
        {items.map((item, idx) => {
          const p = prog(frame, item.appearFrame, item.appearFrame + 14);
          const isActive = idx === activeIndex;
          const numLabel = item.number ?? String(idx + 1).padStart(2, '0');

          return (
            <div
              key={idx}
              style={{
                flex: 1,
                backgroundColor: BRAND.colors.surface,
                border: `1.5px solid ${isActive ? BRAND.colors.accent : BRAND.colors.border}`,
                borderRadius: BRAND.radius.md,
                boxShadow: isActive
                  ? '0 18px 40px rgba(37, 99, 235, 0.12)'
                  : BRAND.shadow.sm,
                padding: layout.isVertical ? '32px 32px' : '36px 34px',
                opacity: p,
                transform: `translateY(${lerp(28, 0, p)}px) scale(${lerp(0.97, 1, p)})`,
                display: 'flex',
                flexDirection: layout.isVertical ? 'row' : 'column',
                alignItems: layout.isVertical ? 'flex-start' : 'flex-start',
                gap: layout.isVertical ? 24 : 18,
              }}
            >
              <div
                style={{
                  minWidth: 54,
                  height: 54,
                  borderRadius: 14,
                  backgroundColor: isActive
                    ? BRAND.colors.accent
                    : BRAND.colors.accentSoft,
                  color: isActive ? '#FFFFFF' : BRAND.colors.accent,
                  fontFamily: BRAND.fonts.mono,
                  fontSize: 22,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {numLabel}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: layout.isVertical ? 32 : 30,
                    fontWeight: 700,
                    color: BRAND.colors.text,
                    lineHeight: 1.2,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {item.title}
                </div>
                {item.description && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: layout.isVertical ? 25 : 23,
                      color: BRAND.colors.textSecondary,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.description}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
