# DRIVE — Kenali kondisinya. Tentukan langkahnya.

An existing React/Vite application built around one scroll-directed WebGL world: a coastal highway, vehicle checkup, guided photo capture, damage analysis, three service options, workshop/towing services, and a connected ecosystem reveal. The vehicle travels inside the landscape. Typography and navigation support the world.

DRIVE is the brand used by the current webapp and admin. This page explains photo-based vehicle assessment and three possible next steps: repair at the user's expense, policy purchase, or a claim against an existing policy. The supporting sections explain roles, report access, estimates, towing, and conditional claim decisions. See [CONTENT_MAP.md](CONTENT_MAP.md) for verified source references and content boundaries.

The world is illustrative: its panels do not submit photos or decide claims. Configured CTA links open the actual webapp.

## Run

Node.js >=20.19 and npm are required.

```bash
npm install
npm run dev
```

Development uses port **5920**, production preview **5921**. Vite prints another available port if the requested port is occupied.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:browser -- --base-url=http://localhost:5921
```

The test defaults to installed macOS Chrome. Override `CHROME_PATH` for another Chromium executable. `npm run test:browser -- --offline` serves the built `dist/` files through request interception without a server. All fonts and assets are local. `--motion-only` and `--reduced-only` remain available for focused checks. Screenshots are saved in `.artifacts/`.

## Art direction and assets

All eight supplied images in `../REFERENSI-GAMBAR-DRIVE-LANDINGPAGE/` were opened and inspected before implementation. They are not copied into public assets or rendered as backgrounds. See [ART_DIRECTION.md](ART_DIRECTION.md) for the mapping and reconstruction decisions.

Production assets and their provenance records are in [public/assets/ATTRIBUTIONS.md](public/assets/ATTRIBUTIONS.md). The car uses the user-provided Aventador Sport OBJ converted into local GLBs. The road, terrain, city, processing architecture, holograms, and networks remain authored scene objects. Canvas textures draw local interface content onto spatial panels. Vehicle previews, photo capture, and the towing icon use a transparent WebP rendered from the same Aventador model. Poly Haven CC0 textures detail the road/rock surfaces, and a locally downloaded HDRI supplements reflection lighting. Fonts are self-hosted with their OFL notices.

The vehicle has a 2.07 MB desktop GLB and a 1.03 MB low-detail GLB, with 15 material groups each. Mobile, reduced motion and adaptive low quality use the lighter version. Three placements clone their Object3D hierarchy while sharing cached geometry and materials. Meshopt decoding is bundled locally; Draco/CDN loading is disabled. The previous vehicle is preserved in `.artifacts/checkpoints/before-aventador.tar.gz`.

To rebuild both assets from the provided workspace OBJ:

```bash
npm run build:vehicle
```

The converter also accepts a different source path as its first argument. It retains the model's silhouette and normals, reconstructs materials where the legacy MTL is incomplete, and writes source/output metadata to `public/assets/models/aventador-build.json`. The 43 MB OBJ and unbound TGA textures are not served to visitors.

With the development server running, rebuild the shared 163 KB hologram image atlas from the desktop GLB:

```bash
npm run build:vehicle-preview
npm run test:vehicle
```

Both commands default to `http://localhost:5920` and accept `-- --base-url=http://localhost:PORT`. Preview generation uses installed Chrome and needs the development server's module paths. The atlas includes perspective, front, rear, right and left views so directional photo labels match the rendered angle. The vehicle check verifies local asset loading, shared geometry, detail changes, photo panels, and the fallback after a failed model request.

A source snapshot of the original non-Git project is preserved at `.artifacts/checkpoints/before-visual-reset.tar.gz`.

## World architecture

| File | Responsibility |
| --- | --- |
| `src/hooks/useJourneyTimeline.ts` | One GSAP/ScrollTrigger timeline; normalized progress 0–1 and chapter state. |
| `src/hooks/useSmoothScroll.ts` | Lenis driven by the GSAP ticker, synchronized to ScrollTrigger. |
| `src/experience/runtime.ts` | Mutable frame data; no per-frame React state updates. |
| `src/experience/cameraPath.ts` | Continuous geographical camera/target splines, held service-options composition, final pull-back. |
| `src/experience/CameraRig.tsx` | Camera sampling, responsive composition, smooth FOV, restrained pointer response, diagnostics. |
| `src/experience/Experience.tsx` | Canvas, asset readiness, failure boundary, quality selection, visibility lifecycle. |
| `src/experience/Environment.tsx` | Shared world assembly and lighting. |
| `src/experience/Vehicle.tsx` | Cached Aventador GLB instances, adaptive detail, and contact shadow. |
| `scripts/build-aventador.mjs` | Reproducible OBJ conversion, simplification, material mapping, and Meshopt compression. |
| `scripts/render-vehicle-preview.mjs` | Renders the same Aventador GLB into a shared transparent hologram thumbnail. |
| `src/experience/world/roadPath.ts` | Catmull-Rom road centerline and strip geometry. |
| `src/experience/world/DigitalHighway.tsx` | Highway surface shader, elevated structure, rails, vehicle travel, instanced light streams. |
| `src/experience/world/Landscape.tsx` | Terrain, water, atmosphere, city and destination gateway. |
| `src/experience/world/HologramPanel.tsx` | Reusable locally drawn interface surfaces in 3D. |
| `src/experience/world/SignalSystems.tsx` | Data routes, instanced scanner rings, and emitters. |
| `src/experience/world/ClaimArrival.tsx` | Vehicle warning and spatial photo/data capture. |
| `src/experience/world/ProcessingChamber.tsx` | Open cylindrical chamber, server architecture, core, file streams, connected rails. |
| `src/experience/world/ValidationWorld.tsx` | Three service branches, workshop/towing hub, and ecosystem reveal. |

The stages are `overview`, `checkup`, `capture`, `analysis`, `options`, `services`, and `ecosystem`. They share the same coordinate system. Scroll transports the camera through them; the final view reveals their physical relationship. Processing moves forward through the chamber; it does not orbit the car.

GSAP owns scroll sequencing and narrative copy. R3F owns frame rendering and object transforms. Framer Motion owns navigation/menu/loader microinteractions. AOS only reveals the supporting product sections. CSS supplies simple hover and focus states.

## Responsive and motion behavior

- **High:** DPR capped at 1.5, 100-segment terrain grids, 190 city buildings, 420 atmosphere points, bloom/vignette.
- **Medium:** DPR capped at 1.25, 72-segment terrain, 130 buildings, 240 points. Selected initially for lower reported CPU concurrency; measured rendering performance can also lower the tier.
- **Low:** mobile/reduced motion or sustained frame pressure; DPR 1, 48-segment terrain, 80 buildings, 100 points, fewer moving signals, no postprocessing.
- Scanner ticks, bridge supports, city geometry, and moving data points use instancing. Meshes and textures created by components have disposal cleanup.
- Mobile uses a different opening camera composition, compact capture/service objects, and a more vertical ecosystem reveal.
- System reduced-motion and the **Gerakan minimal** control hold static chapter views, stop decorative time, and use demand rendering. They preserve the current chapter.
- Hidden tabs and fully offscreen journeys stop continuous rendering.
- WebGL failure or context loss retains all semantic chapter copy, navigation, FAQ, and CTA controls.

Open `?scene-diagnostics=1` to expose camera, target, FOV, story progress, frame count, FPS samples, draw calls, triangles and geometry counts on the Canvas dataset. GPU measurements from headless desktop Chrome are development observations, not physical-phone benchmarks.

## Public CTA URLs

Copy `.env.example` to `.env.local` when URLs are available. Public URL resolution remains in `src/lib/links.ts`.

| Variable | Purpose |
| --- | --- |
| `VITE_DRIVE_APP_URL` | Public DRIVE app base URL. |
| `VITE_DRIVE_PARTNER_URL` | Optional explicit partner registration URL. |

These Vite values are public browser configuration. Development defaults to the sibling webapp at `http://localhost:5910`. Production requires `VITE_DRIVE_APP_URL` for application links; without it, the page offers local explanatory navigation. The optional partner override can be configured independently.

## Validation

Browser coverage includes all seven chapters, forward processing travel and final camera pull-back, natural scroll between chapters, pointer response, calm-mode preservation, desktop/mobile/medium-tier layouts, menu keyboard focus, service/role navigation, conditional-approval FAQ content and toggles, render pausing, and WebGL context loss. It also checks that reference PNGs are never requested.

Rendered reference comparison remains a visual review task alongside automated checks. The result uses procedural spatial interpretation, not photoreal reference-image reproduction.
