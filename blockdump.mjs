import { chromium } from 'playwright';
const url = process.argv[2];
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(3000);
await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;}'});
const out = await page.evaluate(()=>{
  const r={docH:document.body.scrollHeight};
  const roots=[...document.querySelectorAll('.jog-entry-content, .sqs-entry-content, main, #main-content, .content-wrapper')];
  const scope=roots[0]||document.body;
  const sel='.jog-block:not(.jog-block-content)';
  scope.querySelectorAll(sel).forEach(b=>{
    const r2=b.getBoundingClientRect();
    if(r2.height>0) r[String(Math.round(r2.top)).padStart(5)]={h:Math.round(r2.height),id:b.id||'',cls:(b.className||'').toString().split(' ').slice(0,2).join(' ')};
  });
  return r;
});
console.log('URL',url,'\n'+JSON.stringify(out,null,1));
await browser.close();
