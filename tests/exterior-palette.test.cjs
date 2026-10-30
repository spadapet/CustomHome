'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
const context = {};
vm.runInNewContext(source.slice(0, source.indexOf('function buildExteriorModel')), context);

test('actual diffuse conversion produces restrained warm-gray brick without source chroma', () => {
  const normal = new Uint8ClampedArray([128, 132, 254, 255]);
  const roughness = new Uint8ClampedArray([190, 190, 190, 255]);
  const before = [...normal, ...roughness];
  const outputs = [];
  for (const l of [0, 40, 80, 120, 160, 200, 255]) {
    const data = new Uint8ClampedArray([l, l, l, 237]);
    context.gradeExteriorBrickPixels(data);
    const [r, g, b, a] = data;
    assert.ok(r >= 168 && r <= 233);
    assert.ok(g >= 167 && g <= 232);
    assert.ok(b >= 162 && b <= 227);
    assert.ok(r > g && g > b);
    assert.ok(r - g <= 1 && g - b <= 5, 'no red/pink or yellow chroma tails');
    assert.equal(a, 237);
    outputs.push(b);
  }
  assert.ok(outputs[5] - outputs[0] >= 50, 'face/joint detail retained');
  assert.deepEqual([...normal, ...roughness], before);
});

test('red-brown conversion is contrasting and independent from white diffuse bytes', () => {
  const ivory = new Uint8ClampedArray([120, 100, 80, 255]);
  const base = new Uint8ClampedArray(ivory);
  context.gradeExteriorBrickPixels(ivory);
  context.gradeExteriorBrickPixels(base, true);
  assert.deepEqual([...base], [140, 72, 53, 255]);
  assert.ok(ivory[1] > base[1] + 40);
  assert.match(source, /const stoneColor = new THREE\.CanvasTexture\(stoneCanvas\)/,
    'stone has an independent diffuse Source, not red brick');
});

test('red-brown brick retains pale scan mortar and alpha without changing main grading', () => {
  const mortar = new Uint8ClampedArray([180, 175, 168, 237]);
  context.gradeExteriorBrickPixels(mortar, true);
  assert.ok(mortar[0] - mortar[1] < 10);
  assert.ok(mortar[1] > 180);
  assert.equal(mortar[3], 237);
  for (const rgb of [[100,60,30], [180,90,60], [220,130,80]]) {
    const face = new Uint8ClampedArray([...rgb, 255]);
    context.gradeExteriorBrickPixels(face, true);
    assert.ok(face[0] > face[1] + 45 && face[1] > face[2] + 10);
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

test('actual brickBox selects independent base diffuse and clones matching relief at unit repeats', () => {
  const texture = id => ({ id, repeat:{ values:[], set(...v){this.values=v;}, copy(r){this.values=[...r.values];} },
    clone(){return texture(id);} });
  const finish = id => ({map:texture(id),normalMap:texture(id+'-normal'),roughnessMap:texture(id+'-rough'),clone(){return {...this};}});
  const frontBrick = finish('white'), baseBrick = finish('red');
  const c = {frontBrick,baseBrick,masonryMaps:{},brickTextureWidthFeet:10/3,brickTextureHeightFeet:175/48,
    mapBrickBoxUVs:context.mapBrickBoxUVs,
    box(parent,x,y,z,w,h,d,material){return {material,geometry:{attributes:{
      position:{count:1,getX:()=>w/2,getY:()=>h/2,getZ:()=>d/2},
      normal:{getX:()=>0,getY:()=>0},
      uv:{setXY(i,u,v){this.value=[u,v];}}}}};}};
  const start = source.indexOf('  function brickBox(');
  vm.runInNewContext(source.slice(start,source.indexOf('  if (masonryMaps) {',start)),c);
  const red = c.brickBox({},0,0,0,7/6,2.5,7/6,true);
  const white = c.brickBox({},0,0,0,6,9,0.45);
  assert.equal(red.material.map.id,'red');
  assert.equal(white.material.map.id,'white');
  for (const key of ['map','normalMap','roughnessMap']) {
    assert.notEqual(red.material[key],baseBrick[key]);
    assert.deepEqual(red.material[key].repeat.values,[1,1]);
  }
  assert.equal(red.material.bumpMap,null);
  assert.deepEqual(frontBrick.map.repeat.values,[]);
  assert.deepEqual(baseBrick.map.repeat.values,[]);
  assert.ok(Math.abs(red.geometry.attributes.uv.value[1]-1.25/8)<1e-10, 'Stone has its own eight-foot scan module');
});

test('stone grading neutralizes brown source faces, preserves joint contrast and never changes alpha', () => {
  const data = new Uint8ClampedArray([60,30,0,237,210,180,150,255]);
  context.gradeExteriorStonePixels(data);
  assert.deepEqual([...data], [135,133,127,237,222,220,214,255]);
  assert.ok(data[4]-data[0] > 80);
  assert.match(source, /normalScale = new THREE\.Vector2\(0\.3, 0\.3\)/);
});

test('all source hue tails become the same low-chroma warm white', () => {
  for (const rgb of [[255, 0, 0], [255, 150, 140], [0, 255, 255], [70, 60, 200], [255,255,255]]) {
    const data = new Uint8ClampedArray([...rgb, 255]);
    context.gradeExteriorBrickPixels(data);
    assert.ok(data[0] - data[1] <= 1);
    assert.ok(data[1] - data[2] <= 5);
    assert.ok(data[1] > data[2], 'warm, not neutral grey');
  }
});
