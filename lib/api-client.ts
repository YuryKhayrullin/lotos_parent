export type RequestError = Error & { status?: number; code?: string; requestId?: string }
export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    const failure = new Error(
      timeout.aborted
        ? 'Сервер не ответил вовремя. Повторите попытку.'
        : 'Нет соединения с сервером. Проверьте интернет и повторите попытку.',
    ) as RequestError
    failure.status = 0
    failure.code = timeout.aborted ? 'TIMEOUT' : 'NETWORK'
    throw failure
  }
  const data = await response.json().catch(() => {
    throw new Error('Не удалось прочитать ответ сервера. Повторите попытку.')
  })
  if (!response.ok) {
    const error = new Error(data?.error || 'Не удалось загрузить данные. Попробуйте ещё раз.') as RequestError
    error.status = response.status
    error.code = typeof data?.code === 'string' ? data.code : 'HTTP_' + response.status
    error.requestId = response.headers.get('x-request-id') || undefined
    throw error
  }
  try {
    return parseApiResponse(url, data) as T
  } catch {
    throw new Error('Сервис клуба вернул некорректные данные. Обновите страницу или повторите попытку.')
  }
}
import { parseApiResponse } from './response-contracts'
