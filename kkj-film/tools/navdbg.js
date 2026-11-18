const { chromium } = require('playwright'); const route=require('./open.js');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } }); await route(p);
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2500); await p.locator('button',{hasText:'ข้าม'}).click(); await p.waitForTimeout(800);
  console.log(await p.evaluate(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>/คนไข้/.test(b.textContent)); return bs.map(b=>b.outerHTML.slice(0,300)).join('\n');}));
  await b.close(); })();
