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

echo "1/5 пользователи и папки"
"${SSH[@]}" "id evcar-deploy >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash evcar-deploy
  getent group 10502 >/dev/null || groupadd --system --gid 10502 evcar-api
  id evcar-api >/dev/null 2>&1 || useradd --system --uid 10502 --gid 10502 --no-create-home --shell /usr/sbin/nologin evcar-api
  mkdir -p /opt/evolution-car/releases /opt/evolution-car/deploy /opt/evolution-car/server \
           /opt/evolution-car/data /opt/evolution-car/analytics-out /opt/evolution-car/secrets \
           /home/evcar-deploy/.ssh
  chown -R evcar-deploy:evcar-deploy /opt/evolution-car /home/evcar-deploy/.ssh
  # Заявки и отчёты – только у сервиса: персональные данные и коммерческие цифры.
  chown -R 10502:10502 /opt/evolution-car/data /opt/evolution-car/analytics-out /opt/evolution-car/secrets
  chmod 700 /opt/evolution-car/data /opt/evolution-car/secrets
  chmod 755 /opt/evolution-car /opt/evolution-car/releases /opt/evolution-car/analytics-out
  chmod 700 /home/evcar-deploy/.ssh"

echo "2/5 ключ выкладки"
scp -i "$KEY" "$DEPLOY_PUB" "$HOST:/tmp/evcar_deploy.pub"
"${SSH[@]}" 'install -o evcar-deploy -g evcar-deploy -m 600 /tmp/evcar_deploy.pub /home/evcar-deploy/.ssh/authorized_keys
  rm -f /tmp/evcar_deploy.pub'

echo "3/5 код сервиса, ключи аналитики и вход в кабинет"
scp -i "$KEY" "$HERE/compose.yml" "$HERE/nginx.conf" "$HERE/redirects.conf" "$HOST:/opt/evolution-car/deploy/"
scp -i "$KEY" "$HERE/../server/lead.mjs" "$HOST:/opt/evolution-car/server/"
scp -i "$KEY" -r "$HERE/../analytics" "$HOST:/opt/evolution-car/"
# Ключи аналитики: только на сервере, правами сервиса. В репозиторий не попадают.
scp -i "$KEY" "$HOME/.config/yandex/token" "$HOST:/opt/evolution-car/secrets/yandex-token"
scp -i "$KEY" "$HOME/.config/gsc/teyes-sa.json" "$HOST:/opt/evolution-car/secrets/gsc-sa.json"
# Вход в кабинет: пароль задаётся один раз и больше не меняется при повторной установке.
"${SSH[@]}" 'set -e
  ENV=/opt/evolution-car/lead.env
  if [ ! -f "$ENV" ]; then
    PASS=$(head -c 18 /dev/urandom | base64 | tr -d "/+=" | cut -c1-16)
    printf "ADMIN_LOGIN=evolution\nADMIN_PASS=%s\nORIGIN=https://evolutioncar.by\nPORT=8090\nDATA_DIR=/data\n" "$PASS" > "$ENV"
    echo "   вход в кабинет создан: evolution / $PASS"
  else
    echo "   вход в кабинет уже задан, не трогаю"
  fi
  chown 10502:10502 "$ENV" && chmod 600 "$ENV"
  chown -R 10502:10502 /opt/evolution-car/secrets /opt/evolution-car/analytics
  chmod 600 /opt/evolution-car/secrets/*'

echo "4/5 контейнеры"
"${SSH[@]}" "cd /opt/evolution-car/deploy && docker compose up -d --build"

echo "5/5 блок в Caddy"
scp -i "$KEY" "$HERE/evolution-car.caddy" "$HOST:/tmp/evolution-car.caddy"
# Caddy на этом сервере – общий для всех сайтов, запущен контейнером
# dzenbot-caddy-1, конфиг монтируется из /opt/dzenbot/Caddyfile.
# Поэтому и проверка, и перечитывание идут через docker exec, а не systemctl.
"${SSH[@]}" 'set -e
  CADDY=/opt/dzenbot/Caddyfile
  BAK="$CADDY.bak-evolution-car-$(date +%Y%m%d%H%M%S)"
  cp "$CADDY" "$BAK"
  # Свой старый блок убираем целиком, иначе повторный запуск задваивает
  # адрес и Caddy ругается «ambiguous site definition». Границы – пара
  # маркеров; у блока, поставленного до их появления, конца нет, и тогда
  # режем до конца файла: наш блок всегда дописывается последним.
  if grep -q "^# <<< evolution-car" "$BAK"; then
    awk "/^# >>> evolution-car/{skip=1} /^# <<< evolution-car/{skip=0;next} !skip" "$BAK" > "$CADDY"
  else
    sed "/^# >>> evolution-car:/,\$d" "$BAK" > "$CADDY"
  fi
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
