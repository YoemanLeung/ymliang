import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {researchTopics} from '../src/data/research.mjs';
import {topicReferences} from '../src/lib/research.mjs';
import {chronologicalPapers, groupByYear} from '../src/lib/publications.mjs';
import {chronologicalTalks, talksByYear} from '../src/lib/talks.mjs';
import {chronologicalProposals, proposalsByYear} from '../src/lib/proposals.mjs';
const root=resolve('dist'),base=(process.env.SITE_BASE||'/').replace(/\/$/,'');
const data=JSON.parse(await readFile('src/data/academic.json','utf8'));
const talks=chronologicalTalks(JSON.parse(await readFile('src/data/talks.json','utf8')));
const proposals=chronologicalProposals(JSON.parse(await readFile('src/data/proposals.json','utf8')));
const papers=chronologicalPapers(data.papers);
const topicsByRoute=new Map(researchTopics.map(topic=>['research/'+topic.slug+'/index.html',topic]));
const routes=['index.html','space/index.html','cv/index.html','publications/index.html','talks/index.html','proposals/index.html',...topicsByRoute.keys()];
let links=0;
for(const route of routes){
  const html=await readFile(resolve(root,route),'utf8');
  assert.ok(!html.includes('/Users/'),'private path in output');
  assert.ok(!/Academic view|Explore in 3D|academic-shell|version-switch/.test(html),'retired conventional view in output');
  const expectedPapers=topicsByRoute.has(route)?topicReferences(topicsByRoute.get(route),data.papers):['index.html','cv/index.html','publications/index.html'].includes(route)?papers:[];
  const ids=[...html.matchAll(/\sdata-bibcode="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
  assert.deepEqual(ids,expectedPapers.map(paper=>paper.bibcode),route+' bibliography order');
  const talkIds=[...html.matchAll(/\sdata-talk-id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(talkIds,['index.html','talks/index.html'].includes(route)?talks.map(talk=>talk.id):[],route+' presentation order');
  const proposalIds=[...html.matchAll(/\sdata-proposal-id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(proposalIds,['index.html','proposals/index.html','cv/index.html'].includes(route)?proposals.map(proposal=>proposal.id):[],route+' program order');
  if(proposalIds.length){
    assert.match(html,/US\$61,320 approved/);
    assert.match(html,/U\.S\. administrative PI:/);
    assert.match(html,/Martin Elvis/);
    assert.match(html,/including Co-I grants/);
    assert.match(html,/15\.8 h requested/);
    assert.match(html,/Analysis program/);
  }
  const allIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(allIds).size,allIds.length,route+' contains duplicate element IDs');
  const scriptBlocks=[...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]);
  const browsers=[...html.matchAll(/<year-browser\b[^>]*>[\s\S]*?<\/year-browser>/g)].map(m=>m[0]);
  assert.equal(browsers.length,route==='index.html'?3:['publications/index.html','talks/index.html','proposals/index.html'].includes(route)?1:0,route+' year browser count');
  for(const browser of browsers){
    const isTalk=browser.includes('data-prefix="talk-year-"');
    const isProposal=browser.includes('data-prefix="proposal-year-"');
    const groups=isProposal?proposalsByYear(proposals).map(g=>[g.year,g.proposals.length]):isTalk?talksByYear(talks).map(g=>[g.year,g.talks.length]):groupByYear(papers).map(g=>[g.year,g.papers.length]);
    const years=[...browser.matchAll(/\sdata-year="(\d+)"\sdata-count="(\d+)"/g)].map(m=>[Number(m[1]),Number(m[2])]);
    assert.deepEqual(years,groups);
    assert.match(browser,/data-newer/);assert.match(browser,/data-older/);
    assert.ok(!/data-year="\d+"[^>]*\shidden/.test(browser),'all years must remain readable without JavaScript');
    for(const match of browser.matchAll(/aria-controls="([^"]+)"/g))assert.ok(browser.includes('id="'+match[1]+'"'),'control points outside its browser');
    assert.ok(scriptBlocks.length>0,'missing year browser script on '+route);
  }
  if(route==='space/index.html'){
    assert.match(html,/window.location.replace\(home \+ window.location.search \+ window.location.hash\)/);
    assert.ok(html.includes('content="0;url='+base+'/"'),'legacy redirect has wrong base');
  } else if(route==='cv/index.html'||topicsByRoute.has(route))assert.equal(scriptBlocks.length,0,'CV and research pages must contain no client scripts');
  assert.equal(html.includes('id="cosmic-canvas"'),route==='index.html','3D scene belongs only to the homepage');
  if(topicsByRoute.has(route)){
    const topic=topicsByRoute.get(route);
    for(const section of topic.sections)for(const id of section.citations){
      assert.ok(html.includes('href="#reference-'+id+'"'),'missing research citation');
      assert.ok(html.includes('id="reference-'+id+'"'),'missing reference target');
    }
    assert.ok(html.indexOf('id="references"')>html.indexOf('class="research-prose"'),'references must follow the introduction');
  }
  for(const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)){
    const link=m[1].replaceAll('&amp;','&');
    if(/^(https?:|mailto:|data:)/.test(link))continue;
    const [pathname,hash]=link.split('#');
    assert.ok(!base || !pathname.startsWith('/') || pathname.startsWith(base+'/'),'subpath missing: '+link);
    let file=!pathname?resolve(root,route):pathname.startsWith('/')?resolve(root,'.'+(pathname.slice(base.length)||'/')):resolve(dirname(resolve(root,route)),pathname);
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    await stat(file);
    if(hash && file.endsWith('.html'))assert.ok((await readFile(file,'utf8')).includes('id="'+hash+'"'),'missing fragment '+link);
    links++;
  }
}
const manifest=JSON.parse(await readFile(resolve(root,'files/cv-manifest.json'),'utf8'));
for(const [file,field] of [['academic.json','content_sha256'],['proposals.json','proposals_sha256']]){
  assert.equal(manifest[field],createHash('sha256').update(await readFile('src/data/'+file)).digest('hex'),'CV fingerprint is stale: '+file);
}
assert.equal(manifest.proposals,proposals.length);
console.log(`Validated ${routes.length} routes, ${papers.length} papers, ${talks.length} presentations, ${proposals.length} program entries, independent year panels, CV fingerprints, and ${links} local links/assets.`);
