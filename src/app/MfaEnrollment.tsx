import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StaffMfaSetup } from '../api/staff-auth';

type Matrix = { size: number; dark: (row: number, column: number) => boolean };

/** Encode locally: the otpauth URI carries the secret, so it must never reach a third-party QR service. */
async function encode(uri: string): Promise<Matrix> {
  const { create } = await import('qrcode');
  const { modules } = create(uri, { errorCorrectionLevel: 'M' });
  return { size: modules.size, dark: (row, column) => !!modules.get(row, column) };
}

function QrCode({ uri, label }: { uri: string; label: string }) {
  const [result, setResult] = useState<{ uri: string; matrix: Matrix | null }>({ uri: '', matrix: null });
  useEffect(() => {
    let live = true;
    encode(uri).then(matrix => { if (live) setResult({ uri, matrix }); }).catch(() => { if (live) setResult({ uri, matrix: null }); });
    return () => { live = false; };
  }, [uri]);
  if (result.uri !== uri) return <div className="mfa-qr" aria-busy="true"/>;
  const matrix = result.matrix;
  if (!matrix) return null; // The manual key below still completes enrollment.
  const quiet = 4;
  const extent = matrix.size + quiet * 2;
  let path = '';
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (matrix.dark(row, column)) path += `M${column + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  return <div className="mfa-qr"><svg viewBox={`0 0 ${extent} ${extent}`} role="img" aria-label={label} shapeRendering="crispEdges">
    <rect className="mfa-qr-quiet" width={extent} height={extent}/><path d={path} fill="currentColor"/>
  </svg></div>;
}

/** Scan-first enrollment with a manual key fallback. */
export function MfaEnrollment({ setup }: { setup: StaffMfaSetup }) {
  const { t } = useTranslation();
  const keyId = useId();
  const [copied, setCopied] = useState(false);
  const grouped = setup.secret.replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') ?? setup.secret;
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <section className="mfa-enrollment" aria-label={t('enrollmentScanTitle')}>
    <QrCode uri={setup.otpauth_uri} label={t('enrollmentQrLabel')}/>
    <div className="mfa-enrollment-copy">
      <h2>{t('enrollmentScanTitle')}</h2>
      <p>{t('enrollmentScanHelp')}</p>
    </div>
    <details className="mfa-manual">
      <summary>{t('enrollmentManual')}</summary>
      <p>{t('enrollmentKeyHelp')}</p>
      <div className="mfa-key-row">
        <code id={keyId} className="enrollment-key" translate="no">{grouped}</code>
        {typeof navigator !== 'undefined' && navigator.clipboard && <button type="button" className="button secondary" aria-describedby={keyId}
          onClick={() => void navigator.clipboard.writeText(setup.secret.replace(/\s+/g, '')).then(() => setCopied(true)).catch(() => setCopied(false))}>
          {t(copied ? 'copied' : 'copyKey')}
        </button>}
        <span className="visually-hidden" role="status">{copied ? t('copied') : ''}</span>
      </div>
    </details>
  </section>;
}
