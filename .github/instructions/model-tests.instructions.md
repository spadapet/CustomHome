---
description: "Use when adding or changing CustomHome Node regression tests, geometry assertions, VM harnesses or the model validation runner."
applyTo: "tests/**/*.cjs,tests/**/*.js,.github/skills/home-model-editing/scripts/check-model.cjs"
---

# Regression evidence

- Use built-in `node:test` and `node:assert/strict`; this repository requires
  Node.js 20 or newer and no package installation for its regression suites.
- Follow neighboring tests. Suites are `tests/<name>.test.cjs`; helper-only
  files such as `window-flush-geometry.js` are not standalone runner suites.
- Run the smallest combined set through the
  [existing runner](../skills/home-model-editing/scripts/check-model.cjs):

  ```powershell
  node .\.github\skills\home-model-editing\scripts\check-model.cjs patio-door dining-layout
  ```

  No selectors runs all suites. Unknown selectors, child-process errors,
  syntax errors and missing/failing TAP summaries must remain failures.
- Prefer exported shared layout helpers for geometry assertions. Existing
  `node:vm` harnesses can execute bounded viewer logic without installing
  Three.js. Assert extraction boundaries before executing source slices.
- Verify actual requested dimensions, placement tuples, counts and transitions.
  Use explicit tolerances with units for floating-point geometry. Test the
  failure path and floor/view/visibility restoration when changing behavior.
- String checks are appropriate for metadata, documentation and UI contracts,
  but are not substitutes for geometry or interaction tests. A `userData`
  safety label does not prove clearance, mounting support or code approval.
- Do not rewrite expected values merely to pass a failure. Compare against
  the newest owner decision and investigate source or fixture drift.
- Filesystem/server tests must use isolated temporary roots/ephemeral ports
  and clean up their own resources, never mutate saved owner layouts.
- Customization changes use `agent-customization`. Keep its discovery/link
  checks in step with new skills, agents and scoped instructions.
