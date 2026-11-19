import { useRef, useState, type ChangeEvent, type ComponentPropsWithoutRef, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { requestJson } from '@/lib/api-client'
import type { BookingCategory } from '@/lib/booking-v2'
import { legalOperator } from '@/lib/legal/operator'
import { trialPhone, type TrialRequestConsent } from '@/lib/trial-request'

function ContactField({ label, ...input }: ComponentPropsWithoutRef<'input'> & { label: string }) {
  return (
    <label className="block min-w-0 text-sm font-medium text-[var(--trial-ink)]">
      {label}
      <input
        className="mt-1.5 block min-h-11 w-full min-w-0 rounded-xl border border-[var(--trial-border)] bg-white px-3 text-base font-normal placeholder:text-[var(--trial-secondary)]"
        required
        {...input}
      />
    </label>
  )
}

export function TrialConsultationForm({
  branchId,
  category,
  consent,
}: {
  branchId: string
  category?: BookingCategory
  consent: TrialRequestConsent | null
}) {
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [sentCategory, setSentCategory] = useState<BookingCategory>()
  const submitting = useRef(false)
  const attempt = useRef<{ payload: string; key: string } | null>(null)

  function changePhone(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const { formatted, prefixLength } = trialPhone(input.value)
    const digitsBefore = Math.max(
      0,
      input.value.slice(0, input.selectionStart ?? input.value.length).replace(/[^0-9]/g, '').length -
        prefixLength,
    )
    const caret = Array.from(formatted.matchAll(/[0-9]/g))[digitsBefore - 1]?.index
    setPhone(formatted)
    requestAnimationFrame(() => {
      if (document.activeElement === input) {
        const position = digitsBefore === 0 ? 0 : caret === undefined ? formatted.length : caret + 1
        input.setSelectionRange(position, position)
      }
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!consent || !category || submitting.current) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const national = trialPhone(phone).national
    if (national.length !== 10) {
      setError('Введите 10 цифр номера после +7.')
      form.querySelector<HTMLInputElement>('input[name="phone"]')?.focus()
      return
    }
    const firstName = String(fields.get('firstName') || '').trim()
    const lastName = String(fields.get('lastName') || '').trim()
    if (!firstName || !lastName) {
      setError('Введите имя и фамилию родителя.')
      return
    }
    const data = {
      branchId,
      category,
      firstName,
      lastName,
      email: String(fields.get('email') || '')
        .trim()
        .toLowerCase(),
      phone: '+7' + national,
      childAge: Number(fields.get('childAge')),
      consentVersion: consent.version,
      consentAccepted: fields.has('consent'),
    }
    const payload = JSON.stringify(data)
    const requestKey = attempt.current?.payload === payload ? attempt.current.key : crypto.randomUUID()
    attempt.current = { payload, key: requestKey }
    submitting.current = true
    setPending(true)
    setError('')
    try {
      await requestJson('/api/parent/booking/trial-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, requestKey }),
      })
      setSentCategory(category)
      attempt.current = null
      setPhone('')
      form.reset()
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Не удалось отправить заявку. Попробуйте ещё раз.',
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  if (category && sentCategory === category) {
    return (
      <div role="status" className="rounded-2xl bg-white p-5">
        <CheckCircle2 className="mb-3 size-7 text-emerald-600" aria-hidden="true" />
        <p className="text-lg font-semibold">Заявка получена</p>
        <p className="mt-1 text-sm leading-6 text-[var(--trial-secondary)]">
          Администратор позвонит и поможет подобрать время пробного занятия.
        </p>
      </div>
    )
  }

  return (
    <form aria-busy={pending} className="space-y-3" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactField
          label="Имя родителя"
          name="firstName"
          type="text"
          autoComplete="given-name"
          maxLength={100}
        />
        <ContactField
          label="Фамилия родителя"
          name="lastName"
          type="text"
          autoComplete="family-name"
          maxLength={100}
        />
      </div>
      <ContactField
        label="Электронная почта"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
      />
      <label className="block text-sm font-medium text-[var(--trial-ink)]">
        Номер телефона для звонка
        <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--trial-border)] bg-white px-3 focus-within:ring-2 focus-within:ring-[var(--trial-tint)]">
          <span className="shrink-0 border-r border-[var(--trial-border)] pr-2 text-base" aria-hidden="true">
            +7
          </span>
          <input
            name="phone"
            aria-label="Номер телефона для звонка"
            type="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={changePhone}
            placeholder="(___) ___-__-__"
            className="min-h-11 w-full min-w-0 bg-transparent text-base font-normal focus:outline-none focus-visible:shadow-none"
            required
          />
        </span>
      </label>
      <ContactField
        label="Возраст ребёнка"
        name="childAge"
        type="text"
        inputMode="numeric"
        placeholder="Полных лет"
        maxLength={2}
        pattern="(?:[0-9]|1[0-7])"
        title="Возраст в полных годах от 0 до 17"
      />
      {consent && (
        <label className="flex items-start gap-2.5 rounded-xl bg-white p-3 text-sm leading-5 text-[var(--trial-secondary)]">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 size-4 shrink-0 accent-[var(--trial-tint)]"
          />
          <span>
            Я даю{' '}
            <a
              href={consent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--trial-tint)] underline underline-offset-2"
            >
              согласие на обработку данных
            </a>{' '}
            для ответа на заявку.
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!consent || pending}
        className="mt-1 min-h-12 w-full rounded-xl bg-[var(--trial-tint)] px-4 text-center text-sm font-semibold text-white enabled:hover:bg-[#004e9e] disabled:bg-[var(--trial-fill)] disabled:text-[var(--trial-secondary)]"
      >
        {pending ? 'Отправляем…' : 'Проконсультироваться'}
      </button>
      {!consent && (
        <p className="text-center text-sm leading-5 text-[var(--trial-secondary)]">
          Для консультации можно{' '}
          <a
            href={legalOperator.phoneHref}
            className="font-medium text-[var(--trial-tint)] underline-offset-2 hover:underline"
          >
            позвонить в клуб
          </a>
          .
        </p>
      )}
    </form>
  )
}
