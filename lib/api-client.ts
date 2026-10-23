export async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(15000)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  let response: Response
  try {
    response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new Error(
      timeout.aborted
        ? 'Сервер не ответил вовремя. Повторите попытку.'
        : 'Нет соединения с сервером. Проверьте интернет и повторите попытку.',
    )
  }
  const data = await response.json().catch(() => {
    throw new Error('Не удалось прочитать ответ сервера. Повторите попытку.')
  })
  if (!response.ok) {
    const error = new Error(data?.error || 'Не удалось загрузить данные. Попробуйте ещё раз.') as Error & {
      status: number
    }
    error.status = response.status
    throw error
  }
  try {
    return parseApiResponse(url, data) as T
  } catch {
    throw new Error('Сервис клуба вернул некорректные данные. Обновите страницу или повторите попытку.')
  }
}
import { parseApiResponse } from './response-contracts'
