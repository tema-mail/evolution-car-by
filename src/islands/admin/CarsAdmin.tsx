/** «Автомобили» кабинета Evolution Car: весь каталог с поиском, фильтрами и подборками.
    Правка карточек идёт через карточку страницы – здесь список и проверка данных:
    видно, у каких машин нет цены или характеристик. */
import { useMemo, useState } from 'preact/hooks';

export interface CarRow {
  slug: string; brand: string; title: string; photo: string;
  priceUsd: number | null; priceByn: number | null; year: string;
  country: string; availability: string; powertrain: string;
  specs: number; note: string;
}
export interface ListRow { id: string; title: string; count: number }

const usd = (n: number | null) => (n ? `${n.toLocaleString('ru-RU')} $` : '—');

export default function CarsAdmin({ items, lists }: { items: CarRow[]; lists: ListRow[] }) {
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [only, setOnly] = useState('');

  const brands = useMemo(() => [...new Set(items.map((i) => i.brand))].sort(), [items]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => {
      if (brand && i.brand !== brand) return false;
      if (only === 'noprice' && i.priceUsd) return false;
      if (only === 'nospecs' && i.specs > 2) return false;
      if (!t) return true;
      return `${i.title} ${i.brand} ${i.slug}`.toLowerCase().includes(t);
    });
  }, [items, q, brand, only]);

  const noPrice = items.filter((i) => !i.priceUsd).length;
  const noSpecs = items.filter((i) => i.specs <= 2).length;

  return (
    <div class="cars">
      <div class="tools">
        <h1>Автомобили</h1>
        <span class="muted">{items.length} в каталоге · показано {shown.length}</span>
      </div>

      <div class="cars__bar">
        <input value={q} placeholder="Поиск по марке и модели"
          onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Поиск" />
        <select value={brand} onChange={(e) => setBrand((e.target as HTMLSelectElement).value)} aria-label="Марка">
          <option value="">Все марки</option>
          {brands.map((b) => <option value={b}>{b}</option>)}
        </select>
        <select value={only} onChange={(e) => setOnly((e.target as HTMLSelectElement).value)} aria-label="Что показать">
          <option value="">Все машины</option>
          <option value="noprice">Без цены ({noPrice})</option>
          <option value="nospecs">Почти без характеристик ({noSpecs})</option>
        </select>
      </div>

      <p class="muted cars__hint">
        Подборки сайта собираются сами по признакам машины – наличие, двигатель, страна.
        Чтобы машина попала в подборку, меняются её поля, а не состав подборки.
      </p>
      <div class="cars__lists">
        {lists.map((l) => <span class="cars__chip">{l.title} <b>{l.count}</b></span>)}
      </div>

      <table class="cars__table">
        <thead>
          <tr><th></th><th>Модель</th><th>Год</th><th>Цена</th><th>Наличие</th><th>Двигатель</th><th>Откуда</th><th>Характеристик</th></tr>
        </thead>
        <tbody>
          {shown.map((i) => (
            <tr>
              <td><img src={i.photo} alt="" width="56" height="56" loading="lazy" /></td>
              <td>
                <a href={`/page/catalog/${i.slug}/`} class="cars__name">{i.title}</a>
                <div class="muted">{i.brand}{i.note ? ' · данные требуют подтверждения' : ''}</div>
              </td>
              <td>{i.year}</td>
              <td class={i.priceUsd ? '' : 'cars__warn'}>{usd(i.priceUsd)}</td>
              <td>{i.availability}</td>
              <td>{i.powertrain}</td>
              <td>{i.country}</td>
              <td class={i.specs <= 2 ? 'cars__warn' : ''}>{i.specs}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown.length === 0 && <p class="muted">Ничего не нашлось – измените поиск или фильтры.</p>}
    </div>
  );
}
