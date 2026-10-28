/** Цифры одной страницы: берёт сводку своего счётчика с сервера
    (/api/admin/events) тем же входом, что и весь кабинет, и показывает
    строку этой страницы. Владелец 18.10.2026: такой блок нужен в карточке
    каждой страницы на всех сайтах. */
import { useEffect, useState } from 'preact/hooks';
import { adminAuth } from './auth';

interface Row { page: string; in: number; pv: number; phone: number; msg: number; open: number; quiz: number; form: number; b24: number; actions: number }
interface Summary { days: number; total: Record<string, number>; actions: number; intents: number; cr: number; done: number; pages: Row[] }

const PERIODS: [string, number][] = [['Неделя', 7], ['Месяц', 30], ['Квартал', 90], ['Год', 365]];

export default function PageStats({ page }: { page: string }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr(''); setData(null);
    fetch(`/api/admin/events?days=${days}`, { headers: { Authorization: adminAuth() } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? 'нужен вход в кабинет' : `сервер ответил ${r.status}`))))
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, [days]);

  const row = data?.pages.find((p) => p.page === page);
  const intents = (row?.open ?? 0) + (row?.quiz ?? 0);
  const sent = (row?.form ?? 0) + (row?.b24 ?? 0);
  const tiles: [string, number | string, string][] = [
    ['Заходы на сайт', row?.in ?? 0, 'первый заход за визит'],
    ['Просмотры страницы', row?.pv ?? 0, 'сколько раз открывали'],
    ['Нажали телефон', row?.phone ?? 0, 'клик по номеру'],
    ['Нажали мессенджер', row?.msg ?? 0, 'Telegram, WhatsApp, Viber'],
    ['Открыли заявку', intents, 'нажали кнопку или начали квиз'],
    ['Отправили форму', sent, 'наша форма и форма Битрикса'],
    ['Целевых действий', row?.actions ?? 0, 'звонок, мессенджер, форма'],
    ['Дошли до отправки', intents ? `${(sent / intents * 100).toFixed(0)} %` : '—', 'из тех, кто открыл заявку'],
    ['Конверсия', row && row.pv ? `${(row.actions / row.pv * 100).toFixed(1)} %` : '—', 'действий к просмотрам'],
  ];

  return (
    <div class="pstat">
      <div class="pstat__per">
        {PERIODS.map(([label, d]) => (
          <button type="button" class={days === d ? 'on' : ''} onClick={() => setDays(d)}>{label}</button>
        ))}
      </div>

      {err && <p class="pstat__err">Цифры не загрузились: {err}</p>}
      {!err && !data && <p class="muted">Считаю…</p>}

      {data && (
        <>
          <div class="pstat__grid">
            {tiles.map(([label, value, hint]) => (
              <div class="pstat__tile">
                <b>{value}</b>
                <span>{label}</span>
                <i>{hint}</i>
              </div>
            ))}
          </div>
          <p class="pstat__note">
            Это свой счётчик сайта: считает всех, включая тех, кто не дал согласия
            на cookie. В Яндекс.Метрике те же действия отмечены целями
            («Заявка отправлена», «Нажали телефон», «Нажали мессенджер») – её цифры
            будут ниже, и разница показывает, скольких людей Метрика не видит.
          </p>
          {!row && (
            <p class="muted">
              За выбранный срок по этой странице действий ещё не записано.
              Счётчик включён {data.days >= 30 ? 'недавно' : 'только что'} — цифры появятся по мере заходов.
            </p>
          )}
        </>
      )}
    </div>
  );
}
