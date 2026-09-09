import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chronologicalPapers, groupByYear } from '../src/lib/publications.mjs';
import { createCosmicField } from '../src/lib/cosmic-field.mjs';

const data=JSON.parse(readFileSync(new URL('../src/data/academic.json',import.meta.url),'utf8'));

test('newer coauthor papers and preprints precede older first-author work',()=>{
  const input=[
    {bibcode:'old',date:'2025-06',year:2025,type:'refereed',first_author:'Liang, Yongming'},
    {bibcode:'new',date:'2026-07',year:2026,type:'preprint',first_author:'Shimizu, Shunta'},
    {bibcode:'middle',date:'2026-04',year:2026,type:'refereed',first_author:'Kuwayama, Yuto'},
    {bibcode:'proposal',date:'2026-08',year:2026,type:'observing_proposal'},
  ];
  assert.deepEqual(chronologicalPapers(input).map(p=>p.bibcode),['new','middle','old']);
  assert.equal(input[0].bibcode,'old','input must not be mutated');
});
test('same-month ties preserve ADS order, without using author or paper type',()=>{
  const records=[{date:'2026-07',type:'refereed',source_order:5,bibcode:'z'},
    {date:'2026-07',type:'preprint',source_order:2,bibcode:'a'}];
  assert.deepEqual(chronologicalPapers(records).map(p=>p.bibcode),['a','z']);
});
test('real catalog has 38 unique papers with valid dated metadata',()=>{
  const papers=chronologicalPapers(data.papers);
  assert.equal(papers.length,38);
  assert.equal(new Set(papers.map(p=>p.bibcode)).size,38);
  assert.equal(papers.filter(p=>p.type==='preprint').length,4);
  for(const [i,p] of papers.entries()){
    assert.match(p.date,/^20\d{2}-(0[1-9]|1[0-2])$/);
    assert.equal(p.year,Number(p.date.slice(0,4)));
    if(i)assert.ok(papers[i-1].date>=p.date);
    assert.ok(p.title && p.first_author && p.ads_url);
  }
  assert.equal(papers[0].bibcode,'2026arXiv260708264S');
  assert.equal(papers.at(-1).bibcode,'2019ApJ...870...45U');
  assert.deepEqual(groupByYear(papers).map(group=>group.year),[2026,2025,2024,2023,2022,2021,2020,2019]);
});
test('cosmic scene is finite, deterministic, and smaller on mobile',()=>{
  const field=createCosmicField(7021,1),again=createCosmicField(7021,1),mobile=createCosmicField(7021,.55);
  assert.deepEqual(field.positions,again.positions);
  assert.equal(field.positions.length,field.colors.length);
  assert.equal(field.positions.length,field.sizes.length*3);
  assert.ok(field.sizes.length<25000);
  assert.ok(mobile.sizes.length<field.sizes.length);
  for(const values of Object.values(field))assert.ok(values.every(Number.isFinite));
});
