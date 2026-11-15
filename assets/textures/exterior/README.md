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

November 15 English-French Transitional study (supersedes the October 30
Linen/low-stone grading): all grades come from `getExteriorMaterialConfig()`.
Brick faces grade to warm ivory RGB(232,214,184) at scan luminance 128,
shade 0.26 x (L-128) plus a bounded +/-6 warm variation from source chroma;
the scan's pale low-chroma joints (chroma<24, L>115) become light cream
mortar RGB(242,233,213). Stone Wall grades to warm cream cast stone
RGB(224,214,192), used only at the front entrance. Roof Slates 03 grades to
charcoal RGB(84,81,76) as a dimensional-shingle display proxy. The oak scan
also supplies the porch tongue-and-groove ceiling with drawn board joints.
Independent diffuse Sources retain original normal/roughness maps; no new
assets or manufacturer photography; the CC0 provenance above is retained.
Porch foundation faces are brick; landing nose and step risers cast stone.
Walking finishes require exterior slip/frost selection.
All diffuse Sources are sRGB with white material multipliers.
Physical brick/mortar/cast-stone sample panels are required.
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
