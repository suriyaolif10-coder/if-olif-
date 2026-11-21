const { chromium } = require('playwright'); const route=require('./open.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('ERR', e.message)); await route(p);
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2500);
  await p.screenshot({ path: 'tools/x-splash.png' });
  const t = await p.evaluate(() => [...document.querySelectorAll('button,a,[role=button]')].filter(e => e.offsetParent).map(e => (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)));
  console.log(JSON.stringify(t));
  await b.close();
})();
