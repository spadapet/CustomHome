(function (root) {
  'use strict';
  const room = { width: 115.8, depth: (34.425 - 24.91166666666667) * 12, entryStart: (27 - 24.91166666666667) * 12, entryEnd: (31.5 - 24.91166666666667) * 12 };
  const walls = ['N', 'E', 'S'];
  const overlap = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.01 && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > 0.01;
  function candidates(wall, desk) {
    const length = desk ? 47.25 : 39;
    const depth = desk ? 31.5 : 17.375;
    const span = wall === 'E' ? room.depth : room.width;
    const end = span - length - 2.1;
    const offsets = new Set([2.1, end, (span - length) / 2]);
    for (let offset = 2.1; offset <= end; offset += 6) offsets.add(offset);
    return [...offsets].sort((a, b) => a - b).map((offset) => {
      const rect = wall === 'N' ? { x: offset, y: 2.1, w: length, d: depth }
        : wall === 'S' ? { x: offset, y: room.depth - 2.1 - depth, w: length, d: depth }
          : { x: room.width - 2.1 - depth, y: offset, w: depth, d: length };
      const useDepth = desk ? 30 : 17.375;
      const use = wall === 'N' ? { x: rect.x, y: rect.y + rect.d, w: rect.w, d: useDepth }
        : wall === 'S' ? { x: rect.x, y: rect.y - useDepth, w: rect.w, d: useDepth }
          : { x: rect.x - useDepth, y: rect.y, w: useDepth, d: rect.d };
      return { ...rect, wall, desk, use };
    });
  }
  function assess(parts) {
    const warnings = [];
    const entry = { x: 0, y: room.entryStart, w: 30, d: room.entryEnd - room.entryStart };
    let score = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (overlap(part, entry)) { warnings.push(`${part.label} occupies the 30-inch entry approach`); score += 100; }
      for (let j = 0; j < parts.length; j++) {
        if (i !== j && overlap(part.use, parts[j])) {
          warnings.push(`${part.label} ${part.desk ? 'chair zone' : 'bin pull'} meets ${parts[j].label}`);
          score += 10;
        }
      }
      for (let j = i + 1; j < parts.length; j++) {
        if (overlap(part.use, parts[j].use)) {
          warnings.push(`${part.label} / ${parts[j].label} use zones overlap`);
          score += 1;
        }
      }
    }
    return { score, warnings };
  }
  function sample(assignment) {
    const pools = assignment.map((wall, index) => candidates(wall, index < 2));
    let best = null;
    let visits = 0;
    function search(parts) {
      if (++visits > 40000 || best?.score === 0) return;
      if (parts.length === 4) {
        const result = assess(parts);
        if (!best || result.score < best.score) best = { ...result, parts: [...parts] };
        return;
      }
      const index = parts.length;
      for (const part of pools[index]) {
        if (parts.some((other) => overlap(part, other))) continue;
        if (index === 3 && assignment[2] === assignment[3] && (part.wall === 'E' ? part.y <= parts[2].y : part.x <= parts[2].x)) continue;
        search([...parts, { ...part, label: ['PC', 'Make', 'Bins A', 'Bins B'][index] }]);
      }
    }
    search([]);
    return best;
  }
  function generate() {
    const options = [];
    for (const pc of walls) for (const make of walls) for (let a = 0; a < walls.length; a++) for (let b = a; b < walls.length; b++) {
      const assignment = [pc, make, walls[a], walls[b]];
      options.push({ id: options.length + 1, assignment, layout: sample(assignment) });
    }
    return options;
  }
  const api = { room, overlap, assess, generate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KidsRoomOptions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
