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

The owner-corrected warm-WHITE brick grades photographic diffuse luminance
L at runtime: V=min(246,194+0.265L), RGB(V+4,V+3,V-2), rounded
to clamped bytes. All source hue tails are removed: R-G <=1, G-B=5,
not pink, peach, yellow or neutral grey. Mortar/face luminance survives.
This supersedes rejected pinkish ivory; the collage
is inspiration, not a selected product or an exact paint/brand match.
The latest close-up request uses decorative red-brown brick ONLY on the raised
base. Its independent diffuse Source uses the original Brick Wall 001 scan,
not the white-graded map or tinted ashlar. Face RGB is
(92+0.48L,38+0.34L,26+0.27L); pale low-chroma mortar (channel range <24,
L>115) uses (164+0.18L,158+0.18L,145+0.18L). Original normal/roughness
maps remain independent. No added random cracks or procedural noise.
Porch exposed foundation, support bases, landing nose and step risers match.
Pale coping, porch paving and stone treads retain contrast; walking finishes
require exterior slip/frost selection. Wall veneer is not approved paving.
All diffuse Sources are sRGB with white material multipliers.
White trim/portal stay pale. Physical brick/mortar/stone panels required.
Original JPGs remain unchanged. Normal and roughness
maps remain non-color data; they are not derived from the color map.
Brick repeats are interpreted as five nominal 8-inch face modules across and
fourteen 3.125-inch courses high for BOTH queen-brick palettes, not supplier CAD.
Per-face physical projection includes narrow column returns; no 8-ft base tile.
The stone scan is a visual reference, not a selected limestone product.

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
