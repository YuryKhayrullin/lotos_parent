export function contentSecurityPolicy(
  nonce: string,
  development: boolean,
  https: boolean,
  bookingMaps = false,
  bookingImages: string[] = [],
) {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(nonce)) throw new Error('Invalid CSP nonce')
  return (
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (development ? " 'unsafe-eval'" : ''),
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:" + (bookingImages.length ? ' ' + bookingImages.join(' ') : ''),
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

export function bookingImageOrigins(values: Record<string, string | undefined>) {
  const origins: string[] = []
  try {
    const url = new URL(values.CRM_API_URL || '')
    if (
      url.protocol === 'https:' ||
      (['local', 'test'].includes(values.APP_ENV || '') &&
        url.protocol === 'http:' &&
        ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    )
      if (!url.username && !url.password) origins.push(url.origin)
  } catch {}
  for (const host of (values.BOOKING_PHOTO_HOSTS || '').split(',').map((s) => s.trim()))
    if (/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host) && !host.includes('..'))
      origins.push('https://' + host.toLowerCase())
  return [...new Set(origins)]
}
