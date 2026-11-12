// Избранное и сравнение машин (по образцу Авито). С 12.11.2026 включено на всех
// карточках каталога (решение владельца; до этого – только Li Auto L6, L7, L9).
import type { Car } from './cars';
import { availabilities, countries, powertrains, formatUsd, formatByn } from './cars';

export const COMPARE_LIMIT = 3;
export const COMPARE_PATH = '/sravnenie/';

export const compareText = {
  favAdd: 'В избранное',
  favOn: 'В избранном',
  cmpAdd: 'Сравнить',
  cmpOn: 'В сравнении',
  added: 'Добавлено в сравнение',
  removed: 'Удалено из сравнения',
  favAdded: 'Добавлено в избранное',
  favRemoved: 'Удалено из избранного',
  full: 'В сравнении уже {limit} авто',
  fullHint: 'Удалите одно, чтобы добавить это.',
  count: 'В списке {n} авто. Можно добавить ещё {left}.',
  countFull: 'В списке {n} авто – это максимум.',
  go: 'Перейти',
  // страница сравнения
  title: 'Сравнение',
  empty: 'В сравнении пока нет автомобилей. Откройте карточку и нажмите «Сравнить».',
  emptyCta: 'Перейти в каталог',
  findMore: 'Найти ещё',
  findMoreHint: 'Можно добавить ещё {left}',
  remove: 'Убрать из сравнения',
  onlyDiff: 'Показать только отличия',
  dataTitle: 'Данные из карточки',
  noDiff: 'Отличий нет – эти автомобили совпадают по всем параметрам.',
};

/** Строка таблицы: подпись и значение для машины (берётся из характеристик карточки) */
const spec = (car: Car, ...labels: string[]) =>
  car.specs.find((s) => labels.includes(s.label) && s.value)?.value ?? '';

export const compareRows: { label: string; value: (car: Car) => string }[] = [
  { label: 'Цена под ключ', value: (c) => (c.priceUsd ? `от ${formatUsd(c.priceUsd)}` : '') },
  { label: 'В белорусских рублях', value: (c) => (c.priceByn ? `≈ ${formatByn(c.priceByn)}` : '') },
  { label: 'Наличие', value: (c) => availabilities[c.availability] },
  { label: 'Рынок', value: (c) => countries[c.country].label },
  { label: 'Год выпуска', value: (c) => spec(c, 'Год выпуска') || c.year },
  { label: 'Состояние', value: (c) => spec(c, 'Состояние') },
  { label: 'Комплектация', value: (c) => spec(c, 'Комплектация') },
  { label: 'Двигатель', value: (c) => powertrains[c.powertrain] },
  { label: 'Тип топлива', value: (c) => spec(c, 'Тип топлива', 'Двигатель') },
  { label: 'Объём двигателя', value: (c) => spec(c, 'Объём двигателя') },
  { label: 'Мощность', value: (c) => spec(c, 'Мощность') },
  { label: 'Батарея', value: (c) => spec(c, 'Батарея') },
  { label: 'Запас хода', value: (c) => spec(c, 'Запас хода') },
  { label: 'Коробка передач', value: (c) => spec(c, 'Коробка передач') },
  { label: 'Привод', value: (c) => spec(c, 'Привод') },
  { label: 'Кузов', value: (c) => spec(c, 'Кузов') },
];
