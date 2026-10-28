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
# Правилась карта миграции – отдельно:
#   node scripts/gen-redirects.mjs nginx > deploy/redirects.conf
#   zsh deploy/push-redirects.sh      (редиректы на сервер)
#   node scripts/gen-pereezd.mjs      (отчёт о переезде – в репо seo-razbory,
#                                      на боевом домене его не держим)
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

export PATH="$HOME/.local/node/bin:$PATH"
# Без этого адреса sitemap и canonical уедут на зеркало tema-mail.github.io.
export PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-https://evolutioncar.by}"

echo "1/4 сборка ($PUBLIC_SITE_URL)"
npm run build

echo "2/4 замок на кабинет"
node scripts/lock-admin.mjs

echo "3/4 проверки перед заливкой"
fail() { echo "   НЕ ВЫКЛАДЫВАЮ: $1" >&2; exit 1; }

grep -q "<loc>$PUBLIC_SITE_URL/" dist/sitemap.xml \
  || fail "в карте сайта чужой домен"
[[ -f dist/admin/index.html ]] \
  || fail "в сборке нет кабинета"
grep -q 'id="lock-data"' dist/admin/index.html \
  || fail "кабинет не закрыт замком"
# Любая страница кабинета, а не только главная: раньше закрывали выборочно.
open_pages=$(grep -L 'id="lock-data"' dist/admin/**/*.html 2>/dev/null | wc -l | tr -d ' ')
[[ "$open_pages" == "0" ]] || fail "$open_pages страниц кабинета без замка"
pages=$(find dist -name index.html | wc -l | tr -d ' ')
[[ "$pages" -gt 400 ]] || fail "страниц всего $pages – похоже на неполную сборку"
echo "   страниц: $pages, кабинет закрыт, домен в карте сайта свой"

echo "4/4 заливка"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/evcar_deploy_ed25519}" zsh deploy/upload.sh
