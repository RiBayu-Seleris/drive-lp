# DRIVE entry experience

The existing landing page, eight story chapters, content, and navigation are retained. The first visit uses the supplied `public/assets/models/aventador.glb`; the binary is unchanged. It has one node, 15 material primitives, Y up, a -Z-facing nose, a 4.8 m length and approximately 2.19 m width. The official `public/assets/brand/drive-logo.svg` is the splash identity. The logo keeps its native aspect ratio.

The first visit and Hero are two states of the existing R3F world. One canvas, one `VehicleCarrier`, one cloned full-detail model, and one `CameraRig` remain mounted throughout. The mobile and reduced-motion quality tiers still simplify the environment, but never swap this entry vehicle for the low-detail asset. The opening camera faces the nose. The official logo resolves first without a blur filter; the shared canvas then fades in while the vehicle approaches. The analysis shader runs on the same vehicle that later drives through the story.

## Entry and restoration

`driveSession.ts` resolves the document entry once, including React StrictMode. A new navigation/tab gets the cinematic first visit (also when the browser copies session storage from an opener). A reload with `drive:introSeen=1` gets Signal Restore. Existing navigation within the page does not remount the entry component. A history traversal with a new document restores the saved section; the browser's back-forward cache retains the already mounted page.

Only `drive:introSeen` and `drive:lastSection` are persisted in sessionStorage. Story IDs come from the existing stages. Product sections use `page:` prefixes so `services` (Bengkel & towing) cannot collide with `page:services` (Pilihan layanan). Storage denial and invalid stored sections safely fall back to the Hero. A section is saved after scroll settles, with an additional check against the existing story spring; raw pixel positions are not persisted.

Lenis initializes stopped. Once fonts and the destination scene are ready, the first-visit analysis runs and then waits at the enabled `Mulai jelajahi` button. Scroll remains locked during this wait and during the turnaround. A click disables the button immediately and starts one GSAP timeline. The Aventador follows a half-circle with synchronized position, body heading, wheel roll, and front-wheel steering; at the midpoint its left profile is shown with the nose pointing screen-left. The camera tracks and reframes the motion. The dark splash veil recedes while the existing road, reflections, skyline, and mountains become visible. Hero navigation starts appearing before the Hero copy. At 100%, the vehicle pose, camera position, target, and FOV come from the same `sampleVehiclePose(0)`, `sampleView(0)`, and `sampleFov(0)` functions as the existing Hero, after which Lenis starts. The former full-screen grain overlay and bloom pass are removed so the road, vehicle, and UI remain crisp.

A `drive:restore` event remeasures and snaps the existing GSAP timeline and spring before both the turnaround and refresh restoration. There is no ScrollTrigger in the current journey implementation, so no parallel ScrollTrigger controller is introduced.

The refresh visual remains DOM/SVG/CSS only. The landing page behind it loads its normal vehicle and environments. Refresh animation takes approximately one second **after** scene readiness; network, scene initialization and shader compilation can extend total loading time. The first visit's approach and analysis take approximately 3.3 seconds, followed by an indefinite user-controlled wait. The controlled turnaround takes approximately 4.5 seconds after the CTA click. Reduced motion skips the moving turnaround and uses short fades. There is no audio or black transition.

The HTML document supplies a dark cover before JavaScript/CSS and disables automatic browser scroll restoration. React replaces that cover immediately. A 10-second readiness deadline lets visitors reach readable page content if loading stalls; model/WebGL errors use the brand-only path and existing page fallback. Critical destination readiness is reported after a scene frame, not by HTML canvas fallback content (which React mounts even when WebGL is supported).

## Local previews

With `npm run dev`:

- `/?splash=1`: force the full splash.
- `/?loader=refresh`: preview restoration using the saved section.
- `/?splashReset=1`: clear the two session keys and replay the first visit.

These switches are ignored in production. No debug controls are visible in the UI.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm run build`, and the existing browser/vehicle regression suites. The entry-specific suite is `BASE_URL=http://localhost:5920 npm run test:loading` (defaults to 127.0.0.1:5921). It verifies the official logo, CTA wait, scroll lock, single canvas/carrier identity, curved vehicle displacement, approximately 180-degree body turn, left-side screen direction, progressive environment reveal, and exact Hero endpoint. It also exercises real reloads at Hero, assessment, towing and the product service section, plus native scroll settling, late font readiness, mobile, reduced motion, denied session storage, failed vehicle assets, and a stalled-asset deadline.

The vehicle regression starts each forward/reverse sweep at a settled endpoint. The original suite began reverse sampling while the existing spring still had forward velocity, a failure reproduced on the unchanged HEAD baseline. Its continuity, carrier identity, model count, and resource assertions remain in place.

Validated locally in headless Chrome against production files. Review images are written to `.artifacts/entry-desktop-waiting.png`, `.artifacts/entry-desktop-left-profile.png`, `.artifacts/entry-mobile-waiting.png`, and `.artifacts/entry-mobile-left-profile.png`. These checks do not replace physical-device performance testing.
