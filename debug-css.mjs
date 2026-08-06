import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const ctx = await browser.newContext({viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto('http://localhost:8126/journeyofgrace-site/youth-group.html',{waitUntil:'domcontentloaded',timeout:20000});
await page.waitForTimeout(2000);
const out = await page.evaluate(()=>{
  const r={sheets:[],galleries:[],ruleFound:[],computed:[]};
  for (const s of document.styleSheets){
    let href=s.href||'inline';
    r.sheets.push(href);
    let txt='';
    try{ txt=[...s.cssRules].map(c=>c.selectorText||'').join(' | ');}catch(e){txt='(CORS)';}
    if(txt.includes('jog-gallery')||txt.includes('gallery')||txt.includes('sqs-gallery')) r.ruleFound.push({href,sel:txt.match(/[^{]*gallery[^{]*/g)?.slice(0,10)});
  }
  const g=document.querySelectorAll('.jog-gallery-container');
  r.nContainers=g.length;
  g.forEach((c,i)=>{
    r.galleries.push({i,cls:c.className,childCount:c.children.length});
    const inner=c.querySelector('.jog-gallery');
    if(inner) r.computed.push({cs:getComputedStyle(inner).display, grid:'grid'===getComputedStyle(inner).display});
  });
  const th=document.querySelectorAll('.jog-gallery .thumb-image');
  r.thumbCount=th.length;
  const f=document.querySelector('.jog-gallery');
  if(f){const cs=getComputedStyle(f); r.firstGallery={display:cs.display, gridColumns:cs.gridTemplateColumns};}
  return r;
});
console.log(JSON.stringify(out,null,1));
await browser.close();
