import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { serveOutput } from './serve-output.mjs';

const server=await serveOutput('dist',process.env.SITE_BASE || '/');
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
  const page=await browser.newPage();
  const response=await page.goto(server.url+'/cv/',{waitUntil:'networkidle'});
  if(response.status()!==200)throw new Error('CV page did not render');
  await page.evaluate(()=>document.fonts.ready);
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font-family:Arial;font-size:8px;color:#637285;padding:0 17mm;display:flex;justify-content:space-between"><span>Yongming Liang · Curriculum vitae · September 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'});
  const content=await readFile('src/data/academic.json');
  const data=JSON.parse(content);
  const hash=createHash('sha256').update(content).digest('hex');
  for(const folder of ['public/files','dist/files']){
    await mkdir(folder,{recursive:true});
    await writeFile(folder+'/yongming-liang-cv.pdf',pdf);
    await writeFile(folder+'/cv-manifest.json',JSON.stringify({content_sha256:hash,updated:data.updated,papers:data.papers.length},null,2)+'\n');
  }
  console.log(`Generated public CV PDF (${Math.round(pdf.length/1024)} KiB) from the same chronological HTML content.`);
} finally {await browser?.close();await server.close();}
