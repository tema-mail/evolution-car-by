#!/bin/zsh
# Выкладка боевого сайта целиком: сборка → замок на кабинет → заливка.
#
#   zsh deploy/release.sh
#
# Почему скриптом, а не руками: 28.10.2026 кабинет ушёл на боевой открытым –
# в выкладке руками пропустили шаг scripts/lock-admin.mjs, и admin.evolutioncar.by
# отдавал все разделы без пароля. Здесь шаг пропустить нельзя: без учётных
# данных замок падает, и заливка не начинается.
#
# Правилась карта миграции – сначала пересобрать конфиг, он уйдёт при заливке:
#   node scripts/gen-redirects.mjs htaccess > deploy/htaccess
#   node scripts/gen-pereezd.mjs      (отчёт о переезде – в репо seo-razbory,
#                                      на боевом домене его не держим)
#
# С 03.11.2026 сайт на виртуальном хостинге hoster.by, не на VPS Beget.
# Кабинет там закрыт паролем Apache (admin/.htaccess + .htpasswd вне каталога
# сайта), а не замком на странице – поэтому scripts/lock-admin.mjs здесь не
# зовётся, а закрытость проверяется живым запросом после заливки.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

export PATH="$HOME/.local/node/bin:$PATH"
# Без этого адреса sitemap и canonical уедут на зеркало tema-mail.github.io.
export PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://evolutioncar.by}"

echo "1/4 сборка ($PUBLIC_SITE_URL)"
npm run build

echo "2/4 проверки перед заливкой"
fail() { echo "   НЕ ВЫКЛАДЫВАЮ: $1" >&2; exit 1; }

grep -q "<loc>$PUBLIC_SITE_URL/" dist/sitemap.xml \
  || fail "в карте сайта чужой домен"
[[ -f dist/admin/index.html ]] \
  || fail "в сборке нет кабинета"
[[ -f deploy/htaccess ]] \
  || fail "нет deploy/htaccess – собрать: node scripts/gen-redirects.mjs htaccess > deploy/htaccess"
pages=$(find dist -name index.html | wc -l | tr -d ' ')
[[ "$pages" -gt 400 ]] || fail "страниц всего $pages – похоже на неполную сборку"
echo "   страниц: $pages, кабинет в сборке есть, домен в карте сайта свой"

echo "3/4 заливка"
zsh deploy/upload.sh

echo "4/4 проверка живого сайта"
# Проверяем снаружи, а не по коду ответа заливки: заливка может пройти, а сайт
# отдавать старое или кабинет оказаться открытым. С мака hoster.by не всегда
# доступен (Imunify), поэтому запросы идут с claude-vps.
check() {
  ssh -o ConnectTimeout=25 claude-vps \
    "curl -s -o /dev/null -w '%{http_code}' --max-time 20 '$1'" 2>/dev/null
}
main_code=$(check "https://evolutioncar.by/")
admin_code=$(check "https://admin.evolutioncar.by/")
echo "   главная: $main_code, кабинет без пароля: $admin_code"
[[ "$main_code" == "200" ]] || fail "главная отдаёт $main_code"
[[ "$admin_code" == "401" ]] || fail "кабинет отдаёт $admin_code вместо 401 – он открыт"
echo "готово: сайт жив, кабинет закрыт"
