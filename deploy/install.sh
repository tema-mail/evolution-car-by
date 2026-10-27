#!/bin/zsh
# Установка Evolution Car на VPS Beget. Повторный запуск безопасен.
# Делает: пользователя выкладки с ключом, папки, контейнер со статикой,
# блок в общем Caddy (с проверкой конфига и откатом).
# Сами выкладки потом идут через deploy/upload.sh – этот скрипт их не запускает.
set -euo pipefail
HOST="root@45.12.72.227"
KEY="${SSH_KEY:-$HOME/.ssh/seo_factory_tunnel_ed25519}"
DEPLOY_PUB="${DEPLOY_PUB:?нужен путь к открытому ключу выкладки}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

echo "1/4 пользователь и папки"
"${SSH[@]}" "id evcar-deploy >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash evcar-deploy
  mkdir -p /opt/evolution-car/releases /opt/evolution-car/deploy /home/evcar-deploy/.ssh
  chown -R evcar-deploy:evcar-deploy /opt/evolution-car /home/evcar-deploy/.ssh
  chmod 755 /opt/evolution-car /opt/evolution-car/releases
  chmod 700 /home/evcar-deploy/.ssh"

echo "2/4 ключ выкладки"
scp -i "$KEY" "$DEPLOY_PUB" "$HOST:/tmp/evcar_deploy.pub"
"${SSH[@]}" 'install -o evcar-deploy -g evcar-deploy -m 600 /tmp/evcar_deploy.pub /home/evcar-deploy/.ssh/authorized_keys
  rm -f /tmp/evcar_deploy.pub'

echo "3/4 конфиги и контейнер"
scp -i "$KEY" "$HERE/compose.yml" "$HERE/nginx.conf" "$HERE/redirects.conf" "$HOST:/opt/evolution-car/deploy/"
"${SSH[@]}" "cd /opt/evolution-car/deploy && docker compose up -d"

echo "4/4 блок в Caddy"
scp -i "$KEY" "$HERE/evolution-car.caddy" "$HOST:/tmp/evolution-car.caddy"
# Caddy на этом сервере – общий для всех сайтов, запущен контейнером
# dzenbot-caddy-1, конфиг монтируется из /opt/dzenbot/Caddyfile.
# Поэтому и проверка, и перечитывание идут через docker exec, а не systemctl.
"${SSH[@]}" 'set -e
  CADDY=/opt/dzenbot/Caddyfile
  BAK="$CADDY.bak-evolution-car-$(date +%Y%m%d%H%M%S)"
  cp "$CADDY" "$BAK"
  # свой старый блок (от маркера до его закрывающей скобки) убираем,
  # чтобы повторный запуск не плодил копии; чужие блоки не трогаем
  awk "/^# >>> evolution-car:/{skip=1} skip&&/^}\$/{skip=0;next} !skip" "$BAK" > "$CADDY"
  cat /tmp/evolution-car.caddy >> "$CADDY"
  rm -f /tmp/evolution-car.caddy
  if docker exec dzenbot-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
    docker exec dzenbot-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile && echo "   Caddy перечитан"
  else
    echo "   ОШИБКА: конфиг Caddy не прошёл проверку, откатываю" >&2
    cp "$BAK" "$CADDY"
    exit 1
  fi'

echo "готово. Проверочный адрес: https://evolution-car.45.12.72.227.nip.io/ (curl -k)"
