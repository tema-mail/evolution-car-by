#!/usr/bin/env python3
"""Выпуск сертификата Let's Encrypt для evolutioncar.by проверкой по DNS.

Почему по DNS, а не файлом в каталоге сайта: на hoster.by перед Apache стоит
nginx, и пути, начинающиеся с точки, он наружу не отдаёт – запрос
/.well-known/acme-challenge/<токен> отвечает 404, хотя файл на месте
(проверено 03.11.2026). Проверка по DNS от веб-сервера не зависит, а ключи
hoster API у нас как раз с правами на DNS-записи.

Что делает по шагам:
  1. заводит (или переиспользует) ключ ACME-аккаунта и ключ сертификата;
  2. регистрирует аккаунт в Let's Encrypt;
  3. создаёт заказ на evolutioncar.by и www.evolutioncar.by;
  4. на каждое имя кладёт TXT-запись _acme-challenge через API hoster.by;
  5. ждёт, пока запись увидят DNS-серверы домена, и просит проверку;
  6. отправляет CSR, забирает сертификат с цепочкой;
  7. ставит его в панель хостинга вместо самоподписанного;
  8. убирает за собой TXT-записи – в любом случае, даже если упало.

Запуск (туннели обязательны: ключи API привязаны к адресу нашего VPS):
  ssh -f -N -L 15443:serviceapi.hoster.by:443 claude-vps
  ssh -f -N -L 15000:vh171.hoster.by:1500   claude-vps
  python3 deploy/vypustit-ssl.py

Подписи считает openssl: модуля cryptography на маке нет и ставить его ради
одного скрипта незачем.
"""

import base64
import hashlib
import json
import os
import re
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

DOMAINS = ['evolutioncar.by', 'www.evolutioncar.by']
ZONE = 'evolutioncar.by'
ACME = 'https://acme-v02.api.letsencrypt.org/directory'
# Боевой каталог Let's Encrypt. Для отладки ставить тестовый – у него нет
# недельного лимита на домен, но сертификат от него браузеры не признают:
# https://acme-staging-v02.api.letsencrypt.org/directory

API = 'https://localhost:15443'       # туннель к serviceapi.hoster.by
PANEL = 'https://localhost:15000'     # туннель к панели vh171.hoster.by:1500
API_HOST = 'serviceapi.hoster.by'
CONF = os.path.expanduser('~/.config/hoster-by')
WORK = os.path.expanduser('~/.config/hoster-by/ssl')
NS = ['u1.hoster.by', 'u2.hoster.by']

# Туннели смотрят на localhost, поэтому имя в сертификате не совпадает –
# проверку отключаем осознанно: внутри туннеля трафик уже зашифрован SSH,
# а запросы к Let's Encrypt идут напрямую и проверяются как обычно.
NOVERIFY = ssl.create_default_context()
NOVERIFY.check_hostname = False
NOVERIFY.verify_mode = ssl.CERT_NONE

# Запросы к Let's Encrypt проверяем как положено, но корни берём из системного
# набора macOS: Python здесь поставлен не из пакета Apple и своего набора
# не имеет – без этого urlopen падает с CERTIFICATE_VERIFY_FAILED.
VERIFY = ssl.create_default_context(cafile='/etc/ssl/cert.pem'
                                    if os.path.exists('/etc/ssl/cert.pem') else None)


def b64(data: bytes) -> str:
    """base64url без выравнивания – формат, которого требует ACME."""
    return base64.urlsafe_b64encode(data).decode().rstrip('=')


def run(args, stdin=None):
    r = subprocess.run(args, input=stdin, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f'{args[0]} упал: {r.stderr.decode()[:300]}')
    return r.stdout


def env(name):
    """Значение из ~/.config/hoster-by/*.env – секреты в коде не держим."""
    for fname in ('api.env', 'dostup.env'):
        path = os.path.join(CONF, fname)
        if not os.path.exists(path):
            continue
        for line in open(path, encoding='utf-8'):
            if line.startswith(name + '='):
                return line.split('=', 1)[1].strip()
    raise RuntimeError(f'в {CONF} нет значения {name}')


def http(url, data=None, headers=None, method=None, ctx=None):
    req = urllib.request.Request(url, data=data, method=method or ('POST' if data is not None else 'GET'))
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=60)
        return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


# ---------------------------------------------------------------- ключи и JWS

def ensure_keys():
    os.makedirs(WORK, mode=0o700, exist_ok=True)
    acc = os.path.join(WORK, 'account.key')
    dom = os.path.join(WORK, 'domain.key')
    for path, bits in ((acc, '2048'), (dom, '2048')):
        if not os.path.exists(path):
            run(['openssl', 'genrsa', '-out', path, bits])
            os.chmod(path, 0o600)
            print(f'  создан ключ {os.path.basename(path)}')
    return acc, dom


def jwk(account_key):
    """Публичная часть ключа в виде JWK – её ACME сверяет с подписью.

    Модуль берём отдельной командой -modulus, а не из вывода -text: в тексте
    шестнадцатеричными блоками идут и приватные части ключа, и регулярное
    выражение по строкам собирало их вместе с модулем. Let's Encrypt такую
    подпись отвергал с «Parse error reading JWS».
    """
    hexmod = run(['openssl', 'rsa', '-in', account_key, '-noout', '-modulus']).decode()
    hexmod = hexmod.split('=', 1)[1].strip()
    if len(hexmod) % 2:
        hexmod = '0' + hexmod
    text = run(['openssl', 'rsa', '-in', account_key, '-noout', '-text']).decode()
    exp = int(re.search(r'publicExponent: (\d+)', text).group(1))
    expb = exp.to_bytes((exp.bit_length() + 7) // 8, 'big')
    return {'e': b64(expb), 'kty': 'RSA', 'n': b64(bytes.fromhex(hexmod))}


def thumbprint(key_jwk):
    canon = json.dumps(key_jwk, sort_keys=True, separators=(',', ':')).encode()
    return b64(hashlib.sha256(canon).digest())


class Acme:
    def __init__(self, account_key):
        self.key = account_key
        self.jwk = jwk(account_key)
        self.kid = None
        _, body, _ = http(ACME, ctx=VERIFY)
        self.dir = json.loads(body)

    def nonce(self):
        _, _, h = http(self.dir['newNonce'], method='HEAD', ctx=VERIFY)
        return h['Replay-Nonce']

    def post(self, url, payload):
        """Подписанный запрос. payload == "" – это POST-as-GET из RFC 8555."""
        protected = {'url': url, 'alg': 'RS256', 'nonce': self.nonce()}
        protected.update({'kid': self.kid} if self.kid else {'jwk': self.jwk})
        p64 = b64(json.dumps(protected).encode())
        y64 = b64(json.dumps(payload).encode()) if payload != '' else ''
        sig = run(['openssl', 'dgst', '-sha256', '-sign', self.key], stdin=f'{p64}.{y64}'.encode())
        data = json.dumps({'protected': p64, 'payload': y64, 'signature': b64(sig)}).encode()
        code, body, headers = http(url, data=data, ctx=VERIFY,
                                   headers={'Content-Type': 'application/jose+json'})
        if code >= 400:
            raise RuntimeError(f'ACME {url} → {code}: {body.decode()[:400]}')
        return code, body, headers

    def register(self):
        _, _, h = self.post(self.dir['newAccount'],
                            {'termsOfServiceAgreed': True,
                             'contact': ['mailto:webmaster@evolutioncar.by']})
        self.kid = h['Location']
        print(f'  аккаунт ACME: {self.kid.rsplit("/", 1)[-1]}')


# ------------------------------------------------------------ DNS хостера

class Dns:
    def __init__(self):
        self.token = None
        self.order = None

    def auth(self):
        code, body, _ = http(f'{API}/service/account/create/token',
                             data=b'', method='POST', ctx=NOVERIFY,
                             headers={'Host': API_HOST,
                                      'Access-Key': env('HB_ACCESS_KEY'),
                                      'Secret-Key': env('HB_SECRET_KEY')})
        payload = json.loads(body).get('payload') or {}
        self.token = payload.get('accessToken')
        if not self.token:
            raise RuntimeError(f'токен API не выдан: {body.decode()[:300]}')
        code, body, _ = self.call('GET', '/dns/orders')
        for o in (json.loads(body).get('payload') or {}).get('orders', []):
            if o.get('domainName') == ZONE:
                self.order = str(o['id'])
        if not self.order:
            raise RuntimeError(f'зона {ZONE} не найдена среди услуг DNS')
        print(f'  зона {ZONE}: услуга {self.order}')

    def call(self, method, path, payload=None):
        data = json.dumps(payload).encode() if payload is not None else (b'' if method != 'GET' else None)
        code, body, h = http(f'{API}{path}', data=data, method=method, ctx=NOVERIFY,
                             headers={'Host': API_HOST, 'Access-Token': self.token,
                                      'Content-Type': 'application/json'})
        if code >= 400:
            raise RuntimeError(f'hoster API {method} {path} → {code}: {body.decode()[:300]}')
        return code, body, h

    def set_txt(self, name, values):
        """Одна TXT-запись на имя: у evolutioncar.by и www общий _acme-challenge
        только если имена совпадают, поэтому значения кладём списком."""
        # TTL 600 – минимум, который принимает hoster API («must be within the
        # range of 600 to 604800»). Для разовой проверки это не мешает: у
        # серверов самого домена запись появляется сразу.
        body = {'ttl': 600, 'records': [{'content': f'"{v}"', 'disabled': False} for v in values]}
        path = f'/dns/orders/{self.order}/records/txt/{name}.'
        try:
            self.call('PATCH', path, body)
        except RuntimeError:
            self.call('POST', f'/dns/orders/{self.order}/records/txt',
                      {'name': f'{name}.', 'ttl': 600, 'type': 'TXT',
                       'records': body['records']})

    def drop_txt(self, name):
        try:
            self.call('DELETE', f'/dns/orders/{self.order}/records/txt/{name}.')
        except RuntimeError as e:
            print(f'  запись {name} убрать не удалось: {str(e)[:120]}')


def wait_dns(name, values):
    """Ждём, пока оба сервера домена начнут отдавать нужные значения."""
    want = set(values)
    for attempt in range(40):
        seen = []
        for ns in NS:
            out = subprocess.run(['dig', '+short', f'@{ns}', name, 'TXT'],
                                 capture_output=True, timeout=20).stdout.decode()
            seen.append({v.strip('"') for v in out.split()})
        if all(want <= s for s in seen):
            print(f'  {name}: запись видна на обоих серверах')
            return True
        time.sleep(10)
    print(f'  {name}: записи так и не увидели, пробуем дальше')
    return False


# ------------------------------------------------------------------- панель

def panel_install(cert_pem, key_path):
    """Меняем содержимое сертификата, который уже привязан к сайту."""
    import urllib.parse
    pwd = env('SSH_PASS')
    auth = urllib.parse.urlencode({'func': 'auth', 'username': 'h221108',
                                   'password': pwd, 'sok': 'ok', 'out': 'json'}).encode()
    _, body, _ = http(f'{PANEL}/ispmgr', data=auth, ctx=NOVERIFY)
    sid = json.loads(body)['doc']['auth']['$id']
    key_pem = open(key_path, encoding='utf-8').read()
    form = urllib.parse.urlencode({'auth': sid, 'func': 'sslcert.edit',
                                   'elid': 'evolutioncar.by_le1',
                                   'name': 'evolutioncar.by_le1',
                                   'crt': cert_pem, 'crtkey': key_pem,
                                   'sok': 'ok', 'out': 'json'}).encode()
    _, body, _ = http(f'{PANEL}/ispmgr', data=form, ctx=NOVERIFY)
    doc = json.loads(body).get('doc', {})
    if 'error' in doc:
        raise RuntimeError(f'панель не приняла сертификат: {json.dumps(doc["error"], ensure_ascii=False)[:300]}')
    print('  сертификат установлен в панели')


# --------------------------------------------------------------------- ход

def main():
    print('Выпуск сертификата Let\'s Encrypt для:', ', '.join(DOMAINS))
    acc_key, dom_key = ensure_keys()
    acme = Acme(acc_key)
    acme.register()
    tp = thumbprint(acme.jwk)

    dns = Dns()
    dns.auth()

    _, body, headers = acme.post(acme.dir['newOrder'],
                                 {'identifiers': [{'type': 'dns', 'value': d} for d in DOMAINS]})
    order_url = headers['Location']
    order = json.loads(body)
    print(f'  заказ создан, проверок: {len(order["authorizations"])}')

    placed = {}
    try:
        challenges = []
        for authz_url in order['authorizations']:
            _, body, _ = acme.post(authz_url, '')
            authz = json.loads(body)
            name = authz['identifier']['value']
            ch = next(c for c in authz['challenges'] if c['type'] == 'dns-01')
            value = b64(hashlib.sha256(f'{ch["token"]}.{tp}'.encode()).digest())
            rec = f'_acme-challenge.{name}'
            placed.setdefault(rec, []).append(value)
            challenges.append((ch['url'], name, rec))

        for rec, values in placed.items():
            dns.set_txt(rec, values)
            print(f'  положил TXT {rec}')
        for rec, values in placed.items():
            wait_dns(rec, values)

        for ch_url, name, rec in challenges:
            acme.post(ch_url, {})
            print(f'  проверка запрошена: {name}')

        for _ in range(40):
            _, body, _ = acme.post(order_url, '')
            order = json.loads(body)
            if order['status'] in ('ready', 'valid'):
                break
            if order['status'] == 'invalid':
                for a in order['authorizations']:
                    _, b2, _ = acme.post(a, '')
                    print('  отказ:', json.dumps(json.loads(b2), ensure_ascii=False)[:400])
                raise RuntimeError('Let\'s Encrypt отклонил проверку')
            time.sleep(5)
        print(f'  статус заказа: {order["status"]}')

        csr = make_csr(dom_key)
        _, body, _ = acme.post(order['finalize'], {'csr': b64(csr)})
        for _ in range(30):
            _, body, _ = acme.post(order_url, '')
            order = json.loads(body)
            if order.get('certificate'):
                break
            time.sleep(5)
        if not order.get('certificate'):
            raise RuntimeError('сертификат не выдан')
        _, cert, _ = acme.post(order['certificate'], '')
        cert_pem = cert.decode()
        path = os.path.join(WORK, 'fullchain.pem')
        open(path, 'w', encoding='utf-8').write(cert_pem)
        print(f'  сертификат получен: {path}')
        panel_install(cert_pem, dom_key)
    finally:
        for rec in placed:
            dns.drop_txt(rec)
            print(f'  убрал TXT {rec}')


def make_csr(key):
    """CSR сразу на оба имени: SAN задаём конфигом, иначе openssl их потеряет."""
    cnf = os.path.join(WORK, 'csr.cnf')
    alt = ', '.join(f'DNS:{d}' for d in DOMAINS)
    open(cnf, 'w', encoding='utf-8').write(
        '[req]\ndistinguished_name=dn\nreq_extensions=ext\nprompt=no\n'
        f'[dn]\nCN={DOMAINS[0]}\n[ext]\nsubjectAltName={alt}\n')
    return run(['openssl', 'req', '-new', '-key', key, '-config', cnf, '-outform', 'DER'])


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('НЕ ВЫШЛО:', e)
        sys.exit(1)
