/* Карточка модели в дизайне EV Car – общий скрипт для всех моделей. Данные – window.CAR (собирает tools/gen.py из data/<проект>.json).
   Основа – карточка Zeekr 8X (razbory/evolutioncar-zeekr-8x-d2effe31/prototip/ev.js). Без библиотек.
   Таможня – calc.js нашего калькулятора растаможки РБ (формула ГТК + Указ № 428). */
(function () {
  var C = window.CAR, d = document, root = d.documentElement;
  var $ = function (s, r) { return (r || d).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)) };
  var mob = function () { return innerWidth <= 760 };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') };
  var store = { get: function (k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) {} } };
  function lock(on) { root.style.overflow = on ? 'hidden' : '' }
  var ASK = '<span class="ask w-ask">[уточнить]</span>';

  /* курс НБРБ – C.kurs (дата в C.kursDate) */
  var K = C.kurs;
  var toUsd = function (y) { return y * K.cny / K.usd }, toEur = function (y) { return y * K.cny / K.eur };
  function customs(y, type) {
    var out = Rastamozhka.calc({ who: 'fl', type: type, age: 'y', valueEur: toEur(y), cc: C.cc || 0, quota: false, eur: K.eur });
    return out.map(function (o) { var main = o.rows.filter(function (r) { return !/Утилиз|Таможенный сбор/.test(r.name) }); return { title: o.title, byn: main.reduce(function (s, r) { return s + r.byn }, 0), note: o.note } });
  }

  var S = { goal: 'raschet', ver: '', bat: '', color: (C.colors[0] || [])[1] || '', build: '', lzA: '20', lzT: '36', lzK: 'lizing' };

  /* тема: вечером тёмная сама, кнопка запоминает */
  var tb = $('#tema');
  function tIcon() { tb.textContent = root.getAttribute('data-evk') === 'dark' ? '☀' : '☾' }
  tb.addEventListener('click', function () { var n = root.getAttribute('data-evk') === 'dark' ? 'light' : 'dark'; root.setAttribute('data-evk', n); store.set('tema-evk', n); tIcon() }); tIcon();

  /* логика блоков и цепочка */
  var blocks = $$('main .w-block');
  blocks.forEach(function (b) {
    var l = $('.logic', b); if (!l) return;
    l.innerHTML = '<b>Блок ' + b.dataset.n + '.</b> Вопрос клиента: «' + b.dataset.question + '»<br><b>Нам:</b> ' + (b.dataset.us || '') + '<br><b>Клиенту:</b> ' + (b.dataset.client || '') +
      '<br><b>Опора:</b> ' + (b.dataset.proof || '') + (b.dataset.next ? '<br><b>Ведёт к вопросу:</b> «' + b.dataset.next + '»' : '');
  });
  function seoOpen() {}  /* панель «Цепочка, SEO» – только в прототипе */

  /* две карточки в разделе обзора – рядом в одной сетке (правило проекта, 19.11.2026) */
  $$('.ob').forEach(function (ob) {
    var og = $('.og', ob); if (!og) return;
    var inner = $$('.of', og), prev = og.previousElementSibling;
    if (inner.length === 1 && prev && prev.classList.contains('of')) { prev.classList.remove('big'); og.insertBefore(prev, og.firstChild) }
  });

  /* цвет кузова: официальные рендеры из конфигуратора */
  var stage = $('#stage'), dots = $('#dots'), colorKey = 'evk-color-' + C.proj;
  dots.innerHTML = C.colors.map(function (c, i) { return '<button type="button" role="radio" aria-label="' + c[1] + '" aria-checked="' + !i + '" data-c="' + c[0] + '"' + (c[3] ? ' style="background-image:url(' + c[3] + ')"' : '') + (i ? '' : ' class="on"') + '></button>' }).join('');
  function paint(code) {
    var c = C.colors.filter(function (x) { return x[0] === code })[0]; if (!c) return; S.color = c[1];
    $$('button', dots).forEach(function (b) { var on = b.dataset.c === code; b.classList.toggle('on', on); b.setAttribute('aria-checked', on) });
    $('#cname').textContent = c[1];
    var old = $('img.on', stage); if (old && old.dataset.c === code) return;
    var im = new Image(); im.src = c[2]; im.alt = C.name + ', ' + c[1].toLowerCase() + ', официальный рендер'; im.dataset.c = code;
    stage.appendChild(im); requestAnimationFrame(function () { requestAnimationFrame(function () { im.classList.add('on'); if (old) { old.classList.remove('on'); setTimeout(function () { old.remove() }, 700) } }) });
    formNote(); store.set(colorKey, code);
  }
  dots.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) paint(b.dataset.c) });
  var sc = store.get(colorKey); if (sc && C.colors.length && sc !== C.colors[0][0]) paint(sc);
  if (C.colors.length < 2) $('.sw').hidden = true;

  /* подсветка разделов в шапке и во вкладках обзора */
  var otabs = $$('#otabs a');
  function obAct(id) { $$('.ob').forEach(function (o) { o.classList.toggle('act', o.id === id) }); otabs.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + id) }) }
  obAct('o-ext');
  otabs.forEach(function (a) { a.addEventListener('click', function (e) { if (!mob()) return; e.preventDefault(); obAct(a.getAttribute('href').slice(1)); $('#otabs').scrollIntoView({ block: 'start' }) }) });
  function onScroll() {
    var on = null; $$('.hd-nav a').forEach(function (a) { var t = $(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < 140) on = a }); $$('.hd-nav a').forEach(function (a) { a.classList.toggle('on', a === on) });
    if (!mob()) { var oo = otabs[0]; otabs.forEach(function (a) { var t = $(a.getAttribute('href')); if (t && t.getBoundingClientRect().top < 200) oo = a }); otabs.forEach(function (a) { a.classList.toggle('on', a === oo) }) }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* версии: цена в Китае, запас хода; вариант батареи переключается */
  var V = C.versions, vb = $('#vers');
  var hyb = function (v) { return (v.type || C.type) !== 'bev' };
  vb.innerHTML = V.map(function (v, i) {
    return '<div class="w-card v4" data-i="' + i + '">' +
      '<div class="vi">' + (v.img ? '<img src="' + v.img + '" alt="' + C.name + ' ' + v.n + '" loading="lazy">' : '') + '</div>' +
      '<div class="nm">' + v.n + '</div><div class="tg">' + (v.tag || '') + '</div>' +
      '<div class="bt">' + v.b.map(function (b, k) { return '<button type="button" data-b="' + k + '"' + (k === v.def ? ' class="on"' : '') + (v.b.length < 2 ? ' disabled' : '') + '>' + b.l + '</button>' }).join('') + '</div>' +
      '<div class="cn"><span data-p></span><small data-u></small></div>' +
      '<div class="tk">Под ключ в Минске: <span class="ask w-ask">[запросить]</span></div>' +
      '<div class="rn">' + (hyb(v) ? '<div><b data-e></b>на электричестве</div><div><b data-t></b>всего, CLTC</div>' : '<div><b data-e></b>запас хода, CLTC</div>') + '</div>' +
      '<ul>' + (v.li || []).map(function (x) { return '<li>' + x + '</li>' }).join('') + '</ul>' +
      '<a class="w-btn sm wide" href="#konfigurator" data-cfg="' + v.id + '">Собрать ' + v.n + '</a></div>';
  }).join('');

  var cards = $$('.v4', vb);
  function cardUpd(card, k) {
    var v = V[+card.dataset.i], x = v.b[k]; card.dataset.b = k;
    $$('.bt button', card).forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.b === +k) });
    $('[data-p]', card).innerHTML = x.p ? fmt(x.p) + ' ¥' : ASK; $('[data-u]', card).textContent = x.p ? 'в Китае · ≈ ' + fmt(toUsd(x.p)) + ' $' : 'цена в Китае';
    $('[data-e]', card).textContent = x.e ? x.e + ' км' : '–'; var t = $('[data-t]', card); if (t) t.textContent = x.t ? x.t + ' км' : '–';
  }
  cards.forEach(function (c) { cardUpd(c, V[+c.dataset.i].def) });
  function pickVer(i, k, fromForm) {
    var v = V[i], x = v.b[k], y = x.p; S.ver = v.n; S.bat = v.b.length > 1 ? x.l : '';
    cards.forEach(function (c, j) { c.classList.toggle('on', j === i) });
    $('#ck-h').textContent = C.name + ' ' + v.n + (S.bat ? ' ' + S.bat : '');
    $('#ck-p').innerHTML = y ? fmt(y) + ' ¥' : ASK; $('#ck-usd').textContent = y ? '≈ ' + fmt(toUsd(y)) + ' $' : '–';
    if (y) {
      var cu = customs(y, v.type || C.type);
      $('#ck-tl').textContent = '3. ' + cu[0].title; $('#ck-t').textContent = '≈ ' + fmt(cu[0].byn) + ' BYN'; $('#ck-te').textContent = '≈ ' + fmt(cu[0].byn / K.eur) + ' €';
      var alt = $('#ck-alt'); alt.hidden = cu.length < 2; if (cu[1]) $('#ck-a').textContent = '≈ ' + fmt(cu[1].byn) + ' BYN';
      $('#ck-note').textContent = cu[0].note;
    } else { $('#ck-t').innerHTML = ASK; $('#ck-te').textContent = '–'; $('#ck-alt').hidden = true }
    if (!fromForm) $$('#seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === v.n) });
    formNote();
  }
  vb.addEventListener('click', function (e) {
    var card = e.target.closest('.v4'); if (!card) return; var bt = e.target.closest('.bt button');
    if (bt && !bt.disabled) cardUpd(card, +bt.dataset.b);
    pickVer(+card.dataset.i, +card.dataset.b);
  });
  var di = Math.max(0, V.map(function (v) { return v.id }).indexOf(C.cfgDef));
  pickVer(di, V[di].def); cards[di].classList.remove('on'); S.ver = ''; S.bat = ''; $$('#seg button').forEach(function (x, k) { x.classList.toggle('on', k === 0) }); formNote();

  /* сравнение */
  var cmp = $('#cmp'), nV = V.length;
  $$('#cmp tbody[data-g] tr:not(.gh)').forEach(function (tr) {
    var tds = $$('td', tr).slice(1);
    tds.forEach(function (td) { var t = td.textContent.trim(); if (t === '✓') td.classList.add('yes'); if (t === '–') td.classList.add('no') });
    var t0 = tds[0] && tds[0].textContent.trim(); if (tds.length > 1 && tds.every(function (td) { return td.textContent.trim() === t0 })) tr.classList.add('same');
  });
  $('#only-diff').addEventListener('change', function (e) { cmp.classList.toggle('diff', e.target.checked) });
  if (mob()) $$('#cmp tbody[data-g]').forEach(function (g, i) { if (i) g.classList.add('cl') });
  $$('#cmp tbody[data-g]').forEach(function (g) { $('.gh button', g).addEventListener('click', function () { g.classList.toggle('cl') }) });
  $('#all-open').addEventListener('click', function () { var any = $$('#cmp tbody.cl').length; $$('#cmp tbody[data-g]').forEach(function (g) { g.classList.toggle('cl', !any) }); this.textContent = any ? 'Свернуть все группы' : 'Раскрыть все группы' });

  /* конфигуратор: встроен в страницу ([data-z9]) или, по-старому, во фрейме */
  var cfg = $('#cfg'), frame = null, cfgVer = C.cfgDef, inl = cfg && $('[data-z9]', cfg);
      var take = function (det) {
        if (!det) return; S.build = det.text || '';
        $('#build-t').textContent = (det.lines || []).map(function (l) { return l[1] }).join(' · ') || det.text;
        V.forEach(function (v, k) {
          if (v.id !== String(det.version)) return;
          var bl = (det.lines || []).filter(function (l) { return /батаре/i.test(l[0]) })[0], bk = -1;
          if (bl) v.b.forEach(function (b, j) { var n = (b.l.match(/\d+([.,]\d+)?/) || [])[0]; if (n && bl[1].indexOf(n) > -1) bk = j });
          if (bk > -1) cardUpd(cards[k], bk); pickVer(k, bk > -1 ? bk : +cards[k].dataset.b);
        });
      };
  function hook() {
    try {
      var w = frame.contentWindow, doc = frame.contentDocument; if (!doc || !doc.body) return;
      var fit = function () { frame.style.height = mob() ? Math.max(640, doc.documentElement.scrollHeight) + 'px' : Math.min(900, Math.max(700, innerHeight - 110)) + 'px' };
      fit(); addEventListener('resize', fit); if (w.ResizeObserver) new w.ResizeObserver(fit).observe(doc.body);
      doc.addEventListener('zeekr:change', function (e) { take(e.detail) });
      if (w.ZeekrCfg) take(w.ZeekrCfg.get());
    } catch (e) { /* фрейм с другого адреса – работает сам, без связи с формой */ }
  }
  function loadCfg(id) {
    if (inl) { if (id && window.ZeekrCfg && ZeekrCfg.setVersion) ZeekrCfg.setVersion(id); return }
    cfgVer = id || cfgVer; $$('#cfg-seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === cfgVer) });
    if (!frame) { frame = d.createElement('iframe'); frame.title = 'Конфигуратор ' + C.name; frame.onload = function () { var w = $('.wait', cfg); if (w) w.remove(); hook() }; cfg.appendChild(frame) }
    frame.src = cfg.dataset.src + '?v=' + cfgVer + '#v=' + cfgVer;
  }
  var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { cio.disconnect(); if (!frame && !mob()) loadCfg() } }, { rootMargin: '600px 0px' });
  if (inl) { d.addEventListener('zeekr:change', function (e) { take(e.detail) }); if (window.ZeekrCfg) take(ZeekrCfg.get()) } else cio.observe(cfg);
  $$('#cfg-seg button').forEach(function (b) { b.addEventListener('click', function () { loadCfg(b.dataset.v) }) });
  d.addEventListener('click', function (e) { var a = e.target.closest('[data-cfg]'); if (a) { cio.disconnect(); loadCfg(a.dataset.cfg) } });

  /* лизинг */
  function chips(id, key, after) { $$('#' + id + ' button').forEach(function (b) { b.addEventListener('click', function () { $$('#' + id + ' button').forEach(function (x) { x.classList.toggle('on', x === b) }); var k = Object.keys(b.dataset)[0]; S[key] = b.dataset[k]; if (after) after() }) }) }
  var LZT = { 24: '2 года', 36: '3 года', 60: '5 лет' };
  chips('lz-a', 'lzA', lz); chips('lz-t', 'lzT', lz); chips('lz-k', 'lzK', lz);
  function lz() {
    $('#lz-s').textContent = (S.lzK === 'kredit' ? 'кредит' : 'лизинг') + ' · аванс ' + S.lzA + ' %, ' + LZT[S.lzT];
    var t = $('#lz-f .t'); if (t) t.textContent = S.lzK === 'kredit' ? 'Получить расчёт кредита' : 'Получить график платежей';
  }

  /* форма: кнопка активна только с галочкой; цель, версия, цвет и сборка уходят в заявку */
  var fm = $('#fm'), tel = fm.tel, sub = $('button[type=submit]', fm);
  var GOAL = { raschet: 'Получить расчёт ' + C.name, test: 'Уточнить наличие и тест-драйв', lizing: 'Получить график лизинга', kredit: 'Получить расчёт кредита' };
  function setGoal(g) { S.goal = g; $$('#goal button').forEach(function (b) { b.classList.toggle('on', b.dataset.g === g) }); $('.t', fm).textContent = GOAL[g]; $('#goal-w').hidden = g === 'test' }
  function formNote() { var el = $('#cv-t'); if (el) el.textContent = C.name + (S.ver ? ' ' + S.ver + (S.bat ? ' ' + S.bat : '') : '') + (S.color ? ' · ' + S.color.toLowerCase() : '') + (S.build ? ' · сборка из конфигуратора приложена' : ' · сборка из конфигуратора будет приложена') }
  $$('#goal button').forEach(function (b) { b.addEventListener('click', function () { setGoal(b.dataset.g) }) });
  d.addEventListener('click', function (e) { var a = e.target.closest('[data-goal]'); if (a) setGoal(a.dataset.goal) });
  $$('#seg button').forEach(function (b) { b.addEventListener('click', function () {
    $$('#seg button').forEach(function (x) { x.classList.toggle('on', x === b) });
    var i = -1; V.forEach(function (v, k) { if (v.n === b.dataset.v) i = k });
    if (i > -1) pickVer(i, +cards[i].dataset.b, true); else { S.ver = ''; S.bat = ''; formNote() }
  }) });
  function mask(v) { var x = v.replace(/\D/g, ''); if (x.indexOf('375') === 0) x = x.slice(3); x = x.slice(0, 9); var r = '+375'; if (x.length) r += ' (' + x.slice(0, 2); if (x.length >= 2) r += ')'; if (x.length > 2) r += ' ' + x.slice(2, 5); if (x.length > 5) r += '-' + x.slice(5, 7); if (x.length > 7) r += '-' + x.slice(7, 9); return r }
  tel.addEventListener('focus', function () { if (!tel.value) tel.value = '+375 (' });
  tel.addEventListener('blur', function () { if (tel.value.replace(/\D/g, '').length <= 3) tel.value = '' });
  tel.addEventListener('input', function () { tel.value = mask(tel.value); tel.closest('.w-field').classList.remove('bad') });
  fm.agree.addEventListener('change', function () { sub.disabled = !fm.agree.checked });
  fm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (tel.value.replace(/\D/g, '').length < 12) { tel.closest('.w-field').classList.add('bad'); tel.focus(); return }
    if (fm.website.value) return;
    var utm = []; new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|yclid|gclid/.test(k)) utm.push(k + '=' + v) });
    var parts = [({ raschet: 'Расчёт под ключ', test: 'Тест-драйв: ' + C.name, lizing: 'Лизинг: аванс ' + S.lzA + ' %, ' + S.lzT + ' мес', kredit: 'Кредит' })[S.goal],
      S.ver ? C.name + ' ' + S.ver + (S.bat ? ' ' + S.bat : '') : 'версия не выбрана', S.color, S.build ? 'сборка: ' + S.build : '', tel.value];
    var fin = function () { $('.w-success', fm).hidden = false; sub.hidden = true; $('#done-v').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') };
    if (!window.evkLead) return fin();
    sub.disabled = true;
    window.evkLead({ name: fm.elements.name ? fm.elements.name.value.trim() : '', phone: tel.value, form: S.goal === 'test' ? 'тест-драйв' : 'расчёт', text: parts.slice(0, -1).filter(Boolean).join(' · ') })
      .then(function (ok) { if (ok) fin(); else { sub.disabled = false; alert('Не удалось отправить. Позвоните нам: +375 (29) 135-88-88') } });
  });

  /* заявка прямо из блока лизинга: аванс, срок, версия и сборка уходят вместе с телефоном */
  var lf = $('#lz-f');
  if (lf) {
    var lt = lf.tel, ls = $('button[type=submit]', lf);
    lt.addEventListener('focus', function () { if (!lt.value) lt.value = '+375 (' });
    lt.addEventListener('blur', function () { if (lt.value.replace(/\D/g, '').length <= 3) lt.value = '' });
    lt.addEventListener('input', function () { lt.value = mask(lt.value); lt.closest('.w-field').classList.remove('bad') });
    lf.agree.addEventListener('change', function () { ls.disabled = !lf.agree.checked });
    lf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (lt.value.replace(/\D/g, '').length < 12) { lt.closest('.w-field').classList.add('bad'); lt.focus(); return }
      if (lf.website.value) return;
      var parts = [(S.lzK === 'kredit' ? 'Кредит' : 'Лизинг') + ': аванс ' + S.lzA + ' %, срок ' + LZT[S.lzT],
        S.ver ? C.name + ' ' + S.ver + (S.bat ? ' ' + S.bat : '') : C.name + ', версия не выбрана', S.color, S.build ? 'сборка: ' + S.build : '', lt.value];
      var fin = function () { $('.w-success', lf).hidden = false; ls.hidden = true; $('#lz-done').textContent = 'В заявке: ' + parts.filter(Boolean).join(' · ') };
      if (!window.evkLead) return fin();
      window.evkLead({ name: lf.elements.name ? lf.elements.name.value.trim() : '', phone: lt.value, form: 'лизинг', text: parts.slice(0, -1).filter(Boolean).join(' · ') })
        .then(function (ok) { if (ok) fin(); else alert('Не удалось отправить. Позвоните нам: +375 (29) 135-88-88') });
    });
  }

  /* окно «Связаться» */
  function closeS() { $$('.sheet.open').forEach(function (s) { s.classList.remove('open'); s.setAttribute('aria-hidden', 'true') }); lock(false) }
  $$('[data-sheet]').forEach(function (b) { b.addEventListener('click', function () { var s = $('#sh-' + b.dataset.sheet); s.classList.add('open'); s.setAttribute('aria-hidden', 'false'); lock(true) }) });
  $$('.sheet [data-close]').forEach(function (b) { b.addEventListener('click', closeS) });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeS(); seoOpen(false) } });

  /* курс НБРБ на сегодня (CORS открыт); не ответил – остаётся сохранённый */
  fetch('https://api.nbrb.by/exrates/rates?periodicity=0').then(function (r) { return r.json() }).then(function (rs) {
    var m = {}; rs.forEach(function (x) { m[x.Cur_Abbreviation] = x.Cur_OfficialRate / x.Cur_Scale });
    if (m.USD && m.EUR && m.CNY) { K.usd = m.USD; K.eur = m.EUR; K.cny = m.CNY; var dt = new Date().toLocaleDateString('ru-RU'); $$('[data-kurs]').forEach(function (e) { e.textContent = dt });
      cards.forEach(function (c) { cardUpd(c, +c.dataset.b) }); var on = cards.filter(function (c) { return c.classList.contains('on') })[0]; var i = on ? +on.dataset.i : di; pickVer(i, +cards[i].dataset.b); if (!on) { cards[i].classList.remove('on'); S.ver = ''; S.bat = ''; formNote() }
      var hp = $('#hero-usd'); if (hp && C.minPrice) hp.textContent = '≈ ' + fmt(toUsd(C.minPrice)) + ' $ по курсу НБРБ на ' + dt }
  }).catch(function () {});
})();

/* ===== Мобильная вёрстка: ленты со счётчиком, сравнение двух версий, конфигуратор на весь экран ===== */
(function () {
  var d = document, $ = function (s, r) { return (r || d).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)) };
  var mob = function () { return innerWidth <= 760 };
  $$('.m-lane').forEach(function (lane) {
    var items = [].slice.call(lane.children); if (items.length < 2) return;
    var meta = d.createElement('div'); meta.className = 'lane-meta';
    meta.innerHTML = '<span><b>1</b> / ' + items.length + ' · листайте вбок →</span><span class="lane-dots">' + items.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>' }).join('') + '</span>';
    lane.after(meta);
    var tick = false;
    lane.addEventListener('scroll', function () { if (tick) return; tick = true; requestAnimationFrame(function () {
      tick = false; var w = items[0].getBoundingClientRect().width + 12, k = Math.min(items.length - 1, Math.round(lane.scrollLeft / w));
      $('b', meta).textContent = k + 1; $$('.lane-dots i', meta).forEach(function (x, j) { x.classList.toggle('on', j === k) });
    }) }, { passive: true });
  });
  // сравнение комплектаций: на телефоне две версии рядом
  var cmp = $('#cmp');
  if (cmp) {
    var names = $$('thead th', cmp).slice(1).map(function (th) { return $('b', th).textContent });
    if (names.length > 2) {
      var pick = d.createElement('div'); pick.className = 'cmp-pick';
      pick.innerHTML = '<span class="lb" style="width:100%;margin:0 0 4px">Сравнить две версии</span>' + names.map(function (n, i) { return '<button type="button" data-i="' + i + '"' + (i < 2 ? ' class="on"' : '') + '>' + n + '</button>' }).join('');
      cmp.before(pick);
      var sel = [0, 1];
      var apply = function () {
        cmp.classList.toggle('two', mob());
        $$('tr', cmp).forEach(function (tr) {
          if (tr.classList.contains('gh')) return;
          var cells = [].slice.call(tr.children).slice(1);
          cells.forEach(function (c, i) { c.classList.toggle('off', cells.length === names.length && sel.indexOf(i) < 0) });
        });
        $$('button', pick).forEach(function (b) { b.classList.toggle('on', sel.indexOf(+b.dataset.i) > -1) });
      };
      pick.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var i = +b.dataset.i; if (sel.indexOf(i) > -1) return; sel = [sel[1], i]; apply() });
      apply(); addEventListener('resize', apply);
    } else cmp.classList.toggle('two', mob());
  }
  // конфигуратор на весь экран: на телефоне фрейм грузится только по нажатию
  var open = $('#cfg-open'), cfg = $('#cfg'), x = $('#cfg-x');
  if (open && cfg) {
    open.addEventListener('click', function () { cfg.classList.add('full'); d.documentElement.style.overflow = 'hidden'; var b = $('#cfg-seg button.on') || $('#cfg-seg button'); if (b) b.click() });
    x.addEventListener('click', function () { cfg.classList.remove('full'); d.documentElement.style.overflow = ''; });
  }
})();
/* нижняя панель на телефоне появляется, когда первый экран ушёл вверх */
(function () {
  var hero = document.getElementById('hero'); if (!hero) return;
  function upd() { document.body.classList.toggle('tb', hero.getBoundingClientRect().bottom < innerHeight * 0.4) }
  addEventListener('scroll', upd, { passive: true }); upd();
})();

/* Отзывы: стрелки карусели (на телефоне – свайп и счётчик ленты) */
(function () {
  var lane = document.querySelector('.otz'); if (!lane) return;
  var btns = [].slice.call(document.querySelectorAll('[data-otz]'));
  var step = function () { var c = lane.children[0]; return c ? c.getBoundingClientRect().width + 16 : lane.clientWidth };
  var upd = function () { var max = lane.scrollWidth - lane.clientWidth - 4; btns.forEach(function (b) { b.disabled = +b.dataset.otz < 0 ? lane.scrollLeft <= 4 : lane.scrollLeft >= max }) };
  btns.forEach(function (b) { b.addEventListener('click', function () { lane.scrollBy({ left: +b.dataset.otz * step(), behavior: 'smooth' }) }) });
  lane.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
})();
