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

## Scene 01 reconstruction — 12 October 2026 (Claude)

Rebuilt against `14.48.43-1.png`. Decisions that later scenes should keep:

- **One night world.** Moon ahead-right (`atmosphere.ts`), exponential fog, a dark navy sky with moonlit cloud edges and stars. Every custom material reads the same colours so the horizon has no seams. The final chapter warms the same light, sky and fog into first sun.
- **Geography.** Coast city across the bay ahead-left (towers under ~100 units so the snow ranges stay taller, as in the reference), a low wooded island framing the left edge, a cliff wall on the inside of the opening right-hand curve that ends at the incident bend, and the disc tower on a sea stack beyond it. The road's later sections cross the bay as the lit viaduct seen in the reference.
- **The incident is a rockfall, not a collision with another car.** Rock breaks off the right-hand cliff and comes down across the right-hand lanes of a sharp left bend. One rock bounces into the car's path and hits its front-left corner while the car is braking in its own lane; only then does the car pull over into the outer left lane, short of the bend, and stop there with hazards on. This keeps the moment non-graphic and matches the front-left damage scanned in Scene 03.
- **Traffic keeps left (Indonesia).** The car drives in the inner left lane (`VEHICLE_LANE = -2.125`) and pulls over to `PARKED_LANE = -6.4`; lane lines sit at ±4.25 and 0. Scale: the 4.8 m car is 5.76 units, so 1 unit ≈ 0.83 m.
- **Camera.** Chapter 1 is a chase camera defined in the car's frame, solved numerically to the reference framing (car a third in from the left, warning right of centre, city behind); at rest the tower stands over the car and the warning hangs upper right over the rockfall. It hands over to the chapter-2 plate shot. Mobile has its own solved offsets.
- **Wet road.** Planar mirror of the car, lights, signals and sky, smeared vertically and distorted by the asphalt normal map; puddles are near-mirror, paint stays matte. Red comes from the car's tail-lights, the brake lights, the warning and the chevrons — red only where something is wrong.
- **Heads-up layer.** Scene label "01 — INSIDEN" in the reference style, a route/conditions panel, an alert panel that appears with the rockfall ("BATU JATUH") and turns to "INSIDEN TERJADI" at the impact, a red radar arc, and a label pinned to the warning with the distance to the rockfall, which becomes the impact caption at the hit. The page text stays short; the scene carries the moment.

## Chapters 02–08: the car waits — 13 October 2026 (Claude)

Rule from the project owner: **after the incident the car does not move on its own.** It waits at the roadside until help takes it. The references for chapters 02, 05, 06 and 07 draw the car still driving (spray at the wheels); keep their mood, not that motion.

- The car stays parked from the stop through chapter 07, hazards on. The camera and the data travel: photos fly to the disc tower (DRIVE's analysis), the claim crosses the bay to the city (the insurer), the search rings widen from the car. Reference 04's "AI chamber" is therefore not a place the car goes to.
- Life around it: the rain eases, traffic files past slowly in the one open lane, the hazards blink. Every chapter has its own shot so five chapters of a parked car do not read the same.
- **The incident must read as sudden and unavoidable**, never as the car seeking it (second note from the owner): no warning before the rock falls; the rock comes to the car's path, not the car to the rock. **The rock hits first, then the car pulls over** (third note): the knock happens while the car is still braking in its own lane, and only afterwards does it move to the roadside and stop.
- Recovery: the tow truck overtakes, pulls in ahead, backs up, tips its bed and winches the car aboard (towing chosen because the car hit a rock; self-delivery stays an option in the panel). Night turns to dawn on the ride round the bend. **The car is taken to a workshop building, never left in the road**: a service platform beside the straight, the truck in at the rear door, the repaired car out of the front door of its own bay and back onto the road toward the sunrise (`SUN_DIRECTION`).
- The page below the story continues it over the same world (the car drives on along the coast, the view opens to the bay and the city); the sections are veiled, not solid.

- **Story cards and the camera** (owner's request): the chapter copy sits on dark glass cards (top left on a wide screen, across the top on a phone). Shots keep the car out from under them; a new shot must be checked against the card on short laptop and phone viewports, not just 16:9. Moves between shots circle the car (orbit, swing) rather than pass through or over it.
- **Scroll feel**: the story trails the scroll by about a third of a second and eases in and out; on fast trips the copy steps aside so it never flickers through chapters.

Next: replace the old canvas panels chapter by chapter with reference-style DRIVE panels, starting with Scene 02 low behind the parked car, and look for a properly licensed tow-truck model.