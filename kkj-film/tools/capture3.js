const { chromium } = require('playwright'); const route=require('./open.js');
const OUT='materials/shots/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  p.on('pageerror', e => console.log('ERR', e.message)); await route(p);
  const mask = () => p.evaluate(() => {
    const re=/(0\d[\d\- ]{7,11}\d)|(นาย|นางสาว|นาง|น\.ส\.)\S*/;
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let n; const hits=[]; while((n=w.nextNode())) if(re.test(n.textContent)) hits.push(n.parentElement);
    hits.forEach(e=>{e.style.filter='blur(8px)';}); return hits.length; });
  const shot = async (name) => { console.log(name,'masked',await mask()); await p.waitForTimeout(500); await p.screenshot({ path: OUT+name+'.png' }); };
  const tab = async (t) => { t=t; await p.evaluate((t)=>{[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\p{Extended_Pictographic}|\uFE0F/gu,'').trim()===t).click();},t); await p.waitForTimeout(1000); await p.mouse.wheel(0,-3000); await p.waitForTimeout(300); };
  const btn = async (txt, i=0) => { await p.locator('button',{hasText:txt}).nth(i).click(); await p.waitForTimeout(1000); };
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2500);
  await btn('ข้าม');
  
  
  await tab('คนไข้'); await shot('11-patients');
  const chip=p.locator('button',{hasText:'ป่วยหนัก'}); if(await chip.count()){ await chip.first().click(); await p.waitForTimeout(700); await shot('12-patients-critical'); }
  await tab('รายงาน'); await shot('13-report');
  await p.mouse.wheel(0,700); await p.waitForTimeout(600); await shot('14-report-scroll');
  await tab('หมอ'); await shot('15-doctor');
  await p.mouse.wheel(0,600); await p.waitForTimeout(600); await shot('16-doctor-scroll');
  await b.close();
})();
