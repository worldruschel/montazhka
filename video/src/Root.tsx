import React from 'react';
import { Composition } from 'remotion';

export interface VideoMeta {
  id: string;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
}

interface VideoModule {
  videoMeta?: VideoMeta;
  Video?: React.FC;
  default?: React.FC;
}

const videosContext = require.context(
  './videos',
  true,
  /^\.\/[^/]+\/Video\.tsx$/
);

const discoveredVideos = videosContext
  .keys()
  .sort()
  .map((key) => {
    const mod = videosContext(key) as VideoModule;
    const Component = mod.Video ?? mod.default;
    const folder = key.replace(/^\.\//, '').split('/')[0];
    const meta: VideoMeta = mod.videoMeta ?? {
      id: `V${folder}`,
      fps: 30,
      durationInFrames: 300,
      width: 1920,
      height: 1080,
    };
    return { key, Component, meta };
  })
  .filter((item): item is { key: string; Component: React.FC; meta: VideoMeta } =>
    Boolean(item.Component)
  );

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {discoveredVideos.map(({ meta, Component }) => (
        <Composition
          key={meta.id}
          id={meta.id}
          component={Component}
          durationInFrames={Math.max(1, meta.durationInFrames)}
          fps={meta.fps}
          width={meta.width}
          height={meta.height}
        />
      ))}
    </>
  );
};
