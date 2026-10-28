---
name: home-product-research
description: 'Use when researching home products, manufacturer dimensions, appliance installation, window combinations, lighting listings, exterior materials, asset licenses or Birmingham zoning and operating-clearance requirements.'
---

# Ground product decisions in evidence

Research only the affected decision. A research or feasibility question is not
permission to move openings, substitute products or rebuild the model.

## Define the current requirement

Read the affected room page, [plan reference](../../../floor-plan-reference.md)
and [design context](../../../design-context.md). Identify the newest explicit
owner requirement and any superseded alternatives. Preserve standard cabinet
boxes, owner reach and fixed openings while evaluating candidates.

Separate four categories throughout the work:

- Manufacturer or authority facts, with source and retrieval date.
- Measured model dimensions, with finished-face references and units.
- Assumptions or provisional visual envelopes.
- Unresolved product, installer, architect or authority approvals.

## Find authoritative sources

1. Prefer the selected manufacturer's current installation/technical guide
   over a retailer listing, search excerpt or inspiration photo. Record the
   exact model, document revision/page if available, units and URL.
2. Check both nominal and actual dimensions, rough openings, service space,
   ventilation, door/handle projections, mounting support and usable access.
   Conflicting guides or missing dimensions stay unresolved; do not average
   values or invent a compatible SKU.
3. For jurisdictional claims, confirm the applicable municipality, rule and
   effective date using official sources. Consult the existing
   [Birmingham zoning study](../../../birmingham-zoning.html) and
   [lot notes](../../../the-lot.html), but do not treat them as current legal
   approval. Storage placement does not establish a safe operating location.
4. Do not send private owner photos, plans, code or credentials to external
   services. Use generic product identifiers and public requirements for search.
   If current sources cannot be reached, state the gap rather than presenting
   memory as a verified current fact.

## Apply the right review boundary

| Subject | Verify before claiming compatibility |
|---|---|
| Windows | Actual frame/rough opening, operation, factory joining, size limits, grilles, inside/outside finish and egress data; Andersen 100 Series is Fibrex |
| Appliances | Selected-model cutout, ventilation/service access, handle and door sweep, owner-reachable mounting and adjacent landing space |
| Lighting | Location listing, CCT, cutout/depth, insulation/ventilation restrictions, driver access and mounting; rendering does not prove illuminance |
| Masonry/roofing | Product versus texture intent, support, flashing/drainage and samples; wall veneer is not approved walking finish |
| Outdoor storage/firepit | Separate cold storage from operation; verify manufacturer and local clearance rules, never infer permission from a model gap |
| Assets | Source, actual license, attribution, local dependencies and scale; inspiration images are not automatically licensed textures |

For downloaded model changes, preserve the
[asset source and license records](../../../assets/models/README.md) and
manifest. Run the existing validator rather than inventing a second inventory:

```powershell
node .\scripts\check-home-assets.cjs
```

Exterior texture provenance belongs in the
[texture source notes](../../../assets/textures/exterior/README.md). The model
validator above checks the model manifest, not every exterior texture license.

## Deliver or implement

For research-only work, return a concise comparison with sources, access dates,
fit limitations and a recommendation; do not edit the design.
If implementation was requested, follow
[model editing](../home-model-editing/SKILL.md) and
[verification](../home-model-verification/SKILL.md), coordinate all affected
floors/elevations, and update the affected room notes plus both design references.
Keep active summaries consistent; label retained alternatives as historical.
Never describe a concept, seller claim or measured gap as construction approval.
