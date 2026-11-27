import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Password input with a Show/Hide toggle. The value is hidden again whenever its form submits. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput({ className, ...props }, forwarded) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const local = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const form = local.current?.form;
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener('submit', hide);
    form.addEventListener('reset', hide);
    return () => { form.removeEventListener('submit', hide); form.removeEventListener('reset', hide); };
  }, []);
  return <div className={['password-field', className].filter(Boolean).join(' ')}>
    <input {...props} type={visible ? 'text' : 'password'} autoCapitalize="none" spellCheck={false} ref={element => {
      local.current = element;
      if (typeof forwarded === 'function') forwarded(element); else if (forwarded) forwarded.current = element;
    }}/>
    <button type="button" aria-label={t(visible ? 'hidePassword' : 'showPassword')} aria-pressed={visible} aria-controls={props.id} disabled={props.disabled} onClick={() => setVisible(value => !value)}>{t(visible ? 'hide' : 'show')}</button>
  </div>;
});
