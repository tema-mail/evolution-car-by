# Адреса из индекса Яндекса, отдававшие 404 – снято 28.10.2026

## Откуда список

Выгрузка страниц в поиске Яндекс.Вебмастера по хосту `https:evolutioncar.by:443`
(API v4, `search-urls/in-search/samples`, срез обхода 07–08.10.2026 – выгрузка
Вебмастера в этот день заморозилась и после 08.10 данных не отдаёт).
Получено 220 адресов, уникальных 215. Каждый проверен запросом к живому сайту
28.10.2026 после переключения домена на наш VPS.

## Результат проверки 215 адресов

| Ответ сайта | Адресов |
|---|---|
| 301 (редирект доходит до 200) | 152 |
| 200 (своя страница) | 2 – `/`, `/lixiangl9` |
| **404** | **61** |

Из 61 адреса с 404 два несли поисковый трафик Google и закрыты отдельными
страницами: `/avto-iz-yaponii` → `/japan/`, `/garanty2` → `/servis/`.
Ещё один, `/garanty-41296`, – дубль той же служебной страницы.

Остальные 58 трафика не несли (0 кликов в Google за 28 дней), но лежали
в индексе Яндекса, поэтому получили правила 301 в карте миграции:

| Группа | Адресов | Куда ведут |
|---|---|---|
| карточки Tilda Store `/tproduct/*` | 34 | карточка товара, а где модели нет – страница марки |
| марки заглавными: `/AITO`, `/LOTUS`, `/NISSAN`, `/TESLA`, `/TOYOTA`, `/VOLKSWAGEN` | 6 | `/catalog/<марка>/` |
| дубли Tilda с цифрами: `/byd-16334`, `/geely-68237`, `/zeekr-58249` и др. | 16 | `/catalog/<марка>/` |
| модели одним словом: `/HyndaiElantra2024`, `/LixiangMega` | 2 | карточка модели |

Три адреса пришлось разобрать руками, по каталогу, а не по шаблону:

| Адрес | Цель | Почему |
|---|---|---|
| `/tproduct/275550866292-volkswagen-id4-crozz` | `/catalog/volkswagen/id-4-crozz/` | в каталоге слаг с точкой в названии: `id-4-crozz` |
| `/tproduct/222178120412-geely-cool` | `/catalog/geely/coolray/` | в каталоге это Geely Coolray |
| `/tproduct/590468505212-lynkampco-09-2024` | `/catalog/lynk-co/900-lynk-co-09/` | карточка называется «Lynk&CO 900 (Lynk & Co 09)» |

Без точной цели остались адреса, у которых модели в каталоге нет вовсе –
они ведут на страницу марки: Changan Uni-T и Uni-K, BYD Sea Lion
(в каталоге есть Sea Lion 06 и 07, какая именно была на Тильде – неизвестно).

## Как повторить проверку

```bash
# коды ответа по списку адресов
while read -r u; do printf '%-45s ' "$u"; \
  curl -s -o /dev/null -w '%{http_code}\n' "https://evolutioncar.by$u"; done < spisok.txt
```

Данные Вебмастера снимает агент `yandex-dannye` (токен – `~/.config/yandex/token`).
Важно: нули в его выгрузке после 08.10.2026 означают «не снято», а не ноль показов –
это подтверждено контролем на двух других сайтах того же аккаунта.

## Список 61 адреса

- `/AITO`
- `/HyndaiElantra2024`
- `/LOTUS`
- `/LixiangMega`
- `/NISSAN`
- `/TESLA`
- `/TOYOTA`
- `/VOLKSWAGEN`
- `/avatr-44042`
- `/avto-iz-yaponii`
- `/business-22740`
- `/byd-16334`
- `/changanuni-t2024-12175`
- `/denza-17668`
- `/garanty-41296`
- `/garanty2`
- `/geely-68237`
- `/lixiang-13850`
- `/lotus-62064`
- `/lynk-89883`
- `/mercedes-91454`
- `/nissan-17943`
- `/tesla-98479`
- `/toyota-68939`
- `/tproduct/132573848502-voyah-dreamer`
- `/tproduct/159258327962-geely-monjaro`
- `/tproduct/222178120412-geely-cool`
- `/tproduct/244350360162-avatr-11`
- `/tproduct/273409752432-byd-sea-lion-2024`
- `/tproduct/275550866292-volkswagen-id4-crozz`
- `/tproduct/318864275912-lixiang-l8-2024`
- `/tproduct/324708093212-zeekr-007`
- `/tproduct/336729518832-byd-han`
- `/tproduct/366733435472-geely-galaxy-l7`
- `/tproduct/379663522022-zeekr-001`
- `/tproduct/403044306182-volkswagen-id6-crozz`
- `/tproduct/408674741982-changan-uni-k`
- `/tproduct/414682521672-yangwang-u8`
- `/tproduct/430712166332-zeekr-009`
- `/tproduct/451578769202-avatr-12`
- `/tproduct/482866331632-lixiang-l8`
- `/tproduct/497531116562-tesla-model-y`
- `/tproduct/518903446192-avatr-12-2025`
- `/tproduct/526507563202-voyah-free-2024`
- `/tproduct/530822021362-toyota-bz4x`
- `/tproduct/590468505212-lynkampco-09-2024`
- `/tproduct/679829534452-lixiang-l9-2024`
- `/tproduct/695297582222-voyah-passion`
- `/tproduct/728215292112-byd-song-l`
- `/tproduct/745101738802-leapmotor-c11`
- `/tproduct/746988093342-lixiang-l7-2024`
- `/tproduct/824715941572-zeekr-x`
- `/tproduct/832568805222-changan-uni-t`
- `/tproduct/849601316292-hyndai-elantra`
- `/tproduct/863984906132-changan-uni-v`
- `/tproduct/864880578862-tesla-model-3`
- `/tproduct/915752496692-byd-seal`
- `/tproduct/963459563622-aito-m9`
- `/volkswagen-36222`
- `/voyah-61368`
- `/zeekr-58249`
