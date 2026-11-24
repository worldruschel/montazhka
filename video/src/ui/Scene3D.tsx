import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { continueRender, delayRender, useVideoConfig } from 'remotion';
import { collectJoints, fitToHeight, setJoint01 } from './s3d-joints';

const glbCache = new Map<string, Promise<THREE.Group>>();

function loadGlbCached(src: string): Promise<THREE.Group> {
  const existing = glbCache.get(src);
  if (existing) return existing;

  const loader = new GLTFLoader();
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      src,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err)
    );
  });
  glbCache.set(src, promise);
  return promise;
}

export interface Scene3DProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  cameraPosition?: [number, number, number];
  fov?: number;
  shadows?: boolean;
  defaultLights?: boolean;
  style?: React.CSSProperties;
}

/**
 * Готовая 3D-сцена для Remotion на базе @remotion/three (Three.js + React Three Fiber).
 * Прозрачный фон по умолчанию — легко накладывается поверх Stage и 2D-графики.
 * Вся анимация дочерних объектов должна управляться через useCurrentFrame().
 */
export const Scene3D: React.FC<Scene3DProps> = ({
  children,
  width,
  height,
  cameraPosition = [0, 1.4, 4.2],
  fov = 38,
  shadows = true,
  defaultLights = true,
  style,
}) => {
  const config = useVideoConfig();
  const w = width ?? config.width;
  const h = height ?? config.height;

  return (
    <ThreeCanvas
      width={w}
      height={h}
      shadows={shadows}
      camera={{ position: cameraPosition, fov, near: 0.05, far: 200 }}
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.08,
      }}
      style={{
        width: w,
        height: h,
        backgroundColor: 'transparent',
        ...style,
      }}
    >
      {defaultLights && (
        <>
          <ambientLight intensity={0.85} />
          <hemisphereLight args={['#ffffff', '#cbd5e1', 0.95]} />
          <directionalLight
            position={[5, 8, 6]}
            intensity={1.65}
            castShadow={shadows}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-5, 4, -4]} intensity={0.7} color="#dbeafe" />
        </>
      )}
      {children}
    </ThreeCanvas>
  );
};

export interface GlbModelProps {
  /** Путь к GLB через staticFile('NNN/models/name/model.glb') */
  src: string;
  /** Целевая высота модели в единицах сцены (авто-масштабирование с учётом scale 0.001 в Sand3D) */
  height?: number;
  /** Если true — центрирует модель по вертикали вокруг Y=0 (удобно для парящих объектов) */
  centerY?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Задать единый PBR-цвет (полезно для белых CAD-моделей без материалов) */
  overrideColor?: string;
  /** Значения шарниров Sand3D в диапазоне [0..1]: { jointName: progress } */
  jointValues?: Record<string, number>;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Загружает и отображает 3D-модель GLB (включая модели из каталога Sand3D).
 * Использует delayRender/continueRender, чтобы Remotion гарантированно дожидался
 * загрузки GLB перед съёмкой каждого кадра.
 */
export const GlbModel: React.FC<GlbModelProps> = ({
  src,
  height = 1.8,
  centerY = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  overrideColor,
  jointValues,
  castShadow = true,
  receiveShadow = true,
}) => {
  const { gl, scene, camera } = useThree();
  const [loadedScene, setLoadedScene] = useState<THREE.Group | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [handle] = useState(() => delayRender(`Loading GLB: ${src}`));

  useEffect(() => {
    let cancelled = false;
    loadGlbCached(src)
      .then((s) => {
        if (!cancelled) {
          setLoadedScene(s);
        }
      })
      .catch((err) => {
        console.error('Failed to load GLB:', src, err);
        if (!cancelled) {
          setLoadFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (!loadedScene && !loadFailed) return;
    // Принудительно рендерим кадр WebGL после добавления GLB в сцену и только потом отпускаем Remotion
    const raf = requestAnimationFrame(() => {
      gl.render(scene, camera);
      continueRender(handle);
    });
    return () => cancelAnimationFrame(raf);
  }, [loadedScene, loadFailed, handle, gl, scene, camera]);

  const prepared = useMemo(() => {
    if (!loadedScene) return null;
    const cloned = loadedScene.clone(true);
    const collected = collectJoints(cloned);

    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        if (overrideColor) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: overrideColor,
            roughness: 0.42,
            metalness: 0.12,
          });
        }
      }
    });

    fitToHeight(cloned, height);
    if (centerY) {
      cloned.position.y -= height / 2;
    }

    return { root: cloned, joints: collected };
  }, [loadedScene, height, centerY, overrideColor, castShadow, receiveShadow]);

  if (!prepared) return null;

  if (jointValues && prepared.joints.length > 0) {
    for (const j of prepared.joints) {
      const t = jointValues[j.name];
      if (typeof t === 'number') {
        setJoint01(j, t);
      }
    }
  }

  const scaleTuple: [number, number, number] =
    typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={scaleTuple}>
      <primitive object={prepared.root} />
    </group>
  );
};
