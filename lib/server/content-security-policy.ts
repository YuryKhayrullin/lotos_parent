export function contentSecurityPolicy(
  nonce: string,
  development: boolean,
  https: boolean,
  bookingMaps = false,
) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(nonce)) throw new Error('Invalid CSP nonce')
  return (
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (development ? " 'unsafe-eval'" : ''),
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "connect-src 'self'" + (development ? ' ws: wss:' : ''),
      bookingMaps ? 'frame-src https://yandex.ru/map-widget/' : "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(https ? ['upgrade-insecure-requests'] : []),
    ].join('; ') + ';'
  )
}
