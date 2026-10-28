import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  COUNTRIES,
  fullPhone,
  maskNational,
  nationalFilled,
  parsePhoneInput,
} from '../../lib/phone';

type Status = 'idle' | 'sending' | 'done' | 'error';

interface Props {
  namePlaceholder: string;
  phonePlaceholder: string;
  cta: string;
  success: string;
  /** compact – поля в столбец (карточка шага), wide – в строку (финальный оффер) */
  layout?: 'compact' | 'wide';
  source: string;
  /** Марка машины – в кабинете это категория заявки */
  car?: string;
  brand?: string;
}

export default function LeadForm({
  car,
  brand,
  namePlaceholder,
  phonePlaceholder,
  cta,
  success,
  layout = 'compact',
  source,
}: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('BY');
  const [company, setCompany] = useState(''); // ловушка для роботов, человек её не видит
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const onSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Имя сервер тоже требует: без этой проверки он отвечал отказом, а
    // человек видел общее «не удалось отправить» и не понимал, что исправить.
    if (!name.trim()) {
      setError('Напишите, как к вам обращаться');
      return;
    }
    if (!nationalFilled(phone, country)) {
      setError('Укажите номер телефона полностью');
      return;
    }
    if (!agreed) {
      setError('Отметьте согласие на обработку данных');
      return;
    }
    setError('');
    setStatus('sending');
    const { submitLead, goToThanks } = await import('../../lib/submit');
    const ok = await submitLead({
      name,
      phone: fullPhone(phone, country),
      source,
      car,
      brand,
      consent: agreed,
      company,
    });
    setStatus(ok ? 'done' : 'error');
    if (ok) goToThanks();
  };

  if (status === 'done') {
    return (
      <p class="lead-form__done" role="status">
        {success}
      </p>
    );
  }

  // method="post" и onsubmit="return false" попадают в разметку, которую сервер
  // отдаёт до оживления острова. Без них человек, нажавший кнопку раньше, чем
  // загрузится скрипт (медленная связь, блокировщик), отправил бы форму обычным
  // GET: имя и телефон ушли бы в адресную строку, историю браузера и журналы
  // сервера, а заявка потерялась бы.
  return (
    <form
      class={`lead-form lead-form--${layout}`}
      method="post"
      onsubmit="return false"
      onSubmit={onSubmit}
      novalidate
    >
      <div class="lead-form__fields">
        <input
          class="lead-form__input"
          type="text"
          name="name"
          autocomplete="name"
          placeholder={namePlaceholder}
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <PhoneField
          label={phonePlaceholder}
          country={country}
          national={phone}
          onChange={(iso, national) => {
            setCountry(iso);
            setPhone(national);
          }}
        />
        <button
          class={`btn lead-form__submit${agreed ? '' : ' is-locked'}`}
          type="submit"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Отправляем…' : cta}
        </button>
      </div>

      {/* Ловушка: поле убрано с экрана и из порядка обхода, заполнить его
          может только робот, разбирающий разметку. Такая заявка отсеивается.
          Имя поля нарочно не «company» и не «organization»: по таким именам
          браузер или менеджер паролей сам подставил бы значение, и живая
          заявка молча ушла бы в отсев. autocomplete="off" – лишь просьба,
          а не запрет, поэтому полагаться на него нельзя. */}
      <input
        type="text"
        name="lead-ref"
        tabIndex={-1}
        autocomplete="off"
        aria-hidden="true"
        value={company}
        onInput={(e) => setCompany((e.target as HTMLInputElement).value)}
        style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"
      />

      <Consent agreed={agreed} onChange={setAgreed} />

      {error && (
        <p class="lead-form__error" role="alert">
          {error}
        </p>
      )}
      {status === 'error' && (
        <p class="lead-form__error" role="alert">
          Не удалось отправить. Позвоните нам или попробуйте ещё раз.
        </p>
      )}
    </form>
  );
}

interface PhoneFieldProps {
  label: string;
  country: string;
  national: string;
  onChange: (iso: string, national: string) => void;
}

/**
 * Телефон с выбором страны. По умолчанию всегда Беларусь – большая часть
 * заявок оттуда (просьба клиента); другую страну человек выбирает списком,
 * маска берётся у выбранной страны. detectCountry больше не подставляем:
 * по часовому поясу он ставил +7 тем, у кого на телефоне московское время.
 */
export function PhoneField({ label, country, national, onChange }: PhoneFieldProps) {

  const c = COUNTRIES.find((x) => x.iso === country) ?? COUNTRIES[0];

  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const { iso, national: masked } = parsePhoneInput(el.value, country);
    // значение пишем и в поле: маска могла выбросить символ, а состояние
    // при этом не поменялось бы – и Preact оставил бы его на экране
    el.value = masked;
    onChange(iso, masked);
  };

  return (
    <div class="phone-field">
      <label class="phone-field__country">
        <span aria-hidden="true">
          {c.flag} {c.dial ? `+${c.dial}` : '+'}
        </span>
        <select
          aria-label="Страна номера телефона"
          value={country}
          onChange={(e) => {
            const iso = (e.target as HTMLSelectElement).value;
            const next = COUNTRIES.find((x) => x.iso === iso) ?? c;
            onChange(iso, maskNational(national, next));
          }}
        >
          {COUNTRIES.map((x) => (
            <option value={x.iso} key={x.iso}>
              {x.flag} {x.name}{x.dial ? ` +${x.dial}` : ''}
            </option>
          ))}
        </select>
      </label>
      <input
        class="lead-form__input phone-field__input"
        type="tel"
        name="phone"
        autocomplete="tel"
        inputMode="tel"
        aria-label={label}
        placeholder={c.mask ? c.mask.replace(/#/g, '0') : 'Номер с кодом страны'}
        value={national}
        onInput={onInput}
        required
      />
    </div>
  );
}

/**
 * Согласие на обработку персональных данных по Закону РБ № 99-З.
 * Галочка не стоит заранее и ставится только рукой (ст. 5: согласие –
 * свободное, однозначное). До согласия человеку называют оператора, цель
 * и состав данных, а условия и права – в документах по ссылкам. Согласие
 * и ознакомление с политикой – разные вещи, поэтому и фразы две.
 * Ссылки открываются в новой вкладке: иначе заполненная форма пропадёт.
 * Оператор – по юридическим данным действующего сайта evolutioncar.by.
 */
export function Consent({ agreed, onChange }: { agreed: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class="lead-form__consent">
      <input
        type="checkbox"
        name="consent"
        checked={agreed}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span>
        Даю согласие ООО «Тренд Экспресс Авто» на обработку имени и номера телефона, чтобы со
        мной связались по заявке, на условиях{' '}
        <a href="/agreement/" target="_blank" rel="noopener">
          Согласия на обработку персональных данных
        </a>
        . С{' '}
        <a href="/policy/" target="_blank" rel="noopener">
          Политикой конфиденциальности
        </a>{' '}
        ознакомлен(а).
      </span>
    </label>
  );
}
