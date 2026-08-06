import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto('http://localhost:8126/journeyofgrace-site/youth-group.html',{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(2000);
const out = await page.evaluate(()=>{
  const c=document.querySelector('.jog-gallery-container');
  if(!c) return {found:false};
  const html=c.outerHTML;
  const imgs=[...c.querySelectorAll('img')].map(i=>({cls:i.className,src:(i.src||'').slice(0,60),w:i.naturalWidth}));
  return {found:true, cls:c.className, tag:c.tagName, childCount:c.children.length,
    firstKids:[...c.children].slice(0,4).map(k=>`<${k.tagName} class="${k.className}">`),
    nImg:c.querySelectorAll('img').length, imgs:imgs.slice(0,6),
    containerTop: c.getBoundingClientRect().top, docH:document.body.scrollHeight};
});
console.log(JSON.stringify(out,null,1));
// also find any element matching the exact old sqs classes
const out2 = await page.evaluate(()=>{
  const old=document.querySelectorAll('[class*="gallery"]');
  const names={};
  old.forEach(e=>{ e.classList.forEach(cl=>{ if(cl.includes('gallery')) names[cl]=(names[cl]||0)+1; }); });
  return names;
});
console.log('GALLERY CLASSES IN DOM:', JSON.stringify(out2,null,1));
await browser.close();
