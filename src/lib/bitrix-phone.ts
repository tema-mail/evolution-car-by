/**
 * Телефон в форме виджета Битрикс24.
 *
 * Своя форма сайта давно с маской и проверкой, а форма виджета — нет:
 * туда приходили обрезанные номера, по которым не дозвониться
 * (владелец 28.10.2026: «какие-то беспонтовые обрезанные заявки не давать»).
 *
 * Что делает:
 *   — ставит перед полем выбор страны: Беларусь (по умолчанию) и Россия;
 *   — приводит ввод к маске страны и сам убирает лишнее: код страны,
 *     местную восьмёрку, пробелы и скобки;
 *   — не даёт отправить форму, пока номер не набран полностью,
 *     и прямо пишет, сколько цифр не хватает.
 *
 * Виджет перерисовывает форму сам, поэтому следим за изменениями страницы
 * и навешиваемся заново.
 */
import { COUNTRIES, maskNational, nationalFilled } from './phone';

const FIELD = '.b24-form-field-phone';
const MARK = 'data-ec-phone';

/** Сколько цифр ждёт страна по своей маске */
const need = (iso: string) => {
  const c = COUNTRIES.find((x) => x.iso === iso);
  return c ? (c.mask.match(/#/g)?.length ?? 0) : 9;
};

const word = (n: number) => {
  const t = n % 100;
  if (t > 10 && t < 20) return 'цифр';
  const o = n % 10;
  return o === 1 ? 'цифры' : o >= 2 && o <= 4 ? 'цифр' : 'цифр';
};

function attach(field: HTMLElement): void {
  if (field.hasAttribute(MARK)) return;
  const input = field.querySelector<HTMLInputElement>('input[type="tel"], input');
  if (!input) return;
  field.setAttribute(MARK, '1');

  let iso = 'BY';

  const select = document.createElement('select');
  select.className = 'ec-b24-country';
  select.setAttribute('aria-label', 'Код страны');
  for (const c of COUNTRIES) {
    const o = document.createElement('option');
    o.value = c.iso;
    o.textContent = `${c.flag} ${c.name} +${c.dial}`;
    select.appendChild(o);
  }
  select.value = iso;
  field.prepend(select);

  const hint = document.createElement('p');
  hint.className = 'ec-b24-hint';
  hint.hidden = true;
  field.appendChild(hint);

  const dial = () => COUNTRIES.find((c) => c.iso === iso)!.dial;

  const render = () => {
    const c = COUNTRIES.find((x) => x.iso === iso)!;
    let digits = input.value.replace(/\D/g, '');
    // человек часто вставляет номер целиком или в местной записи
    if (digits.startsWith(c.dial)) digits = digits.slice(c.dial.length);
    else if (iso === 'BY' && /^(80|0)\d{9}$/.test(digits)) digits = digits.replace(/^(?:80|0)/, '');
    else if (iso === 'RU' && /^8\d{10}$/.test(digits)) digits = digits.slice(1);
    input.value = maskNational(digits, c);
  };

  const check = (): boolean => {
    const ok = nationalFilled(input.value, iso);
    if (ok) {
      hint.hidden = true;
      input.setCustomValidity('');
    } else {
      const left = need(iso) - input.value.replace(/\D/g, '').length;
      hint.textContent = left > 0
        ? `Не хватает ${left} ${word(left)} — напишите номер полностью`
        : 'Проверьте номер телефона';
      hint.hidden = false;
      input.setCustomValidity('Укажите номер телефона полностью');
    }
    return ok;
  };

  input.addEventListener('input', () => { render(); if (!hint.hidden) check(); });
  input.addEventListener('blur', check);
  select.addEventListener('change', () => { iso = select.value; render(); check(); });

  // Отправку с недописанным номером не пропускаем: заявка без телефона
  // бесполезна, а человек должен понять, что именно исправить.
  const form = field.closest('form');
  form?.addEventListener(
    'submit',
    (e) => {
      if (!check()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        input.focus();
      }
    },
    true,
  );
  // Кнопка виджета может отправлять форму в обход события submit.
  form?.querySelectorAll('button, [type="submit"]').forEach((b) =>
    b.addEventListener(
      'click',
      (e) => {
        if (!check()) {
          e.preventDefault();
          e.stopImmediatePropagation();
          input.focus();
        }
      },
      true,
    ),
  );

  // Подставляем код страны сразу, чтобы человек видел, куда звонят.
  if (!input.value.trim()) input.placeholder = `+${dial()} ${COUNTRIES.find((c) => c.iso === iso)!.mask.replace(/#/g, '0')}`;
}

export function initBitrixPhone(): void {
  const scan = () => document.querySelectorAll<HTMLElement>(FIELD).forEach(attach);
  scan();
  let planned = false;
  const observer = new MutationObserver(() => {
    if (planned) return;
    planned = true;
    setTimeout(() => { planned = false; scan(); }, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
