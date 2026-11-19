"""Ekstrak efek api dari GIF serangan → sprite sheet RGBA (hanya api, tanpa kotak). python api_fx.py GIF OUT.png"""
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src)
fr = []
for i in range(im.n_frames):
    im.seek(i); fr.append(np.asarray(im.convert('RGB')).astype(np.float32) / 255)
H, W, _ = fr[0].shape
yy, xx = np.mgrid[0:H, 0:W]
# tepi lembut berbentuk elips agar tidak terlihat kotak
# pudar halus berbentuk tidak beraturan (elips + derau) agar tepi api tidak membentuk kotak/oval
rng = np.random.default_rng(7)
derau = np.asarray(Image.fromarray((rng.random((9, 13)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
d = np.sqrt(((xx - W / 2) / (W * 0.52)) ** 2 + ((yy - H * 0.56) / (H * 0.6)) ** 2) + (derau - 0.5) * 0.35
tepi = np.clip((1.0 - d) / 0.4, 0, 1) ** 1.3
sheet = []
for f in fr:
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mx, mn = f.max(-1), f.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hangat = (r >= g) & (g >= b * 0.8)                       # oranye-kuning-merah
    api = np.clip((sat - 0.5) / 0.3, 0, 1) * np.clip((mx - 0.6) / 0.3, 0, 1) * hangat
    inti = np.clip((mx - 0.9) / 0.08, 0, 1) * (r > 0.95) * (b < 0.85) * (sat > 0.25)  # inti putih-kuning
    from PIL import ImageFilter
    kabur = np.asarray(Image.fromarray((np.maximum(api, inti) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    putih = np.clip((mx - 0.85) / 0.1, 0, 1) * np.clip((kabur - 0.35) / 0.25, 0, 1)  # inti ledakan putih di tengah api
    from scipy import ndimage
    dasar = np.maximum.reduce([api, inti, putih]) > 0.3
    lubang = ndimage.binary_fill_holes(dasar) & ~dasar & (mx > 0.8)       # inti putih terkurung api → isi
    a = np.clip(np.maximum.reduce([api, inti, putih, lubang.astype(np.float32)]), 0, 1) * tepi
    a = np.where(a < 0.08, 0, a)
    rgba = np.dstack([f, a])
    sheet.append((rgba * 255).astype(np.uint8))
lembar = np.concatenate(sheet, axis=1)
Image.fromarray(lembar, 'RGBA').save(out)
print(out, lembar.shape)
