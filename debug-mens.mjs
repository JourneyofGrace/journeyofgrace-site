import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto('http://localhost:8126/journeyofgrace-site/mens-ministry.html',{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(2000);
const out = await page.evaluate(()=>{
  const g=document.querySelector('.jog-gallery-container');
  const items=[...g.querySelectorAll('.jog-gallery > *')];
  const slides=[...g.querySelectorAll('.slide')];
  const r={gCls:g.className.replace(/\s+/g,' ').slice(0,120), nDirectChildren:items.length, nSlides:slides.length, docH:document.body.scrollHeight};
  const first=slides[0];
  if(first){const cs=getComputedStyle(first); r.firstSlide={cls:first.className, display:cs.display, w:first.clientWidth, h:first.clientHeight, float:cs.float, flex:cs.display==='flex'||cs.display==='grid'?cs.display:null};}
  const gcs=getComputedStyle(g.querySelector('.jog-gallery'));
  r.galleryDisplay=gcs.display; r.galleryCols=gcs.gridTemplateColumns.split(' ').length;
  return r;
});
console.log(JSON.stringify(out,null,1));
await browser.close();
