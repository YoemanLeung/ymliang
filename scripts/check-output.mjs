import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {researchTopics} from '../src/data/research.mjs';
import {topicReferences} from '../src/lib/research.mjs';
import {chronologicalPapers, groupByYear} from '../src/lib/publications.mjs';
import {chronologicalTalks, talksByYear} from '../src/lib/talks.mjs';
import {summaryTimeLabel} from '../src/lib/proposals.mjs';
const root=resolve('dist'),base=(process.env.SITE_BASE||'/').replace(/\/$/,'');
const data=JSON.parse(await readFile('src/data/academic.json','utf8'));
const talks=chronologicalTalks(JSON.parse(await readFile('src/data/talks.json','utf8')));
const summary=JSON.parse(await readFile('src/data/observing-summary.json','utf8'));
const papers=chronologicalPapers(data.papers);
const topicsByRoute=new Map(researchTopics.map(topic=>['research/'+topic.slug+'/index.html',topic]));
const routes=['index.html','space/index.html','cv/index.html','publications/index.html','talks/index.html','proposals/index.html',...topicsByRoute.keys()];
let links=0;
for(const route of routes){
  const html=await readFile(resolve(root,route),'utf8');
  assert.ok(!html.includes('/Users/'),'private path in output');
  assert.ok(!/Academic view|Explore in 3D|academic-shell|version-switch/.test(html),'retired conventional view in output');
  assert.ok(!/Dates are shown to the precision|some earlier entries|Newest first, across all author roles|Scroll within the list|Rounded totals|Grade C requests|Gemini North/.test(html),'editorial notes or retired telescope in output');
  const expectedPapers=topicsByRoute.has(route)?topicReferences(topicsByRoute.get(route),data.papers):['index.html','cv/index.html','publications/index.html'].includes(route)?papers:[];
  const ids=[...html.matchAll(/\sdata-bibcode="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));
  assert.deepEqual(ids,expectedPapers.map(paper=>paper.bibcode),route+' bibliography order');
  const talkIds=[...html.matchAll(/\sdata-talk-id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(talkIds,['index.html','talks/index.html'].includes(route)?talks.map(talk=>talk.id):[],route+' presentation order');
  assert.ok(!html.includes('data-proposal-id') && !html.includes('proposal-year-'), 'Detailed proposal list must stay local');
  const telescopeIds=[...html.matchAll(/data-facility="([^"]+)"/g)].map(m=>m[1]);
  const hasSummary=['index.html','cv/index.html'].includes(route);
  assert.deepEqual(telescopeIds,hasSummary?summary.facilities.map(row=>row.id):[],route+' summary facilities');
  if(hasSummary){
    for(const row of summary.facilities)for(const role of ['pi','collaboration'])for(const time of row[role].measurements)assert.ok(html.includes(summaryTimeLabel(time)),'missing telescope time');
    assert.ok(html.includes('US$61,320 approved') && html.includes('U.S. administrative PI: Martin Elvis'));
    assert.ok(html.includes('Chandra Cycle 27') && html.includes('Martin Elvis (CfA)'));
    assert.ok(!/Unquantified|unquantified time|>Observed<|Funding policy/.test(html));
    assert.ok(html.includes('1 Analysis program'));
    assert.ok(html.includes('Journal referee:'));
    for(const journal of data.profile.peer_review_journals) assert.ok(html.replaceAll('&amp;','&').includes(journal),'missing reviewer service');
  }
  const allIds=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(allIds).size,allIds.length,route+' contains duplicate element IDs');
  const scriptBlocks=[...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]);
  const browsers=[...html.matchAll(/<year-browser\b[^>]*>[\s\S]*?<\/year-browser>/g)].map(m=>m[0]);
  assert.equal(browsers.length,route==='index.html'?2:['publications/index.html','talks/index.html'].includes(route)?1:0,route+' year browser count');
  for(const browser of browsers){
    const isTalk=browser.includes('data-prefix="talk-year-"');
    const groups=isTalk?talksByYear(talks).map(g=>[g.year,g.talks.length]):groupByYear(papers).map(g=>[g.year,g.papers.length]);
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
  } else if(route==='proposals/index.html'){
    assert.ok(html.includes('content="0;url='+base+'/#proposals"'),'proposal redirect has wrong destination');
    assert.match(html,/window.location.replace\(destination\)/);
  } else if(route==='cv/index.html'||topicsByRoute.has(route))assert.equal(scriptBlocks.length,0,'CV and research pages must contain no client scripts');
  assert.equal(html.includes('id="cosmic-canvas"'),route==='index.html','3D scene belongs only to the homepage');
  if(route==='index.html'){
    assert.ok(html.indexOf('class="hero-profile"')<html.indexOf('id="about"'),'identity belongs in the hero');
    assert.ok(html.indexOf('id="cv"')<html.indexOf('id="publications"'),'career must precede publications');
  }
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
for(const [file,field] of [['academic.json','content_sha256'],['observing-summary.json','observing_summary_sha256']]){
  assert.equal(manifest[field],createHash('sha256').update(await readFile('src/data/'+file)).digest('hex'),'CV fingerprint is stale: '+file);
}
assert.equal(manifest.telescopes,summary.facilities.length);
await assert.rejects(readFile('src/data/proposals.json'), {code:'ENOENT'});
console.log(`Validated ${routes.length} routes, ${papers.length} papers, ${talks.length} presentations, ${summary.facilities.length} telescope totals, independent year panels, CV fingerprints, and ${links} local links/assets.`);
