/* Варианты калькулятора лизинга/кредита. Каждый блок [data-lz] работает сам по себе.
   Расчёт ПРИМЕРНЫЙ: ставка и доставка – допущения ниже, пока нет условий партнёров. */
(function () {
  var C = window.CAR, d = document, root = d.documentElement;
  var A = { extraUsd: 3500, rate: { lizing: 13, kredit: 16 } };   // ← допущения: доставка+оформление, $; ставки, % годовых
  var K = C.kurs;
  var $ = function (s, r) { return (r || d).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)) };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') };
  var TERM = { 24: '2 года', 36: '3 года', 60: '5 лет' };

  /* версии × батареи */
  var VERS = [];
  C.versions.forEach(function (v, i) { v.b.forEach(function (b, k) { if (b.p) VERS.push({ key: i + ':' + k, name: v.n + (v.b.length > 1 ? ' ' + b.l : ''), seats: (v.tag || '').split(',')[0], p: b.p, type: v.type || C.type }) }) });
  var DEF = VERS.filter(function (x) { return x.key === Math.max(0, C.versions.map(function (v) { return v.id }).indexOf(C.cfgDef)) + ':0' })[0] || VERS[0];

  function priceUsd(x) {
    var usd = x.p * K.cny / K.usd, eur = x.p * K.cny / K.eur, cust = 0;
    try { var out = Rastamozhka.calc({ who: 'fl', type: x.type, age: 'y', valueEur: eur, cc: C.cc || 0, quota: false, eur: K.eur }); cust = out[0].rows.reduce(function (s, r) { return s + r.byn }, 0) / K.usd } catch (e) {}
    return usd + cust + A.extraUsd;
  }
  function calc(st) {
    var x = VERS.filter(function (v) { return v.key === st.ver })[0] || DEF;
    var price = priceUsd(x), adv = price * st.adv / 100, fin = price - adv, m = A.rate[st.type] / 1200, n = +st.term;
    var pay = fin * m / (1 - Math.pow(1 + m, -n));
    return { x: x, price: price, adv: adv, fin: fin, pay: pay, byn: pay * K.usd, rate: A.rate[st.type] };
  }
  function mask(v) { var x = v.replace(/\D/g, ''); if (x.indexOf('375') === 0) x = x.slice(3); x = x.slice(0, 9); var r = '+375'; if (x.length) r += ' (' + x.slice(0, 2); if (x.length >= 2) r += ')'; if (x.length > 2) r += ' ' + x.slice(2, 5); if (x.length > 5) r += '-' + x.slice(5, 7); if (x.length > 7) r += '-' + x.slice(7, 9); return r }

  $$('[data-lz]').forEach(function (box) {
    var st = { type: 'lizing', ver: DEF.key, adv: 20, term: '36' };

    /* варианты версии: select или плитки */
    $$('select[name=ver]', box).forEach(function (s) { s.innerHTML = VERS.map(function (x) { return '<option value="' + x.key + '"' + (x.key === st.ver ? ' selected' : '') + '>' + C.name + ' ' + x.name + ' · ' + x.seats + '</option>' }).join('') });
    $$('[data-tiles=ver]', box).forEach(function (t) { t.innerHTML = VERS.map(function (x) { return '<button type="button" data-set="ver" data-v="' + x.key + '"><b>' + x.name + '</b><small>' + x.seats + ' · от ' + fmt(x.p * K.cny / K.usd) + ' $ в Китае</small></button>' }).join('') });

    function draw() {
      var r = calc(st);
      $$('[data-set]', box).forEach(function (b) { b.classList.toggle('on', String(st[b.dataset.set]) === b.dataset.v) });
      $$('input[name=adv]', box).forEach(function (i) { i.value = st.adv; i.style.setProperty('--p', ((st.adv - 10) / 40 * 100) + '%') });
      var o = {
        pay: fmt(r.pay) + ' $', byn: '≈ ' + fmt(r.byn) + ' BYN в месяц', price: fmt(r.price) + ' $', adv: fmt(r.adv) + ' $', fin: fmt(r.fin) + ' $',
        advp: st.adv + ' %', term: TERM[st.term], type: st.type === 'kredit' ? 'Кредит' : 'Лизинг', ver: C.name + ' ' + r.x.name,
        sum: (st.type === 'kredit' ? 'Кредит' : 'Лизинг') + ' · ' + C.name + ' ' + r.x.name + ' · аванс ' + st.adv + ' % · ' + TERM[st.term],
        note: 'Примерный расчёт: ставка ' + r.rate + ' % годовых, цена под ключ ≈ ' + fmt(r.price) + ' $ (Китай + растаможка + доставка и оформление). Точные условия – у партнёров.'
      };
      $$('[data-out]', box).forEach(function (e) { if (o[e.dataset.out] != null) e.textContent = o[e.dataset.out] });
      var t = $('[data-form] .t', box); if (t) t.textContent = st.type === 'kredit' ? 'Получить расчёт кредита' : 'Получить график платежей';
    }

    /* шаги квиза */
    var steps = $$('[data-step]', box), cur = 0;
    function go(i) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, j) { s.hidden = j !== cur });
      $$('[data-prog]', box).forEach(function (p) { p.style.setProperty('--k', (cur + 1) / steps.length) });
      $$('[data-stepn]', box).forEach(function (e) { e.textContent = 'Шаг ' + (cur + 1) + ' из ' + steps.length });
      $$('[data-dot]', box).forEach(function (e, j) { e.classList.toggle('on', j <= cur) });
      var last = cur === steps.length - 1;   // на последнем шаге – только кнопка заявки, без «Назад» и «Далее»
      $$('[data-prev]', box).forEach(function (b) { b.hidden = cur === 0 || last });
      $$('[data-next]', box).forEach(function (b) { b.hidden = last });
      $$('.lz-nav', box).forEach(function (n) { n.hidden = last });
    }
    if (steps.length) go(0);

    box.addEventListener('click', function (e) {
      /* ищем только внутри калькулятора: у секции-обёртки тоже есть data-next (пометка вопроса) */
      var own = function (sel) { var el = e.target.closest(sel); return el && box.contains(el) ? el : null };
      var b = own('[data-set]');
      if (b) { st[b.dataset.set] = b.dataset.set === 'adv' ? +b.dataset.v : b.dataset.v; draw(); if (b.closest('[data-auto]') && steps.length) setTimeout(function () { go(cur + 1) }, 220); return }
      if (own('[data-next]')) go(cur + 1);
      else if (own('[data-prev]')) go(cur - 1);
    });
    box.addEventListener('input', function (e) {
      if (e.target.name === 'adv') { st.adv = Math.round(+e.target.value / 5) * 5; draw() }
      if (e.target.name === 'ver') { st.ver = e.target.value; draw() }
      if (e.target.name === 'tel') { e.target.value = mask(e.target.value); e.target.closest('.w-field').classList.remove('bad') }
    });
    var f = $('[data-form]', box);
    if (f) {
      var tel = f.tel, sub = $('button[type=submit]', f);
      tel.addEventListener('focus', function () { if (!tel.value) tel.value = '+375 (' });
      tel.addEventListener('blur', function () { if (tel.value.replace(/\D/g, '').length <= 3) tel.value = '' });
      f.agree.addEventListener('change', function () { sub.disabled = !f.agree.checked });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (tel.value.replace(/\D/g, '').length < 12) { tel.closest('.w-field').classList.add('bad'); tel.focus(); return }
        var r = calc(st);
        var nm = f.elements.name && f.elements.name.value.trim();
        var txt = (st.type === 'kredit' ? 'Кредит' : 'Лизинг') + ' · ' + C.name + ' ' + r.x.name + ' · аванс ' + st.adv + ' % · ' + TERM[st.term] + ' · ≈ ' + fmt(r.pay) + ' $/мес';
        if (window.evkLead) window.evkLead({ name: nm || '', phone: tel.value, form: st.type === 'kredit' ? 'кредит' : 'лизинг', text: txt });
        $('.w-success', box).hidden = false; f.hidden = true;
        $('[data-done]', box).textContent = 'В заявке: ' + (st.type === 'kredit' ? 'кредит' : 'лизинг') + ' · ' + C.name + ' ' + r.x.name + ' · аванс ' + st.adv + ' % · ' + TERM[st.term] + ' · ≈ ' + fmt(r.pay) + ' $/мес · ' + (f.elements.name && f.elements.name.value.trim() ? f.elements.name.value.trim() + ', ' : '') + tel.value;
      });
    }
    draw();
  });

  /* тема – только на отдельной странице вариантов; в карточке кнопкой темы управляет karta.js */
  var tb = $('#tema'); if (!tb || d.getElementById('hd') || d.querySelector('.evk')) return;
  function ic() { tb.textContent = root.getAttribute('data-evk') === 'dark' ? '☀' : '☾' }
  tb.addEventListener('click', function () { var n = root.getAttribute('data-evk') === 'dark' ? 'light' : 'dark'; root.setAttribute('data-evk', n); try { localStorage.setItem('tema-evk', n) } catch (e) {} ic() }); ic();
})();
