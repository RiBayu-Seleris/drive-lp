import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

// Render the actual GLB for the holograms, so their vehicle matches the road vehicle.
// Run with the local Vite development server active (it supplies the Three.js modules).
const baseUrl = process.argv.find(arg => arg.startsWith('--base-url='))?.slice('--base-url='.length) || 'http://localhost:5920';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, pipe: true, args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.goto(baseUrl);
  const result = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const { scene: model } = await loader.loadAsync('/assets/models/aventador.glb');
    const scene = new T.Scene();
    model.traverse(object => {
      if (!object.isMesh) return;
      const material = object.material;
      material.color.lerp(new T.Color('#70bdf3'), 0.4);
      material.metalness = Math.min(material.metalness, 0.35);
      material.roughness = Math.max(material.roughness, 0.35);
      if (material.clearcoat !== undefined) material.clearcoat = 0.15;
    });
    scene.add(model, new T.AmbientLight('#9bcced', 2.3));
    const light = new T.DirectionalLight('#e0f1ff', 3.4);
    light.position.set(4, 6, -3); scene.add(light);
    const rim = new T.DirectionalLight('#64bdff', 2);
    rim.position.set(-5, 3, 4); scene.add(rim);
    const camera = new T.OrthographicCamera(-2.75, 2.75, 1.375, -1.375, 0.1, 100);
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(1200, 600); renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    // One shared atlas: perspective preview, front, rear, right, left.
    const atlas = document.createElement('canvas');
    atlas.width = 1200; atlas.height = 3000;
    const context = atlas.getContext('2d');
    const views = [[8, 2.4, -6.5], [0, 1.4, -10], [0, 1.4, 10], [10, 1.4, 0], [-10, 1.4, 0]];
    views.forEach((position, index) => {
      camera.position.set(...position); camera.lookAt(0, 0.5, 0);
      camera.zoom = index === 1 || index === 2 ? 1.5 : 1;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      renderer.render(scene, camera);
      context.drawImage(renderer.domElement, 0, index * 600);
    });
    const image = atlas.toDataURL('image/webp', 0.9);
    renderer.dispose();
    if (!image.startsWith('data:image/webp;')) throw new Error('Browser cannot export WebP');
    return image.split(',')[1];
  });
  const destination = fileURLToPath(new URL('../public/assets/models/aventador-preview.webp', import.meta.url));
  await writeFile(destination, Buffer.from(result, 'base64'));
  console.log(`Rendered Aventador hologram preview: ${destination}`);
} finally {
  await browser.close();
}
