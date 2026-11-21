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
  const btn = async (txt, i=0) => { await p.locator('button',{hasText:txt}).nth(i).click(); await p.waitForTimeout(1000); };
  const list = async () => console.log(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>e.innerText.trim().replace(/\s+/g,' ').slice(0,28)))));
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2500);
  await btn('ข้าม'); 
  await btn('ต้องดูแล'); await shot('04-sick-modal'); await list();
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  const close = p.locator('button',{hasText:/^✕$|ปิด/}); if(await close.count()) { await close.first().click(); await p.waitForTimeout(400); }
  await btn('ดูตำบล'); await shot('05-tambon'); await list();
  await btn('เข้าวอร์ด'); await shot('06-ward'); await list();
  await b.close();
})();
