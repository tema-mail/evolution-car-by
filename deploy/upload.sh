#!/bin/zsh
# Выкладка собранного сайта на VPS: копирует dist/ в новый релиз и атомарно
# переключает симлинк current. Старые релизы, кроме трёх последних, удаляются.
# Перед запуском: npm run build (и node scripts/gen-redirects.mjs при правке карты).
set -euo pipefail
HOST="evcar-deploy@45.12.72.227"
KEY="${DEPLOY_KEY:-$HOME/.ssh/evcar_deploy_ed25519}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
REL="$(date +%Y%m%d-%H%M%S)"

[[ -d "$HERE/dist" ]] || { echo "нет $HERE/dist – сначала npm run build" >&2; exit 1; }

echo "заливаю релиз $REL"
rsync -az --delete -e "ssh -i $KEY -o BatchMode=yes" \
  "$HERE/dist/" "$HOST:/opt/evolution-car/releases/$REL/"

ssh -i "$KEY" -o BatchMode=yes "$HOST" "cd /opt/evolution-car/releases
  ln -sfn '$REL' current.tmp && mv -Tf current.tmp current
  ls -1dt */ | tail -n +4 | xargs -r rm -rf
  echo 'текущий релиз: '\$(readlink current)"

echo "готово"
