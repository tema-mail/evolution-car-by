#!/bin/zsh
# Обновляет на сервере только карту редиректов и перечитывает nginx.
# Нужен, когда правилась карта миграции: upload.sh заливает лишь dist/,
# а redirects.conf лежит рядом с compose.yml и статикой не копируется.
# Полная install.sh для этого не годится: она пересобирает контейнеры
# и перезаливает ключи аналитики.
#
#   SSH_KEY=~/.ssh/seo_factory_tunnel_ed25519 zsh deploy/push-redirects.sh
set -euo pipefail
HOST="root@45.12.72.227"
KEY="${SSH_KEY:-$HOME/.ssh/seo_factory_tunnel_ed25519}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

[[ -f "$HERE/redirects.conf" ]] || { echo "нет $HERE/redirects.conf" >&2; exit 1; }

echo "правил в файле: $(grep -c '^  ~\^' "$HERE/redirects.conf")"
scp -i "$KEY" "$HERE/redirects.conf" "$HOST:/opt/evolution-car/deploy/redirects.conf"

# Сначала проверка конфига, потом перечитывание: битый файл не должен
# уронить отдачу сайта. Контейнер nginx запущен без root, поэтому reload
# идёт сигналом через docker exec.
"${SSH[@]}" 'set -e
  docker exec evolution-car-web nginx -t
  docker exec evolution-car-web nginx -s reload
  echo "nginx перечитал конфиг"'

echo "готово"
