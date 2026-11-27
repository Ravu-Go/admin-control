import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'maxLength'> & {
  value: string; onChange: (value: string) => void; label: string; error?: string | undefined;
  /** Submit the surrounding form as soon as six digits are entered. Off for forms where the code is not the last step. */
  autoSubmit?: boolean;
};
const LENGTH = 6;

/** Submits only when the rest of the form is filled and its submit button is available, so a partial form never shows premature errors. */
function submitWhenReady(input: HTMLInputElement) {
  const form = input.form;
  // `type` defaults to submit, so read the property rather than the attribute.
  const button = form && Array.from(form.elements).find((element): element is HTMLButtonElement => element instanceof HTMLButtonElement && element.type === 'submit');
  if (!form || !button || button.disabled) return;
  const empty = Array.from(form.elements).some(element => element instanceof HTMLInputElement && element !== input && !element.disabled
    && !['hidden', 'checkbox', 'radio', 'button', 'submit'].includes(element.type) && !element.value);
  if (!empty) form.requestSubmit(button);
}

/** One accessible input keeps paste, mobile autofill and keyboard editing native. */
export const VerificationCodeInput = forwardRef<HTMLInputElement, Props>(function VerificationCodeInput({ value, onChange, label, error, id, autoSubmit = true, ...props }, ref) {
  const generatedId = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const typed = useRef(false);
  const submitted = useRef('');
  // Runs after the new value is committed, so the form's submit handler reads the full code.
  useEffect(() => {
    if (value.length < LENGTH) { submitted.current = ''; return; }
    if (!autoSubmit || !typed.current || submitted.current === value || !input.current) return;
    typed.current = false;
    submitted.current = value;
    submitWhenReady(input.current);
  }, [value, autoSubmit]);
  const inputId = id || generatedId;
  const [focused, setFocused] = useState(false);
  return <div className="verification-code">
    <label htmlFor={inputId}>{label}</label>
    <div className="verification-code-control" data-focused={focused}>
      <div className="verification-code-slots" aria-hidden="true">
        {Array.from({ length: LENGTH }, (_, index) => <span key={index} className={focused && index === Math.min(value.length, LENGTH - 1) ? 'is-current' : ''}>{value[index] || ''}</span>)}
      </div>
      <input {...props} ref={element => { input.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }} id={inputId} type="text" inputMode="numeric" autoComplete={props.autoComplete ?? "one-time-code"} autoCapitalize="none" spellCheck={false}
        value={value} maxLength={32} aria-invalid={!!error} aria-describedby={[props['aria-describedby'], error ? inputId + '-error' : undefined].filter(Boolean).join(' ') || undefined}
        onChange={event => { typed.current = true; onChange(event.target.value.replace(/\D/g, '').slice(0, LENGTH)); }}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}/>
    </div>
    {error && <p id={inputId + '-error'} className="field-error" role="alert">{error}</p>}
  </div>;
});
