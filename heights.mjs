import { chromium } from 'playwright';
const pages=['connect','journey-classes','kids-min','life-groups','mens-ministry','service-teams','womens-ministry','youth-group'];
const browser = await chromium.launch({headless:true});
for (const p of pages){
  const ctx = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await ctx.newPage();
  await page.goto('http://localhost:8126/journeyofgrace-site/'+p+'.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForTimeout(3000);
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;}'});
  const h=await page.evaluate(()=>document.body.scrollHeight);
  console.log(p, h);
  await ctx.close();
}
await browser.close();
