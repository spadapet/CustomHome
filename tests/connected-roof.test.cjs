'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { getConnectedRoofDefinitions, getPorchRoofDefinitions, getLaundryRoofWindows, buildRoofEnvelope, contains, heightAt, signedArea, trianglesOutsideRectangle, wallHeadSegments } = require('../floor-plan-roof.js');
const upper = require('../floor-plan-upstairs.js');
const g = upper.getUpstairsMeasuredGeometry();
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should equal ${expected}`);

function rectangleUnionArea(definitions) {
  const xs = [...new Set(definitions.flatMap(({ bounds }) => bounds.slice(0, 2)))].sort((a, b) => a - b);
  const zs = [...new Set(definitions.flatMap(({ bounds }) => bounds.slice(2)))].sort((a, b) => a - b);
  let area = 0;
  for (let x = 1; x < xs.length; x++) for (let z = 1; z < zs.length; z++) {
    const midpoint = [(xs[x - 1] + xs[x]) / 2, (zs[z - 1] + zs[z]) / 2];
    if (definitions.some(({ bounds: [left, right, rear, front] }) => midpoint[0] > left && midpoint[0] < right && midpoint[1] > rear && midpoint[1] < front)) area += (xs[x] - xs[x - 1]) * (zs[z] - zs[z - 1]);
  }
  return area;
}

function strictlyInside(polygon, [x, z]) {
  return polygon.every((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    return (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) > 1e-8;
  });
}

for (const [label, definitions] of [['main house', getConnectedRoofDefinitions()], ['metal porch and entry', getPorchRoofDefinitions()]]) {
  test(`${label} envelope has exactly one top surface throughout its footprint, without gaps or hidden overlaps`, () => {
    const roof = buildRoofEnvelope(definitions);
    close(roof.faces.reduce((sum, face) => sum + signedArea(face.polygon), 0), rectangleUnionArea(definitions));
    let seed = 193;
    const random = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
    const left = Math.min(...definitions.map(({ bounds }) => bounds[0]));
    const right = Math.max(...definitions.map(({ bounds }) => bounds[1]));
    const rear = Math.min(...definitions.map(({ bounds }) => bounds[2]));
    const front = Math.max(...definitions.map(({ bounds }) => bounds[3]));
    let checked = 0;
    for (let sample = 0; sample < 12000; sample++) {
      const point = [left + random() * (right - left), rear + random() * (front - rear)];
      const expected = definitions.filter(({ bounds: [l, r, b, f] }) => point[0] > l && point[0] < r && point[1] > b && point[1] < f)
        .map(({ planes }) => Math.min(...planes.map((plane) => heightAt(plane, point))));
      const faces = roof.faces.filter((face) => strictlyInside(face.polygon, point));
      assert.equal(faces.length, expected.length ? 1 : 0, `Surface ownership at ${point}`);
      if (faces.length) {
        close(heightAt(faces[0].plane, point), Math.max(...expected));
        checked++;
      }
    }
    assert.ok(checked > 8000, 'Check the actual surfaces, not just empty bounding boxes');
  });

  test(`${label} ridges and valleys are shared geometric intersections, not applied crossing roof boxes`, () => {
    const roof = buildRoofEnvelope(definitions);
    if (definitions.length > 1) assert.ok(roof.joins.some((join) => join.type === 'valley'));
    else assert.equal(roof.joins.length, 0, 'Unbroken porch plane has no fabricated valleys');
    if (definitions.length > 1) assert.ok(roof.joins.some((join) => join.type === 'ridge'));
    for (const join of roof.joins) {
      for (const point of [join.start, join.end]) {
        const xz = [point[0], point[2]];
        const touching = roof.faces.filter((face) => face.polygon.every((a, index) => {
          const b = face.polygon[(index + 1) % face.polygon.length];
          return (b[0] - a[0]) * (xz[1] - a[1]) - (b[1] - a[1]) * (xz[0] - a[0]) >= -1e-5;
        }) && Math.abs(heightAt(face.plane, xz) - point[1]) < 1e-5);
        assert.ok(touching.length >= 2, `${join.type} must meet at both ends without a height gap`);
      }
    }
  });
}

test('hipped composition removes all applied front gables and keeps the garage subordinate', () => {
  const roof = buildRoofEnvelope(getConnectedRoofDefinitions());
  assert.ok(!roof.faces.some((face) => /front gable/.test(face.roof)));
  const garage = roof.faces.filter((face) => face.roof === 'Garage hip');
  assert.ok(garage.length >= 4);
  assert.ok(garage.every((face) => face.polygon.every((point) => heightAt(face.plane, point) <= 24 + 1e-7)));
  assert.ok(garage.every((face) => face.polygon.every((point) => point[1] >= 35.55 - 1e-7)),
    'No garage eave across the east loft windows north of the actual garage wall');
  const wingAtAbutment = roof.faces.filter((face) => face.roof === 'East rear wing');
  assert.ok(wingAtAbutment.some((face) => face.polygon.some((point) => Math.abs(point[1] - (g.serviceSouth + .75)) < 1e-6)),
    'Upper wing keeps its own eave over the measured south loft wall');
});

test('main and wing have equal 4:12 hips and garage has a low 6:12 hip', () => {
  const definitions = getConnectedRoofDefinitions();
  const main = definitions.find((definition) => definition.id === 'Main house');
  for (const plane of main.planes) close(Math.hypot(plane[0], plane[1]), 1 / 3);
  const center = g.southEast / 2, halfWidth = (g.southEast + 1.5) / 2;
  for (const point of [[center, 17.6], [center, 37]]) {
    close(Math.min(...main.planes.map((plane) => heightAt(plane, point))), 19.2 + halfWidth / 3);
  }
  const plan = buildRoofEnvelope(definitions);
  const ridge = plan.joins.filter((join) => join.type === 'ridge' && join.roofs.every((roof) => roof === 'Main house'));
  close(ridge.reduce((length, join) => length + Math.abs(join.end[2] - join.start[2]), 0), g.south - g.bathNorth - g.southEast);
  for (const join of ridge) for (const point of [join.start, join.end]) {
    close(point[0], center);
    close(point[1], 19.2 + halfWidth / 3);
  }
  const wing = definitions.find((definition) => definition.id === 'East rear wing');
  for (const plane of wing.planes) close(Math.hypot(plane[0], plane[1]), 1 / 3);
  for (const name of ['Garage hip']) {
    const gable = definitions.find(({ id }) => id === name);
    for (const plane of gable.planes) close(Math.hypot(plane[0], plane[1]), 0.5);
    if (name !== 'Garage hip') {
      close(gable.bounds[2], 1.35);
      const ridge = plan.joins.filter((join) => join.type === 'ridge' && join.roofs.every((roof) => roof === name));
      assert.ok(ridge.some((join) => Math.min(join.start[2], join.end[2]) < 9),
        'Rear hip must join the actual long main ridge, not expose detached front tips');
    }
  }
});

test('two fixed laundry roof windows fit the measured room and one east-wing roof face', () => {
  const windows = getLaundryRoofWindows();
  assert.equal(windows.length, 2);
  const wing = buildRoofEnvelope(getConnectedRoofDefinitions()).faces.filter((face) => face.roof === 'East rear wing');
  for (const [index, window] of windows.entries()) {
    close(window.x, g.southEast + (index === 0 ? 2.7 : 6.1));
    close(window.z, g.serviceSouth - 3.7);
    close(window.roughOpeningWidthInches, 21);
    close(window.roughOpeningLengthInches, 45.75);
    close(window.frameWidthInches, 21.5);
    close(window.frameLengthInches, 46.25);
    close(Math.hypot(window.plane[0], window.plane[1]), 1 / 3);
    assert.ok(window.bounds[0] > g.southEast && window.bounds[1] < g.laundryEast);
    assert.ok(window.bounds[2] > g.laundryNorth && window.bounds[3] < g.serviceSouth);
    const corners = [[window.bounds[0], window.bounds[2]], [window.bounds[0], window.bounds[3]],
      [window.bounds[1], window.bounds[2]], [window.bounds[1], window.bounds[3]]];
    const host = wing.find((face) => corners.every((point) => contains(face.polygon, point)));
    assert.ok(host, 'Each rough opening must be bounded by a single east-wing roof face');
    close(window.roofElevation, heightAt(window.plane, [window.x, window.z]));
    const faceTriangles = host.polygon.slice(1, -1).map((_, index) => {
      const points = [host.polygon[0], host.polygon[index + 2], host.polygon[index + 1]];
      return points.map((point) => [point[0], heightAt(host.plane, point), point[1], point[0], point[1]]);
    });
    const remaining = trianglesOutsideRectangle(faceTriangles, window.bounds);
    const planArea = (triangles) => triangles.reduce((sum, triangle) => sum + Math.abs(triangle.reduce((cross, point, vertex) => {
      const next = triangle[(vertex + 1) % triangle.length];
      return cross + point[0] * next[2] - next[0] * point[2];
    }, 0)) / 2, 0);
    close(planArea(faceTriangles) - planArea(remaining), window.width * window.zProjection);
  }
  assert.ok(windows[1].bounds[0] > windows[0].bounds[1], 'Keep a positive roof-web gap between openings');
});

test('roof-window rectangle clipping removes only its opening area and preserves UV interpolation', () => {
  const source = [[[0, 0, 0, 0, 0], [4, 0, 0, 1, 0], [0, 0, 4, 0, 1]]];
  const clipped = trianglesOutsideRectangle(source, [0.5, 1.5, 0.5, 1.5]);
  const area = clipped.reduce((sum, triangle) => sum + Math.abs(triangle.reduce((cross, point, index) => {
    const next = triangle[(index + 1) % triangle.length];
    return cross + point[0] * next[2] - next[0] * point[2];
  }, 0)) / 2, 0);
  close(area, 7);
  assert.ok(clipped.length > 1);
  assert.ok(clipped.flat().every((vertex) => vertex.length === 5 && vertex.every(Number.isFinite)));
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const upstairs = fs.readFileSync(require.resolve('../floor-plan-upstairs.js'), 'utf8');
  assert.match(exterior, /trianglesOutsideRectangle\(remaining, bounds\)/);
  assert.match(exterior, /East rear wing.*?map\(\(window\) => window\.bounds\)/s);
  assert.match(upstairs, /roofWindowShaft/);
});

test('wall-head constituents close the actual gap to the roof, with no change to 19 ft room walls', () => {
  const plan = buildRoofEnvelope(getConnectedRoofDefinitions());
  for (const [, x1, z1, x2, z2] of upper.getUpstairsExteriorSegments()) {
    const a = [x1, z1], b = [x2, z2];
    const segments = wallHeadSegments(plan, a, b, 19);
    close(segments.reduce((sum, segment) => sum + Math.hypot(segment.end[0] - segment.start[0], segment.end[2] - segment.start[2]), 0),
      Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (const segment of segments) for (const point of [segment.start, segment.end]) {
      close(segment.bottom, 19);
      assert.ok(point[1] > 19 && point[1] < 24);
      assert.ok(plan.faces.some((face) => Math.abs(heightAt(face.plane, [point[0], point[2]]) - 0.16 - point[1]) < 1e-6));
    }
  }
});

test('hip roof undersides cover the upper wall heads instead of exposing white wall strips through roofing', () => {
  const definitions = getConnectedRoofDefinitions();
  const walls = upper.getUpstairsExteriorSegments().map(([, ...s]) => s);
  for (const [x1, z1, x2, z2] of walls) for (let step = 0; step <= 100; step++) {
    const point = [x1 + (x2 - x1) * step / 100, z1 + (z2 - z1) * step / 100];
    const heights = definitions.filter(({ bounds: [left, right, rear, front] }) => point[0] >= left && point[0] <= right && point[1] >= rear && point[1] <= front)
      .map(({ planes }) => Math.min(...planes.map((plane) => heightAt(plane, point))));
    assert.ok(Math.max(...heights) - 0.16 > 19, `Roof underside must cover the 19 ft wall head at ${point}`);
  }
});

test('only visible envelope surfaces are rendered, with a persistent roof-plan camera and clipped metal ribs', () => {
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  const viewer = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  assert.match(exterior, /renderRoofEnvelope\('Connected main-house roof system', HomeRoof\.getConnectedRoofDefinitions/);
  assert.match(exterior, /renderRoofEnvelope\('Connected standing-seam porch and entry roof', HomeRoof\.getPorchRoofDefinitions/);
  assert.match(exterior, /Clipped standing-seam roof rib/);
  assert.doesNotMatch(exterior, /panel\.name = entryPediment \? 'Entry standing-seam metal roof panel' : 'Brown-shingle pitched roof'/);
  assert.match(exterior, /Fitted upper attic wall-head closure/);
  assert.ok(html.indexOf('floor-plan-roof.js') < html.indexOf('floor-plan-exterior.js'));
  assert.match(html, /data-view="exterior-roof"[^>]*>Roof plan/);
  assert.match(viewer, /'exterior-roof': \{ target: \[27\.75, 12, 31\]/);
});

test('invalid roof definitions fail explicitly instead of producing an empty success-shaped model', () => {
  for (const definitions of [null, [], [{}], [{ id: 'broken', bounds: [0, 1, 0, 1], planes: [[0, 1]] }]]) {
    assert.throws(() => buildRoofEnvelope(definitions), /require named footprints/);
  }
  const definition = getPorchRoofDefinitions()[0];
  assert.throws(() => buildRoofEnvelope([definition, definition]), /unique/);
  assert.throws(() => buildRoofEnvelope([{ ...definition, bounds: [1, 0, 0, 1] }]), /Invalid roof definition/);
});
