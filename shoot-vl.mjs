import { chromium } from 'playwright';
import fs from 'fs';
const OUT = '/tmp/opencode/vl-shots';
fs.mkdirSync(OUT,{recursive:true});
const pages = ['youth-group.html','kids-min.html','connect.html','mens-ministry.html'];
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,120)); });
for (const p of pages) {
  await page.goto(`http://localhost:8126/journeyofgrace-site/${p}`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;}'});
  await page.waitForTimeout(3000);
  const h = await page.evaluate(()=>document.body.scrollHeight);
  console.log(p, 'scrollHeight=', h);
  await page.screenshot({path:`${OUT}/${p.replace('.html','')}.png`, fullPage:true});
}
await browser.close();
