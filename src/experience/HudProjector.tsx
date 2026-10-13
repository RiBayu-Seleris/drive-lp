import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { hudElement } from './hudAnchors';
import { journeyRuntime } from './runtime';

export interface HudAnchor {
  /** Key the page registered its element under (see hudAnchors.ts). */
  key: string;
  world: Vector3;
  /**
   * Optional mirror point. When the label would sit in the right part of the screen it moves
   * here and the element gets data-side="left", so it never runs off a narrow screen.
   */
  flipWorld?: Vector3;
  /** 0–1 visibility for a story position; multiplied by whether the point is on screen. */
  visibility: (position: number) => number;
  /** Text that depends on the story position (distances, states). */
  update?: (element: HTMLElement, position: number) => void;
}

/** Projects HUD anchors to the screen after the camera rig has moved (priority -1). */
export function HudProjector({ anchors }: { anchors: HudAnchor[] }) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const position = journeyRuntime.position;
    for (const anchor of anchors) {
      const element = hudElement(anchor.key);
      if (!element) continue;
      point.copy(anchor.world).project(camera);
      let side = 'right';
      if (anchor.flipWorld && (point.x + 1) / 2 > 0.62) {
        point.copy(anchor.flipWorld).project(camera);
        side = 'left';
      }
      if (element.dataset.side !== side) element.dataset.side = side;
      const x = (point.x + 1) / 2 * size.width;
      const y = (1 - point.y) / 2 * size.height;
      const onScreen = point.z > -1 && point.z < 1 && x > -60 && x < size.width + 60 && y > -60 && y < size.height + 60;
      const opacity = onScreen ? anchor.visibility(position) : 0;
      element.style.opacity = opacity.toFixed(3);
      element.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      if (opacity > 0.01) element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      anchor.update?.(element, position);
    }
  }, -1);
  return null;
}
