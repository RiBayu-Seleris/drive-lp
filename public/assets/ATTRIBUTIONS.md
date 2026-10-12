# Production assets

The reference PNGs in `REFERENSI-GAMBAR-DRIVE-LANDINGPAGE` are art direction only and are not shipped as production assets.

## Asphalt 02 — Poly Haven

- Files: `textures/asphalt_02_diff_1k.jpg`, `textures/asphalt_02_nor_gl_1k.jpg`
- Artist: Rob Tuytel
- Source: https://polyhaven.com/a/asphalt_02
- License: CC0 1.0 Universal — https://polyhaven.com/license
- Original source dimensions: 1K; material scale is 3m wide.
- Downloaded 2026-10-11 from Poly Haven's official `dl.polyhaven.org` asset CDN.

## Kloppenheim 06 (Pure Sky) — Poly Haven

- File: `hdri/kloppenheim_06_puresky_1k.hdr`
- Artists: Greg Zaal (original), Jarod Guest (sky edits)
- Source: https://polyhaven.com/a/kloppenheim_06_puresky
- License: CC0 1.0 Universal — https://polyhaven.com/license
- Downloaded 2026-10-11 from Poly Haven's official `dl.polyhaven.org` asset CDN.
- Used as a lighting/reflection environment, not as a reference-image backdrop.

## Aventador Sport — user-provided vehicle

- Source: workspace file `3D/8hd2hnno0ayo-aventador_sport/Avent_sport.obj`, with its adjacent `Avent_sport.mtl`, explicitly selected by the user on 2026-10-11.
- The supplied directory does not include an author or license document. This record identifies its user-provided provenance; it does not assign a CC0 or other license to the model.
- Runtime files: `models/aventador.glb` and `models/aventador-low.glb`. These contain geometry converted from that OBJ, normalized to Y-up, nose -Z, 4.8-unit length, and tire contact at Y=0.
- `scripts/build-aventador.mjs` merges material groups, preserves source normals, simplifies geometry, and applies Meshopt compression. The input hash, dimensions, triangle counts and output byte sizes are recorded in `models/aventador-build.json`.
- Source: 45,125,211 bytes / 648,084 triangles. Desktop: 2,069,304 bytes / 135,038 triangles. Low detail: 1,033,408 bytes / 53,757 triangles. Both versions use 15 material groups.
- The MTL references two unavailable tire maps through absolute Windows paths. The adjacent TGA/JPG files have no MTL binding, so they are not arbitrarily applied or shipped. Rubber, pearl-silver paint, smoked glass, metal, trim, and lamp materials are reconstructed as PBR materials for the landing-page lighting. The original MTL's fully invisible glass is made visible.
- Compression uses the locally bundled Meshopt decoder; the site does not fetch a remote Draco decoder.
- `models/aventador-preview.webp` is a 1200 × 3000 transparent image atlas of the same converted geometry, generated locally by `scripts/render-vehicle-preview.mjs`. Its five 1200 × 600 rows show perspective, front, rear, right and left views. Blue lighting and material tint suit the holograms. Photo preview, capture, damage and towing panels share this image; it is not a separate stock or AI-generated vehicle asset.

## Environment geometry

The highway, terrain, architecture, particles, holograms, and network geometry are authored in this project. The former procedural fastback is preserved in `.artifacts/checkpoints/before-aventador.tar.gz` but is no longer the rendered vehicle.

## DRIVE brand files

`brand/drive-mark.svg` and `brand/drive-logo.svg` were supplied with the existing project and retained as project brand assets.

## Cliff Side — Poly Haven

- Files: `textures/cliff_side_diff_1k.jpg`, `textures/cliff_side_nor_gl_1k.jpg`
- Photography: Dario Barresi and James Ray Cock; processing: Jenelle van Heerden.
- Source: https://polyhaven.com/a/cliff_side
- License: CC0 1.0 Universal — https://polyhaven.com/license
- Downloaded 2026-10-11 from the official Poly Haven asset CDN.
- Applied as repeating surface detail and normal maps on authored terrain geometry.

## Locally hosted fonts

Manrope, Poppins, and JetBrains Mono were downloaded without modification from the official Google Fonts repository on 2026-10-11. Their SIL Open Font License notices are included beside the font files in `fonts/`.

- https://github.com/google/fonts/tree/main/ofl/manrope
- https://github.com/google/fonts/tree/main/ofl/poppins
- https://github.com/google/fonts/tree/main/ofl/jetbrainsmono
