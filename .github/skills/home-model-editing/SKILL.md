---
name: home-model-editing
description: 'Edit and verify the CustomHome Three.js home model. Use when changing rooms, cabinets, cubbies, fixtures, furniture, doors, garage storage, patio roofs, outdoor storage, firepit placement, cameras or the one-foot floor grid.'
---

# Edit and verify the home model

## Read the current design

Use the [plan reference](../../../floor-plan-reference.md),
[design context](../../../design-context.md) and affected room page. These
describe the current direction; earlier alternatives may be superseded.

Identify the relevant surfaces:

| Surface | Source |
|---|---|
| Ground rooms, floors and openings | `floor-plan-ground.js` |
| Furniture, cabinetry, trim, cameras, tours and grid | `floor-plan-3d.js` |
| Upstairs geometry and saved overrides | `floor-plan-upstairs.js`, `upstairs-layout.js`, layout JSON |
| Exterior walls, roofs, paths, fence and outdoor storage | `floor-plan-exterior.js` |
| Controls and room notes | `floor-plan-3d.html`, `floor-plan-3d.css` |

## Make the change

Keep the viewer minimal and model-first. Add only UI needed for the owner's
request. Do not add unrequested banners, slogans, badges, explanatory panels,
duplicate menus or links. Do not restore the removed top slogan, concept
badge or visible garage-door explanation banner. Reuse existing navigation
and optional design notes for help and assumptions; do not open them
automatically. Preserve essential errors and actionable safety warnings.
Use screen-reader-only announcements when interaction feedback does not
need a visible status area.

1. Trace the existing helper and shared layout before adding geometry. Units
   are feet; garage and upstairs floor datums differ from the house floor.
2. Preserve unrelated owner decisions and saved layout data. For changed
   walls/openings, coordinate shared geometry, furnished geometry, trim,
   floor areas, steps and documentation.
3. Include actual projections: cabinet knobs, casing, baseboards, vehicle
   mirrors, door sweeps, clothing depth and occupied/retrieval space.
4. For builder-built storage, distinguish fixed shelves and ordinary closet
   doors from removable purchased containers. Do not represent an accessory
   bin as a built-in drawer.
5. For roofs, check world-space edges, slope, wall-head closures, posts and
   beams. For floor overlays, check finished tile/grout heights, not just
   structural floor elevations.
6. Do not turn goods-only storage into a walk-on platform without the required
   headroom and structural review. Show access-mode prerequisites explicitly.
7. Outdoor placement is not permission to burn or build. Check current official
   local rules and manufacturer requirements. If a requested location does not
   meet operating clearances, identify it as storage-only rather than a safe
   operating fallback.

## Verify

Run the smallest relevant suites from the repository root:

```powershell
node .\.github\skills\home-model-editing\scripts\check-model.cjs mudroom-layout floor-grid
```

Omit selectors to run every suite and check the root JavaScript syntax.
The runner uses the existing Node tests; it needs no installed packages.
An unknown suite, missing TAP summary, failed child process or syntax error
must fail validation.

Preview the HTTP-served model in the shared local browser:

- Check the relevant camera and the actual controls. Enable the grid when
  checking it; its default is off.
- Check that the requested feature adds no unnecessary visible UI or space
  above the model. Removed promotional chrome and explanatory banners must
  stay removed, including after floor/view changes and interactions.
- Measure real Three.js geometry after updating world matrices. Compare
  constituent meshes, not the empty interior of a whole cabinet's bounding box.
  Treat intended contact/joinery separately from positive overlap.
- Verify the specific requested clearance or output, including the route to
  a toilet or storage area, not merely that objects do not overlap.
- Test floor/view changes and restoration of hidden objects. Inspection
  presets can make shelves and closets readable without changing the layout.
- Separate display pose from operating clearance. Temporarily sample a door's
  full sweep with both tucked and pulled-out furniture, then restore the
  requested default pose. The dining patio door stays closed at 0 degrees;
  do not persist an open pose just because a swing inspection was requested.
  For centered furniture, assert its midpoint against the actual room bounds,
  not a camera impression or an offset chosen for clearance. Keep any
  chair/door operating conflicts visible in the model notes.
- Temporary browser route instrumentation may expose scene state for checks.
  Remove the route and reload the production script afterward; confirm one
  render canvas and no runtime errors. Do not commit debug globals.

Update the affected HTML room notes, plan reference and design context.
Report measured dimensions, remaining approval limits, validation results and
whether the work is still local.
