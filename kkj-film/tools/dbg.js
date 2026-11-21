const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror',e=>console.log('ERR',e.message)); await p.addInitScript(()=>{window.__timelines={};}); await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1500);
  for (const t of [11.4, 12, 17.9, 18.1, 18.5]) {
    const r = await p.evaluate((t) => { const tl = window.__timelines.film; tl.seek(0); for (let x = 0; x <= t; x += 0.05) tl.seek(x); return ['s02','s04','s05'].map(id => { const e = document.getElementById(id); return id + ':' + getComputedStyle(e).opacity + '/' + e.style.transform; }).join('  '); }, t);
    console.log(t, r);
  }
  await b.close(); })();
