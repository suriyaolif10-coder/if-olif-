"""Remove the background of narrator frames with the ISNet model (rembg's isnet-general-use.onnx) on onnxruntime.

    python3 -I matte.py MODEL.onnx IN_DIR OUT_DIR [--every N --shard K]

Reads IN_DIR/*.png (RGB), writes OUT_DIR/*.png (RGBA). The mask is smoothed over time a little
(each frame's mask is blended with its neighbours' raw masks) so the edge does not flicker.
"""
import sys, os, glob
import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

model, src, dst = sys.argv[1:4]
shard, nshard = 0, 1
if '--shard' in sys.argv:
    shard, nshard = map(int, sys.argv[sys.argv.index('--shard') + 1].split('/'))
os.makedirs(dst, exist_ok=True)
so = ort.SessionOptions(); so.intra_op_num_threads = max(1, 4 // nshard)
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
inp = sess.get_inputs()[0].name
SIZE = 1024

def raw_mask(img):
    x = np.asarray(img.convert('RGB').resize((SIZE, SIZE), Image.BILINEAR), dtype=np.float32) / 255.0
    x = (x - 0.5) / 1.0
    x = x.transpose(2, 0, 1)[None]
    y = sess.run(None, {inp: x})[0][0, 0]
    y = (y - y.min()) / max(1e-6, y.max() - y.min())
    return np.asarray(Image.fromarray((y * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR), dtype=np.float32) / 255.0

files = sorted(glob.glob(os.path.join(src, '*.png')))
mine = [f for i, f in enumerate(files) if i % nshard == shard]
for f in mine:
    out = os.path.join(dst, os.path.basename(f).replace('.png', '.npy'))
    if os.path.exists(out): continue
    np.save(out, raw_mask(Image.open(f)).astype(np.float16))
    print(os.path.basename(f), flush=True)
