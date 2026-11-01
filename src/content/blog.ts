// Блог: модель статьи и реестр. Статьи лежат по файлу в content/blog/ –
// одна статья это 300–600 строк текста, и в общем файле они бы не читались.
//
// Структура статьи – по стандарту владельца (18.10.2026): справа содержание
// по H2 и призыв под ним, ответ на главный вопрос в первых предложениях (его
// забирают ИИ-ответы), FAQ, перелинковка не меньше пяти ссылок, разметка
// Article + FAQPage + BreadcrumbList. Дизайн – от этого сайта, не от образца.
//
// Текст статьи – блоками, а не готовым HTML: так вёрстка одна на все статьи,
// а в текст нельзя случайно внести разметку, которая поедет на телефоне.

/** Абзац, список, таблица, подзаголовок или врезка внутри раздела */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  /** врезка: важное предупреждение или оговорка про цифры */
  | { t: 'note'; text: string }
  /** цифра с подписью – для «сколько стоит» и сроков */
  | { t: 'facts'; items: { value: string; label: string }[] };

export interface Section {
  /** заголовок H2 – он же пункт содержания справа */
  h2: string;
  /** короткий якорь для ссылки из содержания */
  id: string;
  blocks: Block[];
}

export interface BlogArticle {
  /** адрес: /blog/<slug>/ – английскими словами, по правилу владельца */
  slug: string;
  /** H1 на странице */
  h1: string;
  /** title для поиска: тема + город, если он уместен */
  title: string;
  description: string;
  /** главный запрос статьи – один, чтобы не драться с услугами и каталогом */
  query: string;
  /** замеренный спрос: откуда и когда, либо «не замерен» – не выдумываем */
  demand: string;
  /** ответ на главный вопрос, 2–3 предложения: его забирают ИИ-ответы */
  answer: string;
  /** дата первой публикации, ISO */
  published: string;
  /** дата правки, если статью обновляли */
  updated?: string;
  /** сколько минут читать – считается из объёма текста, не руками */
  sections: Section[];
  faq: { q: string; a: string }[];
  /** перелинковка: каталог, услуги, другие статьи. Не меньше пяти */
  links: { label: string; href: string; note?: string }[];
  /** призыв: он и в колонке справа, и внизу текста */
  cta: { title: string; text: string; button: string };
  /** источники фактов – обязательны там, где есть цифры по закону и деньгам */
  sources?: { label: string; href: string; checked: string }[];
}

import { rastamozhkaElektromobilya } from './blog/rastamozhka-elektromobilya';
import { skolkoStoitPrivezti } from './blog/skolko-stoit-privezti-iz-kitaya';
import { kakProhoditPrigon } from './blog/kak-prohodit-prigon';
import { utilsborBelarus } from './blog/utilsbor-belarus';
import { zapasHodaZimoy } from './blog/zapas-hoda-zimoy';

/** Порядок в хабе: сверху свежие */
export const articles: BlogArticle[] = [
  rastamozhkaElektromobilya,
  skolkoStoitPrivezti,
  utilsborBelarus,
  kakProhoditPrigon,
  zapasHodaZimoy,
];

export const bySlug = (slug: string) => articles.find((a) => a.slug === slug);

/** Минуты чтения: 180 слов в минуту по русскому тексту, минимум 2 */
export function readingTime(a: BlogArticle): number {
  const text = [
    a.answer,
    ...a.sections.flatMap((s) => [
      s.h2,
      ...s.blocks.flatMap((b) => {
        if (b.t === 'p' || b.t === 'h3' || b.t === 'note') return [b.text];
        if (b.t === 'list' || b.t === 'ol') return b.items;
        if (b.t === 'table') return [...b.head, ...b.rows.flat()];
        if (b.t === 'facts') return b.items.flatMap((i) => [i.value, i.label]);
        return [];
      }),
    ]),
    ...a.faq.flatMap((f) => [f.q, f.a]),
  ].join(' ');
  return Math.max(2, Math.round(text.split(/\s+/).length / 180));
}

export const blogHub = {
  h1: 'Блог Evolution Car',
  title: 'Блог о привозе автомобилей в Беларусь – Evolution Car',
  description:
    'Как привезти автомобиль из Китая, Кореи, США и Европы в Беларусь: растаможка, ' +
    'утилизационный сбор, сроки, выбор модели и жизнь с машиной в Минске.',
  lead:
    'Разбираем то, о чём спрашивают чаще всего: сколько стоит привезти машину вместе ' +
    'с таможней, что изменилось в правилах, как проходит привоз по дням и чего ждать ' +
    'от китайского автомобиля зимой в Беларуси.',
} as const;
