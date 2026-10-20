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

- [Current plan, dimensions and constraints](floor-plan-reference.md)
- [Design context and owner decisions](design-context.md)
- [Room and requirements pages](index.html)
- [Project instructions](.github/copilot-instructions.md)
- [Model-editing skill](.github/skills/home-model-editing/SKILL.md)
- [Publishing skill](.github/skills/home-model-publishing/SKILL.md)

Update affected room pages and the two design references with model changes.
Publish only when requested, preserving unrelated local files and the remote
branch's existing work.
