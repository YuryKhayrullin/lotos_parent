import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function LegalLinks() {
  return (
    <section
      aria-label="Документы и конфиденциальность"
      className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-cyan-950">
        <ShieldCheck size={17} className="shrink-0 text-cyan-700" />
        Конфиденциальность семьи
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Узнайте, как используются данные родителя и ребёнка и какие cookies нужны для входа.
      </p>
      <nav aria-label="Конфиденциальность и условия" className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Link
          className="flex min-h-11 items-center text-xs font-semibold leading-5 text-cyan-800 underline decoration-cyan-300 underline-offset-4 hover:text-cyan-950"
          href="/legal/privacy"
        >
          Политика конфиденциальности
        </Link>
        <Link
          className="flex min-h-11 items-center text-xs font-medium leading-5 text-cyan-800 hover:underline"
          href="/legal/cookies"
        >
          Использование cookies
        </Link>
        <Link
          className="flex min-h-11 items-center text-xs font-medium leading-5 text-cyan-800 hover:underline"
          href="/legal/consent"
        >
          Согласие на обработку данных · проект
        </Link>
        <Link
          className="flex min-h-11 items-center text-xs font-medium leading-5 text-cyan-800 hover:underline"
          href="/legal/terms"
        >
          Условия кабинета
        </Link>
      </nav>
      <p className="mt-2 border-t border-cyan-100 pt-3 text-xs leading-5 text-slate-500">
        Документы доступны без входа. Проекты документов пока не предлагаются для подписания.
      </p>
    </section>
  )
}
