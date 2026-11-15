#!/usr/bin/env bash
# Mix a voiceover onto a clip: music ducks under the voice, final loudness -14 LUFS.
# usage: mix_voice.sh <in.mp4> <voice.mp3> <out.mp4>
set -euo pipefail
IN="$1"; VOICE="$2"; OUT="$3"
ffmpeg -y -loglevel error -i "$IN" -i "$VOICE" -filter_complex "\
[1:a]aresample=44100,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.6,asplit=2[v1][v2];\
[0:a]volume=0.55[m];\
[m][v1]sidechaincompress=threshold=0.03:ratio=8:attack=30:release=500[md];\
[md][v2]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 44100 -movflags +faststart "$OUT"
