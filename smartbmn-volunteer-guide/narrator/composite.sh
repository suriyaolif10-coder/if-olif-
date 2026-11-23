#!/usr/bin/env bash
# Lays the narrator track into the frame film.js draws at the bottom edge (SCORE.NARR: x 40, y 1500, 440x372, radius 30).
#   bash narrator/composite.sh in.mp4 out.mp4
set -euo pipefail
cd "$(dirname "$0")"
IN="$1"; OUT="$2"
X=40; Y=1500; W=440; H=372; R=30
ffmpeg -v error -y -f lavfi -i "color=black:s=${W}x${H}" -frames:v 1 -vf "format=gray,geq=lum='if(lte(hypot(max(0,max(${R}-X,X-(${W}-1-${R}))),max(0,max(${R}-Y,Y-(${H}-1-${R})))),${R}),255,0)'" mask.png
ffmpeg -v error -y -i "$IN" -i narrator-track.mp4 -loop 1 -i mask.png -filter_complex \
  "[1:v]format=yuva420p[n];[2:v]format=gray,scale=${W}:${H}[m];[n][m]alphamerge[nm];[0:v][nm]overlay=${X}:${Y}:shortest=1:format=auto[v]" \
  -map "[v]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 "$OUT"
