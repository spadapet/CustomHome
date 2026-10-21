# Ground-floor plan reference

## Viewing saved layouts

The [viewer](floor-plan-3d.html?view=upstairs) no longer includes either floor designer. Camera views, tours, visibility controls and the one-foot grid remain.

Serve over HTTP to read the existing [upstairs](upstairs-layout.json) and [ground-floor](ground-layout.json) saved layout data; removing the designers does not erase it. Empty overrides retain the furnished baseline. Saved ground edits still display structure only, with a warning; saved upstairs edits retain coordination warnings. The page no longer edits or automatically saves layouts. [Viewing guide](upstairs.html#model-study). Written schedules remain baseline context and require reconciliation after geometry changes.

Every bathroom and powder room on every floor requires built-in warm, dim night lighting independent of the main lights. A switch-integrated night light is one option; product and controls remain undecided. See [electrical requirements](electrical.html#bathroom-night-lighting).

No firepit or firewood remains in front. The closed firepit at rear (40, -15), on a 4 ft-square pad, is fully cold storage only; the checked rear arrangement does not meet Birmingham's 15 ft portable-unit operating separation. The requested 8 ft-long x 16 in-deep covered wood rack is beside the garage wall north of the waste bins, center (56.65, 22), cover z = 17.9-26.1. It leaves about 33 in of existing paving / 40 in to the fence locally, not a new narrower pinch than the carts. Close house separation needs fire/pest/moisture and local review; neither storage approval nor permission to light is implied. See [storage limits](patio.html#portable-firepit).

The freezer remains closed in the model. Its open/closed status button and swing interaction have been removed; verify actual appliance operation separately.

Current model audit: October 19, 2026. This is the consolidated reference for the [interactive floor plan](floor-plan-3d.html), checked against [model geometry](floor-plan-3d.js). Update it, [design context](design-context.md), and affected room requirements whenever the design changes.

## Scope and measurement rules

- The model follows the separately supplied [dimensioned stepped-footprint plan](assets/ground-floor-3d-source.png), not the [October 4 drawings](floor-plan-design.html#latest-plans). Those images and older preview renders are not updated when the model changes.
- Dimensions are design-study measurements, not surveyed dimensions, certified clearances, rough openings, manufacturer CAD, or construction instructions. Product references do not mean a purchase or installation is approved.
- Coordinates below are feet: **x increases right/east, z increases down/toward the front porch, y increases upward**. The compass points north toward decreasing z. `(x, z)` locates a plan center unless an extent is stated.
- Room sizes follow the model's nominal floor envelopes, mostly to wall centerlines; subtract wall/finish thickness where relevant. Most walls are modeled 0.35 ft (4.2 in) thick. Window meshes are sometimes inset 0.1 ft from the opening plane.
- Feet/inches are rounded to the nearest inch in the room schedule. Decimal coordinates retain the geometry needed to reproduce placement. Do not treat rounded room dimensions as cabinet fabrication dimensions.
- Ground-floor datum is y = 0; walls/ceiling are 9 ft high. The provisional 12 in floor assembly makes the upstairs/basement floor-to-floor difference 10 ft. Garage slab is y = -1.25 ft, or 15 in below the house.
- The modeled building's maximum plan extents are x = 0-55.5, z = -2.1-61.2: approximately 55 ft 6 in by 63 ft 4 in. This is a stepped bounding box, **not** a rectangular footprint or an approved gross/conditioned floor-area calculation.
- The viewer contains a furnished ground floor, adapted upstairs study, stairs up/down, below-grade stair enclosure, and a separate conceptual English-country exterior shell. It does not contain basement rooms, engineered framing/roof geometry, or a coordinated MEP design.

## House square footage - October 18, 2026

**The source-plan figures give approximately 3,637 sq ft; the adapted 3D model's nominal envelopes give approximately 3,974 sq ft. These are different, unreconciled area bases, not interchangeable house-size measurements.** Both exclude garage and outdoor spaces; neither includes the basement.

| Included floor | Source-plan figures | Default 3D model envelopes |
|---|---:|---:|
| Ground floor, excluding garage and outdoor spaces | 1,828.90 sq ft | 1,926.91 sq ft |
| Upstairs | 1,808.50 sq ft label | 2,047.13 sq ft, no above-garage room |
| **Both floors** | **3,637.40 sq ft, provisional** | **3,974.04 sq ft** |

The [ground-floor source drawing](assets/ground-floor-3d-source.png) prints total surface area 2,716.5 sq ft, garage 671.1 sq ft, and porch 216.5 sq ft: `2,716.5 - 671.1 - 216.5 = 1,828.9 sq ft` indoors. Its room schedule contains no separate covered-patio entry; do not subtract the later outdoor patio from this indoor subtotal. The individual printed room figures sum to 2,716.2 rather than 2,716.5 sq ft, a 0.3 sq ft schedule discrepancy.

Adding the [upstairs source image's](assets/upstairs-dimensioned-reference.png) 1,808.5 sq ft label gives `1,828.9 + 1,808.5 = 3,637.4 sq ft`, consistent with an estimate of about 3,600. The upstairs label's measurement rules and treatment of the depicted above-garage area are unverified, so this is not a certified current-design total. The model exceeds these source figures by 98.01 sq ft downstairs and 238.63 sq ft upstairs. Adaptations and measurement bases differ; the known 29 sq ft kitchen/prep extension does not explain the full discrepancy. Do not attribute the entire difference to wall thickness or revise geometry merely to match a label.

Basis: the current default [ground-floor geometry](floor-plan-3d.js) and [upstairs geometry](floor-plan-upstairs.js), not the older drawing labels or browser-saved upstairs layout edits. Count each story's nominal enclosed plan envelope, including interior partitions, circulation, and stair/landing footprints on each level. Do not subtract the stairwell as though it were outdoor space. These mostly wall-centerline measurements are a conceptual planning estimate, not certified exterior-face gross area, net usable area, appraised living area, or a zoning calculation.

The first-floor model takeoff consists of these non-overlapping rectangles. Coordinates and dimensions are feet:

| Indoor region | x limits | z limits | Width x depth | Area (sq ft) |
|---|---|---|---|---:|
| Rear dining projection | 13.2-26.5 | -2.1-8 | 13.3 x 10.1 | 134.33 |
| Kitchen/prep outward extension | 26.5-55.5 | 7-8 | 29 x 1 | 29.00 |
| Rear indoor band across living/hall/kitchen/prep | 0-55.5 | 8-15 | 55.5 x 7 | 388.50 |
| Living/hall/kitchen/mudroom band, west of garage | 0-45.4 | 15-26.9 | 45.4 x 11.9 | 540.26 |
| Kids/hall/stair band, west of garage | 0-29 | 26.9-34.6 | 29 x 7.7 | 223.30 |
| Front rooms/hall, ending before porch | 0-31.2 | 34.6-54.2 | 31.2 x 19.6 | 611.52 |
| **Ground-floor model total** | | | | **1,926.91** |

Upstairs model: `(15.5 x 5.5) + (25.7 x 2.4) + (54 x 5.4) + (52 x 20.8) + (31 x 17) = 2,047.13 sq ft`.

Cross-check: the union of each model's floor rectangles plus its stairwell/arrival footprint matches the corresponding perimeter takeoff, without double-counting overlapping room envelopes. Garage (674.16 sq ft), front porch (218.40 sq ft), rear patio/terrace, steps, paths, driveway, and roof overhangs are outside the included totals; do not subtract them again. Basement area is not included because basement rooms and a complete basement perimeter are not modeled. Recalculate if either floor's perimeter changes.

## Exterior elevation study

Garage door finish update: two warm cream doors (#E6D7B9) replace the previous near-white ivory appearance. Each has a contrasting warm-taupe surround (#A18D70): 6 in side boards, 8 in header, 3 in main depth, and projecting cap, all outside the nominal 9 x 8 ft opening. Cream panel detail, four glazing panes, and two dark handles per door remain. Garage massing, lanterns, and driveway stay unchanged. Screen colors and profiles require physical sample and installation review; see [garage notes](garage.html#working-layout).

Select Exterior in the [3D viewer](floor-plan-3d.html?view=exterior). Front, Rear, West side, and East side use orthographic projections; 3D exterior restores perspective orbit. Indoor touring and appliance controls are unavailable in exterior mode; ground-floor and upstairs views retain their furnished geometry.

The cream limestone shell follows the stepped house/garage envelopes, with medium-brown shingle roofs and black exterior window trim; interior trim stays white. Remove the separate full-height entry arch and its extra posts. One inner pair at x = 11.9 / 19.3, z = 60.5 supports a straight header beneath the small gable; two outer porch columns remain. Entry shafts are 7.8 in square, 8 ft high, with one 11.4 in-wide stone foot each; clear shaft gap 6 ft 9 in. Header is 8.2 ft wide, 6 in high, underside 8 ft. Lanterns follow the inner pair at (11.9 / 19.3, 5.8, 60.95). Doors, steps, mulch, and plants stay fixed. All support dimensions require structural coordination. Upper-floor datum remains 10 ft, eaves 19 ft, tallest nominal ridge 29 ft; garage has no upper room and retains 9 ft eaves / 15 ft ridge. Roof projections remain conceptual.

Lot plan shows the unchanged 75 x 130 ft property with the house shifted 3.855 ft east from its former centered placement. In house-local coordinates, lot center x = 23.895, x boundaries -13.605 / 61.395, and z boundaries -32.325 / 97.675. The east wall face x = 55.725 is 5 ft from the inside fence rail at x = 60.725 (fence center x = 60.895). Property-line clearances are 5.67 ft east and 13.38 ft west; this is not a 5 ft zoning setback. The rear wall face at z = -2.325 remains exactly 30 ft from the boundary; front porch-edge clearance remains approximately 36.48 ft. Original house roof overhang clearance remains approximately 29.58 ft. The constrained patio cover/terrace/inset steps stop at z = -2.1, approximately 30.23 ft from the rear boundary. Only the driveway continues to the front boundary; retain the porch-side paver connection, not a straight front-lawn walk. See [lot assumptions](the-lot.html#modeled-placement); survey, grade and zoning approval remain unresolved.

Roof intersections/supports, site grades, porch details, and facade window styling are provisional. The above-garage room and upper window are removed, not merely hidden or reserved as unfinished space. This appearance study does not approve building height, setbacks, drainage, structure, or egress. See [elevation notes](elevations.html#modeled-exterior).

## Exterior patio, hardscape, and camera study

Covered patio and Cameras + lighting are additional exterior views; neither changes the furnished floors. See the [patio requirements](patio.html#covered-patio-study), [hardscape plan](landscaping.html#modeled-hardscape), and [camera/lighting schedule](electrical.html#outdoor-camera-lighting-plan).

| Element | Modeled placement |
|---|---|
| Front shrub beds | Brown mulch/soil: z = 61.2-64.5, west x = 0-10.7, east x = 20.5-30.9; top y = -1.6. Six shrub envelopes per bed, radius 0.9 ft, centered z = 62.85/y = -0.7, bases on mulch and foliage fully inside its footprint. Steps, pavers, driveway, and rear planting unchanged |
| Covered patio | Outdoor limits x = 26.5-55.5, z = -2.1-7: 29 x 9.1 ft. One lower roof replaces the overlapping canopy/prep lean-to: x = 26.5-55.5, z = -2.1-10, center y = 9.5 ft, slope 3/16. Only the house-side roof continues past z = 7 over the prep extension; six posts, terrace, furniture, and inset steps stay inside the outdoor limits |
| Terrace and furniture | Paving bounds x = 26.75-55.5, z = -2.1-6.75, top y = 0; notch around stair pocket. Rotate 5 x 3 ft table, center (37.5, 3.45), four chairs; occupied circulation unverified |
| Dining access | Existing door/casements unchanged; exterior cover does not implement a storm-window conversion |
| Patio finish | Terrace and exposed slab edges match the house's taupe-brown base-stone color/texture; darker steps/nosings and surrounding garden paver finishes remain unchanged |
| Patio setbacks | Roof, terrace, and steps stop at z = -2.1, approximately 30.23 ft from rear boundary. House wall face remains 30 ft away; uncovered garden walk lies outside the patio |
| Fence | 6 ft cedar, inset 0.5 ft at rear/sides; nominal 4 ft west/east gates at z = 45 / 41. Move east return 2 ft backyardward from z = 43, leaving 3 ft to the side-door opening at z = 44-47. Connector, C6 aim, and east downlight target follow. West return/window spacing and boundary fences stay fixed; front yard/driveway remain open |
| Paver route | 3.5 ft-wide fence-edge route. West x = -12.355 to -8.855; east x = 56.645-60.145; rear z = -31.075 to -27.575. Outer paving 0.75 ft from fence centerlines. Lawn toward house except access connectors. Gate/front connections remain; front paving stops at driveway x = 30.9 / 55.9 |
| Steps and contrast | Front/patio each three 5.4 in rises and 13.2 in goings. Patio steps move 24 in left viewed from the garden toward the house: center x = 51, widest x = 47.6-54.4, z = -2.1-1.2. Resize the terrace pocket and spur to match; patio limits, roof, posts, and front steps stay fixed. Dark nosings/markers and exterior stone base remain |
| Entry approach | Remove the 5 ft-wide straight walk at x = 13.1-18.1, z = 68 to the front boundary. Leave lawn there; reach the porch from the garage/driveway via the retained porch-side pavers. The drive stays continuous with no separate crossing apron |
| Garage-side approach | 3.5 ft-wide strip x = 56.5-60 continues through the east gate to z = 52.5. Threshold connection x = 55.725-56.5, z = 44-47; driveway turn x = 55.9-56.5, z = 49-52.5. No grass crossing between gate, side door, and driveway; no long east strip to z = 68 |
| City collection carts | One labeled blue recycling cart and one dark garbage cart, 28 in wide x 32 in deep x 44 in high placeholder envelopes; centers x = 56.975, z = 29 / 32.5. Storage pad x = 55.725-58.225, z = 27.4-34.1, top y = -1.35. Keep 5 ft wall-to-fence gap; carts leave approximately 31 in to fence, including about 24 in of paved passage, not a clear 3.5 ft route. Roll to curb for pickup; confirm city cart specifications, pickup location/spacing, and maneuvering |
| Cameras | Six candidate devices with own-property aim arrows; detailed C1-C6 placements and privacy/wiring notes in the electrical schedule |
| Lighting | Remove all eleven path-post/bollard fixtures and their gold plan markers. Retain existing lanterns, two patio lights, three access downlights, and six step markers; warm shielded 2700 K design intent |
| Fence walk / connectors / fixtures | Rear walk center z = -29.325, north edge -31.075. Short 3.5 ft-wide east-west spur follows the shifted step center: x = 49.25-56.645, z = -5.6 to -2.1. Former north-south strip is lawn. West path stays straight at x = -12.355 to -8.855 through the fence to z = 68; 4 ft gate centered x = -10.605, with C5/west access-light aim following it. Front crosswalk starts x = -12.355 at z = 64.5. East gate connector unchanged. No path-post lights. Patio lights/camera positions unchanged |

Walk paving top is y = -1.35, level with the lowered driveway surface. The 25 ft-wide driveway at x = 30.9-55.9 is continuous from z = 49 to the front boundary and also serves as the pedestrian connection; the former z = 64.5-68 crossing apron is removed, not replaced with lawn or a gap. This driveway edit leaves the remaining perimeter pavers, porch and patio unchanged. Fence/cover setbacks, foundation drainage, paving base, actual grade, window sweep, roof structure, accessible routes, camera lenses/obstructions, and lighting photometry remain unverified. Plan arrows are not guaranteed security coverage.

## Room and adjacency schedule

Dimensions include nominal room envelopes, not guaranteed usable clear rectangles.

| Space | Model extents x / z (ft) | Approximate width x depth | Layout context |
|---|---|---|---|
| Living | 0-13.2 / 8-25.7 | 13 ft 2 in x 17 ft 8 in | Fireplace on west wall; open to dining/kitchen and stair side; former partition removed, with guard at the north stairwell edge |
| Dining | 13.2-26.5 / -2.1-8 | 13 ft 4 in x 10 ft 1 in | Rear and west windows; east patio assembly; seasonal tree in northwest corner |
| Main kitchen | 26.5-38 / 7-26.9 | 11 ft 6 in x 19 ft 11 in | North sink wall, east cooktop/passages, south refrigeration; island shifts into open living-side space |
| Hall / circulation zone | Nominal 13.3 x 17.7 ft schedule | 13 ft 4 in x 17 ft 8 in | Irregular connected route around stairs/private rooms, not a separate unobstructed rectangle |
| Prep kitchen | 38-55.5 / 7-15 | 17 ft 6 in x 8 ft | North counter/tower, south pantry shelves; entry from main kitchen, not directly from mudroom |
| Mudroom | 38-45.4 / 15-26.9 | 7 ft 5 in x 11 ft 11 in | Connected matcha built-ins; five cubbies, enclosed coat closet, five personal shelf positions with removable containers, 21-pair shoe shelves; fixed kitchen opening, shifted 8 ft garage entry |
| Garage | 45.4-55.5 / 15-26.9 plus 29-55.5 / 26.9-34.6 plus 31.2-55.5 / 34.6-49 | 26 ft 6 in x 34 ft maximum | Stepped footprint; narrow forward bike alcove, two parking bays, lower slab |
| Kids' room | 19-29 / 24.7367-34.6 | Approximately 10 ft x 9 ft 10 in | Former central stair area; three MICKE desks; 54 x 96 in doorless west hall entry; no exterior window or direct living-room opening |
| Powder room | 0-7.1 / 35.1-41 | 7 ft 1 in x 5 ft 11 in | Hall-facing east-wall door via guest alcove; toilet retained, vanity on south wall; tile extends 1 ft south |
| Guest coat closet | 7.1-12.2 / 35.1-37.5 | 5 ft 1 in x 2 ft 5 in | Separate reach-in closet; 24.6 in clear depth, upper shelf/hanging rail, closed 48 in oak door pair facing alcove |
| Guest entry alcove | 7.1-12.2 / 37.5-41 | 5 ft 1 in x 3 ft 6 in | Open east to entry hall; 37.8 in between finished north/south wall faces, not occupied/accessibility approval |
| Office | 0-12.2 / 41-54.2 | 12 ft 2 in x 13 ft 2 in | 161.04 sq ft nominal; return prior 12.2 sq ft expansion to guest-entry band; north desk/chair move 1 ft south, other furniture and French doors retained |
| Walk-in closet | 17-25 / 34.6-42 | 8 ft x 7 ft 5 in | Borrows 2 ft from hall; doorless centered entry, left/right hanging, five rear shelves; 43.8 in middle aisle |
| Closet hall | 12.2-17 / 34.6-42 | 4 ft 10 in x 7 ft 5 in | North hall remains approximately 53.4 in between finished wall faces; southern hall keeps its original width |
| Guest shower bathroom | 25-31.2 / 34.6-42 | 6 ft 2 in x 7 ft 5 in | Northwest shower, northeast toilet, southwest 24 in vanity; 31.8 in toilet approach and outward-opening bedroom door |
| Ground-floor bedroom | 19-31.2 / 42-54.2 | 12 ft 2 in x 12 ft 2 in | Queen headboard on east wall, entry on west, porch-facing window |
| Front porch | 0-31.2 / 54.2-61.2 | 31 ft 2 in x 7 ft | Paving, two benches, centered double front entry; low perimeter edges |

The kitchen/prep exterior wall now lies at z = 7 rather than z = 8 across x = 26.5-55.5. The one-foot outward move adds about 29 sq ft to the conceptual footprint. Sink runs, five north windows, prep tower/appliances, floors, and wall returns move with it; island, cooktop, refrigeration, pantry shelves, end-wall prep window, and passages stay fixed. Setbacks, foundation, roof, elevations, and utilities are not resolved by this edit.

## Main kitchen

See [kitchen requirements](kitchen.html), [sink candidate and dispensers](kitchen.html#sink-and-dispensers), and [appliance package](appliances.html).

| Element | Current dimensions / placement | Context |
|---|---|---|
| North sink run | x = 26.7-37.8; center z = 8.2; counter z = 7.175-9.225 | Approximately 133.2 in across, 24 in base depth, 24.6 in counter depth; counter top about 36.6 in |
| Farmhouse sink | Nominal 36 in; center (32.25, 8.2) | White apron, small left / large right bowl, low divider and two drains; roughly 35/65 clear bowl widths |
| Sink candidate | Kohler Whitehaven K-6427-0 | Candidate, not selected CAD; exact 30/70 preferred if available; 50/50 excluded |
| Fixture deck | z = 7.175-7.495; fixtures at z = 7.36 | Main faucet x = 32.25, separate hot/cold filtered dispenser x = 31.2, soap pump x = 33.3 |
| Trash / dishwasher | Trash center x = 30; dishwasher x = 34.75, both z = 8.2 | Trash immediately left of sink, provisional 24 in dishwasher immediately right when facing the window |
| Dish rack | 16 x 14 in pan, center (34.6, 8.3), base y = 3.05 | Stainless-look wire rack, three plates and utensil cup; closed catch pan is emptied manually, no drain/spout |
| Cooktop run | Center (37, 16.95); z = 12.527083-21.372917 | 106.15 in long, 24 in body depth; two approximately 33.1 in side drawer fronts and 1.5 in casing-end fillers |
| Induction cooktop | 36 in wide along z, 21 in deep along x | Centered between the two passages; central drawer bank below |
| Hood | 48 in wide throughout; depth tapers from 24 to 13 in | Warm-white plaster, plain lower edge at y = 6.3-6.5, cornice aligned with cabinets at 9 ft; no walnut band |
| Hood-side uppers | Two approximately 27.6 in-wide x 12 in-deep stacks; bottoms at 54.6 in | Directly adjoin hood; two tiers of paired white-oak frameless Shaker doors, gold pulls, task lights, ceiling cornices; 1.5 in inset from base-run ends clears casing |
| Hood insert | Concealed provisional 46 in allowance | No selected insert/liner; hood task light stays; no bridge storage; manufacturer must verify adjacent cabinet and insert clearances |
| Quartz walls | North sink wall, east cooking/passages wall, south refrigeration wall | Floor-to-ceiling ivory quartz on kitchen-facing surfaces only; cutouts retained; modeled as face materials without added slab thickness |
| Sink-wall storage | No upper stacks | Three windows replace the upper cabinets; no former under-cabinet task lights there |

The three kitchen window sills alone use smoky blue-gray quartz with pale veining, not the ivory counter finish: 4.5 in deep, 0.75 in thick, rounded edges and 0.5 in end returns. Top height is 53 in; the white apron is 2 in high, with **no faucet notch**. Three pots/saucers stay at x = 28.25 / 34 / 36.25, z = 7.333333, scaled to 55%; saucer diameter is 3.168 in. Side/header casing remains white.

### Refrigeration and steam-oven wall

Both columns face decreasing z into the kitchen. From the kitchen, view-left to view-right: wall filler, freezer, steam-oven/storage tower, refrigerator, narrow pull-out, stairs/bookcases. Handles face the central tower.

| Element | Current model |
|---|---|
| Complete cabinet run | x = 29.1875-37.8, including stair-side pull-out and wall-side filler |
| Freezer | Fisher & Paykel RS3084FLJK1, center (36.25, 25.725), left-hinge reference |
| Refrigerator | Fisher & Paykel RS3084SRHK1, center (31, 25.725), right-hinge reference |
| Each column | 30 in nominal bay; 29.75 x 84 x 24 in body; 25 in cavity-depth allowance |
| Fridge / freezer bays | x = 29.75-32.25 / 35-37.5 |
| Tower | x = 32.3125-34.9375, center x = 33.625; 31.5 in bay, 30 in clear between 0.75 in sides, 25 in deep |
| Steam oven | Generic 30 x 24 x 24 in W/H/D envelope, bottom 36 in above floor; no model selected |
| Storage | Shaker storage below/above oven; separate overhead cabinets above columns/tower/pull-out |
| Full-depth upper storage | y = 7.15-8.85; cornice y = 8.85-9; stained oak, not the earlier cream-front trial |
| Panels / filler | Four 0.75 in column framing panels; recessed 2.85 in wall-side filler |
| Stair-side pull-out | 6 in wide x 25 in deep, x = 29.1875-29.6875, with matching upper/cornice |

No counter niche is retained in this run. The pull-out clears the modeled stair-end wall face by only 0.15 in: a geometry gap, not approved scribing/installation tolerance. The tower's 30 in clear width leaves no extra allowance beyond its generic appliance envelope. Confirm actual cabinet/cutout widths, ventilation, panels/handles, full door articulation, internal drawer withdrawal, and services before fabrication.

### Island, seating and measured aisles

- Countertop: **8 ft long along z x 3 ft 6 in wide along x**, center (28.65, 16.95); x = 26.9-30.4, z = 12.95-20.95; top about 36.6 in.
- Retain the 2 ft shift toward the living room. The longer slab extends toward prep while its refrigeration-side end stays fixed.
- White-oak base, three Shaker drawer banks, recessed toe-kick, two 2 in-thick quartz waterfall ends. Nominal knee overhang is 15 in.
- Four stools only, in one hall/living-side row: 18 in seat width, 24 in centers, 6 in nominal gaps, 3 in slab-end margins. Centers are x = 27.28, z = 13.95 / 15.95 / 17.95 / 19.95; no end stools.
- Two pendants align at x = 28.65, z = 14.7 / 19.2; hidden by default, separately controlled by Visibility.

| Static clearance | Approximate model distance | Measurement limitation |
|---|---|---|
| Cooktop counter to island | 66.9 in | Counter edges, not open drawers or occupied seating |
| Sink counter to island | 44.7 in | Counter edges; excludes dishwasher projection |
| Closed refrigeration door face to island | 44.55 in | Not the handle, open freezer, or withdrawn appliance drawer |
| Prep doorway start beyond main sink counter front | 6 in | z = 9.725 minus z = 9.225; not a separate 18 in landing/work surface |
| Mudroom casing cap to refrigeration panel | About 1.225 in | Trim-to-panel geometry, not appliance hinge clearance |

The freezer stays closed; its state button and swing interaction are removed. The manufacturer guide still gives 115 degrees for full access and about 32 in projection at 90 degrees; verify actual hardware and circulation separately. An open freezer can obstruct the mudroom approach even though that movement is no longer shown.

## Prep kitchen and mudroom

| Prep element | Current dimensions / placement |
|---|---|
| Counter/base run | x = 41.35-55.2; 24 in base depth; counter z = 7.225-9.275, top about 36.5 in |
| Sink | Provisional stainless 30 x 18 in single bowl in 36 in base, center (47.4, 8.25); actual opening through quartz |
| Left counter base | x = 41.35-45.9, width 54.6 in |
| Right extension | x = 52.35-55.2, 34.2 in wide; two banks of three drawers |
| Microwave / wall-oven tower | x = 38.5-41.25; rear z = 7.25; 33 in wide x 25 in deep; reaches 9 ft ceiling |
| Tower appliance allowance | 30 x 48 x 24 in W/H/D, y = 2-6; microwave above oven, storage above/below; no selected product |
| Tower-to-left-base gap | 1.2 in body gap, about 0.84 in to counter overhang |
| Opposite pantry shelves | x = 38.175-55.325, z = 13.65-14.65; 205.8 in (17 ft 1.8 in) overall; four food bays plus one cleaning end bay, all 12 in deep |
| Food shelf organization | Three bays retain six usable levels at y = 1 / 2.3 / 3.6 / 4.9 / 6.2 / 7.5 ft; east-end robot bay omits y = 1 shelf and contents, retaining five food levels; empty ceiling caps and original uprights remain |
| Cleaning bay | x = 38.35-41.5925, z = 13.65-14.65; 38.91 in wide x 12 in deep, 37.41 in clear width; open lower height 74.025 in, upper shelves y = 6.2 / 7.5 ft and ceiling cap; slim vacuum and broom stay behind shelf-front line |
| Robot dock | Opposite east-end bay 5; assembly center (53.585, 14.05), rotated 90 degrees, facing west along shelves; provisional 14-inch robot and compact 8-inch-high base turn together; rear-wall outlet stays fixed; no threshold, deeper cabinet or self-emptying tower |
| Robot shelf clearance | Bottom shelf and its contents removed in bay 5 only; next shelf underside y = 2.26875 ft (27.225 in); higher shelving/contents remain; sideways robot projects about 2.2 in beyond shelf-front z = 13.65, reduced from 6.8 in |
| Prep aisle | Restored to 52.5 in at counter, about 50.4 in at pulls, and 49.28 in at closed oven handles; robot floor projection occurs at the opposite end, not in front of the oven |

No cooktop or upper cabinets above the prep sink. Food contents occupy only the four food bays; cleaning accessories stay in the separate cleaning bay. Ceiling caps remain empty. Contents do not specify shelf capacity. Equipment models, charging services/cord containment, manufacturer docking/approach clearances, oven heat/open-door access, and child-safe storage remain unverified; the static aisle does not approve robot operation.

Countertop appliance envelopes, left to right; dimensions are W x D x H:

| Appliance | Approximate size | Placement |
|---|---|---|
| Stand mixer | 12.6 x 16.8 x 16.8 in | Left pair with blender, combined x = 41.65-43.542 |
| Breville Super Q | 8.1 x 10.5 x 18.1 in | Family reference; compact pair has 2 in gap |
| Rice cooker | 12 x 14.4 x 12.6 in | Right pair with air fryer, combined x = 52.358-54.925 |
| Provisional dual-drawer Ninja air fryer | 16.8 x 15.6 x 13.2 in | Compact pair has 2 in gap; no final product |

Rear edges are at backsplash face z = 7.26, bottoms y = 3.04. This is **stored placement**, not safe operating clearance. Pull appliances forward as needed; confirm heat/steam, lid/mixer-head travel, circuits, splash separation and oven landing space. No coffee placeholder remains.

Mudroom details, coordinated with [family-entry requirements](mud-room.html):

- Five-cubby bench at (44.325, 22.85), facing decreasing x: 90 x 18 in, seat top 18 in, z = 19.1-26.6. Each floor-level shoe opening is approximately 17.1 in wide x 17.25 in deep x 15.7 in high above tile/grout, without bottom shelf, lip or intermediate shelf. Target large-shoe pair envelope: 14 x 16 x 14 in; measure the family's largest actual footwear, especially tall boots. Continuous white-oak backing extends to the floor. Each cubby has one inward-facing gold hook on each side divider, not on its back or the wall, and three upper shelves.
- Enclosed coat closet at (39.325, 16.9), facing increasing x: 36 x 24 x 105 in, z = 15.4-18.4. Normal side-to-side rod; four illustrative coats, two low shoe shelves, upper storage. Standard nominal 32 in bifold door shown closed, with jambs/headwall and gold knobs; final builder door/frame and operating clearance unselected.
- Personal bin/seasonal shelves at (38.908333, 19.9), facing increasing x: 30 x 14 x 105 in. Five personal shelf positions, children lowest, each showing three removable purchased-container allowances of 8.5 x 11 x 5.5 in for socks/gloves/hats. No built-in drawer faces/runners. Matching key/charging and seasonal shelves remain.
- Extra shoes move to the east wall at (44.491667, 17.15), facing decreasing x: 42 x 14 x 105 in, z = 15.4-18.9. Three columns x seven open levels target 21 pairs, with upper seasonal shelves. Clear cells approximately 13 x 13 x 9 in; target pair envelope 12 x 12.5 x 9 in. Oversized footwear reduces this extra capacity; larger daily shoes go under the bench.
- Bin-to-bench aisle is approximately 49 in; enclosed coat face to opposite shoes is approximately 41 in, with a 36 x 36 in closed-door approach. Keep x = 38.4-43.4, z = 21.5-26.5 storage-free for arrival. Kitchen opening stays fixed; garage entry/steps shift 6 in away from the truck to x = 39.5-42.5, opening height 96 in. Static checks exclude occupied use, bifold operation and garage-door swing; no accessibility/code approval.
- Direct prep-to-mudroom opening at z = 15, x = 42-45 is closed with wall/baseboard. Access is via the main kitchen or garage route.
- All mudroom built-ins are muted matcha green, screen #8A9B74, with gold hardware; kitchen white oak stays unchanged. Full-height fillers close west/east run gaps, and north upper shelves/backing join the runs into a continuous U-shaped assembly with 81.6 in minimum overhead clearance. Tile remains; grid is raised above tile/grout. Confirm builder scope, actual shoes/coats/containers, door operation, supports, anchorage, charging and high-shelf access.

## Upstairs addition

The selectable upper-floor study uses the [dimensioned plan](assets/upstairs-dimensioned-reference.png) and [furnished reference](assets/upstairs-furnished-reference.png). Its finished floor is provisionally +10 ft, with a 9 ft ceiling. Four bedrooms, primary suite, three additional baths, closets, loft, laundry, linen, and mechanical storage are included. The source's 24 x 13 ft above-garage area is not a room: remove its slab, enclosing walls, room/dimension entry, and label, plus the exterior upper volume/window. The remaining loft south wall ends at x = 52, z = 36.2; the adjacent bedroom's east wall remains at x = 31. Keep the ground-floor garage and its lower single-story roof. Full room envelopes and deviations are in [the upstairs schedule](upstairs.html#model-study).

The stairs/kids-room swap moves the stacked stairs to the west, turned 180 degrees for east-facing hall arrivals. The upstairs opening follows the new void; the laundry moves to x = 19-29.175, z = 26.6-36.2 in the former central stair area, with its machines/counter and west hall entry. Linen/mechanical storage remain east of it. The former laundry window now lights the stairwell. This is an adapted study, not an exact overlay or verified structural/area calculation. Door swings, roof/headroom, MEP, fire protection, guards, and egress are not approved.

Select Upstairs, then Top view or Tour. Ground camera buttons return downstairs; floor changes exit Tour. The tour stays on one selected story and protects the stair opening and the absent above-garage floor.

## Living and dining

| Item | Current model and context |
|---|---|
| Living layout | F / Double-chaise sectional plus two IKEA STRANDMON wing chairs is default; reload restores F. Sectional back/body center (11.25, 17.475), facing decreasing x, aligned with the feature-wall midpoint. A-E remain earlier comparisons without STRANDMONs |
| Sectional | Provisional warm-tan 132 x 68 x 36 in W/D/H; 42 in center-body depth, 4 in arms and four 31 in seating modules: chaise-seat-seat-chaise. End chaises extend 26 in beyond center seats. Four primary positions, not verified seating for six; no product selected |
| STRANDMON pair | [IKEA dimensions](https://www.ikea.com/us/en/p/strandmon-wing-chair-talliden-beige-brown-30628943/): each 32.25 x 37.75 x 39.75 in W/D/H; seat 19.25 x 21.25 in, 17.75 in high. One chair in each window corner beside the built-ins, centers (4.2, 10.65) / (4.2, 24.3), turns 60 / 120 degrees. Simplified high-back/wing/padded-arm models with dark legs; warm beige screen approximation, fabric not selected. F only; thumbnails and tour obstacles follow the same placements |
| Earlier sofa/chairs | Hidden in F. A-E retain the 105 x 46 x 37 in Lounge Deep reference and their chair arrangements. E retains corner chairs at (3.6, 10.9) / (2.9, 24.6), turns 60 / 120 degrees, with reading book |
| Ottomans | Hidden in F; E alone shows both matching tan 24 x 20 x 16 in ottomans and their thumbnail footprints. Switching updates hidden-furniture tour-obstacle flags |
| Tables | Square walnut sofa-side table remains removed from every layout. No living-room coffee/end/drink tables or floor lamp; dining table unchanged |
| Seating clearance | Modeled sectional bounds x = 7.333-13, z = 11.975-22.975, outside stair opening and more than 3 ft from fireplace stone. STRANDMON bounds x = 2.166-6.234, z = 8.700-12.600 / 22.350-26.250, height 3.3125 ft; no overlap with sectional, closed cabinets, projecting window sills or stair guard. These are rigid geometry checks, not occupied circulation, cabinet-door/window operation, six-person comfort, product fit or fireplace heat-clearance approvals |
| Fireplace | Taupe-brown stacked-stone concept, 72 in wide x 108 in high, centered z = 17.475 on the 18.6 ft visible wall span; stone, TV, mantel, firebox and flames move together, 8.1 in toward stairs from former center. Finished face approximately x = 1.38 |
| Fireplace details | Dark firebox, ember bed, 17 static flame shapes and TV; illustrative, not an actual installed appliance/heat analysis |
| Mantel | White oak, 74.4 in wide x 3.6 in thick; underside 48 in high; approximately 6.9 in projection beyond stone |
| Media/charging cabinets | Matching white-oak 24 x 11.76 x 26 in W/D/H cabinets, reduced from 36 in wide, directly adjoining both stone returns; centers z = 13.415 / 21.535, no lateral gaps. Rear edges x = 0.4 retain 3 in service gaps; closed door rails and top leading edges are flush with stone face x = 1.38, not mantel. Two narrower Shaker doors per cabinet with concealed push latches, internal equipment/charging shelves, clear tops below window aprons. All six layout thumbnails use the narrower footprints; under-stair bookcases unchanged |
| Dining table | Provisional eight-person walnut table, 84 x 38 x 29 in L/D/H, centered (19.85, 2.95), long axis across the wider room along x. Not the former Article Seno 71 in product; no eight-seat product selected |
| Dining chairs | Eight Article Nosh walnut/black-leather size references, about 20 x 21 x 31 in W/D/H with 19 in seat height; three per long side at 24 in centers, one each end |
| Chair placement | Side seat centers 5.2 in inside tabletop edges; end seat centers 3 in outside end edges to avoid corner-chair interference. Entire set rotates back across the wider room and centers on both axes; tree, windows and patio door stay fixed |
| Centering measurements | Room midpoint x = (13.2 + 26.5) / 2 = 19.85, z = (-2.1 + 8) / 2 = 2.95. Table bounds x = 16.35-23.35, z = 1.3667-4.5333; 35.7 in to both finished side-wall faces, 39.5 in to finished rear wall and 41.6 in to the open hall line. All eight stowed chairs stay within the nominal room |
| Dining patio assembly | 72 x 96 in overall at x = 26.5, z = 0-6; higher-z half is the inward-hinged door, lower-z half stacked closed casements |
| Patio leaf | Nominal 36 in; hinge at higher-z jamb, approximately (26.5, 5.88); shown **closed at 0 degrees** by default. White leaf/frame, dark hinges/levers/threshold; full inward swing clears centered table and eight tucked chairs |
| Seasonal tree | 84 in high x 36 in nominal diameter at (15.25, -0.05), fixed for all layouts; warm lights, gold ornaments and cross topper |

The patio door remains inward-hinged and stays closed at 0 degrees by default, on reload and view changes. Its full sweep is checked separately and clears the centered set when end chairs are tucked, including 0/18/24 in side-chair travel. A pulled-out patio-end chair conflicts with the door: tuck it before operating, as the dining-view warning states. All chairs clear fixed walls at 18 in pull-out with the door closed, but end chairs at 24 in reach side-wall trim. Centering replaces the former hall-shifted layout and its larger end pull-out allowance; do not claim the old operating clearance still applies. Table leg/apron knee room, simultaneous passing and actual product/occupied access require confirmation.

All consoles, chargers and devices are concealed behind the closed doors; no electronics are modeled on top. Coordinate concealed receptacles, replaceable USB-C PD charging, Ethernet and accessible conduit for at least three HDMI runs to the TV. Verify actual device/laptop fit in the shallow cabinets, cable bends and concealed ventilation for closed-door operation; the open service rear alone is not ventilation approval. Direct stone adjacency is a visual concept, not approved combustible clearance; verify selected-fireplace requirements and noncombustible junctions before fabrication, plus charging loads, anchorage, window access and occupied chair/door clearance.

Tree branches nominally clear both finished dining-corner walls by about 4.5 in. Confirm actual spread, window operation, chair pull-back, stability, heat clearance and cord routing. No living-room area rug or entry runner; the kids' rug remains.

Six matching satin-gold/opal sconces: two in living, two in dining, two in kitchen. Living return-wall pair centers x = 0.95 / 12.25, z = 8.205, outside the window group; the pair on the removed stair partition is removed. Dining centers x = 15.3 / 24.4, z = -1.895 flank the rear window. Kitchen centers x = 26.817708 / 37.682292, z = 7.205 are outside its window bank. All are y = 6.3 ft (75.6 in). No sconces between living return windows, fireplace sconces or dining pendant/chandelier.

The [living layout lab and requirements](foyer/living-room.html) retain A-D as comparisons, not separate current plans. All options omit the lamp/rectangular table and keep the tree in dining. Confirm seating comfort, cabinet swings and fireplace/TV heat limits with actual products.

## Stairs and under-stair storage

| Element | Current dimensions / placement |
|---|---|
| Shared stair opening | x = 0.175-10.008333, z = 26.775-34.6; 118 x 93.9 in overall, in former west kids room; assembly rotated 180 degrees |
| Two flights per level | Eight 7.5 in rises each; seven 10 in treads per flight; 70 in horizontal tread run |
| Kitchen-side upstairs / basement return flight | 44 in tread width |
| Wider upstairs / basement entry flight | 46.9 in tread width, on north side after rotation |
| Inter-flight gap | 3 in, kept open with guards, not a solid dividing wall |
| Turning platforms, upstairs and basement | Exactly 48 in deep along x x 93.9 in across z; x = 0.175-4.175, at west end |
| Landing elevations | Turning platforms at y = +5 / -5 ft; arrivals at +10 / -10 ft |
| Upper arrival landing | East side: x = 10.008333-13.675, z = 26.775-30.683333, y = 10; 44 in along x x 46.9 in across z |
| Basement arrival landing | East side: x = 10.008333-13.675, z = 30.933333-34.6, y = -10; 44 x 44 in; basement rooms not modeled |
| Four recessed bookcase bays | Widths 20 / 20 / 21.3 / 26.7 in; nominal 11 in depth; remain attached to lower-flight/landing enclosure, now facing south after rotation |
| Bookcase finish and base | Cream open carcasses, oak shelves, books; plinths 0.72 ft high, first shelf 0.76 ft; continuous white baseboard/shoe with bottom-step and landing-end returns |

The four-foot platforms and existing rise/run geometry are retained during the swap, not resized. The entire stair/retaining-wall assembly moves and turns together; the former central void is restored to floor for the kids room.

Oak treads/stringers, light closed risers, hollow soffits, continuous lower-flight enclosure and recessed bookcases remain. No passage is cut through the under-stair enclosure.

**Current guard layout:** omit the upper flight's powder-room-side outer oak handrail, dark guard bars, and posts, plus the adjoining turning-landing side assembly, against the existing wall (stair-local z = depth + 0.08, world z = 34.68). Preserve both lower-flight guards, the upper center-gap guard, and the opposite exposed landing-side guard at local z = -0.08. Keep all four stringers, treads/risers, and platform unchanged. The turning-platform west end remains wall-backed. Upstairs opening guards and all basement sloped rails/posts are unchanged. Required wall-mounted handrails, continuous wall enclosure, and final guard dimensions/climbability still need architect/code review; removing a modeled guard is not code approval.

The living-facing full-height wall at z = 25.7 is removed, not the under-stair enclosure. A separate 42-inch-high oak-capped guard follows x = 0.175-10.008333, center z = 26.675, just outside the north opening edge. Dark vertical balusters have clear gaps at most 3.75 inches; bottom clearance is 1.38 inches. Keep the east hall access open. Wall-removal support, guard anchorage/loads and code compliance remain unverified.

Basement retaining walls follow the opening, stop beneath the ground-floor slab and leave entry clear. Ground/site meshes are cut around them and the lowered garage. Platform dimensions are not certified clear dimensions between handrails. Verify actual elevations, structure, fire protection, headroom and entry circulation before using this geometry for construction. See [basement notes](basement.html).

## Kids' room, office, bedroom and bathrooms

| Room | Furniture / fittings | Layout and constraints |
|---|---|---|
| Kids | Three white IKEA MICKE desks, article 302.130.76, each 28.75 x 19.625 x 29.5 in W/D/H; centers x = 20.8479 / 23.3479 / 25.8479, z = 25.9044 | North-wall row, facing south; 1.25 in between desks; three provisional 18 x 18 in chairs centered z = 27.6721; [official product](https://www.ikea.com/us/en/p/micke-desk-white-30213076/) |
| Kids | 60 x 18 in reading bench, 18 in seat height at (27.9, 30.1), facing west; face-out book display at (19.65, 32.7), facing east, 18 x 6 x 36 in W/D/H | Sage upholstery; book display clears the west-entry casing; former exterior window stays at west stairwell |
| Kids | 96 x 15 x 24 in toy console at (24, 33.65), art display above at (24, 34.34) | Four oak Shaker doors; south wall; anchor storage/art safely |
| Kids | 6.5 x 3.5 ft rug at (23.4, 30.5); round activity table and stools removed | Approximately 43.2 in from the end of a 30-inch desk-chair allowance to closed toy-console pulls; west-entry route remains open; occupied use and child ergonomics are unverified |
| Office | Two 60 x 24 in desks at (3.8, 42.35) / (6, 52.8), latter rotated 180 degrees | North desk/chair move 1 ft south with returned wall; two monitors and task chair each; face opposite walls, no bookcase |
| Office | Loveseat 60 x 33.6 in at (10.45, 50.4); SOLE E20 reference 65 x 22 x 64 in L/W/H at (1.65, 50.3) | Verify chair pull-back, window reach, pedal/user movement and headroom; no operating envelope certified |
| Bedroom | Article Lenia queen reference 63.5 x 82.75 in W/D; center approximately (27.427083, 49.395), rotated -90 degrees | Headboard/rear edge x = 30.875 on east wall opposite west entry; faces decreasing x, not the porch |
| Bedroom | Two nightstands, approximately 18 x 15.6 in, at (30.2, 45.695) / (30.2, 53.095) | Shifted toward porch with bed; porch-end stand limits further movement; keep trim/window clear |
| Closet | Widen to x = 17-25; left long-hang and right double short-hang runs, approximately 61 in rods each; upper shelf per run; five rear 12 in-deep x 32.4 in-wide shelves | Opposing 24 in-deep side zones leave 43.8 in middle aisle; centered 36 in doorless entry; hall remains 53.4 in clear to west |
| Powder | Toilet retained at (1.6, 36.65); 27.6 in vanity moved to (3.25, 39.95), rotated 180 degrees | South-wall vanity clears the inward-opening door; tiled room extends to z = 41; verify sanitary and occupied clearances |
| Guest shower bathroom | Toilet (29.7, 35.9); southwest 24 in vanity (26.05, 40.5), facing east; shower unchanged x = 25.175-28.375, z = 34.775-38.975 | Moving vanity out of east corridor restores the full 31.8 in toilet approach; room door shifts east and opens outward, glass door inward; actual sanitary/occupied-use approval unresolved |
| Guest coats | Reach-in closet centered (9.65, 36.3), upper shelf, continuous hanging rail, four illustrative coats | Replaces powder linen cabinet; separate closed oak door pair faces the open hall alcove, not the bathroom |
| Porch | Two 60 x 20.4 in benches at (5, 55.4) / (26.2, 55.4) | No entry runner indoors; no sidelights/transom around the front doors |

Room requirements: [kids/living](foyer/living-room.html#connected-kids-room), [office](office.html), [bedroom/closet](bedrooms.html), [bathrooms](bathrooms.html), [front entry](front-entry.html). Check furniture anchorage, cordless shades, window fall protection/egress, rug grip, safety glazing, electrical services, door swings and sanitary clearances. Accessible fixture shutoffs and timed bathroom fans are requirements, not demonstrated by the simplified model.

## Window schedule

**Whole-house count, verified October 18, 2026:** 29 window openings/groups across the furnished floors, containing 47 modeled units: 45 casements and 2 fixed pictures. Ground floor: 18 openings / 28 units (26 casements + 2 pictures). Upstairs: 11 openings / 19 casements. The exterior visualization's 29 groups are alternate representations, not additional windows; their placeholder sizes/divisions are not fully coordinated with the furnished model. Exclude all door-leaf glass, eight garage-door panes, and unmodeled basement windows/skylights. See the [room-by-room count and counting rules](windows.html#whole-house-window-count); this is not an approved procurement schedule.

All sizes below are **provisional opening/group envelopes**, not confirmed catalog units, rough openings or clear glass. Sill/head heights are inches above house datum. Coordinates identify the opening wall, not small frame insets.

| Location / quantity | Opening W x H (in) | Sill / head (in) | Opening centers (x, z), ft | Concept grouping |
|---|---|---|---|---|
| Living fireplace side, 2 | 48 x 64.8 | 31.2 / 96 | (0, 11.675), (0, 23.275) | Two casement bays each; centers 5.8 ft either side of fireplace; equal 18 in opening-to-end returns |
| Living return wall, 3 | 30 x 60 | 36 / 96 | (3.266667, 8), (6.6, 8), (9.933333, 8) | Casement / single fixed picture / casement |
| Dining rear, 1 | 72 x 60 | 36 / 96 | (19.85, -2.1) | Two bays |
| Dining west, 1 | 72 x 60 | 36 / 96 | (13.2, 2.95) | Two bays |
| Dining patio-side window bay, 1 | 33.84 x 93.12 frame envelope within 72 x 96 assembly | 1.44 / 94.56 | (26.5, 1.53) | Two stacked casements; not a fixed picture pane |
| Kitchen sink, 1 | 54 x 42 | 53 / 95 | (32.25, 7) | Single fixed picture, uninterrupted pane, no crank |
| Kitchen side openings, 2 | 18 x 42 | 53 / 95 | (28.25, 7), (36.25, 7) | Single casement each |
| Prep counter, 2 | 30 x 42 | 51 / 93 | (45.65, 7), (49.15, 7) | Single bay each |
| Prep end wall, 1 | 24 x 42 | 51 / 93 | (55.5, 12) | Single bay |
| Stairwell side (former kids), 1 | 48 x 60 | 36 / 96 | (0, 30) | Two bays; location unchanged |
| Office side, 1 | 48 x 60 | 36 / 96 | (0, 49) | Two bays |
| Office porch, 1 | 72 x 60 | 36 / 96 | (6, 54.2) | Two bays |
| Bedroom porch, 1 | 91.2 x 60 | 36 / 96 | (25, 54.2) | Three bays |

The table above totals **18 ground-floor groups / 28 units**, not the whole house: 26 operable casements plus two fixed pictures, including the stacked patio-side pair among the casements. Add the upstairs schedule below for the 29-opening whole-house total. Default direction is Andersen 100 Series, Black exterior / White interior, white crank/lock hardware where operable and no decorative grilles. Fixed pictures have no center mullion or crank/lock. Patio-adjacent frames/sashes are White inside and out. All operable windows are shown closed; divisions do not establish manufacturer combination approval.

### Upstairs window schedule

All upstairs openings are 60 in high, sill 36 in / head 96 in **above the upstairs finished floor** (156 / 216 in above house datum, with the provisional 10 ft floor-to-floor height). Coordinates below follow the frame centers, including 0.1 ft wall insets; openings are not confirmed unit or rough-opening dimensions.

| Room / group | Quantity | Opening W x H (in) | Frame centers (x, z), ft | Units per opening |
|---|---|---|---|---|
| Primary bedroom west | 2 | 48 x 60 | (0.1, 12.6), (0.1, 21.6) | 2 casements |
| Primary bath | 1 | 36 x 60 | (18.7, 2.2) | 1 casement |
| Bedroom 2 | 1 | 48 x 60 | (37.5, 10.1) | 2 casements |
| Bedroom 2 bath | 1 | 24 x 60 | (49, 10.1) | 1 casement |
| Loft east | 2 | 48 x 60 | (51.9, 27), (51.9, 33) | 2 casements |
| Stairwell west (former laundry) | 1 | 36 x 60 | (0.1, 31.1) | 1 casement; location unchanged |
| Bedroom 3 west / south | 2 | 48 x 60 | (0.1, 47.2), (6.5, 53.1) | 2 casements |
| Bedroom 4 south | 1 | 48 x 60 | (24.5, 53.1) | 2 casements |

Upstairs subtotal: **11 openings / 19 casement units**. No fixed picture units upstairs in the current model.

Kitchen window piers and corner returns are 12 in; outer trim-cap returns are 7.625 in, leaving end-sconce space. The former 66 in center window is now 54 in, with side windows moved 6 in inward; sink/counters do not move. Prep paired-window pier is 12 in. Living return openings are at 40 in centers, with 10 in solid piers and 24.2 in returns to wall centerlines; the widest casing caps are only 1.25 in apart. Their casing tops are approximately 102.625 in, leaving 5.375 in below the ceiling. Fireplace-window aprons end around 26.7 in, 2.7 in above the low cabinets. See the detailed [living schedule](windows.html#living-room-window-schedule), [kitchen window/light schedule](windows.html#kitchen-sink-window-schedule) and manufacturer resources before sizing/framing.

## Doors, openings and circulation

| Connection | Current opening / location | Operation or limitation |
|---|---|---|
| Kitchen to prep | 30 x 96 in, x = 38, z = 9.725-12.225 | Doorless, Craftsman casing both faces |
| Kitchen to mudroom | 30 x 96 in, x = 38, z = 21.675-24.175 | Doorless; both openings mirror about z = 16.95 |
| Hall to kids | 54 x 96 in, x = 19, z = 27-31.5 | Doorless west entry into relocated room; no direct living-side opening or sofa supervision |
| Hall to office | Nominal 60 x 96 in envelope, x = 12.2, z = 42.75-47.75 | Two nominal 30 in white French leaves, each 2 columns x 5 rows of clear lites, white muntins, gold round knobs and dark hinges; white casing. Both stay fully open inward at 90 degrees into the office, perpendicular to the opening, on reload and view changes. Unit/jamb/rough opening, true/simulated divisions, safety glazing, handing and hardware unselected; see [office doors](office.html#doors) |
| Hall to bedroom | 36 x 84 in, x = 19, z = 42-45 | Opening only; final door leaf/swing not detailed |
| Bedroom to walk-in closet | 36 x 84 in cased opening, z = 42, x = 19.5-22.5 | Doorless; centered on left/right hanging aisle; no pocket installation assumed |
| Bedroom to shower bathroom | Nominal 30 x 84 in, z = 42, x = 28.15-30.65 | White paneled leaf, west-jamb hinge on bedroom frame face, 90 degrees outward; clears fixed bedroom furniture |
| Guest shower | Nominal 30 in glass door on east side, x = 28.325, z = 36.225-38.725 | South-end hinge, displayed 90 degrees inward; product/finished clear opening and water containment unverified |
| Front entry | 60 x 84 in, z = 54.2, x = 13.1-18.1 | Two oak/glass leaves shown closed, no sidelights/transom; final door unit unselected |
| Front entry lock | Wyze brand selected; exact model/finish unconfirmed | One schematic interior smart-lock body above the existing pull, positive-x leaf provisionally active; exterior keypad/reader and product dimensions not assumed. Verify stile/glazing, bore/backset, latch/strike, inactive leaf, and egress with supplier; see [lock notes](front-entry.html#smart-lock) |
| Dining patio | 72 x 96 in combined assembly, x = 26.5, z = 0-6 | Higher-z nominal 36 in inward-hinged door stays closed; other half stacked casements; keep patio-end chair tucked for door operation |
| Mudroom to garage | 36 x 96 in, z = 26.9, x = 39.5-42.5 | Shift 6 in away from truck; two straight steps follow; rated door, landing and swing not resolved |
| Garage side pedestrian opening | 36 x 96 in, x = 55.5, z = 44-47 | Opening rises from garage datum, not house datum |
| Garage vehicle doors, 2 | Each 108 x 96 in, z = 49, x = 32.5-41.5 / 44-53 | Heights rise from garage datum; proposed, not zoning approval |
| Powder entry | Nominal 30 x 84 in, x = 7.1, z = 38-40.5 | Opening centered between finished alcove walls with casing room at both jambs; painted-white leaf, south-jamb hinge, displayed 90 degrees open inward, clear of hall alcove and vanity |
| Guest coat closet | Nominal 48 x 84 in, z = 37.5, x = 7.65-11.65 | Two closed white-oak Shaker leaves with satin-gold pulls; independent access from alcove |

Doorless openings do not provide acoustic separation. Simplified trim does not establish finished clear width or egress/accessibility compliance. See [door requirements](doors.html).

## Garage, bikes and equipment

See [garage working layout](garage.html#working-layout). Vehicles are closed-object spatial stand-ins, not manufacturer CAD; model year/trim and door sweeps are unconfirmed.

| Item | Current model |
|---|---|
| Sierra EV, right bay | Center (48, 38); 233.42 in long, 83.8 in body width, 95.7 in mirror envelope, conservative 80 in height |
| BMW i4, left bay | Center (37, 40.5); 188.5 in long, 72.9 in body width, 81.6 in mirror envelope, 57 in height |
| Parking gaps | Approximately 43.4 in center mirror aisle; Sierra nose/rear about 14.4 / 13.2 in; BMW rear about 5.7 in. Rear gaps are not routes |
| EV charger | (42.75, 48.65), on the interior pier between garage doors; cable coiled off floor; supply/reach unverified |
| Five-bike floor rack | Center (50.4, 18.5), 22.2 in nominal stand centers; both wheels on floor, no lifting/hooks |
| Over-bike storage lift concept | 8 x 4 ft deck (32 sq ft), center (50.4, 18.5); deck top 7.5 ft / underside 7.25 ft above garage slab; eight illustrative bins; independent Visibility checkbox. Raised position only; goods-only, not walkable or load-rated. Bikes/people must clear the full lowering zone before real operation; structure, mechanism, safety controls and manufacturer requirements unverified |
| Mobile storage-access steps | Access mode only: six 7 in rises / five 10 in treads; 30 x 30 in standing platform at 3.5 ft, about 81 in nominal headroom, 42 in guard and continuous handrails; approximately 30 x 80 in footprint. Move truck/bikes out first. Never climb onto storage deck or access moving lift; product, load, locks, structural approval and stowed location unresolved |
| Equipment station | Center (32.95, 27.115), in front of BMW; current bounds about x = 29.55-36.35, z = 27.075-31.905 after unfolding mower |
| Equipment contents | Conventional mower on wheels with full handle, vacuum at right end, conspicuous dedicated leaf-blower cradle at tool-board left, wall tools, battery shelf and bins |
| Equipment approach | Previously checked conservative BMW-front gap about 42.5 in; aim to keep 36 in retrieval route. Removing east-wall storage restored about 40 in beside truck mirror |
| House-entry steps | x = 39.5-42.5, z = 26.725-28.558333; two 36 in-wide x 11 in-deep tread surfaces, two 7.5 in rises |
| Step levels | Upper top y = 0, lower y = -0.625, garage y = -1.25; contrasting nosings, no separate landing/rails in concept |

Closed-object gaps do not prove vehicle-door access, bike roll-out/turning, tool retrieval, charger cable reach or code compliance. Existing tour routing from garage center to the bike alcove has a recorded limitation; the storage relocation did not establish that route. Verify actual equipment, battery charging guidance, anchorage and shelf loading.

Exterior garage approaches are only provisional lowered pads, not driveway grading: south x = 32.5-53, z = 49-52; east x = 55.5-58.5, z = 43.5-47.5. Confirm levels, drainage, fire separation, required landings/handrails, overhead door tracks and permitted door sizes.

## Shared finishes, trim and lighting

| Surface / detail | Current direction |
|---|---|
| General walls | Sherwin-Williams Accessible Beige SW 7036 screen approximation, #D1C7B8; main-kitchen interior faces are ivory quartz instead |
| Hardwood | Continuous 7 in natural honey-oak plank spacing/grain across living, dining, kitchen, prep, hall, kids, office, bedroom and closet; varied 4-8 ft board lengths |
| Other floors | Mudroom/bathrooms tile, porch paving, garage epoxy; not the earlier prep-tile note |
| Closed cabinetry | Light natural-stained white oak, Shaker recessed fronts, frameless/full-overlay; satin-gold hardware; open stair-bookcase carcasses stay cream |
| Mudroom exception | Connected builder-installed shelves, backed cubbies and enclosed coat closet in muted matcha #8A9B74; gold hardware; open personal shelves for removable containers, not drawers |
| Quartz | Warm ivory/soft warm-gray veining on counters, island and kitchen walls; three main-kitchen window sills are smoky blue-gray |
| Drawer cups | Top Knobs Dakota Charlotte M2223, Honey Bronze, kitchen/island/prep-extension drawers; one cup below 30 in width, pairs at quarter points at 30 in or wider |
| Cup-pull dimensions | 3.75 in overall width, 1.125 in height, 15/16 in projection, 2 9/16 in mounting centers; geometry/drilling not installation CAD |
| Other hardware | Existing bars retained on cabinet doors, tall/trash pull-outs and appliances |
| Interior casing | Painted-white Craftsman: 3.5 in side boards, 5.5 in headers, bead/cap; window sills/aprons, no bottom trim across doorways |
| Casing faces | Both sides of interior passages; interior face only at exterior doors; patio door/window share outer casing |
| Baseboards/shoe | White 8 in flat base, provisional 0.75 in thickness and quarter-round radius; exposed finished wall faces, mitered corners/returns, stops at casing |
| Base trim exclusions | Exterior/porch/garage and kitchen quartz faces; under-stair base has reduced-height bottom-step section and end returns |
| Upholstery | Warm tan/light-brown living seating, brown stool cushions, black dining leather; office loveseat retains its light model finish; sage/clay/blue in kids' room |
| Lighting | Ambient/overhead studio lighting plus six warm sconces and illustrative glowing fixtures; no sunlight/sky/cast-shadow or photometric design |

Physical samples must confirm stain, sheen, upholstery durability, quartz color, stone color and hardware finish. Future electrical circuits, sconce boxes, dimming, fixture mounting and hood exhaust/service routes remain design work. See [flooring](flooring.html), [windows/trim](windows.html), [electrical](electrical.html), and room requirements.

## Preview behavior and future edits

- Main toolbar: Whole floor, Living + dining, Kitchen, Prep + mud, Garage, Top view. Room menu retains additional room views; specialized inspection presets also exist in code, but not all have toolbar shortcuts.
- The toolbar's **1 ft grid** checkbox toggles one-foot squares, off by default. Furnished ground/garage lines sit 0.05 ft above their floor datum, clearing mudroom tile and grout; upstairs/edited floors retain a 0.025 ft offset. Furniture occludes the lines. Choice lasts for the page visit, including Reset/Home; exterior/basement-stair views temporarily hide it.
- Room dimensions live in the on-demand room menu, not labels floating in the model. Full-height walls stay; no general wall-height/cutaway toggle. A special basement preset hides the surrounding shell/upstairs stair geometry for inspection.
- Rotate/Move control overview navigation. Tour is third person; clicking clear ground-floor space can enter it. Routes use a 6 in grid, collision-checked smoothing and 4 ft/sec travel. No stair/basement/upstairs travel.
- Tour toggle/Escape restores the prior view/mode; room changes, Reset and Home exit. Dragging, focus loss or moving freezer pauses travel. Floor plan opens the small destination map; inaccessible destinations show a notice.
- Island lights start hidden and retain their visibility choice for the page visit, including Reset/Home; elevation/top inspection may hide them temporarily. Reset/Home close the freezer.
- Living layouts share placement data with their SVG comparisons; switching exits the tour and rebuilds obstacles. E restores on reload. Historical screenshots do not establish current placement.

## Open decisions and known differences

1. **Guest-entry verification:** hall access, powder door, relocated vanity and separate coat closet are now modeled; the former blocked entry is resolved geometrically. Confirm actual finished door/frame clear widths, occupied alcove circulation, sanitary clearances, plumbing/exhaust, structure, closet operation, and accessibility. The remaining 6-inch stair-edge-to-wall-centerline buffer is not a walking passage.
2. **Patio circulation:** inward handing and closed display remain current. The rotated dining set moves 6 in west for swing clearance; actual occupied passage and manufacturer door/chair envelopes still need confirmation.
3. **Stair enclosure:** relocated flight guards and the new living-side opening guard replace the earlier wall-backed omissions. Confirm required handrails, guards, clear widths, headroom, fire protection, anchorage and structural support after removing the living partition.
4. **Garage safety/access:** actual levels, rated door, required landings/rails, door tracks, vehicle/equipment movement and charger reach remain unverified; the two-step/no-rail concept is not approval.
5. **Kitchen installation:** select actual steam oven, prep combination, hood/liner and fixture accessories; resolve cutouts, tower tolerance, appliance/door/drawer operation, services and quartz build-up/support.
6. **Windows/exterior:** dealer/architect must confirm standard sizes, combinations, rough openings, structure/bracing, egress/safety glass, weatherproofing and sash operation. Exterior-wall extension needs site/elevation/foundation/roof review.
7. **Guest bathroom detailing:** shower/toilet/vanity are now modeled in the combined room. Actual sanitary clearances, finished openings, occupied use, waterproofing, safety glazing, exhaust and plumbing still require professional review; this is not an approved installation.
8. **Furniture/use:** seating counts and object gaps are not occupied-clearance or accessibility certifications; verify chair/stool pull-back, bed/nightstand circulation, exercise use and kids' safety with real products.

### Audit evidence

October 18 documentation audit compared current constants, floor/wall extents, opening cuts and furnishings against this reference. Live scene queries confirmed the 8 ft island, closed/higher-z-hinged patio leaf, 31.5/30 in tower bay/clear width, 205.8 in prep shelving, window groups and divisions, 48 x 93.9 in turning platforms, flight widths and furniture metadata. Historical verification logs in [design context](design-context.md#historical-verification) describe earlier snapshots and do not override this schedule.

Final checks passed: 16 live-scene assertions, including 18 window groups / 26 casements / two picture panes / eight sconces, the revised living-window centers and dining-table center, island/landing bounds, and bedroom placement. All 42 checked local documentation links/anchors and the reference's room/system coverage passed, as did Git whitespace checks. The model source revision stayed unchanged during final verification.

This audit changes documentation, not geometry, furniture placement, product selection or unresolved safety/code decisions.
