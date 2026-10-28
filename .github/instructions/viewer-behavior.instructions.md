---
description: "Use when editing the furnished Three.js viewer, camera presets, floor switching, lighting modes, tours, interaction controls, accessibility or render performance."
applyTo: "floor-plan-3d.js,floor-plan-3d.html,floor-plan-3d.css"
---

# Model-first viewer behavior

- Follow [project guidance](../copilot-instructions.md) and
  [browser verification](../skills/home-model-verification/SKILL.md).
  Keep the viewer minimal and model-first; reuse existing navigation, optional
  notes and status elements. No unrequested banners, slogans, badges, duplicate
  menus, explanatory panels or automatically opened notes.
- Trace existing control/state helpers before adding handlers. Keep pointer,
  keyboard, accessible labels and pressed/expanded state consistent. Use
  screen-reader-only feedback for nonessential interaction status; keep errors
  and actionable safety limits explicit.
- Preserve saved layout loading and floor associations. Failed requests must
  identify the affected resource; do not mask errors with an empty layout.
- Preserve requested starting door poses. Check complete motion separately;
  the dining patio door starts closed and closes on camera changes, while a
  same-view resize preserves its chosen pose. Do not generalize its special
  restoration rule to every cabinet or door.
- Test ground/upstairs/exterior, 2D and relevant inspection views. Restore
  foreground objects, pendants, ceiling hardware and lights after temporary
  hiding; do not fix occlusion by deleting required geometry.
- Preserve Day/Night choice across views, tours and Reset. Reload starts in
  Night. Treat visible glow and actual light sources as separate checks.
- Keep rendering event-driven, coalesce orbit updates, avoid unnecessary buffer
  reallocations, and restore full stationary quality after interaction.
  Do not add an unconditional animation loop to fix a missed render.
- Inspect constituent world-space geometry for clearance claims; metadata and
  camera framing alone are insufficient. Never leave production debug globals
  or temporary scene instrumentation in the viewer.
