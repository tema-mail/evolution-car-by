// Список собранных конфигураторов – для страницы-хаба и перелинковки.
// Обложка – рендер из самого конфигуратора, чтобы не держать отдельные картинки.

export interface ConfiguratorCard {
  slug: string;
  brand: string;
  model: string;
  href: string;
  cover: string;
  powertrain: string;
  priceFromCny: number;
  options: string;
  summary: string;
}

export const configurators: ConfiguratorCard[] = [
  {
    slug: 'lixiang-l6', brand: 'Lixiang', model: 'Новый L6',
    href: '/catalog/lixiang/l6/konfigurator/',
    cover: '/img/lixiang-l6/render/meteor-grey--20-black--front.webp',
    powertrain: 'Гибрид EREV', priceFromCny: 249800,
    options: '3 цвета, 4 варианта дисков, 3 салона',
    summary: 'Кроссовер на каждый день: электромотор с бензиновым генератором, запас хода больше 1000 км.',
  },
  {
    slug: 'lixiang-l8', brand: 'Lixiang', model: 'Новый L8',
    href: '/catalog/lixiang/l8/konfigurator/',
    cover: '/img/lixiang-l8/render/ultra--gt-silver--21-black--front.webp',
    powertrain: 'Гибрид EREV', priceFromCny: 369800,
    options: '10 цветов, 5 вариантов дисков, 4 салона',
    summary: 'Шестиместный SUV с версиями Ultra и Livis: двухцветный кузов, пневма, рулевое по проводам.',
  },
  {
    slug: 'lixiang-l9', brand: 'Lixiang', model: 'Новый L9',
    href: '/catalog/lixiang/l9/konfigurator/',
    cover: '/img/lixiang-l9/render/pearl-white--21-black--front.webp',
    powertrain: 'Гибрид EREV', priceFromCny: 459800,
    options: '11 цветов, 4 варианта дисков, 4 салона',
    summary: 'Флагманский шестиместный SUV: 1650 км суммарного хода, пневмоподвеска третьего поколения.',
  },
  {
    slug: 'lixiang-i8', brand: 'Lixiang', model: 'i8',
    href: '/catalog/lixiang/i8/konfigurator/',
    cover: '/img/lixiang-i8/render/awd--pearl-white--20-aero--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 309800,
    options: '4 цвета, 2 варианта дисков, 2 салона',
    summary: 'Электрический SUV с полным или задним приводом и запасом хода до 780 км.',
  },
  {
    slug: 'lixiang-i9', brand: 'Lixiang', model: 'Новый i9',
    href: '/catalog/lixiang/i9/konfigurator/',
    cover: '/img/lixiang-i9/render/solo--pearl-white--21-aero--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 369800,
    options: '8 цветов, 3 варианта дисков, 2 салона',
    summary: 'Большой электрический SUV: батарея 101 кВт·ч, четыре кресла «нулевой гравитации».',
  },
  {
    slug: 'lixiang-mega', brand: 'Lixiang', model: 'Новый MEGA',
    href: '/catalog/lixiang/mega/konfigurator/',
    cover: '/img/lixiang-mega/render/solo--panda-white--18-aero--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 509800,
    options: '5 цветов, 3 варианта дисков, 2 салона',
    summary: 'Минивэн-гостиная: батарея 108 кВт·ч, вращающиеся кресла, активное шасси 800 В.',
  },
  {
    slug: 'avatr-12', brand: 'Avatr', model: '12',
    href: '/catalog/avatr/12/konfigurator/',
    cover: '/img/avatr-12/render/cloud-purple--21-beam--front.webp',
    powertrain: 'Гибрид с генератором', priceFromCny: 293900,
    options: '5 цветов, 2 варианта дисков, 4 салона',
    summary: 'Лифтбек Changan, Huawei и CATL: 1260 км хода, лидар, звук Bowers & Wilkins.',
  },
  {
    slug: 'voyah-dreamer', brand: 'Voyah', model: 'Dreamer 9',
    href: '/catalog/voyah/dreamer/konfigurator/',
    cover: '/img/voyah-dreamer/render/gold-red--21-starlight--front.webp',
    powertrain: 'Гибрид, платформа 800 В', priceFromCny: 419900,
    options: '5 цветов, 2 варианта дисков, 2 салона',
    summary: 'Минивэн Dongfeng: кресла «нулевой гравитации», потолочный экран, холодильник.',
  },
  {
    slug: 'xiaomi-su7', brand: 'Xiaomi', model: 'SU7',
    href: '/catalog/xiaomi/su7/konfigurator/',
    cover: '/img/xiaomi-su7/render/capri-blue--19-diamond--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 219900,
    options: '7 цветов, 4 варианта дисков, 4 салона',
    summary: 'Электрический седан: версии SU7, Pro и Max, до 902 км хода и до 690 л. с.',
  },
  {
    slug: 'xiaomi-su7-ultra', brand: 'Xiaomi', model: 'SU7 Ultra',
    href: '/catalog/xiaomi/su7-ultra/konfigurator/',
    cover: '/img/xiaomi-su7-ultra/render/carbon--lightning-yellow--forged-neodymium--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 529900,
    options: '5 цветов, 4 варианта дисков, карбон-пакет, 3 салона',
    summary: 'Трековый флагман: 1548 л. с., разгон до сотни за 2 секунды, карбон-керамика.',
  },
  {
    slug: 'xiaomi-n70', brand: 'Xiaomi', model: 'N70',
    href: '/catalog/xiaomi/n70/konfigurator/',
    cover: '/img/xiaomi-n70/render/butterfly-blue--19-blade--front.webp',
    powertrain: 'Гибрид с генератором', priceFromCny: 209900,
    options: '6 цветов, 4 варианта дисков, 3 салона',
    summary: 'Пятиместный кроссовер серии Kunlun: 1351 км хода, салон из кожи Nappa.',
  },
  {
    slug: 'xiaomi-n90', brand: 'Xiaomi', model: 'N90',
    href: '/catalog/xiaomi/n90/konfigurator/',
    cover: '/img/xiaomi-n90/render/wine-red--21-star--front.webp',
    powertrain: 'Гибрид с генератором', priceFromCny: 269900,
    options: '6 цветов, 4 варианта дисков, 3 салона',
    summary: 'Семиместный флагман серии Kunlun: 1705 км хода, полный привод, пневма.',
  },
  {
    slug: 'xiaomi-yu7', brand: 'Xiaomi', model: 'YU7',
    href: '/catalog/xiaomi/yu7/konfigurator/',
    cover: '/img/xiaomi-yu7/render/titanium--19-diamond--front.webp',
    powertrain: 'Электромобиль', priceFromCny: 233500,
    options: '6 цветов, 2 варианта дисков, 3 салона',
    summary: 'Электрический кроссовер: четыре версии, до 835 км хода и разгон от 3,23 с.',
  },
  {
    slug: 'zeekr-7x', brand: 'Zeekr', model: '7X',
    href: '/catalog/zeekr/7x/konfigurator/',
    cover: '/img/zeekr-7x/render/forest-green.webp',
    powertrain: 'Электромобиль', priceFromCny: 229800,
    options: '4 цвета, 2 версии',
    summary: 'Кроссовер на платформе SEA: задний привод на 480 км или полный на 645 л.с. и 3,8 с до сотни.',
  },
  {
    // Единственный в списке подбор без выбора цвета и дисков: китайский сайт
    // заказа Zeekr нам не отвечает, а на глобальном 9X нет вообще. Поэтому
    // здесь выбирается версия, а обложка – фото карточки, не рендер сборки.
    slug: 'zeekr-9x', brand: 'Zeekr', model: '9X',
    href: '/catalog/zeekr/9x/konfigurator/',
    cover: '/img/cars/zeekr-9x.jpg',
    powertrain: 'Гибрид с подзарядкой', priceFromCny: 465900,
    options: '3 версии: батарея, ассистенты и салон',
    summary: 'Флагманский SUV: три мотора на 1380 л.с., архитектура 900 В, до 380 км на электричестве.',
  },
];


export const cny = (v: number) => `${v.toLocaleString('ru-RU')} ¥`;
