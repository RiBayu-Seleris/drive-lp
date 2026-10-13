/**
 * DOM labels pinned to points in the 3D world. The page registers an element under a key;
 * the canvas (see HudProjector) projects that key's world point every frame and writes the
 * element's transform directly — no React re-render, and no three.js in the page bundle.
 */
const elements = new Map<string, HTMLElement>();

export function registerHudElement(key: string, element: HTMLElement) {
  elements.set(key, element);
  return () => {
    if (elements.get(key) === element) elements.delete(key);
  };
}

export function hudElement(key: string) {
  return elements.get(key);
}
