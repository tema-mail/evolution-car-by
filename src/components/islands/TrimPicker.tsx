import { useState } from 'preact/hooks';
import LeadForm from './LeadForm';

interface Row {
  label: string;
  value: string;
}
interface Trim {
  id: string;
  name: string;
  priceCny: number;
  tag?: string;
  summary: string;
  rows: Row[];
}
interface Props {
  trims: Trim[];
  commonSpecs: Row[];
  gallery: { src: string; alt: string }[];
  ui: Record<string, string>;
  car: string;
  brand: string;
  form: { namePlaceholder: string; phonePlaceholder: string; cta: string; success: string };
}

const cny = (n: number) => `${n.toLocaleString('ru-RU')} ¥`;

/**
 * Подбор версии там, где нет рендеров под каждую сборку: вместо выбора
 * цвета и дисков человек выбирает версию и видит, чем она отличается.
 * Отличия показываем явной таблицей, а общее для всех версий выносим
 * отдельно и один раз – иначе человек сравнивает одинаковые строки и
 * не понимает, за что доплачивает. Выбранная версия уходит в заявку
 * текстом, чтобы менеджер считал ровно ту машину, что смотрел клиент.
 */
export default function TrimPicker(p: Props) {
  const { ui } = p;
  const [trimId, setTrimId] = useState(p.trims[0].id);
  const trim = p.trims.find((t) => t.id === trimId)!;
  const base = p.trims[0].priceCny;
  const extra = trim.priceCny - base;

  return (
    <div class="tp">
      <div class="tp__grid">
        <div class="tp__visual">
          {p.gallery.map((g) => (
            <img key={g.src} class="tp__photo" src={g.src} alt={g.alt} loading="lazy" />
          ))}
        </div>

        <div class="tp__panel">
          <h2 class="tp__h">{ui.trimsTitle}</h2>
          <div class="tp__trims" role="radiogroup" aria-label={ui.trimsTitle}>
            {p.trims.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === trimId}
                class={`tp__trim ${t.id === trimId ? 'is-on' : ''}`}
                onClick={() => setTrimId(t.id)}
              >
                <span class="tp__trim-name">{t.name}</span>
                {t.tag && <span class="tp__trim-tag">{t.tag}</span>}
                <span class="tp__trim-price">{cny(t.priceCny)}</span>
              </button>
            ))}
          </div>

          <p class="tp__summary">{trim.summary}</p>

          <h3 class="tp__h3">{ui.specsTitle}</h3>
          <dl class="tp__rows">
            {trim.rows.map((r) => (
              <div key={r.label} class="tp__row">
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>

          <div class="tp__price">
            <span class="tp__price-label">{ui.priceLabel}</span>
            <b class="tp__price-value">{cny(trim.priceCny)}</b>
            {extra > 0 && <span class="tp__price-extra">на {cny(extra)} дороже начальной</span>}
            <span class="tp__price-note">{ui.priceNote}</span>
          </div>
        </div>
      </div>

      <section class="tp__common">
        <h3 class="tp__h3">{ui.commonTitle}</h3>
        <dl class="tp__rows tp__rows--wide">
          {p.commonSpecs.map((r) => (
            <div key={r.label} class="tp__row">
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section class="tp__form">
        <h3 class="tp__h3">{ui.formTitle}</h3>
        <p class="tp__form-lead">{ui.formLead}</p>
        <LeadForm
          car={p.car}
          brand={p.brand}
          namePlaceholder={p.form.namePlaceholder}
          phonePlaceholder={p.form.phonePlaceholder}
          cta={p.form.cta}
          success={p.form.success}
          source={`Подбор версии – ${p.car} ${trim.name}; цена в Китае ${cny(trim.priceCny)}`}
        />
      </section>

      <p class="tp__note">{ui.sourceNote}</p>

      <style>{`
        .tp__grid { display: grid; gap: 1.5rem; }
        @media (min-width: 1024px) {
          .tp__grid { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 2.5rem; align-items: start; }
        }
        .tp__photo { width: 100%; height: auto; border-radius: 16px; display: block; }
        .tp__h { font-size: .8125rem; text-transform: uppercase; letter-spacing: .08em;
                 color: var(--c-text-2); margin: 0 0 .75rem; }
        .tp__h3 { font-size: 1.0625rem; margin: 1.75rem 0 .75rem; }

        .tp__trims { display: grid; gap: .5rem; }
        .tp__trim { display: grid; grid-template-columns: 1fr auto; gap: .25rem 1rem;
                    text-align: left; padding: .875rem 1rem; border-radius: 12px; cursor: pointer;
                    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12);
                    color: inherit; font: inherit; }
        .tp__trim:hover { border-color: rgba(255,255,255,.28); }
        .tp__trim.is-on { border-color: var(--c-accent); background: rgba(201,162,39,.1); }
        .tp__trim-name { font-weight: 600; }
        .tp__trim-tag { grid-column: 1; font-size: .8125rem; color: var(--c-text-2); }
        .tp__trim-price { grid-column: 2; grid-row: 1 / span 2; align-self: center;
                          font-variant-numeric: tabular-nums; white-space: nowrap; }

        .tp__summary { color: var(--c-text-2); line-height: 1.6; margin: 1rem 0 0; }

        .tp__rows { display: grid; gap: 0; margin: 0; }
        .tp__row { display: grid; gap: .25rem 1rem; padding: .6875rem 0;
                   border-top: 1px solid rgba(255,255,255,.1); }
        .tp__row:first-child { border-top: 0; }
        .tp__row dt { color: var(--c-text-2); font-size: .9375rem; margin: 0; }
        .tp__row dd { margin: 0; }
        @media (min-width: 600px) {
          .tp__row { grid-template-columns: minmax(0, 13rem) minmax(0, 1fr); align-items: baseline; }
        }

        .tp__price { margin-top: 1.5rem; padding: 1.125rem 1.25rem; border-radius: 14px;
                     background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12);
                     display: grid; gap: .25rem; }
        .tp__price-label { font-size: .8125rem; text-transform: uppercase; letter-spacing: .06em;
                           color: var(--c-text-2); }
        .tp__price-value { font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2rem); line-height: 1.1;
                           font-variant-numeric: tabular-nums; }
        .tp__price-extra { font-size: .875rem; color: var(--c-accent); }
        .tp__price-note { font-size: .9375rem; color: var(--c-text-2); margin-top: .375rem; }

        .tp__common { margin-top: 2.5rem; }
        @media (min-width: 1024px) {
          .tp__rows--wide { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2.5rem; }
          .tp__rows--wide .tp__row:nth-child(2) { border-top: 0; }
        }

        .tp__form { margin-top: 2.5rem; padding: 1.5rem; border-radius: 16px;
                    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.12); }
        .tp__form .tp__h3 { margin-top: 0; }
        .tp__form-lead { color: var(--c-text-2); line-height: 1.6; margin: 0 0 1.25rem; max-width: 60ch; }

        .tp__note { margin-top: 1.5rem; font-size: .875rem; line-height: 1.6; color: var(--c-text-2); }
      `}</style>
    </div>
  );
}
