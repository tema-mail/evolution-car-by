#!/bin/zsh
# Заливка собранного сайта на виртуальный хостинг hoster.by.
#
# Было до 03.11.2026: VPS Beget, релизы каталогами и симлинк current. Хостинг
# сменился (Beget упал 02.11, домен переключён на hoster.by), и схема другая –
# сайт лежит одним каталогом ~/www/evolutioncar.by, релизов нет.
#
# Что НЕ трогаем при заливке, хотя оно лежит в том же каталоге:
#   api/         – приёмник заявок server/lead.php, его в сборке нет;
#   .htaccess    – корневой из deploy/htaccess и admin/.htaccess с паролем
#                  кабинета. Оба кладутся отдельными командами, не из dist;
#   .well-known/ – проверки выпуска сертификата.
# Исключённое rsync не удаляет даже с --delete, поэтому заливка их не сносит.
#
# Соединение идёт через claude-vps: Imunify на хостинге банит адрес за частые
# запросы, и прямой ssh с мака отваливается. Если прямое соединение доступно,
# можно задать DEPLOY_DIRECT=1 и пойти без прыжка.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$HOME/.config/hoster-by/dostup.env"

[[ -f "$ENV_FILE" ]] || { echo "нет $ENV_FILE – где доступы к хостингу?" >&2; exit 1; }
source "$ENV_FILE"
: "${SSH_LOGIN:?нет SSH_LOGIN в dostup.env}"
: "${SSH_HOST:?нет SSH_HOST в dostup.env}"

KEY="${DEPLOY_KEY:-$HOME/.ssh/hoster_by_ed25519}"
[[ -f "$KEY" ]] || { echo "нет ключа $KEY" >&2; exit 1; }
[[ -d "$HERE/dist" ]] || { echo "нет $HERE/dist – сначала npm run build" >&2; exit 1; }

# 04.11.2026 сборка без PUBLIC_SITE_URL ушла на бой: canonical, sitemap, robots
# и разметка 457 файлов вели на зеркало tema-mail.github.io. Проверка здесь, а
# не только в release.sh, потому что заливка запускается и сама по себе.
if chuzhie=$(grep -rl 'tema-mail\.github\.io' "$HERE/dist" 2>/dev/null); then
  echo "НЕ ЗАЛИВАЮ: в сборке чужой домен, файлов: $(echo "$chuzhie" | wc -l | tr -d ' '). Собирать через zsh deploy/release.sh" >&2
  exit 1
fi

REMOTE="$SSH_LOGIN@$SSH_HOST"
ROOT="www/evolutioncar.by"

if [[ "${DEPLOY_DIRECT:-}" == "1" ]]; then
  SSH_CMD="ssh -i $KEY -o ConnectTimeout=30"
else
  SSH_CMD="ssh -J claude-vps -i $KEY -o ConnectTimeout=30"
fi

echo "заливаю сайт на $SSH_HOST"
rsync -az --delete -e "$SSH_CMD" \
  --exclude='api/' --exclude='.htaccess' --exclude='.well-known/' \
  "$HERE/dist/" "$REMOTE:~/$ROOT/"

# Конфиг веб-сервера генерируется из карты миграции и лежит в репозитории
# отдельно: в dist его класть нельзя, иначе карта всех старых адресов утечёт
# наружу по /.htaccess. Права строго 644 – при 600 Apache отдаёт 403.
if [[ -f "$HERE/deploy/htaccess" ]]; then
  echo "кладу конфиг веб-сервера"
  rsync -az -e "$SSH_CMD" "$HERE/deploy/htaccess" "$REMOTE:~/$ROOT/.htaccess"
  eval "$SSH_CMD $REMOTE 'chmod 644 ~/$ROOT/.htaccess'"
fi

# Приёмник заявок на PHP: Node на виртуальном хостинге нет, server/lead.mjs
# здесь не работает. Заливаем только если файл изменился – у него рядом лежит
# error_log, который сносить не нужно.
if [[ -f "$HERE/server/lead.php" ]]; then
  echo "кладу приёмник заявок"
  rsync -az -e "$SSH_CMD" "$HERE/server/lead.php" "$REMOTE:~/$ROOT/api/lead.php"
fi

echo "готово"
