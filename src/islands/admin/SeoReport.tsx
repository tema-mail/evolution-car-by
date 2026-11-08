// Кабинет → «SEO-аналитика». Раздел открыт 08.11.2026 по слову владельца
// («открой SEO-аналитику и позиции»). Данные – Google Search Console из того
// же отчёта, что и «Метрика и каналы» (analytics/collect.py, gsc_periods):
// отдельного сбора не заводим, чтобы цифры в двух разделах не разъезжались.
//
// Чего тут нет и почему: Яндекс.Вебмастер своего API не отдаёт с 11.10.2026,
// его месяц приносит ручная выгрузка (collect.py wm-import) и живёт в разделе
// «Позиции». Писать «данные Яндекса» там, где их нет, нельзя.
import { useEffect, useMemo, useState } from 'preact/hooks';

const API = '/api/report.php?name=metrika';
type Q = { query: string; clicks: number; impressions: number; ctr: number; position: number; prev_position: number | null };
type P = { dates: { date1: string; date2: string }; now: { clicks: number; impressions: number; ctr: number; position: number } | null;
  prev: { clicks: number; impressions: number; ctr: number; position: number } | null; queries: Q[] };

const PERIODS: [string, string][] = [['week', 'Неделя'], ['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год']];
const nf = new Intl.NumberFormat('ru-RU');
const int = (n?: number | null) => (n == null ? '–' : nf.format(Math.round(n)));
const f1 = (n?: number | null) => (n == null ? '–' : n.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** Брендовый запрос – тот, где ищут нас по имени, а не услугу. */
const BRAND = /эволюш|evolution|эвол[юу]ш|evolutioncar/i;

function Delta({ now, prev, lower = false, unit = '%' }: { now?: number | null; prev?: number | null; lower?: boolean; unit?: string }) {
  if (now == null || prev == null || !prev) return null;
  const v = unit === ' мест' ? prev - now : (now / prev - 1) * 100;
  if (!isFinite(v) || Math.abs(v) < 0.05) return <span class="d flat">0{unit}</span>;
  const good = lower ? v > 0 : v > 0;
  return <span class={`d ${good ? 'up' : 'down'}`}>{v > 0 ? '▲ +' : '▼ −'}{f1(Math.abs(v))}{unit}</span>;
}

export default function SeoReport() {
  const [data, setData] = useState<Record<string, P> | null>(null);
  const [err, setErr] = useState('');
  const [period, setPeriod] = useState('month');
  const [kind, setKind] = useState<'all' | 'brand' | 'plain'>('all');

  useEffect(() => {
    fetch(API, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 404 ? 'отчёт ещё не собран' : `сервер ответил ${r.status}`))))
      .then((d) => setData(d?.report?.gsc_periods ?? null))
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  const p: P | null = data ? (data as any)[period] ?? null : null;
  const rows = useMemo(() => {
    const all = p?.queries ?? [];
    if (kind === 'brand') return all.filter((q) => BRAND.test(q.query));
    if (kind === 'plain') return all.filter((q) => !BRAND.test(q.query));
    return all;
  }, [p, kind]);

  const split = useMemo(() => {
    const all = p?.queries ?? [];
    const sum = (list: Q[], f: (q: Q) => number) => list.reduce((a, q) => a + f(q), 0);
    const brand = all.filter((q) => BRAND.test(q.query));
    const plain = all.filter((q) => !BRAND.test(q.query));
    return { brandClicks: sum(brand, (q) => q.clicks), plainClicks: sum(plain, (q) => q.clicks), brandN: brand.length, plainN: plain.length };
  }, [p]);

  if (err) return <section class="panel login"><h1>SEO-аналитика</h1><p>{err}</p></section>;
  if (!data || !p) return <section class="panel login"><h1>SEO-аналитика</h1><p>Загружаю данные Search Console…</p></section>;

  const now = p.now;
  const prev = p.prev;
  return (
    <div>
      <section class="panel">
        <h2>Поиск Google: что видят люди<span class="chip">Search Console</span></h2>
        <p class="sub">
          {p.dates ? `${dm(p.dates.date1)} – ${dm(p.dates.date2)}` : ''} · Яндекс в этот раздел не приходит:
          его Вебмастер не отдаёт данные по API с 11.10.2026, месяц Яндекса лежит в разделе «Позиции».
        </p>
        <div class="tabs">
          {PERIODS.map(([k, t]) => (
            <button class={`tab2${period === k ? ' on' : ''}`} onClick={() => setPeriod(k)}>{t}</button>
          ))}
        </div>
        <div class="kpis">
          <div class="kpi"><b>{int(now?.clicks)}</b><span>Переходы из поиска <Delta now={now?.clicks} prev={prev?.clicks} /></span></div>
          <div class="kpi"><b>{int(now?.impressions)}</b><span>Показы в выдаче <Delta now={now?.impressions} prev={prev?.impressions} /></span></div>
          <div class="kpi"><b>{f1(now?.ctr)}%</b><span>Кликают из показов <Delta now={now?.ctr} prev={prev?.ctr} /></span></div>
          <div class="kpi"><b>{f1(now?.position)}</b><span>Средняя позиция <Delta now={now?.position} prev={prev?.position} unit=" мест" lower /></span></div>
        </div>
        {!prev && <p class="meta">Сравнивать не с чем: прошлый период в этом отчёте пуст – появится при следующих сборах.</p>}
      </section>

      <section class="panel">
        <h2>Нас ищут по имени или по делу</h2>
        <p class="sub">
          По имени – «эволюшн кар», «evolution car»: это люди, которые уже знают компанию. По делу – всё
          остальное: марка, модель, «авто из китая в минске». Рост второго и есть рост сайта.
        </p>
        <div class="kpis">
          <div class="kpi"><b>{int(split.brandClicks)}</b><span>переходов по имени, запросов: {split.brandN}</span></div>
          <div class="kpi"><b>{int(split.plainClicks)}</b><span>переходов по делу, запросов: {split.plainN}</span></div>
        </div>
      </section>

      <section class="panel">
        <h2>Запросы<span class="chip">{rows.length}</span></h2>
        <div class="tabs">
          {([['all', 'Все'], ['plain', 'По делу'], ['brand', 'По имени']] as [typeof kind, string][]).map(([k, t]) => (
            <button class={`tab2${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{t}</button>
          ))}
        </div>
        <table class="t">
          <thead>
            <tr><th>Запрос</th><th>Переходы</th><th>Показы</th><th>CTR</th><th>Позиция</th></tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.query}>
                <td>{q.query}{BRAND.test(q.query) && <span class="chip">имя</span>}</td>
                <td class="n">{int(q.clicks)}</td>
                <td class="n">{int(q.impressions)}</td>
                <td class="n">{f1(q.ctr)}%</td>
                <td class="n">{f1(q.position)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5}>За этот период таких запросов нет.</td></tr>}
          </tbody>
        </table>
        <p class="meta">Search Console отдаёт в этот отчёт двадцать самых заметных запросов периода. Полный список за месяц – в разделе «Позиции».</p>
      </section>
    </div>
  );
}
