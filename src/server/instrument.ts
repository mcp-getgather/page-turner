import * as Sentry from '@sentry/node';
import { settings } from './config.js';

if (settings.SENTRY_DSN) {
  Sentry.init({
    dsn: settings.SENTRY_DSN,
    integrations: [
      Sentry.httpIntegration({
        ignoreIncomingRequests: (url) => {
          return (
            url.includes('/health') ||
            url.includes('/_next') ||
            url.includes('/assets')
          );
        },
      }),
      Sentry.expressIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 1 : 0.5,
    environment: process.env.NODE_ENV,
    debug: false,
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        if (
          event.exception?.values?.[0]?.value?.includes('ECONNREFUSED') ||
          event.exception?.values?.[0]?.value?.includes('fetch failed')
        ) {
          return null;
        }
      }
      return event;
    },
    beforeSendTransaction(event) {
      const ignoredPaths = ['/health', '/assets', '/_next', '/favicon'];
      if (ignoredPaths.some((path) => event.transaction?.includes(path))) {
        return null;
      }
      return event;
    },
  });
}
