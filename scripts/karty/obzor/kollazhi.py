"""Коллажи и крупные планы для обзора карточек – из рендеров официальных конфигураторов.

Фото под подписью должно показывать то, о чём подпись: диски – все диски, цвета – все цвета, лидар – лидар.
Запуск: python3 scripts/karty/obzor/kollazhi.py [образец ...]  ->  scripts/karty/obzor/<образец>/<файл>.webp
Рендеры берутся по данным конфигуратора public/kartochki/<slug>/cfg-data.js (после build.py), кэш – /tmp/karty-renders.
"""
import json, os, sys, urllib.request
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
CACHE = os.environ.get('KARTY_CACHE', '/tmp/karty-renders')
W, H, G = 1200, 900, 3
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)

SLUG = {'zeekr-x': 'zeekr-x', 'zeekr-007': 'zeekr-007', 'zeekr-009': 'zeekr-009', 'avatr-12': 'avatr-12',
        'xiaomi-su7': 'xiaomi-su7', 'xiaomi-yu7': 'xiaomi-yu7', 'lixiang-l9': 'lixiang-l9', 'lixiang-mega': 'lixiang-mega',
        'lynkco-08': 'lynk-co-08', 'lynkco-900': 'lynk-co-900-lynk-co-09'}

# диски: ряды плиток (код опции, подпись); kolesо – центр и радиус переднего колеса на виде сбоку (или ракурс wheel у Li)
SPEC = {
    'zeekr-x': {
        'diski': {'shot': 'side', 'with': ['Z003PC007'], 'kol': (245, 497, 92), 'rows': [
            [('Z003PC010', '18″ «Звезда»'), ('Z003PC011', '19″ «Гуанъяо»'), ('Z003PC012', '19″ «Вихрь»'), ('Z003PC013', '19″ «Пропеллер»')],
            [('Z003PC014', 'Ultra: 20″ кованые'), ('Z003PC043', 'Ultra: 20″ кованые тёмные')]]},
        'cveta': {'shot': 'side', 'with': ['Z003PC011'], 'cols': 2, 'box': (50, 190, 1150, 600), 'items': [
            ('Z003PC007', 'Бежевый «Париж»'), ('Z003PC009', 'Зелёный «Ханчжоу»'), ('Z003PC032', 'Серый «Сучжоу»'),
            ('Z003PC039', 'Чёрный «Осло»'), ('Z003PC006', 'Розовый «Калифорния»'), ('Z003PC042', 'Зелёный «Сиэтл»')]},
    },
    'zeekr-007': {
        'diski': {'shot': 'side', 'with': ['Z005PC091', 'Z005PC096'], 'kol': (229, 455, 98), 'rows': [
            [('Z005PC070', '19″ спортивные'), ('Z005PC016', '19″ многоспицевые'), ('Z005PC054', '19″ тёмные'), ('Z005PC015', '19″ «Динамика»')],
            [('Z005PC104', '20″ кованые «Гром»'), ('Z005PC063', '20″ кованые «Люкс»'), ('Z005PC071', 'FR-LINE: 20″ кованые')]]},
    },
    'zeekr-009': {
        'diski': {'shot': 'side', 'with': ['Z009PC056', 'Z009PC005'], 'kol': (232, 500, 80), 'rows': [
            [('Z009PC058', '19″ «Синъяо»')], [('Z009PC059', '20″ «Синъяо»')]]},
        'lidar': {'shot': 'front34', 'with': ['Z009PC056', 'Z009PC005', 'Z009PC058'], 'box': (290, 120, 570, 330)},
    },
    'avatr-12': {
        'diski': {'shot': 'side', 'with': ['WC9u1'], 'kol': (327, 455, 90), 'rows': [
            [('10025', '20″ «Лопасти»'), ('10013', '21″ «Луч»')], [('10022', '21″ «Циклон», 5 спиц')]]},
        'lidar': {'shot': 'hero', 'with': ['WC9u1', '10025'], 'box': (400, 40, 1040, 520)},
    },
    'xiaomi-su7': {
        'diski': {'shot': 'side', 'with': ['p1'], 'kol': (383, 590, 112), 'rows': [
            [('w1', '19″ «Алмаз»'), ('w2', '20″ «Слива»'), ('w3', '20″ «Рисовое зерно»')],
            [('w4', '20″ «Лезвие»'), ('w5', '21″ кованые «Слива»')]]},
        'lidar': {'shot': 'front', 'with': ['p1', 'w1'], 'box': (460, 0, 1140, 510)},
    },
    'xiaomi-yu7': {
        'diski': {'shot': 'side', 'with': [], 'kol': (387, 573, 118), 'rows': [
            [('w4', '19″ «Алмаз»'), ('w5', '20″ «Слива»'), ('w6', '20″ «Рисовое зерно»')],
            [('w7', '21″ «Клинок»'), ('w8', '21″ кованые «Слива»'), ('w9', '21″ кованые «Лепесток»')],
            [('w1', 'GT: 21″ кованые, чёрные'), ('w2', 'GT: 21″ кованые, серебро'), ('w3', 'GT: 21″ «Клинок»')]]},
        'lidar': {'shot': 'front', 'with': [], 'box': (420, 0, 1100, 510)},
    },
    'lixiang-l9': {
        'diski': {'shot': 'wheel', 'with': ['1482'], 'kol': (661, 565, 150), 'rows': [
            [('1494', '22″ серебристые'), ('1495', 'Livis: 22″ серые')],
            [('1496', '21″ серебристые'), ('1497', '21″ чёрные')]]},
    },
    # у Lynk диск задан версией: рендер берём у версии с этим диском
    'lynkco-08': {
        'diski': {'shot': 'hero', 'with': ['p3'], 'kol': (660, 373, 93), 'rows': [
            [('v680', '19″ – версии 230'), ('v682', '20″ – 210 Ultra')]]},
        'lidar': {'shot': 'hero', 'with': ['v681', 'p3'], 'box': (500, 0, 920, 270)},
    },
    'lynkco-900': {
        'diski': {'shot': 'hero', 'with': ['p3'], 'kol': (611, 373, 90), 'rows': [
            [('v595', '20″ «Световой вихрь»'), ('v596', '21″ «Световое крыло»')], [('v598', '21″ «Сияние»')]]},
        'lidar': {'shot': 'hero', 'with': ['v595', 'p5'], 'box': (330, 0, 800, 290)},
    },
    'lixiang-mega': {
        'lidar': {'shot': 'front34', 'with': [], 'box': (150, 120, 1000, 600)},
    },
}


def cfg(slug):
    s = open(f'{SITE}/public/kartochki/{slug}/cfg-data.js', encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def render(j, codes, shot):
    best = None
    for k, sh in j['have'].items():
        parts = set(k.replace('-', '_').split('_'))
        shots = list(sh) + list(j.get('ang', {}).get(k, []))
        if shot in shots and all(c in parts for c in codes):
            if best is None or len(k) < len(best): best = k
    if not best: raise SystemExit(f'нет рендера {codes} {shot}')
    url = j['paths']['ext'].format(code=best, shot=shot)
    f = os.path.join(CACHE, url.split('/img/', 1)[1].replace('/', '__'))
    os.makedirs(CACHE, exist_ok=True)
    if not os.path.exists(f): urllib.request.urlretrieve(url, f)
    return Image.open(f).convert('RGB')


def cover(im, box, w, h):
    """вырезать из im область вокруг box (x0,y0,x1,y1) с пропорцией w:h"""
    x0, y0, x1, y1 = box; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    bw, bh = x1 - x0, y1 - y0
    if bw / bh < w / h: bw = bh * w / h
    else: bh = bw * h / w
    if bw > im.width or bh > im.height:  # не хватает рендера – дополняем его фоном
        big = Image.new('RGB', (max(im.width, round(bw) + 2), max(im.height, round(bh) + 2)), im.getpixel((2, 2)))
        dx, dy = (big.width - im.width) // 2, (big.height - im.height) // 2
        big.paste(im, (dx, dy)); im = big; cx += dx; cy += dy
    x0, y0 = max(0, cx - bw / 2), max(0, cy - bh / 2)
    x0, y0 = min(x0, im.width - bw), min(y0, im.height - bh)
    return im.crop((round(x0), round(y0), round(x0 + bw), round(y0 + bh))).resize((w, h), Image.LANCZOS)


def label(tile, text):
    d = ImageDraw.Draw(tile, 'RGBA')
    tw = d.textlength(text, font=FONT)
    d.rounded_rectangle((14, tile.height - 52, 14 + tw + 24, tile.height - 14), 8, fill=(10, 12, 16, 200))
    d.text((26, tile.height - 47), text, font=FONT, fill=(255, 255, 255))
    return tile


def grid(rows):
    """rows: список рядов, в ряду – картинки-функции (w,h)->tile"""
    c = Image.new('RGB', (W, H), (12, 14, 18))
    rh = (H - G * (len(rows) - 1)) // len(rows)
    for r, row in enumerate(rows):
        cw = (W - G * (len(row) - 1)) // len(row)
        for i, make in enumerate(row):
            c.paste(make(cw, rh), (i * (cw + G), r * (rh + G)))
    return c


def car_bbox(im):
    bg = im.getpixel((5, 5)); px = im.load(); xs, ys = [], []
    for y in range(0, im.height, 3):
        for x in range(0, im.width, 3):
            p = px[x, y]
            if sum(abs(p[i] - bg[i]) for i in range(3)) > 60: xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def build(rs):
    j = cfg(SLUG[rs]); out = os.path.join(HERE, rs); os.makedirs(out, exist_ok=True)
    for name, s in SPEC[rs].items():
        if name == 'diski':
            cx, cy, r = s['kol']
            def wheel(code, text):
                im = render(j, s['with'] + [code], s['shot'])
                return lambda w, h: label(cover(im, (cx - r * 1.25, cy - r * 1.25, cx + r * 1.25, cy + r * 1.25), w, h), text)
            img = grid([[wheel(c, t) for c, t in row] for row in s['rows']])
        elif name == 'cveta':
            items = s['items']; n = s['cols']
            def car(code, text):
                im = render(j, s['with'] + [code], s['shot'])
                b = s.get('box') or car_bbox(im)
                return lambda w, h: label(cover(im, b, w, h), text)
            img = grid([[car(c, t) for c, t in items[i:i + n]] for i in range(0, len(items), n)])
        elif name == 'lidar':
            im = render(j, s['with'], s['shot'])
            img = cover(im, s['box'], W, H)
        img.save(os.path.join(out, name + '.webp'), quality=86)
        print(rs, name)


if __name__ == '__main__':
    for rs in sys.argv[1:] or SPEC:
        build(rs)
