# CustomHome project guidance

This is a home-design study, not construction drawings. Read the current
[plan reference](../floor-plan-reference.md) and [design context](../design-context.md)
before changing a layout. Room pages describe the owner's requirements.

- The model uses feet. Shared ground-floor geometry lives in
  `floor-plan-ground.js`; the furnished model is `floor-plan-3d.js`.
  Coordinate both when changing room boundaries or openings.
- Preserve saved layout JSON when changing viewer tools. Both interactive
  floor designers were removed; camera views, tours and the floor grid remain.
- Keep cabinetry, fixtures, trim, floor elevations, visibility and inspection
  views consistent. A feature hidden by a camera or floor finish is not
  necessarily missing geometry.
- Keep the kitchen-to-mudroom opening fixed unless the owner changes that
  requirement. Use the latest room notes for other constraints and finishes;
  do not revive an earlier design from conversation history.
- Treat operating clearances, fire separation, structure, load capacity,
  guards and headroom as unresolved unless actually verified. Label storage-only
  and approval-required placements in the viewer as well as the notes.
- Update the affected room pages, plan reference and design context together.
  Distinguish measured model clearances from product or code approval.

Use [home-model-editing](skills/home-model-editing/SKILL.md) for model changes
and [home-model-publishing](skills/home-model-publishing/SKILL.md) when publishing.
The [README](../README.md) has preview and validation commands.
