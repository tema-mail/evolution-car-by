import { trackLead } from './analytics';

import { track } from './counter';

export interface Lead {
  name: string;
  phone: string;
  /** Какая форма сработала – видно в админке, по чему человек пришёл */
  source: string;
  /** Согласие на обработку данных: без него сервер заявку не примет */
  consent: boolean;
  /** Машина из карточки. Если не передали – берём из заголовка страницы */
  car?: string;
  /** Марка машины: в кабинете это категория заявки. Без неё сервер брал
      первое слово названия, и «Lynk & Co 08» попадал в категорию «Lynk» */
  brand?: string;
  /** Значение поля-ловушки из формы: заполнено – значит отправил робот */
  company?: string;
}

/**
 * Название машины для карточек каталога. Адреса карточек в двух версиях
 * сайта устроены по-разному: /catalog/<марка>/<модель>/ в основной и
 * вторая не описывается. Разделы и страницы марок под это не подходят:
 * там нет одной машины, и подставлять заголовок было бы неверно.
 */
const CAR_PAGE = /^\/catalog\/[^/]+\/[^/]+\/?$/;

function carFromPage(): string {
  if (!CAR_PAGE.test(location.pathname)) return '';
  return document.querySelector('h1')?.textContent?.trim().slice(0, 120) ?? '';
}

/** Метки рекламной кампании из адреса – чтобы в заявке был виден источник */
function utmFromUrl(): string {
  const KEY = 'ec_utm';
  const q = new URLSearchParams(location.search);
  const fresh = ['utm_source', 'utm_medium', 'utm_campaign']
    .map((k) => q.get(k))
    .filter(Boolean)
    .join(' / ');
  try {
    // Метки есть в адресе только на первой странице. Запоминаем их на визит,
    // иначе человек, пришедший по объявлению и походивший по сайту,
    // оставит заявку без источника.
    if (fresh) {
      sessionStorage.setItem(KEY, fresh);
      return fresh;
    }
    return sessionStorage.getItem(KEY) ?? '';
  } catch {
    return fresh;
  }
}

/**
 * Отправка заявки на сервер сайта. По умолчанию – свой приёмник
 * /api/lead на том же домене (сервис lead.mjs на VPS: копия заявки
 * в файл и сообщение в Telegram). PUBLIC_LEAD_ENDPOINT перекрывает
 * адрес, а пустая строка выключает отправку – это нужно превью
 * на GitHub Pages, где сервера нет и принимать заявку некому.
 */
/**
 * Цель Метрики под конкретную заявку: общая «zayavka» плюс уточняющая –
 * карточка, квиз или конфигуратор. Нужны, чтобы в отчётах было видно,
 * какой экран приносит обращения.
 */
function goalsFor(source: string): string[] {
  const s = source.toLowerCase();
  const list = ['zayavka'];
  if (s.includes('карточка')) list.push('zayavka_kartochka');
  else if (s.includes('квиз') || s.includes('опрос')) list.push('zayavka_kviz');
  else if (s.includes('конфигуратор')) list.push('zayavka_konfigurator');
  return list;
}

/** Отправка целей и событий в Метрику и Google – параллельно своему счётчику */
function reportConversion(source: string): void {
  const w = window as unknown as {
    ym?: (...a: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
  };
  for (const goal of goalsFor(source)) {
    try { w.ym?.(98499004, 'reachGoal', goal); } catch { /* счётчика может не быть */ }
  }
  try {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: 'generate_lead', lead_source: source });
  } catch { /* Google Tag Manager не обязателен */ }
  try { w.gtag?.('event', 'generate_lead', { lead_source: source }); } catch { /* и Analytics тоже */ }
}

const DEFAULT_LEAD_ENDPOINT = '/api/lead';

export async function submitLead(lead: Lead): Promise<boolean> {
  // Своим счётчиком отправку формы считаем всегда – до и независимо от Метрики.
  if (!lead.company) track('form');
  const configured = import.meta.env.PUBLIC_LEAD_ENDPOINT;
  const endpoint = configured === undefined ? DEFAULT_LEAD_ENDPOINT : configured;

  const payload = {
    ...lead,
    car: lead.car || carFromPage(),
    page: location.pathname,
    referrer: document.referrer.slice(0, 200),
    utm: utmFromUrl(),
    // поле-ловушка: человек его не видит и не заполняет, роботы заполняют
    company: lead.company ?? '',
  };

  if (!endpoint) {
    console.info('[lead]', payload);
    await new Promise((r) => setTimeout(r, 400));
    // Событие уходит и здесь: Google Tag до приёмника заявок не подключаем
    // (docs/google-ads.md), иначе конверсии считались бы по потерянным заявкам.
    if (!lead.company) trackLead(lead.source);
    return true;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // заполненная ловушка – робот: приёмник ответит «ок», но конверсией это не считаем
    if (res.ok && !lead.company) {
      trackLead(lead.source);
      // Цели шлём только когда сервер принял заявку: иначе в отчётах
      // окажутся конверсии, которых не было.
      reportConversion(lead.source);
    }
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * После успешной заявки – страница «Спасибо»: на неё же вешают цели в
 * аналитике. Пауза даёт событию trackLead уйти до перехода. Путь пишется
 * от корня, на превью префикс подпапки дописывает scripts/rebase-dist.mjs.
 */
export function goToThanks() {
  setTimeout(() => location.assign('/thank_page/'), 300);
}
