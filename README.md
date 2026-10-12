# DRIVE — Dari insiden, kembali melaju.

An existing React/Vite application built around one scroll-directed WebGL journey: incident, plate-based coverage lookup, damage capture, general AI assessment, paid full results, claim decisions, partner workshop/towing, and one service ticket leading back to the road. One persistent vehicle travels along the same highway; typography supports the scene.

The 12 October 2026 specification centers the vehicle owner and follows an insured example. Full AI detail requires payment for every user, including those with insurance. Automatic claim approval applies only to insurer-enabled products and qualifying claims; other submissions require manual review. After approval, the owner chooses a registered DRIVE workshop and independent delivery or towing. The same approved ticket supports QR/barcode scanning or manual entry at both towing and workshop handoffs. An uninsured owner can instead fund repair personally. See [CONTENT_MAP.md](CONTENT_MAP.md) for the product contract and source references.

The world is illustrative: scene percentages, costs, distances, ETA values and ticket codes are labeled simulations. Its panels do not submit photos, accept payments, decide claims or issue usable tickets. Configured CTA links open the actual webapp.

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

The current eight references in `../REFERENSI-GAMBAR-DRIVE-LANDINGPAGE/` are dated 12 October 2026 and map to the eight incident-to-road scenes. They remain development art direction, outside public assets; they are not rendered as backgrounds. See [ART_DIRECTION.md](ART_DIRECTION.md) for filenames, composition goals and review criteria.

Production assets and their provenance records are in [public/assets/ATTRIBUTIONS.md](public/assets/ATTRIBUTIONS.md). The car uses the user-provided Aventador Sport OBJ converted into local GLBs. The road, terrain, city, incident markers, scanning geometry, workshop buildings, towing vehicle and service routes are authored scene objects. Canvas textures supply distinct assessment, claim, dispatch and ticket interfaces. Vehicle identification and capture panels use a transparent WebP atlas rendered from the same Aventador model. Poly Haven CC0 textures detail the road/rock surfaces, and a locally downloaded HDRI supplements reflection lighting. Fonts are self-hosted with their OFL notices.

The vehicle has a 2,069,304-byte desktop GLB (135,038 triangles) and a 1,033,408-byte low-detail GLB (53,757 triangles), with 15 material groups each. Mobile, reduced motion and adaptive low quality use the lighter version. A single persistent placement clones the cached Object3D hierarchy while retaining shared geometry and materials. Meshopt decoding is bundled locally; Draco/CDN loading is disabled. The previous vehicle is preserved in `.artifacts/checkpoints/before-aventador.tar.gz`.

To rebuild both assets from the provided workspace OBJ:

```bash
npm run build:vehicle
```

The converter also accepts a different source path as its first argument. It retains the model's silhouette and normals, reconstructs materials where the legacy MTL is incomplete, and writes source/output metadata to `public/assets/models/aventador-build.json`. The original OBJ contains 648,084 triangles and 45,125,211 bytes (about 43 MiB); it and the unbound TGA textures are not served to visitors. Asset provenance is recorded without assigning an undocumented license.

With the development server running, rebuild the shared 163 KB hologram image atlas from the desktop GLB:

```bash
npm run build:vehicle-preview
npm run test:vehicle
```

Both commands default to `http://localhost:5920` and accept `-- --base-url=http://localhost:PORT`. Preview generation uses installed Chrome and needs the development server's module paths. The 1200×3000 atlas contains five 1200×600 tiles: perspective, front, rear, right and left. The vehicle check is intended to cover local asset loading, resource reuse, detail changes, photo panels, and the fallback after a failed model request; results for the current rebuild remain pending.

A source snapshot of the original non-Git project is preserved at `.artifacts/checkpoints/before-visual-reset.tar.gz`.

## World architecture

| File | Responsibility |
| --- | --- |
| `src/hooks/useJourneyTimeline.ts` | One GSAP/ScrollTrigger timeline; normalized progress 0–1 and chapter state. |
| `src/hooks/useSmoothScroll.ts` | Lenis driven by the GSAP ticker, synchronized to ScrollTrigger. |
| `src/experience/runtime.ts` | Mutable frame data; no per-frame React state updates. |
| `src/experience/journeyPath.ts` | Shared road stops, chapter holds and easing for the vehicle and camera; bend correction keeps travel aligned to the highway. |
| `src/experience/cameraPath.ts` | Camera/target splines for eight scenes, close inspection and service-map views, then forward travel toward the morning horizon. |
| `src/experience/CameraRig.tsx` | Camera sampling, responsive composition, smooth FOV, restrained pointer response, diagnostics. |
| `src/experience/Experience.tsx` | Canvas, asset readiness, failure boundary, quality selection, visibility lifecycle. |
| `src/experience/Environment.tsx` | Shared world assembly and lighting. |
| `src/experience/Vehicle.tsx` | One persistent cached Aventador placement, adaptive detail, contact shadow and vehicle narrative details. |
| `scripts/build-aventador.mjs` | Reproducible OBJ conversion, simplification, material mapping, and Meshopt compression. |
| `scripts/render-vehicle-preview.mjs` | Renders the same Aventador GLB into a shared transparent hologram thumbnail. |
| `src/experience/world/roadPath.ts` | Catmull-Rom road centerline and strip geometry. |
| `src/experience/world/DigitalHighway.tsx` | Highway surface shader, elevated structure, rails, vehicle travel, instanced light streams. |
| `src/experience/world/Landscape.tsx` | Terrain, water, atmosphere, distant city and the brighter final sky. |
| `src/experience/world/JourneyPanel.tsx` | Ten bespoke 1024×640 canvas-texture panel kinds, actual vehicle atlas views, masked/unlocked assessments and the same simulated ticket code. |
| `src/experience/world/SignalSystems.tsx` | Data routes, instanced scanner rings, and emitters. |
| `src/experience/world/IncidentScene.tsx` | Warning triangle, pulse rings and roadside incident reflectors on the opening bend. |
| `src/experience/world/VehicleNarrative.tsx` | Plate, plate-scanning details and damage marks attached to the same vehicle; damage clears for the repaired ending. |
| `src/experience/world/RoadsideStories.tsx` | Scene transitions, spatial panels, damaged-area scan field, photo data streams, registered workshop map, expanding towing search and shared-ticket handoffs. |

The stages are `incident`, `coverage`, `scan`, `assessment`, `unlock`, `claim`, `services`, and `resolution`. They share one coordinate system and one normalized story progress. The vehicle remains on the road while the camera shifts from incident follow shot to plate/damage inspection and service interactions. The final shot returns to the repaired vehicle traveling toward a brighter horizon. The active world is assembled from `Landscape`, `DigitalHighway`, `IncidentScene`, and `RoadsideStories`; the old processing chamber, gateway and final ecosystem reveal are not active story elements.

GSAP owns scroll sequencing and narrative copy. R3F owns frame rendering and object transforms. Framer Motion owns navigation/menu/loader microinteractions. AOS only reveals the supporting product sections. CSS supplies simple hover and focus states.

## Responsive and motion behavior

- **High:** DPR capped at 1.5, 100-segment terrain grids, 190 city buildings, 420 atmosphere points, bloom/vignette.
- **Medium:** DPR capped at 1.25, 72-segment terrain, 130 buildings, 240 points. Selected initially for lower reported CPU concurrency; measured rendering performance can also lower the tier.
- **Low:** mobile/reduced motion or sustained frame pressure; DPR 1, 48-segment terrain, 80 buildings, 100 points, fewer moving signals, no postprocessing.
- Scanner ticks, bridge supports, city geometry, and moving data points use instancing. Meshes and textures created by components have disposal cleanup.
- Mobile uses a different opening camera composition, centrally framed smaller panels and sequential ticket/authorization views; it retains all eight product stages.
- System reduced-motion and the **Gerakan minimal** control hold static chapter views, stop decorative time, and use demand rendering. They preserve the current chapter.
- Hidden tabs and fully offscreen journeys stop continuous rendering.
- WebGL failure or context loss retains all semantic chapter copy, navigation, FAQ, and CTA controls.
- Loader rows describe local visual readiness for vehicle, coverage, AI, claims and services. They reflect the scene-ready state, not a connection to live insurance or service systems.

Open `?scene-diagnostics=1` to expose camera, target, FOV, story progress, frame count, FPS samples, draw calls, triangles and geometry counts on the Canvas dataset. GPU measurements from headless desktop Chrome are development observations, not physical-phone benchmarks.

## Public CTA URLs

Copy `.env.example` to `.env.local` when URLs are available. Public URL resolution remains in `src/lib/links.ts`.

| Variable | Purpose |
| --- | --- |
| `VITE_DRIVE_APP_URL` | Public DRIVE app base URL. |
| `VITE_DRIVE_PARTNER_URL` | Optional explicit partner registration URL. |

These Vite values are public browser configuration. Development defaults to the sibling webapp at `http://localhost:5910`. Production requires `VITE_DRIVE_APP_URL` for application links; without it, the page offers local explanatory navigation. The optional partner override can be configured independently.

## Validation

Validation of the 12 October eight-stage rebuild is **pending**. Earlier checks do not establish acceptance of the new scenes. Required checks include all eight chapters and their transitions, one persistent road-aligned vehicle, paid unlock, conditional approval branches, workshop/towing selection, shared-ticket handoffs, and the final road view.

Run desktop/mobile/medium-tier and reduced-motion browser checks, native scroll and navigation tests, focus/FAQ behavior, visibility pausing, local asset loading and WebGL fallback. Inspect rendered references alongside those checks; tests alone do not establish visual acceptance. Reference PNGs must never be requested by the application. The world combines authored geometry, a supplied vehicle model and local interface surfaces; photoreal equivalence to the generated references is not asserted.
