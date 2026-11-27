"""Рендер с фоном -> машина без фона (модель isnet-general-use, как rembg). Для первого экрана карточек.
python3 vyrezka.py <url-или-файл> <выход.webp>"""
import sys, io, urllib.request
import numpy as np, onnxruntime as ort
from PIL import Image
MODEL = '/root/.rembg/models/isnet-general-use/isnet-general-use.onnx'
_s = None
def cut(im):
    global _s
    if _s is None: _s = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
    x = np.asarray(im.convert('RGB').resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255.0
    x = (x - 0.5) / 1.0
    x = x.transpose(2, 0, 1)[None]
    y = _s.run(None, {_s.get_inputs()[0].name: x})[0][0, 0]
    y = (y - y.min()) / (y.max() - y.min() + 1e-8)
    m = Image.fromarray((y * 255).astype(np.uint8)).resize(im.size, Image.LANCZOS)
    out = im.convert('RGBA'); out.putalpha(m)
    return out.crop(out.getbbox())
def load(src):
    if src.startswith('http'): return Image.open(io.BytesIO(urllib.request.urlopen(src).read()))
    return Image.open(src)
if __name__ == '__main__':
    cut(load(sys.argv[1])).save(sys.argv[2], quality=88)
