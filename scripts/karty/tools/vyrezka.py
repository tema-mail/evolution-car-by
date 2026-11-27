"""Рендер с фоном -> машина без фона (модель isnet-general-use, как rembg). Для первого экрана карточек.
python3 vyrezka.py <url-или-файл> <выход.webp>

27.11.2026: у Xiaomi фон студии голубой и машина синяя – после голой маски по контуру шла голубая кайма и
мягкий край (маска считается на 1024×1024 и растягивается). Теперь после маски:
  1) край жёстче: альфа через кривую (полупрозрачная полоса уже), маска на полном размере сглажена на 1 px;
  2) цвет края очищается от фона: фон оценивается по соседним пикселям вне машины,
     F = (I − (1 − α)·B) / α – в краевых пикселях остаётся цвет кузова, а не студии."""
import sys, io, urllib.request
import numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
MODEL = '/root/.rembg/models/isnet-general-use/isnet-general-use.onnx'
_s = None


def maska(im):
    global _s
    if _s is None: _s = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
    x = np.asarray(im.convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255.0
    x = (x - 0.5) / 1.0
    x = x.transpose(2, 0, 1)[None]
    y = _s.run(None, {_s.get_inputs()[0].name: x})[0][0, 0]
    y = (y - y.min()) / (y.max() - y.min() + 1e-8)
    return Image.fromarray((y * 255).astype(np.uint8)).resize(im.size, Image.BICUBIC)


def fon(rgb, a, r=24):
    """оценка цвета фона под машиной: среднее по пикселям вне машины в окне r (нормированное размытие)"""
    w = (a < 0.02).astype(np.float32)
    out = np.empty_like(rgb)
    wb = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)), dtype=np.float32) / 255
    for c in range(3):
        ch = Image.fromarray(np.clip(rgb[..., c] * w, 0, 255).astype(np.uint8))
        out[..., c] = np.asarray(ch.filter(ImageFilter.BoxBlur(r)), dtype=np.float32) / np.maximum(wb, 1e-3)
    return out


def cut(im, lo=0.30, hi=0.80):
    im = im.convert('RGB')
    m = maska(im).filter(ImageFilter.GaussianBlur(0.6))
    a = np.asarray(m, dtype=np.float32) / 255
    a = np.clip((a - lo) / (hi - lo), 0, 1)
    a = a * a * (3 - 2 * a)                       # плавная ступенька: край узкий, но без лесенки
    rgb = np.asarray(im, dtype=np.float32)
    B = fon(rgb, a)
    edge = (a > 0.02) & (a < 0.98)
    F = rgb.copy()
    k = np.maximum(a, 0.15)[..., None]
    F[edge] = np.clip((rgb[edge] - (1 - a[edge])[:, None] * B[edge]) / k[edge], 0, 255)
    out = np.dstack([F, a * 255]).astype(np.uint8)
    o = Image.fromarray(out, 'RGBA')
    return o.crop(o.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())


def load(src):
    if src.startswith('http'): return Image.open(io.BytesIO(urllib.request.urlopen(src).read()))
    return Image.open(src)


if __name__ == '__main__':
    cut(load(sys.argv[1])).save(sys.argv[2], quality=92)
