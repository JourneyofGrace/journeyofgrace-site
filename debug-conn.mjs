import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto('http://localhost:8126/journeyofgrace-site/connect.html',{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(2000);
const out = await page.evaluate(()=>{
  const img=document.querySelector('#collection-5d55ccd9c3c43a0001f0e133 .jog-block.image-block');
  if(!img) return {none:'no .jog-block.image-block matching'};
  const cs=getComputedStyle(img);
  const innerImg=img.querySelector('img');
  const r={cls:img.className, display:cs.display, width:cs.width, maxWidth:cs.maxWidth, position:cs.position, left:cs.left, transform:cs.transform};
  if(innerImg){ const ics=getComputedStyle(innerImg); r.img={w:innerImg.clientWidth, natW:innerImg.naturalWidth, h:innerImg.clientHeight, maxWidth:ics.maxWidth, width:ics.width}; }
  const banner=document.querySelector('#collection-5d55ccd9c3c43a0001f0e133 .page-banner-wrapper, #collection-5d55ccd9c3c43a0001f0e133 .jog-hero');
  if(banner){const b=document.querySelector('.page-banner-image-wrapper img')||banner.querySelector('img'); if(b) r.bannerImgH=b.clientHeight;}
  r.docH=document.body.scrollHeight;
  return r;
});
console.log(JSON.stringify(out,null,1));
await browser.close();
