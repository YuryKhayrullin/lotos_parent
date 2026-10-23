import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, Mail, Phone, ShieldCheck } from 'lucide-react'
import { isLegalSlug, legalDocuments, legalVersion } from '@/lib/legal/documents'
import { legalOperator } from '@/lib/legal/operator'

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params
  return { title: isLegalSlug(document) ? legalDocuments[document].title + ' — LOTOS' : 'Документ — LOTOS' }
}
export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params
  if (!isLegalSlug(document)) notFound()
  const value = legalDocuments[document]
  return (
    <main className="mx-auto max-w-4xl px-4 py-7 sm:px-8 sm:py-12">
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-cyan-800"
      >
        <ArrowLeft size={17} /> Ко входу в кабинет
      </Link>
      <header className="mt-5 rounded-3xl border border-cyan-100 bg-white p-6 sm:p-9">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <ShieldCheck size={18} /> LOTOS · данные семьи
        </span>
        <h1 className="mt-4 break-words text-2xl font-bold tracking-tight sm:text-4xl">{value.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{value.summary}</p>
        <p className="mt-4 text-xs text-slate-500">Редакция {legalVersion}</p>
        <p
          role="note"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          Проект: ИНН, почтовый адрес, сроки хранения и окончательные условия обработки ещё уточняются. Этот
          документ пока не предлагается для подписания; вход и закрытие уведомления о cookies не считаются его
          принятием.
        </p>
      </header>
      <section
        aria-labelledby="operator-contacts"
        className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="operator-contacts" className="text-base font-semibold text-slate-900">
            Вопросы о персональных данных
          </h2>
          <p className="text-sm text-slate-600">{legalOperator.displayName}</p>
        </div>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          {[
            ['ОГРНИП', legalOperator.ogrnip],
            ['Дата регистрации', legalOperator.registrationDate],
            ['Область действия', legalOperator.branchScope],
          ].map(([label, text]) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 font-medium text-slate-800">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Для уточнения данных, вопросов о доступе или отзыва согласия свяжитесь с клубом.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
          <a
            href={'mailto:' + legalOperator.email}
            className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold text-cyan-800"
          >
            <Mail size={17} className="shrink-0" />
            <span className="break-all">{legalOperator.email}</span>
          </a>
          <a
            href={legalOperator.phoneHref}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-cyan-800"
          >
            <Phone size={17} className="shrink-0" />
            {legalOperator.phone}
          </a>
        </div>
      </section>
      <nav aria-label="Документы кабинета" className="my-6 flex flex-wrap gap-2">
        {Object.entries(legalDocuments).map(([slug, doc]) => (
          <Link
            key={slug}
            href={'/legal/' + slug}
            aria-current={document === slug ? 'page' : undefined}
            className={
              'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ' +
              (document === slug
                ? 'border-cyan-200 bg-cyan-50 text-cyan-900'
                : 'border-slate-200 bg-white text-slate-600')
            }
          >
            <FileText size={15} className="shrink-0" />
            {doc.title}
          </Link>
        ))}
      </nav>
      <nav
        aria-label="Содержание документа"
        className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
      >
        <p className="text-sm font-semibold text-slate-900">В этом документе</p>
        <ol className="mt-3 grid gap-x-5 gap-y-1 sm:grid-cols-2">
          {value.sections.map((section, index) => (
            <li key={section.title}>
              <a
                href={'#section-' + (index + 1)}
                className="flex min-h-11 items-center text-xs leading-5 text-cyan-800 hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article className="space-y-5">
        {value.sections.map((section, index) => (
          <section
            id={'section-' + (index + 1)}
            key={section.title}
            className="scroll-mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8"
          >
            <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {section.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </section>
        ))}
      </article>
    </main>
  )
}
