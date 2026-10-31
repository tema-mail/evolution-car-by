# -*- coding: utf-8 -*-
"""Контент-план блога evolutioncar.by на ноябрь 2026.

Спрос берём из docs/seo-migration/karta-migracii.csv – это выгрузка Search
Console по сайту за квартал (283 адреса, 297 229 показов, 5 253 клика).
Где показы по теме не замерены, в плане стоит «замерить» – нулями не
подменяем: Wordstat по Беларуси снимается отдельно, регион 149.

Блога на сайте пока нет, каталог закрывает «характеристики» и «купить» по
моделям. Поэтому блог берёт другой интент: деньги и растаможка, выбор между
моделями, жизнь с машиной в Беларуси, процесс пригона. Карточки не дублируем.
"""
import csv, pathlib, datetime as dt

ROOT = pathlib.Path('/Users/artemgalimov/Documents/evolution-car-by')

# --- спрос из Search Console ------------------------------------------------
sp = {}
for r in csv.DictReader(open(ROOT / 'docs/seo-migration/karta-migracii.csv', encoding='utf-8')):
    t = (r['target'] or r['old']).strip()
    try: imp = int(float(r['impressions'] or 0))
    except ValueError: imp = 0
    q = (r['top_queries'] or '').split(';')[0].strip()
    if t and imp > sp.get(t, (0, ''))[0]:
        sp[t] = (imp, q)

def demand(page):
    """Показы и главный запрос страницы каталога, к которой статья ведёт."""
    return sp.get(page, (None, ''))

# --- темы -------------------------------------------------------------------
# (направление, заголовок, slug, главный запрос, соседние, цель, ведёт на, призыв)
T = []

def add(napr, zag, slug, q, sosed, cel, vedet, prizyv):
    T.append((napr, zag, slug, q, sosed, cel, vedet, prizyv))

CALC = 'Посчитаем итоговую цену вашей машины «под ключ» – с доставкой, пошлиной и постановкой на учёт'
PICK = 'Подберём модель под ваш бюджет и привезём – расчёт бесплатный'
SERV = 'Привозим и ставим на учёт под ключ, сервис в Минске не бросаем после продажи'

# 1. Деньги и растаможка (25) – свой интент, в карточках этого нет
money = [
 ('Сколько реально стоит привезти авто из Китая в Беларусь в 2026 году','how-much-china-import','растаможка авто из китая'),
 ('Растаможка электромобиля в Беларуси: сколько платить в 2026 году','ev-customs-belarus','растаможка электромобиля'),
 ('Утильсбор в Беларуси: кто платит, сколько и когда','utilization-fee-belarus','утильсбор беларусь'),
 ('Пошлина на авто в Беларуси: как считается и от чего зависит','import-duty-belarus','пошлина на авто беларусь'),
 ('НДС при ввозе автомобиля в Беларусь: когда платится и сколько','vat-car-import','ндс при ввозе авто'),
 ('Цена в Китае и цена в Минске: из чего складывается разница','china-price-vs-minsk','цена авто из китая'),
 ('Авто из Китая под заказ: полная смета с доставкой и таможней','china-order-full-cost','авто из китая под заказ'),
 ('Растаможка из Кореи в Беларусь: расчёт и подводные камни','korea-customs-belarus','растаможка из кореи'),
 ('Сколько стоит привезти машину из США в Беларусь','usa-import-cost','авто из сша в беларусь'),
 ('Авто из Европы в Беларусь: пошлины, возраст, экология','europe-import-rules','авто из европы беларусь'),
 ('Электромобиль без пошлины в Беларуси: до какого года действует льгота','ev-duty-exemption','льгота на электромобили'),
 ('Можно ли сэкономить на растаможке законно: что реально работает','legal-customs-saving','как сэкономить на растаможке'),
 ('Зачем нужен договор при пригоне авто и что в нём проверить','import-contract-check','договор на пригон авто'),
 ('Предоплата за пригон: сколько нормально и за что платят','import-prepayment','предоплата за авто из китая'),
 ('Авто в рассрочку и лизинг в Беларуси на пригнанную машину','leasing-imported-car','авто в лизинг беларусь'),
 ('Сколько стоит доставка авто из Китая морем и по железной дороге','china-delivery-cost','доставка авто из китая'),
 ('Страховка на пригнанный автомобиль в Беларуси: что оформлять','insurance-imported-car','страховка на авто беларусь'),
 ('Постановка на учёт в Беларуси после пригона: документы и сроки','registration-after-import','постановка на учет авто'),
 ('Сертификация и СБКТС для ввезённого авто: зачем и сколько стоит','sbkts-certification','сбктс беларусь'),
 ('Дешевле ли привезти самому, чем через компанию: честный расчёт','self-import-vs-company','привезти авто самому'),
 ('Почему цена «от» в объявлениях не равна той, что вы заплатите','real-price-vs-ad','цена авто под заказ'),
 ('Курс юаня и цена машины: как колебания бьют по бюджету','yuan-rate-car-price','курс юаня авто'),
 ('Гибрид или бензин: что выгоднее по деньгам за три года в Беларуси','hybrid-vs-petrol-cost','что выгоднее гибрид или бензин'),
 ('Электромобиль против бензина: реальная экономия в Минске','ev-vs-petrol-savings','экономия на электромобиле'),
 ('Сколько теряет в цене пригнанный китаец за первый год','chinese-car-depreciation','китайские авто цена'),
]
for zag, slug, q in money:
    add('Деньги', zag, slug, q, '', 'заявки', '/dostavka-i-rastamozhka/', CALC)

# 2. Выбор и сравнения (35) – на реальном спросе топовых моделей
VS = [
 ('Lixiang L9 или Denza D9: что брать семье на семь мест','lixiang-l9-vs-denza-d9','/catalog/lixiang/l9/','/catalog/denza/d9/'),
 ('Zeekr 009 или Denza D9: сравниваем премиальные минивэны','zeekr-009-vs-denza-d9','/catalog/zeekr/009/','/catalog/denza/d9/'),
 ('BYD Han или Tesla Model 3: что выбрать в Минске','byd-han-vs-tesla-model-3','/catalog/byd/han/','/catalog/tesla/model-3/'),
 ('Geely Preface или Hyundai Elantra: седан за те же деньги','geely-preface-vs-hyundai-elantra','/catalog/geely/preface/','/catalog/hyundai/elantra/'),
 ('Avatr 11 или HiPhi Z: два взгляда на премиум-электро','avatr-11-vs-hiphi-z','/catalog/avatr/11/','/catalog/hiphi/z/'),
 ('Lixiang L7 или Lixiang L9: стоит ли платить за старшую','lixiang-l7-vs-l9','/catalog/lixiang/l7/','/catalog/lixiang/l9/'),
 ('Voyah Free или Voyah Passion: чем отличаются и что брать','voyah-free-vs-passion','/catalog/voyah/free/','/catalog/voyah/passion/'),
 ('Geely Coolray или Geely Monjaro: какой кроссовер под город','geely-coolray-vs-monjaro','/catalog/geely/coolray/','/catalog/geely/monjaro/'),
 ('Tesla Model Y или Zeekr X: компактный электрокроссовер','tesla-model-y-vs-zeekr-x','/catalog/tesla/model-y/','/catalog/zeekr/x/'),
 ('BYD Dolphin или BYD Qin Plus: что взять первым электромобилем','byd-dolphin-vs-qin-plus','/catalog/byd/dolphin/','/catalog/byd/qin-plus-ev/'),
 ('Lynk & Co 08 или Lynk & Co 09: разница, которая стоит денег','lynk-co-08-vs-09','/catalog/lynk-co/08/','/catalog/lynk-co/900-lynk-co-09/'),
 ('Nissan X-Trail e-Power или Toyota bZ4X: гибрид против электро','x-trail-epower-vs-bz4x','/catalog/nissan/x-trail-e-power-top/','/catalog/toyota/bz4x/'),
 ('Denza Z9 GT или Zeekr 9X: флагманы, которые везут в Минск','denza-z9gt-vs-zeekr-9x','/catalog/denza/z9-gt/','/catalog/zeekr/9x/'),
 ('Avatr 12 или Avatr 11: седан или кроссовер за одни деньги','avatr-12-vs-11','/catalog/avatr/12/','/catalog/avatr/11/'),
 ('Deepal S07 или Changan UNI-V: что берут в Беларуси чаще','deepal-s07-vs-uni-v','/catalog/deepal/s07/','/catalog/changan/uni-v/'),
 ('GAC Aion Y или BYD Song Plus: семейный электрокроссовер','aion-y-vs-song-plus','/catalog/gac/aion-y/','/catalog/byd/song-plus-ev/'),
 ('Hongqi H9 или Genesis G90: представительский класс из Азии','hongqi-h9-vs-genesis-g90','/catalog/hongqi/h9/','/catalog/hongqi/h9/'),
 ('Volkswagen ID.6 Crozz или Nissan Ariya: электро для семьи','id6-vs-ariya','/catalog/volkswagen/id6-crozz/','/catalog/nissan/aryia/'),
 ('Lixiang L6 или Lixiang L8: какой размер нужен вам','lixiang-l6-vs-l8','/catalog/lixiang/l6/','/catalog/lixiang/l8/'),
 ('AITO M9 или Lixiang L9: битва больших гибридов','aito-m9-vs-lixiang-l9','/catalog/aito/m9/','/catalog/lixiang/l9/'),
 ('BYD Han L EV или BYD Han: что изменилось в новой версии','byd-han-l-vs-han','/catalog/byd/han-l-ev/','/catalog/byd/han/'),
 ('FAW Bestune NAT или GAC Aion Y: машина под такси','bestune-nat-vs-aion-y','/catalog/faw/bestune-nat/','/catalog/gac/aion-y/'),
 ('Geely Boyue L или Geely Monjaro: какой Geely взять в 2026','boyue-l-vs-monjaro','/catalog/geely/boyue-l/','/catalog/geely/monjaro/'),
 ('Lynk & Co 05 или Lynk & Co 08: купе-кроссовер или практичность','lynk-co-05-vs-08','/catalog/lynk-co/05/','/catalog/lynk-co/08/'),
 ('Семь мест за разумные деньги: четыре модели, которые везём чаще всего','seven-seats-best-value','/catalog/','/catalog/'),
 ('Электромобиль до 30 тысяч долларов: что реально можно привезти','ev-under-30k','/catalog/elektromobili/','/catalog/elektromobili/'),
 ('Гибрид с запасом хода от 1000 км: какие бывают и чем отличаются','hybrids-1000km-range','/catalog/gibridy/','/catalog/gibridy/'),
 ('Первая машина из Китая: три модели, с которыми не ошибётесь','first-chinese-car','/catalog/','/catalog/'),
 ('Машина для такси в Минске: что выгодно по расходу и ресурсу','car-for-taxi-minsk','/dlya-taksoparkov/','/dlya-taksoparkov/'),
 ('Авто для бизнеса: что берут компании в Беларуси','car-for-business','/dlya-biznesa/','/dlya-biznesa/'),
 ('Полный привод из Китая: какие модели реально едут по снегу','awd-chinese-cars','/catalog/','/catalog/'),
 ('Кроссовер или минивэн для семьи из пяти человек','crossover-vs-minivan-family','/catalog/','/catalog/'),
 ('Премиум из Китая против немецкого премиума: честное сравнение','chinese-vs-german-premium','/catalog/','/catalog/'),
 ('Что брать под прицеп: модели с нормальной буксировкой','cars-for-towing','/catalog/','/catalog/'),
 ('Самые надёжные китайские марки по опыту наших клиентов','most-reliable-chinese-brands','/catalog/','/catalog/'),
]
for zag, slug, page, second in VS:
    imp, q = demand(page)
    add('Выбор', zag, slug, q or 'сравнение моделей',
        f'спрос страницы {page}: {imp} показов/квартал' if imp else '',
        'заявки', page, PICK)

# 3. Электромобили в Беларуси (25)
ev = [
 ('Запас хода зимой в Минске: сколько реально теряет электромобиль','ev-winter-range-minsk','запас хода зимой'),
 ('Где заряжать электромобиль в Беларуси: сети и реальная доступность','ev-charging-belarus','зарядка электромобиля беларусь'),
 ('Зарядка дома в Минске: что нужно и сколько стоит','home-charging-minsk','зарядка электромобиля дома'),
 ('Сколько стоит проехать 100 км на электромобиле в Беларуси','ev-cost-per-100km','расход электромобиля'),
 ('Батарея электромобиля: сколько живёт и что с ней будет через 5 лет','ev-battery-life','батарея электромобиля срок'),
 ('Как проверить состояние батареи перед покупкой','check-ev-battery','проверка батареи электромобиля'),
 ('Электромобиль в мороз −20: что делать и чего не делать','ev-in-cold','электромобиль в мороз'),
 ('Обслуживание электромобиля в Беларуси: что меняется и как часто','ev-maintenance-belarus','обслуживание электромобиля'),
 ('Ремонт электромобиля в Минске: кто умеет и сколько стоит','ev-repair-minsk','ремонт электромобиля минск'),
 ('Гибрид в Беларуси: когда он выгоднее электромобиля','hybrid-better-than-ev','гибрид или электромобиль'),
 ('Что такое EREV и чем он отличается от обычного гибрида','what-is-erev','erev что это'),
 ('Электромобиль на даче и в деревне: где заряжаться вне города','ev-outside-city','зарядка вне города'),
 ('Шины для электромобиля: нужны ли особые','ev-tires','шины для электромобиля'),
 ('Запчасти на китайские электромобили в Беларуси: есть или нет','ev-parts-belarus','запчасти китайские авто'),
 ('Гарантия на батарею: что реально покрывается','battery-warranty','гарантия на батарею'),
 ('Электромобиль с пробегом из Китая: на что смотреть','used-ev-from-china','электромобиль с пробегом'),
 ('Сколько электромобилей в Беларуси и почему их становится больше','ev-market-belarus','электромобили беларусь'),
 ('Можно ли ездить на электромобиле зимой без прогрева','ev-winter-no-warmup','электромобиль зимой'),
 ('Тепловой насос в электромобиле: зачем он нужен в наших зимах','heat-pump-ev','тепловой насос электромобиль'),
 ('800 вольт против 400: что даёт быстрая архитектура на практике','800v-vs-400v','800 вольт зарядка'),
 ('Автопилот в китайских электромобилях: что работает в Беларуси','autopilot-chinese-cars','автопилот китайские авто'),
 ('Русификация китайского автомобиля: что меняется и что останется','russification-chinese-car','русификация китайского авто'),
 ('CarPlay и Android Auto в китайских машинах: есть или нет','carplay-chinese-cars','carplay китайские авто'),
 ('Электромобиль для женщины: что берут чаще и почему','ev-for-women','электромобиль для женщины'),
 ('Первый месяц с электромобилем: к чему готовиться','first-month-with-ev','первый электромобиль'),
]
for zag, slug, q in ev:
    add('Электро', zag, slug, q, '', 'показы', '/catalog/elektromobili/', SERV)

# 4. Процесс пригона (15)
proc = [
 ('Как проходит пригон авто из Китая: все этапы по дням','import-process-steps','как привезти авто из китая'),
 ('Сколько ждать машину из Китая: реальные сроки в 2026 году','china-delivery-time','сроки доставки авто из китая'),
 ('Какие документы нужны, чтобы привезти авто в Беларусь','import-documents','документы для ввоза авто'),
 ('Как мы проверяем машину в Китае до покупки','car-inspection-china','проверка авто в китае'),
 ('Что делать, если машина пришла с повреждением','damaged-on-delivery','повреждение при доставке'),
 ('Можно ли выбрать конкретную комплектацию и цвет','choose-trim-and-color','комплектация под заказ'),
 ('Авто в наличии или под заказ: что выбрать и чем отличается','in-stock-vs-order','авто под заказ или в наличии'),
 ('Как не попасть на мошенников при пригоне авто','avoid-import-scams','мошенники пригон авто'),
 ('Что такое аукционный лист и как его читать','auction-sheet-explained','аукционный лист'),
 ('Можно ли вернуть машину, если она не понравилась','can-i-return-car','возврат автомобиля'),
 ('Гарантия на пригнанное авто: что даём мы и что завод','warranty-imported-car','гарантия на авто из китая'),
 ('Доставка авто до вашего города в Беларуси','delivery-to-your-city','доставка авто по беларуси'),
 ('Как проверить историю китайского автомобиля','check-chinese-car-history','история китайского авто'),
 ('Трейд-ин при покупке пригнанной машины','trade-in-imported-car','трейд ин беларусь'),
 ('Почему машина из Китая дешевле, чем у дилера в Минске','why-china-cheaper','почему дешевле из китая'),
]
for zag, slug, q in proc:
    add('Процесс', zag, slug, q, '', 'заявки', '/dostavka-i-rastamozhka/', CALC)

# 5. Страны привоза (15)
countries = [
 ('Китай, Корея, США или Европа: откуда выгоднее везти в 2026','where-to-import-from','откуда везти авто','/china/'),
 ('Авто из Китая: плюсы, минусы и что стоит знать заранее','cars-from-china','авто из китая','/china/'),
 ('Авто из Кореи: чем корейский рынок отличается от китайского','cars-from-korea','авто из кореи','/korea/'),
 ('Авто из США: какие машины везти стоит, а какие нет','cars-from-usa','авто из сша','/usa/'),
 ('Авто из Европы в Беларусь: что изменилось и что можно','cars-from-europe','авто из европы','/europa/'),
 ('Авто из Японии: когда японский рынок действительно выгоден','cars-from-japan','авто из японии','/japan/'),
 ('Правый руль из Японии: стоит ли связываться в Беларуси','rhd-from-japan','правый руль беларусь','/japan/'),
 ('Электромобиль из Китая или из Европы: где дешевле','ev-china-vs-europe','электромобиль из китая','/china/'),
 ('Корейские гибриды: что берут в Беларуси','korean-hybrids','корейские гибриды','/korea/'),
 ('Американские пикапы в Беларуси: реально ли и сколько стоит','us-pickups-belarus','пикап из сша','/usa/'),
 ('Немецкий премиум из Европы: сколько стоит привезти','german-premium-import','бмв из европы','/europa/'),
 ('Что нельзя ввезти в Беларусь: ограничения по возрасту и экологии','import-restrictions','ограничения на ввоз авто','/dostavka-i-rastamozhka/'),
 ('Авто из Китая с пробегом: стоит ли брать','used-cars-from-china','авто с пробегом из китая','/china/'),
 ('Новая машина из Китая: что значит «нулевой пробег»','new-car-zero-mileage','новое авто из китая','/china/'),
 ('Сравнение рынков: где какая экономия на одной и той же модели','markets-price-comparison','где дешевле авто','/catalog/'),
]
for zag, slug, q, page in countries:
    add('Страны', zag, slug, q, '', 'показы', page, PICK)

# 6. Эксплуатация в Беларуси (20)
usage = [
 ('Обслуживание китайского авто в Минске: кто берёт на сервис','service-chinese-car-minsk','сервис китайских авто минск'),
 ('Запчасти на китайские машины: сроки и цены в Беларуси','chinese-car-parts','запчасти на китайские авто'),
 ('Первое ТО пригнанной машины: когда и что делать','first-service-imported','первое то'),
 ('Масло и расходники для китайского двигателя','oil-for-chinese-engine','масло для китайского авто'),
 ('Китайская машина зимой в Беларуси: к чему готовиться','chinese-car-winter','китайские авто зимой'),
 ('Кузов и коррозия: как ведут себя китайцы через три года','chinese-car-rust','коррозия китайских авто'),
 ('Электроника в китайских авто: типичные болячки','chinese-car-electronics','проблемы китайских авто'),
 ('Подвеска под наши дороги: что усиливать сразу','suspension-for-roads','подвеска китайских авто'),
 ('Прошивка и обновления: как обновлять китайскую машину','firmware-updates','обновление по автомобиля'),
 ('Как продать китайский автомобиль в Беларуси','sell-chinese-car','продать китайский авто'),
 ('Сколько стоит владеть китайским кроссовером год','cost-of-ownership','стоимость владения авто'),
 ('Каско на китайский автомобиль: берут ли страховые','kasko-chinese-car','каско на китайское авто'),
 ('Шумоизоляция китайского авто: нужна ли и сколько стоит','soundproofing-chinese-car','шумоизоляция авто'),
 ('Защита кузова и салона на новой машине','body-protection-new-car','защита кузова авто'),
 ('Зимние шины на китайский кроссовер: какие размеры искать','winter-tires-chinese-suv','зимние шины кроссовер'),
 ('Что ломается в гибридах чаще всего','hybrid-common-issues','поломки гибридов'),
 ('Можно ли ездить на китайце в Европу: нюансы','chinese-car-to-europe','поездка в европу на авто'),
 ('Диагностика китайского автомобиля: какое оборудование нужно','chinese-car-diagnostics','диагностика китайских авто'),
 ('Аксессуары, которые ставят сразу после пригона','accessories-after-import','аксессуары для авто'),
 ('Как ухаживать за кожаным салоном китайской машины','leather-interior-care','уход за салоном'),
]
for zag, slug, q in usage:
    add('Эксплуатация', zag, slug, q, '', 'показы', '/servis/', SERV)

# 7. Обзоры моделей с подтверждённым спросом (15)
rev = [
 ('Lixiang L9 в 2026 году: стоит ли брать и для кого он','/catalog/lixiang/l9/','lixiang-l9-review'),
 ('Geely Preface: честный обзор седана, который берут чаще всего','/catalog/geely/preface/','geely-preface-review'),
 ('BYD Qin Plus EV: разбираем бюджетный электроседан','/catalog/byd/qin-plus-ev/','byd-qin-plus-review'),
 ('Hyundai Elantra: почему её ищут в Минске','/catalog/hyundai/elantra/','hyundai-elantra-review'),
 ('Geely Coolray: что получаешь за свои деньги','/catalog/geely/coolray/','geely-coolray-review'),
 ('BYD Han: флагманский седан BYD в деталях','/catalog/byd/han/','byd-han-review'),
 ('Deepal S07: что это за машина и чем интересна','/catalog/deepal/s07/','deepal-s07-review'),
 ('Nissan X-Trail e-Power: гибрид, который не надо заряжать','/catalog/nissan/x-trail-e-power-top/','x-trail-epower-review'),
 ('Avatr 11: премиум-электро, о котором мало знают','/catalog/avatr/11/','avatr-11-review'),
 ('HiPhi Z: машина, которая выглядит как концепт','/catalog/hiphi/z/','hiphi-z-review'),
 ('Voyah Free: гибрид и электро в одном кузове','/catalog/voyah/free/','voyah-free-review'),
 ('Zeekr 009: минивэн, который меняет представление о классе','/catalog/zeekr/009/','zeekr-009-review'),
 ('Denza D9: почему его берут семьи и бизнес','/catalog/denza/d9/','denza-d9-review'),
 ('BYD Dolphin: городской электромобиль за разумные деньги','/catalog/byd/dolphin/','byd-dolphin-review'),
 ('Tesla Model 3 в Беларуси: стоит ли везти в 2026','/catalog/tesla/model-3/','tesla-model-3-review'),
]
for zag, page, slug in rev:
    imp, q = demand(page)
    add('Обзоры', zag, slug, q or 'обзор модели',
        f'спрос страницы {page}: {imp} показов/квартал' if imp else '',
        'заявки', page, PICK)

# --- раскладка по дням: 5 в день, направления перемешаны -------------------
order = []
buckets = {}
for t in T: buckets.setdefault(t[0], []).append(t)
# в каждый день – разные направления, чтобы блог не выглядел пачкой однотипного
seq = ['Деньги','Выбор','Электро','Эксплуатация','Выбор','Процесс','Обзоры','Страны',
       'Деньги','Выбор','Электро','Эксплуатация','Обзоры','Выбор','Процесс']
i = 0
while sum(len(v) for v in buckets.values()):
    napr = seq[i % len(seq)]; i += 1
    if buckets.get(napr): order.append(buckets[napr].pop(0))
    else:
        for k in buckets:
            if buckets[k]: order.append(buckets[k].pop(0)); break

start = dt.date(2026, 11, 1)
out = ROOT / 'docs/plan-blog-2026-11.csv'
with open(out, 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['дата','площадка','№','направление','заголовок','адрес','главный запрос',
                'спрос','соседние запросы','цель','ведёт на','призыв'])
    for n, (napr, zag, slug, q, sosed, cel, vedet, prizyv) in enumerate(order, 1):
        day = start + dt.timedelta(days=(n - 1) // 5)
        if day.month != 11: break
        w.writerow([day.isoformat(), 'сайт', n, napr, zag, f'/blog/{slug}', q,
                    sosed or 'замерить', sosed, cel, vedet, prizyv])
print('план:', out)
print('материалов:', len(order))
