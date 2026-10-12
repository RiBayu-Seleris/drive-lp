# DRIVE art direction — 12 October 2026

The current direction follows the user's eight-scene incident-to-road specification. The primary audience is the vehicle owner. One coherent vehicle, road and camera journey connect an incident to identification, damage assessment, paid detail, a conditional insurance decision, physical services and a repaired return to the road.

## Current reference set

All files are in `../REFERENSI-GAMBAR-DRIVE-LANDINGPAGE/` and share the prefix `Gambar ChatGPT 12 Okt 2026, `. They are composition and atmosphere references, not production backgrounds.

| Filename suffix | Scene | Reconstruction focus |
| --- | --- | --- |
| `14.48.43-1.png` | 01 — The Incident | A car inside a large coastal/mountain road environment, a visible incident signal, controlled amber/red warnings, wet surface, atmospheric depth and restrained opening text. |
| `14.48.46-2.png` | 02 — Identify & Check Coverage | Close vehicle/plate view; capture brackets lead from plate data to an insurance lookup and existing-coverage result. |
| `14.48.47-3.png` | 03 — Scan the Damage | Damaged-area markers and guided image capture around the same car; actual model-angle thumbnails feed analysis data routes. |
| `14.48.49-4.png` | 04 — AI Damage Assessment | Meaningful vehicle-analysis surfaces show a general result while detailed outputs remain locked. The car and source photos remain the context. |
| `14.48.50-5.png` | 05 — Unlock & Decide | Payment opens the full assessment, including component repair/replace guidance and estimates; the insured branch continues toward a claim. |
| `14.48.51-6.png` | 06 — Claim & Smart Approval | Policy, chronology, documents and submission; clear insurer-enabled eligible-product auto approval versus manual review. |
| `14.48.53-7.png` | 07 — Workshop & Towing | Spatial registered-partner workshop selection, independent delivery/towing choice, expanding proximity search and provider discovery. |
| `14.48.54-8.png` | 08 — One Ticket / Back on the Road | One approved service ticket moves through towing and workshop handoffs; the repaired vehicle returns to a calmer, brighter road. |

The current reference directory contains these eight October 12 scenes. Earlier October 11 filenames, the asset-board mapping and the seven-stage ecosystem-ending interpretation are superseded.

## Product meaning must survive the visuals

- Identification uses photographed plate data to check coverage. Insurance is not recognized visually from a vehicle image.
- The main scenario has existing insurance. It does not purchase coverage after an incident.
- Every user, including an insured user, pays to unlock full AI detail.
- Auto approval requires insurer configuration on the selected product and a qualifying claim. Manual review remains visible as the other branch.
- Only registered DRIVE partner workshops appear in the selected-service story.
- Delivery can be independent or by towing. Towing search starts nearby and expands as needed; displayed radii and ETA values are illustrative.
- Towing and workshop use the same approved service ticket, with QR/barcode and manual-code options.
- The final payoff is the repaired vehicle continuing its journey. Supporting actors do not replace that ending with a systems diagram.

See [CONTENT_MAP.md](CONTENT_MAP.md) for the full content contract and source references. Numerical values and service/ticket examples must be visibly labeled simulations.

## Current active reconstruction

The persistent viewport contains the road, terrain, water, mist and distant city. `DigitalHighway` owns one moving vehicle placement; `journeyPath.ts` supplies shared chapter holds, road progress and bend correction for that vehicle and the camera. Identification and full-result views can hold their composition while the story advances.

`IncidentScene` adds a warning on the opening bend. `VehicleNarrative` keeps plate, scanning details and damage marks attached to the same supplied Aventador model, then removes the damage for the repaired ending. `RoadsideStories` coordinates scan geometry, source-photo data routes, spatial assessment/claim panels, workshop buildings, towing search and ticket handoffs.

`JourneyPanel` uses distinct local canvas-texture compositions for coverage, capture, locked/unlocked assessment, claim, approval branches, workshop choice, dispatch, ticket and authorization. Vehicle images come from the locally rendered five-view atlas of the same model. The interfaces are explanatory geometry in the world, not reference PNG overlays or live transaction screens.

The active environment assembly is `Landscape`, `DigitalHighway`, `IncidentScene` and `RoadsideStories`. The previous chamber, large gateway and final ecosystem pullback are no longer active narrative elements. The last camera move stays with the repaired vehicle toward a brighter horizon.

## Material and composition goals

Use dark navy, wet asphalt, mountain silhouettes and atmospheric perspective. Incident accents are restrained red/amber; system information is ice blue/cyan; approved services introduce teal. The repaired ending adds a calmer sky and modest horizon warmth.

Maintain foreground, midground and background. Narrative typography should occupy a small, readable region without hiding the car or road. Spatial interface text must remain legible on mobile; reduce density instead of merely shrinking desktop panels. Camera changes should explain what the owner is doing, with pointer movement remaining secondary to scroll.

The vehicle is a user-supplied model converted to local desktop/mobile GLBs. Road, terrain, city, warning geometry, scanning fields, workshop/towing props and routes are authored scene elements. Surface textures and HDRI provenance are in [public/assets/ATTRIBUTIONS.md](public/assets/ATTRIBUTIONS.md). No photoreal or pixel-identical reference reproduction is asserted.

## Review status and gates

Visual and browser acceptance for the October 12 rebuild is **pending**. Earlier seven-stage screenshots and checks do not validate these new scenes.

Review the opening first at 1440×960 and 390×844, with narrative text visible and hidden. Confirm a readable incident, grounded vehicle, road depth, useful lighting and a world extending beyond the viewport. Continue sequentially through plate identification, damage capture, masked-to-unlocked assessment, approval branches, workshop/towing search, ticket handoffs and the final road shot.

At each transition check spatial continuity, readable UI, the same vehicle identity, and truthful product behavior. Inspect the final return-to-road state separately from the service ticket. Repeat essential framing checks in mobile, reduced motion and low quality; compare low-tier color and material visibility with high-tier output. Automated checks supplement this inspection and do not establish visual quality by themselves.
