#!/bin/zsh
# Сбор отчётов кабинета и выкладка их на хостинг.
#
# Почему так, а не сбор прямо на хостинге: там нет ни Python с нужными
# библиотеками, ни ключей – и класть на общий хостинг токен Метрики и ключ
# Search Console незачем. Считаем на своей машине, на сервер уезжает только
# готовый json без секретов.
#
# Запуск: zsh deploy/otchety.sh [режим]   (по умолчанию daily – бесплатный)
#   daily – метрика, месяц запросов Google, позиции из уже собранного
#   serp  – ПЛАТНО: снимок выдачи Минска через XMLRiver (смета в выводе)
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-daily}"
ENV_FILE="$HOME/.config/hoster-by/dostup.env"

[[ -f "$ENV_FILE" ]] || { echo "нет $ENV_FILE" >&2; exit 1; }
source "$ENV_FILE"
KEY="${DEPLOY_KEY:-$HOME/.ssh/hoster_by_ed25519}"

cd "$HERE/analytics"
[[ -d .venv ]] || { echo "нет .venv – python3 -m venv .venv && .venv/bin/pip install certifi cryptography" >&2; exit 1; }
# Своих корневых сертификатов у python на маке нет: без этого Метрика
# отвечает URLError, а не данными (найдено 08.11.2026).
export SSL_CERT_FILE="$(.venv/bin/python -c 'import certifi;print(certifi.where())')"

echo "собираю: $MODE"
if [[ "$MODE" == "serp" ]]; then
  .venv/bin/python collect.py serp --paid
  .venv/bin/python collect.py positions
else
  .venv/bin/python collect.py "$MODE"
fi

cd "$HERE"
echo "везу отчёты на хостинг"
SSH_CMD="ssh -J claude-vps -i $KEY -o ConnectTimeout=30"
[[ "${DEPLOY_DIRECT:-}" == "1" ]] && SSH_CMD="ssh -i $KEY -o ConnectTimeout=30"
eval "$SSH_CMD $SSH_LOGIN@$SSH_HOST 'mkdir -p ~/data/reports'"
rsync -az -e "$SSH_CMD" --include='*.json' --exclude='months/' --exclude='serp/' \
  "$HERE/analytics/out/" "$SSH_LOGIN@$SSH_HOST:~/data/reports/"

echo "проверяю, что кабинет их видит"
for name in metrika positions; do
  code=$(eval "$SSH_CMD $SSH_LOGIN@$SSH_HOST \"test -r ~/data/reports/$name.json && echo есть || echo НЕТ\"")
  echo "   $name: $code"
done
echo "готово"
