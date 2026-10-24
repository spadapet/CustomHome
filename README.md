# CustomHome

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
Furniture references, earlier living-room layouts and model assumptions are in
[viewer reference notes](viewer-reference-notes.md), not below the viewer.
Direct links: [ground-floor plan](http://127.0.0.1:4173/floor-plan-3d.html?view=top)
and [upstairs plan](http://127.0.0.1:4173/floor-plan-3d.html?view=upstairs-top).
For every room's approximate modeled width and depth, open the
[dimensioned ground floor](http://127.0.0.1:4173/floor-plan-3d.html?view=top&dimensions=1)
or [dimensioned upstairs](http://127.0.0.1:4173/floor-plan-3d.html?view=upstairs-top&dimensions=1).
The **Room dimensions (2D)** checkbox toggles labels and a readable list below
the plan. Small labels enlarge with zoom. Values use current saved room bounds,
rounded to inches, not finished clearances; irregular rooms show envelope extents.

In **Garage**, **Bikes** or **2D floor plan**, click or tap the yellow car-door
panels to toggle estimated swings (0 / 60 degrees), or Tab to a door control
and press Enter or Space. Cars are
still stand-ins; assumed door lengths and hinges do not establish actual fit.

In the 3D viewer, click or tap modeled house-door leaves to toggle hinged,
bifold, pocket sliding and exterior overhead door poses. Ordinary
hinged leaves use a conceptual 180-degree endpoint; the selected refrigerator
and freezer use the manufacturer-guide 115-degree full-access angle, bifolds
90 degrees, and sliders their modeled track endpoints. Existing starting
poses are preserved. Cabinet/appliance fronts and vehicle doors use separate
controls. These are display limits, not verified hardware stops or approved
clearance.

In **Dining room**, the patio leaf starts closed; click/tap it to show the
180-degree inward endpoint, or use **Open patio door** / **Close patio door**
above the viewer (also keyboard accessible). Reloading or choosing a different
camera view closes it. The adjacent casements stay closed. Move the patio-end
chair clear in real use; even its tucked position conflicts. The toggle shows
the concept swing, not approved operating clearance.

## Check changes

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs
```

For a focused check, append suite names:

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs mudroom-layout floor-grid
```

The runner checks JavaScript syntax and reports explicit test counts. Also
inspect the relevant browser views and measured clearances; tests alone do
not establish actual product fit, structural capacity or safe occupied use.

## Design and maintenance

- [Downloaded 3D asset library, sources and licenses](assets/models/README.md)
- [Current plan, dimensions and constraints](floor-plan-reference.md)
- [Design context and owner decisions](design-context.md)
- [Room and requirements pages](index.html)
- [Project instructions](.github/copilot-instructions.md)
- [Model-editing skill](.github/skills/home-model-editing/SKILL.md)
- [Publishing skill](.github/skills/home-model-publishing/SKILL.md)

Update affected room pages and the two design references with model changes.
Publish only when requested, preserving unrelated local files and the remote
branch's existing work.
