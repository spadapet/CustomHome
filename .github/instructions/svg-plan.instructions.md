---
description: "Use when creating or revising SVG floor-plan studies from owner images, preserving plan versions or comparing SVG diagrams with the adopted 3D layout."
applyTo: "assets/images/plans/**/*.svg"
---

# Versioned SVG floor-plan studies

- Read the current [plan reference](../../floor-plan-reference.md),
  [design context](../../design-context.md) and affected room notes. Identify
  which SVG study and which 3D layout are current; they may intentionally differ.
- For a new image-based revision, create the next version file and preserve
  previous versions unchanged unless the owner explicitly requests an in-place
  edit. Do not overwrite an earlier study to make it agree with the latest model.
- SVG review is not permission to adopt a layout into 3D. Leave model scripts
  and saved layout JSON unchanged until the owner explicitly approves adoption.
  State the SVG-only boundary in the diagram and related notes.
- Keep plans as editable vector geometry. Record the image calibration and
  units; use the same feet-to-SVG scale for both floors when comparing them.
  Distinguish source-image dimension labels from measured vector clear sizes.
  If raster dimensions do not reconcile, label the trace approximate and do not
  claim an exact finished area or verified clearance from the image.
- Always display square footage for each floor and the combined total in a
  whole-house SVG. Count the stairway only once, on the downstairs floor;
  exclude the upstairs stair block and state its deduction. Use actual outline
  geometry or shared area helpers, union overlaps and state wall-face basis
  and exclusions. Label image-derived area estimates approximate, not certified.
  Test the arithmetic, stair deduction and visible totals whenever the plan changes.
- When asked to match an SVG floor to the current 3D model, use its shared
  geometry helpers for walls, openings and floor strips, including stepped or
  L-shaped rooms. Do not copy superseded alternatives from an older SVG.
  Identify view-left/right separately from north-up page order.
- Do not invent unpictured furniture, fixtures, openings or access repairs in
  an image-only trace. Identify unresolved access, structure and operating
  clearances rather than implying construction approval. Door-height intent
  remains 96 inches; source symbols do not establish selected widths or hardware.
- Update the affected room notes and both design references, clearly separating
  the new study from the adopted model. Keep prior alternatives labeled historical.
- Follow the [regression guidance](model-tests.instructions.md): verify version
  preservation, requested room/wall/opening geometry and any required agreement
  with shared model coordinates. Parse SVG XML and check HTTP rendering for
  clipping when geometry changes. Do not describe DOM/bounds checks as visual
  screenshot inspection.
