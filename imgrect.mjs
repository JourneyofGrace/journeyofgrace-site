import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(3000);
await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;}'});
const out = await page.evaluate(()=>{
  const b=document.getElementById('block-yui_3_17_2_1_1565980560918_6315');
  if(!b) return {missing:true};
  const r=b.getBoundingClientRect();
  const img=b.querySelector('img');
  return {rect:{top:r.top,left:r.left,w:r.width,h:r.height}, cls:b.className,
    img: img?{clientW:img.clientWidth,clientH:img.clientHeight,natW:img.naturalWidth,natH:img.naturalHeight,src:(img.getAttribute('src')||'').slice(0,90)}:null};
});
console.log(url, JSON.stringify(out));
await browser.close();
