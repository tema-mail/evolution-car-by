#!/usr/bin/env python3
"""Карточки моделей «Китай под заказ» для evolutioncar.by.

Образец – карточка Zeekr 9X из Deford2027/evolution-service-minsk (kartochki/),
которую владелец довёл руками: первый экран «Кино», встроенный конфигуратор,
квиз лизинга, «Как заказать» плитками, риски и отзывы с фото. Остальные модели
берутся из сгенерированных карточек tema-mail/razbory (evolutioncar-kartochki-…)
и получают те же блоки. Блоки, которые в образце не меняли, остаются как в
карточке модели.

Что делает:
  1. Общие стили и скрипты образца -> public/kartochki/ (кнопки в цвет сайта
     #ff5102, тема карточки на data-evk, формы -> приёмник заявок сайта).
  2. Каждая модель из MAP -> src/content/karty/<slug>.json (мета + разметка)
     и public/kartochki/<slug>/cfg-data.js (данные её конфигуратора).
  3. Страница src/pages/catalog/<марка>/<модель>/index.astro для каждой модели.

Запуск (нужен интернет – данные конфигураторов и иконки цветов с tema-mail.github.io):
  python3 scripts/karty/build.py --razbory <путь к evolutioncar-kartochki-…> \\
      --obrazec <путь к evolution-service-minsk/kartochki>
"""
import argparse, html, io, json, os, re, shutil, sys, urllib.request

# карточка из набора razbory -> slug машины в src/content/cars.json (только Китай, под заказ)
MAP = {
    'zeekr-9x': 'zeekr-9x', 'zeekr-7x': 'zeekr-7x', 'zeekr-x': 'zeekr-x', 'zeekr-007': 'zeekr-007', 'zeekr-009': 'zeekr-009',
    'lixiang-l9': 'lixiang-l9', 'lixiang-l8': 'lixiang-l8', 'lixiang-mega': 'lixiang-mega',
    'xiaomi-su7': 'xiaomi-su7', 'xiaomi-yu7': 'xiaomi-yu7', 'avatr-12': 'avatr-12',
    'lynkco-08': 'lynk-co-08', 'lynkco-900': 'lynk-co-900-lynk-co-09',
}
# соседи в «Похожих» и «Сравнении»: карточка набора -> адрес на сайте (если такой страницы нет – ссылку снимаем)
EXTRA_LINKS = {'lixiang-l6': 'lixiang-l6', 'zeekr-001': 'zeekr-001', 'lynkco-09': 'lynk-co-900-lynk-co-09'}
STATIC_LINKS = {'xiaomi-su7-ultra': '/su7-ultra/'}
TG = 'https://t.me/manager_evolutioncar_bot'
CFG_BASE = 'https://tema-mail.github.io/{proj}/'
BTN = '#ff5102'
BTN_H = '#e84800'
TYPE_ADJ = {'bev': 'Электрический', 'phev': 'Гибридный', 'erev': 'Гибридный'}


def slugify(t):
    t = t.lower().replace('&', '-')
    t = re.sub(r'[^a-z0-9]+', '-', t)
    return re.sub(r'-{2,}', '-', t).strip('-')


def car_path(car):
    b = slugify(car['brand'])
    m = car['slug'][len(b) + 1:] if car['slug'].startswith(b + '-') else car['slug']
    return f'/catalog/{b}/{m}/'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=60).read()


def sections(s):
    """{id: html секции}, голова до первой секции и хвост после последней"""
    ms = list(re.finditer(r'<section[^>]*\bid="([^"]+)"', s))
    out, order = {}, []
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else s.find('</section>', m.start()) + len('</section>')
        out[m.group(1)] = s[m.start():end]
        order.append(m.group(1))
    head = s[:ms[0].start()]
    tail = s[s.find('</section>', ms[-1].start()) + len('</section>'):]
    return head, out, order, tail


def one(pat, s, what):
    m = re.search(pat, s, re.S)
    if not m:
        raise SystemExit(f'не нашёл {what}')
    return m


# ---------- 1. общие файлы ----------

def patch(s, old, new, what, count=1):
    if s.count(old) != count:
        raise SystemExit(f'патч «{what}»: ожидал {count} вхождений, нашёл {s.count(old)}')
    return s.replace(old, new)


ORANGE = [  # фирменный зелёный образца -> оранжевый сайта (кнопки, обводки, акценты)
    ('#2f6966', '#ff5102'), ('#24524f', '#e84800'), ('47,105,102', '255,81,2'), ('#6fb7b2', '#e8783f'),
]


def theme_attr(s):
    """тема карточки живёт в data-evk: data-theme у <html> занят темой сайта (v1); акцент – цвет сайта"""
    s = s.replace('data-theme', 'data-evk')
    for a, b in ORANGE:
        s = s.replace(a, b)
    return s


def copy_shared(ob, pub):
    k = os.path.join(pub, 'kartochki')
    if os.path.isdir(k):
        shutil.rmtree(k)
    os.makedirs(f'{k}/cfg'); os.makedirs(f'{k}/lizing')
    for f in ['ev.css', 'karta.css', 'hero-kino.css', 'calc.js']:
        s = open(f'{ob}/{f}', encoding='utf-8').read()
        open(f'{k}/{f}', 'w', encoding='utf-8').write(theme_attr(s))
    s = theme_attr(open(f'{ob}/cfg/konfigurator.css', encoding='utf-8').read())
    open(f'{k}/cfg/konfigurator.css', 'w', encoding='utf-8').write(s)
    s = theme_attr(open(f'{ob}/zeekr-9x/lizing/lz.css', encoding='utf-8').read())
    open(f'{k}/lizing/lz.css', 'w', encoding='utf-8').write(s)

    # karta.js: без служебной полосы прототипа, формы -> заявка сайта
    s = theme_attr(open(f'{ob}/karta.js', encoding='utf-8').read())
    a = s.index("  $('#sw-logic')"); b = s.index("  seo.addEventListener('click', function (e) { if (e.target === seo) seoOpen(false) });")
    b = s.index('\n', b) + 1
    s = s[:a] + "  function seoOpen() {}  /* панель «Цепочка, SEO» – только в прототипе */\n" + s[b:]
    s = patch(s, "  $('#n-ask').textContent = $$('main .w-ask').length;", "", 'счётчик меток')
    s = patch(s,
        "    $('.w-success', fm).hidden = false; sub.hidden = true;\n    $('#done-v').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') + ' · страница ' + location.pathname + (utm.length ? ' · ' + utm.join(', ') : '') + ' (в прототипе никуда не уходит)';",
        "    var fin = function () { $('.w-success', fm).hidden = false; sub.hidden = true; $('#done-v').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') };\n"
        "    if (!window.evkLead) return fin();\n"
        "    sub.disabled = true;\n"
        "    window.evkLead({ name: fm.elements.name ? fm.elements.name.value.trim() : '', phone: tel.value, form: S.goal === 'test' ? 'тест-драйв' : 'расчёт', text: parts.slice(0, -1).filter(Boolean).join(' · ') })\n"
        "      .then(function (ok) { if (ok) fin(); else { sub.disabled = false; alert('Не удалось отправить. Позвоните нам: +375 (29) 135-88-88') } });",
        'форма расчёта')
    s = patch(s,
        "      $('.w-success', lf).hidden = false; ls.hidden = true;\n      $('#lz-done').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') + ' · страница ' + location.pathname + ' (в прототипе никуда не уходит)';",
        "      var fin = function () { $('.w-success', lf).hidden = false; ls.hidden = true; $('#lz-done').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') };\n"
        "      if (!window.evkLead) return fin();\n"
        "      window.evkLead({ name: lf.elements.name ? lf.elements.name.value.trim() : '', phone: lt.value, form: 'лизинг', text: parts.slice(0, -1).filter(Boolean).join(' · ') })\n"
        "        .then(function (ok) { if (ok) fin(); else alert('Не удалось отправить. Позвоните нам: +375 (29) 135-88-88') });",
        'форма лизинга (старая)')
    # цена комплектации не объявлена – «по запросу», а не служебная метка
    s = patch(s, "var ASK = '<span class=\"ask w-ask\">[уточнить]</span>';", "var ASK = 'по запросу';", 'цена по запросу')
    s = patch(s, "Под ключ в Минске: <span class=\"ask w-ask\">[запросить]</span>", "Под ключ в Минске: по запросу", 'под ключ у версии')
    open(f'{k}/karta.js', 'w', encoding='utf-8').write(s)

    # квиз лизинга
    s = theme_attr(open(f'{ob}/zeekr-9x/lizing/lz.js', encoding='utf-8').read())
    s = patch(s,
        "        $('.w-success', box).hidden = false; f.hidden = true;\n",
        "        var nm = f.elements.name && f.elements.name.value.trim();\n"
        "        var txt = (st.type === 'kredit' ? 'Кредит' : 'Лизинг') + ' · ' + C.name + ' ' + r.x.name + ' · аванс ' + st.adv + ' % · ' + TERM[st.term] + ' · ≈ ' + fmt(r.pay) + ' $/мес';\n"
        "        if (window.evkLead) window.evkLead({ name: nm || '', phone: tel.value, form: st.type === 'kredit' ? 'кредит' : 'лизинг', text: txt });\n"
        "        $('.w-success', box).hidden = false; f.hidden = true;\n",
        'квиз: отправка')
    s = re.sub(r" \+ ' \(в прототипе никуда не уходит\)'", '', s)
    s = patch(s, "if (!tb || d.getElementById('hd')) return;", "if (!tb || d.getElementById('hd') || d.querySelector('.evk')) return;", 'квиз: тема')
    open(f'{k}/lizing/lz.js', 'w', encoding='utf-8').write(s)

    # конфигуратор: сборка -> заявка сайта
    s = theme_attr(open(f'{ob}/cfg/konfigurator.js', encoding='utf-8').read())
    s = patch(s,
        '    if (!endpoint) { root.dispatchEvent(new CustomEvent("zeekr:lead", { bubbles: true, detail: data })); console.warn("[zeekr] data-endpoint не задан, заявка:", data); done(); return; }',
        '    if (!endpoint && window.evkLead) { window.evkLead({ name: data.name, phone: data.phone, form: "конфигуратор", text: data.text }).then(function (ok) { if (ok) done(); else { st.textContent = "Не удалось отправить. Попробуйте ещё раз или позвоните нам."; st.className = "z9__form-status is-error"; } }); return; }\n'
        '    if (!endpoint) { root.dispatchEvent(new CustomEvent("zeekr:lead", { bubbles: true, detail: data })); done(); return; }',
        'конфигуратор: заявка')
    open(f'{k}/cfg/konfigurator.js', 'w', encoding='utf-8').write(s)

    # кнопки – основной цвет сайта; блоки и остальные акценты не трогаем
    open(f'{k}/knopki.css', 'w', encoding='utf-8').write(
        '/* Кнопки карточек – основной цвет evolutioncar.by. Остальные цвета блоков – как в образце. */\n'
        f':root{{--evk-btn:{BTN};--evk-btn-h:{BTN_H}}}\n'
        '.w-btn{background:var(--evk-btn);border-color:var(--evk-btn);color:#fff}\n'
        '.w-btn:hover{background:var(--evk-btn-h);border-color:var(--evk-btn-h)}\n'
        '.w-btn.ghost{background:transparent;border-color:var(--line2);color:var(--tx)}\n'
        '.w-btn.ghost:hover{background:transparent;border-color:var(--evk-btn)}\n'
        '.z9 .z9__btn{background:var(--evk-btn);color:#fff}\n'
        '.z9 .z9__btn:hover{background:var(--evk-btn-h)}\n'
        '/* общие стили сайта (base.css) не должны менять вид карточки */\n'
        '.evk svg{display:inline-block}\n'
        '.evk h1,.evk h2,.evk h3,.evk h4{text-transform:none;text-wrap:wrap}\n'
        '.evk ul,.evk ol{list-style:none}\n'
        '/* шапка общая с сайтом: отступы под неё – по её высоте */\n'
        ':root{--hh:var(--header-h,92px)}\n'
        '/* тест-драйв: фото у фасада сервиса – во всю левую половину; кнопка не липнет к тексту */\n'
        '.td .td-car.td-foto{display:block;background:none}\n'
        '.td .td-car.td-foto img{width:100%;height:100%;min-height:380px;object-fit:cover;object-position:62% 60%}\n'
        '@media (max-width:900px){.td .td-car.td-foto img{min-height:0;aspect-ratio:16/9;object-position:50% 50%}}\n'
        '.td-t .w-btn{margin-top:28px}\n'
        '/* чек: скрытая строка («второй вариант» без цены) не должна показываться */\n'
        '.check .r[hidden]{display:none}\n'
        '/* блок «Из чего складывается цена» скрыт до готовых ставок (разметка на месте – вернуть: убрать строку) */\n'
        '#cena{display:none!important}\n'
        '/* лизинг – до калькулятора с данными партнёров (середина декабря); сравнение с другими моделями – уедет в блог */\n'
        '#lizing,#vs{display:none!important}\n'
        '/* только тёмная тема: переключатель скрыт (в разметке остаётся – на него завязан karta.js) */\n'
        '#tema,[data-evk-toggle]{display:none!important}\n'
        '/* кнопка виджета Битрикс24 – в углу, выше нижнего меню карточки на телефоне */\n'
        '.b24-widget-button-position-bottom-right{right:16px!important;bottom:16px!important}\n'
        '@media (max-width:760px){.b24-widget-button-position-bottom-right{right:16px!important;bottom:84px!important}}\n')

    os.makedirs(f'{k}/img', exist_ok=True)
    for f in ['logo-evolution-car.webp', 'serv-lift.webp']:
        shutil.copy(f'{ob}/img/{f}', f'{k}/img/{f}')
    for d in ['otzyvy', 'riski']:
        shutil.copytree(f'{ob}/img/{d}', f'{k}/img/{d}')
    shutil.copytree(f'{ob}/zeekr-9x/img', f'{k}/zeekr-9x/img')


# ---------- 2. страница модели ----------

def short_label(val, label, hyb):
    v = val.lower()
    if 'квт' in v and 'ч' not in v: return 'мощность'
    if re.search(r'\d\s*с$', v): return 'до 100 км/ч'
    if 'км' in v: return 'на электричестве' if hyb else 'запас хода'
    if re.search(r'\d\s*м$', v): return 'длина'
    return label.split(',')[0].split(';')[0][:28]


def swatches(colors, cache):
    """цвета кружков снимаем с иконок цветов конфигуратора: светлый, средний, тёмный"""
    from PIL import Image
    sw = {}
    for c in colors:
        if not c[3]: continue
        try:
            im = Image.open(io.BytesIO(get(c[3]))).convert('RGB')
        except Exception as e:
            print('  иконка цвета не загрузилась', c[3], e); continue
        W, H = im.size
        sw[c[0]] = ['#%02x%02x%02x' % im.getpixel((W // 2, int(H * f))) for f in (.18, .5, .82)]
    return sw


def build_model(rs, html_src, tpl, cars, links):
    head, S, order, tail = sections(html_src)
    t_head, T, t_order, t_tail = tpl
    car_json = one(r'<script>window\.CAR=(\{.*?\});?</script>', tail, 'window.CAR').group(1)
    C = json.loads(car_json)
    N = C['name']
    short = N.split(' ', 1)[1] if ' ' in N else N
    hyb = C['type'] != 'bev'

    def names(s):
        return s.replace('Zeekr 9X', N).replace('9X', short)

    if rs != 'zeekr-9x':
        # первый экран: «Кино» с данными модели
        h = S['hero']
        ans = one(r'<p class="ans">(.*?)</p>', h, 'ответ первого экрана').group(1)
        img = one(r'<div class="stage" id="stage">(<img[^>]*>)</div>', h, 'кадр первого экрана').group(1)
        cname = one(r'<span id="cname">(.*?)</span>', h, 'имя цвета').group(1)
        nums = re.findall(r'<div><b>(.*?)</b><span>(.*?)</span></div>', one(r'<div class="nums">(.*?)</div>\s*</div>', h, 'цифры').group(1))
        attrs = one(r'^<section[^>]*>', h, 'шапка секции').group(0).replace('class="w-block hero"', 'class="w-block k-hero"')
        th = T['hero']
        new = th[th.index('<div class="w-wrap"><div class="logic">'):]
        new = re.sub(r'<span class="kicker">.*?</span>', f'<span class="kicker">{kicker_txt(rs, C, html_src)}</span>', new, 1)
        new = re.sub(r'<span class="h-big">.*?</span>', f'<span class="h-big">{html.escape(N)}</span>', new, 1)
        new = re.sub(r'<p class="k-ans">.*?</p>', f'<p class="k-ans">{ans}</p>', new, 1, flags=re.S)
        new = re.sub(r'<div class="k-stage" id="stage"><div class="k-sh"></div><img[^>]*></div>', f'<div class="k-stage" id="stage"><div class="k-sh"></div>{img}</div>', new, 1)
        new = re.sub(r'<span id="cname">.*?</span>', f'<span id="cname">{cname}</span>', new, 1)
        spec = ''.join(f'<li><b>{v}</b><span>{short_label(html.unescape(v), html.unescape(l), hyb)}</span></li>' for v, l in nums[:4])
        new = re.sub(r'<ul class="k-spec">.*?</ul>', f'<ul class="k-spec">{spec}</ul>', new, 1, flags=re.S)
        S['hero'] = attrs + '\n' + new
        # блоки, которые в образце переделаны
        for sid in ['konfigurator', 'lizing', 'zakaz', 'riski', 'vydachi']:
            S[sid] = names(T[sid])
        # голова и хвост: подключения образца, данные модели
        css_tpl = one(r'(<link rel="stylesheet" href="\.\./ev\.css[^"]*">.*?)\n<script type="application/json"', t_head, 'стили образца').group(1)
        head = re.sub(r'<link rel="stylesheet" href="\.\./ev\.css[^"]*">.*?(?=\n<script type="application/json")', lambda m: css_tpl, head, 1, flags=re.S)
        nav = one(r'\n  <nav class="hd-nav".*?</div>', t_head, 'меню шапки').group(0)
        head = head.replace('</a>\n  <a class="hd-ic" href="tel:', '</a>' + nav + '\n  <a class="hd-ic" href="tel:', 1) if 'hd-nav' not in head else head
        scripts = one(r'(<script src="cfg-data\.js.*</script>)\s*</body>', t_tail, 'скрипты образца').group(1)
        sw = swatches(C['colors'], None)
        scripts = re.sub(r'var SW=\{.*?\};', 'var SW=' + json.dumps(sw, separators=(',', ':')) + ';', scripts, 1, flags=re.S)
        tail = re.sub(r'(<script src="\.\./calc\.js[^"]*"></script>).*$', lambda m: m.group(1) + '\n' + scripts + '\n</body>\n</html>\n', tail, 1, flags=re.S)

    page = head + ''.join(S[i] for i in order) + tail
    return page, C


def kicker_txt(rs, C, src):
    body = ''
    m = re.search(r'"bodyType":\s*"([^"]+)"', src)
    if m: body = m.group(1).lower()
    brand = C['name'].rsplit(' ', 1)[0]
    year = re.search(r'"modelDate":\s*"(\d{4})"', src)
    adj = TYPE_ADJ.get(C['type'], '')
    return html.escape(f'{adj} {body} {brand} · {year.group(1) if year else ""}'.replace('  ', ' ').strip(' ·'))


def clean(page, rs, site_slug, links):
    """служебное прототипа убираем, адреса – на сайт"""
    p = page
    p = re.sub(r'\n<!-- служебная полоса прототипа.*?</div></div>\n', '\n', p, 1, flags=re.S)
    p = re.sub(r'<aside class="seo".*?</aside>\n?', '', p, 1, flags=re.S)
    p = re.sub(r'<script type="application/json" id="w-seo">.*?</script>\n?', '', p, 1, flags=re.S)
    p = re.sub(r'\s*<div class="logic"></div>', '', p)
    # шапка и подвал – общие с сайтом (Header/Footer в KartaPage.astro)
    p = re.sub(r'<header class="hd" id="hd">.*?</header>\n?', '', p, 1, flags=re.S)
    p = re.sub(r'<footer class="w-footer ft">.*?</footer>\n?', '', p, 1, flags=re.S)
    p = re.sub(r'<div class="w-wrap"></div>\n?', '', p)
    # строка «Обновлено … · Проверил: [запросить эксперта]» внизу – убрана по просьбе владельца
    p = re.sub(r'\s*<p class="src">Обновлено [^<]*· Проверил:.*?</p>', '', p, 1, flags=re.S)
    p = re.sub(r'\n\s*data-(question|next|proof|us|client)="[^"]*"', '', p)
    # адреса файлов
    p = p.replace('href="../ev.css', 'href="/kartochki/ev.css').replace('href="../karta.css', 'href="/kartochki/karta.css')
    p = p.replace('href="../hero-kino.css', 'href="/kartochki/hero-kino.css').replace('href="../cfg/', 'href="/kartochki/cfg/')
    p = p.replace('href="lizing/lz.css', 'href="/kartochki/lizing/lz.css').replace('src="lizing/lz.js', 'src="/kartochki/lizing/lz.js')
    p = p.replace('src="../cfg/', 'src="/kartochki/cfg/').replace('src="../calc.js', 'src="/kartochki/calc.js').replace('src="../karta.js', 'src="/kartochki/karta.js')
    p = p.replace('src="cfg-data.js', f'src="/kartochki/{site_slug}/cfg-data.js')
    p = p.replace('src="../img/', 'src="/kartochki/img/').replace('src="img/', f'src="/kartochki/{rs}/img/')
    # шапка, подвал, контакты
    p = p.replace('<a class="logo" href="#top">', '<a class="logo" href="/">')
    p = p.replace('aria-label="Telegram" href="#"', f'aria-label="Telegram" href="{TG}"').replace('<a class="hd-ic" href="#" aria-label="Telegram">', f'<a class="hd-ic" href="{TG}" aria-label="Telegram" target="_blank" rel="noopener">')
    p = p.replace('<a class="sh-row" href="#"><b>Telegram</b>', f'<a class="sh-row" href="{TG}" target="_blank" rel="noopener"><b>Telegram</b>')
    p = p.replace('<a href="#">Политика обработки персональных данных</a> · <a href="#">Cookie</a>', '<a href="/policy/">Политика обработки персональных данных</a> · <a href="/agreement/">Пользовательское соглашение</a>')
    p = p.replace('<a href="#">персональных данных</a>', '<a href="/policy/">персональных данных</a>')
    p = p.replace('href="https://evolutioncar.by/servis/"', 'href="/servis/"')

    # соседи: на сайте есть страница – ссылка на неё, нет – без ссылки
    def link(m):
        s = m.group(2)
        return f'{m.group(1)}href="{links[s]}"' if s in links else None
    def card(m):
        s = m.group(1)
        if s in links: return f'<a class="w-card" href="{links[s]}">'
        return '<div class="w-card">'
    p = re.sub(r'<a class="w-card" href="\.\./([a-z0-9-]+)/">(.*?)</a>', lambda m: (card(m) + m.group(2) + ('</a>' if m.group(1) in links else '</div>')), p, flags=re.S)
    p = re.sub(r'<a class="w-card" href="https://tema-mail\.github\.io/razbory/[^"]+">(.*?)</a>', r'<div class="w-card">\1</div>', p, flags=re.S)
    # у карточки без ссылки не должно быть кнопки «Смотреть …»
    p = re.sub(r'(<div class="w-card">(?:(?!</div>).)*?)<span class="w-btn wide sm">[^<]*</span>', r'\1', p, flags=re.S)
    p = re.sub(r'<a class="w-btn ghost" href="\.\./([a-z0-9-]+)/">(.*?)</a>', lambda m: f'<a class="w-btn ghost" href="{links[m.group(1)]}">{m.group(2)}</a>' if m.group(1) in links else '', p)
    p = re.sub(r'<a class="w-btn ghost" href="https://tema-mail\.github\.io/razbory/[^"]+">.*?</a>', '', p)
    left = re.findall(r'href="(\.\./[^"]*|https://tema-mail\.github\.io/razbory[^"]*)"', p)
    if left:
        raise SystemExit(f'{rs}: остались ссылки на прототипы: {left[:5]}')
    return p


def to_json(page, rs, site_slug, url, brand):
    head = page.split('<body>')[0]
    body = page.split('<body>', 1)[1].rsplit('</body>', 1)[0]
    title = html.unescape(one(r'<title>(.*?)</title>', head, 'title').group(1))
    desc = html.unescape(one(r'<meta name="description" content="([^"]*)"', head, 'description').group(1))
    ld = json.loads(one(r'<script type="application/ld\+json">(.*?)</script>', head, 'ld+json').group(1))
    graph = ld.get('@graph', [])
    for g in graph:
        if g.get('@type') == 'BreadcrumbList':
            it = g['itemListElement']
            it[2]['item'] = 'https://evolutioncar.by' + url.rsplit('/', 2)[0] + '/'
            it[3]['item'] = 'https://evolutioncar.by' + url
        o = g.get('offers')
        if isinstance(o, dict):
            for key in ('lowPrice', 'highPrice'):
                if str(o.get(key, '')).startswith('ЗАПРОС'): o.pop(key)
    pre = re.search(r'<link rel="preload" as="image" href="([^"]+)"', head)
    links = re.findall(r'<link rel="stylesheet" href="(/kartochki/[^"]+)">', head)
    if not links:
        raise SystemExit(f'{rs}: не нашёл стилей карточки')
    return {
        'slug': site_slug, 'from': rs, 'url': url, 'brand': brand, 'title': title, 'description': desc,
        'ogImage': pre.group(1) if pre else None, 'preload': pre.group(1) if pre else None,
        'css': links + ['/kartochki/knopki.css?v=' + __import__('hashlib').md5(open(os.path.join(PUB, 'kartochki/knopki.css'), 'rb').read()).hexdigest()[:8]], 'jsonLd': graph,
        'html': theme_attr(body).replace('data-evk-toggle', 'data-theme-toggle'),
    }


# комплектации: названия – по-английски, без повторов в ценах и сравнении (конфигуратор оставляет все варианты)
KOMPL = {
    # 5-местные версии – в конфигураторе (группа «5 мест»), в ценах и сравнении – одна строка на версию
    'zeekr-9x': {'zamena': {'«Яохэй»': 'Yaohei'}, 'ubrat': ['84', '85', '86']},
    'lynkco-900': {'ubrat': ['655', '656', '657']},
    # Max 75 и Max 103 – одна версия с выбором батареи
    'zeekr-007': {'imena': {'74': 'Ultra', '76': 'Max'}, 'slit': {'76': '75'}},
    'zeekr-009': {'zamena': {'«Бизнес»': 'Business', '«Семья»': 'Family'}},
    'zeekr-x': {'imena': {'64': 'Max', '65': 'Max 4-Seater', '66': 'Ultra'}, 'cfg_imena': True},
    # одинаковые Max и Ultra у гибрида и электро
    'avatr-12': {'imena': {'E12_52REEVRWDL1_2604': 'Max EREV', 'E12_52REEVRWDL2_2604': 'Ultra EREV',
                           'E12_98EVRWDL1_2604': 'Max EV', 'E12_98EVRWDL2_2604': 'Ultra EV'}},
}


def cmp_drop(p, ids, rs):
    """убрать из таблицы сравнения колонки версий с data-cfg из ids"""
    i = p.find('<div class="cmp" id="cmp"><table>')
    if i < 0 or not ids: return p
    j = p.index('</table>', i)
    t = p[i:j]
    head = one(r'<thead><tr>(.*?)</tr></thead>', t, f'{rs}: шапка сравнения').group(1)
    cells = re.findall(r'<t[hd][^>]*>.*?</t[hd]>', head, re.S)
    cols = [k for k, c in enumerate(cells) if any(f'data-cfg="{x}"' in c for x in ids)]
    if len(cols) != len(ids):
        raise SystemExit(f'{rs}: в сравнении нашёл {len(cols)} колонок из {len(ids)}')
    n = len(cells)
    def row(m):
        cs = re.findall(r'<t[hd][^>]*>.*?</t[hd]>', m.group(1), re.S)
        if len(cs) != n: return m.group(0)
        return m.group(0).replace(m.group(1), ''.join(c for k, c in enumerate(cs) if k not in cols))
    t = re.sub(r'<tr[^>]*>(.*?)</tr>', row, t, flags=re.S)
    t = t.replace(f'colspan="{n}"', f'colspan="{n - len(cols)}"')
    return p[:i] + t + p[j:]


def komplektacii(p, rs):
    k = KOMPL.get(rs)
    if not k: return p
    for a, b in k.get('zamena', {}).items():
        p = p.replace(a, b)
    m = one(r'window\.CAR=(\{.*?\});\s*</script>', p, f'{rs}: CAR')
    car = json.loads(m.group(1))
    V = {v['id']: v for v in car['versions']}
    for vid, name in k.get('imena', {}).items():
        old = V[vid]['n']; V[vid]['n'] = name
        # шапка сравнения: <b>старое</b> в колонке этой версии
        p = re.sub(r'(alt="[^"]*?)' + re.escape(old) + r'("[^>]*><b>)' + re.escape(old) + r'(</b><small>[^<]*</small><a class="go" href="#konfigurator" data-cfg="' + re.escape(vid) + '")',
                   lambda mm: mm.group(1) + name + mm.group(2) + name + mm.group(3), p)
    drop = list(k.get('ubrat', []))
    for keep, gone in k.get('slit', {}).items():
        V[keep]['b'] = sorted(V[keep]['b'] + V[gone]['b'], key=lambda b: b['p'] or 0)
        drop.append(gone)
    car['versions'] = [v for v in car['versions'] if v['id'] not in drop]
    if car.get('cfgDef') in drop: car['cfgDef'] = car['versions'][0]['id']
    p = p.replace(m.group(1), json.dumps(car, ensure_ascii=False))
    p = cmp_drop(p, drop, rs)
    # кнопки «Версия» в форме – по одной на название
    sm = one(r'<div class="seg" id="seg">(.*?)</div>', p, f'{rs}: кнопки версий')
    names = list(dict.fromkeys(v['n'] for v in car['versions']))
    btn = '<button type="button" class="on" data-v="">Не решил</button>' + ''.join(f'<button type="button" data-v="{html.escape(x)}">{html.escape(x)}</button>' for x in names)
    p = p.replace(sm.group(0), f'<div class="seg" id="seg">{btn}</div>')
    left = [x for x in names if re.search('[А-Яа-яЁё]', x)]
    if left: raise SystemExit(f'{rs}: русские названия версий: {left}')
    return p


def cfg_names(js, rs):
    """в данных конфигуратора – те же английские названия"""
    k = KOMPL.get(rs, {})
    for a, b in k.get('zamena', {}).items():
        js = js.replace(a, b)
    if k.get('cfg_imena'):  # у Zeekr 007 названия различают батарею – их не трогаем
        for vid, name in k['imena'].items():
            js = patch(js, re.search(r'"id":"' + re.escape(vid) + r'","name":"[^"]*"', js).group(0), f'"id":"{vid}","name":"{name}"', f'{rs}: конфигуратор {vid}')
    return js


# обзор «Экстерьер»: подпись про цвета или диски – коллаж из рендеров конфигуратора (scripts/karty/obzor/<образец>/)
OBZOR = {
    'zeekr-7x': [
        ('Восемь цветов кузова', 'cveta.webp', 'Zeekr 7X в восьми цветах кузова: белый, чёрный, золотой «Рассвет», янтарно-красный, фиолетовый, серебристый, зелёный, синий'),
        ('Диски от 19 до 21″', 'diski.webp', 'Zeekr 7X: девять вариантов дисков – 19″ аэродинамические и многоспицевые, 20″ многоспицевые, 21″ спортивные и кованые'),
    ],
    # коллажи и крупные планы – scripts/karty/obzor/kollazhi.py; 4-й элемент – новая подпись (заголовок, текст), если старая расходится с конфигуратором
    'zeekr-x': [
        ('Шесть цветов, новый зелёный «Сиэтл»', 'cveta.webp', 'Zeekr X в шести цветах: бежевый «Париж», зелёный «Ханчжоу», серый «Сучжоу», чёрный «Осло», розовый «Калифорния», зелёный «Сиэтл»'),
        ('Диски 19″ или кованые 20″', 'diski.webp', 'Zeekr X: диски 18″ и 19″ у Max, кованые 20″ светлые и тёмные у Ultra',
         ('Диски 18–19″ или кованые 20″', 'У Max – 18″ или 19″ в трёх дизайнах, у Ultra – кованые спортивные 20″, светлые или тёмные.')),
    ],
    'zeekr-007': [
        ('Шины R19 серийно, кованые 20″ в FR-LINE', 'diski.webp', 'Zeekr 007: четыре варианта дисков 19″ и три кованых 20″, в том числе FR-LINE с оранжевыми суппортами'),
    ],
    'zeekr-009': [
        ('Диски 19″, по желанию 20″', 'diski.webp', 'Zeekr 009: диски «Синъяо» 19″ и 20″'),
        ('Лидар над лобовым стеклом', 'lidar.webp', 'Zeekr 009: лидар на крыше над лобовым стеклом'),
    ],
    'avatr-12': [
        ('Четыре лидара', 'lidar.webp', 'Avatr 12 спереди: главный лидар на крыше над лобовым стеклом'),
        ('Диски 20″ или 21″', 'diski.webp', 'Avatr 12: диски 20″ «Лопасти», 21″ «Луч» и 21″ «Циклон»'),
    ],
    'xiaomi-su7': [
        ('Лидар на крыше у всех версий', 'lidar.webp', 'Xiaomi SU7 спереди: лидар на крыше над лобовым стеклом'),
        ('Широкие задние шины 265 мм', 'diski.webp', 'Xiaomi SU7: пять вариантов дисков от 19″ до кованых 21″',
         ('Широкие задние шины 265 мм', 'Спереди 245 мм. В конфигураторе пять вариантов дисков – от 19″ до кованых 21″.')),
    ],
    'xiaomi-yu7': [
        ('Диски от 19″ до 21″', 'diski.webp', 'Xiaomi YU7: девять вариантов дисков от 19″ до кованых 21″, три из них – для GT'),
        ('Лидар на всех версиях', 'lidar.webp', 'Xiaomi YU7 спереди: лидар над лобовым стеклом'),
    ],
    'lixiang-l9': [
        ('Диски 22″ и разворот 5,3 м', 'diski.webp', 'Li Auto L9: диски 22″ серебристые и серые Livis, 21″ серебристые и чёрные'),
    ],
    'lixiang-mega': [
        ('Четыре лидара', 'lidar.webp', 'Li Auto MEGA спереди'),
    ],
}


def obzor(p, rs, site_slug, pub):
    import hashlib
    for cap, f, alt, *nov in OBZOR.get(rs, []):
        src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'obzor', rs, f)
        os.makedirs(f'{pub}/kartochki/{site_slug}/img', exist_ok=True)
        shutil.copy(src, f'{pub}/kartochki/{site_slug}/img/{f}')
        v = hashlib.md5(open(src, 'rb').read()).hexdigest()[:8]
        m = one(r'<figure class="of[^"]*"><img src="[^"]+" alt="[^"]*" loading="lazy"><figcaption><b>' + re.escape(cap) + '</b>', p, f'{rs}: обзор «{cap}»')
        p = p.replace(m.group(0), f'<figure class="of k43"><img src="/kartochki/{site_slug}/img/{f}?v={v}" alt="{alt}" width="1200" height="900" loading="lazy"><figcaption><b>{cap}</b>')
        if nov:
            t = one(r'(<img src="/kartochki/' + re.escape(f'{site_slug}/img/{f}') + r'[^>]*><figcaption>)<b>[^<]*</b>[^<]*(</figcaption>)', p, f'{rs}: подпись «{cap}»')
            p = p.replace(t.group(0), t.group(1) + f'<b>{nov[0][0]}</b>{nov[0][1]}' + t.group(2))
    return p


# [уточнить] в сравнении комплектаций -> открытые данные (сверка 27.11.2026, ≥2 источника; нет согласия – «нет данных»)
# ключ: (строка таблицы, номер колонки версии с 0 – в порядке образца, до KOMPL)
ND = 'нет данных'
UTOCHNIT = {
    # 52 кВт·ч EREV: carnewschina 2026 params, chinaevpro – 10 мин 30–80 %
    'avatr-12': {('Зарядка 30–80 %', 0): 'около 10 мин', ('Зарядка 30–80 %', 1): 'около 10 мин'},
    # 230 Max/Ultra: разгон и CCD не объявлены; Harman Kardon – только Ultra (carnewschina, autohome)
    'lynkco-08': {('Разгон 0–100 км/ч', 0): ND, ('Разгон 0–100 км/ч', 1): ND,
                  ('Амортизаторы CCD', 0): ND, ('Амортизаторы CCD', 1): ND,
                  ('Harman Kardon, 23 динамика', 0): '–'},
    # SU7 2026: carnewschina, Automotive World, paultan
    'xiaomi-su7': {('Зарядка 10–80 %', 0): 'около 20 мин', ('Зарядка 10–80 %', 1): 'около 20 мин',
                   ('Разгон 0–100 км/ч', 0): '5,3 с', ('Разгон 0–100 км/ч', 1): '5,7 с',
                   ('Динамиков', 0): ND, ('Динамиков', 1): ND},
    # YU7: колонки GT, Standard, Long Range, Pro, Max; carnewschina 2025/2026, evkx, carfolio, arenaev
    'xiaomi-yu7': {('Зарядка 10–80 %', 2): '21 мин', ('Зарядка 10–80 %', 3): '21 мин', ('Зарядка 10–80 %', 4): '12 мин',
                   ('Крутящий момент', 0): '1068 Н·м',
                   ('Максимальная скорость', 2): '240 км/ч', ('Максимальная скорость', 3): '240 км/ч',
                   ('Пневмоподвеска с CDC', 1): '–', ('Пневмоподвеска с CDC', 2): '–',
                   **{('Камер', c): '11' for c in (0, 2, 3, 4)},
                   **{('Центральный экран', c): '16,1″' for c in (1, 2, 3, 4)},
                   **{('Алькантара в салоне', c): ND for c in (1, 2, 3, 4)},
                   **{('25 динамиков, Dolby Atmos', c): ND for c in (1, 2, 3, 4)}},
    # 108 кВт·ч, 800 В: 11,5 мин (paultan, carnewschina, CleanTechnica)
    'zeekr-009': {('Зарядка 10–80 %', 2): '11,5 мин'},
    # Max+ = Max 103 кВт·ч: 5,1 с, 240 км/ч; пневмоподвеска у Max – опция (carnewschina 2026, paultan)
    'zeekr-7x': {('Разгон 0–100 км/ч', 1): '5,1 с (103 кВт·ч)', ('Максимальная скорость', 1): '240 км/ч',
                 ('Пневмоподвеска', 1): 'опция', ('Пневмоподвеска', 2): 'опция'},
    'zeekr-x': {('Суппорты Akebono, 4 поршня', 0): ND, ('Суппорты Akebono, 4 поршня', 1): ND},
}


def utochnit(p, rs):
    # служебные заметки разборщика (CAR.notes) на странице не выводятся – в исходник не кладём
    m = re.search(r'window\.CAR=(\{.*?\});\s*</script>', p, re.S)
    if m:
        car = json.loads(m.group(1))
        if car.pop('notes', None) is not None:
            p = p.replace(m.group(1), json.dumps(car, ensure_ascii=False))
    p = p.replace('<small>цена – уточнить</small>', '<small>цена по запросу</small>')
    z = UTOCHNIT.get(rs)
    if not z: return p
    i = p.find('<div class="cmp" id="cmp"><table>')
    j = p.index('</table>', i)
    t, done = p[i:j], set()
    def row(m):
        cs = re.findall(r'<td[^>]*>.*?</td>', m.group(1), re.S)
        if not cs: return m.group(0)
        if ''.join(cs) != m.group(1): return m.group(0)
        name = re.sub('<[^>]+>', '', cs[0])
        hit = False
        for (r, c), val in z.items():
            if r != name: continue
            if '[уточнить]' not in cs[c + 1]: raise SystemExit(f'{rs}: «{r}» колонка {c}: нет метки – {cs[c + 1]}')
            cs[c + 1] = '<td>' + html.escape(val) + '</td>'
            done.add((r, c)); hit = True
        return '<tr>' + ''.join(cs) + '</tr>' if hit else m.group(0)
    t = re.sub(r'<tr>(.*?)</tr>', row, t, flags=re.S)
    miss = set(z) - done
    if miss: raise SystemExit(f'{rs}: не нашёл ячеек {sorted(miss)}')
    return p[:i] + t + p[j:]


# снимки салона по подписям (сверено глазами 27.11.2026): у Li int – панель с экраном, int2 – кресла.
# ('shot', подпись, было, стало) – другой ракурс того же рендера; ('img', откуда, куда) – перенести снимок к другой подписи,
# откуда становится текстовой плашкой; ('text', подпись) – подходящего снимка нет, остаётся плашка
FOTO = {
    'lixiang-l8': [('shot', 'Пять мест вместо шести', '--int.webp', '--int2.webp'), ('text', 'Ориентир – Maybach и BMW'), ('shot', 'Экран 29″ 6K во всю панель', '--int2.webp', '--int.webp')],
    'lixiang-l9': [('shot', 'Шесть мест в три ряда', '--int.webp', '--int2.webp'), ('text', 'Второй ряд со шторками и затемнением'), ('shot', 'Экран 29″ 6K во всю панель', '--int2.webp', '--int.webp')],
    'lixiang-mega': [('shot', 'Семь мест, 2+2+3', '--int.webp', '--int2.webp'), ('text', 'Поворотные кресла и стол'), ('shot', 'Экраны OLED 29″ и 21″', '--int2.webp', '--int.webp')],
    'avatr-12': [('shot', '5 мест, два ряда', '--int.webp', '--int3.webp'), ('shot', 'Экран 35,4″ 4K и 15,6″ в центре', '--int2.webp', '--int.webp'),
                 ('text', 'Экраны для второго ряда'), ('text', 'Камеры вместо зеркал')],
    'xiaomi-su7': [('shot', 'Водительское кресло – 18 направлений регулировки', '--int.webp', '--int2.webp'),
                   ('shot', 'Экран 16,1″ и приборы 7,1″', '--int2.webp', '--int.webp'), ('text', 'Холодильник 4,4 л')],
    'xiaomi-yu7': [('shot', 'Передние кресла откидываются до 123°', '--int.webp', '--int2.webp'),
                   ('shot', 'Панорамный экран HyperVision 1,1 м', '--int2.webp', '--int.webp'), ('text', 'Багажник 678 л и передний 141 л')],
    'lynkco-08': [('img', 'Кресло пассажира с подставкой для ног', 'Экран 15,4″ и проекция 95″')],
    'lynkco-900': [('img', '6 мест: два кресла во втором ряду', 'Экран 30″ 6K спереди и 30″ сзади')],
}


def fig_re(cap):
    return r'<figure class="(of[^"]*)">(<img [^>]*>)?<figcaption><b>' + re.escape(cap) + r'</b>'


def foto(p, rs):
    for op in FOTO.get(rs, []):
        if op[0] == 'shot':
            m = one(fig_re(op[1]), p, f'{rs}: фото «{op[1]}»')
            if not m.group(2) or op[2] not in m.group(2): raise SystemExit(f'{rs}: «{op[1]}» – нет {op[2]}')
            p = p.replace(m.group(0), m.group(0).replace(op[2], op[3]))
        elif op[0] == 'text':
            m = one(fig_re(op[1]), p, f'{rs}: фото «{op[1]}»')
            p = p.replace(m.group(0), f'<figure class="of t"><figcaption><b>{op[1]}</b>')
        elif op[0] == 'img':
            a = one(fig_re(op[1]), p, f'{rs}: фото «{op[1]}»'); img = a.group(2)
            p = p.replace(a.group(0), f'<figure class="of t"><figcaption><b>{op[1]}</b>')
            b = one(fig_re(op[2]), p, f'{rs}: фото «{op[2]}»')
            p = p.replace(b.group(0), f'<figure class="of">{img}<figcaption><b>{op[2]}</b>')
    return p


def raskladka(p, rs):
    """в каждой вкладке обзора: фото парами (нечётное – первое во всю ширину), текстовые плашки ниже, парами"""
    out_p, pos = [], 0
    for m in re.finditer(r'<div class="ob" id="o-[a-z]+"><h3>[^<]*</h3>', p):
        if m.start() < pos: continue
        # конец вкладки – по балансу div
        depth, k = 1, m.end()
        while depth:
            a, b = p.find('<div', k), p.find('</div>', k)
            if a != -1 and a < b: depth += 1; k = a + 4
            else: depth -= 1; k = b + 6
        body = p[m.end():k - 6]
        new = sloi(body)
        out_p.append(p[pos:m.end()] + (new if new is not None else body) + '</div>'); pos = k
    return ''.join(out_p) + p[pos:]


def sloi(body):
    pos, figs, og = 0, [], '<div class="og">'
    while pos < len(body):
        ws = re.match(r'\s+', body[pos:])
        if ws: pos += ws.end(); continue
        f = re.match(r'<figure class="of[^"]*">.*?</figure>', body[pos:], re.S)
        if f: figs.append(f.group(0)); pos += f.end(); continue
        g = re.match(r'(<div class="og[^"]*"[^>]*>)((?:\s*<figure class="of[^"]*">.*?</figure>)*)\s*</div>', body[pos:], re.S)
        if g: og = g.group(1); figs += re.findall(r'<figure class="of[^"]*">.*?</figure>', g.group(2), re.S); pos += g.end(); continue
        return None  # незнакомая разметка – вкладку не трогаем
    cls = lambda f: re.match(r'<figure class="([^"]*)"', f).group(1).split()
    txt = [f for f in figs if 't' in cls(f)]
    ph = [f for f in figs if 't' not in cls(f)]
    def setbig(f, big):
        c = [x for x in cls(f) if x != 'big'] + (['big'] if big else [])
        return re.sub(r'^<figure class="[^"]*"', f'<figure class="{" ".join(c)}"', f)
    out = []
    if len(ph) % 2: out.append(setbig(ph[0], True)); ph = ph[1:]
    if ph: out.append(og + ''.join(setbig(f, False) for f in ph) + '</div>')
    tail = txt.pop() if len(txt) % 2 else None
    if txt: out.append('<div class="og">' + ''.join(txt) + '</div>')
    if tail: out.append(tail)
    return ''.join(out)


def ceny(p, rs, car):
    """чек «под ключ»: неизвестные суммы – «по запросу», итог – ориентир с прежней карточки модели на сайте"""
    ask = '<span class="ask w-ask">[запросить]</span>'
    p = patch(p, f'<span>2. Доставка Китай → Минск</span>{ask}', '<span>2. Доставка Китай → Минск</span><span>по запросу</span>', f'{rs}: доставка')
    p = patch(p, f'<span>5. Работа Evolution, ЭПТС, учёт</span>{ask}', '<span>5. Работа Evolution, ЭПТС, учёт</span><span>по запросу</span>', f'{rs}: работа')
    byn = car.get('priceByn')
    tot = f'от {byn:,} BYN'.replace(',', '\u00a0') if byn else 'по запросу'
    p = patch(p, f'<span>Итого под ключ</span>{ask}', f'<span>Итого под ключ</span><span>{tot}</span>', f'{rs}: итого')
    p = patch(p, '≈ 745 BYN <span class="ask w-ask">[сверить]</span>', '≈ 745 BYN', f'{rs}: утильсбор')
    # блок цены скрыт – «Посчитать эту сборку» ведёт в форму расчёта
    p = patch(p, '<a class="w-btn sm" href="#cena">Посчитать эту сборку</a>', '<a class="w-btn sm" href="#raschet" data-goal="raschet">Посчитать эту сборку</a>', f'{rs}: кнопка сборки')
    return p


def pohozhie(outdir):
    """«Похожие автомобили»: только модели с новой карточкой на сайте – ссылка, кнопка, фото с первого экрана"""
    import glob
    K = {}
    for f in glob.glob(f'{outdir}/*.json'):
        d = json.load(open(f, encoding='utf-8'))
        car = json.loads(one(r'window\.CAR=(\{.*?\});\s*</script>', d['html'], d['slug']).group(1))
        y = re.search(r'<span class="kicker">[^<]*?(20\d\d)</span>', d['html'])
        sm = 'Китай · ' + ('Электро' if car['type'] == 'bev' else 'Гибрид') + (f' · {y.group(1)}' if y else '')
        K[d['slug']] = {'f': f, 'd': d, 'name': car['name'], 'min': car['minPrice'], 'url': d['url'], 'img': d['preload'], 'sm': sm}
    by_name = {html.unescape(k['name']): s for s, k in K.items()}
    for s, k in K.items():
        h = k['d']['html']
        m = one(r'<div class="sim w-grid m-lane" data-mob="lenta">(.*?)</div>\s*</div>\s*</section>', h, f'{s}: похожие')
        was = [html.unescape(x) for x in re.findall(r'<b>([^<]+)</b>', m.group(1))]
        pick = [by_name[x] for x in was if x in by_name and by_name[x] != s]
        for o in sorted(K, key=lambda o: abs(K[o]['min'] - k['min'])):
            if len(pick) >= 3: break
            if o != s and o not in pick: pick.append(o)
        cards = ''
        for o in pick[:3]:
            c = K[o]; nm = html.escape(c['name'])
            sm = c['sm']
            cards += (f'<a class="w-card" href="{c["url"]}"><img src="{c["img"]}" alt="{nm}" loading="lazy"><small>{sm}</small><b>{nm}</b>'
                      f'<span class="pr">в Китае от {c["min"]:,} ¥</span><span class="w-btn wide sm">Смотреть {nm}</span></a>').replace(',', '\u00a0')
        k['d']['html'] = h.replace(m.group(1), cards)
        json.dump(k['d'], open(k['f'], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def astro_route(site, url, slug):
    d = os.path.join(site, 'src/pages' + url)
    os.makedirs(d, exist_ok=True)
    rel = os.path.relpath(os.path.join(site, 'src/components/karta/KartaPage.astro'), d)
    open(os.path.join(d, 'index.astro'), 'w', encoding='utf-8').write(
        f'---\n// Карточка модели «Китай под заказ» – собрана scripts/karty/build.py, руками не править\n'
        f"import KartaPage from '{rel}';\n---\n<KartaPage slug=\"{slug}\" />\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--razbory', required=True)
    ap.add_argument('--obrazec', required=True)
    ap.add_argument('--site', default=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    ap.add_argument('only', nargs='*')
    a = ap.parse_args()
    global PUB
    site, pub = a.site, os.path.join(a.site, 'public')
    PUB = pub
    cars = {c['slug']: c for c in json.load(open(f'{site}/src/content/cars.json', encoding='utf-8'))}
    links = {rs: car_path(cars[s]) for rs, s in {**MAP, **EXTRA_LINKS}.items()}
    links.update(STATIC_LINKS)

    copy_shared(a.obrazec, pub)
    tpl_src = open(f'{a.obrazec}/zeekr-9x/index.html', encoding='utf-8').read()
    tpl = sections(tpl_src)
    outdir = f'{site}/src/content/karty'
    os.makedirs(outdir, exist_ok=True)
    index = []
    for rs, site_slug in MAP.items():
        if a.only and rs not in a.only: continue
        car = cars[site_slug]
        if car['country'] != 'china' or car['availability'] != 'on-order':
            raise SystemExit(f'{site_slug}: не «Китай под заказ»')
        url = car_path(car)
        src = tpl_src if rs == 'zeekr-9x' else open(f'{a.razbory}/{rs}/index.html', encoding='utf-8').read()
        print('•', rs, '->', url)
        page, C = build_model(rs, src, tpl, cars, links)
        page = clean(page, rs, site_slug, links)
        page = ceny(page, rs, car)
        page = utochnit(page, rs)
        page = komplektacii(page, rs)
        page = obzor(page, rs, site_slug, pub)
        page = foto(page, rs)
        page = raskladka(page, rs)
        # рендеры с фоном (Xiaomi) -> вырезанные копии из scripts/karty/vyrezki/
        vd = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vyrezki')
        for f in sorted(os.listdir(vd)) if os.path.isdir(vd) else []:
            if not f.startswith(rs + '__'): continue
            name = f.split('__', 1)[1]
            os.makedirs(f'{pub}/kartochki/{site_slug}/hero', exist_ok=True)
            shutil.copy(os.path.join(vd, f), f'{pub}/kartochki/{site_slug}/hero/{name}')
            page = page.replace(f'https://tema-mail.github.io/{rs}-konfigurator/img/{rs}/ext/{name}', f'/kartochki/{site_slug}/hero/{name}')
        # тест-драйв: фото машины у фасада сервиса (scripts/karty/foto-td/<образец>.webp); нет фото – остаётся рендер
        fd = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'foto-td', rs + '.webp')
        if os.path.isfile(fd):
            import hashlib
            os.makedirs(f'{pub}/kartochki/{site_slug}', exist_ok=True)
            shutil.copy(fd, f'{pub}/kartochki/{site_slug}/td-fasad.webp')
            v = hashlib.md5(open(fd, 'rb').read()).hexdigest()[:8]
            m = one(r'<div class="td-car"><img src="[^"]+" alt="([^"]+?) – тест-драйв в Минске" loading="lazy"></div>', page, f'{rs}: тест-драйв')
            page = page.replace(m.group(0), f'<div class="td-car td-foto"><img src="/kartochki/{site_slug}/td-fasad.webp?v={v}" alt="{m.group(1)} у сервиса Evolution Car в Минске – тест-драйв" width="1600" height="900" loading="lazy"></div>')
        # версия файлов карточки – по содержимому: после правок браузер не возьмёт старое из кэша
        def ver(m):
            f = os.path.join(pub, m.group(1).lstrip('/'))
            if not os.path.isfile(f): return m.group(0)
            import hashlib
            return f'{m.group(1)}?v={hashlib.md5(open(f, "rb").read()).hexdigest()[:8]}"'
        page = re.sub(r'(/kartochki/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"', ver, page)
        data = to_json(page, rs, site_slug, url, car['brand'])
        json.dump(data, open(f'{outdir}/{site_slug}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        # данные конфигуратора
        proj = C['proj']
        js = get(CFG_BASE.format(proj=proj) + 'js/zeekr-data.js').decode('utf-8')
        js = js.replace('"img/', '"' + CFG_BASE.format(proj=proj) + 'img/')
        js = cfg_names(js, rs)
        os.makedirs(f'{pub}/kartochki/{site_slug}', exist_ok=True)
        open(f'{pub}/kartochki/{site_slug}/cfg-data.js', 'w', encoding='utf-8').write(js)
        astro_route(site, url, site_slug)
        index.append(site_slug)
    pohozhie(outdir)
    if not a.only:
        open(f'{outdir}/index.ts', 'w', encoding='utf-8').write(
            '// Модели с карточкой «Китай под заказ» (scripts/karty/build.py). Для них [model].astro страницу не строит.\n'
            'export const KARTY = new Set<string>(' + json.dumps(index, ensure_ascii=False) + ');\n')
    print('готово:', len(index))


if __name__ == '__main__':
    main()
