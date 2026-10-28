---
name: home-model-verification
description: 'Use when visually verifying the CustomHome viewer, measuring Three.js clearances, debugging hidden geometry, inspecting door sweeps, checking Day/Night lighting or testing camera and floor restoration.'
---

# Verify the actual model

Use this workflow for browser evidence alongside the Node tests, not as a
replacement for [model editing](../home-model-editing/SKILL.md). For an audit,
inspect and report without changing the design unless fixes were requested.

## Establish the check

1. Read the affected room page, current [plan reference](../../../floor-plan-reference.md)
   and [design context](../../../design-context.md). Identify the exact expected
   dimension, pose, count, interaction or appearance before testing.
2. Select relevant suites from `tests` and run them together:

   ```powershell
   node .\.github\skills\home-model-editing\scripts\check-model.cjs patio-door dining-layout
   ```

   Use actual suite basenames without `.test.cjs`. For customization-only
   changes, use `agent-customization`; no model preview is needed.
3. Use Node.js 20 or newer. No package installation is required. Follow the
   [preview instructions](../../../README.md#preview). Reuse a responsive
   preview if it serves this checkout; otherwise start:

   ```powershell
   node .\preview-server.cjs
   ```

   Confirm HTTP responsiveness at `http://127.0.0.1:4173/floor-plan-3d.html`.
   If the port is occupied by another checkout, do not stop its process.
   The viewer needs network access to load Three.js from jsDelivr.

## Inspect production behavior

- Open the actual HTTP-served viewer, not a local `file:` URL. Wait for model
  and saved-layout loading; check runtime errors and failed requests.
- Use the affected room camera plus a whole-floor/2D view. Inspect exterior
  changes on every affected elevation. Check a narrow viewport when changing
  framing or controls; enable the grid explicitly when testing it.
- If an object appears missing, inspect visibility, ancestor transforms,
  camera occlusion and finished floor elevation before adding geometry.
- Exercise the changed control with pointer and keyboard where supported.
  Confirm accessible names, pressed/expanded state and existing status output.
  Do not add a visible feedback panel merely to make validation easier.
- For lighting/material changes, compare Day and Night, then change floor,
  camera and Reset view. Check restoration of lights, backgrounds, pendants,
  ceiling hardware and inspection visibility. Do not mistake emissive material
  for actual illumination.
- Preserve event-driven rendering. For performance work, check coalesced frames,
  interaction quality and restoration to full stationary sharpness; do not
  claim an FPS improvement without measurements.

## Measure geometry, not labels

1. Update scene world matrices before measurement. Measure constituent meshes
   in world space; whole-group bounds include empty interiors and can suggest
   false collisions. For rotated pieces, project actual bounds onto the
   relevant wall normal/tangent rather than comparing local coordinates.
2. Record units and finished-face references. Convert feet to inches explicitly.
   Include trim, pulls, counters, chair occupancy and appliance projections.
   Distinguish intended contact from positive-volume interference.
3. Sample door/drawer motion through its range, not only endpoints. Include
   tucked and pulled-out furniture when relevant. Restore the owner's default
   pose afterward; the dining patio door starts closed at zero degrees.
4. Assert the requested threshold and required object count. A non-overlapping
   static scene does not verify retrieval, occupied access, egress or safety.
   Existing browser helpers such as
   [window geometry checks](../../../tests/window-flush-geometry.js) may be
   useful, but inspect their assumptions against the current design first.

If scene access needs temporary browser-route instrumentation, keep it outside
production source. Remove it and reload the unmodified served script afterward.
Confirm a single render canvas and no runtime errors; never commit debug globals.

## Report evidence

Report expected versus measured results, tested views/states, suite counts and
remaining approval limits. Explicitly identify browser, network or scene-access
limitations; Node tests or a canvas screenshot alone are not visual verification.
Clean up only processes/instrumentation created for this task, using a specific
process ID when stopping a server. Do not publish without authorization.
