(function (root) {
  'use strict';
  const tolerance = 0.001;
  const near = (a, b) => Math.abs(a - b) < tolerance;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const empty = () => ({ version: 1, rooms: [], walls: [] });
  const length = (wall) => Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const intersects = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > tolerance && Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z) > tolerance;
  const overlap = (a, b, c, d) => Math.min(b, d) - Math.max(a, c) > tolerance;

  function stairOpening(floorToFloor = 10) {
    const run = (Math.ceil(floorToFloor / (2 * 7.5 / 12)) - 1) * (10 / 12);
    // West end already contacts the x=0.175 finished wall. Close the unused
    // powder-side strip in +Z, leaving 1 in to paint / 1/4 in to baseboard.
    const powderWallFace = 35.1 - 0.175;
    const depth = 34.6 - 0.175 - 26.6;
    return { x: 0.175, z: powderWallFace - 1 / 12 - depth, width: run + 4, depth, rotation: Math.PI };
  }

  function validate(baseline, document) {
    if (!document || document.version !== 1 || !Array.isArray(document.rooms) || !Array.isArray(document.walls)) throw new Error('Use a version 1 layout with rooms and walls arrays.');
    if (Object.keys(document).some((key) => !['version', 'rooms', 'walls'].includes(key))) throw new Error('The layout contains unsupported top-level fields.');
    const definitions = [
      ['rooms', baseline.rooms.map((room) => room.name), ['name', 'x', 'z', 'w', 'd']],
      ['walls', baseline.walls.map((wall) => wall[0]), ['name', 'x1', 'z1', 'x2', 'z2', 'thickness']]
    ];
    for (const [kind, names, fields] of definitions) {
      const seen = new Set();
      if (document[kind].length > names.length) throw new Error(`Too many ${kind} in the saved layout.`);
      for (const item of document[kind]) {
        if (!item || typeof item.name !== 'string' || !names.includes(item.name) || seen.has(item.name)) throw new Error(`Unknown or duplicate ${kind} name.`);
        seen.add(item.name);
        if (Object.keys(item).some((key) => !fields.includes(key)) || fields.some((key) => key !== 'name' && (typeof item[key] !== 'number' || !Number.isFinite(item[key])))) throw new Error(`Invalid numeric fields for ${item.name}.`);
        for (const key of fields.filter((field) => !['name', 'thickness'].includes(field))) {
          if (Math.abs(item[key]) > 150) throw new Error(`${item.name}: dimensions/positions must stay within 150 feet.`);
        }
        if (kind === 'rooms' && (item.w < 2 || item.d < 2 || item.w > 80 || item.d > 80)) throw new Error(`${item.name}: width and depth must be 2–80 feet.`);
        if (kind === 'walls') {
          const original = baseline.walls.find((wall) => wall[0] === item.name);
          const vertical = near(original[1], original[3]);
          if ((vertical && (!near(item.x1, item.x2) || item.z2 <= item.z1)) || (!vertical && (!near(item.z1, item.z2) || item.x2 <= item.x1))) throw new Error(`${item.name}: keep the original wall orientation and endpoint order.`);
          const minimum = Math.min(0.75, Math.hypot(original[3] - original[1], original[4] - original[2]));
          if (length(item) < minimum - tolerance || item.thickness < 2 / 12 || item.thickness > 1) throw new Error(`${item.name}: length must be at least ${(minimum * 12).toFixed(1)} inches, thickness 2–12 inches.`);
        }
      }
    }
    return document;
  }

  function transformRect(rect, before, after) {
    if (['x', 'z', 'w', 'd'].every((key) => near(before[key], after[key]))) return { ...rect };
    return {
      ...rect,
      x: after.x + (rect.x - before.x) * after.w / before.w,
      z: after.z + (rect.z - before.z) * after.d / before.d,
      w: rect.w * after.w / before.w,
      d: rect.d * after.d / before.d
    };
  }

  function resolve(baseline, document) {
    validate(baseline, document);
    const stairCut = { x: baseline.stairs.x, z: baseline.stairs.z, w: baseline.stairs.width, d: baseline.stairs.depth };
    const rooms = baseline.rooms.map((room) => ({ ...room, ...document.rooms.find((edit) => edit.name === room.name) }));
    for (const room of rooms) if (intersects(room, stairCut)) throw new Error(`${room.name}: rooms cannot cover the fixed stair opening.`);
    const walls = baseline.walls.map(([name, x1, z1, x2, z2, openings = [], sides = [-1, 1]]) => {
      const wall = { name, x1, z1, x2, z2, thickness: 0.35, ...document.walls.find((edit) => edit.name === name), sides };
      const originalLength = Math.hypot(x2 - x1, z2 - z1);
      const newLength = length(wall);
      wall.openings = openings.map(([start, end, bottom, top]) => {
        if (near(newLength, originalLength)) return [start, end, bottom, top];
        const width = end - start;
        if (newLength + tolerance < width) throw new Error(`${name}: the wall is too short for its ${width.toFixed(2)} ft opening.`);
        const center = (start + end) / 2 / originalLength * newLength;
        const left = Math.max(0, Math.min(newLength - width, center - width / 2));
        return [left, left + width, bottom, top];
      });
      for (let i = 1; i < wall.openings.length; i++) if (wall.openings[i][0] < wall.openings[i - 1][1] - tolerance) throw new Error(`${name}: openings would overlap; lengthen the wall.`);
      const vertical = near(wall.x1, wall.x2);
      const footprint = { x: Math.min(wall.x1, wall.x2) - (vertical ? wall.thickness / 2 : 0), z: Math.min(wall.z1, wall.z2) - (vertical ? 0 : wall.thickness / 2), w: vertical ? wall.thickness : newLength, d: vertical ? newLength : wall.thickness };
      if (intersects(footprint, stairCut)) throw new Error(`${name}: walls cannot cross the fixed stair opening.`);
      return wall;
    });
    const windows = baseline.windows.map(([name, x, z, width, rotation, side]) => {
      const hostIndex = baseline.walls.findIndex(([, x1, z1, x2, z2, openings = []]) => {
        const vertical = near(x1, x2);
        const position = vertical ? z - z1 : x - x1;
        return Math.abs((vertical ? x : z) - (vertical ? x1 : z1)) < 0.15 && openings.some(([a, b, low]) => low > 0 && near((a + b) / 2, position));
      });
      if (hostIndex < 0) throw new Error(`No matching wall opening for ${name}.`);
      const original = baseline.walls[hostIndex], host = walls[hostIndex];
      const vertical = near(original[1], original[3]);
      const position = vertical ? z - original[2] : x - original[1];
      const openingIndex = original[5].findIndex(([a, b, low]) => low > 0 && near((a + b) / 2, position));
      const opening = host.openings[openingIndex];
      const along = (opening[0] + opening[1]) / 2;
      return [name, vertical ? host.x1 + x - original[1] : host.x1 + along, vertical ? host.z1 + along : host.z1 + z - original[2], width, rotation, side];
    });
    const floors = [];
    for (const floor of baseline.floors) {
      const before = baseline.rooms.find((room) => room.name === floor.room);
      const after = rooms.find((room) => room.name === floor.room);
      const resolved = before ? transformRect(floor, before, after) : { ...floor };
      const cut = baseline.stairs;
      if (!intersects(resolved, stairCut)) {
        floors.push(resolved);
        continue;
      }
      const left = Math.max(resolved.x, cut.x), right = Math.min(resolved.x + resolved.w, cut.x + cut.width);
      const back = Math.max(resolved.z, cut.z), front = Math.min(resolved.z + resolved.d, cut.z + cut.depth);
      floors.push(
        { ...resolved, w: left - resolved.x },
        { ...resolved, x: right, w: resolved.x + resolved.w - right },
        { ...resolved, x: left, w: right - left, d: back - resolved.z },
        { ...resolved, x: left, z: front, w: right - left, d: resolved.z + resolved.d - front }
      );
    }
    return { rooms, walls, windows, floors: floors.filter((floor) => floor.w > tolerance && floor.d > tolerance) };
  }

  function documentFrom(baseline, rooms, walls) {
    const document = empty();
    document.rooms = rooms.filter((room) => {
      const original = baseline.rooms.find((item) => item.name === room.name);
      return ['x', 'z', 'w', 'd'].some((key) => !near(room[key], original[key]));
    }).map(({ name, x, z, w, d }) => ({ name, x, z, w, d }));
    document.walls = walls.filter((wall) => {
      const original = baseline.walls.find((item) => item[0] === wall.name);
      return !near(wall.x1, original[1]) || !near(wall.z1, original[2]) || !near(wall.x2, original[3]) || !near(wall.z2, original[4]) || !near(wall.thickness, 0.35);
    }).map(({ name, x1, z1, x2, z2, thickness }) => ({ name, x1, z1, x2, z2, thickness }));
    resolve(baseline, document);
    return document;
  }

  function joinWalls(beforeWalls, afterWalls) {
    const key = (x, z) => `${x.toFixed(5)},${z.toFixed(5)}`;
    const points = new Map();
    function assign(x, z, nextX, nextZ) {
      const id = key(x, z), current = points.get(id);
      if (current && (!near(current.x, nextX) || !near(current.z, nextZ))) throw new Error('Connected walls conflict. Move a smaller wall/room adjustment or undo the previous edit.');
      points.set(id, { x: nextX, z: nextZ });
    }
    afterWalls.forEach((wall, index) => {
      for (const end of ['1', '2']) {
        const before = beforeWalls[index];
        if (!near(wall[`x${end}`], before[`x${end}`]) || !near(wall[`z${end}`], before[`z${end}`])) assign(before[`x${end}`], before[`z${end}`], wall[`x${end}`], wall[`z${end}`]);
      }
    });
    for (let iteration = 0; iteration <= beforeWalls.length; iteration++) {
      const previousSize = points.size;
      beforeWalls.forEach((wall) => {
        const a = points.get(key(wall.x1, wall.z1)) ?? { x: wall.x1, z: wall.z1 };
        const b = points.get(key(wall.x2, wall.z2)) ?? { x: wall.x2, z: wall.z2 };
        if (near(wall.x1, wall.x2) && !near(a.x, b.x)) {
          if (!near(a.x, wall.x1) && !near(b.x, wall.x2)) throw new Error(`${wall.name}: connected endpoints would make this wall diagonal.`);
          const x = !near(a.x, wall.x1) ? a.x : b.x;
          assign(wall.x1, wall.z1, x, a.z);
          assign(wall.x2, wall.z2, x, b.z);
        } else if (near(wall.z1, wall.z2) && !near(a.z, b.z)) {
          if (!near(a.z, wall.z1) && !near(b.z, wall.z2)) throw new Error(`${wall.name}: connected endpoints would make this wall diagonal.`);
          const z = !near(a.z, wall.z1) ? a.z : b.z;
          assign(wall.x1, wall.z1, a.x, z);
          assign(wall.x2, wall.z2, b.x, z);
        }
      });
      if (points.size === previousSize) break;
    }
    afterWalls.forEach((wall, index) => {
      const before = beforeWalls[index];
      for (const end of ['1', '2']) {
        const point = points.get(key(before[`x${end}`], before[`z${end}`]));
        if (point) { wall[`x${end}`] = point.x; wall[`z${end}`] = point.z; }
      }
    });
  }

  function followWallEdges(beforeRooms, beforeWalls, plan) {
    plan.rooms.forEach((room, index) => {
      const before = beforeRooms[index];
      let left = room.x, right = room.x + room.w, back = room.z, front = room.z + room.d;
      for (const [coordinate, value, from, to] of [
        ['x', before.x, before.z, before.z + before.d], ['x', before.x + before.w, before.z, before.z + before.d],
        ['z', before.z, before.x, before.x + before.w], ['z', before.z + before.d, before.x, before.x + before.w]
      ]) {
        const matches = beforeWalls.map((wall, wallIndex) => ({ wall, after: plan.walls[wallIndex] })).filter(({ wall }) => {
          return coordinate === 'x'
            ? near(wall.x1, value) && near(wall.x2, value) && overlap(wall.z1, wall.z2, from, to)
            : near(wall.z1, value) && near(wall.z2, value) && overlap(wall.x1, wall.x2, from, to);
        });
        const moved = matches.filter(({ after }) => !near(after[`${coordinate}1`], value));
        if (!moved.length) continue;
        const next = moved[0].after[`${coordinate}1`];
        if (matches.some(({ after }) => !near(after[`${coordinate}1`], next))) continue;
        if (coordinate === 'x' && near(value, before.x)) left = next;
        else if (coordinate === 'x') right = next;
        else if (near(value, before.z)) back = next;
        else front = next;
      }
      Object.assign(room, { x: left, z: back, w: right - left, d: front - back });
    });
  }

  function editRoom(baseline, document, name, values) {
    const plan = resolve(baseline, document);
    const beforeWalls = copy(plan.walls), beforeRooms = copy(plan.rooms);
    const room = plan.rooms.find((item) => item.name === name);
    if (!room) throw new Error('Select an existing room.');
    const before = { ...room }, after = { ...room, ...values };
    if (['x', 'z', 'w', 'd'].some((key) => typeof after[key] !== 'number' || !Number.isFinite(after[key]))) throw new Error('Enter finite room dimensions in feet.');
    if (intersects(after, { x: baseline.stairs.x, z: baseline.stairs.z, w: baseline.stairs.width, d: baseline.stairs.depth })) throw new Error(`${name}: rooms cannot cover the fixed stair opening.`);
    function point(x, z) {
      if (x < before.x - tolerance || x > before.x + before.w + tolerance || z < before.z - tolerance || z > before.z + before.d + tolerance) return { x, z };
      return { x: after.x + (x - before.x) * after.w / before.w, z: after.z + (z - before.z) * after.d / before.d };
    }
    for (const wall of plan.walls) {
      const start = point(wall.x1, wall.z1), end = point(wall.x2, wall.z2);
      Object.assign(wall, { x1: start.x, z1: start.z, x2: end.x, z2: end.z });
    }
    for (const neighbor of plan.rooms) {
      if (neighbor === room) continue;
      const right = neighbor.x + neighbor.w, front = neighbor.z + neighbor.d;
      let left = neighbor.x, back = neighbor.z, nextRight = right, nextFront = front;
      if (overlap(neighbor.z, front, before.z, before.z + before.d)) {
        if (near(left, before.x)) left = after.x;
        if (near(left, before.x + before.w)) left = after.x + after.w;
        if (near(right, before.x)) nextRight = after.x;
        if (near(right, before.x + before.w)) nextRight = after.x + after.w;
      }
      if (overlap(neighbor.x, right, before.x, before.x + before.w)) {
        if (near(back, before.z)) back = after.z;
        if (near(back, before.z + before.d)) back = after.z + after.d;
        if (near(front, before.z)) nextFront = after.z;
        if (near(front, before.z + before.d)) nextFront = after.z + after.d;
      }
      Object.assign(neighbor, { x: left, z: back, w: nextRight - left, d: nextFront - back });
    }
    Object.assign(room, after);
    joinWalls(beforeWalls, plan.walls);
    followWallEdges(beforeRooms, beforeWalls, plan);
    return documentFrom(baseline, plan.rooms, plan.walls);
  }

  function editWall(baseline, document, name, values) {
    const plan = resolve(baseline, document);
    const beforeWalls = copy(plan.walls), beforeRooms = copy(plan.rooms);
    const wall = plan.walls.find((item) => item.name === name);
    if (!wall) throw new Error('Select an existing wall.');
    const before = { ...wall }, after = { ...wall, ...values };
    const check = copy(document);
    check.walls = check.walls.filter((item) => item.name !== name);
    check.walls.push({ name, x1: after.x1, z1: after.z1, x2: after.x2, z2: after.z2, thickness: after.thickness });
    resolve(baseline, check);
    const vertical = near(before.x1, before.x2);
    for (const other of plan.walls) {
      if (other === wall) continue;
      for (const end of ['1', '2']) {
        const x = other[`x${end}`], z = other[`z${end}`];
        const along = vertical ? z - before.z1 : x - before.x1;
        if (near(vertical ? x : z, vertical ? before.x1 : before.z1) && along >= -tolerance && along <= length(before) + tolerance) {
          const fraction = along / length(before);
          other[`x${end}`] = after.x1 + (after.x2 - after.x1) * fraction;
          other[`z${end}`] = after.z1 + (after.z2 - after.z1) * fraction;
        }
      }
    }
    for (const room of plan.rooms) {
      const right = room.x + room.w, front = room.z + room.d;
      if (vertical && overlap(room.z, front, before.z1, before.z2)) {
        if (near(room.x, before.x1)) { room.x = after.x1; room.w = right - room.x; }
        else if (near(right, before.x1)) room.w = after.x1 - room.x;
      } else if (!vertical && overlap(room.x, right, before.x1, before.x2)) {
        if (near(room.z, before.z1)) { room.z = after.z1; room.d = front - room.z; }
        else if (near(front, before.z1)) room.d = after.z1 - room.z;
      }
    }
    Object.assign(wall, after);
    joinWalls(beforeWalls, plan.walls);
    followWallEdges(beforeRooms, beforeWalls, plan);
    return documentFrom(baseline, plan.rooms, plan.walls);
  }

  function furniturePosition(baseline, plan, x, z) {
    const before = baseline.rooms.filter((room) => x >= room.x && x <= room.x + room.w && z >= room.z && z <= room.z + room.d).sort((a, b) => a.w * a.d - b.w * b.d)[0];
    if (!before) return { x, z };
    const after = plan.rooms.find((room) => room.name === before.name);
    return { x: after.x + (x - before.x) * after.w / before.w, z: after.z + (z - before.z) * after.d / before.d };
  }

  function warnings(baseline, document) {
    const plan = resolve(baseline, document), messages = [];
    for (let i = 0; i < plan.rooms.length; i++) {
      for (const other of plan.rooms.slice(i + 1)) {
        const firstFloors = plan.floors.filter((floor) => floor.room === plan.rooms[i].name);
        const otherFloors = plan.floors.filter((floor) => floor.room === other.name);
        if (firstFloors.some((floor) => otherFloors.some((otherFloor) => intersects(floor, otherFloor)))) messages.push(`${plan.rooms[i].name} overlaps ${other.name}; coordinate their floor/wall boundaries.`);
      }
    }
    if (document.rooms.length || document.walls.length) messages.push(`Verify wall gaps, openings, circulation, window/fixture reach and structural support. Exterior elevations do not automatically follow these ${baseline.floorName ?? 'upstairs'} edits.`);
    return messages;
  }

  const api = { empty, copy, length, stairOpening, validate, resolve, editRoom, editWall, furniturePosition, warnings, serialize: (document) => JSON.stringify(document, null, 2) + '\n' };
  root.UpstairsLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
