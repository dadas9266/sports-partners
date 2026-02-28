// src/lib/client-logger.ts
// Basit merkezi client-side logger (geliştirilebilir)
export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string, meta?: any) {
  if (typeof window === 'undefined') return;
  const payload = { level, message, meta, time: new Date().toISOString() };
  // Geliştirilebilir: Sunucuya gönder, Sentry/LogRocket entegrasyonu vb.
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error('[ClientError]', payload);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn('[ClientWarn]', payload);
  } else {
    // eslint-disable-next-line no-console
    console.info('[ClientInfo]', payload);
  }
}

export function logError(error: Error, meta?: any) {
  log('error', error.message, { ...meta, stack: error.stack });
}
