---
description: "Use when editing shared room geometry, windows, doors, roof envelopes, exterior assemblies, upstairs placement or saved layout data."
applyTo: "floor-plan-ground.js,floor-plan-upstairs.js,floor-plan-exterior.js,floor-plan-roof.js,upstairs-layout.js,ground-layout.json,upstairs-layout.json"
---

# Coordinated model geometry

- Follow [model editing](../skills/home-model-editing/SKILL.md). Read the current
  [plan reference](../../floor-plan-reference.md) and
  [design context](../../design-context.md) before changing a layout.
- Trace shared layout/window/roof helpers before adding constants. Preserve
  browser globals and CommonJS exports used by Node tests; do not convert the
  project to a bundled/module-only application for a local design edit.
- Units are feet. Verify local axes, parent transforms, garage floor elevation
  and upstairs datum before positioning parts. Measure against finished faces,
  not room envelopes or an assumed zero floor.
- Coordinate shared boundaries/openings with the furnished model, exterior,
  floor finishes, trim, stairs and relevant schedules. Roof geometry belongs
  with shared roof data as appropriate, not a second inconsistent silhouette.
- Keep all doors 96 inches tall across openings, leaves, frames and casing.
  Use standard cabinet boxes and separate fillers/scribes. Preserve fixed
  openings, owner reach, exposed prep dishwasher front and default door poses.
- Saved JSON is persisted owner data, not generated test output. Preserve it
  unless the request requires a layout change; use existing resolve/serialize
  conventions and do not restore the removed interactive floor designers.
- Reuse physical material scale and installation data. Distinguish intended
  joinery/contact from overlap; a trim patch must not hide an opening mismatch.
- Add relevant geometry/placement regression tests and follow
  [browser verification](../skills/home-model-verification/SKILL.md).
  Structure, load capacity, waterproofing and safe operation remain unapproved
  unless separately verified.
