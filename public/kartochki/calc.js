/* Расчёт таможенных платежей при ввозе легкового авто в Беларусь (2026). Чистые функции – их же гоняет проверка в node.
   Источники: формула единых ставок – скрипт калькулятора ГТК customs.gov.by/calc/script.js (снят 15.11.2026);
   НДС для электромобилей и гибридов – Указ № 428 от 11.12.2025 (разъяснение ГТК, pravo.by, 20.12.2025);
   утильсбор физлица M1 – 624,92 / 1 282,02 BYN (Витебская таможня, постановление Совмина № 195 от 23.04.2026). */
(function (root) {
  var UTIL_FL = { young: 624.92, old: 1282.02 }; // до 3 лет включительно / старше
  var SBOR = 120;
  var sp = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') }; // таможенный сбор, BYN – сверить

  /* Единая ставка физлица, евро. age: 'y' до 3 лет, 'm' 3–5, 'o' старше 5. value – таможенная стоимость в евро, cc – объём */
  function ets(age, value, cc) {
    if (age === 'y') {
      var t = value <= 8500 ? [0.54, 2.5] : value <= 16700 ? [0.48, 3.5] : value <= 42300 ? [0.48, 5.5] : value <= 84500 ? [0.48, 7.5] : value <= 169000 ? [0.48, 15] : [0.48, 20];
      var byV = value * t[0], byCc = cc * t[1];
      return { eur: Math.max(byV, byCc), how: byV >= byCc ? Math.round(t[0] * 100) + ' % от стоимости' : t[1] + ' € за см³ (минимум больше процента)' };
    }
    var m = age === 'm' ? [1.5, 1.7, 2.5, 2.7, 3, 3.6] : [3, 3.2, 3.5, 4.8, 5, 5.7];
    var r = cc <= 1000 ? m[0] : cc <= 1500 ? m[1] : cc <= 1800 ? m[2] : cc <= 2300 ? m[3] : cc <= 3000 ? m[4] : m[5];
    return { eur: cc * r, how: r + ' € за см³' };
  }

  /* Пошлина 15 % + НДС от (стоимость + пошлина). dutyRate 0 – в квоте, vatRate 0 – льгота */
  function dutyVat(value, dutyRate, vatRate) {
    var duty = value * dutyRate, vat = (value + duty) * vatRate;
    return { duty: duty, vat: vat, eur: duty + vat };
  }

  /* Главный расчёт. o: {who:'fl'|'ul', type:'ice'|'phev'|'erev'|'bev', age:'y'|'m'|'o', valueEur, cc, quota:true|false, eur:курс EUR→BYN}
     Возвращает варианты (у PHEV физлица их два), каждый со строками в BYN. */
  function calc(o) {
    var out = [], util = o.who === 'fl' ? (o.age === 'y' ? UTIL_FL.young : UTIL_FL.old) : null;
    var bevVat = o.age === 'o' ? 0.20 : 0; // НДС 0 % для электромобиля не старше 5 лет
    function pack(title, note, parts) {
      var rows = parts.map(function (p) { return { name: p[0], byn: p[1] === null ? null : p[1], hint: p[2] || '' } });
      rows.push({ name: 'Утилизационный сбор', byn: util, hint: util === null ? 'для юрлиц – по шкале, у брокера' : (o.age === 'y' ? 'до 3 лет' : 'старше 3 лет') });
      rows.push({ name: 'Таможенный сбор', byn: SBOR, hint: 'сверить' });
      var total = rows.reduce(function (s, r) { return r.byn === null ? s : s + r.byn }, 0);
      out.push({ title: title, note: note, rows: rows, total: total, partial: rows.some(function (r) { return r.byn === null }) });
    }
    var E = o.eur;
    if (o.who === 'fl' && (o.type === 'ice' || o.type === 'phev')) {
      var e = ets(o.age, o.valueEur, o.cc);
      pack(o.type === 'phev' ? 'По формуле ГТК: единая ставка' : 'Единая ставка ГТК', 'Как считает официальный калькулятор customs.gov.by: ' + e.how + '. НДС отдельно не платится – он внутри единой ставки.',
        [['Единая ставка (пошлина и налоги)', e.eur * E, sp(e.eur) + ' €, ' + e.how]]);
      if (o.type === 'phev') {
        var d = dutyVat(o.valueEur, 0.15, 0.20);
        pack('Как считают дилеры с 2026: 15 % + НДС 20 %', 'Так гибриды физлиц считают evauto.pro и другие калькуляторы РБ после Указа № 428. Какой вариант применит таможня к вашей модели – подтверждает брокер по коду ТН ВЭД.',
          [['Пошлина 15 %', d.duty * E, sp(d.duty) + ' €'], ['НДС 20 % от стоимости и пошлины', d.vat * E, sp(d.vat) + ' €']]);
      }
    } else if (o.type === 'erev') {
      var d2 = dutyVat(o.valueEur, 0.15, 0.20);
      pack('Последовательный гибрид: 15 % + НДС 20 %', 'С 1 января 2026 льгота по НДС для гибридов всех типов, включая последовательные, отменена (Указ № 428). Квота на электромобили к гибридам не относится.',
        [['Пошлина 15 %', d2.duty * E, sp(d2.duty) + ' €'], ['НДС 20 %', d2.vat * E, sp(d2.vat) + ' €']]);
    } else if (o.type === 'bev') {
      var d3 = dutyVat(o.valueEur, o.quota ? 0 : 0.15, bevVat);
      pack('Электромобиль: ' + (o.quota ? 'в квоте – пошлина 0 %' : 'вне квоты – пошлина 15 %') + ', НДС ' + (bevVat ? '20 %' : '0 %'),
        (bevVat ? 'Машина старше 5 лет – льгота по НДС не действует.' : 'НДС 0 % – для электромобиля не старше 5 лет (Указ № 428, до конца 2028).') + (o.quota ? ' Квоту проверить на дату ввоза.' : ' Квота 2026 для физлиц, по данным дилеров, выбрана 05.09.2026.'),
        [['Пошлина ' + (o.quota ? '0 %' : '15 %'), d3.duty * E, sp(d3.duty) + ' €'], ['НДС ' + (bevVat ? '20 %' : '0 %'), d3.vat * E, sp(d3.vat) + ' €']]);
    } else { // юрлицо, ДВС или параллельный гибрид
      var d4 = dutyVat(o.valueEur, 0.15, 0.20);
      pack('Юрлицо: пошлина + НДС 20 %', 'Ставка 15 % верна для новых машин; для машин с пробегом у юрлиц ставка по объёму – уточнять у брокера.',
        [['Пошлина 15 %', d4.duty * E, sp(d4.duty) + ' €'], ['НДС 20 %', d4.vat * E, sp(d4.vat) + ' €']]);
    }
    return out;
  }
  var api = { ets: ets, calc: calc, UTIL_FL: UTIL_FL, SBOR: SBOR };
  if (typeof module !== 'undefined') module.exports = api; else root.Rastamozhka = api;
})(this);
