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

  function hipRoof(id, left, right, rear, front, base, ridge, ridgeRear, ridgeLeft, ridgeRight) {
    return {
      id, bounds: [left, right, rear, front],
      planes: [
        [0, (ridge - base) / (ridgeRear - rear), base - (ridge - base) / (ridgeRear - rear) * rear],
        [0, -(ridge - base) / (front - ridgeRear), base + (ridge - base) / (front - ridgeRear) * front],
        [(ridge - base) / (ridgeLeft - left), 0, base - (ridge - base) / (ridgeLeft - left) * left],
        [-(ridge - base) / (right - ridgeRight), 0, base + (ridge - base) / (right - ridgeRight) * right]
      ]
    };
  }

  function getConnectedRoofDefinitions(floorToFloor = 10) {
    const eaves = floorToFloor + 9;
    const g = upperGeometry();
    const mainRear = g.bathNorth - 0.75, mainFront = g.south + 0.75, mainRight = g.southEast + 0.75;
    const garage = { id: 'Garage hip', bounds: [30.3, 56.2, 35.55, 49.85],
      planes: [[0.5, 0, 8.9 - 0.5 * 30.3], [-0.5, 0, 8.9 + 0.5 * 56.2],
        [0, 0.5, 8.9 - 0.5 * 35.55], [0, -0.5, 8.9 + 0.5 * 49.85]] };
    // A genuinely one-story, four-sided roof: no applied front triangle and
    // no invented upper garage volume. Rear abutments remain flashed steps.
    return [
      // Equal 4:12 hips over the actual full-height upper rooms. Eaves stay
      // above the existing nine-foot ceilings; roof space is not living area.
      { id: 'Main house', bounds: [-0.75, mainRight, mainRear, mainFront],
        planes: [[0, 1 / 3, eaves + 0.2 - mainRear / 3], [0, -1 / 3, eaves + 0.2 + mainFront / 3],
          [1 / 3, 0, eaves + 0.2 + 0.75 / 3], [-1 / 3, 0, eaves + 0.2 + mainRight / 3]] },
      hipRoof('East rear wing', g.bathEast - 0.75, g.east + 0.75, g.north - 0.75, g.serviceSouth + 0.75,
        eaves + 0.2, eaves + 0.2 + (g.serviceSouth - g.north + 1.5) / 6,
        (g.north + g.serviceSouth) / 2, g.bathEast + (g.serviceSouth - g.north) / 2, g.east - (g.serviceSouth - g.north) / 2),
      // Stop at the actual garage/loft junction. The old z=23 rear reach
      // put a low garage eave across the east upstairs window elevation.
      garage,
      // The west edge abuts the canopy at the wall, not an overlapping eave
      // projecting through its fascia. Keep the dining ridge and east eave.
      { ...gableRoof('Dining rear projection', 12.55, 27.525, -0.75, 7.5, 8.68, 5.82, true),
        bounds: [13.2, 27.525, -0.75, 7.5] }
    ];
  }

  function getLaundryRoofWindows(floorToFloor = 10) {
    const g = upperGeometry();
    const width = 21 / 12;
    const length = 45.75 / 12;
    const zProjection = length * 3 / Math.sqrt(10);
    const z = g.serviceSouth - 3.7;
    const centers = [g.southEast + 2.7, g.southEast + 6.1];
    const plan = buildRoofEnvelope(getConnectedRoofDefinitions(floorToFloor));
    return centers.map((x, index) => {
      const bounds = [x - width / 2, x + width / 2, z - zProjection / 2, z + zProjection / 2];
      const corners = [[bounds[0], bounds[2]], [bounds[0], bounds[3]], [bounds[1], bounds[2]], [bounds[1], bounds[3]]];
      const face = plan.faces.find(candidate => candidate.roof === 'East rear wing'
        && corners.every(point => contains(candidate.polygon, point)));
      if (!face) throw new Error(`Laundry roof window ${index + 1} does not fit on the east rear wing.`);
      return {
        name: `Laundry roof window ${index + 1}`,
        x, z, width, length, zProjection, bounds, plane: face.plane,
        roofElevation: heightAt(face.plane, [x, z]),
        roughOpeningWidthInches: 21,
        roughOpeningLengthInches: 45.75,
        frameWidthInches: 21.5,
        frameLengthInches: 46.25,
        pitchRise: 4, pitchRun: 12,
        candidateProduct: 'VELUX FS C06 fixed deck-mounted skylight',
        productSelected: false,
        operation: 'fixed'
      };
    });
  }

  function getSetbackRoofDefinitions() {
    const g = upperGeometry();
    // The old rear/east strips are now upper floor. Only the narrow southern
    // loft-to-garage transition remains lower roof; clip it into the garage hip.
    return [{ id: 'Loft garage transition setback roof', finish: 'metal',
      bounds: [g.southEast + .225, 55.8, g.serviceSouth + .225, 36.2],
      planes: [[-1 / 48, -1 / 192, 9.2 + 55.8 / 48 + 36.2 / 192]] }];
  }

  function getLowerRoofDefinitions() {
    return [...getConnectedRoofDefinitions().filter(({ id }) => ['Garage hip', 'Dining rear projection'].includes(id)), ...getSetbackRoofDefinitions()];
  }

  function getSetbackAbutments() {
    const g = upperGeometry();
    return [[g.southEast + .225, g.serviceSouth + .225, 55.8, g.serviceSouth + .225],
      [g.southEast + .225, g.serviceSouth + .225, g.southEast + .225, 36.2]];
  }

  function getPorchRoofDefinitions() {
    const angle = 0.13, centerHeight = 10.5, centerZ = 57.5, halfWidth = 4.5;
    const slope = 2.4 / halfWidth;
    const halfRoofWidth = halfWidth + 0.65 / Math.sqrt(1 + slope * slope);
    return [
      { id: 'Porch metal', finish: 'metal', bounds: [-0.65, 31.85, 52.75, 62.25], planes: [[0, -Math.tan(angle), centerHeight + centerZ * Math.tan(angle)]] }
    ];
  }

  function getGarageCanopyDefinitions() {
    // A lower matching metal brow, with a return to the porch/garage pier.
    // The change in datum is real: a level continuation would cut the
    // one-story garage gable or require raising the garage wall.
    return [
      // Narrow attachment behind the front eave avoids the two low gable
      // corners. The full-width brow starts 0.10 ft beyond that eave;
      // its 0.18 ft fascia depth must also stay clear of the roof edge.
      { id: 'Garage metal wall attachment', finish: 'metal', bounds: [31.8, 54.7, 49.2, 49.95], planes: [[0, -0.25, 8.75 + 49.4 * 0.25]] },
      { id: 'Garage metal brow', finish: 'metal', bounds: [29.9, 56, 49.95, 51.2], planes: [[0, -0.25, 8.75 + 49.4 * 0.25]] },
      // Abut the west face of the 0.45 ft garage return wall, never run
      // the metal through the wall's solid top.
      { id: 'Garage metal return', finish: 'metal', bounds: [29.9, 30.975, 51.2, 54.2], planes: [[0, -0.25, 8.75 + 49.4 * 0.25]] }
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
  const api = { getConnectedRoofDefinitions, getSetbackRoofDefinitions, getLowerRoofDefinitions, getSetbackAbutments, getPorchRoofDefinitions, getGarageCanopyDefinitions, getLaundryRoofWindows, buildRoofEnvelope, heightAt, contains, signedArea, intersectPolygons, trianglesOutsideRectangle, wallHeadSegments };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HomeRoof = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
