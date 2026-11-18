(function (root) {
  'use strict';
  const epsilon = 1e-7;
  const upperGeometry = () => typeof getUpstairsMeasuredGeometry === 'function'
    ? getUpstairsMeasuredGeometry() : require('./floor-plan-upstairs.js').getUpstairsMeasuredGeometry();
  const signedArea = (polygon) => polygon.reduce((sum, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
  const heightAt = (plane, point) => plane[0] * point[0] + plane[1] * point[1] + plane[2];
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function cleanPolygon(points) {
    const polygon = points.filter((point, index) => distance(point, points[(index + points.length - 1) % points.length]) > epsilon);
    if (polygon.length < 3 || Math.abs(signedArea(polygon)) < epsilon) return [];
    return signedArea(polygon) < 0 ? polygon.reverse() : polygon;
  }

  function clip(polygon, constraint) {
    const result = [];
    const value = (point) => heightAt(constraint, point);
    for (let index = 0; index < polygon.length; index++) {
      const a = polygon[index], b = polygon[(index + 1) % polygon.length];
      const av = value(a), bv = value(b);
      if (av >= -epsilon) result.push(a);
      if ((av < -epsilon && bv > epsilon) || (av > epsilon && bv < -epsilon)) {
        const ratio = av / (av - bv);
        result.push([a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio]);
      }
    }
    return cleanPolygon(result);
  }

  function polygonConstraints(polygon) {
    return polygon.map((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      const dx = next[0] - point[0], dz = next[1] - point[1];
      return [-dz, dx, dz * point[0] - dx * point[1]];
    });
  }

  function subtract(polygon, constraints) {
    const outside = [];
    let remaining = polygon;
    for (const constraint of constraints) {
      const piece = clip(remaining, constraint.map((value) => -value));
      if (piece.length) outside.push(piece);
      remaining = clip(remaining, constraint);
      if (!remaining.length) break;
    }
    return outside;
  }

  function roofPatches({ id, finish = 'slate', bounds, planes }) {
    const [left, right, rear, front] = bounds;
    if (![...bounds, ...planes.flat()].every(Number.isFinite) || right <= left || front <= rear || !planes.length) throw new Error(`Invalid roof definition: ${id}`);
    const footprint = [[left, rear], [right, rear], [right, front], [left, front]];
    return planes.flatMap((plane, index) => {
      let polygon = footprint;
      for (let other = 0; other < planes.length && polygon.length; other++) {
        if (other !== index) polygon = clip(polygon, planes[other].map((value, field) => value - plane[field]));
      }
      return polygon.length ? [{ id: `${id}:${index}`, roof: id, finish, plane, polygon }] : [];
    });
  }

  function gableRoof(id, left, right, rear, front, base, rise, rearHip = false, finish = 'slate') {
    const center = (left + right) / 2, slope = rise / ((right - left) / 2);
    const planes = [[slope, 0, base - slope * left], [-slope, 0, base + slope * right]];
    if (rearHip) planes.push([0, slope, base - slope * rear]);
    return { id, finish, bounds: [left, right, rear, front], planes };
  }

  function getHistoricalRoofDefinitions(floorToFloor = 10) {
    const diningRearZ = typeof getLivingRoomFeatureLayout === 'function' ? getLivingRoomFeatureLayout().diningRearZ
      : require('./floor-plan-ground.js').getLivingRoomFeatureLayout().diningRearZ;
    const eaves = floorToFloor + 9;
    // 18-inch provisional framing zone above full 9-ft room walls.
    const upperBase = eaves + 1.6;
    const g = upperGeometry();
    const atticAttachment = g.east + 0.75;
    const atticWest = g.east - 0.225;
    const atticEast = (g.atticEast ?? 55.5) + 0.7;
    const atticRear = (g.atticNorth ?? 15) - 0.75;
    const atticFront = (g.atticSouth ?? g.bedNorth) + 0.225;
    // Lift the retained pitch 24 inches and overlap the wing wall so the
    // full nine-foot loft ceiling has an uninterrupted 18-inch framing zone.
    const atticSlope = (upperBase - floorToFloor - 8.66) / (atticEast - atticAttachment);
    const atticPlane = [-atticSlope, 0, upperBase + 2 + atticSlope * atticAttachment];
    const serviceHigh = heightAt(atticPlane, [atticWest, 0]);
    const mainRear = g.north - 0.75, mainFront = g.south + 0.75, mainRight = g.southEast + 0.75;
    const garage = { id: 'Garage hip', bounds: [30.3, 56.2, g.bedNorth + .75, 49.85],
      planes: [[0.5, 0, 8.9 - 0.5 * 30.3], [-0.5, 0, 8.9 + 0.5 * 56.2],
        [0, 0.5, 8.9 - 0.5 * (g.bedNorth + .75)], [0, -0.5, 8.9 + 0.5 * 49.85]] };
    const garageGable = gableRoof('Garage front gable', 30.3, 56.2, 37.5, 49.85, 8.9, 7.2, true);
    // Keep the garage's full door pair under one uninterrupted front gable.
    // Cross-fall the rear return where it meets the retained hip so the
    // intersection resolves into sloped valleys, not level transverse seams.
    // Derived fall is checked; this is not hydraulic/flashing approval.
    const garageRearPitch = 7.2 / (49.85 - 37.5);
    garageGable.planes[2][1] = garageRearPitch;
    garageGable.planes[2][2] = 8.9 - garageRearPitch * 37.5;
    for (const [roof, center] of [[garageGable, 43.25]]) {
      roof.planes[2][0] += 1 / 16;
      roof.planes[2][2] -= center / 16;
    }
    return [
      // Equal 3:12 hips over the actual full-height upper rooms. Eaves stay
      // above the existing nine-foot ceilings; roof space is not living area.
      { id: 'Main house', bounds: [-0.75, mainRight, mainRear, mainFront],
        planes: [[0, 1 / 4, upperBase - mainRear / 4], [0, -1 / 4, upperBase + mainFront / 4],
          [1 / 4, 0, upperBase + 0.75 / 4], [-1 / 4, 0, upperBase + mainRight / 4]] },
      { id: 'Primary bath rear', bounds: [g.bathWest-.75,g.bathEast+.75,g.bathNorth-.75,g.closetNorth+.75],
        planes: [[.25,0,upperBase-.25*(g.bathWest-.75)],[-.25,0,upperBase+.25*(g.bathEast+.75)],
          [0,.25,upperBase-.25*(g.bathNorth-.75)],[0,-.25,upperBase+.25*(g.closetNorth+.75)]] },
      // Reversible cross-gables above the fixed paired bedroom banks. Union
      // with (never replacement of) the accepted hip preserves its entire
      // headroom envelope and rear solar study surfaces.
      ...[g.southClosetWest / 2, (g.southClosetEast + g.southEast) / 2].map((center, index) =>
        gableRoof(`${index ? 'East' : 'West'} front gable`, center - 7.175, center + 7.175,
          40.5, mainFront, eaves + 0.2, 6.2, true)),
      { id: 'East rear wing', bounds: [g.bathEast - .75, g.east + .75, g.north - .75, g.bedNorth + .75],
        planes: [[.25, 0, upperBase - .25 * (g.bathEast - .75)],
          [-.25, 0, upperBase + .25 * (g.east + .75)],
          [0, .25, upperBase - .25 * (g.north - .75)],
          [0, -.25, upperBase + .25 * (g.bedNorth + .75)]] },
      // The raised shed retains its eastward fall above the flat loft ceiling.
      { id: 'Garage attic storage roof', bounds: [atticWest, atticEast, atticRear, atticFront],
        planes: [atticPlane] },
      // The service return shares the attic roof's east-falling north edge,
      // then hips down to the existing garage front without a floating seam.
      { id: 'Garage service return', bounds: [g.southEast + .225, 56.2, g.bedNorth + .225, 49.85],
        planes: [[0, -(serviceHigh - 8.9) / (49.85 - g.bedNorth - .225),
          serviceHigh + (serviceHigh - 8.9) / (49.85 - g.bedNorth - .225) * (g.bedNorth + .225)],
          atticPlane] },
      // The raised shed overlaps the wing wall above, not through, its glazing.
      garage,
      garageGable,
      // The west edge abuts the canopy at the wall, not an overlapping eave
      // projecting through its fascia. Keep the dining ridge and east eave.
      { ...gableRoof('Dining rear projection', 12.55, 27.525, diningRearZ - 0.65, 7.5, 8.68, 5.82, true),
        bounds: [13.2, 27.525, diningRearZ - 0.65, 7.5] }
    ];
  }

  function getNovember15RoofDefinitions(floorToFloor = 10) {
    const g = upperGeometry(), roofs = getHistoricalRoofDefinitions(floorToFloor)
      .filter(roof => !roof.id.startsWith('Garage'));
    const main = roofs.find(roof => roof.id === 'Main house');
    const [left, right, rear, front] = main.bounds, base = floorToFloor + 10.6;
    const ridgeZ = (rear + front) / 2, crown = base + (ridgeZ - rear) / 4;
    const hipRun = (g.southClosetWest / 2) - left;
    main.planes = [[0,.25,base-.25*rear],[0,-.25,base+.25*front],
      [(crown-base)/hipRun,0,base-(crown-base)/hipRun*left],
      [-(crown-base)/hipRun,0,base+(crown-base)/hipRun*right]];
    for (const roof of roofs.filter(roof => /front gable/.test(roof.id))) {
      const [l,r,b] = roof.bounds, slope = 7.6 / ((r-l)/2), eave = floorToFloor + 9.2;
      roof.planes = [[slope,0,eave-slope*l],[-slope,0,eave+slope*r],[0,slope,eave-slope*b]];
    }
    const loftNorth = (g.atticNorth + g.atticSouth) / 2;
    roofs.push({ id: 'Garage room-in-roof', bounds: [30.3,g.atticEast+.7,loftNorth-.75,49.85],
      planes: [[10/12,0,14.5-(10/12)*30.3],[-10/12,0,14.5+(10/12)*(g.atticEast+.7)]] });
    roofs.push({ id: 'Garage rear metal lean-to', finish: 'metal',
      bounds: [g.east+.225,g.atticEast+.7,7-.225,loftNorth-.225],
      planes: [[-3/16,0,9.3+(3/16)*(g.atticEast+.7)]] });
    roofs.push({id:'Kitchen rear setback metal',finish:'metal',
      bounds:[27.525,g.east+.225,7-.225,g.north-.225],
      planes:[[0,.25,9.3-.25*(g.north-.225)]]});
    const dining = roofs.find(roof => roof.id === 'Dining rear projection');
    const dl = 13.2-.225, dr = dining.bounds[1], slope = (12.2-9.3)/((dr-dl)/2);
    dining.bounds = [dl,dr,dining.bounds[2],g.north-.225];
    dining.planes = [[slope,0,9.3-slope*dl],[-slope,0,9.3+slope*dr],[0,slope,9.3-slope*dining.bounds[2]]];
    return roofs;
  }

  function getConnectedRoofDefinitions(floorToFloor = 10)
  {
    const g = upperGeometry(), previous = getNovember15RoofDefinitions(floorToFloor);
    const bounds = previous.find(roof => roof.id === 'Main house').bounds.slice();
    bounds[0] = previous.find(roof => roof.id === 'West front gable').bounds[0];
    const garage = previous.find(roof => roof.id === 'Garage room-in-roof').bounds;
    const eave = floorToFloor + 10.6, ridgeZ = (bounds[2] + bounds[3]) / 2;
    const planes = [[0,.375,eave-.375*bounds[2]],[0,-.375,eave+.375*bounds[3]]];
    const center = (garage[0] + garage[1]) / 2;
    const roofs = [
      {id:'Main house',bounds,planes},
      {id:'East rear wing',bounds:[g.bathEast-.75,center,bounds[2],bounds[3]],planes},
      {id:'Main garage extension',bounds:[center,garage[1],garage[2],bounds[3]],planes}
    ];
    for (const roof of previous.filter(roof => /front gable/.test(roof.id)))
    {
      const [left,right] = roof.bounds;
      roofs.push({id:roof.id,bounds:[left,right,ridgeZ,bounds[3]],
        planes:[[1,0,eave-left],[-1,0,eave+right]]});
    }
    const halfWidth = (roofs.find(roof => roof.id === 'West front gable').bounds[1]
      - roofs.find(roof => roof.id === 'West front gable').bounds[0]) / 2;
    roofs.push({id:'Garage room-in-roof',bounds:[center-halfWidth,center+halfWidth,ridgeZ,bounds[3]],
      planes:[[1,0,eave-center+halfWidth],[-1,0,eave+center+halfWidth]]});
    roofs.push(...previous.filter(roof => ['Dining rear projection','Garage rear metal lean-to','Kitchen rear setback metal'].includes(roof.id)));
    return roofs;
  }

  function getGarageAtticWindows(floorToFloor = 10)
  {
    const roof = getConnectedRoofDefinitions(floorToFloor).find(roof => roof.id === 'Garage room-in-roof');
    const center = (roof.bounds[0] + roof.bounds[1]) / 2;
    return [-2,2].map((offset,index) => ({name:`Garage attic window ${index+1}`,x:center+offset,z:49,
      width:3,sill:floorToFloor+3,height:5,atticOnly:true}));
  }

  function getRoofDrainageLayout(floorToFloor = 10)
  {
    const definitions = getConnectedRoofDefinitions(floorToFloor), g = upperGeometry();
    const frontLayout = typeof getGroundFrontLayout === 'function'
      ? getGroundFrontLayout() : require('./floor-plan-ground.js').getGroundFrontLayout();
    const main = definitions.find(roof => roof.id === 'Main house');
    const extension = definitions.find(roof => roof.id === 'Main garage extension');
    const lean = definitions.find(roof => roof.id === 'Garage rear metal lean-to');
    const dining = definitions.find(roof => roof.id === 'Dining rear projection');
    const porch = getPorchRoofDefinitions()[0];
    const gutters = buildRoofEnvelope(definitions).boundaries
      .filter(edge => Math.abs(edge.start[1] - edge.end[1]) < .001 && edge.start[1] > floorToFloor + 9)
      .map((edge, index) => ({ id: `upper-${index + 1}`, roof: edge.roof, start: edge.start, end: edge.end }));
    const point = (roof, x, z) => [x, Math.min(...roof.planes.map(plane => heightAt(plane, [x, z]))), z];
    gutters.push(
      { id: 'dining-rear', roof: dining.id, start: point(dining, dining.bounds[0], dining.bounds[2]), end: point(dining, dining.bounds[1], dining.bounds[2]) },
      { id: 'dining-east', roof: dining.id, start: point(dining, dining.bounds[1], dining.bounds[2]), end: point(dining, dining.bounds[1], 7 - .225) },
      { id: 'rear-low', roof: lean.id, start: point(lean, lean.bounds[1], lean.bounds[2]), end: point(lean, lean.bounds[1], lean.bounds[3]) },
      { id: 'porch', roof: porch.id, start: point(porch, porch.bounds[1], porch.bounds[3]), end: point(porch, porch.bounds[0], porch.bounds[3]) }
    );
    const routes = [];
    function outlet(id, name, gutter, x, z, rest, label, details = {})
    {
      const dx = gutter.end[0] - gutter.start[0], dz = gutter.end[2] - gutter.start[2], length = Math.hypot(dx, dz);
      const y = gutter.start[1] - .08 - 3.5 / 12 + .025;
      const inlet = [x + dz / length * 5 / 24, y, z - dx / length * 5 / 24];
      routes.push({ id, name, gutterId: gutter.id, points: [inlet, ...rest], label, ...details });
    }
    const front = main.bounds[3], eave = point(main, 15.6, front)[1];
    const frontGutters = gutters.filter(run => Math.abs(run.start[2] - front) < .001 && Math.abs(run.end[2] - front) < .001)
      .sort((a, b) => Math.min(a.start[0], a.end[0]) - Math.min(b.start[0], b.end[0]));
    const porchPlane = porch.planes[0], pierX = g.southClosetWest - .45, frontPipeZ = g.south + .7;
    const entryLowerZ = frontLayout.wallZ + .425;
    outlet('D1', 'Front valley / entry-side leader', frontGutters[0], frontGutters[0].end[0] + .3, front,
      [[pierX, eave - 1.15, frontPipeZ], [pierX, 12.1, frontPipeZ], [pierX, 11.65, entryLowerZ],
        [pierX, -1.35, entryLowerZ], [pierX, -1.6, entryLowerZ + .3]],
      [10, 57.5], { roofPenetration: [pierX, heightAt(porchPlane, [pierX, entryLowerZ]), entryLowerZ] });
    const eastX = Math.max(porch.bounds[1] + .25, g.southEast + .55), eastZ = g.south - .15;
    outlet('D2', 'Front valley / east return leader', frontGutters[1], frontGutters[1].end[0] + .3, front,
      [[eastX, eave - 1.15, eastZ], [eastX, -1.35, eastZ], [eastX, -1.6, eastZ + .3]], [35, 57.5]);
    outlet('D3', 'Garage eave / supported return to east wall', frontGutters[2], extension.bounds[1] - .3, front,
      [[55.95, eave - .7, front - .1], [55.95, eave - .76, 49.5],
        [55.95, eave - 1.3, 48.8], [55.95, -1.35, 48.8], [55.95, -1.6, 49.1]],
      [59.3, 50.5], { supportRequired: true });
    const low = gutters.find(run => run.id === 'rear-low');
    outlet('D4', 'Rear low roof / independent east leader', low, lean.bounds[1], lean.bounds[2] + .7,
      [[55.95, 8.5, 7.25], [55.95, -1.35, 7.25], [55.95, -1.6, 6.95]], [59.3, 8.5]);
    const rear = gutters.filter(run => Math.abs(run.start[2] - main.bounds[2]) < .001 && Math.abs(run.end[2] - main.bounds[2]) < .001);
    const rearWest = rear.find(run => Math.min(run.start[0], run.end[0]) === main.bounds[0]);
    const rearEast = rear.find(run => Math.max(run.start[0], run.end[0]) === extension.bounds[0]);
    outlet('D6', 'Main rear / west corner leader', rearWest, main.bounds[0] + .4, main.bounds[2],
      [[-.45, eave - 1.15, g.north + .4], [-.45, -1.35, g.north + .4], [-.45, -1.6, g.north + .1]], [-4.7, 9.5]);
    outlet('D7', 'Main rear / east corner leader', rearEast, extension.bounds[0] - .7, main.bounds[2],
      [[42.2, eave - 1.15, g.north - .45], [42.2, 10.1, g.north - .45],
        [42.2, 9.65, 6.4], [42.2, -1.35, 6.4], [42.2, -1.6, 6.1]], [44.5, 3.2]);
    const step = gutters.find(run => Math.abs(run.start[2] - extension.bounds[2]) < .001 && Math.abs(run.end[2] - extension.bounds[2]) < .001);
    outlet('D8', 'Upper rear step / independent east leader', step, extension.bounds[1] - .3, extension.bounds[2],
      [[56.5, step.start[1] - 1, extension.bounds[2] + .9], [56.5, 8.5, extension.bounds[2] + .9],
        [55.95, 8.1, 25.5], [55.95, -1.35, 25.5],
        [55.95, -1.6, 25.2]], [59.3, 24.5], { supportRequired: true });
    outlet('D9', 'Dining rear / east pier leader', gutters.find(run => run.id === 'dining-rear'), dining.bounds[1] - 1.1, dining.bounds[2],
      [[dining.bounds[1] - 1.1, 8.4, 1.3], [dining.bounds[1] - 1.1, -1.35, 1.3],
        [dining.bounds[1] - 1.1, -1.6, 1]], [29, -2.3]);
    const porchGutter = gutters.find(run => run.id === 'porch');
    for (const [id, x, side, label] of [['P1-W', 1, -1, [-4.5, 65.5]], ['P1-E', 30.2, 1, [35, 65.5]]])
    {
      const columnZ = 60.5 + (porch.bounds[3] - 62.25), y = porchGutter.start[1];
      outlet(id, 'Porch gutter / column-side leader', porchGutter, x, porch.bounds[3],
        [[x, y - .65, porch.bounds[3] + .2], [x + side * .8, y - .7, columnZ],
          [x + side * .8, -1.35, columnZ], [x + side * .8, -1.6, columnZ + .3]], label);
    }
    const fallFeetPerFoot = 1 / 192;
    const westOutlet = routes.find(route => route.id === 'D6').points[0][0];
    const eastOutlet = routes.find(route => route.id === 'D7').points[0][0];
    const rearHigh = (main.bounds[0] + extension.bounds[0]) / 2;
    const diningOutlet = routes.find(route => route.id === 'D9').points[0][0];
    const diningMaxRun = diningOutlet - dining.bounds[0];
    for (const gutter of gutters)
    {
      const axis = Math.abs(gutter.end[0] - gutter.start[0]) > .001 ? 0 : 2;
      const start = gutter.start[axis], end = gutter.end[axis];
      let breaks, dropAt;
      if (Math.abs(gutter.start[2] - main.bounds[2]) < .001 && Math.abs(gutter.end[2] - main.bounds[2]) < .001)
      {
        breaks = [westOutlet, rearHigh, eastOutlet];
        dropAt = x => x < westOutlet ? rearHigh - westOutlet - (westOutlet - x)
          : x <= rearHigh ? rearHigh - x : x <= eastOutlet ? x - rearHigh : eastOutlet - rearHigh - (x - eastOutlet);
      }
      else if (gutter.id === 'porch')
      {
        const left = 1, right = 30.2, high = (left + right) / 2;
        breaks = [left, high, right];
        dropAt = x => x < left ? high - left - (left - x)
          : x <= high ? high - x : x <= right ? x - high : right - high - (x - right);
      }
      else if (gutter.id === 'dining-rear' || gutter.id === 'dining-east')
      {
        breaks = gutter.id === 'dining-rear' ? [diningOutlet] : [];
        dropAt = value => diningMaxRun - (gutter.id === 'dining-rear' ? Math.abs(value - diningOutlet)
          : dining.bounds[1] - diningOutlet + value - dining.bounds[2]);
      }
      else
      {
        const outlet = routes.find(route => route.gutterId === gutter.id).points[0][axis];
        const maxRun = Math.max(Math.abs(start - outlet), Math.abs(end - outlet));
        breaks = [outlet];
        dropAt = value => maxRun - Math.abs(value - outlet);
      }
      const stations = [...new Set([0, 1, ...breaks.map(value => (value - start) / (end - start)).filter(t => t > 0 && t < 1)])].sort((a, b) => a - b);
      gutter.stations = stations.map(t => ({ t, dropFeet: dropAt(start + (end - start) * t) * fallFeetPerFoot }));
      gutter.fallFeetPerFoot = fallFeetPerFoot;
    }
    for (const route of routes)
    {
      const gutter = gutters.find(run => run.id === route.gutterId);
      route.points[0][1] -= gutterDropAt(gutter, route.points[0]);
    }
    const collector = { id: 'D0', roof: 'West front gable', valley: [main.bounds[0], eave, front],
      bounds: [main.bounds[0] - .4, main.bounds[0] + .4, front - .15, front + .75],
      topFeet: eave - .08, bottomFeet: eave - .48, outlet: [main.bounds[0] - .05, eave - .68, front + .3] };
    routes.unshift({ id: 'D0', name: 'West front valley receiver / outside-porch leader', collectorId: 'D0',
      points: [collector.outlet.slice(), [collector.outlet[0], -1.35, collector.outlet[2]],
        [collector.outlet[0], -1.6, collector.outlet[2] + .3]], label: [-5, 58.8], supportRequired: true });
    return { gutters, collectors: [collector], routes, fallFeetPerFoot,
      heldAssemblies: ['D1', 'D3', 'D8', 'AB1', 'D10'],
      unresolved: ['Dining west abutment: flashing and cricket/scupper design required',
        'D0 receiver, D1 penetration, D3 return and D8 bypass: sizing, attachment and waterproofing require design'] };
  }

  function gutterDropAt(gutter, point)
  {
    if (!gutter.stations || gutter.stations.length < 2) throw new Error(`Missing fall stations for gutter ${gutter.id}`);
    const dx = gutter.end[0] - gutter.start[0], dz = gutter.end[2] - gutter.start[2], lengthSquared = dx * dx + dz * dz;
    if (lengthSquared < 1e-8) throw new Error(`Zero-length gutter ${gutter.id}`);
    const t = Math.max(0, Math.min(1, ((point[0] - gutter.start[0]) * dx + (point[2] - gutter.start[2]) * dz) / lengthSquared));
    for (let index = 1; index < gutter.stations.length; index++)
    {
      const a = gutter.stations[index - 1], b = gutter.stations[index];
      if (t <= b.t) return a.dropFeet + (b.dropFeet - a.dropFeet) * (t - a.t) / (b.t - a.t);
    }
    return gutter.stations.at(-1).dropFeet;
  }

  function getGarageFrontPediment(floorToFloor = 10)
  {
    const g = upperGeometry(), definitions = getConnectedRoofDefinitions(floorToFloor);
    const main = definitions.find(roof => roof.id === 'Main house');
    const garage = definitions.find(roof => roof.id === 'Garage room-in-roof');
    const center = (garage.bounds[0] + garage.bounds[1]) / 2, z = g.south;
    const base = Math.min(...main.planes.map(plane => heightAt(plane,[center,z])));
    const eave = heightAt(garage.planes[0],[garage.bounds[0],z]), inset = base - eave;
    return [[garage.bounds[0]+inset,base-.16,z],[garage.bounds[1]-inset,base-.16,z],
      [center,Math.min(...garage.planes.map(plane => heightAt(plane,[center,z])))-.16,z]];
  }

  function getGarageEyebrowDefinitions() {
    return [];
  }

  function getSetbackRoofDefinitions() {
    const g = upperGeometry();
    // No separate transition roof: the storage roof and garage returns share the envelope.
    return [];
  }

  function getLowerRoofDefinitions() {
    return getConnectedRoofDefinitions().filter(({ id,finish }) => id.startsWith('Garage') || id === 'Dining rear projection' || finish==='metal');
  }

  function getSetbackAbutments() {
    const g = upperGeometry();
    return [[g.east + .225, 7-.225, g.east + .225, (g.atticNorth+g.atticSouth)/2-.225],
      [27.525,g.north-.225,g.east+.225,g.north-.225]];
  }

  function getPorchRoofDefinitions() {
    const front = typeof getGroundFrontLayout === 'function'
      ? getGroundFrontLayout() : require('./floor-plan-ground.js').getGroundFrontLayout();
    const angle = 0.13, centerHeight = 10.5, centerZ = 57.5 + front.extension;
    const porchPlane = [0, -Math.tan(angle), centerHeight + centerZ * Math.tan(angle)];
    // November 15: one continuous straight low-slope plane across all three
    // bays. The former segmental entry hump was removed (no porch arches).
    // The plane stops at the upper bedroom wall centre line (z53.8) so no skin
    // reaches inside the rooms, and a coplanar infill carries the same plane
    // back to the recessed closet-4 wall (z51.8), so it meets brick everywhere.
    const g = upperGeometry();
    return [
      { id: 'Porch metal', finish: 'metal', bounds: [-0.65, 31.85, g.south, 62.25 + front.extension], planes: [porchPlane] },
      { id: 'Porch recess metal', finish: 'metal', bounds: [g.southClosetWest, g.southClosetEast, g.southClosetSouth, g.south], planes: [porchPlane] }
    ];
  }

  function contains(polygon, point) {
    return polygonConstraints(polygon).every((constraint) => heightAt(constraint, point) >= -epsilon);
  }

  function overlap(a, b) {
    const dx = a.end[0] - a.start[0], dz = a.end[1] - a.start[1];
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared < epsilon) return null;
    const cross = (point) => dx * (point[1] - a.start[1]) - dz * (point[0] - a.start[0]);
    if (Math.abs(cross(b.start)) > epsilon * 20 || Math.abs(cross(b.end)) > epsilon * 20) return null;
    const t = (point) => ((point[0] - a.start[0]) * dx + (point[1] - a.start[1]) * dz) / lengthSquared;
    const from = Math.max(0, Math.min(t(b.start), t(b.end)));
    const to = Math.min(1, Math.max(t(b.start), t(b.end)));
    if (to - from < epsilon) return null;
    const at = (ratio) => [a.start[0] + dx * ratio, a.start[1] + dz * ratio];
    const start = at(from), end = at(to);
    if (Math.abs(heightAt(a.face.plane, start) - heightAt(b.face.plane, start)) > 1e-5 || Math.abs(heightAt(a.face.plane, end) - heightAt(b.face.plane, end)) > 1e-5) return null;
    return { from, to, start, end };
  }

  function surfaceEdges(faces) {
    const edges = faces.flatMap((face) => face.polygon.map((start, index) => ({ face, start, end: face.polygon[(index + 1) % face.polygon.length], covered: [] })));
    const joins = [], boundaries = [];
    const key = (point) => point.map((value) => Math.round(value * 1e5)).join(',');
    const seen = new Set();
    for (let first = 0; first < edges.length; first++) for (let second = first + 1; second < edges.length; second++) {
      const a = edges[first], b = edges[second];
      if (a.face === b.face) continue;
      const common = overlap(a, b);
      if (!common) continue;
      a.covered.push([common.from, common.to]);
      const reversed = overlap(b, a);
      b.covered.push([reversed.from, reversed.to]);
      const delta = a.face.plane.map((value, index) => value - b.face.plane[index]);
      if (Math.hypot(delta[0], delta[1]) < epsilon) continue;
      const joinKey = [key(common.start), key(common.end)].sort().join('|');
      if (seen.has(joinKey)) continue;
      seen.add(joinKey);
      const dx = common.end[0] - common.start[0], dz = common.end[1] - common.start[1], length = Math.hypot(dx, dz);
      const midpoint = [(common.start[0] + common.end[0]) / 2, (common.start[1] + common.end[1]) / 2];
      const left = [midpoint[0] - dz / length * 0.001, midpoint[1] + dx / length * 0.001];
      const sample = contains(a.face.polygon, left) ? left : [midpoint[0] + dz / length * 0.001, midpoint[1] - dx / length * 0.001];
      const valley = heightAt(delta, sample) > 0;
      const start = [common.start[0], heightAt(a.face.plane, common.start), common.start[1]];
      const end = [common.end[0], heightAt(a.face.plane, common.end), common.end[1]];
      joins.push({ type: valley ? 'valley' : Math.abs(start[1] - end[1]) < 1e-5 ? 'ridge' : 'hip', start, end, roofs: [a.face.roof, b.face.roof] });
    }
    for (const edge of edges) {
      const intervals = edge.covered.sort((a, b) => a[0] - b[0]);
      let cursor = 0;
      const add = (from, to) => {
        if (to - from <= epsilon) return;
        const point = (t) => {
          const xz = [edge.start[0] + (edge.end[0] - edge.start[0]) * t, edge.start[1] + (edge.end[1] - edge.start[1]) * t];
          return [xz[0], heightAt(edge.face.plane, xz), xz[1]];
        };
        boundaries.push({ start: point(from), end: point(to), roof: edge.face.roof, plane: edge.face.plane });
      };
      for (const [from, to] of intervals) {
        add(cursor, from);
        cursor = Math.max(cursor, to);
      }
      add(cursor, 1);
    }
    return { joins, boundaries };
  }

  function buildRoofEnvelope(definitions) {
    if (!Array.isArray(definitions) || !definitions.length || definitions.some((definition) => !definition || typeof definition.id !== 'string' || !definition.id || !Array.isArray(definition.bounds) || definition.bounds.length !== 4 || !Array.isArray(definition.planes) || !definition.planes.length || definition.planes.some((plane) => !Array.isArray(plane) || plane.length !== 3))) throw new Error('Roof envelopes require named footprints and three-coefficient height planes.');
    if (new Set(definitions.map((definition) => definition.id)).size !== definitions.length) throw new Error('Roof envelope names must be unique.');
    const patches = definitions.flatMap(roofPatches);
    const faces = [];
    for (let index = 0; index < patches.length; index++) {
      const patch = patches[index];
      let pieces = [patch.polygon];
      for (let other = 0; other < patches.length && pieces.length; other++) {
        if (other === index) continue;
        const candidate = patches[other];
        const delta = candidate.plane.map((value, field) => value - patch.plane[field]);
        const coincident = delta.every((value) => Math.abs(value) < epsilon);
        if (coincident && other > index) continue;
        const constraints = polygonConstraints(candidate.polygon);
        if (!coincident) constraints.push(delta);
        pieces = pieces.flatMap((piece) => {
          let intersection = piece;
          for (const constraint of constraints) {
            intersection = clip(intersection, constraint);
            if (!intersection.length) return [piece];
          }
          return subtract(piece, constraints);
        });
      }
      for (const polygon of pieces) faces.push({ ...patch, polygon });
    }
    const edges = surfaceEdges(faces);
    return { definitions, patches, faces, ...edges };
  }

  function intersectPolygons(polygon, boundary) {
    let result = polygon;
    for (const constraint of polygonConstraints(boundary)) {
      result = clip(result, constraint);
      if (!result.length) break;
    }
    return result;
  }
  // Clip constituent triangles, including interpolated UVs, rather than hide a
  // crossing roof with another opaque object. Vertices are [x,y,z,u,v].
  function trianglesOutsideRectangle(triangles, bounds) {
    const [left, right, rear, front] = bounds;
    const constraints = [p => p[0] - left, p => right - p[0], p => p[2] - rear, p => front - p[2]];
    function half(polygon, value, sign) {
      const result = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const av = value(a) * sign, bv = value(b) * sign;
        if (av >= 0) result.push(a);
        if ((av < 0 && bv > 0) || (av > 0 && bv < 0)) {
          const t = av / (av - bv);
          result.push(a.map((v, j) => v + (b[j] - v) * t));
        }
      }
      return result;
    }
    return triangles.flatMap(triangle => {
      let remaining = triangle;
      const pieces = [];
      for (const constraint of constraints) {
        if (remaining.length < 3) break;
        pieces.push(half(remaining, constraint, -1));
        remaining = half(remaining, constraint, 1);
      }
      return pieces.flatMap(polygon => polygon.slice(1, -1).map((p, i) => [polygon[0], p, polygon[i + 2]]))
        .filter(([a, b, c]) => Math.hypot(
          (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
          (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-8);
    });
  }
  // Remove the part of each triangle inside a convex solid (for example a
  // finished masonry box). planes are [nx, ny, nz, d] with n.p + d >= 0 inside;
  // vertices are [x, y, z, ...attributes] and attributes are interpolated.
  function trianglesOutsideConvex(triangles, planes) {
    const value = (plane, p) => plane[0] * p[0] + plane[1] * p[1] + plane[2] * p[2] + plane[3];
    function half(polygon, plane, sign) {
      const result = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const av = value(plane, a) * sign, bv = value(plane, b) * sign;
        if (av >= 0) result.push(a);
        if ((av < 0 && bv > 0) || (av > 0 && bv < 0)) {
          const t = av / (av - bv);
          result.push(a.map((v, j) => v + (b[j] - v) * t));
        }
      }
      return result;
    }
    return triangles.flatMap((triangle) => {
      let remaining = triangle;
      const pieces = [];
      for (const plane of planes) {
        if (remaining.length < 3) break;
        pieces.push(half(remaining, plane, -1));
        remaining = half(remaining, plane, 1);
      }
      // Whatever remains after every plane lies inside the solid and is dropped.
      return pieces.flatMap((polygon) => polygon.length < 3 ? [] : polygon.slice(1, -1).map((p, i) => [polygon[0], p, polygon[i + 2]]))
        .filter(([a, b, c]) => Math.hypot(
          (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
          (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
          (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-10);
    });
  }
  // Clip wall-head closures to the actual envelope faces. A roof skin above
  // a fixed 19 ft wall is not itself a vertical attic-wall closure.
  function wallHeadSegments(plan, start, end, wallTop, skinDepth = 0.16) {
    const segments = [];
    for (const face of plan.faces) {
      let low = 0, high = 1;
      for (const constraint of polygonConstraints(face.polygon)) {
        const a = heightAt(constraint, start), b = heightAt(constraint, end);
        const delta = b - a;
        if (Math.abs(delta) < epsilon) {
          if (a < -epsilon) { high = -1; break; }
        } else if (delta > 0) low = Math.max(low, -a / delta);
        else high = Math.min(high, -a / delta);
      }
      if (high - low < epsilon) continue;
      const point = (t) => [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
      const a = point(low), b = point(high);
      const top = (p) => Math.max(wallTop, heightAt(face.plane, p) - skinDepth);
      if (Math.max(top(a), top(b)) <= wallTop + epsilon) continue;
      segments.push({ start: [a[0], top(a), a[1]], end: [b[0], top(b), b[1]], bottom: wallTop });
    }
    return segments;
  }
  function getFinishedLoftSection(floorToFloor = 10) {
    // Vertical allowances, not a specified rafter or insulation assembly.
    const ceilingHeightFeet = 9, skinDepthFeet = .16, framingReserveFeet = 1.5, liningDepthFeet = .05;
    const planes = [[0,0,ceilingHeightFeet]];
    return { plane: planes[0], planes, breaks: [], ceilingHeightFeet,
      skinDepthFeet, framingReserveFeet, liningDepthFeet,
      heightAt: () => ceilingHeightFeet,
      eastLimitAtHeight: height => height <= ceilingHeightFeet ? upperGeometry().atticEast : null };
  }
  function getFinishedLoftAreaExclusions(floorToFloor = 10) {
    return [];
  }

  const api = { gutterDropAt, getRoofDrainageLayout, getFinishedLoftSection, getFinishedLoftAreaExclusions, getHistoricalRoofDefinitions, getNovember15RoofDefinitions, getGarageAtticWindows, getGarageFrontPediment, getGarageEyebrowDefinitions, getConnectedRoofDefinitions, getSetbackRoofDefinitions, getLowerRoofDefinitions, getSetbackAbutments, getPorchRoofDefinitions, buildRoofEnvelope, heightAt, contains, signedArea, intersectPolygons, trianglesOutsideRectangle, trianglesOutsideConvex, wallHeadSegments };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HomeRoof = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
