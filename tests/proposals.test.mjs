import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarizeProposals, summaryTimeLabel} from '../src/lib/proposals.mjs';
const publicSummary = JSON.parse(await readFile(new URL('../src/data/observing-summary.json', import.meta.url), 'utf8'));
const record = (id, time, extra={}) => ({id,year:2025,cycle:'Cycle 1',facility:'Example telescope',pi:'Example investigator',role:'PI',title:'Local-only proposal',state:'awarded',kind:'observing',time,...extra});

test('Telescope totals separate roles, units, and requested/observed time', () => {
  const records = [record('a',{value:1.2,unit:'nights',basis:'allocated'}),record('b',{value:2.1,unit:'nights',basis:'allocated'}),record('c',{value:6,unit:'hours',basis:'requested'},{state:'grade-c'}),record('d',{value:8,unit:'hours',basis:'allocated'},{role:'Co-I'}),record('e',{value:2,unit:'hours',basis:'allocated'},{role:'Collaborator'}),record('f',{value:3,unit:'hours',basis:'observed'},{role:'Co-I'})];
  const original = structuredClone(records);
  const summary = summarizeProposals(records,'2026-09-10');
  assert.deepEqual(records,original);
  assert.deepEqual(summary.facilities[0].pi.measurements,[{value:3.3,unit:'nights',basis:'allocated'},{value:6,unit:'hours',basis:'requested'}]);
  assert.deepEqual(summary.facilities[0].collaboration.measurements,[{value:10,unit:'hours',basis:'allocated'},{value:3,unit:'hours',basis:'observed'}]);
  assert.ok(!JSON.stringify(summary).includes('Local-only proposal'));
  assert.ok(!JSON.stringify(summary).includes('Example investigator'));
  assert.throws(() => summarizeProposals([...records,records[0]],'2026-09-10'),/duplicate/);
  assert.throws(() => summarizeProposals([record('g',{value:1,unit:'hours',basis:'allocated'},{state:'grade-c'})],'2026-09-10'),/guaranteed/);
});

test('Unknown allocations and analysis programs never become zero or invented hours', () => {
  const summary = summarizeProposals([record('a',null),record('b',null,{role:'Co-I',kind:'analysis'}),record('c',null,{role:'Co-I',kind:'analysis'})],'2026-09-10');
  const row = summary.facilities[0];
  assert.deepEqual(row.pi,{measurements:[],unquantified:1,analysis:0});
  assert.deepEqual(row.collaboration,{measurements:[],unquantified:0,analysis:2});
  assert.equal(summaryTimeLabel({value:340,unit:'ks'}),'340 ks');
  assert.equal(summaryTimeLabel({value:120,unit:'ks'}),'120 ks');
  assert.equal(summaryTimeLabel({value:9.3,unit:'nights'}),'9 nights');
  assert.equal(summaryTimeLabel({value:21.71,unit:'nights'}),'22 nights');
  assert.equal(summaryTimeLabel({value:60.7,unit:'hours'}),'61 h');
  assert.equal(summaryTimeLabel({value:161.3,unit:'hours'}),'161 h');
  assert.equal(summaryTimeLabel({value:0.5,unit:'nights'}),'½ night');
  assert.equal(summaryTimeLabel({value:1,unit:'nights'}),'1 night');
  assert.equal(summaryTimeLabel({value:2,unit:'orbits'}),'2 orbits');
});

test('Summary order follows wavelength groups regardless of input order', () => {
  const records=['VLA','ALMA','Subaru','Chandra','JWST','Keck','JCMT','NOEMA','MeerKAT','uGMRT'].map((facility,i)=>record('telescope-'+i,{value:1,unit:'hours',basis:'allocated'},{facility}));
  assert.deepEqual(summarizeProposals(records,'2026-09-10').facilities.map(row=>row.facility),['Chandra','Subaru','Keck','JWST','JCMT','ALMA','NOEMA','VLA','MeerKAT','uGMRT']);
});

test('Public data is an aggregate-only schema with separate US funding attribution', () => {
  assert.equal(publicSummary.facilities.length,14);
  assert.equal(new Set(publicSummary.facilities.map(row=>row.id)).size,14);
  assert.ok(!publicSummary.facilities.some(row=>row.facility==='Gemini North'));
  for(const row of publicSummary.facilities){
    assert.deepEqual(Object.keys(row).sort(),['collaboration','facility','id','pi']);
    for(const role of ['pi','collaboration']){
      assert.deepEqual(Object.keys(row[role]).sort(),['analysis','measurements','unquantified']);
      for(const field of ['analysis','unquantified']) assert.ok(Number.isInteger(row[role][field]) && row[role][field]>=0);
      for(const time of row[role].measurements){
        assert.ok(time.value>0 && Number.isFinite(time.value));
        assert.ok(['allocated','requested','observed'].includes(time.basis));
        assert.ok(['hours','nights','ks','orbits'].includes(time.unit));
        assert.deepEqual(Object.keys(time).sort(),['basis','unit','value']);
      }
    }
  }
  assert.equal(publicSummary.support.administrativePi,'Martin Elvis');
  assert.equal(publicSummary.support.cycle,'Cycle 27');
  assert.equal(publicSummary.support.administrativePiAffiliation,'CfA');
  assert.equal(publicSummary.support.amount,61320);
  assert.equal(publicSummary.support.status,'approved');
  assert.match(publicSummary.support.scope,/including Co-I/);
  assert.deepEqual(publicSummary.facilities.find(row=>row.facility==='NOEMA').pi.measurements,[{value:10,unit:'hours',basis:'allocated'}]);
  assert.equal(publicSummary.facilities.find(row=>row.facility==='Roman').collaboration.analysis,1);
});
