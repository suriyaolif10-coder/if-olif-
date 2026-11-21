// deterministic chia seeds on a canvas: ovals, mottled grey/brown/white
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function seed(ctx,x,y,r,a,white,R){ctx.save();ctx.translate(x,y);ctx.rotate(a);
  const g=ctx.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r*1.2);
  const v=R();const base=white?[236-v*34,230-v*34,218-v*34]:[52+v*70,46+v*62,42+v*54];
  g.addColorStop(0,`rgb(${base.map(v=>Math.min(255,v+40)|0)})`);g.addColorStop(1,`rgb(${base.map(v=>v*.7|0)})`);
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,r,r*.66,0,0,7);ctx.fill();
  if(!white&&R()<.5){ctx.fillStyle='rgba(230,220,200,.35)';ctx.beginPath();ctx.ellipse(r*.2,0,r*.35,r*.22,0,0,7);ctx.fill()}
  ctx.restore()}
// fill the shape of `text` with seeds
function seedText(canvas,text,font,opts={}){const ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;
  const m=document.createElement('canvas');m.width=W;m.height=H;const mc=m.getContext('2d');mc.font=font;mc.textAlign='center';mc.textBaseline='middle';mc.fillText(text,W/2,H/2);
  const d=mc.getImageData(0,0,W,H).data;const R=rng(opts.seed||7);const step=opts.step||9;
  for(let y=0;y<H;y+=step)for(let x=0;x<W;x+=step){if(d[(y*W+x)*4+3]>128){seed(ctx,x+R()*step,y+R()*step,(opts.r||7)*(.8+R()*.4),R()*6.3,R()<(opts.white??.15),R)}}}
