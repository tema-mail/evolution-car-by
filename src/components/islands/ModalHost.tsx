import { useEffect, useRef, useState } from 'preact/hooks';
import Quiz from './Quiz';
import LeadForm from './LeadForm';
import { popups } from '../../content/popups';

type Kind = 'quiz' | 'video' | 'lead' | 'hello' | 'stay' | null;

/** Показанные окна помним на визит: второй раз человека не дёргаем. */
const SEEN = 'ec-popup-seen';
const seen = (k: string): boolean => {
  try { return (sessionStorage.getItem(SEEN) || '').includes(k); } catch { return true; }
};
const markSeen = (k: string): void => {
  try { sessionStorage.setItem(SEEN, (sessionStorage.getItem(SEEN) || '') + k + ','); } catch { /* приватный режим – просто покажем ещё раз */ }
};

interface Props {
  quizTitle: string;
  quizSteps: { q: string; a: string[] }[];
  contactQuestion: string;
  channels: string[];
  success: string;
  videoPoster: string;
}

/** Один диалог на страницу: слушает клики по [data-open] делегированием. */
export default function ModalHost({
  quizTitle,
  quizSteps,
  contactQuestion,
  channels,
  success,
  videoPoster,
}: Props) {
  const [kind, setKind] = useState<Kind>(null);
  // текст нажатой кнопки: заголовок окна и источник заявки в админке
  const [action, setAction] = useState('');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
      if (!trigger) return;
      const value = trigger.dataset.open;
      if (value === 'quiz' || value === 'video' || value === 'lead') {
        e.preventDefault();
        setAction(trigger.textContent?.trim().slice(0, 60) || 'Оставить заявку');
        setKind(value);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Окно по таймеру и окно при уходе. Открываем только если человек сейчас
  // ничего не смотрит сам: перебивать открытый квиз или форму нельзя.
  useEffect(() => {
    // Заявка уже отправлена – больше не предлагаем ничего.
    const done = () => { try { return !!sessionStorage.getItem('ec-lead-sent'); } catch { return false; } };

    let timer = 0;
    if (!seen('hello') && !done()) {
      timer = window.setTimeout(() => {
        setKind((cur) => (cur ? cur : (markSeen('hello'), setAction(popups.hello.title), 'hello')));
      }, popups.delaySec * 1000);
    }

    // Уход со страницы ловим по курсору, уходящему за верхнюю кромку окна:
    // так человек тянется к адресной строке или к крестику вкладки.
    // На телефоне мыши нет, и окно там не показывается вовсе.
    const onLeave = (e: MouseEvent) => {
      if (e.clientY > 8 || e.relatedTarget) return;
      if (seen('stay') || done()) return;
      setKind((cur) => (cur ? cur : (markSeen('stay'), 'stay')));
    };
    // Слушатель включается только после stay.minSec секунд на сайте: до
    // этого окна при уходе нет вообще, даже если курсор ушёл за кромку.
    const fine = window.matchMedia('(pointer: fine)').matches;
    let armTimer = 0;
    let armed = false;
    if (fine) {
      armTimer = window.setTimeout(() => {
        armed = true;
        document.addEventListener('mouseout', onLeave);
      }, popups.stay.minSec * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (armTimer) clearTimeout(armTimer);
      if (armed) document.removeEventListener('mouseout', onLeave);
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (kind && !dialog.open) dialog.showModal();
    if (!kind && dialog.open) dialog.close();
    document.body.style.overflow = kind ? 'hidden' : '';
  }, [kind]);

  return (
    <dialog class="modal" ref={ref} onClose={() => setKind(null)}>
      <button class="modal__close" type="button" onClick={() => setKind(null)} aria-label="Закрыть">
        ✕
      </button>

      {kind === 'quiz' && (
        <Quiz
          title={quizTitle}
          steps={quizSteps}
          contactQuestion={contactQuestion}
          channels={channels}
          success={success}
        />
      )}

      {/* Кнопки, которые никуда не ведут, открывают отдельную заявку:
          человек остаётся там, где нажал, а не уезжает к форме в конце
          страницы. В разметке у них href="#final" – без скриптов сработает
          обычный переход к форме. */}
      {kind === 'lead' && (
        <div class="lead-modal">
          <p class="lead-modal__title">{action}</p>
          <p class="lead-modal__text">
            Оставьте контактные данные – менеджер свяжется с вами и ответит на вопросы.
          </p>
          <LeadForm
            namePlaceholder="Ваше имя"
            phonePlaceholder="Ваш номер телефона"
            cta="Отправить заявку"
            success={success}
            source={`Окно заявки: ${action}`}
          />
        </div>
      )}

      {/* Через 10 секунд: человек ходит по сайту и не решается выбрать.
          Та же форма, что в обычном окне заявки, но со своим текстом и
          своим источником – в кабинете видно, что заявка пришла отсюда. */}
      {kind === 'hello' && (
        <div class="lead-modal">
          <p class="lead-modal__title">{popups.hello.title}</p>
          <p class="lead-modal__text">{popups.hello.text}</p>
          <LeadForm
            namePlaceholder="Ваше имя"
            phonePlaceholder="Ваш номер телефона"
            cta={popups.hello.cta}
            success={success}
            source={popups.hello.source}
          />
          <p class="lead-modal__note">{popups.hello.note}</p>
        </div>
      )}

      {/* При уходе со страницы: вместо «останьтесь» даём причину остаться –
          канал, где наличие обновляется каждый день. Второй кнопкой
          оставляем путь к заявке, чтобы окно не было тупиком. */}
      {kind === 'stay' && (
        <div class="lead-modal">
          <p class="lead-modal__title">{popups.stay.title}</p>
          <p class="lead-modal__text">{popups.stay.text}</p>
          <a
            class="btn lead-modal__tg"
            href={popups.stay.href}
            target="_blank"
            rel="noopener"
            onClick={() => setKind(null)}
          >
            {popups.stay.button}
          </a>
          <button
            class="lead-modal__secondary"
            type="button"
            onClick={() => { setAction(popups.stay.secondary); setKind('lead'); }}
          >
            {popups.stay.secondary}
          </button>
        </div>
      )}

      {kind === 'video' && (
        <figure class="modal__video">
          <img src={videoPoster} alt="" width="900" height="600" />
          <figcaption>
            Видео о сервисе появится здесь, когда клиент передаст исходник или ссылку.
          </figcaption>
        </figure>
      )}
    </dialog>
  );
}
