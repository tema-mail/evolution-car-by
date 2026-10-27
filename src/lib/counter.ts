/**
 * Свой счётчик целевых действий. Нужен потому, что Яндекс.Метрика видит
 * только тех, кто согласился на cookie, и занижает цифры (владелец 28.10.2026:
 * «по факту от и до всё считаем независимо от куки и метрики»).
 *
 * Что считаем:
 *   in    – вход на сайт (первая страница за сессию вкладки)
 *   pv    – просмотр страницы
 *   phone – нажали на номер телефона
 *   msg   – нажали на мессенджер (Telegram, WhatsApp, Viber)
 *   form  – отправлена наша форма
 *   b24   – отправлена форма в виджете Битрикс24 (тоже форма, владелец 28.10.2026)
 *
 * Человека не опознаём: ни cookie, ни идентификатора, ни профиля –
 * только факт действия и адрес страницы. Поэтому согласие не требуется.
 */
export type EventKind = 'in' | 'pv' | 'phone' | 'msg' | 'form' | 'b24';

const ENDPOINT = '/api/ev';
const MESSENGERS = /^(https?:)?\/\/(t\.me|telegram\.me|web\.telegram\.org|wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|viber\.com|invite\.viber\.com)/i;

/** Отправка «вдогонку»: не задерживает переход по ссылке и не роняет страницу. */
export function track(kind: EventKind, page = location.pathname): void {
  try {
    const body = JSON.stringify({ k: kind, p: page.slice(0, 300), r: document.referrer.slice(0, 200) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
  } catch {
    /* счётчик никогда не ломает страницу */
  }
}

export function initCounter(): void {
  try {
    const KEY = 'ec_seen';
    const first = !sessionStorage.getItem(KEY);
    if (first) {
      sessionStorage.setItem(KEY, '1');
      track('in');
    }
  } catch {
    track('in');
  }
  track('pv');

  // Телефон и мессенджеры: ловим на всплытии, чтобы поймать и клик по вложенной иконке.
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('tel:')) track('phone');
      else if (MESSENGERS.test(href)) track('msg');
    },
    true,
  );

  // Форма в виджете Битрикс24: виджет шлёт своё событие при успешной отправке.
  // Названия событий у разных версий виджета отличаются – слушаем оба.
  for (const name of ['b24:form:submit:success', 'onCrmFormSubmit']) {
    window.addEventListener(name, () => track('b24'));
  }
}
