import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'maxLength'> & {
  value: string; onChange: (value: string) => void; label: string; error?: string | undefined;
};

/** One accessible input keeps paste, mobile autofill and keyboard editing native. */
export const VerificationCodeInput = forwardRef<HTMLInputElement, Props>(function VerificationCodeInput({ value, onChange, label, error, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [focused, setFocused] = useState(false);
  return <div className="verification-code">
    <label htmlFor={inputId}>{label}</label>
    <div className="verification-code-control" data-focused={focused}>
      <div className="verification-code-slots" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <span key={index} className={focused && index === Math.min(value.length, 5) ? 'is-current' : ''}>{value[index] || ''}</span>)}
      </div>
      <input {...props} ref={ref} id={inputId} type="text" inputMode="numeric" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false}
        value={value} maxLength={32} aria-invalid={!!error} aria-describedby={[props['aria-describedby'], error ? inputId + '-error' : undefined].filter(Boolean).join(' ') || undefined}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }}
        onBlur={event => { setFocused(false); props.onBlur?.(event); }}/>
    </div>
    {error && <p id={inputId + '-error'} className="field-error" role="alert">{error}</p>}
  </div>;
});
