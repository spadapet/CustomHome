'use strict';
// November 15 English-French Transitional exterior: the shared material configuration
// and the actual diffuse grading for brick/mortar, entrance cast stone and shingles.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const context = {};
vm.runInNewContext(source.slice(0, source.indexOf('function buildExteriorModel')), context);
const grade = (name, bytes) => { const data = new Uint8ClampedArray(bytes); context[name](data); return [...data]; };
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test('one exterior material configuration names every specified finish', () => {
  const finishes = context.getExteriorMaterialConfig();
  assert.equal(finishes.style, 'English-French Transitional');
  assert.equal(finishes.productsApproved, false);
  for (const key of ['brick', 'mortar', 'castStone', 'window', 'entryDoor', 'shingle', 'porchColumn', 'porchCeiling', 'garageDoor', 'trim', 'gutter', 'lantern', 'porchRoof'])
    assert.ok(finishes[key]?.name || finishes[key]?.color, key);
  assert.match(finishes.castStone.use, /entrance/i);
  assert.match(finishes.castStone.use, /no foundation band/i);
  assert.match(finishes.window.grilles, /traditional 2 wide by 3 high/);
  assert.equal(finishes.window.frontGrilles, true);
  assert.equal(finishes.window.allGrilles, true);
  assert.match(finishes.window.name, /Andersen 100 Series Fibrex, Dark Bronze/);
  assert.match(finishes.brick.coverage, /All four elevations, both floors, every gable and the garage/);
  // Dark bronze, not pure black: warm, low but non-zero value.
  for (const hex of [finishes.window.exterior, finishes.gutter.color, finishes.lantern.color]) {
    const [r, g, b] = rgb(hex);
    assert.ok(r > g && g > b, `${hex} is warm bronze`);
    assert.ok(r >= 0x30 && r <= 0x50, `${hex} is dark but not black`);
  }
  // Warm cream trim/columns (no bright white); warm taupe garage doors.
  for (const hex of [finishes.trim.color, finishes.porchColumn.color]) {
    const [r, g, b] = rgb(hex);
    assert.ok(r > g && g > b && r < 245 && r - b >= 25, `${hex} is warm cream`);
  }
  const [tr, tg, tb] = rgb(finishes.garageDoor.color);
  assert.ok(tr > tg && tg > tb && tr - tb < 40 && tr > 140 && tr < 190, 'muted warm taupe, not oak or white');
  const [pr, pg, pb] = rgb(finishes.porchRoof.color);
  assert.ok(Math.max(pr, pg, pb) < 90 && pr >= pb, 'charcoal porch roof coordinated with the shingles');
  const study = context.getExteriorCladdingStudy();
  assert.equal(study.stoneBand, false);
  assert.equal(study.stoneTop, undefined);
  assert.equal(study.copingTop, undefined);
  assert.equal(study.trim, finishes.trim.color);
  assert.equal(study.metal, finishes.gutter.color);
});

test('brick grading yields warm ivory faces with cream mortar and no source red/orange chroma', () => {
  const normal = new Uint8ClampedArray([128, 132, 254, 255]);
  const before = [...normal];
  // Chromatic scan faces across the luminance range.
  const faces = [0, 40, 80, 120, 160, 200, 255].map((l) => grade('gradeExteriorBrickPixels', [Math.min(255, l + 30), l, Math.max(0, l - 30), 237]));
  for (const [r, g, b, a] of faces) {
    assert.ok(r > g && g > b, 'warm, not cool gray');
    assert.ok(r - g >= 10 && r - g <= 20 && g - b >= 18 && g - b <= 30, 'ivory/cream beige, not red/orange or pure white');
    assert.equal(a, 237);
  }
  assert.ok(faces[5][2] - faces[0][2] >= 40, 'subtle variation and joint relief retained');
  assert.deepEqual(grade('gradeExteriorBrickPixels', [168, 120, 96, 255]), [232, 214, 184, 255], 'warm ivory swatch at scan luminance 128');
  // Strong red/blue/white source tails are pulled to the same ivory family.
  for (const source of [[255, 0, 0], [200, 80, 60], [0, 255, 255], [70, 60, 200]]) {
    const [r, g, b] = grade('gradeExteriorBrickPixels', [...source, 255]);
    assert.ok(r > g && g > b && r - b <= 65 && r - b >= 30, `${source} graded to ivory`);
  }
  // Pale neutral scan joints become light warm cream mortar, lighter than the face.
  const mortar = grade('gradeExteriorBrickPixels', [128, 128, 128, 237]);
  assert.deepEqual(mortar, [242, 233, 213, 237]);
  assert.ok(mortar[0] > 224 && mortar[0] - mortar[2] < 30, 'light warm cream, never dark mortar');
  assert.deepEqual([...normal], before, 'normal/roughness bytes are never graded');
});

test('cast stone is a slightly different warm cream limestone and the roof is charcoal', () => {
  const stone = grade('gradeExteriorStonePixels', [128, 128, 128, 237]);
  assert.deepEqual(stone, [224, 214, 192, 237]);
  const brick = grade('gradeExteriorBrickPixels', [168, 120, 96, 255]);
  const delta = stone.slice(0, 3).map((value, i) => value - brick[i]);
  assert.ok(delta.some((value) => Math.abs(value) >= 5) && delta.every((value) => Math.abs(value) <= 25), 'slightly, not strongly, contrasting');
  const veined = grade('gradeExteriorStonePixels', [60, 30, 0, 237, 210, 180, 150, 255]);
  assert.ok(veined[4] - veined[0] > 20, 'soft limestone relief retained');
  assert.equal(veined[3], 237);
  const roof = grade('gradeExteriorRoofPixels', [128, 128, 128, 237]);
  assert.deepEqual(roof, [84, 81, 76, 237]);
  for (const source of [[200, 80, 20], [20, 80, 200], [255, 0, 45]]) {
    const [r, g, b, a] = grade('gradeExteriorRoofPixels', [...source, 255]);
    assert.equal(r - g, 3);
    assert.equal(g - b, 5, 'deep warm gray, no source hue');
    assert.ok(r < 100);
    assert.equal(a, 255);
  }
});

test('box projection measures physical brick modules independently on front and narrow returns', () => {
  const points = [[-7/12,0,7/12], [7/12,0,7/12], [7/12,2.5,7/12], [7/12,0,-7/12]];
  const normals = [[0,0,1],[0,0,1],[0,0,1],[1,0,0]];
  const attribute = a => ({count:a.length,getX:i=>a[i][0],getY:i=>a[i][1],getZ:i=>a[i][2]});
  const values = [];
  const geometry = {attributes:{position:attribute(points),normal:attribute(normals),uv:{setXY(i,u,v){values[i]=[u,v];}}}};
  context.mapBrickBoxUVs(geometry, 10/3, 175/48);
  assert.ok(Math.abs((values[1][0]-values[0][0])*5-1.75)<1e-10, '14-inch face = 1.75 eight-inch bricks');
  assert.ok(Math.abs(values[2][1]*14-9.6)<1e-10, '30 inches = 9.6 courses');
  assert.equal(values[3][0], values[0][0], 'return uses actual depth, not wide face stretch');
});

test('brickBox keeps independent cast-stone diffuse and clones matching relief at unit repeats', () => {
  const texture = id => ({ id, repeat:{ values:[], set(...v){this.values=v;}, copy(r){this.values=[...r.values];} },
    clone(){return texture(id);} });
  const finish = id => ({map:texture(id),normalMap:texture(id+'-normal'),roughnessMap:texture(id+'-rough'),clone(){return {...this};}});
  const frontBrick = finish('ivory'), baseBrick = finish('cast');
  const c = {frontBrick,baseBrick,masonryMaps:{},brickTextureWidthFeet:10/3,brickTextureHeightFeet:175/48,
    mapBrickBoxUVs:context.mapBrickBoxUVs,
    box(parent,x,y,z,w,h,d,material){return {material,geometry:{attributes:{
      position:{count:1,getX:()=>w/2,getY:()=>h/2,getZ:()=>d/2},
      normal:{getX:()=>0,getY:()=>0},
      uv:{setXY(i,u,v){this.value=[u,v];}}}}};}};
  const start = source.indexOf('  function brickBox(');
  vm.runInNewContext(source.slice(start,source.indexOf('  if (masonryMaps) {',start)),c);
  const cast = c.brickBox({},0,0,0,10.8,0.3,0.15,true);
  const brick = c.brickBox({},0,0,0,6,9,0.45);
  assert.equal(cast.material.map.id,'cast');
  assert.equal(cast.userData.cladding,'cast stone');
  assert.equal(brick.material.map.id,'ivory');
  assert.equal(brick.userData.cladding,'brick');
  for (const key of ['map','normalMap','roughnessMap']) {
    assert.notEqual(cast.material[key],baseBrick[key]);
    assert.deepEqual(cast.material[key].repeat.values,[1,1]);
  }
  assert.deepEqual(brick.material.map.repeat.values,[6/(10/3), 9/(175/48)], 'realistic 8 x 3.125 inch module');
  // Soldier/rowlock courses turn the same brick 90 degrees rather than using stone.
  const turned = [];
  frontBrick.map.clone = () => ({ center:{set(...v){turned.push(['center',...v]);}}, repeat:{set(...v){turned.push(['repeat',...v]);}}, set rotation(v){turned.push(['rotation',v]);} });
  frontBrick.normalMap = null; frontBrick.roughnessMap = null;
  const soldier = c.brickSoldierBox({},0,0,0,8.25,0.35,0.24);
  assert.equal(soldier.userData.bond,'soldier');
  assert.deepEqual(turned.find(t=>t[0]==='rotation'),['rotation',Math.PI/2]);
});
