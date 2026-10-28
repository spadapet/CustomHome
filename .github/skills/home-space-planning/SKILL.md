---
name: home-space-planning
description: "Use when designing floor plans, furnishing rooms, comparing furniture layouts, fixing awkward placements or reviewing circulation in CustomHome. Adapted from Roomsmith: measured room inventory, spatial thesis, dimensioned furniture, scale arithmetic and source-level critique before acceptance."
---

# Space planning and room furnishing

Adopted from Roomsmith's interior-design workflow and design-author,
design-strategist and design-critic instructions under the [MIT license](./LICENSE).
Use this workflow for design reasoning, then the existing
[model-editing skill](../home-model-editing/SKILL.md) for implementation.
Instructions alone do not repair existing placements or prove a layout works.

## 1. Establish the room, not a camera impression

Read the [current plan](../../../floor-plan-reference.md),
[design context](../../../design-context.md) and affected room page. Inspect
the current model before proposing a layout.

- Inventory room bounds and finished floor height; every door, window, fixed
  service, stair, low ceiling and built-in; and the routes into adjacent rooms.
  Count the openings before trusting a render.
- Separate owner requirements, measured model dimensions, selected-product
  dimensions, assumptions and unknowns. A model measurement is not a site
  measurement. Do not infer scale or usable headroom from a perspective image.
- Record what must stay: furniture, seating count, storage capacity, activities,
  fixed openings, appliance reach and default door poses. Retained items stay;
  "relocate it elsewhere" is not a solution without an authorized destination.
- Map the household's activities, entry paths, destination points and focal
  points. Identify why the current arrangement is awkward: a blocked route,
  wrong orientation, poor grouping, unusable storage or an out-of-scale item.
  Distinguish an actual placement defect from hidden geometry or camera distortion.

Keep the working inventory and calculations in the response or session
workspace. Do not add a competing layout database or unsolicited report files.

## 2. Choose a spatial thesis

A direction is a spatial thesis, not a colourway. State the single move that
changes how the room works; the furniture and finishes must support it.

- For a placement repair, choose the simplest complete correction within the
  owner's constraints. Do not turn a local fix into an unsolicited remodel.
- When alternatives are requested or a consequential trade-off needs comparison,
  compare genuinely different arrangements, not the same plan with new colors.
  Roomsmith compares seven axes: plan/zoning, ceiling, floor, seating typology,
  storage, lighting architecture and programme (room use).
- For broad design studies, use its four-or-more-axis difference rule where
  those axes are in scope. For furniture-only studies, keep the shell, finishes
  and room purpose fixed and compare zoning, orientation, seating and storage;
  explicitly identify the narrower scope rather than inventing demolition.
- Recommend a direction and explain its gains, sacrifices and budget uncertainty.
  Do not invent prices. Do not change the room's purpose, fixed openings or
  required contents merely to make alternatives different.
- Resolve ordinary reversible details from the brief. Seek owner approval for
  changes to fixed constraints, major scope or spending; do not copy Roomsmith's
  approval gate for every routine design step.

## 3. Specify real furniture and prove the fit

For each major physical change, record:

| Field | Required evidence |
|---|---|
| Item/change | Material or finish intent, width, depth, height, position and orientation |
| Reason | Why this placement supports this household and the spatial thesis |
| Validation | Measured fit, occupied use, access, relevant constraints and unresolved limits |

Use the model's feet and existing coordinate conventions. State each placement
relative to actual room bounds, not a convenient camera framing. Preserve
standard cabinet sizes with separate fillers and all recorded owner constraints.

Draw or calculate dimensioned footprints before adding decorative geometry:

- Include real projections: trim, handles, chair backs, vehicle mirrors and
  appliance/door fronts. Separate the storage footprint from the space needed
  to use or retrieve its contents.
- Show chairs both tucked and occupied/pulled out, appliance and drawer access,
  door sweeps, bed access, work positions and routes to required destinations.
  Check vertical use as well as plan overlap: reach, low slopes and overhead
  obstructions can invalidate an otherwise empty rectangle.
- Include a scale check with arithmetic across the tightest room section:
  available finished width minus the actual item projections equals remaining
  clear width. State the numbers, units, target and source of that target.
  Measure the tightest point along the continuous route, not only one section.
- A non-overlapping static layout is not an operating approval. If the required
  target or product envelope is unknown, mark it unresolved; do not substitute
  an invented universal clearance or present a code claim.
- Use [product research](../home-product-research/SKILL.md) for exact furniture
  and appliance dimensions. Label generic footprints as proxies; they are not
  verified purchasable items.

If it does not fit, change the design. Do not shrink furniture, omit required
items, move a fixed opening or hide a conflict to make the image look successful.

## 4. Critique one implemented direction before repeating it

Use the [verification workflow](../home-model-verification/SKILL.md) to inspect
world-space geometry and the actual rendered room. Review relevant top,
eye-level and reverse views; inspect all views used to support acceptance.
The same agent can perform this checklist; a team of agents is not required.

Check in this order:

1. **Openings and shell:** exactly the recorded openings and solid walls,
   coordinated with adjacent rooms and elevations.
2. **Scale:** real room dimensions, correctly sized furniture and no camera
   illusion standing in for usable space.
3. **Required contents:** every retained item, seat, activity and storage
   requirement accounted for. An item need not appear in an occluded view,
   but its location and usability must be demonstrated.
4. **Operation:** continuous routes, occupied seating, access and full motion
   checks rather than static separation alone. Restore default door poses.
5. **Composition:** purposeful groupings, appropriate focal orientation,
   comfortable use and the owner's style, not unrelated objects scattered
   around the perimeter. Do not add unwanted rugs, plants or clutter to
   satisfy a generic styling checklist.
6. **Agreement:** top view, interior views, source geometry and current notes
   describe the same room. Check floor/view and lighting restoration as relevant.

For each defect, name what is wrong, the evidence and where its root cause
lives: shared room geometry, a placement tuple, furniture dimensions, camera,
visibility or current documentation. Fix at the source, not by retouching an
image or changing a test expectation without design evidence.

Validate one arrangement before applying the same pattern to other rooms.
Run relevant existing regression suites and add focused geometry coverage for
changed placement requirements. Do not claim a browser or motion check ran
when it did not.

## 5. Acceptance

Report the chosen spatial thesis, changed placements, measured minimum
clearances, retained requirements and trade-offs. Use **verified**, **needs
revision**, or **unverified**, with the supporting evidence and missing checks.
Do not call a room fixed solely because a test passed or it looks plausible.
Update affected room notes and both design references when the model changes.
Do not claim construction, structural or code approval.

## Upstream and local adaptations

Source: [Roomsmith](https://github.com/Rumeasiyan/roomsmith/tree/0e1c042cab0301d270e77575aa2dfbb028a5dab1),
revision `0e1c042cab0301d270e77575aa2dfbb028a5dab1`, retrieved 2026-10-28.
Adapted from its
[workflow](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/.claude/skills/interior-design/SKILL.md),
[author](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/.claude/agents/design-author.md),
[strategist](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/.claude/agents/design-strategist.md)
and [critic](https://github.com/Rumeasiyan/roomsmith/blob/0e1c042cab0301d270e77575aa2dfbb028a5dab1/.claude/agents/design-critic.md).

Local adaptations retain CustomHome's Three.js model, tests, units, owner
constraints and minimal viewer. No upstream CLI, Python pipeline, model
override, automatic delegation, external image upload or paid renderer is
installed. Geometry remains authoritative; a concept image is not fit evidence.
