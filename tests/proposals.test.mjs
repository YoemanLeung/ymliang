import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chronologicalProposals, proposalsByYear, proposalTimeLabel} from '../src/lib/proposals.mjs';
const records = JSON.parse(await readFile(new URL('../src/data/proposals.json', import.meta.url), 'utf8'));

test('Program catalog retains every role in descending years without mutating input', () => {
  const original = structuredClone(records);
  const ordered = chronologicalProposals(records);
  const groups = proposalsByYear(records);
  assert.deepEqual(records, original);
  assert.deepEqual(groups.flatMap(group => group.proposals), ordered);
  assert.equal(new Set(ordered.map(record => record.id)).size, records.length);
  for (let index = 1; index < groups.length; index++) assert.ok(groups[index-1].year > groups[index].year);
  assert.deepEqual(new Set(ordered.map(record => record.role)), new Set(['PI', 'Co-I', 'Collaborator']));
  assert.throws(() => chronologicalProposals([...records, records[0]]), /duplicate/);
});

test('Time labels distinguish conditional requests, observed time, and analysis awards', () => {
  const conditional = records.find(record => record.programId === '2025.1.01243.S');
  assert.equal(proposalTimeLabel(conditional), '15.8 h requested');
  assert.throws(() => chronologicalProposals([{...conditional,time:{...conditional.time,basis:'allocated'}}]), /guaranteed/);
  const analysis = records.find(record => record.programId === 'Roman-19061');
  assert.equal(proposalTimeLabel(analysis), 'Analysis program');
  assert.equal(analysis.time, null);
  assert.throws(() => chronologicalProposals([{...analysis,time:{value:1,unit:'hours',basis:'allocated'}}]), /Analysis/);
  assert.equal(proposalTimeLabel(records.find(record => record.programId === '41_103')), '39 h observed');
  assert.equal(proposalTimeLabel(records.find(record => record.programId === '2025B-643331')), '1 night awarded');
});

test('Chandra science leadership and associated US support retain separate attribution', () => {
  const program = records.find(record => record.programId === '27700187');
  assert.equal(program.pi, 'Yongming Liang');
  assert.equal(program.role, 'PI');
  assert.equal(proposalTimeLabel(program), '340 ks awarded');
  assert.equal(program.support.administrativePi, 'Martin Elvis');
  assert.equal(program.support.amount, 61320);
  assert.match(program.support.scope, /including Co-I/);
  assert.equal(program.support.status, 'approved');
  assert.throws(() => chronologicalProposals([{...program,support:{...program.support,administrativePi:null}}]), /support/);
});
