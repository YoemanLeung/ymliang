import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeCosmicCatalogue, createCosmicField} from '../src/lib/cosmic-field.mjs';

const metadata=JSON.parse(readFileSync(new URL('../public/data/cosmic-web.json',import.meta.url)));
const bytes=readFileSync(new URL('../public/data/'+metadata.asset,import.meta.url));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const catalogue=decodeCosmicCatalogue(buffer);

test('packed public simulation matches provenance and contains bounded real positions',()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.sha256);
  assert.equal(bytes.length,metadata.bytes);
  assert.ok(bytes.length<400000,'Keep the dataset within the transfer budget');
  assert.equal(catalogue.count,18960);
  assert.equal(catalogue.boxSize,62.5);
  assert.ok(catalogue.positions.every(x=>x>=0 && x<=62.5));
  assert.ok(catalogue.radii.every(r=>r>.11 && r<9));
});

test('cosmic decoder rejects incomplete, incompatible, and invalid smoothing data',()=>{
  for(const length of [0,15,buffer.byteLength-1])assert.throws(()=>decodeCosmicCatalogue(buffer.slice(0,length)));
  for(const [offset,value] of [[0,0],[4,99],[6,0],[8,0],[12,0],[22,0],[24,0]]){
    const invalid=buffer.slice(0);
    new DataView(invalid).setUint32(offset,value,true);
    assert.throws(()=>decodeCosmicCatalogue(invalid));
  }
});

test('adaptive scene preserves source positions and deterministic mobile sampling',()=>{
  const field=createCosmicField(catalogue), mobile=createCosmicField(catalogue,.55);
  assert.deepEqual(field,createCosmicField(catalogue));
  assert.ok(field.opacities.length<12000);
  assert.ok(mobile.opacities.length<field.opacities.length*.6);
  const sourcePoints=new Set();
  for(let i=0;i<catalogue.count;i++)sourcePoints.add(Array.from(catalogue.positions.subarray(i*3,i*3+3),x=>Math.fround((x-31.25)*36/62.5)).join(','));
  for(const sample of [field,mobile]){
    assert.equal(sample.positions.length,sample.opacities.length*3);
    assert.equal(sample.positions.length,sample.variances.length);
    assert.equal(sample.positions.length,sample.covariances.length);
    assert.equal(sample.tones.length,sample.opacities.length);
    for(const array of Object.values(sample))assert.ok(array.every(Number.isFinite));
    for(let i=0;i<sample.opacities.length;i++)assert.ok(sourcePoints.has(sample.positions.subarray(3*i,3*i+3).join(',')),'Do not invent or displace tracers');
  }
  for(const density of [0,-1,2,NaN])assert.throws(()=>createCosmicField(catalogue,density));
});
