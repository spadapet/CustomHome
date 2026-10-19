'use strict';

function createUpstairsDesigner({ baseline, initialDocument, enter, preview, floor = 'upstairs' }) {
  const element = (id) => document.getElementById(floor === 'ground' ? (id.startsWith('upstairs-') ? id.replace('upstairs-', 'ground-') : `ground-${id}`) : id);
  const title = floor === 'ground' ? 'First-floor designer' : 'Upstairs designer';
  const panel = element('upstairs-designer');
  const svg = element('upstairs-plan');
  const selector = element('designer-object');
  const form = element('designer-properties');
  const status = element('designer-status');
  const saveStatus = element('designer-save-status');
  const warnings = element('designer-warnings');
  const undoButton = element('designer-undo');
  const redoButton = element('designer-redo');
  const namespace = 'http://www.w3.org/2000/svg';
  let documentState = UpstairsLayout.copy(initialDocument);
  let savedDocument = UpstairsLayout.serialize(initialDocument);
  let selection = { kind: 'room', name: baseline.rooms[0].name };
  let undo = [], redo = [], drag = null;
  let viewBox = floor === 'ground' ? [-4, -5, 68, 68] : [-4, -3, 62, 62];
  let saving = false;
  let saveTimer = null;
  let saveError = '';
  const dirty = () => UpstairsLayout.serialize(documentState) !== savedDocument;

  function report(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
    if (error) console.error(`${title}:`, message);
  }

  function node(parent, tag, attributes, text) {
    const element = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    parent.append(element);
    return element;
  }

  function selected(plan) {
    return (selection.kind === 'room' ? plan.rooms : plan.walls).find((item) => item.name === selection.name);
  }

  function updateSaveStatus() {
    saveStatus.textContent = saveError ? `Not saved: ${saveError} Keep this tab open; your edit is still here.`
      : saving ? 'Saving changes to the project...'
      : dirty() ? 'Changes waiting to save automatically...'
      : 'Project layout saved. Edits save automatically as you design.';
    saveStatus.dataset.error = String(Boolean(saveError));
    saveStatus.setAttribute('aria-label', `${title} save status`);
    element('upstairs-designer-open').textContent = dirty() || saving || saveError ? `${title} *` : title;
  }

  function queueSave() {
    clearTimeout(saveTimer);
    updateSaveStatus();
    saveTimer = setTimeout(autosave, 250);
  }

  async function autosave() {
    if (saving || (!dirty() && !saveError)) { updateSaveStatus(); return; }
    const snapshot = UpstairsLayout.copy(documentState);
    const text = UpstairsLayout.serialize(snapshot);
    saving = true;
    saveError = '';
    updateSaveStatus();
    try {
      const response = await fetch(`api/${floor === 'ground' ? 'ground' : 'upstairs'}-layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: snapshot, expected: JSON.parse(savedDocument) }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Automatic saving requires the local preview server: node preview-server.cjs.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `Project save failed (${response.status}).`);
      if (UpstairsLayout.serialize(result.layout) !== text) throw new Error('The server did not confirm this exact layout. Reload before continuing.');
      savedDocument = text;
      if (status.textContent.startsWith('Automatic save failed:')) report('Automatic saving recovered. The project is up to date.');
    } catch (error) {
      saveError = error.message;
      report(`Automatic save failed: ${error.message}`, true);
    } finally {
      saving = false;
      updateSaveStatus();
      if (!saveError && dirty()) queueSave();
    }
  }

  function draw(state = documentState) {
    const plan = UpstairsLayout.resolve(baseline, state);
    svg.replaceChildren();
    svg.setAttribute('viewBox', viewBox.join(' '));
    const defs = node(svg, 'defs', {});
    const gridId = `${floor}-designer-grid`;
    const grid = node(defs, 'pattern', { id: gridId, width: 1, height: 1, patternUnits: 'userSpaceOnUse' });
    node(grid, 'path', { d: 'M 1 0 L 0 0 0 1', fill: 'none', stroke: '#dce0d7', 'stroke-width': 0.035 });
    node(svg, 'rect', { x: -150, y: -150, width: 300, height: 300, fill: `url(#${gridId})` });
    for (const floor of plan.floors.filter((item) => !item.room)) node(svg, 'rect', { x: floor.x, y: floor.z, width: floor.w, height: floor.d, fill: '#e6e9dd' });
    for (const room of plan.rooms) {
      const group = node(svg, 'g', { 'data-kind': 'room', 'data-name': room.name, 'aria-label': room.name });
      const active = selection.kind === 'room' && selection.name === room.name;
      for (const floor of plan.floors.filter((item) => item.room === room.name)) {
        node(group, 'rect', { x: floor.x, y: floor.z, width: floor.w, height: floor.d, fill: active ? '#dce9cc' : room.tile ? '#dde5e6' : '#eee4d1', stroke: active ? '#3c694a' : '#c0c3b6', 'stroke-width': active ? 0.14 : 0.06, 'data-handle': 'move' });
      }
      const label = node(group, 'text', { x: room.x + room.w / 2, y: room.z + room.d / 2, 'text-anchor': 'middle', 'font-size': 0.65, fill: '#30483c', 'pointer-events': 'none' }, room.name);
      node(label, 'tspan', { x: room.x + room.w / 2, dy: 0.95, 'font-size': 0.55 }, `${room.w.toFixed(2)} × ${room.d.toFixed(2)} ft`);
    }
    for (const wall of plan.walls) {
      const active = selection.kind === 'wall' && selection.name === wall.name;
      const group = node(svg, 'g', { 'data-kind': 'wall', 'data-name': wall.name });
      const distance = UpstairsLayout.length(wall);
      const dx = (wall.x2 - wall.x1) / distance, dz = (wall.z2 - wall.z1) / distance;
      const line = (start, end, attributes) => node(group, 'line', { x1: wall.x1 + dx * start, y1: wall.z1 + dz * start, x2: wall.x1 + dx * end, y2: wall.z1 + dz * end, ...attributes });
      line(0, distance, { stroke: 'transparent', 'stroke-width': 16, 'vector-effect': 'non-scaling-stroke', 'data-handle': 'move' });
      let cursor = 0;
      for (const [start, end, bottom] of [...wall.openings, [distance, distance, 0]]) {
        line(cursor, start, { stroke: active ? '#2f7652' : '#666b60', 'stroke-width': wall.thickness, 'data-handle': 'move' });
        if (bottom > 0) line(start, end, { stroke: '#548a9b', 'stroke-width': 0.16, 'data-handle': 'move' });
        cursor = end;
      }
    }
    const stair = baseline.stairs;
    node(svg, 'rect', { x: stair.x, y: stair.z, width: stair.width, height: stair.depth, fill: '#c8cbd0', stroke: '#68717c', 'stroke-dasharray': '0.3 0.2', 'stroke-width': 0.1 });
    node(svg, 'text', { x: stair.x + stair.width / 2, y: stair.z + stair.depth / 2, 'text-anchor': 'middle', 'font-size': 0.65, fill: '#384550' }, 'FIXED STAIRS / VOID');
    const item = selected(plan);
    const handles = node(svg, 'g', { 'data-kind': selection.kind, 'data-name': item.name });
    if (selection.kind === 'room') node(handles, 'rect', { x: item.x + item.w - 0.32, y: item.z + item.d - 0.32, width: 0.64, height: 0.64, fill: '#34694c', 'data-handle': 'resize', class: 'designer-resize-handle' });
    else {
      for (const [handle, x, z] of [['start', item.x1, item.z1], ['end', item.x2, item.z2]]) node(handles, 'circle', { cx: x, cy: z, r: 0.32, fill: '#f8fbf3', stroke: '#2f7652', 'stroke-width': 0.12, 'data-handle': handle, class: 'designer-resize-handle' });
      const pixelsPerFoot = svg.getScreenCTM()?.a;
      const handleScale = pixelsPerFoot > 0 ? Math.max(1, 24 / pixelsPerFoot) : 1;
      const move = node(handles, 'g', { transform: `translate(${(item.x1 + item.x2) / 2} ${(item.z1 + item.z2) / 2}) scale(${handleScale})`, 'data-handle': 'move', class: 'designer-wall-move-handle' });
      node(move, 'title', {}, 'Drag wall up, down, left or right');
      node(move, 'circle', { r: 0.8, fill: '#2f7652', 'data-handle': 'move' });
      node(move, 'path', { d: 'M -.5 0 H .5 M 0 -.5 V .5 M -.3 -.2 L -.5 0 L -.3 .2 M .3 -.2 L .5 0 L .3 .2 M -.2 -.3 L 0 -.5 L .2 -.3 M -.2 .3 L 0 .5 L .2 .3', fill: 'none', stroke: '#ffffff', 'stroke-width': 0.1, 'pointer-events': 'none' });
    }
    return plan;
  }

  function render() {
    const plan = draw();
    const item = selected(plan);
    selector.value = `${selection.kind}:${selection.name}`;
    element('designer-selection-title').textContent = `${selection.kind === 'room' ? 'Room' : 'Wall'}: ${item.name}`;
    panel.querySelectorAll('[data-property-scope]').forEach((element) => { element.hidden = element.dataset.propertyScope !== selection.kind; });
    const values = selection.kind === 'room'
      ? { x: item.x, z: item.z, w: item.w, d: item.d }
      : { x1: item.x1, z1: item.z1, length: UpstairsLayout.length(item), thickness: item.thickness * 12 };
    for (const [key, value] of Object.entries(values)) form.elements.namedItem(key).value = String(Number(value.toFixed(4)));
    undoButton.disabled = undo.length === 0;
    redoButton.disabled = redo.length === 0;
    warnings.replaceChildren();
    for (const message of UpstairsLayout.warnings(baseline, documentState)) {
      const item = document.createElement('li');
      item.textContent = message;
      warnings.append(item);
    }
    updateSaveStatus();
  }

  function commit(next, message) {
    UpstairsLayout.resolve(baseline, next);
    if (UpstairsLayout.serialize(next) !== UpstairsLayout.serialize(documentState)) {
      undo.push(UpstairsLayout.copy(documentState));
      if (undo.length > 100) undo.shift();
      redo = [];
      documentState = next;
    }
    render();
    report(message);
    queueSave();
  }

  function edit(values, original = documentState) {
    return selection.kind === 'room'
      ? UpstairsLayout.editRoom(baseline, original, selection.name, values)
      : UpstairsLayout.editWall(baseline, original, selection.name, values);
  }

  for (const [kind, items] of [['room', baseline.rooms], ['wall', baseline.walls.map((wall) => ({ name: wall[0] }))]]) {
    const group = document.createElement('optgroup');
    group.label = kind === 'room' ? 'Rooms' : 'Walls';
    for (const item of items) {
      const option = document.createElement('option');
      option.value = `${kind}:${item.name}`;
      option.textContent = item.name;
      group.append(option);
    }
    selector.append(group);
  }
  selector.addEventListener('change', () => {
    const [kind, ...name] = selector.value.split(':');
    selection = { kind, name: name.join(':') };
    render();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const fields = selection.kind === 'room' ? ['x', 'z', 'w', 'd'] : ['x1', 'z1', 'length', 'thickness'];
      const values = {};
      for (const key of fields) {
        const value = form.elements.namedItem(key).value.trim();
        if (!value || !Number.isFinite(Number(value))) throw new Error(`Enter a finite value for ${key}.`);
        values[key] = Number(value);
      }
      if (selection.kind === 'wall') {
        const wall = selected(UpstairsLayout.resolve(baseline, documentState));
        const vertical = Math.abs(wall.x2 - wall.x1) < 0.001;
        values.x2 = values.x1 + (vertical ? 0 : values.length);
        values.z2 = values.z1 + (vertical ? values.length : 0);
        values.thickness /= 12;
        delete values.length;
      }
      commit(edit(values), 'Dimensions updated. Preview in 3D to inspect the result.');
    } catch (error) { report(error.message, true); }
  });

  function point(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) throw new Error('The plan is not visible.');
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }
  function snap(value) {
    const step = Number(element('designer-snap').value);
    return Math.round(value / step) * step;
  }
  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target.closest('[data-kind]');
    const start = point(event);
    if (target) {
      selection = { kind: target.dataset.kind, name: target.dataset.name };
      const item = selected(UpstairsLayout.resolve(baseline, documentState));
      drag = { start, item: { ...item }, original: UpstairsLayout.copy(documentState), handle: event.target.dataset.handle ?? 'move', candidate: null };
      render();
    } else drag = { start, pan: [...viewBox], clientX: event.clientX, clientY: event.clientY, scale: svg.getScreenCTM().a };
    svg.setPointerCapture(event.pointerId);
    svg.focus({ preventScroll: true });
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const position = point(event), dx = position.x - drag.start.x, dz = position.y - drag.start.y;
    if (drag.pan) {
      viewBox[0] = drag.pan[0] - (event.clientX - drag.clientX) / drag.scale;
      viewBox[1] = drag.pan[1] - (event.clientY - drag.clientY) / drag.scale;
      svg.setAttribute('viewBox', viewBox.join(' '));
      return;
    }
    if (Math.hypot(dx, dz) < 0.03) return;
    const item = drag.item;
    try {
      let values;
      if (selection.kind === 'room') {
        values = drag.handle === 'resize' ? { w: snap(item.w + dx), d: snap(item.d + dz) } : { x: item.x + snap(dx), z: item.z + snap(dz) };
      } else {
        const vertical = Math.abs(item.x2 - item.x1) < 0.001;
        values = { x1: item.x1, z1: item.z1, x2: item.x2, z2: item.z2 };
        if (drag.handle === 'start') values[vertical ? 'z1' : 'x1'] = (vertical ? item.z1 : item.x1) + snap(vertical ? dz : dx);
        else if (drag.handle === 'end') values[vertical ? 'z2' : 'x2'] = (vertical ? item.z2 : item.x2) + snap(vertical ? dz : dx);
        else {
          values.x1 = item.x1 + snap(dx);
          values.z1 = item.z1 + snap(dz);
          values.x2 = values.x1 + item.x2 - item.x1;
          values.z2 = values.z1 + item.z2 - item.z1;
        }
      }
      drag.candidate = edit(values, drag.original);
      draw(drag.candidate);
      report('Release to apply. Connected walls and adjoining room edges move with this edit.');
    } catch (error) {
      drag.candidate = null;
      draw(drag.original);
      report(error.message, true);
    }
  });
  function endDrag(cancelled) {
    if (!drag) return;
    const next = cancelled ? null : drag.candidate;
    drag = null;
    if (next) commit(next, 'Plan updated. Preview in 3D to check openings and furniture.');
    else render();
  }
  svg.addEventListener('pointerup', () => endDrag(false));
  svg.addEventListener('pointercancel', () => endDrag(true));
  svg.addEventListener('lostpointercapture', () => endDrag(true));
  function history(from, to) {
    if (!from.length) return;
    to.push(UpstairsLayout.copy(documentState));
    documentState = from.pop();
    render();
    report('History updated; preview again to see this state in 3D.');
    queueSave();
  }
  undoButton.addEventListener('click', () => history(undo, redo));
  redoButton.addEventListener('click', () => history(redo, undo));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drag) { endDrag(true); return; }
    if (event.target.matches('input, select, textarea')) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (selection.kind === 'wall' && directions[event.key]) {
      event.preventDefault();
      const item = selected(UpstairsLayout.resolve(baseline, documentState));
      const step = Number(element('designer-snap').value) * (event.shiftKey ? 4 : 1);
      const [dx, dz] = directions[event.key].map((direction) => direction * step);
      try { commit(edit({ x1: item.x1 + dx, z1: item.z1 + dz, x2: item.x2 + dx, z2: item.z2 + dz }), 'Wall moved. Changes save automatically.'); }
      catch (error) { report(error.message, true); }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) history(redo, undo);
      else history(undo, redo);
    }
  });
  element('designer-fit').addEventListener('click', () => {
    const plan = UpstairsLayout.resolve(baseline, documentState);
    const bounds = [...plan.rooms, ...plan.floors, ...plan.walls.map((wall) => ({ x: wall.x1, z: wall.z1, w: wall.x2 - wall.x1, d: wall.z2 - wall.z1 }))];
    const left = Math.min(...bounds.map((r) => r.x)) - 3, top = Math.min(...bounds.map((r) => r.z)) - 3;
    const size = Math.max(...bounds.map((r) => r.x + r.w - left), ...bounds.map((r) => r.z + r.d - top)) + 3;
    viewBox = [left, top, size, size];
    draw();
  });
  for (const [id, factor] of [['designer-zoom-in', 0.8], ['designer-zoom-out', 1.25]]) {
    element(id).addEventListener('click', () => {
      const size = Math.min(180, Math.max(12, viewBox[2] * factor));
      viewBox = [viewBox[0] + (viewBox[2] - size) / 2, viewBox[1] + (viewBox[3] - size) / 2, size, size];
      draw();
    });
  }
  element('designer-reset').addEventListener('click', () => {
    if (confirm(`Reset ${floor === 'ground' ? 'the first floor' : 'upstairs'} to the original model? This will automatically update the project. You can undo it.`)) commit(UpstairsLayout.empty(), 'Original layout restored. Changes save automatically.');
  });
  async function showPreview() {
    const workspace = document.querySelector('.design-workspace');
    try {
      workspace.hidden = false;
      await preview(UpstairsLayout.copy(documentState));
      panel.hidden = true;
      element('upstairs-designer-open').setAttribute('aria-expanded', 'false');
      document.getElementById('model-viewport').focus({ preventScroll: true });
      updateSaveStatus();
    } catch (error) { workspace.hidden = true; report(`Could not preview: ${error.message}`, true); }
  }
  element('designer-preview').addEventListener('click', showPreview);
  element('upstairs-designer-open').addEventListener('click', () => {
    enter();
    document.querySelectorAll('.upstairs-designer').forEach((other) => { other.hidden = true; });
    document.querySelectorAll('.designer-launch button').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    panel.hidden = false;
    document.querySelector('.design-workspace').hidden = true;
    element('upstairs-designer-open').setAttribute('aria-expanded', 'true');
    render();
    selector.focus({ preventScroll: true });
  });

  window.addEventListener('online', queueSave);
  window.addEventListener('beforeunload', (event) => {
    if (!dirty() && !saving && !saveError) return;
    event.preventDefault();
    event.returnValue = '';
  });
  render();
  return { getDocument: () => UpstairsLayout.copy(documentState), isDirty: dirty };
}
