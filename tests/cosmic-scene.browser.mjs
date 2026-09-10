import assert from 'node:assert/strict';

export async function checkCosmicScene(browser, base) {
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce',deviceScaleFactor:2});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.cosmicDraws=[];
    const draw=WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays=function(mode,first,count){
      if(this.canvas.id==='cosmic-canvas')window.cosmicDraws.push({time:performance.now(),mode,count});
      return draw.call(this,mode,first,count);
    };
  });
  await page.goto(base+'/',{waitUntil:'networkidle'});
  const stage=page.locator('[data-cosmic-stage]');
  await page.locator('[data-cosmic-stage][data-state="ready"]').waitFor();
  assert.equal(await page.locator('.scene-caption,.scene-key').count(),0);
  assert.ok((await stage.getAttribute('data-source-url')).startsWith(new URL(base+'/').pathname+'data/'));
  assert.ok(await page.locator('canvas').evaluate(canvas=>canvas.width<=Math.ceil(canvas.clientWidth*1.5)));
  const initial=await page.evaluate(()=>window.cosmicDraws.at(-1));
  assert.equal(initial.mode,0,'Only points are rendered; no filament line primitives');
  assert.ok(initial.count>5000 && initial.count<12000);
  await page.locator('#motion-toggle').click();
  await page.evaluate(()=>window.cosmicDraws=[]);
  await page.waitForFunction(()=>window.cosmicDraws.length>=8);
  const frames=await page.evaluate(()=>window.cosmicDraws);
  const duration=frames.at(-1).time-frames[0].time;
  assert.ok((frames.length-1)/duration*1000<34,'Cap rendering at roughly 30 fps');
  assert.ok(frames.every(frame=>frame.mode===0 && frame.count===initial.count));
  await page.locator('#talks').scrollIntoViewIfNeeded();
  // IntersectionObserver delivery can lag on a busy software renderer.
  // Synchronize with the actual scheduler, then verify no further GPU draws.
  await page.locator('[data-cosmic-stage][data-rendering="idle"]').waitFor({state:'attached'});
  const offscreenCount=await page.evaluate(()=>window.cosmicDraws.length);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.cosmicDraws.length),offscreenCount,'Do not animate offscreen');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(previous=>window.cosmicDraws.length>previous,offscreenCount);
  await page.locator('#motion-toggle').click();
  const pausedCount=await page.evaluate(()=>window.cosmicDraws.length);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.cosmicDraws.length),pausedCount,'Pause must stop rendering');
  await page.locator('canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.locator('[data-state="fallback"]').waitFor();
  assert.equal(await page.locator('.hero-profile').isVisible(),true);
  assert.equal(await page.locator('#motion-toggle').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await mobile.goto(base+'/',{waitUntil:'networkidle'});
  await mobile.locator('[data-state="ready"]').waitFor();
  assert.ok(await mobile.locator('canvas').evaluate(canvas=>canvas.width<=Math.ceil(canvas.clientWidth*1.25)));
  assert.equal(await mobile.locator('canvas').evaluate(canvas=>getComputedStyle(canvas).touchAction),'pan-y');
  await mobile.close();

  for(const failure of ['request','corrupt','webgl']){
    const fallback=await browser.newPage({reducedMotion:'reduce'});
    const pageErrors=[];
    fallback.on('pageerror',error=>pageErrors.push(error.message));
    if(failure==='webgl')await fallback.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:getContext.call(this,type,...args);};
    });
    else await fallback.route('**/data/cosmic-web-*.bin',route=>route.fulfill({status:failure==='request'?503:200,body:'Invalid data'}));
    await fallback.goto(base+'/',{waitUntil:'networkidle'});
    await fallback.locator('[data-state="fallback"]').waitFor();
    assert.equal(await fallback.locator('.hero-profile').isVisible(),true);
    assert.equal(await fallback.locator('#motion-toggle').isVisible(),false);
    await fallback.locator('year-browser[data-prefix="year-"] [data-older]').click();
    assert.equal(await fallback.locator('year-browser[data-prefix="year-"] select').inputValue(),'2025');
    assert.deepEqual(pageErrors,[]);
    await fallback.close();
  }
  console.log(JSON.stringify({cosmicPoints:initial.count,drawCallsPerFrame:1,measuredSoftwareFps:Number(((frames.length-1)/duration*1000).toFixed(1)),offscreenPaused:true,fallbacks:['HTTP error','corrupt data','WebGL unavailable','context lost']}));
}
