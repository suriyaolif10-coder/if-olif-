#!/usr/bin/env bash
# Builds the cut-out narrator track and lays it over the rendered film at SCORE.NARR (bottom edge).
#   bash narrator/composite.sh WORK_DIR in.mp4 out.mp4
# WORK_DIR holds t{0..5}/rgba/*.png from cutout.py (the Flow clip's 6 takes, background removed).
set -euo pipefail
cd "$(dirname "$0")"
WORK="$1"; IN="$2"; OUT="$3"
read -r X Y W H <<<"$(node -e "const n=require('../score').NARR;console.log(n.x,n.y,n.w,n.h)")"
# each take: 24 fps -> 30 fps, played forward then backward (16 s, seamless), scaled, with alpha (qtrle)
for i in 0 1 2 3 4 5; do
  ffmpeg -v error -y -framerate 24 -i "$WORK/t$i/rgba/f%04d.png" -filter_complex \
    "[0]fps=30,scale=${W}:${H}:flags=lanczos,format=rgba,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]" \
    -map "[o]" -c:v qtrle "$WORK/take$i.mov"
done
# one take per spoken line, cut at the line starts (like an edit)
node -e "
const s=require('../score');const order=[1,4,2,0,5,3];
const b=[0,...s.L.slice(1),s.DURATION];let out='';
for(let i=0;i<b.length-1;i++){out+='file $WORK/take'+order[i%6]+'.mov\ninpoint 0\noutpoint '+(b[i+1]-b[i]).toFixed(3)+'\n';}
require('fs').writeFileSync('$WORK/list.txt',out);"
ffmpeg -v error -y -f concat -safe 0 -i "$WORK/list.txt" -c:v qtrle -r 30 "$WORK/narrator-track.mov"
ffmpeg -v error -y -i "$IN" -i "$WORK/narrator-track.mov" -filter_complex \
  "[0:v][1:v]overlay=${X}:${Y}:shortest=1:format=auto[v]" \
  -map "[v]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 "$OUT"
