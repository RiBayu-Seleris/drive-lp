import {
  HalfFloatType, LinearFilter, LinearMipmapLinearFilter, Matrix4, PerspectiveCamera, Plane, Vector3, Vector4,
  WebGLRenderTarget, type Camera, type Light, type Object3D, type Scene, type WebGLRenderer,
} from 'three';

/**
 * Only objects on this layer appear in the wet-road mirror: the car, lights, signals and
 * sky. Terrain, city and water are left out, which keeps the extra pass cheap.
 */
export const REFLECTED_LAYER = 3;

export function markReflected(root: Object3D) {
  root.traverse(object => object.layers.enable(REFLECTED_LAYER));
}

// Maps clip space (-1..1) to texture space (0..1).
const CLIP_TO_TEXTURE = new Matrix4().set(
  0.5, 0, 0, 0.5,
  0, 0.5, 0, 0.5,
  0, 0, 0.5, 0.5,
  0, 0, 0, 1,
);

/**
 * Renders the scene from a camera mirrored below a horizontal plane. The road samples the
 * result through `matrix`, so each road pixel finds what it should be reflecting.
 */
export class PlanarReflection {
  readonly target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: true,
    depthBuffer: true,
  });
  /** World position to reflection texture coordinates. */
  readonly matrix = new Matrix4();
  /** How much of the mirror image the road shows; it fades out as the camera climbs away. */
  readonly strength = { value: 1 };

  private readonly mirror = new PerspectiveCamera();
  private readonly eye = new Vector3();
  private readonly forward = new Vector3();
  private readonly up = new Vector3();
  private readonly focus = new Vector3();
  private readonly plane = new Plane();
  private readonly clip = new Vector4();
  private readonly corner = new Vector4();

  constructor() {
    this.mirror.layers.set(REFLECTED_LAYER);
  }

  setSize(width: number, height: number) {
    this.target.setSize(Math.max(64, Math.round(width)), Math.max(64, Math.round(height)));
  }

  /**
   * Renders the mirror image only when it can be seen: from high above (the overhead and aerial
   * shots, the page below the story) the wet-road reflection is invisible, so the second pass
   * is skipped and the road's reflection fades out instead.
   */
  update(renderer: WebGLRenderer, scene: Scene, camera: Camera, planeHeight: number) {
    this.eye.setFromMatrixPosition(camera.matrixWorld);
    const height = this.eye.y - planeHeight;
    const fade = Math.min(1, Math.max(0, (height - 12) / 6));
    this.strength.value = 1 - fade * fade * (3 - 2 * fade);
    if (this.strength.value > 0.001) this.render(renderer, scene, camera, planeHeight);
  }

  /** Returns false when the camera is below the plane and nothing can be mirrored. */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, planeHeight: number) {
    this.eye.setFromMatrixPosition(camera.matrixWorld);
    if (this.eye.y <= planeHeight + 0.05 || !(camera as PerspectiveCamera).isPerspectiveCamera) return false;

    // Mirror position and orientation across y = planeHeight.
    this.forward.set(0, 0, -1).transformDirection(camera.matrixWorld);
    this.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
    this.forward.y *= -1;
    this.up.y *= -1;
    this.mirror.position.set(this.eye.x, 2 * planeHeight - this.eye.y, this.eye.z);
    this.mirror.up.copy(this.up);
    this.mirror.lookAt(this.focus.copy(this.mirror.position).add(this.forward));
    this.mirror.far = (camera as PerspectiveCamera).far;
    this.mirror.updateMatrixWorld();
    this.mirror.projectionMatrix.copy(camera.projectionMatrix);
    this.matrix.copy(CLIP_TO_TEXTURE).multiply(this.mirror.projectionMatrix).multiply(this.mirror.matrixWorldInverse);

    // Oblique near plane (Lengyel): clip everything below the road out of the mirror.
    this.plane.setFromNormalAndCoplanarPoint(this.up.set(0, 1, 0), this.focus.set(0, planeHeight, 0));
    this.plane.applyMatrix4(this.mirror.matrixWorldInverse);
    this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant);
    const projection = this.mirror.projectionMatrix.elements;
    this.corner.set(
      (Math.sign(this.clip.x) + projection[8]) / projection[0],
      (Math.sign(this.clip.y) + projection[9]) / projection[5],
      -1,
      (1 + projection[10]) / projection[14],
    );
    this.clip.multiplyScalar(2 / this.clip.dot(this.corner));
    projection[2] = this.clip.x;
    projection[6] = this.clip.y;
    projection[10] = this.clip.z + 1;
    projection[14] = this.clip.w;
    this.mirror.projectionMatrixInverse.copy(this.mirror.projectionMatrix).invert();

    // Lights must reach the mirror camera too, or reflected objects would be lit differently
    // (and three would switch shader programs between the two passes).
    scene.traverse(object => {
      if ((object as Light).isLight) object.layers.enable(REFLECTED_LAYER);
    });

    const previousTarget = renderer.getRenderTarget();
    const previousXr = renderer.xr.enabled;
    const previousShadows = renderer.shadowMap.autoUpdate;
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.mirror);
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = previousXr;
    renderer.shadowMap.autoUpdate = previousShadows;
    return true;
  }

  dispose() {
    this.target.dispose();
  }
}
