const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(()=>{window.__timelines={};}); await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => { const tl = window.__timelines.film; const s4=document.getElementById('s04');
    return tl.getChildren(true,true,false).filter(t=>t.targets().includes(s4)).map(t=>t.startTime().toFixed(2)+' '+t.duration().toFixed(2)+' '+Object.keys(t.vars).filter(k=>!k.startsWith('_')&&k!=='parent').map(k=>k+'='+(typeof t.vars[k]==='object'?'obj':t.vars[k])).join(',')).join('\n'); }));
  await b.close(); })();
