#!/usr/bin/env bash
# Выкладка предпросмотра карточек «Китай под заказ» на https://deford2027.github.io/evolutioncar-karty/
# (репо Deford2027/evolutioncar-karty, ветка main = dist). Без аналитики, форм и индексации.
# Запуск из корня репо: bash scripts/karty/predprosmotr.sh [папка-клона]
set -euo pipefail
cd "$(dirname "$0")/../.."
P=/evolutioncar-karty
KLON="${1:-${TMPDIR:-/tmp}/evolutioncar-karty-klon}"
export PATH=/root/.local/node/bin:$PATH

PUBLIC_SITE_URL=https://evolutioncar.by PUBLIC_LEAD_ENDPOINT= \
PUBLIC_GTM_ID=off PUBLIC_YM_ID=off PUBLIC_GA_ID=off PUBLIC_B24_WIDGET=off npm run build
node scripts/rebase-dist.mjs $P

# rebase-dist портит хотлинки рендеров tema-mail и не видит шрифты и пути внутри JSON (window.CAR):
# пути цветов лежат в массивах ("…", "/kartochki/…") – без префикса фото первого экрана Li
# при смене цвета пропадали (27.11.2026). Префиксуем любой "/kartochki/ в кавычках.
find dist \( -name '*.html' -o -name '*.js' -o -name '*.css' \) -print0 | xargs -0 perl -pi -e '
  s{https://tema-mail\.github\.io'$P'/}{https://tema-mail.github.io/}g;
  s{url\((["\x27]?)/fonts/}{url($1'$P'/fonts/}g;
  s{(["\x27(])/kartochki/}{$1'$P'/kartochki/}g;
'
find dist -name '*.html' -print0 | xargs -0 perl -pi -e \
  's{<head>}{<head><meta name="robots" content="noindex,nofollow">} unless /name="robots"/'

[ -d "$KLON/.git" ] || git clone -q https://github.com/Deford2027/evolutioncar-karty.git "$KLON"
git -C "$KLON" pull -q --ff-only
find "$KLON" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -r {} +
cp -a dist/. "$KLON"/
touch "$KLON/.nojekyll"   # без него Pages не отдаёт папку _astro – карточки без скриптов
git -C "$KLON" add -A
git -C "$KLON" commit -qm "Предпросмотр: $(git rev-parse --short HEAD) $(date +%F)" || echo "без изменений"
git -C "$KLON" -c credential.helper='!gh auth git-credential' push -q origin main
echo "Готово: https://deford2027.github.io$P/ (ждать pages/builds/latest)"
