import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chronologicalTalks, talksByYear, talkDateLabel} from '../src/lib/talks.mjs';
const records = JSON.parse(readFileSync(new URL('../src/data/talks.json', import.meta.url), 'utf8'));

test('the year archive includes each sourced presentation once', () => {
  const sorted = chronologicalTalks(records);
  const groups = talksByYear(records);
  assert.equal(sorted.length, 58);
  assert.deepEqual(groups.map(group => group.year), [2026,2025,2024,2023,2022,2021,2020,2019,2018]);
  assert.deepEqual(groups.flatMap(group => group.talks), sorted);
  assert.equal(new Set(sorted.map(talk => talk.id)).size, sorted.length);
  assert.equal(sorted.filter(talk => talk.title === null).length, 4);
  assert.equal(records.find(talk => talk.id === 'tohoku-2025').date, '2025-08-20');
  assert.equal(records.find(talk => talk.id === 'asj-autumn-2022').date, '2022-09-14');
  assert.equal(records.find(talk => talk.id === 'gew-2024').date, '2024-08-06');
  assert.ok(groups.find(group => group.year === 2025).talks.some(talk => talk.id === 'subaru-2024'));
});

test('month precision stays visible without inventing the first day of the month', () => {
  const sample = [{...records[0], id:'month',date:'2025-06'}, {...records[0], id:'day',date:'2025-06-18'}, {...records[0], id:'later',date:'2025-07'}];
  assert.deepEqual(chronologicalTalks(sample).map(talk => talk.id), ['later','day','month']);
  assert.deepEqual(sample.map(talk => talk.id), ['month','day','later']);
  assert.equal(talkDateLabel('2025-06'), 'Jun 2025');
  assert.equal(talkDateLabel('2025-06-18'), '18 Jun 2025');
});

test('malformed metadata fails before a broken archive can be built', () => {
  const sample = records[0];
  for (const date of ['2025-02-29','2025-00','2025-13','2025-06-00','2025-06-31','2025/06','2025-6']) {
    assert.throws(() => chronologicalTalks([{...sample,date}]), /Invalid talk date/);
  }
  assert.throws(() => chronologicalTalks([sample,sample]), /duplicate talk ID/);
  assert.throws(() => chronologicalTalks([{...sample,type:'attendee'}]), /Unknown talk type/);
  assert.throws(() => chronologicalTalks([{...sample,url:'javascript:alert(1)'}]), /Invalid event URL/);
  assert.throws(() => chronologicalTalks([{...sample,event:''}]), /Missing event/);
});
