import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BRAND, getLayout } from '../../brand';
import {
  Badge,
  Captions,
  CaptionsData,
  GlbModel,
  Outro,
  Scene3D,
  Stage,
  cues,
  easeBack,
  easeOut,
  fadeWindow,
  lerp,
  prog,
} from '../../ui';
import captionsRaw from './captions.json';

const captions = captionsRaw as CaptionsData;
const c = cues(captions);

export const videoMeta = {
  id: 'V001',
  fps: 30,
  durationInFrames: Math.max(90, captions.durationInFrames + 50),
  width: 1920,
  height: 1080,
};

// Тайминги сцен, строго привязанные к словам из captions.json
const S1_START = 0;
const S2_START = c.find('Четыре');
const S3_START = c.find('Работает');
const S4_START = captions.durationInFrames;

// Тайминги акцентов внутри сцен
const PROMPT_CARD_FRAME = c.find('Любой');
const RESULT_PILL_FRAME = c.find('превращает');

const STEP1_FRAME = c.find('сценарий');
const STEP2_FRAME = c.find('озвучка');
const STEP3_FRAME = c.find('анимация');
const PILL_MOTION_FRAME = STEP3_FRAME + 6;
const PILL_3D_FRAME = STEP3_FRAME + 16;
const PILL_REELS_FRAME = STEP3_FRAME + 26;
const STEP4_FRAME = c.find('проверка');

const ECO_AGENTS_FRAME = c.find('Работает') + 10;
const ECO_FORMATS_FRAME = c.find('Форматы');
const ECO_OS_FRAME = c.find('Windows');
const ECO_TTS_FRAME = c.find('Бесплатный');

/**
 * Сцена 1 — Хук / Интро с 3D-камерой (Sand3D) справа.
 */
const HeroScene: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const opacity = fadeWindow(frame, start, end, 8, 12);
  if (opacity <= 0.001) return null;

  const pBadge = prog(frame, start, start + 14);
  const pTitle = prog(frame, start + 4, start + 20);
  const pLine = prog(frame, start + 12, start + 26);
  const pSub = prog(frame, start + 16, start + 30);
  const pPrompt = prog(frame, PROMPT_CARD_FRAME, PROMPT_CARD_FRAME + 16);
  const pResult = prog(frame, RESULT_PILL_FRAME, RESULT_PILL_FRAME + 14, easeBack);
  const p3d = prog(frame, start + 8, start + 28);

  const camRotY = -0.35 + (frame - start) * 0.008;
  const camFloatY = Math.sin((frame - start) * 0.055) * 0.06;

  return (
    <AbsoluteFill
      style={{
        opacity,
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 150,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 64,
      }}
    >
      {/* Левая колонка: типографика + мини-панель промпта */}
      <div style={{ flex: '1 1 56%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{
            marginBottom: 24,
            opacity: pBadge,
            transform: `translateY(${lerp(16, 0, pBadge)}px)`,
          }}
        >
          <Badge text="ЛОКАЛЬНЫЙ AI-КОНТЕНТ-ЗАВОД" />
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-0.035em',
            color: BRAND.colors.text,
            opacity: pTitle,
            transform: `translateY(${lerp(24, 0, pTitle)}px)`,
          }}
        >
          Montazhka
        </h1>

        <div
          style={{
            width: lerp(0, 180, pLine),
            height: 6,
            borderRadius: BRAND.radius.pill,
            backgroundColor: BRAND.colors.accent,
            marginTop: 28,
            marginBottom: 26,
          }}
        />

        <p
          style={{
            margin: 0,
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.4,
            color: BRAND.colors.textSecondary,
            maxWidth: 780,
            opacity: pSub,
            transform: `translateY(${lerp(16, 0, pSub)}px)`,
          }}
        >
          Любой ИИ-агент разворачивает проект за одно сообщение и превращает текст в готовое видео.
        </p>

        {/* Мини-карточка «одно сообщение -> видео» */}
        <div
          style={{
            marginTop: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            backgroundColor: BRAND.colors.surface,
            border: `1.5px solid ${BRAND.colors.border}`,
            borderRadius: BRAND.radius.md,
            boxShadow: BRAND.shadow.md,
            padding: '18px 26px',
            opacity: pPrompt,
            transform: `translateY(${lerp(18, 0, pPrompt)}px)`,
          }}
        >
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 22,
              fontWeight: 600,
              color: BRAND.colors.accent,
            }}
          >
            $
          </span>
          <span
            style={{
              fontFamily: BRAND.fonts.mono,
              fontSize: 22,
              color: BRAND.colors.text,
            }}
          >
            Сделай ролик о Montazhka
          </span>
          <span
            style={{
              fontSize: 24,
              color: BRAND.colors.textMuted,
              opacity: pResult,
            }}
          >
            →
          </span>
          <span
            style={{
              padding: '6px 16px',
              borderRadius: BRAND.radius.pill,
              backgroundColor: BRAND.colors.successSoft,
              border: '1px solid #A7F3D0',
              color: BRAND.colors.success,
              fontFamily: BRAND.fonts.mono,
              fontSize: 20,
              fontWeight: 700,
              opacity: pResult,
              transform: `scale(${lerp(0.85, 1, pResult)})`,
            }}
          >
            001.mp4 ✓
          </span>
        </div>
      </div>

      {/* Правая колонка: 3D-витрина с камерой из Sand3D */}
      <div
        style={{
          flex: '0 0 640px',
          height: 620,
          borderRadius: BRAND.radius.lg,
          backgroundColor: 'rgba(255, 255, 255, 0.78)',
          border: `1.5px solid ${BRAND.colors.border}`,
          boxShadow: BRAND.shadow.lg,
          position: 'relative',
          overflow: 'hidden',
          opacity: p3d,
          transform: `translateY(${lerp(24, 0, p3d)}px) scale(${lerp(0.95, 1, p3d)})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 45%, rgba(37, 99, 235, 0.11), transparent 64%)',
          }}
        />
        <Scene3D width={640} height={620} cameraPosition={[0, 1.1, 4.4]} fov={36}>
          <GlbModel
            src={staticFile('001/models/camera/model.glb')}
            height={1.55}
            centerY
            position={[0, camFloatY - 0.04, 0]}
            rotation={[0.1, camRotY, 0]}
          />
        </Scene3D>
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Badge text="3D · Sand3D" tone="neutral" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Сцена 2 — 4 шага конвейера.
 */
const PipelineScene: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const opacity = fadeWindow(frame, start, end, 10, 12);
  if (opacity <= 0.001) return null;

  const pHead = prog(frame, start, start + 14);

  const steps = [
    {
      num: '01',
      title: 'Сценарий',
      desc: 'Структура сцен, визуал и живой дикторский текст.',
      appear: STEP1_FRAME,
      tags: ['SCRIPT.md', 'text.txt'],
    },
    {
      num: '02',
      title: 'Озвучка',
      desc: 'Голос и точные пословные тайминги в captions.json.',
      appear: STEP2_FRAME,
      tags: ['TTS', 'Пословные тайминги'],
    },
    {
      num: '03',
      title: 'Remotion + 3D',
      desc: 'Моушн-графика, 100 000+ 3D-объектов и B-roll для Reels.',
      appear: STEP3_FRAME,
      tags: [
        { label: 'Моушн-графика', frame: PILL_MOTION_FRAME },
        { label: '100 000+ Sand3D', frame: PILL_3D_FRAME },
        { label: 'Reels B-roll', frame: PILL_REELS_FRAME },
      ],
    },
    {
      num: '04',
      title: 'Проверка и MP4',
      desc: 'Агент смотрит кадры глазами и рендерит финальный MP4.',
      appear: STEP4_FRAME,
      tags: ['stills', 'render MP4'],
    },
  ];

  let activeIdx = -1;
  steps.forEach((s, idx) => {
    if (frame >= s.appear) activeIdx = idx;
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 150,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          marginBottom: 40,
          opacity: pHead,
          transform: `translateY(${lerp(16, 0, pHead)}px)`,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <Badge text="КАК ЭТО РАБОТАЕТ" />
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            color: BRAND.colors.text,
            lineHeight: 1.12,
          }}
        >
          Конвейер из четырёх шагов
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: 24, width: '100%' }}>
        {steps.map((step, idx) => {
          const p = prog(frame, step.appear, step.appear + 14);
          const isActive = idx === activeIdx;

          return (
            <div
              key={step.num}
              style={{
                flex: 1,
                backgroundColor: BRAND.colors.surface,
                border: `2px solid ${isActive ? BRAND.colors.accent : BRAND.colors.border}`,
                borderRadius: BRAND.radius.md,
                boxShadow: isActive
                  ? '0 20px 44px rgba(37, 99, 235, 0.14)'
                  : BRAND.shadow.sm,
                padding: '32px 28px',
                opacity: p,
                transform: `translateY(${lerp(28, 0, p)}px) scale(${lerp(0.96, 1, p)})`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 400,
              }}
            >
              <div>
                <div
                  style={{
                    width: 54,
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
                    marginBottom: 22,
                  }}
                >
                  {step.num}
                </div>

                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                    color: BRAND.colors.text,
                    lineHeight: 1.2,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {step.title}
                </div>

                <div
                  style={{
                    marginTop: 12,
                    fontSize: 22,
                    color: BRAND.colors.textSecondary,
                    lineHeight: 1.42,
                  }}
                >
                  {step.desc}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
                {step.tags.map((tag, tIdx) => {
                  const isObj = typeof tag !== 'string';
                  const label = isObj ? tag.label : tag;
                  const tagHighlight = isObj ? frame >= tag.frame : isActive;
                  const tagProg = isObj ? prog(frame, tag.frame, tag.frame + 10) : 1;

                  return (
                    <span
                      key={tIdx}
                      style={{
                        padding: '6px 12px',
                        borderRadius: BRAND.radius.pill,
                        fontSize: 17,
                        fontWeight: 600,
                        backgroundColor: tagHighlight
                          ? BRAND.colors.accentSoft
                          : BRAND.colors.surfaceMuted,
                        color: tagHighlight
                          ? BRAND.colors.accent
                          : BRAND.colors.textSecondary,
                        border: `1px solid ${
                          tagHighlight ? BRAND.colors.accentBorder : BRAND.colors.border
                        }`,
                        transform: isObj
                          ? `scale(${lerp(0.92, 1, tagProg)})`
                          : undefined,
                      }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Сцена 3 — Экосистема (агенты, форматы, ОС, TTS) с 3D-ноутбуком Sand3D слева.
 */
const EcosystemScene: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = getLayout(width, height);

  const opacity = fadeWindow(frame, start, end, 10, 12);
  if (opacity <= 0.001) return null;

  const pHead = prog(frame, start, start + 14);
  const p3d = prog(frame, start + 4, start + 24);

  // Плавное открытие крышки ноутбука через шарнир base_to_lid
  const lidOpen = lerp(0.18, 0.58, prog(frame, start + 6, start + 42, easeOut));
  const laptopRotY = 0.45 + Math.sin((frame - start) * 0.025) * 0.35;
  const laptopFloatY = Math.sin((frame - start) * 0.05) * 0.06;

  const rows: Array<{
    label: string;
    appear: number;
    chips: Array<{ text: string; frame: number }>;
    suffix?: string;
  }> = [
    {
      label: 'ИИ-агенты',
      appear: ECO_AGENTS_FRAME,
      chips: [
        { text: 'Claude Code', frame: ECO_AGENTS_FRAME },
        { text: 'Antigravity', frame: ECO_AGENTS_FRAME + 8 },
        { text: 'Codex', frame: ECO_AGENTS_FRAME + 16 },
        { text: 'DeepSeek Harness', frame: ECO_AGENTS_FRAME + 24 },
        { text: 'QwenWork', frame: ECO_AGENTS_FRAME + 32 },
      ],
      suffix: 'и др.',
    },
    {
      label: 'Форматы видео',
      appear: ECO_FORMATS_FRAME,
      chips: [
        { text: '16:9 YouTube', frame: ECO_FORMATS_FRAME },
        { text: '9:16 Reels / Shorts', frame: ECO_FORMATS_FRAME + 24 },
      ],
    },
    {
      label: 'Платформы',
      appear: ECO_OS_FRAME,
      chips: [
        { text: 'Windows', frame: ECO_OS_FRAME },
        { text: 'macOS', frame: ECO_OS_FRAME + 18 },
        { text: 'Linux', frame: ECO_OS_FRAME + 36 },
      ],
    },
    {
      label: 'Озвучка (TTS)',
      appear: ECO_TTS_FRAME,
      chips: [
        { text: 'Edge TTS · 0 ₽', frame: ECO_TTS_FRAME },
        { text: 'OpenRouter', frame: ECO_TTS_FRAME + 28 },
        { text: 'AITunnel', frame: ECO_TTS_FRAME + 40 },
      ],
      suffix: 'и др.',
    },
  ];

  let activeRow = -1;
  rows.forEach((r, idx) => {
    if (frame >= r.appear) activeRow = idx;
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        paddingLeft: layout.padX,
        paddingRight: layout.padX,
        paddingTop: layout.padY,
        paddingBottom: layout.captionBottom + 150,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 60,
      }}
    >
      {/* Левая колонка: 3D-ноутбук с анимированным шарниром крышки */}
      <div
        style={{
          flex: '0 0 600px',
          height: 620,
          borderRadius: BRAND.radius.lg,
          backgroundColor: 'rgba(255, 255, 255, 0.78)',
          border: `1.5px solid ${BRAND.colors.border}`,
          boxShadow: BRAND.shadow.lg,
          position: 'relative',
          overflow: 'hidden',
          opacity: p3d,
          transform: `translateY(${lerp(24, 0, p3d)}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.11), transparent 64%)',
          }}
        />
        <Scene3D width={600} height={620} cameraPosition={[0, 1.45, 4.35]} fov={36}>
          <GlbModel
            src={staticFile('001/models/laptop/model.glb')}
            height={1.32}
            centerY
            position={[0, laptopFloatY + 0.06, 0]}
            rotation={[0.14, laptopRotY, 0]}
            jointValues={{ base_to_lid: lidOpen }}
          />
        </Scene3D>
        <div style={{ position: 'absolute', top: 22, left: 24 }}>
          <Badge text="КРОССПЛАТФОРМЕННО" tone="neutral" />
        </div>
      </div>

      {/* Правая колонка: 4 карточки совместимости */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            marginBottom: 6,
            opacity: pHead,
            transform: `translateY(${lerp(14, 0, pHead)}px)`,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <Badge text="ЭКОСИСТЕМА" />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 50,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: BRAND.colors.text,
              lineHeight: 1.12,
            }}
          >
            Работает в вашем окружении
          </h2>
        </div>

        {rows.map((row, rIdx) => {
          const p = prog(frame, row.appear, row.appear + 14);
          const isActive = rIdx === activeRow;

          return (
            <div
              key={row.label}
              style={{
                backgroundColor: BRAND.colors.surface,
                border: `1.5px solid ${isActive ? BRAND.colors.accent : BRAND.colors.border}`,
                borderRadius: BRAND.radius.md,
                boxShadow: isActive
                  ? '0 14px 32px rgba(37, 99, 235, 0.11)'
                  : BRAND.shadow.sm,
                padding: '20px 26px',
                opacity: p,
                transform: `translateX(${lerp(24, 0, p)}px)`,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: BRAND.colors.text,
                  minWidth: 210,
                }}
              >
                {row.label}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  flex: 1,
                }}
              >
                {row.chips.map((chip) => {
                  const chipOn = frame >= chip.frame;
                  return (
                    <span
                      key={chip.text}
                      style={{
                        padding: '6px 13px',
                        borderRadius: BRAND.radius.pill,
                        fontSize: 17,
                        fontWeight: 600,
                        backgroundColor: chipOn
                          ? BRAND.colors.accentSoft
                          : BRAND.colors.surfaceMuted,
                        color: chipOn
                          ? BRAND.colors.accent
                          : BRAND.colors.textSecondary,
                        border: `1px solid ${
                          chipOn ? BRAND.colors.accentBorder : BRAND.colors.border
                        }`,
                      }}
                    >
                      {chip.text}
                    </span>
                  );
                })}
                {row.suffix && (
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      color: BRAND.colors.textMuted,
                      marginLeft: 4,
                    }}
                  >
                    {row.suffix}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => {
  const total = videoMeta.durationInFrames;

  const sfxWhooshFrames = [S2_START, S3_START];
  const sfxPopFrames = [
    STEP1_FRAME,
    STEP2_FRAME,
    STEP3_FRAME,
    STEP4_FRAME,
    ECO_AGENTS_FRAME,
    ECO_FORMATS_FRAME,
    ECO_OS_FRAME,
    ECO_TTS_FRAME,
  ];

  return (
    <Stage>
      {/* Голосовая дорожка */}
      {captions.words.length > 0 && <Audio src={staticFile('001/voice.mp3')} />}

      {/* Мягкие звуковые акценты (SFX) */}
      <Sequence from={2} durationInFrames={45}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.22} />
      </Sequence>
      <Sequence from={S4_START + 2} durationInFrames={45}>
        <Audio src={staticFile('sfx/chime.wav')} volume={0.22} />
      </Sequence>
      {sfxWhooshFrames.map((f, i) => (
        <Sequence key={`whoosh-${i}`} from={Math.max(0, f - 2)} durationInFrames={30}>
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.22} />
        </Sequence>
      ))}
      {sfxPopFrames.map((f, i) => (
        <Sequence key={`pop-${i}`} from={Math.max(0, f)} durationInFrames={20}>
          <Audio src={staticFile('sfx/pop.wav')} volume={0.22} />
        </Sequence>
      ))}

      {/* Сцена 1 — Хук с 3D-камерой */}
      <HeroScene start={S1_START} end={S2_START + 8} />

      {/* Сцена 2 — 4 шага конвейера */}
      <PipelineScene start={S2_START} end={S3_START + 8} />

      {/* Сцена 3 — Экосистема с 3D-ноутбуком */}
      <EcosystemScene start={S3_START} end={S4_START + 8} />

      {/* Сцена 4 — Лаконичный финал / Outro */}
      <Sequence from={S4_START} durationInFrames={Math.max(1, total - S4_START)}>
        <Outro
          title="Montazhka"
          subtitle="Локальный AI-контент-завод"
          cta="github.com/worldruschel/montazhka"
        />
      </Sequence>

      {/* Пословные субтитры */}
      <Captions words={captions.words} />
    </Stage>
  );
};

export default Video;
