# CustomHome

Current exterior material study (October 27): neutral warm-white main brick
is unchanged; decorative red-brown scanned queen brick wraps the raised lower
walls, porch exposed foundation, column bases, landing nose and step risers.
Pale coping, porch paving and stone treads retain contrast. The base remains
30 inches above house floor; slim 12-inch column shafts and architecture remain.
Brick/mortar sample panels, veneer support/flashing and coping/drips need design
review. Walking finishes need separate exterior slip/frost and drainage approval;
wall veneer is not an approved paver. See [elevations](elevations.html).

A furnished Three.js home-design study with two-floor views, tours, exterior
studies and a one-foot floor grid. Dimensions and storage/access arrangements
are conceptual, not construction drawings or code approval.

## Preview

Use Node.js 20 or newer. No package installation is needed.

```powershell
node .\preview-server.cjs
```

Open [the viewer](http://127.0.0.1:4173/floor-plan-3d.html). Three.js loads from
jsDelivr, so the browser needs network access. Both floor designers were
removed; existing layout JSON still loads read-only in the page.

Preview performance: drawing is event-driven and orbit/tour camera updates
coalesce into animation frames. Kitchen/mudroom contact shading pauses while
orbiting and returns on release; stationary detail and lighting are unchanged.
On high-DPI screens, orbit frames also use one render pixel per CSS pixel;
full sharpness returns on release, blur or view change. This does not lower
stationary screenshot resolution. Both saved layouts load concurrently.
Post-processing buffers resize only when the viewport changes. The local
server revalidates assets with ETags instead of downloading unchanged models
and textures again; code and saved layouts remain uncached. Restart an older
preview-server process once to enable the asset-cache behavior.

The collapsible **Menu** on the left groups floor/view choices, exploration,
display options and rooms. Collapse it for more canvas space. On phones it
starts closed above the model and closes after choosing a camera. **Show
design notes** opens the separate requirements panel; it is not another room
navigation menu. Duplicate 2D shortcuts above the canvas have been removed;
the direct links below and on the floor-plan page remain available.

Choose **2D floor plan** for a flat, north-up orthographic view of the current
floor, with furniture retained. Drag to pan, scroll/pinch to zoom, and optionally
enable the **1 ft grid**. Choose **Whole floor** or **Upstairs** to return to 3D.
The viewer opens on **Whole floor** in **Rotate** mode unless a link selects a
view. **Refresh model** below the canvas reloads the latest model there;
**Reset view** returns to Whole floor and Rotate without reloading.
The Menu's **Night lighting / Day lighting** button switches preview illumination.
Day is the default (Night unchecked); enable Night for the softer illuminated preview.
Warm 2700 K-intent deep-regressed recessed fixtures now cover both modeled
floors: 4 in apertures, dark baffles and lenses recessed 2 in above the
ceiling plane, replacing the surface-mounted disks. They provide broad
ambient illumination only, with a separate local
piano task lamp (the living end-table reading lamp is removed). The rosewood Yamaha CLP-825 replaces
the dark living-room loveseat; its bench is provisional. Recessed kitchen
cans provide broad ambient light only. Product glare/output and occupied
piano access still require verification.
The choice stays in effect during tours, floor/view changes and Reset.
Reload/Refresh starts in Day. In exterior views, Night enables the warm
porch/door, driveway, side-path,
rear garden-path and patio lights plus the lanterns and step washes.
Day switches exterior sources and lens glow off; returning to Night
restores them. Previously removed path-post/bollard lights stay removed.
Lighting is illustrative, not verified illuminance or glare compliance.
On the applicable interior views, Night also enables four kitchen downlights,
the main interior stair LED strips and their soft tread washes,
under-cabinet/hood task lighting and the family-board picture light, and
checks **Island lights** so its pendants show and illuminate the island.
Day turns these practical light sources off and restores the previous
daytime pendant-visibility choice. Inspection presets still hide foreground
pendants/ceiling hardware; other views restore them. This is illustrative
lighting, not a verified illuminance or glare calculation.
Furniture references, earlier living-room layouts and model assumptions are in
[viewer reference notes](viewer-reference-notes.md), not below the viewer.
Direct links: [ground-floor plan](http://127.0.0.1:4173/floor-plan-3d.html?view=top)
and [upstairs plan](http://127.0.0.1:4173/floor-plan-3d.html?view=upstairs-top).
For every room's approximate modeled width and depth, open the
[dimensioned ground floor](http://127.0.0.1:4173/floor-plan-3d.html?view=top&dimensions=1)
or [dimensioned upstairs](http://127.0.0.1:4173/floor-plan-3d.html?view=upstairs-top&dimensions=1).
The **Dimensions** checkbox defaults on for both 2D plans and toggles compact labels with a short room
name and dimensions only (for example, **Bed 2 / 13' x 12'6"**). Labels fit
their room and enlarge with zoom up to 10 px. Full names and qualifications
remain in the collapsed **Sizes** list and label tooltips. Values round to inches;
upstairs uses paint-face main rectangles, while ground rooms use nominal
envelopes. The stepped kids' room shows its area instead of a misleading rectangle.
Labels stay hidden in 3D. A manual toggle is preserved across views;
`dimensions=0` explicitly opens a plan without labels and `dimensions=1` enables them.
The compact footer keeps **Windows**, **Area**, **1st**, **2nd** and **Size** visible.
Windows counts individual units; its tooltip has openings/types. Area is the
combined interior total; 1st and 2nd show floor areas in sq ft. Tooltips keep
measurement qualifications. Size is maximum modeled plan bounds, not a zoning envelope.

In **Garage**, **Bikes** or **2D floor plan**, click or tap the yellow car-door
panels to toggle estimated swings (0 / 60 degrees), or Tab to a door control
and press Enter or Space. Cars are
still stand-ins; assumed door lengths and hinges do not establish actual fit.

In the 3D viewer, click or tap modeled house-door leaves to toggle hinged,
bifold, pocket sliding and exterior overhead door poses. Ordinary
hinged leaves use a conceptual 180-degree endpoint; the selected refrigerator
and freezer use the manufacturer-guide 115-degree full-access angle, bifolds
90 degrees, and sliders their modeled track endpoints. Existing starting
poses are preserved. Click or tap cabinet doors, drawers or their handles on
either floor to open/close them too. Cabinet doors swing outward 90 degrees;
drawers slide with their boxes. Storage starts closed; view changes preserve
its pose, and reloading closes it. Vehicle doors retain their separate
controls. These are display limits, not verified hardware stops or approved
clearance; close cabinet fronts before using the adjacent route.

In **Dining room**, the patio leaf starts closed; click/tap it to show the
90-degree inward endpoint on the west dining wall, or use **Open patio door** / **Close patio door**
above the viewer (also keyboard accessible). Reloading or choosing a different
camera view closes it. The old garden-side door and landing are removed,
replaced by a paired-casement window. Move the west end
chair clear in real use; even its tucked position conflicts. The toggle shows
the concept swing, not approved operating clearance.

## Watch without navigating

The [house walkthrough](floor-plan-design.html#house-walkthrough) is a
4:03, 1280 x 720 MP4 with original soft instrumental music, small room labels, gentle camera movement and
edited cuts. It covers the exterior, furnished ground floor, garage,
upstairs rooms and covered patio. Native controls support pause, seeking
and full screen; the page includes captions, a text description and a
[downloadable MP4](assets/videos/whole-house-walkthrough.mp4) for sharing.
The viewer's Menu also links to the video.
Restart an already-running preview server after updating so MP4 content types
and byte-range seeking are enabled.

This October 25, 2026 recording is a static model snapshot, not a live
automatic tour or continuous stair walk. Later model changes require a
new recording. Basement rooms are not modeled; mechanical equipment
and construction/code clearances remain unverified. Asset credits are
included in the collapsed video description and [source notes](assets/models/README.md).
The picture has no concept disclaimer, date stamp, title card or credits panel.
Native volume/mute controls also work in the downloaded MP4.
The original soundtrack can be regenerated without dependencies:

```powershell
python .\scripts\generate-walkthrough-music.py C:\temp\walkthrough-music.wav
```

## Check changes

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs
```

For a focused check, append suite names:

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs mudroom-layout floor-grid
```

The runner checks JavaScript syntax, explicitly selects TAP across supported
Node versions and reports test counts. Also
inspect the relevant browser views and measured clearances; tests alone do
not establish actual product fit, structural capacity or safe occupied use.

## Design and maintenance

- [Cabinet, window and related product inventory: sizes, sources and selection status](docs/product-inventory.md)
- [Downloaded 3D asset library, sources and licenses](assets/models/README.md)
- [Current plan, dimensions and constraints](floor-plan-reference.md)
- [Design context and owner decisions](design-context.md)
- [Room and requirements pages](index.html)
- [Project instructions](.github/copilot-instructions.md)
- [Model-editing skill](.github/skills/home-model-editing/SKILL.md)
- [Publishing skill](.github/skills/home-model-publishing/SKILL.md)

### Copilot workflows

Repository-local customizations live under `.github`; they do not install
packages or run automatically in the background.

| Customization | Use |
|---|---|
| [House Design](.github/agents/house-design.agent.md) | Implement coordinated architecture and interior design studies |
| [Home Design Review](.github/agents/home-design-review.agent.md) | Read-only review of owner constraints, coordination and evidence gaps |
| [Home Product Research](.github/agents/home-product-research.agent.md) | Read-only research using current manufacturer and authority sources |
| [Space planning](.github/skills/home-space-planning/SKILL.md) | Adopted Roomsmith workflow for dimensioned furniture layouts, circulation and design critique |
| [Model verification](.github/skills/home-model-verification/SKILL.md) | Browser checks, world-space measurements and state restoration |
| [Product research](.github/skills/home-product-research/SKILL.md) | Product fit, installation limits, source dates and asset provenance |

Select an agent from the agent picker for its role. Skills can be selected with
`/` in supporting clients or loaded when their descriptions match the task.
File-specific instructions apply to
[geometry](.github/instructions/model-geometry.instructions.md),
[viewer behavior](.github/instructions/viewer-behavior.instructions.md),
[tests](.github/instructions/model-tests.instructions.md) and
[design documentation](.github/instructions/design-documentation.instructions.md).
Research and review roles do not authorize design changes or publication.

The space-planning skill adapts the MIT-licensed
[Roomsmith](https://github.com/Rumeasiyan/roomsmith) workflow, with a pinned
source revision and the upstream license included in the skill folder.
House Design and model editing use it for floor plans and furnishing; it does
not install Roomsmith's CLI, paid rendering services or a replacement viewer.
Adopting instructions does not itself correct existing model placements.

After changing customizations:

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs agent-customization
git diff --check
```

Update affected room pages and the two design references with model changes.
Publish only when requested, preserving unrelated local files and the remote
branch's existing work.
