# CustomHome project guidance

This is a home-design study, not construction drawings. Read the current
[plan reference](../floor-plan-reference.md) and [design context](../design-context.md)
before changing a layout. Room pages describe the owner's requirements.

- Keep the viewer minimal and model-first. Add only UI needed for the owner's
  request; do not add unrequested banners, slogans, badges, explanatory panels,
  duplicate menus or links. Do not restore the removed top slogan, concept
  badge or visible garage-door explanation banner.
- Maximize model space and minimize visible text. Prefer one-word UI labels;
  keep Windows, Area and Size compact and visible. Put explanations in
  optional notes/tooltips, not persistent panels; retain actionable warnings.
- Reuse existing navigation and optional design notes for help and assumptions,
  without opening them automatically. Keep essential errors and genuinely
  actionable safety warnings explicit; use screen-reader-only announcements
  for interaction feedback that does not need a visible status area.
- The model uses feet. Shared ground-floor geometry lives in
  `floor-plan-ground.js`; the furnished model is `floor-plan-3d.js`.
  Coordinate both when changing room boundaries or openings.
- Preserve saved layout JSON when changing viewer tools. Both interactive
  floor designers were removed; camera views, tours and the floor grid remain.
- Keep cabinetry, fixtures, trim, floor elevations, visibility and inspection
  views consistent. A feature hidden by a camera or floor finish is not
  necessarily missing geometry.
- Always use standard cabinet sizes commonly available from most vendors.
  Fit fixed runs with separate fillers/scribes, not odd-width cabinet boxes.
  Appliance cutouts and mounting heights still require selected-product review.
  Keep the combi/steam oven and microwave low enough for the owner to reach;
  do not raise them without approval. Show the prep dishwasher with an exposed
  appliance front, not a cabinet panel concealing it.
- Preserve the owner's default door poses after temporary swing checks.
  Keep the dining patio door closed by default; verify its sweep separately.
- All doors are 8 feet tall (96 inches) throughout the home. This owner
  requirement supersedes older 7-foot/84-inch door notes or model defaults.
  Keep wall openings, door leaves, frames, casing, schedules and room notes
  coordinated to the 8-foot door height when creating or updating doors.
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

For coordinated architecture, elevation and interior design work, select the
[House Design agent](agents/house-design.agent.md). It turns broad owner goals
into complete design studies while preserving the recorded constraints.

## Focused workflows

- Use [space planning](skills/home-space-planning/SKILL.md), adopted from
  Roomsmith, for floor plans, room furnishing and awkward placements: measured
  inventory, dimensioned layouts, occupied routes and source-level critique.
- Use [model verification](skills/home-model-verification/SKILL.md) for browser
  inspection, geometry measurements and floor/view/lighting restoration.
- Use [product research](skills/home-product-research/SKILL.md) for authoritative
  manufacturer dimensions, installation requirements, local rules and licenses.
- Select [Home Design Review](agents/home-design-review.agent.md) for a bounded,
  read-only consistency audit, or
  [Home Product Research](agents/home-product-research.agent.md) for sourced
  research without design edits. Do not delegate a simple lookup merely because
  an agent exists.
- File-scoped guidance covers [geometry](instructions/model-geometry.instructions.md),
  [viewer behavior](instructions/viewer-behavior.instructions.md),
  [tests](instructions/model-tests.instructions.md) and
  [design notes](instructions/design-documentation.instructions.md).
  Keep detailed procedures there rather than expanding always-on guidance.

Use Node.js 20 or newer and the existing dependency-free validation runner.
For customization-only changes, run the `agent-customization` suite and
`git diff --check`; a model preview is unnecessary unless viewer/model behavior
also changed. Commit or push only when requested.
