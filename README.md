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

Production assets and their provenance records are in [public/assets/ATTRIBUTIONS.md](public/assets/ATTRIBUTIONS.md). The car uses the user-provided Aventador Sport OBJ converted into local GLBs. The road, terrain, city, incident markers, scanning geometry, workshop buildings, towing vehicle and service routes are authored scene objects. Canvas textures supply distinct assessment, claim, dispatch and ticket interfaces. Vehicle identification and capture panels use a transparent WebP atlas rendered from the same Aventador model. Poly Haven CC0 textures detail the road/rock surfaces. Reflections come from a code-built night environment (horizon city light, lamp strips, moon); the Poly Haven HDRI in `public/assets/hdri/` is no longer loaded. Fonts are self-hosted with their OFL notices.

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
| `src/hooks/useJourneyTimeline.ts` | One paused GSAP timeline in story units, driven by a spring that follows the scroll (lag ~0.35 s, speed cap 6 units/s); epilogue past the journey; chapter state; cards and HUD fade while the story travels fast. |
| `src/hooks/useSmoothScroll.ts` | Lenis on the GSAP ticker; menu jumps glide with an ease in and out, longer for longer trips (1.1–2 s). |
| `src/experience/runtime.ts` | Mutable frame data; no per-frame React state updates. |
| `src/experience/story.ts` | Every story beat in one place: Scene 01 (depart, rockfall, brake, impact, pull over, hazards, stop), the roadside chapters (photos, upload, claim) and the recovery (tow, winch, carry, dawn, repair, drive away). Car, truck, camera, lights and HUD all read it. |
| `src/experience/journeyPath.ts` | Where the car and the tow truck are at any story position: Scene 01's cruise, emergency braking, the knock and the pull-over, parked from the stop until the winch, the planned (turn-rate limited) ride into the workshop, the move between bays, the way out and on along the coast in the epilogue. Calm-mode chapter positions; rolled distance for the wheels. |
| `src/experience/cameraPath.ts` | Scene 01 chase camera (offsets in the car's frame, solved against the reference framing); then shots around the parked car (plate, the photo walk, toward the analysis tower, the damage, the claim across the bay, overhead search, the loading), riding with the tow truck, the repair bay and the drive away. Keys hold a shot or move between shots (orbit and swing circle the car and keep it in frame; crane lifts). Every shot keeps the car clear of the story card. |
| `src/experience/CameraRig.tsx` | Camera sampling, responsive composition, smooth FOV, restrained pointer response, diagnostics. |
| `src/experience/Experience.tsx` | Canvas, asset readiness, failure boundary, quality selection, visibility lifecycle, HUD projector; compiles every shader and uploads every texture up front (`ShaderWarmup`). |
| `src/experience/Environment.tsx` | Moonlight (warming to first sun at the end), exponential fog, the night reflection environment, world assembly. |
| `src/experience/Effects.tsx` | Bloom on HDR light, ACES tone mapping inside the composer (so every tier shares one look), vignette, MSAA. |
| `src/experience/Vehicle.tsx` | One persistent cached Aventador: night paint, tail/brake/hazard lights and headlight beam, wheels that roll with the distance driven. |
| `src/experience/vehicleWheels.ts` | Splits the GLB's shared tyre and rim meshes into four wheel pivots; blur disc for fast spin. |
| `src/experience/vehicleLook.ts` | Night materials for the shared GLB materials (paint, glass, rims, lamps). |
| `src/experience/HudProjector.tsx`, `hudAnchors.ts` | DOM labels pinned to 3D points; the canvas writes their transforms per frame (no three.js in the page bundle). |
| `src/experience/materials/` | Custom shaders as plain factories: night sky, bay water, city windows (and their reflection), snow ranges, triplanar cliff rock, wet asphalt, mist, rain. |
| `scripts/build-aventador.mjs` | Reproducible OBJ conversion, simplification, material mapping, and Meshopt compression. |
| `scripts/render-vehicle-preview.mjs` | Renders the same Aventador GLB into a shared transparent hologram thumbnail. |
| `src/experience/world/roadPath.ts` | Catmull-Rom road centerline, road strips and upright ribbons (rails, deck faces). |
| `src/experience/world/DigitalHighway.tsx` | Wet road with planar reflection, viaduct deck and piers, guardrails and reflectors, street lamps, the bend's chevrons, tail-light trails, the vehicle carrier. |
| `src/experience/world/reflection.ts`, `useRoadReflection.ts` | Mirror camera below the road plane; only layer-3 objects (car, lights, signals, sky) are re-rendered. |
| `src/experience/world/Landscape.tsx` | Night sky, bay and mirrored city, coast city, snow ranges, coastal cliffs and island with trees, disc tower, mist banks. |
| `src/experience/world/terrain.ts`, `cityLayout.ts`, `atmosphere.ts` | Landform height functions (the cliff follows the road at a safe offset), skyline layout, shared night colours, moon and fog. |
| `src/experience/world/JourneyPanel.tsx` | Ten bespoke 1024×640 canvas-texture panel kinds, actual vehicle atlas views, masked/unlocked assessments and the same simulated ticket code. |
| `src/experience/world/SignalSystems.tsx` | Data routes, instanced scanner rings, and emitters. |
| `src/experience/world/IncidentScene.tsx`, `incidentSite.ts`, `incidentHud.ts` | Rockfall on the bend and the rock that hits the car, warning hologram (sized by distance), pulse rings, scroll-driven impact pulse; the pinned distance label. |
| `src/components/IncidentHud.tsx`, `src/animations/incidentTimeline.ts` | Scene 01 heads-up layer (route, alert, radar, impact flash) on the scrubbed timeline. |
| `src/experience/world/VehicleNarrative.tsx` | Plate and plate-scanning details and the body scan/heat overlay attached to the same vehicle. |
| `src/experience/world/RoadsideStories.tsx` | Everything that happens around the waiting car: photo flashes and scan ring, photos travelling to the analysis tower and the result coming back, the claim crossing the bay and the decision returning, the widening search with partner workshops and the truck's route; spatial panels (still the earlier canvas panels). |
| `src/experience/world/TowTruck.tsx` | The partner flatbed: drives the path in `journeyPath.ts`, backs up, tips its bed into a ramp, winches the car aboard and carries it; light bar, reverse lights, rolling wheels. |
| `src/experience/world/ServiceArchitecture.tsx` | The partner workshop (`Workshop`): a service platform on the left of the straight beyond the bend (the left rail opens there), a two-bay building with a rear door for the truck and front doors for both bays, lit glass band and DRIVE sign, repair sweep. |

The stages are `incident`, `coverage`, `scan`, `assessment`, `unlock`, `claim`, `services`, and `resolution`. They share one coordinate system and one normalized story progress. After the incident the car does not move on its own: it waits at the roadside through chapters 02–07 while the camera and the data move around it, until the tow truck winches it aboard. The truck carries it round the bend to the repair bay as night turns to dawn, and the final shot follows the repaired car down the road toward the sunrise. The active world is assembled from `Landscape`, `DigitalHighway`, `IncidentScene`, and `RoadsideStories`; the old processing chamber, gateway and final ecosystem reveal are not active story elements.

GSAP owns scroll sequencing and narrative copy. R3F owns frame rendering and object transforms. Framer Motion owns navigation/menu/loader microinteractions. AOS only reveals the supporting product sections. CSS supplies simple hover and focus states.

## Responsive and motion behavior

- **High:** DPR capped at 1.5, full terrain detail, 230 city towers, wet-road mirror at half resolution, rain, bloom/ACES/vignette with 4× MSAA.
- **Medium:** DPR capped at 1.25, 170 towers, mirror at 0.35 resolution, no rain, 2× MSAA. Selected initially for lower reported CPU concurrency; measured rendering performance can also lower the tier.
- **Low:** mobile/reduced motion or sustained frame pressure; DPR 1, coarser terrain, 110 towers, fewer mist banks and trails, no mirror pass, no postprocessing (the renderer's ACES keeps the same look).
- City towers (and their reflection), piers, posts, reflectors, lamps, trees, gravel, mist, rain and trails use instancing. Meshes, materials and textures created by components have disposal cleanup.
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

## Scene 01 status — 12 October 2026 (Claude)

Scene 01 was rebuilt to the incident reference: night coast road after rain, the city across the bay, snow ranges, a cliff on the right, the disc tower and the moon. Rock comes down from the cliff into a sharp left bend; a bouncing rock hits the car's front-left corner while it is still braking in its lane, and only then does the car pull over and stop at the roadside with its hazards on. Scroll is time: car, lights, wheels, warning, camera and heads-up layer all read `src/experience/story.ts`.

Verification without a browser (the project owner reviews visuals in their own browser):

- `tsc` and ESLint clean.
- Every custom material compiled through three.js against a stub WebGL context and validated with Khronos glslang (GLSL ES 3.00), including the `onBeforeCompile` injections.
- Composition solved and checked numerically (car, warning, city, moon, horizon positions on 16:9 and 390×844) and with offline flat-shaded renders of the real geometry.
- Not verified: final lighting balance, bloom strength and the look on physical phones.

## Chapters 02–08: the car waits — 13 October 2026 (Claude)

After the incident the car does not move on its own: it waits at the roadside through chapters 02–07 while the camera and the data move around it (plate, a walk round it for four photos, photos to the analysis tower and back, the damage, the claim across the bay, the overhead search), until the tow truck pulls in ahead, backs up, tips its bed and winches it aboard. Night turns to dawn on the ride round the bend.

### Second pass, same day, after review

- **The incident is sudden, not sought.** The car cruises with nothing wrong (the HUD shows only rain, a wet road and a rockfall-prone zone). At `rockfall` rock breaks off the cliff on the right; only then do the warning, the alert ("BATU JATUH") and the distance label appear. The driver brakes in the lane; one rock bounces once in the right-hand lane and comes down on the front-left wing while the car is still in its lane, then glances off and rolls to the left barrier. **Only after the hit does the car pull over** (the owner's third note: the rock hits the car, never the car pulling over into the rock), and it stops about 24 units further on with its hazards on. The rocks fall, bounce and roll by story position, a few legs per rock (`IncidentScene.tsx`); the traffic stopped beyond the bend was removed.
- **Hazard lights sit in the lamps.** The blinkers are placed from the GLB's own lamp meshes (outer headlight segment, outermost tail LED), small LED strips inside the housings instead of spheres beside the body.
- **The workshop is a building.** The truck turns off onto the workshop platform and drives in at the rear door; inside, out of sight, the car is lifted across into its own bay; the empty truck leaves by the front; the repaired car rolls out of its bay's front door and rejoins the road. The building comes up with the map in chapter 07 (in the opening shot it would cover the city across the bay).
- **The page below the story is part of it.** The canvas is a fixed backdrop for the whole page. Scrolling the sections from "Langkah demi langkah." to the end moves the story on (`EPILOGUE_SPAN` past `JOURNEY_END`): the repaired car drives on along the coast and the camera climbs to the bay and the city in the morning. The sections darken the world behind their text and let it show between them. At the very end of the page the world holds its last frame.
- **Lighter rendering.** Pixel ratio capped at 1.25 (desktop) / 1.15 (medium); post-processing multisampling 2 instead of 4 and fewer bloom levels on medium; no multisampled canvas when the composer does the anti-aliasing; the road's mirror pass is skipped (and the reflection faded) when the camera is more than ~15 units above the road; rendering runs at full rate while scrolling or pointing and at 30 fps when idle; the quality tier steps down only from frames measured while moving.

### Third pass: story cards and smooth travel

- **Story cards.** Each chapter's copy sits on a dark glass card (blur, navy tint, hairline border; `.story-panel` in `styles.css`). The card reaches into the margin by its padding, so the text keeps its place. The cameras keep the car clear of it — the left third of a wide screen, the top half of a phone — checked numerically on twelve real browser viewports (1280×610 to 1920×969, 375×548 to 430×746). Shots changed for it: the damage, search and loading on phones; the loading and the repair on desktop; the arrival, leaving and drive away on phones.
- **The story follows the scroll like a spring.** The scroll says where the story should be; the story moves there with a critically damped spring (about 0.35 s behind a steady scroll, at most 6 story units a second). Cards, HUD, car and camera read the same position, so a fling, a dragged scrollbar or a far jump plays through smoothly and in step. Above about 2.2 units a second the cards and the HUD fade out until the story slows down. Calm mode follows the scroll directly. ScrollTrigger is no longer used.
- **Menu jumps glide**, longer for longer trips (1.1–2 s), easing in and out.
- **No first-visit stalls.** Shaders are compiled and textures uploaded right after the scene first renders (`ShaderWarmup`). The plate scan, the photo flashes and the tow-truck beacon share one accent light (`world/accentLight.ts`), so the light count never changes (a change recompiles every lit shader); faded groups turn their materials transparent when they mount, so they compile with the rest.
- **The car stays in frame through every move.** Two moves used to lose it (tower to damage, damage to claim); they now circle the car. The drive away from the workshop swings round the moving car instead of passing under the camera.
- Fixed on the way: the search rings on the dispatch map (chapter 07) never showed, because the fade captured their opacity while it was 0; the fade now scales whatever the rings last set.
- The browser test waits 3.2 s per chapter (was 2.5 s): a jump across the whole story settles in about 2.3 s.

Motion limits come from `tests/vehicle.mjs`: every planned drive is sped up in straights and slowed in turns so the car never moves more than 1000 units or turns more than 8 radians per story unit (worst cases now 234 and 6.9). That test now expects more than 0.3 of the road covered (0.5 before), because the car no longer drives itself across chapters 03–06.

Checked without a browser: `tsc` and ESLint clean, all 32 shaders validated with glslang, car/truck/rock/wall clearances and the test rates computed numerically, every chapter's composition (and the epilogue) projected on 16:9 and 390×844, and flat-shaded offline renders of the key frames. Not checked: the look and the frame rate in a real browser, and the browser tests themselves.

## Validation

Validation of the 12 October eight-stage rebuild is **pending**. Earlier checks do not establish acceptance of the new scenes. Required checks include all eight chapters and their transitions, one persistent road-aligned vehicle, paid unlock, conditional approval branches, workshop/towing selection, shared-ticket handoffs, and the final road view.

Run desktop/mobile/medium-tier and reduced-motion browser checks, native scroll and navigation tests, focus/FAQ behavior, visibility pausing, local asset loading and WebGL fallback. Inspect rendered references alongside those checks; tests alone do not establish visual acceptance. Reference PNGs must never be requested by the application. The world combines authored geometry, a supplied vehicle model and local interface surfaces; photoreal equivalence to the generated references is not asserted.
