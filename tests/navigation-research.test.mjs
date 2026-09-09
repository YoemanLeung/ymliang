import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {yearIndex, moveYear, yearFromHash} from '../src/lib/year-navigation.mjs';
import {chronologicalPapers, groupByYear} from '../src/lib/publications.mjs';
import {topicReferences} from '../src/lib/research.mjs';
import {researchTopics} from '../src/data/research.mjs';

const data = JSON.parse(readFileSync(new URL('../src/data/academic.json',import.meta.url),'utf8'));

test('publication and talk fragments cannot select each other’s year', () => {
  assert.equal(yearFromHash('#year-2024', 'year-'), '2024');
  assert.equal(yearFromHash('#talk-year-2021', 'talk-year-'), '2021');
  assert.equal(yearFromHash('#talk-year-2021', 'year-'), undefined);
  assert.equal(yearFromHash('#year-2024', 'talk-year-'), undefined);
  for (const hash of ['#talks', '#talk-year-20', '#talk-year-2024-extra', '#talk-year-NaN']) {
    assert.equal(yearFromHash(hash, 'talk-year-'), undefined);
  }
});

test('year navigation opens latest, restores a year link, skips gaps and stops at boundaries', () => {
  const years = [2026,2024,2021];
  assert.equal(yearIndex(years, undefined),0);
  assert.equal(yearIndex(years, '2024'),1);
  assert.equal(yearIndex(years, 'not-a-year'),0);
  assert.equal(yearIndex(years, '2025'),0);
  assert.equal(years[moveYear(0,1,years.length)],2024);
  assert.equal(moveYear(0,-1,years.length),0);
  assert.equal(moveYear(2,1,years.length),2);
  assert.equal(moveYear(1,1,3),2);
  assert.equal(moveYear(1,-1,3),0);
  assert.equal(moveYear(0,1,1),0);
});

test('browsing all available years preserves every paper exactly once and in chronological order', () => {
  const papers = chronologicalPapers(data.papers);
  const groups = groupByYear(papers);
  const visited = [];
  let index = 0;
  for (let step=0;step<groups.length;step++) {
    visited.push(...groups[index].papers.map(paper => paper.bibcode));
    index = moveYear(index,1,groups.length);
  }
  assert.deepEqual(visited,papers.map(paper=>paper.bibcode));
  assert.equal(new Set(visited).size,38);
});

test('each research page has resolvable references in date order and no orphan citations', () => {
  assert.equal(new Set(researchTopics.map(topic=>topic.slug)).size,3);
  for (const topic of researchTopics) {
    assert.match(topic.slug,/^[a-z]+(?:-[a-z]+)*$/);
    const references=topicReferences(topic,data.papers);
    assert.ok(references.length>=1);
    assert.equal(new Set(references.map(paper=>paper.bibcode)).size,references.length);
    for (let i=1;i<references.length;i++) assert.ok(references[i-1].date>=references[i].date);
  }
  assert.throws(()=>topicReferences({slug:'bad',sections:[{citations:['missing']}]},data.papers),/Unknown paper missing/);
});
