# Exterior masonry scans

Locally bundled 1K JPG maps from [Poly Haven](https://polyhaven.com/), licensed
[CC0](https://polyhaven.com/license). Downloaded October 26, 2026; original
files were checked against the MD5 values from the public files API.
The viewer has no runtime dependency on Poly Haven.

| Set | Source | Authors | Maps |
|---|---|---|---|
| Brick Wall 001 | https://polyhaven.com/a/brick_wall_001 | Dimitrios Savva, photography; Rob Tuytel, processing | diffuse, OpenGL normal, roughness |
| Stone Wall | https://polyhaven.com/a/stone_wall | Charlotte Baglioni, photography; Dario Barresi, processing | diffuse, OpenGL normal, roughness |
| Grass Ground | https://polyhaven.com/a/grass_ground | Charlotte Baglioni | diffuse, OpenGL normal, roughness |
| Kloppenheim 06 (Pure Sky) | https://polyhaven.com/a/kloppenheim_06_puresky | Greg Zaal; Jarod Guest | 1K Radiance HDR |
| Oak Veneer 01 | https://polyhaven.com/a/oak_veneer_01 | Jenelle van Heerden | diffuse, OpenGL normal, roughness |
| Roof Slates 03 | https://polyhaven.com/a/roof_slates_03 | Rob Tuytel | diffuse, OpenGL normal, roughness |

The October 30 study uses warm-gray modern queen brick above full lower-story
light stone, superseding the white-brick/red-plinth study. Brick diffuse
luminance L grades to V=min(229,164+0.255L), RGB(V+4,V+3,V-2), rounded
to clamped bytes. Stone uses its own Stone Wall scan, not recolored brick:
V=110+0.58L, RGB(V+8,V+6,V). Independent diffuse Sources retain original
normal/roughness maps; brick relief strength0.18, stone0.3. No new assets
or manufacturer photography; the repository's existing CC0 provenance above
is retained, not a new manufacturer sourcing claim.
Porch exposed foundation, support bases, landing nose and step risers use stone.
Pale coping, porch paving and stone treads retain contrast; walking finishes
require exterior slip/frost selection. Wall veneer is not approved paving.
All diffuse Sources are sRGB with white material multipliers.
White trim/portal stay pale. Physical brick/mortar/stone panels required.
Original JPGs remain unchanged. Normal and roughness
maps remain non-color data; they are not derived from the color map.
Brick repeats are interpreted as five nominal8-inch modules across and
fourteen3.125-inch courses high, not supplier CAD. Stone is projected at an
assumed8-ft tile, independently on front/return faces rather than stretched.
Both are appearance references, not selected/approved products. Require actual
stone/brick/mortar panels in sunlight/shade; no coating, integral color or
limestone species is established by the scan or owner reference.

Directional sunlight, HDR sky/reflections and one 2048-pixel shadow map are
enabled only for exterior Day views. Exterior Night/interior views restore
their previous backgrounds and lighting. The original HDR was checked
against the Poly Haven files API MD5. The lawn uses the original Grass Ground
scan with a mild green tint, tiled at a provisional 12 ft visual scale;
it is not a verified species/site photograph.
The oak scan supplies the shared arched-entry bodies and recessed panels;
grain runs vertically at a provisional 2.43 ft-wide by 8 ft-high visual
tile. It is not manufacturer door CAD or a specified exterior finish.
The main roof surfaces use Roof Slates 03 at the source's nominal 3 m
tile scale with separate normal/roughness maps. This is a slate-style
appearance reference, not a selected asphalt shingle or approved roof
assembly. The porch and entry roofs remain standing-seam metal.
Runtime crops the top 5% of all three slate maps consistently to exclude
the scan's pale flashing strip; the original JPG files remain unchanged.
Material weathering, scan scale and surface relief do not establish actual
product availability, wall assembly, structural support or construction fit.
