'use client';

import { useEffect } from 'react';

export default function CsrfProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async function (input, init) {
        const method = init?.method?.toUpperCase() || 'GET';
        
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const csrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('drevlo_csrf='))
            ?.split('=')[1];

          if (csrfToken) {
            init = init || {};
            if (init.headers instanceof Headers) {
              if (!init.headers.has('x-csrf-token')) {
                init.headers.set('x-csrf-token', csrfToken);
              }
            } else if (Array.isArray(init.headers)) {
              const hasToken = init.headers.some((h) => h[0].toLowerCase() === 'x-csrf-token');
              if (!hasToken) {
                init.headers.push(['x-csrf-token', csrfToken]);
              }
            } else {
              init.headers = { ...init.headers };
              const keys = Object.keys(init.headers);
              const hasToken = keys.some((k) => k.toLowerCase() === 'x-csrf-token');
              if (!hasToken) {
                (init.headers as Record<string, string>)['x-csrf-token'] = csrfToken;
              }
            }
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return null;
}
