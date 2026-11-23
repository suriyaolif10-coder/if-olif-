"""Make transparent (RGBA) frames of each narrator tile from its RGB frames and the ISNet masks.

    python3 -I cutout.py WORK_DIR

WORK_DIR/t{0..5}/rgb/f0001.png... and WORK_DIR/t{i}/mask/f0001.npy (every other frame) ->
WORK_DIR/t{i}/rgba/f0001.png. Missing in-between masks are the average of their neighbours, then
every mask is smoothed over 3 frames and its edge tightened a little.
"""
import sys, os, glob
import numpy as np
from PIL import Image

work = sys.argv[1]
for i in range(6):
    d = os.path.join(work, f't{i}')
    rgb = sorted(glob.glob(os.path.join(d, 'rgb', '*.png')))
    n = len(rgb)
    raw = [None] * n
    for k in range(n):
        p = os.path.join(d, 'mask', os.path.basename(rgb[k]).replace('.png', '.npy'))
        if os.path.exists(p): raw[k] = np.load(p).astype(np.float32)
    for k in range(n):  # fill the gaps from the nearest masks on each side
        if raw[k] is None:
            a = next((raw[j] for j in range(k - 1, -1, -1) if raw[j] is not None), None)
            b = next((raw[j] for j in range(k + 1, n) if raw[j] is not None), None)
            raw[k] = a if b is None else b if a is None else (a + b) / 2
    os.makedirs(os.path.join(d, 'rgba'), exist_ok=True)
    for k in range(n):
        m = 0.25 * raw[max(0, k - 1)] + 0.5 * raw[k] + 0.25 * raw[min(n - 1, k + 1)]
        m = np.clip((m - 0.15) / 0.7, 0, 1)
        im = np.asarray(Image.open(rgb[k]).convert('RGB'))
        out = np.dstack([im, (m * 255).astype(np.uint8)])
        Image.fromarray(out, 'RGBA').save(os.path.join(d, 'rgba', os.path.basename(rgb[k])))
    print('tile', i, n, 'frames', flush=True)
