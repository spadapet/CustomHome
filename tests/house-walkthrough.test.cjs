'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const video = fs.readFileSync(path.join(root, 'assets', 'videos', 'whole-house-walkthrough.mp4'));

function boxes(start = 0, end = video.length) {
  const result = [];
  let offset = start;
  while (offset < end) {
    assert.ok(offset + 8 <= end, 'Complete MP4 box header');
    let size = video.readUInt32BE(offset);
    const type = video.toString('ascii', offset + 4, offset + 8);
    const header = size === 1 ? 16 : 8;
    if (size === 1) size = Number(video.readBigUInt64BE(offset + 8));
    else if (size === 0) size = end - offset;
    assert.ok(Number.isSafeInteger(size) && size >= header && offset + size <= end, `Valid ${type} box size`);
    result.push({ type, start: offset, body: offset + header, end: offset + size });
    offset += size;
  }
  return result;
}

function child(parent, type) {
  const box = boxes(parent.body, parent.end).find((item) => item.type === type);
  assert.ok(box, `${type} exists`);
  return box;
}

const top = boxes();
const movie = top.find((box) => box.type === 'moov');
assert.ok(movie, 'MP4 movie metadata exists');
const header = child(movie, 'mvhd');
const version = video[header.body];
assert.ok(version === 0 || version === 1);
const timescale = video.readUInt32BE(header.body + (version === 1 ? 20 : 12));
const ticks = version === 1 ? Number(video.readBigUInt64BE(header.body + 24)) : video.readUInt32BE(header.body + 16);
const duration = ticks / timescale;

test('shareable movie is a fast-start 4:03 MP4 below the repository file-size limit', () => {
  assert.equal(top[0].type, 'ftyp');
  const media = top.find((box) => box.type === 'mdat');
  assert.ok(media);
  assert.ok(movie.start < media.start, 'Metadata precedes media for progressive playback');
  assert.ok(video.length > 1000000 && video.length < 100 * 1024 * 1024);
  assert.ok(Math.abs(duration - 243) < 1 / 24);
});

test('movie has all 5832 frames at 24 fps in 1280 by 720 H.264 video', () => {
  const track = child(movie, 'trak');
  const trackHeader = child(track, 'tkhd');
  assert.equal(video.readUInt32BE(trackHeader.end - 8) / 65536, 1280);
  assert.equal(video.readUInt32BE(trackHeader.end - 4) / 65536, 720);
  const media = child(track, 'mdia');
  const handler = child(media, 'hdlr');
  assert.equal(video.toString('ascii', handler.body + 8, handler.body + 12), 'vide');
  const samples = child(child(media, 'minf'), 'stbl');
  const description = child(samples, 'stsd');
  assert.equal(video.toString('ascii', description.body + 12, description.body + 16), 'avc1');
  const timing = child(samples, 'stts');
  const count = video.readUInt32BE(timing.body + 4);
  let frames = 0;
  for (let index = 0; index < count; index++) frames += video.readUInt32BE(timing.body + 8 + index * 8);
  assert.equal(frames, 5832);
  assert.ok(Math.abs(frames / duration - 24) < 0.01);
});

test('downloadable movie includes an AAC soundtrack spanning the tour', () => {
  const audio = boxes(movie.body, movie.end).filter((box) => box.type === 'trak').find((track) => {
    const handler = child(child(track, 'mdia'), 'hdlr');
    return video.toString('ascii', handler.body + 8, handler.body + 12) === 'soun';
  });
  assert.ok(audio, 'Embedded audio track exists, not a separate browser-only sound');
  const media = child(audio, 'mdia');
  const description = child(child(child(media, 'minf'), 'stbl'), 'stsd');
  assert.equal(video.toString('ascii', description.body + 12, description.body + 16), 'mp4a');
  const header = child(media, 'mdhd');
  const version = video[header.body];
  const scale = video.readUInt32BE(header.body + (version === 1 ? 20 : 12));
  const ticks = version === 1 ? Number(video.readBigUInt64BE(header.body + 24)) : video.readUInt32BE(header.body + 16);
  assert.ok(Math.abs(ticks / scale - duration) < 0.15, 'Audio covers the entire video');
});

test('captions span the complete movie without gaps and cover both floors, service rooms and exterior', () => {
  const captions = read('assets/videos/whole-house-walkthrough.vtt').replace(/\r\n/g, '\n');
  assert.ok(captions.startsWith('WEBVTT\n'));
  const seconds = (value) => {
    const [hours, minutes, remainder] = value.split(':').map(Number);
    return hours * 3600 + minutes * 60 + remainder;
  };
  const cues = [...captions.matchAll(/(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n([^\n]+)/g)];
  assert.equal(cues.length, 52);
  let end = 0;
  for (const cue of cues) {
    assert.equal(seconds(cue[1]), end);
    end = seconds(cue[2]);
    assert.ok(end > seconds(cue[1]));
  }
  assert.ok(Math.abs(end - duration) < 1 / 24);
  for (const room of ['Living room', 'Dining room', 'Kitchen', 'Prep kitchen', 'Mudroom', 'Two-car garage', 'Kids room', 'Office', 'Powder room', 'Guest bedroom', 'Primary bedroom', 'Primary bathroom', 'Primary walk-in closet', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Loft', 'Laundry', 'Linen', 'Mechanical', 'West shared bathroom', 'East shared bathroom', 'Covered patio', 'House and lot']) {
    assert.ok(captions.includes(room), room);
  }
  assert.match(captions, /basement rooms not modeled/);
  assert.match(captions, /firepit is cold storage only/);
});

test('video is discoverable, accessible, responsive and does not autoplay or preload the movie', () => {
  const page = read('floor-plan-design.html');
  const player = page.match(/<video\b[^>]*>[\s\S]*?<\/video>/)?.[0];
  assert.ok(player);
  assert.match(player, /\bcontrols\b/);
  assert.match(player, /\bplaysinline\b/);
  assert.match(player, /preload="none"/);
  assert.doesNotMatch(player, /\bautoplay\b/);
  assert.match(player, /aria-describedby="house-walkthrough-description"/);
  assert.match(player, /type="video\/mp4"/);
  assert.match(player, /kind="captions"[^>]*srclang="en"/);
  assert.match(page, /whole-house-walkthrough\.mp4" download/);
  assert.match(page, /id="house-walkthrough-description"/);
  assert.match(page, /static snapshot/);
  assert.match(page, /assets\/models\/README\.md/);
  assert.doesNotMatch(page, /silent tour|no narration or music|only a concept/i);
  assert.match(page, /original soft instrumental music/);
  assert.doesNotMatch(page.slice(page.indexOf('id="house-walkthrough"'), page.indexOf('<video')), /<p>/);
  assert.match(read('floor-plan-3d.html'), /href="floor-plan-design\.html#house-walkthrough"/);
  assert.match(read('style.css'), /\.house-walkthrough-video\{[^}]*width:100%;height:auto;aspect-ratio:16\/9/);
  const poster = fs.readFileSync(path.join(root, 'assets', 'videos', 'whole-house-walkthrough.jpg'));
  assert.equal(poster.readUInt16BE(0), 0xffd8);
});
