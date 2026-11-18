#!/usr/bin/env node
// Render the HTML animation to MP4 (H.264, 1080x1920, 30 fps) with Playwright + FFmpeg.
//
//   node export.js                         -> out/eesinhian.mp4 (ambience only)
//   node export.js --narration voice.mp3   -> timeline stretched to the voice length, voice + ambience mixed
//   node export.js --stills 5,20,64        -> PNG frames to out/ for checking
//   node export.js --jobs 4 --out my.mp4
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { spawn, execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = __dirname;
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]]) : a), []));
const FPS = 30, OUT = path.resolve(args.out || path.join(ROOT, "out", "eesinhian.mp4"));
const JOBS = parseInt(args.jobs || Math.max(1, Math.min(4, os.cpus().length)), 10);
const BASE = 90;

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".otf": "font/otf", ".wav": "audio/wav", ".mp3": "audio/mpeg" };
  const srv = http.createServer((q, r) => {
    const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(r);
  });
  return new Promise((res) => srv.listen(0, "127.0.0.1", () => res(srv)));
}
const probe = (f) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

async function openPage(browser, port, scale) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/index.html?export=1&scale=${scale}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}
const grab = (page, t) => page.evaluate((t) => { window.renderAt(t); return document.getElementById("cv").toDataURL("image/jpeg", 0.93).split(",")[1]; }, t);

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const narration = args.narration ? path.resolve(args.narration) : null;
  const scale = narration ? probe(narration) / BASE : 1;
  const DUR = BASE * scale, total = Math.round(DUR * FPS);
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch();

  if (args.stills) {
    const page = await openPage(browser, port, scale);
    for (const s of String(args.stills).split(",")) {
      await page.evaluate((t) => window.renderAt(t), parseFloat(s));
      const f = path.join(path.dirname(OUT), `still_${s}.png`);
      await page.locator("#cv").screenshot({ path: f }); console.log(f);
    }
    await browser.close(); srv.close(); return;
  }

  // ambience track (regenerate if missing)
  const amb = path.join(ROOT, "audio", "ambience.wav");
  if (!fs.existsSync(amb)) execFileSync("python3", [path.join(ROOT, "make_audio.py")], { stdio: "inherit" });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eesin_"));
  const chunk = Math.ceil(total / JOBS); let done = 0;
  const t0 = Date.now();
  await Promise.all([...Array(JOBS).keys()].map(async (j) => {
    const f0 = j * chunk, f1 = Math.min(total, f0 + chunk); if (f0 >= f1) return;
    const page = await openPage(browser, port, scale);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS), path.join(tmp, `seg${j}.mp4`)], { stdio: ["pipe", "inherit", "inherit"] });
    for (let f = f0; f < f1; f++) {
      const b64 = await grab(page, f / FPS);
      if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
      if (++done % 150 === 0) process.stdout.write(`\r${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r)); await page.close();
  }));
  await browser.close(); srv.close();
  console.log(`\nencoded ${total} frames`);

  const list = path.join(tmp, "list.txt");
  fs.writeFileSync(list, [...Array(JOBS).keys()].filter((j) => j * chunk < total).map((j) => `file '${path.join(tmp, `seg${j}.mp4`)}'`).join("\n"));
  const a = ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", amb];
  let filter;
  if (narration) {
    a.push("-i", narration);
    // ambience stretched to the narration timeline and kept under the voice
    filter = `[1:a]atempo=${(1 / scale).toFixed(5)},volume=0.35[bg];[2:a]volume=1.0[vo];[bg][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`;
  } else filter = `[1:a]anull[aout]`;
  a.push("-filter_complex", filter, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", DUR.toFixed(3), "-movflags", "+faststart", OUT);
  execFileSync("ffmpeg", a, { stdio: "inherit" });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(OUT);
})().catch((e) => { console.error(e); process.exit(1); });
