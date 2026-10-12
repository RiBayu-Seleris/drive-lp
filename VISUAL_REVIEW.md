# Visual reset validation — 11 October 2026

The existing application renders seven product chapters in one shared WebGL world. Following source review of the webapp, gateway and admin, the original claim-only narrative was updated to vehicle assessment, capture, analysis, service choices, workshop/towing and the ecosystem. All eight supplied visual references remain mapped in `ART_DIRECTION.md`; none is shipped as a background. Product evidence is recorded in `CONTENT_MAP.md`.

## Final checks

The following commands passed for the content alignment, including the final navigation offset and mobile menu fixes:

```sh
npm run typecheck
npm run lint
npm run build
npm run test:browser -- --offline
```

The browser suite ran against the final production files in installed Chrome. It covered desktop (1440 × 960), medium quality (1024 × 768, DPR 2 input), mobile (390 × 844 and 360 × 640), reduced motion, and WebGL context loss. It checked all seven chapters, camera travel, pointer response, chapter navigation, menu keyboard behavior, service/role navigation, conditional-approval FAQ content and interaction, motion controls, and offscreen render pausing. No unexpected runtime errors or external font warnings were reported.

A separate check against the local development server verified the six application CTA paths, a 320 × 640 layout without horizontal overflow, service navigation landing below the header, and the menu close button remaining reachable after scrolling. CTA destinations were inspected without submitting data or calling service APIs.

## Rendered inspection

Rendered inspection covered the updated opening, photo capture, three service options, workshop/towing hub, and the desktop service/role/FAQ sections, along with compact mobile framing. The all-passed verification checks and central approval symbol were removed. The existing camera journey and procedural landscape are retained.

Current evidence is in `.artifacts/`:

- `desktop-hero.png`, `stage-1.png` through `stage-7.png`
- `mobile-hero.png`, `mobile-stage-3.png` through `mobile-stage-7.png`, `mobile-compact.png`
- `medium-tier.png`, `reduced-motion.png`, `webgl-fallback.png`
- `desktop-services.png`, `desktop-roles.png`, `desktop-faq.png`
- `mobile-services.png`, `mobile-claim-path.png`, `mobile-roles.png`, `mobile-faq.png`
- `mobile-320-hero.png`, `mobile-320-menu.png`, `mobile-320-services.png`

The visual treatment is a stylized spatial reconstruction of the references. It is not a photoreal reproduction. Headless rendering measurements are development observations; physical phone GPU performance and Safari have not been tested. The ecosystem view remains the most draw-call-heavy composition. Vite reports a bundle-size advisory for the lazy Three.js chunk; the production build succeeds.

The original source snapshot remains at `.artifacts/checkpoints/before-visual-reset.tar.gz`; the state before content alignment is preserved at `.artifacts/checkpoints/before-product-content.tar.gz`.

## Aventador integration — 12 October 2026

All three vehicle placements now use the user-selected `Avent_sport.obj`, converted into local Meshopt GLBs: 2.07 MB / 135,038 triangles for desktop and 1.03 MB / 53,757 triangles for low quality. Each has 15 material groups; the three instances share geometry and materials. Source geometry, proportions and normals are retained through simplification. Materials were reconstructed because the legacy MTL references missing tire maps. The pre-change vehicle is preserved in `.artifacts/checkpoints/before-aventador.tar.gz`.

The generic car drawing in **Pratinjau foto**, **Foto kendaraan**, the vehicle-condition panels and the towing icon is replaced with a transparent render of the same Aventador. A single 162,424-byte WebP atlas contains five views. The processing stream's **FOTO DEPAN / BELAKANG / KANAN / KIRI** panels select matching angles. All views fit their capture frames without cropping opaque geometry.

Final validation passed:

```sh
npm run lint
npm run build
npm run test:vehicle
npm run test:browser -- --offline
```

The build includes TypeScript checking. The focused vehicle suite verified three independent instances sharing 15 geometries, one request per required GLB, one shared preview request, no remote decoder requests, chapter navigation, reduced-motion detail changes, desktop/mobile resizing without replacing the canvas, and low detail with DPR 1 on mobile. A separate fresh browser context returned an intentional model 404 and confirmed loader exit, semantic content and chapter navigation still work. Expected failure diagnostics were isolated from the normal-page checks.

The full browser suite passed against the final production build, including seven chapters, navigation, supporting content, reduced motion and WebGL context loss. Rendered inspection covered desktop/mobile opening and photo capture, directional photo panels in the analysis chamber, service choices and the ecosystem. Evidence includes `.artifacts/aventador-desktop-capture.png`, `aventador-desktop-analysis.png`, `aventador-mobile-capture.png`, `aventador-asset-fallback.png`, and refreshed production `stage-*.png` / `mobile-stage-*.png` screenshots. No additional generated-art service was needed. Physical mobile GPU and Safari validation remain outside this local Chrome check; the existing Three.js bundle advisory remains.
