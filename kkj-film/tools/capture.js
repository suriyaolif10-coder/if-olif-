const { chromium } = require('playwright'); const route=require('./open.js');
const OUT='materials/shots/';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  p.on('pageerror', e => console.log('ERR', e.message)); await route(p);
  const mask = () => p.evaluate(() => {
    const re=/(0\d[\d\- ]{7,11}\d)|((นาย|นางสาว|นาง|น\.ส\.)\s*\S+(\s+\S+)?)/;
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let n; const hits=[]; while((n=w.nextNode())) if(re.test(n.textContent)) hits.push(n.parentElement);
    hits.forEach(e=>{e.style.filter='blur(7px)';});
    return hits.length;
  });
  const shot = async (name, m=true) => { if(m) console.log(name,'masked',await mask()); await p.waitForTimeout(400); await p.screenshot({ path: OUT+name+'.png' }); };
  const click = async (txt, i=0) => { await p.getByText(txt, { exact:false }).nth(i).click(); await p.waitForTimeout(900); };
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(3500); await shot('01-splash', false);
  await click('ข้าม ›'); await p.waitForTimeout(800); await shot('02-district');
  await p.mouse.wheel(0,500); await p.waitForTimeout(600); await shot('03-district-scroll'); await p.mouse.wheel(0,-2000);
  await click('ป่วย 4'); await shot('04-sick-modal');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const t=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>e.innerText.trim().replace(/\s+/g,' ').slice(0,30)));
  console.log(JSON.stringify(t));
  await b.close();
})();
