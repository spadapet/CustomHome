# Local 3D asset library

Downloaded models for reuse in the home viewer. They are **not automatically
placed in the floor plan** and do not change its dimensions or owner decisions.
The garage viewer uses five copies of the downloaded bicycle. The
living-room layouts H, G and F also use two textured Poly Haven Modern Arm Chair 01
instances, uniformly scaled to 32.25 inches wide; these replace the simplified
wing chairs and are generic visual references, not IKEA products. Other models
remain a reusable library, except for the seven garage tool/storage assets:
five wall tools, one toolbox and four copies of the plastic crate.

Earlier H/G use a licensed Wayfair GlamVelvetSofa from Khronos glTF Sample Assets,
with two Side Table 01 instances uniformly scaled to 20 inches high. G retains
the earlier sofa arrangement without these tables.
It is product-based, not an AI reconstruction; display width is 86 inches.
F retains the earlier custom sectional. The AI-generated evaluation candidates
are not included in this library.

Current J uses a custom oatmeal L-sectional concept, not the downloaded sofa.
Its single armchair is a clone of Modern Arm Chair 01, uniformly scaled to
30 inches wide with a new oatmeal color map; original normal/roughness maps
remain. The dark comparison chairs are unchanged. Its end table uses Side
Table 01. Neither original asset file is modified.

The mudroom uses Shopify's textured Materials Variants Shoe and Poly Haven
Rubber Boots in place of simplified shoe blocks. Footwear is uniformly scaled:
11.5 in-long sneakers, 14 in-high adult boots under the bench, 11 in-high
shelf boots and smaller children's sneakers. These are visual references,
not selected products. Clean left/right boots are extracted from the supplied
four-boot scene; source files remain unmodified.

Current collection: **1,184 models, 309.2 MiB** of model resources.
The two footwear assets pass structure, dependency, checksum and browser
loading checks. The downloader budget is now 312 MiB; use
`.\scripts\download-home-assets.ps1 -MudroomOnly` to refresh just footwear
while retaining the rest of the manifest.

The previous expansion added 444 models: 328 Kenney models, 104 textured
Poly Haven models and 12 Grab3D models. All 738 existing assets retained
their original file hashes.

All 1,182 passed structure, dependency and checksum checks. This expansion's
104 Poly Haven models, all 12 Grab3D models and a sample from each of the
five new Kenney packs also loaded through Three.js GLTFLoader: 121 checks.
The 300 MiB budget excluded 69 candidates; one more had no supported 1K glTF.
See the download report for their source URLs and reasons.

See [manifest.json](manifest.json) for every model's entry file, source,
license, author information where supplied, dependency files, size and SHA-256.

| Collection | Contents | Appearance | License |
|---|---|---|---|
| [Khronos GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa) | Wayfair velvet sofa with authored fabric variants | Realistic product visualization | CC BY 4.0 |
| [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | Refrigerators, kitchen cabinets, counters, sinks, bathroom fixtures, beds, sofas, tables, chairs, lamps and household props | Stylized, lightweight | CC0 |
| [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | Trees, plants, rocks and outdoor props | Stylized, lightweight | CC0 |
| [Kenney City Kit Suburban](https://kenney.nl/assets/city-kit-suburban) | Houses and suburban exterior pieces | Stylized, lightweight | CC0 |
| [Kenney Food Kit](https://kenney.nl/assets/food-kit) | Food, drinks, dishes and kitchen/pantry props | Stylized, lightweight | CC0 |
| [Kenney Car Kit](https://kenney.nl/assets/car-kit) | Vehicles, wheels and parking/garage visualization pieces | Stylized, lightweight | CC0 |
| [Kenney Survival Kit](https://kenney.nl/assets/survival-kit) | Camping, outdoor and utility props | Stylized, lightweight | CC0 |
| [Kenney Holiday Kit](https://kenney.nl/assets/holiday-kit) | Seasonal decorations and household props | Stylized, lightweight | CC0 |
| [Kenney Building Kit](https://kenney.nl/assets/building-kit) | Modular architectural parts | Stylized, lightweight | CC0 |
| [Kenney Mini Market](https://kenney.nl/assets/mini-market) | Shelving, retail fixtures and packaged household goods | Stylized, lightweight | CC0 |
| [Poly Haven](https://polyhaven.com/models) | Selected textured seating, tables, cabinets, shelves, plants, lights, garage tools, toolbox and plastic crate, with 1K textures | More realistic; varies by model | CC0 |
| [Grab3D](https://grab3d.com/models/) | Garage equipment, washer, fan, electrical props, camping items and bike rack | Stylized, textured | CC0 |
| [Bicycle by Poly by Google](https://poly.pizza/m/19VoUuA2pcN) | A downloadable bicycle, not a manufacturer-specific or size-certified model | Stylized | CC BY 3.0 |

Kenney's original license files are retained in each pack folder.
Poly Haven's asset license is described in its [FAQ](https://polyhaven.com/faq)
and [license terms](https://polyhaven.com/license). The download script uses its
public API with an identifying user agent; the viewer has no live API dependency.
Grab3D's [license](https://grab3d.com/license/) permits redistribution and
modification; each downloaded model's own page is recorded in the manifest.

## Required sofa credit

GlamVelvetSofa, copyright 2021 **Wayfair, LLC**; **Eric Chadwick**.
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Original GLB retained unmodified. Viewer changes: uniform scale and placement,
authored Champagne fabric selected, embedded studio light disabled.
Retain credit, source and license links in any published viewer using it.
The downloader also restores this sofa and verifies its pinned SHA-256.

## Required shoe credit

[Materials Variants Shoe](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe),
copyright 2021 **Shopify**, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Original GLB retained unmodified; viewer uniformly scales, rotates and clones
it for conceptual footwear. Retain this credit and the viewer's design-note
credit when publishing. [Rubber Boots](https://polyhaven.com/a/rubber_boots)
is CC0; its two clean boot meshes are used for the mudroom.

## Required bicycle credit

"Bicycle" by **Poly by Google**, via [Poly Pizza](https://poly.pizza/m/19VoUuA2pcN),
licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Model redistributed unmodified. When using or modifying it, retain the credit,
link the license and indicate modifications in the viewer's credits as well.

## Use and verify

Load a manifest entry with Three.js `GLTFLoader`. Keep each Poly Haven glTF
beside its `.bin` and `textures` directory; copying the JSON alone breaks it.
Most GLB files package their resources into one file, but some packs reference
a shared `Textures` folder. Retain the dependencies listed in the manifest.

Check units, orientation, bounding dimensions, polygon cost, materials and
operating clearances before replacing anything. Do not nonuniformly stretch
a product to make it fit. A realistic appearance is not manufacturer CAD,
construction approval or proof of actual product fit.

From the repository root:

```powershell
node .\scripts\check-home-assets.cjs
```

To re-download and refresh these collections, using PowerShell 7:

```powershell
.\scripts\download-home-assets.ps1
```

The downloader limits retained model resources to 300 MiB by default and rejects
individual downloaded files larger than 50 MiB. It keeps only browser-ready
models and their dependencies, not duplicate FBX/OBJ/Blender source exports.
Rerunning contacts the providers and overwrites these collection files; the
manifest hashes identify exactly which versions are currently stored. Matching
household models may be added as Poly Haven's catalogue grows. Separately
imported manifest entries are preserved.

[download-report.json](download-report.json) records models excluded because
no supported 1K glTF exists or a size limit would be exceeded. The library is
a bounded selection, not a complete mirror of those websites or all web assets.
Newly collected models are not automatically substituted into the house.
