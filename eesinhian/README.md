# อีซิ่นเหี้ยน...ผีหญิงชุดซิ่น (EESINHIAN)

A 90-second vertical (1080×1920, 30 fps) 2D animated Isan folklore horror short, built in HTML/Canvas.
Every frame is drawn in code. The story is fictional, inspired by the mood of Isan folk tales.

## Files
| File | Contents |
|---|---|
| `index.html` | Player: play/pause, restart, mute, timeline, scene buttons |
| `story.js` | **Editable**: title, 9 scenes (start/end) and subtitle cues = the full narration, max 2 lines per cue |
| `art.js` | Art and animation for all 9 scenes, camera/parallax, transitions, subtitles (white, dark outline, `*word*` = muted red) |
| `make_audio.py` | Generates `audio/ambience.wav`: wind, crickets, khaen-like drone, footsteps, heartbeat, impacts, birds |
| `export.js` | Renders to MP4 H.264 with Playwright + FFmpeg |
| `fonts/Loma-Bold.otf` | Thai font (TLWG, GPL + font exception) |

## Viewing in a browser
```bash
cd eesinhian && python3 -m http.server 8000   # then open http://localhost:8000
```
(It needs to run from a web server, not by double-clicking the file, so the font and audio can load.)

## Narration (important)
**There is no Thai narration voice in this project yet.** The current audio is ambience and sound effects only.
Subtitle timing in `story.js` is an estimate for a 90-second read.

When you have a real narration file:
- **Watch in the browser:** put it at `audio/narration.mp3`. The player detects it, stretches every scene and subtitle to match the voice length, and uses the voice as the master clock.
- **Export:** `node export.js --narration path/to/voice.mp3`. The timeline is stretched to the file's length, and the ambience is mixed underneath at 35%.
- To match subtitles to each sentence exactly, edit `s`/`e` in `story.js` (base 90 s timeline).

## Exporting the MP4
```bash
cd eesinhian
python3 make_audio.py                 # create the ambience track (once)
node export.js                        # -> out/eesinhian.mp4
node export.js --narration voice.mp3  # with real narration
node export.js --stills 5,33,88.6     # check individual frames
```
Requires Node 18+, `npm i playwright` (with Chromium), `ffmpeg`, and Python 3 + numpy.
