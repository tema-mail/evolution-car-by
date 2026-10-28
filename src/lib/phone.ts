/**
 * Страны для поля телефона с выбором страны. Маска – национальная часть
 * номера после кода, «#» – цифра. Список – соседи и страны, откуда
 * реально пишут в автосалон; остальным – «Другая страна» без маски.
 */
export interface Country {
  iso: string;
  name: string;
  flag: string;
  dial: string;
  mask: string;
  /** Меньше цифр, чем в маске, – если номера в стране бывают короче */
  min?: number;
}

// Работаем только по Беларуси и России (решение владельца 28.10.2026:
// «нам интересно только Беларусь и Россия, по умолчанию всегда Беларусь»).
// Короткий список – меньше шансов, что человек выберет не ту страну
// и пришлёт номер, по которому до него не дозвонятся.
export const COUNTRIES: Country[] = [
  { iso: 'BY', name: 'Беларусь', flag: '🇧🇾', dial: '375', mask: '## ###-##-##' },
  { iso: 'RU', name: 'Россия', flag: '🇷🇺', dial: '7', mask: '### ###-##-##' },
];

const byIso = (iso: string) => COUNTRIES.find((c) => c.iso === iso);

/** Часовые пояса, по которым страна определяется однозначно */
const ZONES: Record<string, string> = { 'Europe/Minsk': 'BY' };
const RU_ZONES = /^(Europe\/(Moscow|Samara|Volgograd|Kaliningrad|Astrakhan|Saratov|Ulyanovsk|Kirov)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Sakhalin|Magadan|Srednekolymsk|Kamchatka|Anadyr))$/;

/**
 * Страна посетителя без сторонних сервисов: по часовому поясу устройства,
 * затем по региону языка браузера. Внешний геосервис по IP – это ещё
 * одна передача данных посетителя, ради подсказки в поле она не нужна.
 * Ничего не нашли – Беларусь: автосалон в Минске.
 */
export function detectCountry(): string {
  // По умолчанию Беларусь – это основной рынок. Россию ставим только если
  // на устройстве явно российский часовой пояс или язык региона RU.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    if (ZONES[tz]) return 'BY';
    if (RU_ZONES.test(tz)) return 'RU';
  } catch { /* старый браузер без Intl – остаёмся на Беларуси */ }
  for (const lang of navigator.languages ?? [navigator.language]) {
    if (lang.split('-')[1]?.toUpperCase() === 'RU') return 'RU';
  }
  return 'BY';
}

/** Сколько цифр нужно национальной части номера */
function need(c: Country): number {
  return c.min ?? (c.mask.match(/#/g)?.length ?? 0);
}

/**
 * Национальная часть номера по маске страны. Человек часто вставляет номер
 * целиком – с кодом страны или в местной записи (8 029…, 8 916…) – поэтому
 * код и местный префикс срезаются, а не дописываются к номеру второй раз.
 */
export function maskNational(raw: string, c: Country): string {
  let d = raw.replace(/\D/g, '');
  if (!c.mask) return d.slice(0, 15);
  const len = c.mask.match(/#/g)!.length;
  if (d.length > len && d.startsWith(c.dial)) d = d.slice(c.dial.length);
  // Местный префикс срезается сразу, иначе при наборе по цифре номер упёрся
  // бы в длину маски раньше, чем стал похож на местную запись. Ни в одной
  // стране списка номер после кода не начинается с 0 – это всегда префикс.
  // В Беларуси и Литве номер после кода не начинается и с 8; «375…» без
  // плюса – тоже не белорусский номер, а он же с кодом страны.
  if (c.iso === 'BY') d = d.replace(/^375|^8/, '');
  if (c.iso === 'LT') d = d.replace(/^8/, '');
  d = d.replace(/^0+/, '');
  // В России и Казахстане номера на 8 бывают (8 800, 812), поэтому 8
  // срезаем сразу только перед мобильным 9xx, остальное – когда номер целиком
  if (c.dial === '7' && /^89/.test(d)) d = d.slice(1);
  if (c.dial === '7' && /^8\d{10}$/.test(d)) d = d.slice(1);
  if (c.iso === 'UZ' && /^8\d{9}$/.test(d)) d = d.slice(1);
  d = d.slice(0, len);
  let out = '';
  let i = 0;
  for (const ch of c.mask) {
    if (i >= d.length) break;
    out += ch === '#' ? d[i++] : ch;
  }
  return out;
}

/**
 * Разбор поля телефона. Номер с «+» несёт страну в себе: +7 из
 * белорусского поля не должен превратиться в +375 7… Поэтому страна
 * берётся из кода, а в поле остаётся только номер. Пока код набран не до
 * конца (+3, +37), поле оставляем как есть и ждём следующую цифру.
 */
export function parsePhoneInput(raw: string, current: string): { iso: string; national: string } {
  const cur = byIso(current) ?? COUNTRIES[0];
  if (!raw.trim().startsWith('+')) return { iso: current, national: maskNational(raw, cur) };
  const d = raw.replace(/\D/g, '');
  if (!d) return { iso: current, national: '+' };
  const hit = cur.dial && d.startsWith(cur.dial)
    ? cur
    : COUNTRIES.filter((c) => c.dial && d.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length)[0];
  // Пока набрано только +7, страну не меняем – ждём следующую цифру.
  if (hit?.dial === '7' && d.length === 1) return { iso: current, national: '+7' };
  if (hit) return { iso: hit.iso, national: maskNational(d.slice(hit.dial.length), hit) };
  if (COUNTRIES.some((c) => c.dial.startsWith(d))) return { iso: current, national: '+' + d };
  // Чужой код страны не принимаем: работаем по Беларуси и России, и номер,
  // по которому не дозвониться, лучше не пропускать в заявку вовсе.
  return { iso: current, national: maskNational(d, cur) };
}

/** Номер целиком, в том виде, в каком он уходит в заявку */
export function fullPhone(national: string, iso: string): string {
  const c = byIso(iso);
  if (!c?.dial) return '+' + national.replace(/\D/g, '');
  return `+${c.dial} ${national}`;
}

/** Номер набран полностью для своей страны */
export function nationalFilled(national: string, iso: string): boolean {
  const c = byIso(iso);
  const digits = national.replace(/\D/g, '').length;
  if (!c?.mask) return digits >= 8;
  return digits >= need(c);
}
