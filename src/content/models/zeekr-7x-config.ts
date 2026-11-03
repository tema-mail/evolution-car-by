// Конфигуратор Zeekr 7X: цвет кузова меняет машину на кадре.
//
// Откуда рендеры. Китайский сайт заказа Zeekr нам не отвечает (zeekr.cn,
// api/static/img/mall.zeekr.cn – код 000, проверено 03.11.2026), поэтому
// кадры взяты с европейского сайта zeekr.eu: его картинки лежат на
// datocms-assets.com, а это глобальный CDN. Имена файлов там – прямо из
// конфигуратора: cx1e_ext_21inch_f3q_<цвет>.png, где cx1e – код 7X.
// Других ракурсов на европейском сайте нет: проверены r3q, s3q, side,
// rear, front, f34, r34, top – все отвечают 404. Поэтому снаружи один
// кадр на цвет, внутри один кадр салона.
//
// Образцы цвета, диска и салона вырезаны из этих же рендеров, а не
// подобраны на глаз: цвет на образце ровно тот, что на машине.
//
// Цены – китайские розничные за голую машину, в юанях, по базе
// carnewschina (данные на 2026 год). Взяты только две версии, у которых
// цена названа точно: 229 800 ¥ за RWD и 269 800 ¥ за Performance AWD.
// Средняя версия Long Range у источника есть, но её цену он не называет –
// придумывать не стали, в примечании сказано, что считаем по запросу.

export type TrimId = 'rwd' | 'performance';
export type Avail = Record<TrimId, number | null>;
export interface Option { id: string; name: string; note?: string; avail: Avail }
export interface ConfigTrim { id: TrimId; name: string; priceCny: number; rows: { label: string; value: string }[] }

const free: Avail = { rwd: 0, performance: 0 };
const opt = (dir: string, id: string) => `/img/zeekr-7x/${dir}/${id}.webp`;

export const configTrims: ConfigTrim[] = [
  {
    id: 'rwd',
    name: '7X RWD',
    priceCny: 229800,
    rows: [
      { label: 'Привод', value: 'Задний, один мотор' },
      { label: 'Батарея', value: '75 кВт·ч' },
      { label: 'Запас хода', value: '480 км по европейскому циклу WLTP' },
    ],
  },
  {
    id: 'performance',
    name: '7X Performance AWD',
    priceCny: 269800,
    rows: [
      { label: 'Привод', value: 'Полный, два мотора' },
      { label: 'Мощность', value: '475 кВт – это около 645 л.с., 710 Н·м' },
      { label: 'Разгон 0–100', value: '3,8 с' },
      { label: 'Батарея', value: '103 кВт·ч' },
      { label: 'Запас хода', value: '543 км по циклу WLTP' },
    ],
  },
];

export const commonSpecs = [
  { label: 'Тип', value: 'Электромобиль' },
  { label: 'Диски', value: '21 дюйм' },
  { label: 'Кузов', value: 'Кроссовер, 5 мест' },
  { label: 'Платформа', value: 'SEA – общая платформа электромобилей Geely' },
];

export const paints: (Option & { swatch: string })[] = [
  ['crystal-white', 'Кристальный белый', 'без доплаты'],
  ['forest-green', 'Лесной зелёный', 'без доплаты'],
  ['onyx-black', 'Чёрный оникс', 'без доплаты'],
  ['tech-grey', 'Техно-серый', 'без доплаты'],
].map(([id, name, note]) => ({
  id, name, note, avail: free, swatch: opt('options', `paint-${id}`),
}));

export const wheels: (Option & { image: string })[] = [
  { id: '21-aero', name: '21″ аэродинамические', note: 'на всех версиях', avail: free },
].map((w) => ({ ...w, image: opt('options', `wheel-${w.id}`) }));

export const interiors: (Option & { swatch: string })[] = [
  { id: 'leather', name: 'Кожа, тёмная', avail: free },
].map((t) => ({ ...t, swatch: opt('options', `trim-${t.id}`) }));

export const shots = [
  { id: 'f3q', label: 'Снаружи', kind: 'exterior' },
  { id: 'side', label: 'Салон', kind: 'interior' },
] as const;

export const renderPaths = {
  exterior: '/img/zeekr-7x/render/{paint}.webp',
  interior: '/img/zeekr-7x/render/int-{interior}.webp',
};

export const zeekr7xConfig = {
  path: '/catalog/zeekr/7x/konfigurator/',
  h1: 'Конфигуратор Zeekr 7X',
  lead:
    'Выберите цвет – машина на кадре меняется. Цены показаны китайские, за голую машину; ' +
    'под ключ в Минске считаем отдельно с доставкой, оформлением и документами.',
  seoTitle: 'Конфигуратор Zeekr 7X: цвета, версии и цена под ключ в Минске | Evolution Car',
  seoDescription:
    'Zeekr 7X в четырёх цветах и двух версиях: задний привод на 480 км и полный на 645 л.с. ' +
    'Соберите свою и получите расчёт привоза в Беларусь под ключ.',
  cardLink: { href: '/catalog/zeekr/7x/', label: 'Всё о Zeekr 7X' },
  ui: {
    trimTitle: 'Версия',
    paintTitle: 'Цвет кузова',
    wheelTitle: 'Диски',
    interiorTitle: 'Салон',
    commonTitle: 'У обеих версий',
    summaryTitle: 'Ваш новый Zeekr 7X',
    chinaPrice: 'Цена Zeekr в Китае',
    turnkey: 'Под ключ в Минске – рассчитаем под вашу конфигурацию',
    included: 'входит',
    unavailable: 'не для этой версии',
    switched: 'Этот вариант есть только у версии',
    formTitle: 'Получить расчёт под ключ',
    prev: 'Предыдущий кадр',
    next: 'Следующий кадр',
    stageLabel: 'Zeekr 7X',
    viewLabel: 'Вид',
    altPaint: 'Zeekr 7X, цвет',
    altInterior: 'Салон Zeekr 7X',
    wheelsWord: 'диски',
    interiorWord: 'салон',
    leadSource: 'Конфигуратор 7X',
    photoNote:
      'Кадры – официальные рендеры Zeekr с европейского сайта марки. Версия Long Range с ' +
      'батареей 103 кВт·ч и задним приводом тоже существует – её цену называем при расчёте.',
  },
};
