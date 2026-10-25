# Ground-floor design context

## Dynamic livable-area estimate

Remove the redundant "Furnished concept" footer label and its decorative dot.
Keep the area totals and refresh/reset controls; saved-layout warnings remain.

The viewer footer shows a combined two-floor livable-area estimate computed
from current floor surfaces, including saved layout overrides, with separate
first-floor and second-floor values visible alongside the total. Count overlapping
surfaces once per floor, including closets, halls, bathrooms, laundry and the
upstairs arrival landing. Exclude garage, porch, mechanical space and open stair
voids. Recalculate on view/layout changes; source-plan changes update on reload.
This is nominal modeled interior floor area, not certified appraisal or code
living area. Wall thickness, headroom eligibility and stair-area conventions
remain unverified. No room layout changes are implied.

## Upstairs furnishing and label cleanup - October 24

Remove upstairs floating labels without removing room buttons, tour-map
destinations or optional 2D dimensions. Preserve saved layouts and all walls,
openings and default door poses. Add paired bedroom nightstands/lamps, rugs,
pillows, dressers, a primary writing desk, loft seating/media/work furniture,
laundry cupboards and bathroom details. Replace closet shelf placeholders
with continuous rods, clothing, long/double hanging, drawers and folded storage.
Closet inspection views hide the hanging-bay top shelves to expose their
contents; changing views restores them.
The primary walk-in retains its stepped north return and both connecting
openings; its drawer handles leave a modeled 38.4-inch aisle to the opposing
two-foot clothing zone. Move Bedroom 2's toilet clear of its vanity and the
west bath vanity clear of trim. Mechanical equipment is still only a service
reservation. Actual products, occupied use, door swings, sanitary clearances,
supports and code compliance require review; see [upstairs notes](upstairs.html#model-study).

## Corrected dining side-wall alignment - October 24

The owner's circled wall is the patio-side return next to the kitchen
sink-run base cabinets. Do not extend the backyard window wall. Move the
side-wall centerline east 4.5 in to x = 26.875 ft so its dining face
x = 26.7 matches the cabinet/counter end. Retain ordinary projecting
baseboard trim. Backyard wall stays z = -0.1 and kitchen wall stays z = 7;
kitchen cabinetry, glazing, sconces and kitchen-to-mudroom passage stay fixed.

Dining becomes 13.675 x 8.1 ft, gaining 3.0375 sq ft. Center the unchanged
table/eight chairs at (20.0375, 3.95), moving them and rear glazing/sconces
2.25 in east. Patio assembly follows its wall without changing z opening,
handing or closed default. Match rear-wall width, floor patches, trim,
exterior and dining roof; preserve lot, patio cover/paving and saved JSON.
Full door sweep still conflicts with the patio-end chair even tucked;
24-inch end-chair pull-outs still reach trim. These model checks are not
structural, product or occupied-clearance approval.

## Kitchen fruit and bread organization - October 24

Owner approved showing everyday fruit in the main kitchen and bread/extra
room-temperature fruit in prep, without cabinet changes. Add a removable
13.2 in fruit bowl at the island's prep-side end. Replace decorative goods
on two levels of the first food bay after the cleaning bay: two open-slatted
16 W x 10 D x 5 H in produce baskets on the 27.6 in shelf and one
18 W x 10 D x 9 H in bread box on the 43.2 in shelf. Keep cleaning supplies
separate and preserve the robot bay at the other end. Bread box has a
lift-up front and ventilated rear; these are removable purchased containers,
not new built-ins. Products, food-safe finishes and shelf capacity remain
unverified. Keep refrigerated fruit in the refrigerator. Inspect using
Kitchen and Prep shelves; preserve all counters, cabinetry and passages.

## Centered warm sofa - current J study

Latest request puts the couch in the middle. Interpret this as one sofa
centered in the living room facing the fireplace, replacing the two facing
sofas. Keep warm taupe upholstery, muted camel chairs and earthy cushions;
no coffee table, end table/cart or rug. J is default; A-I remain earlier
comparisons. The earlier photo grouping and L are superseded.

Use one 90 x 39 in sofa centered at (6.6, 16.85), derived from the shared
Living room bounds x = 0-13.2, z = 8-25.7 ft. Turn -90 degrees to face
the fireplace/TV. Keep three cushions and brown/sand pillows.
Three sofa positions plus two chairs are planning positions, not verified
occupied comfort. All furniture is modeled concept geometry, not selected
manufacturer products.

Two muted camel upholstered 30 x 33 x 34.8 in chairs flank the sofa at
(7, 10.5) and (7, 23.2), facing west. Their backs stop at x = 8.375,
outside the retained hall strip. Do not alter the darker comparison chairs.

Leave the existing hardwood exposed and the space in front open. No rug, coffee
table/books, end table, cart or lamp remains in J. Earlier comparison
furnishings stay hidden in J and retain their original finishes.

Static gaps: 16.2 in from each chair to the nearest sofa end,
43.14 in sofa-front-to-closed-cabinet line and
36 in in the retained main hall strip
x = 13.25-16.25, z = 10.5-25.5. These are model checks, not occupied-use,
accessibility, cabinet-door, window-sash or fireplace-clearance approval.
Family comfort, actual dimensions and upholstery care need product review.
Keep architecture, full-length cabinets, stairs, dining and hall tree fixed.
Switching must restore each layout's geometry, finishes, lights and obstacles.

## Minimal viewer chrome - October 24

The owner removed the top slogan, two-floor concept badge and visible
garage-door explanation banner. Do not restore them or add unrequested
banners, decorative text, explanatory panels or duplicate navigation.
Keep help and assumptions in existing optional notes. Vehicle-door actions
retain screen-reader feedback without a visible banner. Essential errors
and actionable safety warnings remain explicit; layouts are unchanged.

## Consolidated viewer navigation - October 24

The owner found the repeated horizontal menus too large. Use a collapsible
left **Menu** for floor/view, exploration/display and floor-aware room
navigation. Keep controls in one place; remove repeated 2D viewer links and
the second exterior overview button. Preserve dimension toggles, direct URLs,
tours, visibility, saved layouts and optional design notes. Phones start with
the menu closed above the canvas and collapse it after camera selection.
This changes presentation only, not the home layout.

## Garage high windows and hanging tools - October 24

Add three fixed 72 x 18 in picture windows on the exterior east wall
x = 55.5, at z = 19.5 / 29.5 / 39.5. Sill/head are 90/108 in above
the -1.25 ft garage slab, world y = 6.25/7.75 (75/93 in house datum).
Use shared getGarageClerestoryLayout geometry for furnished/shared cuts
and exterior stone/frame openings. Keep the side door and all room
boundaries fixed. White inside/black outside; no operable high sash.
Three new openings bring the furnished total to 31 groups / 48 units:
42 casements and 6 fixed pictures. These are not selected standard units;
headers, glazing, site/fire limits and daylight performance need approval.

Replace the three anonymous long-handle tools behind the mower with
a dedicated 30 in wall rail beside the house entry, center (37.75, 27.115).
Hang a recognizable rake, broom and dustpan on individual clips around
5 ft above the slab, with four spare hooks for smaller items. Keep all
tools off the floor and preserve the mower, vacuum, blower, imported
tool-board props, vehicles, bikes and steps. Garden-tool geometry is
generic, not a product selection. Actual hook loading, reach, hardware,
blocking and garage/house fire-separation penetrations remain unverified.

Browser measurements confirm the 90/108 in opening sill/head and 85.5 in
lowest interior casing. Rays through all three opening centers hit glazing
but no opaque wall or exterior stone. Exterior and furnished counts are
31 groups, with 48 furnished units. Rake/broom/dustpan constituent meshes
do not overlap one another. A 36 in-wide, 78 in-high standing envelope
cleared 63 sampled positions from the central garage aisle to the tool
approach with both vehicles parked; this is not occupied-use approval.
Garage overview now faces the east window wall rather than cutting it
away in the foreground; storage inspection includes the new hanging rail.

## Mudroom rendering depth - October 24

The owner found the same-color shelves and backs unreadable under flat light.
Retain all sage-greige materials, storage geometry, room boundaries and door
poses. For mudroom views only, reduce ambient intensity from 2.5 to 0.85
and enable a warm interior spotlight with a 2048 px soft-filtered shadow map.
Place the study light below the nominal ceiling, aimed across the cubby wall,
so actual shelves and dividers cast depth-revealing shadows on the backs.
Restore original ambient lighting and disable the key/shadow pass outside
mudroom views. No new controls, geometry or product selections are added.
This is improved interactive shading, not photorealism, a fixture proposal
or verified illuminance; clothing remains modeled design concepts.

## Prep-kitchen contrasting backsplash - October 24

Use muted deep sage ceramic tile in a running-bond pattern with warm-gray
1/16 in grout joints, contrasting with the retained warm ivory quartz counters.
Keep the existing 14.35 ft-wide, 9.84 in-high backsplash envelope and its
front face at z = 7.26 ft; appliances, windows and cabinetry do not move.
This supersedes the prep quartz backsplash only, not main-kitchen quartz walls.
Tile color is a visualization concept; verify samples, cleanability, substrate
and sealed wet-area joints before product selection or installation.

## Prep-kitchen window refinement - October 24

Replace the two 30 x 42 in sink-wall casements and their center pier
with one nominal 60 x 42 in fixed picture window centered on the unchanged
sink at (47.4, 7). This retains the combined opening area while giving
an uninterrupted sink view. Keep the 51 in sill / 93 in head, white
Craftsman casing and black exterior frame. Exact standard Andersen unit,
rough opening and replacement header need dealer/architect confirmation.

Retain the 24 x 42 in operable end-wall window, but center it on the
clear counter-to-pantry aisle at (55.5, 11.55), 5.4 in toward the counter.
Its widest trim leaves matching approximately 10.9 in gaps to the
counter and shelf fronts. Sash reach/swing and ventilation remain unapproved.

The narrower sink-window bank clears the mixer, so align all four stored
countertop appliances at the backsplash again; remove only the mixer's
former 1.5 in forward offset. Retain the right-hand row and clear left
preparation counter, compact dishwasher, six drawers, tower, pantry,
robot arrangement and room boundaries. No prep cooktop returns.

Furnished frames, shared wall cuts and exterior openings follow together.
With the later garage clerestories, the current count is 31 openings /
48 units: 42 casements and 6 fixed pictures, not a supplier order or
glazing/structural approval.

## Optional dimensioned 2D views - October 24

Keep the existing plain furnished 2D view. Direct links on the floor-plan
page also open either floor with room dimensions enabled.
The **Room dimensions (2D)** checkbox shows room-centered width/depth labels
and a readable list below the plan, separate from the optional design notes.
Use current model room bounds and saved overrides, rounded to inches, not
older source-image dimensions. Small labels enlarge with zoom; irregular
rooms show nominal envelope extents, not finished clearances. No layout or
saved JSON changes; these remain design-study measurements.

## Earlier I family sectional - superseded by the photo reference

The owner rejected the current couch as uncomfortable for five and approved
a generous deep L-shaped sectional with a movable upholstered ottoman.
Earlier I superseded H; both remain comparisons under J.
Its former warm-brown-only finish is superseded by the photo reference. That concept is 144 x 104 in,
44 in deep, with five full cushions at least 27 x 30 in plus an uncounted
corner. This is not a selected or comfort-verified product.

The main back reaches x = 12.4; overall z = 11.475-23.475. The dining-side
return reaches x = 3.7333, leaving about 28.2 in to closed cabinet fronts.
Both wall-end gaps are 39.6 in. Ottoman center (6.0667, 18.975), 48 x 32 x
17 in, leaves 16 in to the main front and 22 in to the return. Keep the rug;
hide separate chairs, both side tables and table lamp in I, restoring them
only for their earlier layouts. Do not move architecture, cabinets, stairs,
dining furniture or hall tree. The hall-side strip stays outside the sofa.
Verify occupied circulation, cabinet-door operation and fireplace clearances;
the narrow cabinet pinch is not an approved main route. Select actual furniture
by all-five family sit-testing, cushion support, depth and easy-clean care
before matching a downloaded asset.

## Earlier H family-room study - superseded

The owner rejected the scattered furniture arrangement and requested a
designer-informed family room. Earlier H superseded G: three sofa planning
positions and two armchairs, not five verified comfortable seats.
Keep all architecture, fireplace/TV, built-ins, windows, stair guards,
dining furniture and the hallway tree fixed. Preserve A-G as comparisons.

Move the textured sofa to (10.8, 17.475), facing decreasing x. Bring the
chairs to (6.45, 12) / (6.45, 22.95), turned 45 / 135 degrees.
Add a 9 x 12 ft oatmeal rug, center (7.8, 17.475), and a soft camel
48 x 32 x 17 in ottoman, center (6.4586, 17.475): 16 in from the sofa.
The ottoman is a footrest/surface, not a sixth seat or approved storage box.
Two textured Poly Haven Side Table 01 assets stand at (10.8, 12.475) /
(10.8, 22.475), uniformly scaled to 20 in high, approximately 20 x 16.3 in
in plan. Add one warm table lamp; no floor lamp or glass coffee table.
The rug, ottoman and lamp are size/finish concepts, not selected products.

Research basis: [Emily Henderson's layout guidelines](https://stylebyemilyhenderson.com/living-room-rules-know),
[coffee-table proportions](https://stylebyemilyhenderson.com/rules-for-picking-a-coffee-table-105-best-coffee-tables)
and [Houzz's family-home advice](https://www.houzz.com/magazine/the-family-home-living-rooms-you-can-live-in-stsetivw-vs~1360608).
Use a connected seating group, front feet on a substantial rug, reachable
central surface, washable-material selection and useful concealed storage.
Design guidelines are not code requirements. Existing fabric textures do
not prove stain resistance, cleanability or comfort.

The model has a checked 36 in strip behind the sofa over x = 13.25-16.25,
z = 10.5-25.5; all furniture envelopes are separate. The existing 12 in
tour avatar can reach all five seat approaches from the hall, and front-foot
geometry falls on the rug. Grid lines remain above the rug overlay.
These checks do not represent five occupied people. The 16 in central gap
is a seating/footrest allowance, not the main passing route. Verify actual
family comfort, occupied passage, sofa-bed opening, rug/pad slip resistance,
fireplace heat clearances, lamp stability and wiring. Route the lamp cord
behind the sofa to a coordinated floor outlet, never across circulation.
Switching layouts must hide all H accessories, light and collision meshes;
thumbnails show rug, ottoman, side tables and five planning markers.

## Hall-center Christmas tree - October 24

The owner moved the seasonal tree into the middle of the open hallway shown
between the living room and kitchen island. Use the midpoint of the shared
Hall room bounds, currently (19.85, 16.3683), for every seating option.
Retain its 7 ft height, 36 in nominal diameter, warm lights, gold ornaments,
cross topper and tour obstacles. This supersedes all dining-corner tree
positions and earlier instructions to keep that placement fixed below.
Verify actual branch spread, occupied circulation around the tree and island
stools, stability, heat clearances and power without cords across routes.
Model placement is not fire-safety or occupied-use approval.

## Downloaded product sofa - October 24

The owner requested actual furniture assets in the living room. Earlier G
uses Khronos' [GlamVelvetSofa](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa),
an actual Wayfair product-based model, copyright 2021 Wayfair, LLC; Eric
Chadwick; CC BY 4.0. Retain visible attribution and the license link.
Uniform display width is 86 in, with approximately 40.2 in depth / 30.9 in
height. Use the authored Champagne fabric, disable its embedded studio light,
ground/center it at (11.25, 17.475), facing the fireplace.

This is a smaller straight sofa, not an equivalent double-chaise product.
F retains the previous sectional and A-E remain earlier comparisons.
Both G and F retain the textured corner armchairs. No built-ins, architecture,
tables or dining furniture change. Use actual scaled dimensions in thumbnails
and downloaded meshes in tour obstacles. Comfort, current availability,
product dimensions, sofa-bed opening, occupied use and heat clearances
remain unverified. The AI-generated FurniMesh candidates stay outside the
repository because their redistribution rights are unresolved.

## Kids-room selected arrangement - October 24

Owner selected both desks south and both storage units north from the
[comparison](kids-room-options.html), then requested both rows shifted east.
PC remains left of homework; both chairs face south. TROFAST bins face south
from the north wall. The east-wall single-desk study is superseded.
Comparison cards remain sampled alternatives, not the final selected offsets.
See the current coordinates and measured gaps in the
[plan reference](floor-plan-reference.md#kids-room-office-bedroom-and-bathrooms).

## Living-room textured armchair assets - October 24

Replace the two simplified STRANDMON stand-ins in default F with
[Poly Haven Modern Arm Chair 01](https://polyhaven.com/a/modern_arm_chair_01)
from the local CC0 library. Keep original material maps, uniformly scale to
32.25 in width (approximately 38.8 in depth / 40.2 in height), center the
geometry and ground its feet. Retain centers (2.7, 10.45) / (2.7, 24.5) and
60 / 120-degree inward turns. These are generic visual assets, not IKEA
products or manufacturer-sized CAD. Earlier STRANDMON clearance figures
and the static Cycles image predate this replacement.

Keep the double-chaise sectional, built-ins, architecture and A-E comparisons.
Downloaded meshes must participate in tour collisions while visible and
stop blocking routes when their layout is hidden. Thumbnail footprints use
the scaled asset dimensions. Occupied access, product fit and fireplace
heat clearances remain unverified.

## Prep dishwasher retained; induction removed - October 24

The owner removed the trial 12 in induction cooktop from the prep kitchen.
Keep the left quartz counter uninterrupted and clear for preparation;
no prep cooktop or cooktop exhaust is planned. The main kitchen's
36 in induction cooktop remains unchanged.

Use an 18 in panel-ready built-in dishwasher immediately right of the
unchanged sink, in x = 48.9-50.4. Replace that cabinet volume, retain
continuous quartz above, and reduce the adjacent cupboard to 23.4 in.
Keep the 34.2 in six-drawer end cabinet. Match stained white-oak Shaker
fronts and a gold pull. Exact dishwasher/product services are unselected.

Keep the mixer/blender in the right-hand appliance row, followed by the
unchanged rice cooker/air fryer: x = 50.3-54.925, with 2 in gaps.
The refined picture window permits all four backs to align at the
backsplash. Retain all four appliance sizes; these are stored positions,
not approved hot/steam operating clearances.

Walls, sink, tower, pantry and robot arrangement stay unchanged.
Closed counter aisle remains about 54.6 in. A sampled 0-90 degree sweep
of the modeled dishwasher panel/pull leaves only about 22.6 in behind the
open door to the pantry front: not an approved occupied passing route.
Verify actual door/rack withdrawal, plumbing/drainage, electrical supply,
counter support, heat/splash separation and ventilation before selection.

## Garage tool-wall asset replacement - October 24

Use local CC0 Poly Haven assets for the five wall tools (adjustable and
combination wrenches, cross-pein hammer, handsaw and drill), four upper
plastic crates and a metal toolbox on the right end of the charging shelf.
Normalize and uniformly scale each model; do not stretch imported geometry.
The toolbox is 16 in wide; crates are 12 x 10.64 x 16.43 in W/H/D.
Keep all three battery docks, two wall shelves and garden tools. Imported
floor-standing shelving is not used because it would obstruct the mower.
Do not restore a workbench or add a low-hanging pendant.

Retain mower/vacuum/blower and all bike/vehicle/step placements. Browser
constituent-mesh bounds found no positive overlap between new props and
existing equipment, excluding intended shelf contact and mounting allowances.
Station floor bounds remain x = 29.55-36.35, z = 27.075-31.905; new top
is y = 6.1965 world / 7.4465 ft above the garage slab. Tool mounting,
crate access, shelf loads and actual charging instructions remain unverified.
The garage-storage camera provides a close-up; asset failures remain visible
startup errors, not silent fallback boxes.

## Vehicle-door visualization - October 24

The owner requested real BMW i4 / GMC Sierra models and on-door opening
controls. Exact-model asset replacement is still pending suitable licensed
files; keep the current BMW i4 and Sierra EV dimensions and parking poses.
Vehicle replacement is deferred at the owner's request. Garage, Bikes and 2D
views use direct clicks/taps on yellow panels, without + / - markers.
Keyboard door controls appear only when focused.
They toggle amber swing overlays at 0 / 60 degrees, not actual manufacturer
door meshes. Both cars use assumed 44 in front / 36 in rear panel lengths.
Keep the approximation warning visible. The closed stand-ins remain visible;
this is not collision detection, a full-sweep check or a fit approval.

## Mudroom garage-side wall - October 24

Move only the mudroom's east wall 8 inches left in total (the initial
6 inches plus 2 more), x = 45.4 to 44.7333 ft,
to widen the garage's forward bay from 10.1 to 10.7667 ft. This supersedes
the 7.9 ft mudroom width and 55 in aisle below: width is now 7.2333 ft,
aisle about 47 in. Move east cubbies/shoe tower with the wall, recenter
the coat closet at (41.1167, 16.4), and shorten the blind returns/top rails.
Keep the prep divider, kitchen openings, garage steps and parked cars fixed.
Retain the 36 in coat approach; arrival allowance is now 54 by 60 in,
not a five-foot square. Additional bay width does not verify a forward
parking position, vehicle operation, fire separation or accessibility.

## 2D floor-plan view - October 24

The existing top-view control now provides a true orthographic, north-up
**2D floor plan** for either floor. Keep furniture and saved layouts unchanged;
dragging pans rather than rotates, with scroll/pinch zoom and the existing
optional one-foot grid. Whole floor and Upstairs return to perspective views.
This viewer-only change does not alter room layouts or verify construction dimensions.

## Eight-foot doors throughout - October 24

All house doors are nominally 8 ft / 96 in tall, superseding earlier 7 ft / 84 in notes. Update ground-floor and upstairs wall openings, leaf geometry, frames and casing together; retain widths, hardware heights, hinge locations and default poses. Front entry, powder entry, guest bathroom, both guest coat leaves and the mudroom bifold now follow the same head height as the office, patio and garage doors. Match doorless cased passages to 8 ft. The guest shower has no door; its fixed splash-glass panels and adjoining tile are nominally 8 ft above the curb. Verify supplier-approved panel glass, supports and safety glazing. Small modeled leaf fitting gaps do not establish rough openings or approved assemblies. Cabinet/appliance fronts and saved layout JSON stay unchanged.

## Living-room Cycles study - October 24

The owner requested the first realistic-render trial in the living room,
not the kitchen. Export the current visible furnished geometry without moving
walls, windows or furniture; keep the interactive model unchanged.
The [result](foyer/living-room.html#cycles-render) is a 1600 x 1000 Blender
4.5.3 LTS Cycles still, 128 samples with denoising. Preserve source colors
and maps; add procedural surface relief, daylight, warm fill and a render-only
ceiling at the nominal 9 ft datum. These are presentation assumptions,
not selected products, designed lighting or verified ceiling construction.
The current export includes the double-chaise sectional and two corner
wing chairs. Existing simplified furniture, flames and glazing limit realism.
The image is a dated snapshot and does not follow later layout changes.

[Rendering script](scripts/render-living-room.py) accepts a local GLB export:

```powershell
& "path\to\blender.exe" --background --python-exit-code 1 --python .\scripts\render-living-room.py -- "path\to\living-room.glb" "path\to\living-room-cycles.png"
```

The script writes the PNG and an editable, texture-packed `.blend` beside it.
The GLB uses the viewer's original foot coordinates; the script converts them
to meters. Export visible meshes with their world transforms, including the
living room and its immediate context (x = -1 to 26, y = -1 to 10,
z = 6 to 31 ft); hidden comparison layouts must stay excluded.

## Interior stair LEDs - October 24 local change

The owner clarified that LEDs belong on the main interior staircase only,
not the garage steps. Add warm-white (2700 K) emissive strips below the
oak tread edges on both flights, inset 1.5 inches from each side, with
recessed-diffuser intent. Preserve stair geometry, railings and bookcases.
Keep the LEDs turned off in the viewer: strip emission and local tread-wash
light intensity are both zero. Retain the strips and recessed-diffuser intent.
Remove the garage LED trial. Protected channels, glare, wiring, accessible
driver and switching need electrician review; rendered glow is not
photometric verification or approval of the stair/landing arrangement.

## Correct shared kitchen wall - October 24

The owner means the LONG cooking wall shared with both prep and mudroom:
move it six inches toward the main kitchen, x = 38 to 37.5. This is not
the gray kids-room return or the separate prep/mudroom divider, which
remains aligned with the adjoining garage wall at z = 15.
Restore the gray return to x = 29, its north-wall end to x = 29, and the
original 10 ft kids-room floor. Remove the incorrectly added corner pocket.

Both 30 x 96 in kitchen passages follow the shared wall to x = 37.5,
retaining z = 9.725-12.225 / 21.675-24.175 and symmetry about z = 16.95.
Cooking cabinets, 36 in cooktop, 48 in hood, uppers and accessories follow
six inches west. Keep the full 8 x 3.5 ft island and four stools fixed.

The complete refrigeration/oven bank also follows six inches west to fit
the moved wall, consuming the removed end pull-out's space. Fridge center
(30.5,25.725), freezer (35.75,25.725), oven tower x = 33.125; bank/cornice
x = 29.1875-37.3. Do NOT widen the original 31.5 in tower or shrink the
30 in appliances/oven allowance. Keep the separate 2.85 in freezer filler.

Kitchen is now 11 ft wide, prep 18 ft maximum and mudroom 7.9 ft wide.
Outer footprint, dining, rear wall z = 7, garage/vehicles and entry steps
stay fixed. Interior area transfers between these rooms without changing
total house area. Sink centers at x = 32; side counter runs are each 45.6 in,
retaining 36 in sink and 24 in dishwasher sizes. Window centers are 28.25 /
32 / 35.75, original widths; 9 in inter-window piers leave tight provisional
cap joints. End sconces center between finished walls and casing, not wall
centerlines. Confirm actual window/header/casing and electrical details.

Prep tower moves to x = 39.375; left counter extends to x = 40.85.
Pantry spans x = 37.675-55.325 (211.8 in), cleaning bay 40.11 in wide,
38.61 in clear. Mudroom west cases shift west six inches, centered coat
closet to (41.45,16.4), blind corners/top trim remain connected; no new
counted corner storage. Keep cubbies/hooks/containers/shoe allowances.
Static cooking aisle is about 60.9 in, sink 44.7 in, fridge door 44.55 in,
mudroom aisle 54.9 in. With the separate divider aligned at z = 15,
prep clearances remain 54.6 in at the counter, 52.5 in at pulls and
51.4 in at closed oven handles. These coordinates supersede the older
kitchen schedules below. Actual occupied use, fridge hinge clearance at the
gray return, structure, services and builder installation remain unapproved.
Keep change narration in Markdown and keep the rejected designer removed.

## Designer reverted - October 24

The owner rejected the experimental wall designer. It has been removed,
restoring the published 9e67ed0 viewer and model. Do not bring back designer
controls or automatic wall editing unless explicitly requested again.
Keep the home-design changes and existing ground/upstairs layout JSON.

## Dining rear-wall forward correction - October 23

The owner corrected "back" to "forward": move the rear/window wall two feet
toward the front from its original -2.1 datum, to z = -0.1. The rejected
-4.1 rearward extension is removed, not the origin for another two-foot move.
Side returns, hardwood and roof shorten accordingly: dining is 13.3 x 8.1 ft,
26.6 sq ft smaller than the original. Rear glazing and sconces follow the wall.
Center the unchanged 84 x 38 in table/eight-chair set and west window at
z = 3.95. Tree moves to (14.9, 1.6), full size, clear of tucked furniture.
Kitchen, living, mudroom, stairs and patio limits remain fixed.

The 6 ft patio assembly must shift 6 in forward, opening z = 0.5-6.5, to
clear the new rear corner/casing without changing the kitchen wall. Same
unit dimensions, inward handing and closed default. Tucked patio-end chair
now conflicts with the door sweep: it must be moved clear for full opening.
Other chairs clear the sampled sweep; 24 in end pull-outs reach side trim.
Do not call this verified occupied circulation or unobstructed patio access.

Keep property/fence/path coordinates fixed. Dining rear wall separation is
now 32 ft; patio/roof setbacks differ and remain unapproved. Foundation,
roof/support, zoning and surveyed site review remain unresolved.
Nominal model area: 1,900.31 sq ft downstairs / 3,947.44 total. Earlier dining
coordinates/setback notes below are superseded. Change notes stay in Markdown.

## Garage side-wall bike trial - October 24

The downloaded Bicycle by Poly by Google now replaces the handmade bike
geometry. Load the local GLB once before building the viewer, rotate its
forward +X axis to -Z, and uniformly scale to 65 inches long. Center the
oriented geometry and place its lowest tire vertices on the garage slab.
Five copies share the asset geometry/materials. Dimensions are approximately
65 x 22.4 x 38 inches L/W/H; these are generic visualization copies, not
manufacturer CAD or true children's-bike sizes. The unchanged GLB is CC BY
3.0; the viewer and garage page credit source, license and display transforms.
Asset-load failures use the existing visible startup error, not old-bike fallback.

Owner clarification supersedes the opposite-wall trial: keep the row on
the right/east wall at (52.5, 21), rotation -90 degrees. Alternate bikes
head-to-tail, not between walls: 1/3/5 front-wheel-in, 2/4 rear-wheel-in,
rotated 180 degrees on the floor. Stands remain wall-side and support
either the front or rear wheel; actual rack compatibility is unverified.

Tighten all five stand/bike centers from 27 to 24 inches at the owner's
request, keeping the row centered at z = 21. Centers are now z =
17/19/21/23/25. The imported 22.3615-inch-wide bikes retain a 1.6385-inch
gap between their entire width envelopes, including during a straight
pull-out. Overall row width drops from 130.36 to 118.36 inches, recovering
one foot along the wall. Adjacent bars still alternate ends. Do not assume
the owner's actual wider bars, hand clearance or turning fit this spacing.
Browser world bounds confirmed the 118.3615-inch row and 1.6385-inch
minimum lateral gap. Each bike's straight westward movement was sampled
every inch through 48 inches with no neighboring-bike envelope overlap.
Only 2.6 inches remains to the west wall at that last pose: turning must
occur before reaching the wall, and a full turning/occupied route is not verified.
The west-side parked aisle remains approximately 50.6 inches. This is
not proof of independent retrieval or a verified route past the vehicles;
do not tighten spacing without checking pedals, saddles and moving bikes.
Vehicles, equipment, openings and steps stay fixed. No overhead storage.

Imported-model browser measurements confirmed five meshes, alternating
0/180-degree parking poses, 65 x 22.3615 x 37.9766 inch dimensions and
all five minima at the -1.25 ft garage slab. The west aisle measures
50.6 inches. Floor/view switching restores the bikes; a simulated missing
GLB produces a visible startup error and no substitute handmade geometry.

Historical handmade-bike checks (superseded by the imported geometry):
browser world-space checks confirmed alternating bar positions x = 53.8 /
51.2 and a 50.64-inch west aisle. Moving each bike straight west through
the first 24 inches, sampled every inch, produced no positive overlap
with neighboring bicycle meshes. This is not a full withdrawal/turning,
wheel-stand release or occupied exit-route check.

## Garage overhead removal and viewer text - October 23

Remove the entire over-bike storage lift, its seasonal bins, ceiling
attachments/suspension and dedicated mobile retrieval steps. Remove their
visibility checkbox, inspection views and access-mode hiding of truck/bikes.
Keep all five floor-parked bikes, vehicles, tools and house-entry steps.
Do not restore an overhead platform or walk-on loft.

Keep change-log narration in Markdown context, not banners, room-page
paragraphs or other viewer text. The owner explicitly rejected the
prep/mudroom divider-change banner. The actual divider geometry remains
as described below; this request does not undo it.

## Pantry rear-wall alignment - October 24

Align the mudroom divider with the adjoining garage north wall at z = 15,
removing the six-inch wall step. Place the 12-inch pantry/cleaning run at
z = 13.825-14.825, against the finished prep-side wall face, not its centerline.
Move the robot dock with that run to z = 14.225. The prep gains 3.95 sq ft
from the mudroom; overall area and kitchen-to-mudroom openings stay fixed.
Move the 36 x 24 in coat closet to (41.45, 16.4) and shorten the blind
returns to start at z = 15.4. Retain bench, side towers, top rails,
garage entry, vehicles and the five-bike trial. Counter/pull/closed-oven
gaps are approximately 54.6/52.5/51.4 in; open-door use remains unverified.
This supersedes the divider offset and pantry coordinates below.

## Prep/mudroom divider - October 23 local change (superseded)

Move only the shared divider x = 38-45.4 from z = 15 to 14.5, six inches
toward prep. This is not the rejected whole-wing shift. Kitchen, island,
paired passages, sink wall, garage entry/steps, vehicles and exterior stay fixed.
Mudroom gains 3.7 sq ft and six inches depth, now 7.4 x 12.4 ft; prep loses
the same strip on its west portion, with 7.5 ft depth there and 8 ft east.
Split the hardwood floor at x = 45.4 and extend mudroom tile to the new wall.

Move the full prep pantry/cleaning/robot assemblies six inches north to keep
their continuous alignment; the east end now stands six inches off its
unchanged wall. Prep counter/tower stay fixed: counter aisle is now 46.5 in,
pull clearance about 44.4 in and closed oven-handle gap about 43.3 in.
These static dimensions do not approve open-oven or occupied operation.
Move the centered coat closet to (41.7, 15.9), retaining its 36 x 24 in size.
Extend the blind corner enclosures north, keeping their fronts, side towers,
bench and common trim fixed and connected. No added usable corner capacity.
The coat door is now recessed six inches relative to the corner-return front.
The older coordinate examples below describe the prior north-wall position;
use this section and the updated plan-reference note for this local change.

## Uniform mudroom enclosure - October 24 photo-inspired finish

Readability revision: the uniform #AAA99A paint blurred shelves and doors.
Use pale sage cases against deeper matte olive backs, ivory closet leaves
with putty recessed panels, and an off-white garage-entry leaf. The owner
explicitly rejected green on this door; use #F2EEE4 instead. Retain the
existing scoped mudroom study lighting; do not recolor shared kitchen
materials or change global lighting. Decorative names change to pale gold
for contrast on the deeper backs. See the current finish table below.
Storage geometry, fitted wall/ceiling closures, door operation and clearances
remain unchanged; these are screen studies, not selected paint products.

The owner rejected the remaining freestanding-style perimeter gaps.
Keep the storage fronts and useful dimensions fixed, but close all exposed
rear/end voids with matching site-fitted scribes/pack-outs: north rear
z = 15.175-15.4 (2.7 in), west/east side gaps (1.8 in), and cubby south
end z = 26.6-26.725 (1.5 in). Finished wall limits are x = 37.675-44.5583
and z = 15.175-26.725. Remove baseboards behind these fitted runs, not
on exposed wall or across openings. Matching top infills close y = 8.75-9;
case tops remain 105 in but the fitted finish reaches the 108 in ceiling.
This supersedes the former intentional three-inch ceiling reveal.
No extra storage is counted. Verify surveyed dimensions, scribing, fixings,
loads and ceiling/services coordination; these are finish closures, not
permission to change the required door/landing/fire assembly.

Personalize cubbies in order: Peter, Lila, Jacob, Ada, Lucas. Treat Peter/Lila
as adults and Jacob/Ada/Lucas as kids. Peter has a jacket and shelf hat;
each child has a jacket and backpack. The owner corrected Lila's coat to
48 in long. Lower her side hooks to 66.6 in; the hem stays at 18.6 in,
0.6 in above the bench. Align all first shelves at 76.2 in, superseding
Lila's earlier raised shelf and 60 in coat. Verify real clothing and reach.
Replace white shelf-edge nameplates with decorative pale-gold script
on transparent backgrounds, directly inside the cubbies on their backing.
Names sit at 61.2 in, below the shelf sightline; no white rectangular plate.
The Cubbies inspection is now front-on with a slight downward angle so
side dividers do not hide the lettering. Other camera presets stay unchanged.
Correct the original back-wall display: turn each garment -90 degrees
relative to its cubby and anchor its hanger loop to the actual right-hook
tip. Turn each child backpack +90 degrees and meet the actual left-hook
tip with its handle. Derive attachment points from hook geometry, not
separate approximate placements. Peter's hat remains on his shelf.
Add a 3/4 in center divider at every basket level, between shelves, keeping
ten 9 in-wide baskets in 10.875 in-wide half-bays.

Flat shoe blocks are replaced with licensed textured Shopify/Khronos
Materials Variants Shoe (CC BY 4.0) and Poly Haven Rubber Boots (CC0).
Uniformly scaled display allowances: sneakers 11.5 in long, adult boots
14 in high under the bench, shelf boots 11 in high, child sneakers at
75% of the adult sneaker scale. Clothing, hat and backpacks are custom
visual concepts; footwear files retain source materials and are unmodified.
See the asset-library README and optional viewer notes for credit/provenance.

The owner requested moving the basket tower to the other side of the kitchen
opening to free the garage-entry door area. The original 8 in depth was too shallow for general
baskets: deepen the separate sage-greige tower to 24 x 12 x 105 in,
x = 37.675-38.675, now z = 18.9-20.9, center (38.175,19.9).
Leave its former z = 24.55-26.55 position empty. Five levels hold ten removable
natural woven basket allowances, each 9 x 10 x 12 in. Keep the sixth/top
shelf and visible high-access label. North kitchen casing clearance is
5.675 in; tower-to-bench gap stays 50.8 in. It is not joined across the doorway.
Close the 16.32 in gap to the north enclosure with a 12 in-deep,
105 in-high fixed open return at x = 37.675-38.675, z = 17.54-18.9.
Six matching shelves meet actual north-case and basket-side panels; matching
backing and recessed plinths join the appearance into one built-in.
Keep ten baskets and seven extra shoe-pair targets; no added capacity claim.
Return supports, anchorage and loads remain unverified.
Interpret the requested inward door as the garage-to-mudroom entry, not
the fixed doorless kitchen opening. Add a solid nominal 36 x 96 in,
1.75 in-thick leaf, west hinge, shown 90 degrees inward by default;
click/tap toggles 0/90. Opening and steps do not move. Modeled bottom
clears finished tile/grout by 1/2 in. The sampled 0-90 degree sweep,
including levers, clears storage. Parked-open door-to-bench gap is about
36.7 in; use the conservative x = 39.875-42.9, z = 21.5-26.5 passing
strip (36.3 x 60 in), superseding earlier arrival rectangles.
This is not occupied-use/accessibility, landing or rated-door approval.
Confirm rated/self-closing/latching assembly, floor gaps and fire separation;
the requested open display is not approval to hold a fire door open.
The owner explicitly removed the pictured west shoe-and-bin section:
delete the 29 in container tower, 14.32 in shoe tower, all their contents,
drop counter/outlet allowance and west top rail. Leave the north-end
enclosures and centered coat closet, east shoe tower and five cubbies.
The old 15-container and 22-extra-shoe-pair totals no longer apply; there
are ten new baskets and seven extra shoe cells beside the cubbies.
The former key/charging nook is removed; a replacement location is unresolved.
Verify actual
baskets, anchorage, loads, garage-door operation and safe upper access;
these static clearances are not an operating or code approval.

The low-console proposal was rejected: the owner wants a uniform enclosure,
not separated low units and visible corner gaps. The latest removal request
supersedes the full U-shaped run; keep remaining case tops at 105 in.
The owner's latest
photo replaces the ivory/putty and stained-oak mudroom palette with muted
sage-greige paint, warm gold and light stone. It supersedes the earlier
no-green direction; do not restore the stronger matcha accent. No room
boundary or opening changes are needed for these storage/finish revisions.

| Element | Current finish |
|---|---|
| Cases, dividers, shelves, fitted closures/returns and top rails | Pale soft sage #C5CDB7; roughness 0.65 |
| Solid cubby and storage backs | Deeper matte olive-sage #627257; roughness 0.95 |
| Center coat closet | Warm ivory #DFD5C2 leaf frames (roughness 0.48), putty #B9AD95 recessed panels (0.7); sage jambs/headwall |
| Garage-entry leaf | Off-white #F2EEE4, not green; roughness 0.5; existing pose/hardware retained |
| Decorative cubby names | Pale gold #FFF0C8, transparent background |
| Bench seat | Warm ivory quartz with soft warm-gray veining, reusing the existing kitchen stone material |
| Removable baskets | Natural woven tan, screen #B89A70 |
| Mudroom floor | 24 x 48 in matte/honed warm limestone-look rectified porcelain, straight lay; long direction along z; matching 1/16 in grout visual target |
| Hooks and closet knobs | Existing satin gold |

Use light stone-look large-format tile and natural woven baskets as accents;
the photo is a finish reference, not a request for more doors or drawers.
Do not mutate shared kitchen or linen materials. This is a local prototype,
not published or a selected door/finish product. Confirm a paint-grade
nominal 32 in standard bifold and surround, physical paint/container samples
in daylight and warm evening light, durable washable finishes, and suitable
stone thickness/supports for the unchanged bench geometry. The new tile
replaces the two-foot-square grid: joints are at 24 in across and 48 in along
the room, with modeled 1/16 in matching grout, not groutless. Verify tile
minimum grout, subfloor flatness/lippage, movement joints, wet-entry slip
resistance, transitions and any waterproofing assembly.

Keep the centered 36 x 24 in coat closet and five cubbies along the
90 x 18 in bench. Upper cubby partitions/shelves now reach its full 18 in
front line without changing the floor footprint, seat height, solid backs,
side-panel hooks or kick-under shoes. Enclose both back corners with
builder-fitted returns, explicitly not counted as accessible storage.
Replace the former overhead shelf bridges with a continuous 1.5 in-high top
rail, underside 103.5 in, physically joining the north/east cases only.

The old west shoe/bin towers remain removed. The relocated basket tower
and its newly connected open return now occupy z = 17.54-20.9. Retain the
18.72 x 18 in east-return tower with seven larger shoe-pair cells,
excluding coat-closet/bench shoes. High shelves are for seasonal/adult use,
not daily child retrieval. Actual shoes/baskets and builder details remain
to verify.

The right return meets the cubbies at z = 19.1. The full coat front keeps a 36 in-deep clear
approach, and the garage arrival floor remains storage-free. Kitchen/garage
openings, steps, room walls, garage parking and other rooms do not change.
Confirm blind-corner construction, supports/anchorage, door operation,
occupied use, high-shelf access and garage landing/fire requirements.

The Coats + bins inspection uses an inside-room 85-degree perspective to
show both inward-facing returns. Portrait framing widens the field of view
instead of pushing the camera through the garage wall. Other camera fields
of view are unchanged. All three mudroom views have Tour starts in the clear
arrival aisle.

## Earlier design review - October 21 (other ideas not implemented)

The room corrections are published as baseline `f25d3ba`. Except for the
superseding mudroom prototype above, the ideas below remain proposals.
Keep the hall walkway,
right-hand truck bay, five mudroom cubbies, fixed kitchen/mudroom opening,
inward bathroom door and closed dining patio-door default. Do not restore the
removed interactive designers.

- **Mudroom low console: rejected.** Do not apply the earlier 70 x 14 x 42 in
  console/15-pair scheme or treat the old comparison drawing as the current
  direction. Use the full-height uniform enclosure above.
- **Guest closet:** use a single 24 in-deep hanging wall along the west side,
  nominally 6 ft long, with part double-hung and five 12 in-deep rear shelves.
  A storage-footprint trial retains about 42 in clear beside the hanging and
  roughly 69.6 + 45.6 in of usable upper/lower rail. Shift the doorless opening
  right to align with that aisle, within the existing bedroom wall
  (trial x = 21.825-24.325). No hall extension. Storage and internal approach
  were checked; the relocated opening/threshold still needs a coordinated
  model rebuild and actual-product review.
- **Guest bathroom:** retain the fixtures and inward operation, but test an
  east-jamb hinge on the same opening. A temporary mirrored leaf cleared
  the fixtures and walls through 361 quarter-degree swing samples and parks
  against the empty east wall rather than projecting along the middle.
  This is a candidate handing change, not a selected door/stop specification.
- **Garage:** the current positions improve a static mirror aisle, not real
  door/tailgate use. The approximately 233 in-long truck needs about
  23 ft 5 in clear length to allow 2 ft at each end; that is a comfort target,
  not a code minimum. Its current front/rear allowances remain about 14/13 in.
  Study extra usable bay depth or a limited mudroom-corner reallocation with
  the architect, protecting cubbies and arrival circulation, rather than
  indiscriminately shrinking the mudroom. Keep both 9 ft vehicle openings:
  a 95.7 in mirror envelope leaves only about 6.15 in per side when perfectly
  centered in a nominal opening. Prefer reachable daily storage and one
  manufacturer-approved seasonal-storage method; do not combine a goods lift
  with permanent walk-up access where standing headroom is absent.
- **Elsewhere:** preserve an actual arrival landing/door-operating area before
  finalizing garage-entry built-ins; professional level/fire/landing review
  remains open. The centered eight-seat dining set still conflicts with the
  patio door when its end chair is pulled out. A closed display does not
  resolve occupied access; revisit the table/door choice before ordering.

Guest-closet and garage architectural proposals remain separate future
decisions. They are not included in the uniform mudroom prototype.

## Double-chaise living-room study

Default F keeps the warm-tan U-shaped sectional and adds two IKEA STRANDMON wing chairs, one in each window corner beside the fireplace media built-ins, angled into the room. The sectional remains chaise-seat-seat-chaise, exactly two regular center seats. Provisional size 132 x 68 x 36 in W/D/H, 42 in center-body depth, four 31 in seating modules and 4 in outer arms; both chaises extend 26 in beyond the center seats. Back/body center (11.25, 17.475), rotation -90 degrees, facing the fireplace. Modeled bounds x = 7.333-13, z = 11.975-22.975 remain inside the living area and outside the stair opening.

Each [STRANDMON](https://www.ikea.com/us/en/p/strandmon-wing-chair-talliden-beige-brown-30628943/) keeps IKEA's 32.25 x 37.75 x 39.75 in W/D/H and 17.75 in seat height. Centers now (2.7, 10.45) / (2.7, 24.5), same 60 / 120-degree turns: 18 in closer to west wall, 2.4 in closer to end corners. Conservative envelope gaps about 5.9 in to west wall and 3.9 in to end wall/guard line. Warm beige/high-back geometry remains approximate, not CAD. No ottomans/book in F. Actual meshes clear trim, cabinets, stone, sectional and guard, but occupied/window/cabinet access and fireplace heat clearances remain unverified.

Retain A-E as earlier comparisons; E preserves the previous corner chairs/ottomans/book and 105-inch sofa, without STRANDMONs. Reload restores F. SVGs use the sectional and STRANDMON placement data; switching layouts updates visibility and tour obstacles, with no hidden chairs or old sofa blocking F. Keep fireplace, flush 24-inch media cabinets, bookcases, windows, stairs, dining furniture and Christmas tree fixed. No living-room tables or floor lamp return. No sectional product is selected; verify actual dimensions, delivery, occupied circulation, cabinet/window access and fireplace heat clearances before purchase. This study supersedes the earlier default-E, no-sectional and chair-free F directions below.

## Guest-bedroom walk-in closet and shower bathroom

October 24 reference correction supersedes the combined bathroom and nearly wall-to-wall shower: separate the sink alcove from the toilet/shower room with a full-height partition and door. Latest follow-up adds a full-height privacy return south of the vanity, leaving an open west-side passage without a door or spanning header. Adapt the supplied arrangement to the existing model footprint; its 6 x 4 / 6 x 3 labels are not measured model dimensions. Hall, exterior, bedroom envelope, queen bed and nightstands remain fixed.

Walk-in x = 19-24.5, z = 34.6-42 remains nominally 5.5 x 7.4 ft, with its east wall ending at z = 42. West-side fittings retain the approximately 82 in run: 43.56 in long-hang shelf, 41.16 in continuous rail, unchanged short hanging and folded-clothes shelves shifted north. Last shelf ends z = 34.925, 0.3 in before modeled north shoe; field tolerance remains unverified. A 24 in clothing allowance leaves 36.3 in at the opposite shoe. Doorless 30 x 96 in opening stays x = 21.35-23.85, z = 42. No opposing hanging or hall encroachment.

Enclosed bathroom x = 24.5-31.2, z = 34.6-39.6 is nominally 6.7 x 5 ft. Sink alcove x = 24.5-31.2, z = 39.6-43 is nominally 6.7 x 3.4 ft and has continuous bedroom hardwood. Its north partition stays z = 39.6. Shorten the 9 ft-high south privacy return at z = 43.2: wall body x = 29.3225-31.2 is nominally 22.53 in long and 4.2 in thick. Its ordinary 3/4 in flat baseboard end return reaches x = 29.26, giving a finished extent of 23.28 in from the east-wall centerline. Finished west end aligns with the closed vanity's frontmost knobs; neither wall nor trim projects beyond the closed vanity. This removes 15.87 in from the former wall body. North face z = 43.025 clears counter and lighting; placing the return slightly south avoids squeezing the vanity between walls. Finished west-end offset from closet east wall face is 55.02 in; passage is open with no door/header. Bedroom nominal envelope stays 12.2 x 11.2 ft at z = 43-54.2 plus the 5.5 x 1 ft west entry nook; the return occupies part of that envelope, not added floor area.

Toilet (26, 35.95) faces south, west of the east-side shower. Shower outer footprint x = 27.825-31.025, z = 34.775-39.425 is 38.4 x 55.8 in; clear interior is 36 x 53.4 in. Rotate its existing fixed-glass/open-entry concept so its 30 in entrance faces west at x = 27.875, z = 36.775-39.275. The sampled 28 in-diameter route runs north through the retracted partition door, then turns east into the shower. It is a geometric check, not occupied, sanitary, simultaneous-use or accessibility approval. Retain step-over curb; fixed glass, splash containment and actual products need supplier/architect review.

East-wall vanity stays 36 x 18 in at (30.2, 41.4), facing west. Facing the sink, provide one left Shaker cupboard door in a 24 in bay and three right pull-out drawers in a 12 in bank, with satin-gold knobs. Use a hollow cabinet with sides, divider, back, floor and recessed plinth; drawer boxes are modeled, not just decorative lines. All fronts start closed. Conceptual drawer travel is 15 in; sample extension against privacy-wall trim and the bathroom route, but usable interiors, basin/trap/services and actual slides need product/cabinetmaker review. Keep centered 21 in basin/faucet, 7.5 in nominal counter each side, 30 in mirror, paired warm 2700 K sconces and low-level night light. West bathroom hook/towel stays (24.6, 38.4), 48 in high. Coordinate compact products, wet-location/GFCI electrical, fixing and occupied sink use. Timber trim stops behind wet/fitted fixtures.

Retain the no-outward-swing preference with a nominal 30 x 96 in pocket-door proposal between sink and wet room: x = 25-27.5, z = 39.6, targeting 28 in finished clear. White paneled leaf starts closed and retracts east into schematic cavity x = 27.5-30.15. The cavity stays inside the partition, outside the closet and garage; framing/header, wall thickness, nonpenetrating fixings, services and acoustic/privacy hardware still need approval. There is no door between sink and bedroom.

Verify products, finished door widths, actual clothes and occupied access, water containment, waterproofing, plumbing, ventilation, electrical and garage separation; not accessibility or construction approval. Sources and current dimensions: [bathroom](bathrooms.html#guest-suite-bathroom), [walk-in](bedrooms.html#guest-suite).

## Over-bike seasonal storage study

Use an 8 x 4 ft goods-only storage-lift concept over the five roll-in bikes, centered (50.4, 18.5), deck top 7.5 ft above garage slab (world y = 6.25), underside 7.25 ft above slab. Eight illustrative bins add storage without changing bike, vehicle, equipment or access-floor positions. The full assembly stays x = 46.4-54.4, z = 16.5-20.5; schematic ceiling attachments sit below the nominal y = 9 allowance. A Visibility checkbox hides the lift independently for bike inspection.

The raised deck has only about 33 in overhead space: not a walk-on loft. Storage access view shows guarded mobile platform steps with the truck and all bikes moved outside. Standing platform 3.5 ft above floor, about 81 in nominal headroom, 30 x 30 in platform, six 7 in rises / five 10 in treads, continuous handrails, 42 in guard, caster allowances. Reach bins without stepping onto the lift. Normal parking restores vehicles/bikes and hides steps. Actual product, load, locks, stowed location and structural/headroom review remain unresolved. Secure/disable the lift for static retrieval; never access it while moving. Lowering/loading also requires the whole bike/people travel zone clear. No people-carrying lift, roof modification or construction approval.

Remove the square wooden sofa-side table (formerly 20 x 20 x 20 in at 11.6, 11.975) from the furnished model, all five layout options/SVG previews, and the furniture list. Do not replace it with another coffee/end table. Keep chair ottomans/books, narrow built-ins, seating, and dining furniture unchanged.

Earlier E comparison: dining-side window-corner chair at (3.6, 10.9), retaining its 60-degree turn into the room, with a matching tan 24 x 20 x 16 in ottoman centered 2.7 ft ahead (about 5.15 in clear). Both ottomans appear only in E, including its thumbnail and tour obstacles, not in default F. Corner and sofa envelopes do not intersect in the model; occupied comfort, cabinet-door/window access and fireplace heat clearances remain unverified.

Default living reading corner: tuck the stair-side lounge chair closer to the window/bookcase corner at (2.9, 24.6), retaining its 120-degree turn into the room. This moves it 8.4 in toward the window wall and 4.8 in toward the stairs from (3.6, 24.2). The matching tan ottoman (24 x 20 in, 16 in high) remains 2.7 ft in front of the chair center, with a blue book on the seat; both follow the chair. Ottoman is shown only in the default layout, leaving alternate studies unchanged. Narrow both fireplace built-ins from 36 to 24 in wide, retaining depth, height, stone adjacency and flush fronts; centers become z = 13.415 / 21.535. Keep the sofa, other chair, and bookcases fixed; the tight corner is not a walking aisle, and occupied comfort and cabinet retrieval remain provisional.

Stair rail cleanup: remove the powder-room-side outer upper-flight rail assembly and adjoining turning-landing side rail, including oak caps, dark bars, and posts. In stair-local coordinates this is the side at z = stairDepth + 0.08 (world z = 34.68). Keep all four stringers, treads/risers, 4 ft platform, both lower-flight guards, upper center-gap guard, and opposite landing-side guard at local z = -0.08. Do not change basement rails, upstairs opening guards, walls, or the stair opening. This supersedes the earlier restoration of guards on both upper-flight edges and both landing sides. This is a visual omission against the existing wall; required wall-mounted handrails, continuous enclosure, and code compliance need architectural verification.

Kitchen-facing kids-room wall: move its north boundary from z = 25.7 to 24.7366667, bringing the wall face to z = 24.5616667, flush with the adjacent tall cabinet's Shaker front (not the pull). Projection increases by 11.56 inches. Extend side returns and room flooring; keep the south boundary at z = 34.6, the doorway at z = 27–31.5, and cabinetry fixed. Split hall/kitchen flooring at the new boundary and match the shared first-floor baseline. Actual framing, clearances, and support remain provisional.

Extend the matching closed-door white-oak media/charging cabinets from both fireplace stone returns to the wall ends, superseding the narrow 24-inch pair. Each run is 74.88 in wide x 26 in high: z = 8.175-14.415 / 20.535-26.775, centers 11.295 / 23.655. Width follows the shared feature-wall endpoints. Retain the 11.76 in overall depth: rear edge x = 0.4 ft, door rails and countertop leading edge x = 1.38, flush with the stone face, not its mantel. Retain the 3-inch rear service gap and tops below the window aprons. Each run has four closed Shaker doors with concealed push latches, a center support, internal equipment/charging shelves and open service rear; no exterior devices, chargers, drawers or open bays. Conceal console/controller storage, charging, power, replaceable USB-C PD charging, Ethernet and accessible TV conduit for at least three HDMI runs inside. Verify shallow equipment/laptop fit, cable bends, closed-door ventilation, charging loads, end scribes/baseboard junctions and countertop/shelf support before fabrication. Stone adjacency is not approved combustible clearance: verify selected-fireplace requirements, noncombustible junctions, anchorage, window and door/chair access. Every live living-layout thumbnail follows the longer runs. Current I has no separate chairs; H preserves its floated chairs only for comparison. Earlier E/F/G corner-chair poses conflict and remain flagged comparison-only layouts. Retain all four under-stair bookcase bays and exposed flat baseboard without shoe molding; no stair-end door or stairwell window is added.

Keep the centered feature wall: finished dining-return face z = 8.175 and stair edge z = 26.775 give midpoint z = 17.475. Stone, firebox/flames, mantel, TV and default F sectional share it; window centers z = 11.675 / 23.275 retain equal 18-inch opening-to-end returns. The furnished wall continues to the stair edge; the designer, exterior west openings and SVGs share the layout. Earlier E retains the dining-side chair at (3.6, 10.9), turned 60 degrees, reading chair at (2.9, 24.6), turned 120 degrees, both ottomans, and sofa (11.6, 17.475). Architecture, dining furniture and A-E comparisons stay fixed; no living-room tables return. Confirm fireplace/furniture heat clearances and actual comfort with the architect.

## Guest powder room and coat closet

Guest coat closet doors are paired solid white-oak Shaker French doors with satin-gold pulls, retaining the 48 x 96 in opening and closed default pose. Two nominal 24 in leaves hinge at the outer jambs x = 7.65 / 11.65, z = 37.5 and meet at x = 9.65; each swings 90 degrees outward into the alcove independently, never slides or folds. Solid panels retain concealed coat storage. Actual stops, occupied circulation and hardware remain unverified.

Powder-room layout redesign supersedes the earlier finish-only refresh and fixed toilet: use a 42 x 21-inch natural white oak Shaker vanity on the north wall at (4.75, 36.225), facing south; relocate the toilet to the northwest at (1.65, 36.45), also facing south. One fixture wall avoids an opposing-fixture diagonal pinch and leaves a connected approach across both fronts. Keep the round brass mirror, paired opal sconces, low backsplash, inset-basin study and low-level night-light concept. Use the same 7-inch engineered hardwood as the adjoining hall, replacing the earlier warm tile floor; confirm product bathroom-use warranty, moisture protection and installation details. The toilet has a separate 30 x 30-inch forward approach west of the vanity and approximately 42 inches to the south wall. Keep the inward door's south-jamb hinge and 90-degree default pose. The powder camera frames the whole layout rather than hiding the toilet.

Implemented taller powder window: one centered west-wall Andersen 100 Series standard size 2640 at (0, 38.05), replacing the shorter 2630. The [2024-25 manufacturer size chart, dealer-hosted copy](https://www.arlcoal.com/m/AndersenWindowsLearnMore/pdfs/Sizing/sizing-windows--100series-casement.pdf) gives an approximately 2.4583 x 3.9583 ft frame and minimum 2.5 x 4 ft rough opening. Shared/furnished/exterior wall cuts use the rough opening; frame geometry uses catalog dimensions. Rough sill/head 4/8 ft, frame sill/head approximately 4.0208/7.9792 ft. Lower half remains frosted to 6 ft; upper half clear, white inside/black outside. The center and width stay unchanged; the nominal head aligns with the 8 ft doors. This is now modeled, not a pending recommendation. See the [window-size comparison in feet](floor-plan-reference.md#powder-room-window-options-in-feet). Standard dimensions are verified; half-frosted product availability, sightlines/night privacy, handing, safety glazing, installation allowances and weatherproofing remain unapproved.

Owner's centered-sink reference supersedes the offset vanity: retain 42 x 21 in overall, but center the basin, faucet and round brass mirror on the actual countertop midpoint, world x = 4.75. Equal counter spaces and paired sconces flank that centerline. Use a 22 in central plumbing cupboard with two Shaker doors, matching 10 in side banks with three narrow toiletry drawers each, and small satin-gold knobs. Keep the oak finish and 48 in-high east-wall brass hook/hand towel at z = 37.25.

Live mesh checks confirm all six drawers clear the cupboard, basin, towel and toilet at 0/15 in extension with the entry door parked 90 degrees inward. The full entry sweep clears closed drawers, but intersects extended right drawers: close those before moving the door. Restore all drawers closed for the sampled 28 in route; do not claim drawer-open occupied circulation. Final plumbing, usable drawer interiors, slides, towel reach, occupied use and accessibility require verification.

Use a separate powder room and guest coat closet off an open hall-facing alcove. Keep the north wall at z = 35.1 and the office north wall at z = 41. Powder bounds are x = 0-7.1, z = 35.1-41 (7.1 x 5.9 ft). The 30 x 96 in east-wall opening at z = 38-40.5 stays centered between alcove finished wall faces with casing room at both jambs. The reach-in coat closet stays at x = 7.1-12.2, z = 35.1-37.5: 24.6 in clear hanging depth, shelf/continuous rail, two closed oak Shaker doors in a 48 x 96 in opening. Both doors face the alcove at x = 7.1-12.2, z = 37.5-41, open east to the common hall, with 37.8 in between finished north/south faces. Guests do not pass through the powder room to reach coats.

Office returns to 12.2 x 13.2 ft, 161.04 sq ft nominal, down 12.2 sq ft; north desk/chair move 1 ft south to desk center (3.8, 42.35). South desk, loveseat, elliptical, office French doors, stairs, exterior footprint, and the 6-inch stair-edge-to-powder-wall-centerline buffer stay fixed. The buffer is not a passage. Shared geometry drives furnished walls/floors, saved layout data and room dimensions; `?view=powder` frames the new arrangement. This supersedes the earlier office expansion and unresolved powder-access notes. Door/frame clear widths, occupied use, accessibility, fixture clearances, ventilation/plumbing, closet hardware, framing and guard separation still require professional review.

Living/stair refinement: remove the ground-floor stairwell window at z = 30 and close its interior/exterior wall opening. Preserve other windows. The earlier 0.6 ft seating shift toward the stairs is superseded by the window-centered layout above. The former south low built-in adjoining the full-length open bookcases is now removed; retain the bookcases.

After swapping stair sides, remove the separate full-length living-side opening guard; this edge now borders the enclosed ascending flight/bookcase, not the basement entry. Retain exposed-edge sloped/landing rails and upstairs opening guards; omit the powder-wall-backed upper outer and landing side assemblies as noted above.

Hall stair runs swapped across their existing footprint: the ground-floor upstairs entry is now on the living-room (lower-z) side, and the basement entry is on the powder-room (higher-z) side. Mirror the complete stair assembly, including landings, rails, bookcase and trim; retain widths, rises, goings, and opening. Upstairs arrival and its open guard edge follow the higher-z flight. Structural support, headroom, and code compliance remain provisional.

## Living-side stair wall replaced with guard

Remove the full-height partition at z = 25.7, x = 0-12.2 between the living room and relocated west stairwell, including its base trim and two wall-mounted sconces. Keep the two living window-end sconces, dining pair and kitchen pair (six total). Guard the north stairwell edge at x = 0.175-10.008333, center z = 26.675, on the solid floor just outside the opening. The 42-inch-high guard uses an oak cap, dark posts and vertical balusters with clear gaps no greater than 3.75 inches; the bottom opening is 1.38 inches. Keep the east hall approach open and retain existing flight/landing rails, under-stair enclosure/bookcases, basement retaining walls and upstairs guards. This supersedes the closed living/stair partition and four-living-sconce notes below. Structural support after wall removal, anchorage, loads, handrail/guard rules and actual headroom require professional review; the model is not safety certification.

## Latest stairs/kids-room swap

Swap the former west-side kids room and central stairs. The shared stair void is now x = 0.175-10.008333, z = 26.775-34.6; turn the complete upstairs/basement assembly 180 degrees so the turning landings are west and hall entries/arrivals east. Retain 44 / 46.9 in flights, eight 7.5 in rises per flight, seven 10 in treads, 48 in turning-platform depth, four recessed bookcase bays, and +10 / -10 ft arrivals. Guard exposed edges; omit the powder-wall-backed upper outer/landing-side guards and the wall-backed west turning-platform end. Ground/upper floor voids, excavation, retaining walls, tour exclusion, and basement camera follow the new opening.

The kids room becomes x = 19-29, z = 25.7-34.6 (10 x 8.9 ft), with its 54 x 96 in west-facing doorway at x = 19, z = 27-31.5. Remove the old east partition at x = 12.2 to open the stair approach to the hall. Refit the existing bench, toy console, table/stools, book display and art; rug becomes 7.5 x 6 ft. No exterior playroom window is modeled: the former west window remains in place as a stairwell window. Office, powder room, bedroom, garage, and exterior footprint stay unchanged.

Upstairs opening/guards follow the west stair; upper arrival x = 10.008333-13.675, z = 26.775-30.683333. Move laundry, machines, and folding counter to x = 19-29.175, z = 26.6-36.2, in the former central stair area. Its old west window becomes the upper stairwell window. Linen/mechanical storage remain east of the laundry; designer validation uses the same relocated fixed opening. These decisions supersede all earlier central-stair/kids-room coordinates, source-stair registration, wall-backed guard omissions, and kitchen-side bookcase orientation notes below. Structural support, headroom, safety glazing, lighting/ventilation, guards and actual circulation require professional review.

Swap verification: 19 layout/autosave tests pass. Browser checks confirm all kids furniture stays inside the new wall faces, ground/upper slabs do not cover the west void, east-side upper/basement arrivals align with the flights, the kids/hall and upper laundry entry remain walkable, and the tour cannot enter the void. The restarted preview server rejects edits over the relocated opening without modifying saved layout data.

## Read-only model and retained layout data

Remove both floor designers: launch buttons, editing panels, editor script, controls and save notices. Retain camera views, tours, grid, visibility controls and read-only loading of existing saved layout data. Preserve layout JSON and shared geometry/validation; do not reset the owner's saved data. Ground overrides still show structure only with a warning; upstairs data retains coordination warnings. No page editing or automatic layout saving.

All bathrooms, including powder rooms and upstairs bathrooms, need built-in warm, dim night lighting independent of main lights. A switch-integrated light is a candidate; final product/location/controls and electrical compliance remain open. See [electrical notes](electrical.html#bathroom-night-lighting).

Owner rejects both front-yard placements. Firepit returns to rear (40, -15), closed/unlit on a 4 ft-square pad, fully cold storage only, not a burn location: current rear clearances still fail Birmingham's checked 15 ft portable-unit separation. Requested firewood rack moves beside the waste-bin area, along the garage wall north of the carts, center (56.65, 22), 8 ft long x 16 in deep x 4 ft nominal stack height, raised/top-covered/open-sided. Cover z = 17.9-26.1, before bin pad 27.4; approximately 33 in paved passage / 40 in to fence locally. Pad infills the wall strip without overlaying existing pavers. Carts/gates/doors unchanged; real lid/rolling clearance and logs <=16 in need checking. Close house separation needs explicit fire/pest/moisture/local review, not a safety endorsement. No approved burn location or construction approval is established. See [storage limits](patio.html#portable-firepit).

Keep both refrigeration doors closed by default. Clicking or tapping either modeled door toggles its conceptual swing to the manufacturer-guide 115-degree full-access angle and back; the hinge and swing geometry are not manufacturer CAD. Verify actual hinges, full opening, drawer withdrawal, and circulation separately.

## House square footage - October 18, 2026

**Source-plan figures suggest approximately 3,637 sq ft, versus approximately 3,974 sq ft from the adapted default 3D model envelopes. Do not present these as interchangeable measurements.** Source ground floor: `2,716.5 total - 671.1 garage - 216.5 porch = 1,828.9 sq ft`; add the upstairs image's unverified 1,808.5 sq ft label for 3,637.4 sq ft. The upstairs label's treatment of the depicted above-garage area is unknown. Model: `1,926.91 ground + 2,047.13 upstairs = 3,974.04 sq ft`, including partitions, circulation, and stair footprints on each story; excluding garage, porch, covered patio, basement, and browser-saved upstairs edits. Model/source differences are 98.01 sq ft downstairs and 238.63 sq ft upstairs, not fully reconciled; the 29 sq ft kitchen/prep extension explains only part. See the [source comparison and first-floor rectangle takeoff](floor-plan-reference.md#house-square-footage---october-18-2026). Model unions and perimeter rectangles were cross-checked; garage, porch, and covered-patio coordinates were confirmed excluded. Neither total is certified living area.

## Whole-house window inventory - October 18, 2026

Current furnished-model count: **29 window openings / 46 modeled units**, comprising **44 casements and 2 fixed pictures**. Ground floor has 18 openings / 27 units (25 casements + 2 pictures); upstairs has 11 openings / 19 casements. Includes the single powder window replacing the pair; the ground stairwell window remains removed. Count paired/stacked sections as units, not additional wall openings. Exclude door-leaf glass, eight garage-door panes, and unmodeled basement windows/skylights. The exterior study has 29 alternate window groups, not additional windows; some facade dimensions/divisions remain unreconciled with the furnished schedules. Maintain the [room-by-room inventory](windows.html#whole-house-window-count) and [both-floor dimension schedules](floor-plan-reference.md#window-schedule) with window changes. Counts are model takeoffs, not approved unit orders or egress/ventilation compliance.

City collection carts: replace the two slim cans with one blue recycling cart and one dark garbage cart, each labeled, with hinged closed lids, pull handles, and large wheels. Full-size placeholder envelopes are 28 in wide across the yard, 32 in deep along the wall, and 44 in tall; centers x = 56.975, z = 29 / 32.5 ft. Expand the matching storage pad to x = 55.725-58.225, z = 27.4-34.1. Keep the 5 ft wall-to-fence placement; carts intentionally narrow the local passage to about 31 in to the inside fence rail, of which about 24 in is paved. Do not claim a clear 3.5 ft route here. Storage is beside the house, not a city pickup location; roll carts through the garage-side gate to the curb for collection. Confirm city-issued dimensions/colors, lid operation, pickup spacing/location, and actual maneuvering; accessibility and collection clearance are not certified.

Garage-side pavers: extend the 3.5 ft-wide outside-gate strip at x = 56.5-60 to z = 52.5 ft, covering the grass gap beside the garage. Keep the direct threshold connection at x = 55.725-56.5, z = 44-47. Add a 3.5 ft-deep turn at x = 55.9-56.5, z = 49-52.5 to meet the driveway without paving over it. This supersedes the former z = 47 endpoint. Do not restore the long east approach to z = 68 or the east front paver strip; retain west/front access, fence, and driveway.

Garage side pedestrian door: solid opaque exterior slab with lever and lockset, not glass. Retain its 3 ft width, 8 ft height, and z = 44–47 position on the east wall in both interior and exterior models. Door construction, weatherproofing, and hardware are conceptual.

Keep this file current when changing the 3D concept. Room requirements remain in the linked room pages; this file records placement decisions and model assumptions that are easy to lose between sessions.

For every design change, update this context and the affected room/model documentation in the same change. Record the current dimensions, placement decisions, assumptions, and verification results so later sessions do not rely on conversation history.

Read the **[current floor-plan reference](floor-plan-reference.md)** first: it consolidates room envelopes, coordinates, furniture, cabinets, windows, openings, stairs, garage levels, clearances, finishes, controls, and unresolved decisions as audited October 18, 2026. Update that reference in the same change. Its current schedules supersede the historical trials and verification snapshots below.

Important audit findings: the patio leaf is shown closed with the higher-z hinge; the bedroom bed faces the entry, not the porch; prep is hardwood; the main sink-counter-to-prep-opening offset is 6 in. The powder-room hall opening, relocated vanity and separate guest coat closet are now modeled; final circulation, sanitary clearances and installation still need professional review.

## English-country exterior - October 18, 2026

- Garage door finish/trim: both nominal 9 x 8 ft doors now use warmer cream (#E6D7B9), with cream panel detailing (#DDCBA7), retained glazing, and dark handles. Add visible warm-taupe surrounds (#A18D70), 6 in side pieces and an 8 in header, 3 in body depth, plus a projecting cap. Keep trim outside the opening: jamb inner faces remain at opening edges, header underside at door head, with no trim across the threshold. No changes to the door locations, garage footprint, lanterns, or lower roof. Colors/profiles are conceptual; verify samples, anchorage, flashing/seals, and actual door travel.

- Exterior shell in the [3D viewer](floor-plan-3d.html?view=exterior): English-country cream limestone, medium-brown shingle gables, black exterior window trim, oak double entry doors, and warm-cream garage doors. The latest simplified gabled entry replaces the separate arched surround; keep white interior window trim.
- Entry cleanup: remove the full-height 'Arched stone entry surround' and its extra vertical legs. Align a single inner pair at x = 11.9 / 19.3, z = 60.5, each 0.65 ft square and 8 ft high, with one 0.95 ft stone foot. Join them with an 8.2 ft-wide header, underside y = 8/top 8.5, under the existing small gable. Shaft-to-shaft clear width 6.75 ft. Keep outer porch columns at x = 1 / 30.2 and all doors, steps, plants and slabs fixed. The two entry lanterns follow the inner pair at world (11.9 / 19.3, 5.8, 60.95), not the door wall. Verify load paths, spans, bearing, footings and roof junctions; this is visual coordination, not structural approval.
- Site placement: shift the house 3.855 ft east within the unchanged 75 x 130 ft lot to leave 5 ft from the east stone-wall face to the innermost fence rail (formerly 8.855 ft). House-local coordinates stay fixed; lot boundaries become x = -13.605 / 61.395, center x = 23.895, with z = -32.325 / 97.675 unchanged. East wall x = 55.725; east fence center x = 60.895 and inner rail edge x = 60.725. Property-line clearances are 5.67 ft east / 13.38 ft west, not 5 ft setbacks. Rear wall face z = -2.325 stays 30 ft from the boundary; front porch-edge clearance 36.48 ft. Original house roof overhang retains 29.58 ft rear clearance; bounded patio cover approximately 30.23 ft. Fence-edge paths, west gate/approach, and lot-plan framing follow the revised boundaries. Verify survey, zoning/projections, gate swings, and drainage before construction.
- Placement verification: rendered stone/fence bounds measure 5.000 ft clear on the east. The lot remains 75 x 130 ft with a 30 ft rear-wall setback. Both gates remain 4 ft wide; 44,340 route samples cover west access, east garage access, and the patio spur without gaps. All paving stays inside the parcel, with no overlapping panels. JavaScript syntax and whitespace checks passed.
- Lot plan provides a top-down view with the property boundary, 75/130 ft labels, front/rear orientation, and rear-setback dimension. The driveway extends to the front boundary; remove the separate 5 ft-wide straight entry walk at x = 13.1-18.1, z = 68 to that boundary. Leave lawn there and retain access from the garage/continuous driveway through the porch-side paver connection at z = 64.5-68 to the steps. Do not reintroduce a paver apron across the driveway. See [lot placement assumptions](the-lot.html#modeled-placement).
- Initial roof/site verification: rendered lawn bounds measured 75 x 130 ft and the rear masonry face 30 ft from the rear boundary. The original 14 roof planes used medium-brown texture; the patio adds one matching plane. Paths reached the front boundary, and lot-plan deep linking, floor/exterior switching, and 390 px mobile layout passed browser checks without page errors.
- Preserve the furnished ground/upstairs models. Exterior mode hides them and disables indoor touring; returning to either floor restores its normal controls and geometry. Front/rear/east/west elevations use an orthographic camera; 3D exterior uses perspective orbit.
- Use the current stepped wall envelopes and floor levels, including the kitchen/prep wall at z = 7, porch at z = 54.2-61.2, and lowered garage. Upper-floor datum is 10 ft, main eaves 19 ft, tallest nominal ridge now 29 ft. Remove the above-garage upper walls/window and replace the former 19 ft-eave/30 ft-ridge garage mass with a single-story roof at 9 ft eaves / 15 ft nominal ridge. Retain the garage footprint and doors. Close the upper loft south wall at z = 36.2, x = 36.5-52, and bedroom east return at x = 31, z = 36.2-53.2. Roof junctions, flashing, and support remain provisional.
- Exterior window styling, porch arch/columns, garage facade, driveway, landscape, and grade are appearance studies, not replacements for interior schedules or approved dimensions. See [elevation assumptions](elevations.html#modeled-exterior). Retain all earlier inspiration images as alternatives.
- Verification: JavaScript syntax and whitespace checks passed. Browser checks confirmed all four orthographic camera directions, finite exterior geometry, exact ground-model visibility restoration, both indoor tours after exterior transitions, and working controls without page overflow at 390 px width.

## Patio, hardscape, and outdoor safety - October 18, 2026

- Patio garden-step shift: move all three treads, contrasting nosings, and recessed markers 24 in left when viewed from the garden facing the house (increasing model x), center x = 49 to 51. Widest bounds become x = 47.6-54.4; z = -2.1-1.2, step dimensions/rises, and rear setback stay unchanged. Resize the terrace pocket/returns and short east-path spur from x = 49.25 to 56.645, z = -5.6 to -2.1, to meet the shifted foot. Keep patio/roof limits, posts, furniture, cameras, other lights, front entry steps, fences, and the other paths fixed. This supersedes earlier x = 45.6-52.4 step and x = 47.25 spur notes.

- Patio-path revision: remove the long north-south connector from the rear fence to the patio steps and restore that strip to lawn. After the eastward house placement, use a short 3.5 ft-wide east-west spur from the east fence-edge path to the step foot, x = 47.25-56.645, z = -5.6 to -2.1. The spur joins the existing path at x = 56.645 without overlapping panels and meets the steps centered x = 49. This supersedes earlier rear-fence-to-steps connector dimensions.

- West front-path alignment: after the eastward house placement, continue the fence-edge path straight at x = -12.355 to -8.855 ft through the west fence return to z = 68, without an inward jog. Center the nominal 4 ft gate at x = -10.605 ft and extend the front crosswalk westward to meet it at z = 64.5-68. Preserve the return's z position. C5 and west access-light aim follow the gate; fixture positions remain unchanged. This supersedes earlier west inward-connector notes and pre-shift x coordinates. Verify gate swing, finished clear opening, and light/camera coverage across the wider west yard.
- Alignment verification: browser geometry checks passed 33,460 paving samples along the west route with no gaps or overlapping paving panels. The 4 ft gate is centered on the 3.5 ft path at x = -6.75 ft, z = 45 ft; C5 aims at that center.

- Latest outdoor-lighting decision: remove all eleven short path-post/bollard fixtures throughout the property and their gold security-plan markers. Do not relocate or replace them; earlier bollard-positioning/count notes below are superseded. Retain two patio ceiling lights, driveway/two side-entry downlights, six recessed step markers, and porch-pillar/garage lantern pairs. Keep cameras, paving, fences, and other geometry unchanged. No path-post dusk-to-dawn scheme remains; actual remaining illumination requires electrician verification.

- Front-porch planting beds: mulch bounds z = 61.2-64.5, west x = 0-10.7, east x = 20.5-30.9, top y = -1.6. Center six 0.9 ft-radius shrub envelopes in each bed at z = 62.85, deriving spacing from bed limits with 0.2 ft nominal foliage-edge margins. Shrub centers y = -0.7 put their bases on the mulch surface. Replace the former offset/floating front rows; rear planting, steps, pavers, driveway, and lawn stay unchanged. Confirm plant species, roots, mature spread, edging, mulch depth, and drainage.
- Roof correction: use a single lower brown-shingle cover instead of the overlapping upper patio canopy and prep lean-to. Center y = 9.5 ft, slope 3/16, roof projection x = 26.5-55.5, z = -2.1-10 including thickness. The house-side section covers the kitchen/prep extension; outdoor patio limits remain z = -2.1-7. This supersedes the earlier all-roof-inside-patio limit, not the outdoor footprint. Posts, beams, and both ceiling lights follow the lower underside. Door/windows, paving, furniture, steps, cameras, and main house roofs remain unchanged. Junctions, support, drainage, and occupied headroom require design review.
- [Covered patio](patio.html#covered-patio-study): restrict terrace/support/furniture/step meshes to x = 26.5-55.5, z = -2.1-7, the 29 x 9.1 ft dining/kitchen-prep recess. No outdoor extension beyond the dining rear line or prep end wall; only the continuous roof extends houseward as noted above. Paving is inset to x = 26.75-55.5, z = -2.1-6.75 and notched around inset steps. Six posts support the concept cover; rotate the table at (37.5, 3.45) with four chairs to fit the shallower space. Retain dining door/windows and clear door approach. Roof spans/attachment, loads, drainage, flashing, and actual occupied clearances need engineering/architect review.
- Inset patio steps stay x = 45.6-52.4, z = -2.1-1.2; roof/terrace/step rear edges remain approximately 30.23 ft from the boundary. The main walk follows the rear fence, z = -31.075 to -27.575, with one 3.5 ft connector at x = 49 to the steps. No path-post lights in the current exterior lighting design. Patio lights/C3/C4 stay unchanged; verify coverage, site rules and grade.
- [Fence and pavers](landscaping.html#modeled-hardscape): keep 6 ft cedar fencing inset 0.5 ft, 4 ft gates, west/east returns z = 45 / 41, and front yard/driveway open. West return sits beyond the first side window with approximately 1.5 ft clear of trim; east return is now 3 ft behind the garage-side opening. Boundary-run endpoints, paver connectors, C5/C6 aim, and access-light targets follow their gates. The 3.5 ft main path follows boundary fences, not the house footprint. Front pavers stop at driveway x = 30.9 / 55.9; no separate street walk. Verify gate swings, widths, drainage, easements, site rules, and access.
- Contrast: taupe-brown stone wraps exterior ground walls from garden grade to y = 1.25, capped at 1.31 ft, without covering openings or changing wall-face setbacks. Darker matching porch-column feet, paver porch/walk, and stone steps replace bright surfaces. Front/patio stairs each have three provisional 5.4 in rises / 13.2 in goings, dark nosings, and warm recessed markers. Walk paving top is y = -1.35, connecting to the lower driveway; actual grade/handrail/slip details require review.
- Patio finish: all three terrace sections, including exposed slab edges, use the house's taupe-brown base-stone color and texture rather than the lighter garden pavers. Clone the base finish with independent paving texture repeats; preserve patio geometry, darker stair/nosing finishes, and all other paving.
- Patio finish verified in the covered-patio view: all three sections match the base-stone color/texture, retain their dimensions and independent texture scales, and leave all three contrasting steps and ten garden-paving panels unchanged. Syntax and whitespace checks passed.
- [Camera/light plan](electrical.html#outdoor-camera-lighting-plan): C1 entry, C2 garage/drive, C3 patio/dining access, C4 rear yard, C5 west path/gate, C6 east path/gate. Cameras are PoE/NVR candidates; confirm doorbell power separately. Plan arrows are intended aim, not lens coverage or verified sightlines. Mask neighboring/public areas, avoid glazing/IR glare, and field-test day/night.
- Garage-side fence return and gate move 2 ft farther backyardward from z = 43 to 41, leaving 3 ft to the side-door opening's backyard-side edge at z = 44. Derive the new line from the fixed door position minus 3 ft. The east boundary-run endpoint, paver connector, C6 aim, and access downlight target follow the gate. Door, carts, house, rear boundary fence, and west gate remain fixed.
- Latest walkway correction: keep a 3.5 ft-wide route at the inside fence edges. After the eastward house placement, west x = -12.355 to -8.855; east x = 56.645-60.145; rear z = -31.075 to -27.575. Preserve a 0.75 ft gap to boundary-fence centerlines (roughly 7 in beyond posts/rails). Leave lawn toward the house except the short east-path-to-patio spur, side-gate turns, and front/garage access. Preserve the omission of path-post lights. These dimensions supersede pre-shift side-path coordinates and earlier side-widening/house-hugging routes.
- Fence-edge walkway checks: paving panels join without overlapping; the 3.5 ft route connects front/driveway via both gates and across the rear fence, with a separate clear connection to the inset patio steps. Restore house-side sample locations to lawn. Fence returns/gate posts have tighter local approach gaps than boundary runs; verify actual gate swings, construction/drainage, accessibility, and lighting along the longer route.
- West-window fence correction verified in the west elevation: nearest fence geometry is approximately 1.505 ft backyardward of the first window's finished trim. West gate/return z = 45; east gate remains z = 43. All ten paving panels remain connected without overlap or intersections with non-gate fencing. C5/west downlight aim follows the gate; no page errors. Syntax and whitespace checks passed.
- Lighting retained after bollard removal: two warm patio ceiling fixtures, driveway and two side-entry downlights, and six recessed step markers, plus porch-pillar/garage lantern pairs. Target 2700 K, downward shielding, dimmable patio, and motion-boost access lighting. No path-post lights or gold plan markers remain. Illumination is illustrative, not photometry.
- Earlier patio boundary checks confirmed the outdoor footprint, six posts, four chairs, inset steps, and non-overlapping pavers. The former 29 x 9.1 ft roof projection is superseded by the single lower cover above. Updated browser checks confirm one 29 x 12.1 ft roof, center y = 9.5, posts/beams meeting its underside, and over 8 inches of modeled clearance above the 8 ft dining opening at z = 0. Roof rear clearance remains approximately 30.225 ft; north walk edge -6.35. Actual structure, occupied circulation, window operation, site rules, grade and surveillance coverage remain unverified.

## Kitchen correction - October 17, 2026

- Source: [user-supplied kitchen/mud-room reference](assets/kitchen-mudroom-layout-reference.png). The fridge/freezer belongs on the **bottom kitchen wall**, not the dark vertical run beside the mud room. The latest request separates the columns with the oven/storage tower: facing the wall from the kitchen, wall/filler, freezer, tower, refrigerator, narrow pull-out, stair bookcases.
- Stair base finish: continuous flat white 8 in-high, 3/4 in-thick baseboard along the kitchen-facing under-stair wall/bookcases, with no quarter-round or shoe molding. Extend to the bottom step with a reduced-height section below the tread and a front return; wrap the landing-end bookcase side with matching flat baseboard. Keep the bookcase plinths at 0.72 ft and first shelf at 0.76 ft so trim does not cover books. Retain stair geometry and guards.
- Front entry: remove the built-in console at x = 18.25, z = 47.5 and its wall picture. Leave the entry wall and floor clear; retain the double doors and wall trim.
- Front entry smart lock: Wyze brand selected for one active leaf of the double door. Exact model, finish, active-leaf handing, and exterior keypad/reader are unconfirmed; do not assume Lock Bolt versus interior retrofit. Show a schematic dark interior housing above the existing pull on the positive-x leaf, provisionally, without changing the doors, glass, or handles. It is not manufacturer geometry or verified hardware fit. Confirm stile/glazing clearance, door thickness, bore/backset, deadbolt versus multipoint compatibility, inactive-leaf astragal/strike/flush bolts, battery access, weather exposure, and free interior egress with the supplier. See [front-entry lock notes](front-entry.html#smart-lock).
- Both columns face into the kitchen. The cooktop stays on the shared kitchen/mud-room wall, above the passage shown in the reference.
- Keep both kitchen-side openings 2.5 ft wide and 8 ft high. The expanded cooking run restores mirrored placement about its new center z = 16.95; both openings stay fixed.
- Latest kitchen expansion: retain the prep entry at x = 38, z = 9.725-12.225, 2.5 ft wide and 8 ft high, 6 in beyond the sink counter. Fill the extra 12 in with matching cooking cabinetry/counter, restoring symmetry about z = 16.95. Move cooktop/hood 6 in toward prep; grow the island from 7 to 8 ft at that same center, with four stools at 24 in centers. Keep lower mudroom entry and refrigeration fixed.
- Mudroom latest: use the uniform full-height enclosure prototype above, not the rejected low console or old open-corner bridges. Matcha/gold, five cubbies, centered closet, personal containers and fixed entrances remain. Closed corner returns, aligned 18 in cubby/return fronts and shared 105 in top rail join the cases; 22 extra shoe-pair targets, about 49 in working aisle, no drawers or expanded room footprint.
- Close the separate prep-to-mudroom opening at z = 15, x = 42-45 with a continuous matching wall and baseboard, without doorway casing. Retain both kitchen-side passages.
- Keep the full-width light-oak prep storage wall x = 38.175-55.325. Restore the oven-side vacuum/broom bay to 12 in deep, x = 38.35-41.5925, z = 13.65-14.65; keep its 37.4-inch clear width, 74-inch-high opening, two upper accessory shelves and cap. Case, mount and slim vacuum/broom remain behind the shelf-front line, restoring 49.28 inches to closed oven handles. Park the 14-inch robot and compact charging base sideways under opposite east-end bay 5: assembly center (53.585, 14.05), rotated 90 degrees, facing west along the shelves. Turn the base with the robot but keep the outlet at the rear wall. No threshold, door or deeper cabinet. Remove only that bay's bottom shelf and its food contents, leaving 27.225 inches clear beneath the next shelf; higher shelves remain. Sideways parking reduces floor projection from 6.8 to 2.2 inches. No self-emptying tower is modeled. Actual wet-vac dimensions, sideways robot approach/side clearances, charging/cord containment, oven heat and open-door access remain unverified; keep chemicals separate from food.
- The other four prep bays stay 12 in deep at z = 13.65-14.65. Three retain six food shelf levels y = 1 / 2.3 / 3.6 / 4.9 / 6.2 / 7.5 ft; the robot bay omits the bottom level. Empty ceiling caps remain. Keep retained shelves' dry-goods jars, packages, baskets, oil and cans; original uprights begin y = 0.75 ft. Shelf loading, anchorage and high-shelf access remain unverified. The provisional 24 x 42 in exterior end-wall window at x = 55.5, z = 12 retains its 51-inch sill and white Craftsman casing; confirm framing and final size.
- The island is now 8 ft long, retaining its 2 ft living-room shift, 3.5 ft width, four stools, and two pendants. Its new longitudinal center follows the recentered cooking run; the refrigerator-side end stays fixed. Preserve the hall route, stair bookcases, and separated refrigeration columns/oven tower.
- The sink/window and prep fixtures remain design concepts; the image does not override the separately clarified fridge placement.
- October 18 exterior-wall move: move the complete kitchen/prep window wall from z = 8 to z = 7 across x = 26.5-55.5, one foot outward/up on the plan. Move its five windows, main sink run, dishwasher/trash, dispensers, dish rack, sill pots, prep counters/sink, microwave/oven tower, and countertop appliances exactly one foot with it. Extend both hardwood floors and adjoining wall returns. Keep the island/pendants, cooktop run, refrigeration/storage wall, pantry shelves, end-wall window, patio door, and kitchen passage positions fixed. The current prep opening starts 6 in beyond the main sink countertop front (z = 9.725 versus 9.225); the earlier 18 in note was incorrect. This adds approximately 29 sq ft to the concept footprint; the source-plan images are unchanged. Foundation, roof, exterior elevation, lot setbacks, and plumbing/electrical changes require architectural verification.
- Prep sink/window layout: the counter/base run spans x = 41.35-55.2 beside the left-end appliance tower; its counter now spans z = 7.225-9.275. Retain the provisional 30 x 18 in stainless single-bowl sink in a 36 in base at x = 47.4, z = 8.25, with a real opening in the quartz top. Two 30 x 42 in exterior windows at x = 45.65 and 49.15, z = 7 retain 51 in sills, 7 ft 9 in heads, a 12 in center pier, and matching white Craftsman casing. No uppers cover this wall. The opposite open shelving and both kitchen passages stay fixed. The counter/shelf aisle grows by 12 in to approximately 52.5 in at the counter edge and 50.4 in at projecting pulls. Window headers, plumbing/venting, waterproof joints, and faucet/window operation require final coordination.
- Prep microwave/wall-oven combination: retain the complete white-oak Shaker tower at the left/kitchen-entry end, x = 38.5-41.25, moving its rear to z = 7.25 with the exterior wall. Keep its 33 in width, 25 in depth, and storage above/below. A provisional 30 x 48 x 24 in appliance envelope spans y = 2-6 ft, microwave above oven; no product is selected. Closed appliance handles now leave approximately 49.3 in to the fixed pantry shelves. Confirm manufacturer cutout/cabinet dimensions, ventilation, electrical supply, mounting, hot-door access, doorway operating clearances, and landing space. The main kitchen steam-oven tower is unchanged.
- Prep counter extension: retain the 34.2 in-wide, 24 in-deep white-oak base at x = 52.35-55.2, now z = 7.25-9.25, with two three-drawer Shaker banks and gold pulls. Keep the left sink-side base at x = 41.35-45.9, with its 1.2 in tower-to-base gap (approximately 0.84 in to the countertop overhang). The quartz top and continuous backsplash move with the run. The counter front is now z = 9.275, increasing the center aisle by one foot. Drawer operation, tower scribing, and wall fillers need final verification.
- Split prep countertop appliances into two compact pairs: mixer and Breville at the left end, spanning x = 41.65-43.542; rice cooker and Ninja at the right end, spanning x = 52.358-54.925. Keep 2 in gaps within each pair, rear edges against the relocated backsplash face at z = 7.26, and bottoms at y = 3.04 ft. Both pairs sit outside the window trim. Left-to-right: stand mixer (12.6 x 16.8 x 16.8 in W/D/H), Breville Super Q (approximate 8.1 x 10.5 x 18.1 in), rice cooker (12 x 14.4 x 12.6 in), and provisional dual-drawer Ninja air fryer (16.8 x 15.6 x 13.2 in). The coffee placeholder and cup remain removed. Leave clear worktop beside the sink between the appliance pairs. Only the blender family is specified; other envelopes are placeholders. This compact arrangement is for storage, not approved operating spacing. Pull appliances forward as required and verify actual dimensions, circuits, splash separation, oven landing space, hot-air/steam clearances, lid/head opening, and drawer access before operation.

### Implemented geometry

[Model code](floor-plan-3d.js) uses feet: x increases rightward and z downward on the source plan; y is height.

| Item | Current model |
|---|---|
| Kitchen footprint | x = 26.5-38; z = 7-26.9 after the one-foot exterior-wall move; approximately 11 ft 6 in x 19 ft 11 in overall |
| Prep kitchen footprint | x = 38-55.5; z = 7-15; approximately 17 ft 6 in x 8 ft; opposite shelving wall stays at z = 15 |
| Sink-wall windows | Central 54 x 42 in fixed picture at x = 32.25, one uninterrupted pane; single 18 x 42 in casements at x = 28.25 / 36.25. All at wall z = 7, sills 53 in, heads 95 in. Reduces the former 66 in center and shifts sides 6 in inward to leave 12 in corner returns for end sconces; retain 12 in piers and white casing |
| Sink-wall end sconces | Matching satin-gold/opal fixtures at x = 26.8177 / 37.6823, y = 6.3, z = 7.205, facing increasing z. Derived from the window-cap ends and wall boundaries; 7.625 in between widest cap and wall centerline. Preserve sink, cabinets, counters, sills, and lighting elsewhere; verify corner mounting/electrical boxes and moisture suitability |
| Kitchen plant sills | Only the three horizontal window sills use smoky blue-gray quartz with pale mineral veining and a satin finish (texture base #98a9b0, roughness 0.32). Side/header trim and aprons retain the plain-white finish. Sills move with the wall to z = 7.1-7.475, retaining rounded edges, 0.5 in end returns, 4.5 in depth, 0.75 in thickness and 53 in top height. The 2 in white apron sits at z = 7.175-7.2375 behind the faucet; no notch. Three pots remain scaled to 55%, with 3.168 in saucers at x = 27.75, 34, 36.75, now z = 7.333333. Sizes and finishes are unchanged. This is a color concept, not a selected quartz product. Verify samples, sill support, sealed movement joints, moisture-resistant trim detailing, drainage and sash operation |
| Sink-wall upper cabinets | Both stacks, cornices, and task lights removed for the side windows; lower cabinets, counters, and appliances retained. Hood-side uppers are also removed in the current hood layout |
| Kitchen wall finish | All main-kitchen-facing wall surfaces use warm ivory quartz from floor to the 9 ft ceiling: sink wall x = 26.5-38 at z = 7; cooking/passage wall x = 38, z = 7-26.9; refrigeration wall z = 26.9, x = 29-38. Window/door cutouts remain; opposite faces in prep, mudroom, garage, and outside retain their finish. The model assigns quartz to room-facing wall surfaces without adding thickness; separate backsplash overlays and kitchen-side baseboards remain removed. Colored quartz sills, plain-white casing/aprons, pots and the sink run follow the relocated wall; the hood stays fixed. Verify slab thickness, seams, substrate/support, sealed joints, window drainage, and cooktop heat limits before fabrication |
| Sink basins and accessories | Nominal 36 in white apron-front sink centered at (32.25, 8.2), with a low divider, smaller left / larger right basins at approximately 35/65 by clear width, based on candidate Kohler Whitehaven K-6427-0 (10 5/16 / 18 13/16 in bowl widths). Two drains. Rear quartz mounting deck z = 7.175-7.495; main faucet x = 32.25, separate hot/cold filtered-water dispenser x = 31.2, soap pump x = 33.3, all now at z = 7.36. Simplified geometry, not manufacturer CAD; see [candidate and installation checks](kitchen.html#sink-and-dispensers). Exact 30/70 remains preferred; 50/50 excluded |
| Dish rack | Compact stainless-look wire rack with a neutral removable catch pan, three small white plates, and a utensil cup, right of the main sink above the dishwasher. Pan 16 x 14 in with a closed bottom and four raised rims; no spout or automatic drain. Remove and empty accumulated water manually. Center x = 34.6, now z = 8.3, at counter height y = 3.05; pan footprint x = 33.933333-35.266667, z = 7.716667-8.883333. No selected product; verify pan removal, cleaning access and actual fit |
| Freezer / fridge centers | (36.25, 25.725) / (31, 25.725); fronts face decreasing z; freezer is view-left beside the mudroom wall, fridge view-right beside the stair-side pull-out; handles face the intervening tower |
| Fisher & Paykel columns | View-left freezer RS3084FLJK1, view-right fridge RS3084SRHK1; each nominal 30 in bay, 29.75 in-wide body, 84 in high, 24 in body depth; reserve 25 in cavity depth |
| Bottom-wall cabinetry | Separated 30 in appliance bays, four 0.75 in framing panels, 31.5 in central oven/storage bay, and recessed 2.85 in wall-side filler; retain the 6 in stair-side pull-out and overall x = 29.1875-37.8. Tower narrows 0.75 in to accommodate the added divider |
| Stair-side end storage | Closed 6 in-wide x 25 in-deep tall pull-out at x = 29.1875-29.6875 beside the fridge; matching single-door upper and extended cornice; stained white-oak Shaker fronts and gold pulls. Clears stair end-wall face x = 29.175 by 0.15 in in the model; scribing, usable width, hardware, ventilation, and operating clearances unverified |
| Fridge-wall finish | Floor-to-ceiling warm ivory quartz on the kitchen face, including wall sections beside and behind the refrigeration cabinetry; no counter niche is restored |
| Top / bottom run envelopes | Top x = 26.7-37.8, counter now z = 7.175-9.225; fridge bay x = 29.75-32.25, tower x = 32.3125-34.9375, freezer bay x = 35-37.5; cavity z = 24.641667-26.725 unchanged |
| Refrigeration upper storage | Aligned stained-white-oak Shaker cabinets y = 7.15-8.85 above both columns and the pantry, all 25 in deep; continuous oak cornice fills y = 8.85-9 to meet the ceiling |
| Oven/storage tower | 31.5 in central bay at x = 33.625 with 0.75 in sides and a 30 in clear appliance allowance. Retain the provisional steam oven at y = 3-5, Shaker storage above/below, gold pulls, toe-kick, and overhead storage. Not a verified manufacturer cabinet/cutout |
| Island countertop center | (28.65, 16.95); x = 26.9-30.4, z = 12.95-20.95; 8 ft long, 3.5 ft wide. Extends 12 in toward prep while refrigerator-side end stays fixed. Base, drawers, waterfalls, toe-kick, stools, pendant centerline, and camera follow |
| Counter clearances | Cooktop to island 66.9 in; sink to island 44.7 in; closed refrigeration fronts to slab 44.55 in. These are unoccupied model measurements, not seating or door-swing approval |
| Cooktop / hood center | (37, 16.95), midpoint of doorway edges z = 12.225 / 21.675. Base/counter spans z = 12.527083-21.372917, width 106.15 in, meeting both casings. Side drawer fronts grow to approximately 33.1 in with paired cup pulls; retain 1.5 in fillers |
| Cooktop alignment inspection | Orthographic preset targets (37, 5.3, 16.95). Hood margins to openings equal 32.7 in. Hides island, pendants, and accessories for inspection |
| Reference-style cooktop hood | October 19 reference: warm off-white plaster, constant 48 in width, depth taper 24 to 13 in, rear x = 37.8, center z = 16.95. Plain plaster lower edge replaces walnut band at y = 6.3-6.5; cornice aligns with cabinets at 9 ft. Concealed 46 in insert allowance remains; verify liner fit, adjacent combustible cabinets, heat clearances, ducting, and service access |
| Hood-flanking upper cabinets | Two approximately 27.6 in-wide x 12 in-deep stacks touch the hood sides with no gap. Bottom y = 4.55; main/top doors split at 7.6; cornices y = 8.85-9. White-oak frameless Shaker doors, gold pulls, and under-cabinet task strips. Inset outer ends 1.5 in from base-run ends to clear casing; hide with hood in Fridge wall inspection |
| Above-hood bridge storage | Remains removed; the hood itself meets the ceiling cornice between the flanking cabinets |
| Cooktop finishing details | Warm ivory quartz covers the complete kitchen-facing passage/cooktop wall at x = 37.825, floor to ceiling, with both doorway cutouts retained. Replaces the separate above-counter backsplash overlay. Hood task light, accessories, and exposed white casing remain. Slab seams, support, joints, drawer operation, fillers, installation and heat clearances remain provisional |
| Mud-room opening with exposed casing | x = 38; z = 21.675-24.175; y = 0-8, unchanged. Cap ends at z = 24.539583, 1.225 in before the tower panel; mirrors prep about new center z = 16.95 |
| Prep opening with exposed casing | x = 38; z = 9.725-12.225; y = 0-8; remains 6 in beyond the sink counter. Expanded cooking run now fills the former 12 in gap beside its casing |
| Mudroom coat closet | Back-wall center (41.7, 16.4), 36 x 24 in, faces increasing z; normal transverse rod, shoe/seasonal shelves, standard bifold; clear full-front approach |
| Mudroom personal storage | Containers (38.908333, 19.941667), 29 x 14 in; west shoe return (38.908333, 18.136667), 14.32 x 14 in; right return (44.325, 18.32), 18.72 x 18 in. Seven west + eight upper + seven right extra pair cells; closed corners and continuous 105 in top rail |
| Drop-zone center | x = 43.3; z = 16.1; faces increasing z |

Both passages remain 2.5 ft wide and 8 ft high, centered at z = 10.975 / 22.925 and mirrored about the recentered cooking run z = 16.95. Verify finished widths, appliance swings/bin withdrawal, tower operation, and occupied circulation. Four stools remain, now at 24 in centers; none occupies the appliance end. Construction clearances remain unverified.

Column references: Fisher & Paykel [RS3084SRHK1 refrigerator](https://www.fisherpaykel.com/us/cooling/integrated/30in-series-9-integrated-column-refrigerator-water-rs3084srhk1-26884.html) and [RS3084FLJK1 freezer](https://www.fisherpaykel.com/us/cooling/integrated/30in-series-9-integrated-column-freezer-ice-rs3084fljk1-26891.html), already listed in the appliance package. Retain the left-hinged freezer and right-hinged fridge, with pulls toward the central tower. Stainless panels, handles, toe-kick grilles, and cabinetry are concepts, not manufacturer CAD. Verify separate-column installation requirements, panels, handles, ventilation, services, hinge-side fillers, full door swings, and pull-out access before fabrication; the former paired-installation arrangement is superseded.

Fridge-wall composition: move the freezer 33 inches toward the mudroom wall, leave the fridge at x = 31, and relocate the oven/storage tower between them. Add the separating oak panel, narrow the tower bay from 32.25 to 31.5 inches, and retain the existing 2.85-inch recessed filler, stair-side pull-out, full-depth uppers, and continuous ceiling-height cornice. Each refrigeration bay has its own upper rail; no paired rail crosses the oven tower. No central counter niche is restored. Keep all four stair bookcases. The Fridge wall camera centers on the run and temporarily hides the island, pendants, and foreground cooktop hood; other views retain them.

Camera toolbar now uses room-by-room navigation, superseding the earlier compact combined-view list. Keep Whole floor, Upstairs, Exterior and 2D floor plan controls; show one button per room on the selected floor, including Powder room and separate Living room, Dining room and Prep kitchen. Include closets, halls, guest entry, porch and stairs. Upstairs buttons follow the current room data and switch to the correct floor, including on deep links. Remove the combined Living + dining / Prep + mud and Cubbies / Coats + bins toolbar shortcuts, but preserve their inspection presets and links. Wrap controls above the canvas without changing room geometry, saved layout JSON, tours or grid behavior.

Virtual tour: Tour toggles third-person exploration on/off; clicking an open floor area in an overview also enters there. Click destinations to travel automatically around obstacles at 4 ft/sec. The camera follows a simple avatar with obstruction protection. First person, the wide control bar, Stop/Exit buttons, and visible instruction/arrival text are removed. Retain only a small expandable Floor plan button for destinations out of sight; routine announcements and map keyboard instructions are screen-reader-only. Invalid destinations show a short notice. Toggling Tour off or pressing Escape restores the previous view and navigation mode; room buttons, Reset, and Home also exit. Dragging, focus loss, or moving the freezer pauses travel. Routes use a 6-inch grid with collision-checked smoothing. The tour stays on the ground floor and excludes the stairwell; boundaries are conceptual, not construction-clearance certification.

Preview controls: Upstairs designer opens the editable 2D upper floor and returns to its rebuilt 3D view. Keep both refrigeration columns closed by default and operable by clicking/tapping their leaves; no separate freezer state/swing button is used. Retain full-height walls, no dining pendant, and island lights hidden by default, independently toggled through Visibility and preserved during the page visit. The [manufacturer planning guide](https://dam.fisherpaykel.com/KZ3PKN00/at/4x5pbm7jwvsqb43xhkncmpt5/FP-PlanningGuide-RS3084SLK1-IntegratedColumnFridge-CA-US-90001472A.pdf) still governs actual appliance operation; the conceptual swing does not validate hinges, panels, handles, bin withdrawal, or doorway circulation.

Doorway trim visibility: retain the exposed 3.5-inch side boards on both faces and the standard casing profile, without the earlier mudroom build-out. Both openings have 2.5 ft modeled widths and 8 ft heights. Move both mudroom jambs 6 in toward the oven tower, not just one jamb. Keep the prep opening and tower fixed; recenter and widen the cooking run into the reclaimed wall space. Appliance operation and final trim clearances remain subject to detailed coordination.

Stair-side opening: retain the open backdrop at x = 26.7-29.6875 to expose the stair rails and extended bookcases. Keep the kitchen wall at z = 26.9 full height from x = 29 to 38, including its turning-landing end-wall junction. Full-height tower framing meets that backing wall; the earlier short-panel backsplash return is removed. Recess the right-wall filler behind the mudroom casing rather than intersecting it. Show the staircase in Kitchen and Fridge wall views as well as whole-floor views. Preserve the turning-landing end wall, stair enclosures, and guards. Structural support and stair protection need architectural verification.

## Retained concept decisions

- Upstairs study: add a separate selectable floor at y = +10 ft, provisionally 9 ft ceiling height, using the [dimensioned](assets/upstairs-dimensioned-reference.png) and [furnished](assets/upstairs-furnished-reference.png) references. Include four bedrooms, primary bath/toilet/closet, bedroom-2 bath/closet, two front bedrooms with separate closets, two shared baths, loft, laundry, linen, and mechanical storage. Remove the source's 24 x 13 ft “Above garage” area entirely: no upper slab, room, label, tour area, or upper exterior volume/window. Retain the garage below with a single-story roof; the loft and bedrooms stay unchanged. See [upstairs room dimensions and caveats](upstairs.html#model-study).
- Upstairs registration: preserve the existing central ground-floor stair, +10 ft upper arrival, and 4 ft turning landings; adapt the upper hall and floor void to it. Do not move the lower stair to match the source's left-wall stair. Put laundry in that old stair area and relocate linen/mechanical storage east of the actual stair. Room/fixture coordinates are traced/adapted envelopes, not approved clear dimensions or a verified 1,808.5 sq ft area. Interpret source “Room 20” as the bath shown in the furnished image.
- Floor controls: Upstairs isolates the upper rooms and retains the connecting stair below; Whole floor/ground room buttons restore the ground model. Top view follows the selected floor. Tour and the clickable map operate on the selected level with height-correct avatar/camera/marker and stair-void protection; selecting a floor exits Tour. Continuous walking up/down between stories is not implemented. Upper room labels hide during Tour. There is no room/floor above the garage's front section. Open doorway cutouts do not verify swings; proposed windows, roof/headroom, bearing/spans, MEP, fire protection, guards, and egress remain unverified.

Wall-side stair extension: close the unused strip between the wall-side flight and the adjacent wall at z = 34.6 ft. Extend the upstairs wall-side treads/risers/soffits and arrival landing, plus the basement entry flight, to the wall's inner face z = 34.425 ft. Tread width increases from 44 to 46.9 inches; kitchen-side/return flights stay 44 inches. Widen both turning landings, the floor/site opening, and below-grade enclosure consistently. Basement wall-side rails remain 0.08 ft inboard of the edge; upstairs outer rails and the adjoining wall-backed landing guard are now omitted for the wall enclosure. Runs, rise counts, bookcases, and doorways are unchanged. These are tread widths, not certified handrail clearances.

Add below-grade stairwell walls without blocking the entry. Omit the level ground-floor opening guard assemblies along the wall-backed right and rear edges; these floated above the descending stairs. Keep the sloped flight handrails, guard bars, and posts, plus the upstairs center railings and exposed landing guards. The Basement stairs cutaway temporarily hides the surrounding shell and upstairs stair geometry.

Steam-oven placement: relocate the tower between the separated fridge and freezer, retaining a generic 30 x 24 x 24-inch oven envelope starting 36 inches above the floor, Shaker storage above/below, and overhead cabinetry. The 25-inch-deep tower now has a 31.5-inch bay and 30-inch clear width between provisional 0.75-inch sides; this is only an envelope fit, with no additional installation tolerance or selected cutout. Verify the chosen model's minimum cabinet width, cutout, ventilation, shelf load, electrical and water/drain needs, hot-door access, and landing surface. The final cabinet width may need revision. Existing appliance package pricing is unchanged.

Latest island treatment: retain the [waterfall reference](assets/waterfall-island-reference.png), plain oak base, three drawer banks, gold pulls, and two 2-inch quartz ends, now at 8 x 3.5 ft centered (28.65, 16.95). Preserve the 2 ft living-room shift. Four 18 in stools sit hall-side at 24 in centers, with 6 in nominal seat gaps and 3 in end margins. Pendants follow the new center. Comfort, stone support, knee room, occupied circulation, and appliance access remain to verify. This supersedes earlier island sizes and checks below.

- Ceiling study: 9 ft throughout, controlled by `ceilingHeight` in the model. Lower the fireplace veneer, refrigeration tower framing and uppers, hood chimney, and pendant cords to suit. Keep appliance sizes, pendant shades, 8 ft openings, and low porch walls. Stair floor-to-floor height now follows the ceiling plus a provisional 12-inch floor assembly, giving 10 ft rather than the old 11 ft placeholder. Actual floor assembly depth and stair headroom remain unverified.
- Windows: Andersen 100 Series casements where operable, fixed picture windows where specified by the current room schedules, Black exterior / White interior with white Craftsman trim. Use the shared helper's picture option for one fixed pane without a crank; operable units retain white crank/lock hardware and no decorative grilles. Models and dimensions are concepts, not manufacturer CAD or approved standard units. Preserve custom kitchen quartz sills and use the current room schedules for opening sizes. Verify units/combinations, framing, egress, safety glazing, and hardware. Keep the front double-door opening at x = 13.1-18.1, z = 54.2, without sidelights/transom. See [window schedules](windows.html) and manufacturer resources; door leaves/glazing stay unchanged.
- Interior casing: match the supplied craftsman-style reference with white 3.5-inch flat side boards, 5.5-inch headers, small header beads and projecting caps, plus window sills and aprons. Add casing to every modeled window assembly and both faces of internal floor-level openings; exterior door assemblies receive interior casing only. Floor-level openings have no sill/apron across the walkway. Walls and trim remain at full modeled height. Profiles are provisional; cabinet junctions, scribing, returns, and door operation need finish-carpentry coordination.
- Base trim: clean, flat painted baseboards matching the white interior casing; no quarter-round or shoe molding anywhere in the house, including upstairs and under the stairs. Ground-floor baseboards remain 8 inches high with provisional 3/4-inch thickness; retain existing upstairs flat profiles. Extend perpendicular wall-end junctions to adjoining wall faces for flush corners, without extending into doorway jambs. Trace exposed wall faces across the plan, including inside/outside corner miters and wall-end returns; remove portions buried in intersecting walls. Stop at doorway casing without crossing openings. Casing side boards meet their headers without a floating gap. Apply to finished interior faces, including prep kitchen, mudroom, and bathrooms; omit exterior, porch, garage, and main-kitchen quartz faces. Built-ins may conceal trim; coordinate flooring edges beneath baseboards and final cabinet junctions with finish carpentry.

- Hall staircase: U-shaped stairs beside the garage, above the closet/bath on the source plan. Kitchen-side treads are 44 inches wide; the extended wall-side flight is 46.9 inches. Lower flight climbs toward the garage-side turning landing; upper flight returns toward the entry hall. Oak treads, light risers, and dark guards with sparse posts match the concept finishes. Flight bars follow the stair slope; landing bars are level. Omit the upper-flight outer rails, adjoining wall-backed landing-side guard, and wall-backed landing-end guard. Keep center-gap and exposed-edge guards; final required handrails need architectural verification.
- Keep the space beneath both stair flights and the turning landing enclosed, not an open passage. Recess four 11-inch-deep bookcase bays into the kitchen-facing lower-flight/landing enclosure, with cream carcasses, oak shelves, and a few books. Two 20-inch-wide bays step upward beneath the flight; taller 21.3-inch and 26.7-inch bays now span the 48-inch landing frontage, ending at the existing wall face x = 28.825. The fourth bay replaces the solid infill behind the now-removed left kitchen drawer bank. Fit the side panels and backing beneath the 0.1 ft oak top, place the backing between the sides, and stop shelves/plinth at the backing's front face to avoid coplanar overlapping joints. Retain solid backing and slope-following infill above the cases, stringers below the treads, the wall-side/kitchen-side flight widths noted above, and the entry route beneath/beside the separate upper arrival landing. Cabinet depths, framing/support, and required stair fire protection remain provisional.
- Upstairs stair guards: omit oak handrails, dark guard bars, and posts along the upper flight's wall-backed outer edge and the adjoining wall-backed turning-landing side. Existing ground-floor walls and planned upstairs walls enclose this side; do not add a replacement guard or change the walls. Keep the inter-flight gap open with guards, not a solid dividing wall, and retain guards on the lower flight and exposed kitchen-side landing edge. Preserve stair treads/stringers, soffits, kitchen-facing bookcases, and the basement staircase. Required wall-mounted handrails and final wall/guard details need architectural verification.
- Stair surface cleanup: keep the stringers beneath the flat oak treads. The kitchen-facing enclosure spans each full tread run below the riser bottom, including thin side panels before the first bookcase; recess only the upper infill beside the riser thickness so no vertical slots remain above the shelves. Preserve the hollow stairwell and four recessed bookcase bays. Basement risers fit between tread surfaces without overlapping the wood. Upstairs top risers sit before the landing edge and stop at the 0.2 ft landing slab underside. Below-grade walls stop at the ground-floor slab underside, and the soil excavation reaches their outer faces to avoid coplanar overlaps. Preserve tread dimensions, landings, and railings.
- House-door interaction: click/tap modeled door leaves to toggle hinged doors, bifolds, pocket sliders and exterior overhead doors to their modeled endpoints. Ordinary hinged leaves use a conceptual 180-degree endpoint, selected refrigeration columns use the manufacturer-guide 115-degree limit, bifolds 90 degrees and sliders their modeled track endpoints. The guest shower is doorless, with fixed splash glass. Preserve each saved default pose; the patio door stays closed at 0 degrees on reload/view changes and has a keyboard-accessible button. Hidden/obstructed leaves cannot be clicked through walls, and camera drags do not toggle. These display limits do not verify product stops, structure or operating clearance. The patio-end chair conflicts with the full modeled sweep, even when tucked: move it clear before real operation. The door toggles do not move furniture or approve clearance. Vehicle doors retain their separate control.
- Stair geometry: set both stacked U-turn landing platforms to exactly 4 ft deep, retaining their approximately 7 ft 10 in width across the two flights. Keep the garage-side end at x = 28.825 and move the flights/opening start from x = 17.4 to approximately 18.992, about 19.1 in toward that wall. The opening/run length becomes 9 ft 10 in; extend the adjoining hall floor into the recovered strip. Soffits, guards, basement excavation/retaining walls, and four bookcase bays follow the shared geometry; do not leave an unguarded gap behind the landing. Keep sixteen 7.5-inch rises per level, seven 10-inch treads per flight, 44/46.9-inch flight widths, turning elevations +5/-5 ft, and arrival elevations +10/-10 ft. The separate upper arrival landing remains 3 ft 8 in deep and moves with the flights. The 10 ft floor-to-floor height still assumes a 9 ft ceiling plus a provisional 12-inch floor assembly. Platform dimensions are not certified clear dimensions between rails. Verify the shifted entry route, actual basement depth, framing, headroom, handrail/guard details, and code compliance with the architect.

- [Base plan](assets/ground-floor-3d-source.png): use this dimensioned stepped-footprint plan, not the different October 4 layout. Model scale is approximate; walls are 9 ft high for the current ceiling study.
- [Kitchen](kitchen.html): center the main sink window, nominal 36-inch unequal-bowl farmhouse sink, and main faucet between the side walls. Prefer 30/70 or similar, never 50/50; current candidate is approximately 35/65 with a small left bowl and large right bowl. Add a separate hot/cold filtered-water dispenser and built-in soap pump on the rear quartz deck. Equal countertop lengths flank the sink; trash stays immediately left and the provisional 24-inch dishwasher immediately right when facing the window. Two side windows replace the former sink-wall upper cabinets. All three window bottoms are now 53 in high, with continuous veined quartz sills, plain-white casing/aprons, and full-wall quartz behind them. Sink support, fixture holes, services, window operation, standard unit sizing, structural headers, and moisture detailing remain provisional. The induction cooktop is 36 inches wide.
- All closed cabinetry: light natural-stained white oak, Shaker recessed-panel doors and drawer fronts, frameless boxes with full-overlay fronts, and satin-gold pulls. Apply throughout the kitchen perimeter, island, prep kitchen, mudroom coat/drop-zone cabinets, bathroom vanities/linen storage, and other modeled closed storage. Door rails and stiles are not cabinet face frames. Preserve open shelving, appliance finishes/handles, cabinet footprints, counters, and flooring. Confirm stain, sheen, hardware, and protective finishes on physical samples.
- Drawer hardware: use [Top Knobs Dakota Charlotte M2223 cup pulls in Honey Bronze](https://www.topknobs.com/collections/charlotte-cup-pull.html) on the main-kitchen perimeter, island, and prep-extension drawers. One centered cup per drawer; pair them at quarter points on drawers at least 30 in wide. Manufacturer dimensions: 3 3/4 in overall length, 1 1/8 in height, 15/16 in projection, and 2 9/16 in mounting centers. The model approximates the curved, downward-open cup, decorative front screws, and finish; it is not installation CAD. Keep existing bars on hinged doors, tall/trash pull-outs, and appliances. Confirm finish and drilling with physical samples.
- Island: 8 x 3.5 ft waterfall design centered with the cooking run at z = 16.95, with extended oak storage, three Shaker drawer banks, Honey Bronze cup pulls, toe-kick, and quartz ends. Four 18 in stools form one hall-side row at 24 in centers; no end stools. Retain the 2 ft living-room shift; pendants follow the new center. Confirm comfort, occupied circulation, stain, and stone support.
- Finishes: Accessible Beige SW 7036 screen approximation; continuous 7-inch light-oak planks across hardwood rooms, hall, and prep kitchen. Mudroom and bathrooms retain tile; porch paving and garage epoxy remain separate.
- Living/dining: E stays the current/default seating layout. Retain the sofa's 2 ft move toward the fireplace at x = 11.6, facing decreasing x; center it with the fireplace and window pair at z = 17.475. Float chairs at (5.5, 12.675) / (5.5, 22.275), rotated 60 / 120 degrees toward the sofa and conversation center. Both low fireplace cabinets are removed. The tree belongs in the dining corner, independently of the seating options. Remove the lamp, small rectangular chair-side table, and square sofa table. Modeled chair-to-sofa bounding-envelope separation is approximately 26.8 in, not a certified walking aisle. Preserve the [105 x 46 x 37 in sofa reference](https://www.crateandbarrel.com/lounge-deep-105-leather-grande-sofa/s336140). Verify occupied comfort, access, heat clearances, and power.
- Living layouts: the viewer applies J, the oatmeal L lounge, and no longer shows a layout lab or furniture cards. Earlier alternatives remain defined in `livingLayouts`; their notes, the furniture references and the former model-assumption panel are kept in [viewer reference notes](viewer-reference-notes.md). Verify comfort and cabinetry operation.
- Living accent lighting: four matching satin-gold/opal sconces. Keep the kids-room-wall pair at x = 3.4 / 8.8, y = 6.3, z = 25.495. Move the return-wall pair to the two outer ends of the window group at x = 0.95 / 12.25, y = 6.3, z = 8.205; no lights between windows or on the fireplace. Verify electrical boxes, mounting, dimming, and glare; illumination is illustrative.
- Exception to the general casement direction: the center living return-wall unit is now a fixed picture window. It retains Black exterior/White interior finishes and matching casing, but has one uninterrupted pane and no operable sash hardware.
- Dining eight-seat centering correction: retain the provisional 84 x 38 x 29 in walnut table and eight Nosh-size chairs, but center the whole set on the actual dining-room midpoint (19.85, 2.95) and rotate its long axis across the wider x dimension. Three chairs per long side at 24 in centers, one per end; preserve their relative offsets. All stowed chairs now fit within the nominal room instead of using the hall end. Table has equal 35.7 in side-wall clearances and aligns with the rear-window center. Tree, windows, patio door and lighting stay fixed. Operating trade-off: patio-end chair must be tucked for full inward door swing; 18 in end pull-outs fit closed-door geometry, 24 in reaches side-wall trim. Add a visible dining-view warning, not a false full-clearance claim. Actual products, knee room, occupied circulation and simultaneous passing remain unverified.
- Dining exterior walls: retain one left-wall opening at x = 13.2, centered at z = 2.95 ft, provisionally 6 ft wide by 5 ft high with a 3 ft sill and white interior casing, matching the rear opening. Both contain paired Andersen 100 Series casement concepts. Right-wall combined 6 x 8 ft assembly retains lower-z stacked casements and higher-z nominal 3 ft inward door, hinged at the higher-z jamb and kept closed at 0 degrees by default. Dealer confirmation of units, combinations, safety glazing, finished clear openings and occupied chair/door use is required.
- Dining wall lighting: two matching satin-gold/opal sconces flank the rear window at x = 15.3 / 24.4, y = 6.3, z = -1.895 ft, facing into the room. Retain the living-room lighting and keep the dining ceiling clear: no chandelier, pendant, or hanging cord. Warm illumination is illustrative; verify electrical boxes, mounting, dimming, and glare.
- Living-room floor: no area rug; expose continuous honey-oak beneath the sofa and lounge chairs. Entry runner and kids-room play rug are also removed.
- Dining finish stays walnut with black-leather [Nosh chair references](https://www.article.com/product/29527/nosh-leather-dining-chair-walnut-and-black), now eight. The [Seno 71-inch table](https://www.article.com/product/27599/seno-71-dining-table-walnut) is the earlier six-seat style reference only, not a claimed 84 in product. Confirm the eventual table's support/knee space, real chair dimensions, occupied comfort and simultaneous access before purchase.
- Living-room upholstery: no white or cream seating; the family has kids. Use warm tan/light brown, shown as leather in the model. Target protected, wipe-clean leather or stain-resistant performance fabric after checking samples and care instructions. The Gabriola link is a chair shape/size reference only, not selected upholstery or a claim of leather availability. The former JATTEBO chaise reference no longer applies.
- Fireplace: retain the reference-photo taupe-brown stacked stone with earthy brown/weathered gray/charcoal variation and dark warm-gray joints, 6 ft wide and 9 ft high. Keep the backing at x = 1.3 with finished stone face approximately x = 1.38 (16.6 in from wall centerline); both former adjacent cabinets are removed. Firebox, ember bed, and TV follow the deeper face; retain 17 static amber flame shapes with bright cores. Keep the matching white-oak mantel 74.4 in wide, 3.6 in thick, underside y = 4 ft, projecting approximately 6.9 in beyond the stone. Mantel, combustible-furniture clearances, TV heat exposure, firebox depth, and venting need manufacturer/architect verification. Photo lighting affects apparent color; this is not an identified stone product.
- Fireplace built-ins: both low runs removed, with no replacement benches or uppers. Retain under-stair bookcases and full exposed base trim. Media-equipment location and ventilation must be coordinated without the former cabinet.
- Living windows: five openings, ceiling 9 ft. F1/F2 move to x = 0, z = 11.675 / 23.275 to center the complete feature wall: retain 48 x 64.8 in openings, 31.2 in sills, 96 in heads. Group three 30 x 60 in return-wall windows at x = 3.2667 / 6.6 / 9.9333, z = 8: casement / fixed picture / casement, with an uninterrupted middle pane and no crank/lock there. Sills remain 36 in and heads 96 in. Opening spans approximately x = 2.0167-4.5167 / 5.35-7.85 / 8.6833-11.1833; center spacing 40 in, piers 10 in, corner returns 24.2 in to wall centerlines. Widest cap gaps are 1.25 in; trim tops remain 102.625 in, leaving 5.375 in below the ceiling. Keep lights outside the group and the room footprint fixed. Cutouts, frames, designer, exterior west openings, and plan lines share window data. See the authoritative [window schedule](windows.html#living-room-window-schedule). Standard products, rough openings, structural piers/headers, and electrical clearances need dealer/architect confirmation.
- Kids' room: close the living-room-facing opening at z = 25.7 with a continuous wall/baseboard. Move the doorless 4 ft 6 in-wide x 8 ft-high entry to the stair-facing side at x = 12.2, z = 27-31.5, with aligned Craftsman casing on both faces and no doors/hardware. The direct sofa-to-playroom sightline is intentionally removed. Keep the Kids room view/tour start, furniture, window, rear enclosure, and separate powder-room hall entry unchanged. Verify framing, stair-side circulation, acoustic expectations, and code requirements.
- Kids' north wall, kitchen/hall face: replace the chalk surface with charcoal tempered dry-erase glass; retain centered 84 x 48 in oak frame and cork paper strip at x = 24, bottom 30 in, top 78 in. Use opaque light-coloured dry-erase markers approved for black glass, not chalk/liquid chalk; test contrast, erasing and cleaning. Use warm-white painted vertical grooved panelling across the 115.8 in face, superseding sage: 1/2 in thick, from the 8 in flat white baseboard to the 9 ft wall top. Remount board outside panels; total projection stays under 3.5 in from the original wall face. Opposite face from desks, separate from removed interior artwork. Captive paper clips, no loose magnets/sharp pins. Verify safety glazing, weight-rated anchorage through panels into blocking, reach, rounded edges, age-appropriate markers and hall circulation. No chalk dust, but marker residue needs wiping. Illustrative, not interactive, product-selected or approved installation.
- Message-wall edges: use the same warm-white paint as the main panelling on both edge strips and corner returns; the natural-oak edge study is rejected. Front strips stay 4.2 in wide and 1/2 in thick, flush with the white panels; outside corner returns cover the wall ends and panel thickness. Run from the 8 in white baseboard to the 9 ft wall top. Main panelling, oak board frame, board position and furniture stay unchanged. Verify corner scribing and adjacent cabinet/trim junctions; not approved joinery.
- Hall continuation: carry the same warm-white vertical grooved panelling from the message-wall west corner along the hall-facing kids/guest west wall to the foyer, z = 24.9117-54.025 at x = 18.7833-18.825. Keep 1/2 in thickness, 8 in baseboard and 9 ft wall top. Cut around both existing 8 ft-high openings (kids z = 27-31.5; guest z = 42-45) and every side/header/bead/cap envelope; panel above the headers. Do not panel room interiors or alter door widths/furniture. Installed occupied circulation, scribing and trim junctions remain unapproved.
- Christmas layout: move the 7 ft-high, 36 in-diameter tree to the northwest dining corner between the two exterior windows, centered at (15.25, -0.05), for every seating option. Retain warm white lights, gold ornaments, the gold cross topper at 7 ft, and tour collision geometry. The nominal branch footprint clears each finished wall by about 4.5 in. This supersedes all previous living-room tree positions and their spacing measurements. Some window screening is possible; verify actual spread, sash access, dining-chair pull-back, stability, heat clearances, and power without cords across circulation. Model placement is not fire-safety approval. Seasonal tree placement supersedes the no-plants direction.
- Kids' zones (latest selected): both 47.25 x 31.5 in MITTZON desks back onto south wall, rotation 180 degrees: PC (22.6729, 32.9375), homework (26.7729, 32.9375), chairs north at z = 31.6. Both rows east-aligned: right desktop 1 in off finished east wall, desk gap 1.95 in, south gap 2.1 in. Both 39 x 17.375 x 37 in TROFAST units move north, rotation 0, centers (23.6083, 25.8106) / (27.025, 25.8106); north/east trim gaps 2.1 in, frame gap 2 in. Eighteen removable boxes with separate provisional LEGO inserts in left nine; anchor frames and verify loads, reach, organizer fit/containment and rail travel. Front gap 61.1 in; full-depth pulls leave 34.4 in to tucked chair backs. 30 in chair and 17.375 in bin envelopes leave only 13.7 in between use zones, not a simultaneous passing aisle. Furniture clears a 30 x 43.5 in west-entry approach, not occupied-route approval. Remove carpet/rug and expose continuous oak floor; furniture unchanged. Bench/books/upper art remain removed, kitchen-facing board unchanged. Verify desk lift/pinch clearance, child chair support, full-travel cables and anchorage. No stacking/climbing/seating on storage. Product shapes simplified; no animated lift/bin tool. See [room notes](foyer/living-room.html#connected-kids-room).
- Garage parking latest: truck must remain right. Align Sierra EV with right opening at (48.5, 38), 6 in right; BMW stays left at (37, 40), 6 in forward. Full vehicle sizes retained. Center mirror aisle about 49.4 in, truck side gap about 34 in, truck-body-to-house-steps about 30 in. BMW rear gap improves to 11.7 in while front parking-lane equipment gap stays about 36.5 in. Truck nose/rear still tight, about 14.4/13.2 in. No wall/exterior expansion, steering simulation or full vehicle-door clearance claim. Charger, bikes, steps and openings unchanged. Verify real hardware, sensors/stops, doors, cables and maneuvering.
- Garage equipment station remains (32.95, 27.115) in front of BMW. Latest: regular mower on wheels at approximately (30.65, 28.615), handle unfolded to z = 31.865; vacuum at (35.05, 28.115). Dedicated high blower cradle on left tool board, nozzle above lower shelf; rails/tools/battery shelf/bins retained. Equipment bounds approximately x = 29.55-36.35, z = 27.075-31.905. Preserve parked vehicles and five floor bikes except the temporary Storage access view, where truck/bikes are explicitly moved out for mobile steps. Entry/steps now x = 39.5-42.5, 96 in-high opening. Check real equipment, safe retrieval/cross-aisle, fuel/charging guidance, vehicle doors, supports and anchorage.
- Garage level/entry: use a provisional 15 in slab drop, two 7.5 in rises, and two straight 36 in-wide, 11 in-deep tread surfaces at x = 41-44, z = 26.725-28.558333, leading directly to the house doorway. Upper tread top y = 0; lower y = -0.625; garage y = -1.25. Remove the separate landing, turning flight, rails, and guards; retain contrasting nosings. All garage floors, furnishings, exterior openings, walls, and approach pads follow the new level. Update tour elevation lookup and minimap step orientation accordingly. Keep the shifted mudroom bench unchanged. Confirm surveyed levels, drainage, required door landings/handrails, rated door/swing, and fire separation with the architect; the requested omission is a concept, not code approval or step-free access.
- Ground-floor bedroom: rotate the Article Lenia queen bed -90 degrees so its headboard faces the x = 31.2 wall opposite the entry at x = 19. Keep the 63.5 x 82.75 in footprint. Place its rear edge at x = 30.875, clear of wall trim, and shift its center toward the porch windows to z = 49.395. Move both nightstands to the same wall, symmetrically at z = 45.695 and 53.095; the window-end nightstand limits further movement. Keep window glazing/trim clear. Final circulation, door operation, and window access require verification.
- Office: keep furniture/windows and the nominal 60 x 96 in hall opening at x = 12.2, z = 42.75-47.75. Retain white French leaves, two nominal 30 in widths, each with 2 columns x 5 rows of clear lites, white muntins, gold round knobs and dark hinges. Keep both fully open inward at 90 degrees into the office, perpendicular to the opening, including on reload and view changes. This supersedes the closed and 45-degree displays; casing/head alignment stays unchanged. Verify actual unit/jamb/rough-opening dimensions, safety glazing, true/simulated divided lites, handing, latches/flush bolts, acoustic performance, and occupied swing/passage clearance. See [office doors](office.html#doors) and [opening schedule](floor-plan-reference.md#doors-openings-and-circulation).
- Other rooms: retain furnishings except for the office, bedroom, kids' room, garage, and mudroom changes above. The mudroom no longer has a laundry reservation. These remain concepts, not manufacturer CAD.

See [interactive model assumptions](floor-plan-3d.html) for the remaining dimensions, product references, room controls, and limitations. Existing preview PNGs are earlier snapshots, not the authority for this correction.

## Historical verification

Patio step shift: browser bounds confirmed the center moves from x = 49 to 51 ft, a 24 in leftward move in the garden-facing view. All three treads/nosings/markers move together; widest bounds are x = 47.6-54.4 with z limits unchanged. The old pocket is filled by resized terrace returns, which do not overlap the stairs; no patio fixture/post obstructs the new stair footprint. The spur meets the new foot at x = 49.25, z = -2.1. Front entry steps and patio limits remain unchanged. Syntax/whitespace checks passed; installation clearances and site grades remain provisional.

Garage finish/trim update: browser bounds confirmed two 9 x 8 ft doors with cream #E6D7B9 surfaces, contrasting taupe #A18D70 surrounds, 6 in sides and 8 in headers. Jambs/header meet without gaps and stay outside the openings; main trim backs meet the masonry face and caps project farther forward. Four glass panes and two dark handles per door, both garage lanterns, and the lower roof remain. Screen rendering, syntax, and whitespace checks passed; colors and construction details still require physical samples and installation review.

Path-post light removal: browser scene checks found zero bollard fixtures and zero gold path-light plan markers. The two porch lanterns, two garage lanterns, two patio ceiling lights, three access downlights, six recessed step markers, and six camera devices remain. JavaScript syntax and Git whitespace checks passed. No replacement path-post fixtures are selected.

Front walkway removal: browser geometry checks found no straight entry-walk mesh and lawn at three points along its former strip (z = 70, 80, 95). A 3 ft-wide garage/driveway-to-porch approach remained continuously covered at 834 samples; the driveway, porch, steps, and other paver routes remain. This supersedes the earlier street-bound front walkway.

Above-garage removal: browser checks confirmed 17 remaining upstairs room/label entries, no above-garage room/slab/label, and no tourable floor at three points across the former 24 x 13 ft area. The loft's south boundary now stops at x = 52; all four bedroom routes, loft, laundry, linen, and mechanical access remain available. Exterior checks confirmed deletion of the upper garage walls/window and former high gable, retention of the ground garage frontage, and a replacement single-story roof with nominal 9/15 ft eaves/ridge (ridge cap tops at approximately 15.18 ft). This supersedes the earlier unfinished-room reservation and 30 ft garage ridge. Roof intersections and structural support remain unverified.

Upstairs addition: browser route checks reached 16 room/service destinations from the existing upper arrival, with 14,417 collision samples at y = 10 ft. The stair void is not floored over and remains non-walkable; the unfinished above-garage reservation is excluded from the tour. Geometry checks found 27 upper floor slabs without overlapping footprints or nonfinite vertices. Simulated travel reached the loft with correct avatar/camera/marker height; floor changes stop the tour, Top view preserves the selected story, and returning to Whole floor restored ground root transforms/visibility exactly. All six ground-view tour starts remained available. The upper perimeter, overhangs/supports, fixture installation, headroom, egress, door swings, and code requirements remain unverified.

Current centered eight-seat study, October 20: center (19.85, 2.95), long axis x, 84 x 38 in table, eight chairs. Centering and equal opposite tabletop margins have regression tests, as do chair envelopes through 18 in travel. Patio door stays closed at 0 degrees by default; temporary browser sweep checks cover all 361 quarter-degree angles, then restore the closed pose without moving the set. Tests also reproduce the pulled patio-end chair/door conflict and end-chair 24 in wall conflict; the dining view warns to tuck that seat before operating the door. Side-chair 24 in travel is checked separately with end chairs tucked. No all-around occupied passage or code approval is claimed.

Earlier hall-shifted eight-seat check: center (19.35, 4.95), long axis z. This arrangement cleared the patio sweep and walls at 0/18/24 in chair travel but projected into the hall and was rejected as off-center. Those clearances do not apply to the current centered arrangement.

Earlier six-seat dining rotation: browser OBB checks covered the former 71 in table at (19.35, 3.95), rotated 90 degrees. Its tucked and 18/24 in chair travel cleared the patio sweep after moving 6 in west. Those dimensions and chair positions are superseded by the current eight-seat study.

These checks describe the geometry at the time of each earlier change, not a fresh certification of the current plan. Old island sizes, cabinet layouts, centers and clearance sweeps below are superseded by the [current reference and audit evidence](floor-plan-reference.md#audit-evidence). Keep historical checks distinct from measurements of the present model.

Grouped living windows: browser checks confirmed all three 30 x 60 in units at 40 in centers, 1.25 in between their widest casing caps, moved wall cutouts, and sconces outside the complete group without trim overlap. The middle unit has one fixed pane and no crank/lock; both outer units retain casement hardware. The opposite-wall sconce pair and all five seating-option switches remain intact. Syntax and whitespace checks passed; the dealer/architect must still verify structural piers, standard units, and electrical mounting clearances.

Garage storage relocation: browser bounds confirmed the complete station at (32.95, -1.25, 27.115), with no vehicle/bike overlap, a conservative 42.49 in BMW-front gap, and 40.05 in restored truck-side mirror-envelope clearance. A 36 in-wide body cleared 1,087 sampled positions across the equipment approach and former east-wall pinch point. Tour routes to the mower and vac are available; vehicles, bikes, charger, and steps remain unchanged. The existing automatic tour route from garage center to the bike alcove is unavailable both before and after this relocation; that separate routing limitation is not resolved by this move. Actual equipment maneuvers and vehicle-door swings still need verification.

Four-foot landing resize: browser mesh bounds confirmed both turning platforms are 48 x 93.9 in, still at +5/-5 ft and meeting x = 28.825. The shared opening now starts at x = 18.9917. All four bookcase bays meet without gaps/overlap at widths 20, 20, 21.3, and 26.7 in. The recovered hall strip is walkable, the remaining stairwell void is blocked, and clear tour starts remain available in all six main views. Flight widths, risers, and treads are unchanged. JavaScript syntax and Git whitespace checks passed. This supersedes earlier 5 ft 7 in landing-depth and 40.4 in bookcase-width notes; it does not certify structure, headroom, or code compliance.

Island white-oak finish: browser checks confirmed textured stained-oak materials on all 48 island wood meshes, including drawer fronts, panels, rails, posts, moldings, and aprons. Panel/post grain is vertical; rail/apron/drawer grain is horizontal. All 116 island meshes, bounds, 7 x 3.5 ft slab, four stools, and shared quartz material are unchanged. The floor texture pixel hash matches the pre-change value, confirming the reused grain helper preserves the flooring. Startup, syntax, and whitespace passed. Stain color and protective finish remain sample-dependent.

Cooktop symmetry inspection: browser checks confirmed mirrored cabinet boxes, doors, pulls, and outer drawer banks about z = 17.45, with the hood, cooktop, backsplash, and central drawers on that centerline. The new Cooktop wall view projects the side banks symmetrically within 0.05 px and keeps the ceiling clear of the toolbar. Island, pendants, and countertop accessories are hidden only for inspection; view-switch restoration and the Fridge wall hood visibility rule passed. Startup, syntax, and whitespace passed. No cabinet dimensions or placements changed for this inspection.

Earlier reference-style hood update (superseded by the October 19 adjoining-cabinet reference): browser vertex measurements confirmed a 48 x 24 in base tapering to 36 x 18 in at the 9 ft ceiling, with a constant rear plane and walnut band at y = 6.3-6.5. The former side stacks measured 12 in wide with 3 in gaps; bridge cabinets and the exposed chimney were removed. Those dimensions and the walnut band are historical, not the current cooking-wall design.

Earlier cooktop ceiling-storage trial (superseded): six cream cabinet doors, two 15 in side stacks, and two 12 x 18 in bridge cabinets were verified. The subsequent plaster-hood trial removed the bridges and narrowed the side stacks to 12 in; the October 19 design above supersedes that trial too.

Sink-wall storage/splash update: browser measurements confirmed two mirrored 27 in-wide cabinet stacks with eight cream doors, 12 in carcass depth, and cornices meeting the 9 ft ceiling. The unchanged 66 x 42 in window is raised to a 51 in bottom and 93 in head; raycasts confirmed its wall opening moved too. The wood apron clears the counter by 9.9 in, and matching quartz reaches its underside. Cabinets clear the window casing and surrounding geometry. Wall cutaway/restoration, error-free startup, JavaScript syntax, and whitespace passed; the 7 ft island remains unchanged. Moisture detailing, window hardware reach, standard unit sizing, and structural framing still need professional verification.

Paired-column/pantry update: browser checks confirmed 30 in appliance-center spacing, a 32.25 in pantry bay with two tall doors, and cabinetry meeting the 9 ft ceiling. The former niche is removed; the 7 ft island and four stair bookcase bays remain. Cabinet-backed base trim is omitted without changing exposed doorway casing. No static cabinet collisions or conceptual freezer door/pull collisions were found through 116 positions from 0 to 115 degrees. Door controls, the unobstructed Fridge wall view, JavaScript syntax, whitespace, and error-free startup passed. Manufacturer hinge articulation, joining-kit requirements, refrigerator/pantry door swings, and drawer access remain unverified.

Earlier 9-foot ceiling study: browser geometry checks confirmed 89 wall segments at or below 9 ft, a 9 ft fireplace, and hood/pendant connections terminating at 9 ft. The former 8 ft 9 in refrigeration cornice is superseded by the ceiling-height cabinet wall. Four bookcase bays, appliance heights, and the provisional stair dimensions remain unchanged. Wall cutaway/restoration and camera controls passed with no page errors.

At the saved 10-foot-ceiling checkpoint, separated-column browser checks confirmed the 31.5-inch landing niche, nominal 30-inch drawers, unchanged 29.75 x 84 x 24-inch appliance bodies, three aligned upper cabinets, four retained bookcase bays, and no static collisions with walls, trim, stairs, or the mudroom opening. These checks do not verify manufacturer installation or open-door/pull-out envelopes.

October 17, 2026 column update: browser geometry checks confirmed 30-inch bay spacing, 29.75 x 84 x 24-inch column bodies, two matching 33-inch drawer banks, 0.75-inch side panels, and equal 2.85-inch outer fillers totaling 133.2 inches. Individual appliance/cabinet meshes do not overlap, and the mudroom passage stays clear. Stainless doors with contrasting dark handles are a finish concept, not a selected accessory package.

Earlier enclosure/rail validation (before the stair-height correction): browser checks confirmed eighteen floor-to-tread enclosure sections, a solid turning-landing enclosure, horizontal-bar guards on flights and exposed landing sides, no vertical balusters or wall-backed end guard, and the turning landing meeting the wall at x = 28.825. The earlier tread counts and equal-width flights are superseded by the current geometry above. The separate upper-arrival entry route remained open. Visual inspection, JavaScript syntax, whitespace, and browser error checks passed at that stage.

Current stair-height validation: browser scene checks confirmed eight 7.5-inch rises per flight, seven 10-inch treads per flight, turning landings at +5/-5 ft, and arrival landings at +10/-10 ft. The 44-inch and 46.9-inch flight widths remain unchanged. All four resized bookcase bays meet without overlaps into the stair enclosure; basement posts and retaining walls follow the shorter flights and 10 ft drop. Walk starts in all six main views remain clear, movement remains 4 ft/sec, camera restoration works, and the stairwell void remains blocked. The 33 cup pulls and three quartz sills remain. Earlier twenty-rise and 10.8 ft arrival-underside measurements are superseded. These checks do not certify headroom, structure, or code compliance.

October 17, 2026: JavaScript syntax and Git whitespace checks passed. The local browser loaded the model without page errors. Scene bounding-box checks confirmed both columns on the bottom wall facing into the kitchen, and no walls or furnishings inside the new mud-room passage or retained prep opening. The island and farmhouse sink remain present. These checks do not validate appliance door swings or building-code compliance.

Earlier symmetry check: equal 44.7-inch slab-to-slab end aisles, cooktop/island alignment at z = 17.45, five stools, and a 7 ft island were verified at that stage. The 7 ft island is restored, but there are now four stools and no refrigeration-wall landing counter.

The 6.5 ft island trial is superseded by the restored 7 ft island. Browser checks confirmed the full-size slab, 44.55 in closed-freezer aisle, unchanged 44.7 in sink aisle, and four stools clear of the posts. A conceptual door/pull sweep at every integer degree from 0 through 115 found no collisions with surrounding model geometry, excluding the freezer's own body. The swing control and error-free model load passed. The manufacturer's hinge mechanism and internal drawer access still need verification.
