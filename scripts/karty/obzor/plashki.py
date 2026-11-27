"""Фото вместо текстовых плашек: официальные снимки с сайтов марок (lixiang.com, avatr.com, lynkco.com.cn,
xiaomiev.com, zeekrlife.com/global), собраны 27.11.2026. Режет в 4:3 1200×900 webp -> obzor/<образец>/<файл>.
python3 plashki.py <папка со скачанными снимками: <ключ>/<номер>-*.*>
fx, fy – куда сдвигать окно кадрирования (0 – левый/верхний край, 0,5 – центр, 1 – правый/нижний)."""
import glob, os, sys
from PIL import Image

SPEC = {
    'lixiang-l8': [('l8', '055', 'vtoroj-ryad.webp', .5, .5), ('l8', '073', 'ekran-2-ryad.webp', .5, .5),
                   ('l8', '084', 'razvorot.webp', .5, .5), ('l8', '130', 'bagazhnik.webp', .5, .5)],
    'lixiang-l9': [('l9', '047', 'shtorki.webp', .5, .5), ('l9', '054', 'holodilnik.webp', .4, .5), ('l9', '056', 'zvuk.webp', .5, .5)],
    'lixiang-mega': [('mega', '048', 'kresla-stol.webp', .5, .5), ('mega', '054', 'svet.webp', .5, .5), ('mega', '059', 'dinamiki.webp', .5, .5)],
    'avatr-12': [('a12', '007', 'ekran-2-ryad.webp', .5, .5), ('a12', '053', 'kamery.webp', .7, .5), ('a12', '059', 'meridian.webp', .3, .5)],
    'lynkco-08': [('lk08', '102', 'kreslo-passazhira.webp', .6, .5), ('lk08', '071', 'vtoroj-ryad.webp', .5, .5),
                  ('lk08', '076', 'holodilnik.webp', .5, .5), ('lk08', '074', 'harman.webp', .6, .5)],
    'lynkco-900': [('lk900', '080', '6-mest.webp', .5, .5), ('lk900', '037', 'harman.webp', .5, .5)],
    'xiaomi-yu7': [('yu7h', '117', 'gt-kresla.webp', .5, .5), ('yu7h', '040', 'dolby.webp', (650, 227, 1640, 969))],
    'zeekr-7x': [('z7x', '006', 'vtoroj-ryad.webp', .5, .5), ('z7x', '023', 'ekran.webp', .5, .5)],
    'zeekr-x': [('zx', '021', 'ekran.webp', .6, .5)],
    'zeekr-007': [('z007', '018', 'ekran-hud.webp', .6, .5), ('z007', '020', 'zvuk.webp', .5, .5)],
    'zeekr-009': [('z009', '006', 'kresla-2-ryad.webp', .5, .5), ('z009', '018', 'ekran-potolok.webp', .5, .5)],
}


def cut(src, dst, fx, fy):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w / h > 4 / 3:
        nw = round(h * 4 / 3); x = round((w - nw) * fx); im = im.crop((x, 0, x + nw, h))
    else:
        nh = round(w * 3 / 4); y = round((h - nh) * fy); im = im.crop((0, y, w, y + nh))
    im.resize((1200, 900), Image.LANCZOS).save(dst, 'WEBP', quality=82, method=6)


if __name__ == '__main__':
    base = sys.argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    for rs, items in SPEC.items():
        os.makedirs(os.path.join(here, rs), exist_ok=True)
        for k, n, f, *a in items:
            src = glob.glob(os.path.join(base, k, n + '-*'))[0]
            if len(a) == 1:  # своя рамка (x0, y0, x1, y1) – убрать надписи с кадра
                Image.open(src).convert('RGB').crop(a[0]).resize((1200, 900), Image.LANCZOS).save(os.path.join(here, rs, f), 'WEBP', quality=82, method=6)
            else:
                cut(src, os.path.join(here, rs, f), *a)
            print(rs, f)
