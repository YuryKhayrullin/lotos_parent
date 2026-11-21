import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, MapPin, Navigation, Phone, TrainFront, Waves, X } from 'lucide-react'
import { TrialConsultationForm } from './trial-consultation-form'
import { bookingMapUrl } from '@/lib/booking-contracts'
import { ageLabel, priceLabel } from '@/lib/booking-v2'
import { legalOperator } from '@/lib/legal/operator'
import type { TrialLocation } from '@/lib/trial-locations'
import type { TrialRequestConsent } from '@/lib/trial-request'

function displayAddress(branch: TrialLocation) {
  return `${branch.city}, ${branch.address}`
}

function LocationPin() {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--trial-tint-soft)] text-[var(--trial-tint)]"
      aria-hidden="true"
    >
      <MapPin size={13} strokeWidth={2.25} />
    </span>
  )
}

function MetroMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 text-[#c62535]"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M1 12h4v-1.4H3.9l1.5-4.1L8 10.3l2.6-3.8 1.5 4.1H11V12h4v-1.4h-.9L11.2 3 8 7.5 4.8 3l-2.9 7.6H1Z" />
    </svg>
  )
}

function PoolPhoto({
  branch,
  className,
  alt = '',
}: {
  branch: TrialLocation
  className: string
  alt?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <span
      className={`relative flex items-center justify-center overflow-hidden bg-[var(--trial-tint-soft)] ${className}`}
    >
      {imageFailed ? (
        <Waves className="size-6 text-[var(--trial-tint)]" aria-hidden="true" />
      ) : (
        <Image
          src={branch.photoUrl}
          alt={alt}
          fill
          unoptimized
          onError={() => setImageFailed(true)}
          className="object-cover"
        />
      )}
    </span>
  )
}

export function TrialPoolCard({ branch, open }: { branch: TrialLocation; open: () => void }) {
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="group grid w-full grid-cols-[4.5rem_minmax(0,1fr)_1rem] items-center gap-3 rounded-[1.25rem] border border-[var(--trial-border)] bg-white p-3 text-left shadow-[0_2px_6px_rgb(23_23_35/3%)] transition-colors hover:border-[#bcd5f4] active:bg-[var(--trial-tint-soft)] sm:grid-cols-[6rem_minmax(0,1fr)_1rem] sm:p-4"
    >
      <PoolPhoto branch={branch} className="aspect-[5/4] rounded-[0.875rem]" />
      <span className="min-w-0 break-words">
        <span className="block text-[1.0625rem] leading-snug font-semibold tracking-[-0.015em] sm:text-lg">
          {branch.name}
        </span>
        <span className="mt-1 flex items-start gap-1.5 text-sm leading-5 text-[var(--trial-secondary)]">
          <LocationPin />
          <span className="min-w-0 text-pretty">{displayAddress(branch)}</span>
        </span>
        {branch.metro && (
          <span
            data-transit={branch.transit}
            className="mt-1.5 flex items-center gap-1.5 text-xs leading-snug font-semibold text-[var(--trial-tint)]"
          >
            {branch.transit === 'mcd' ? (
              <TrainFront size={14} className="shrink-0" aria-hidden="true" />
            ) : (
              <>
                <MetroMark />
                <span className="sr-only">Метро: </span>
              </>
            )}
            <span>{branch.metro}</span>
          </span>
        )}
      </span>
      <ChevronRight
        className="text-[var(--trial-tint)] transition-transform group-hover:translate-x-0.5"
        size={16}
        aria-hidden="true"
      />
    </button>
  )
}

export function TrialPoolDialog({
  branch,
  consent,
  close,
}: {
  branch: TrialLocation
  consent: TrialRequestConsent | null
  close: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const lastChoice = useRef<HTMLButtonElement>(null)
  const [selectedCategory, setSelectedCategory] = useState<
    TrialLocation['offers'][number]['category'] | null
  >(null)
  const selectedOffer = branch.offers.find((offer) => offer.category === selectedCategory)
  const heading = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = overflow
      opener?.focus()
    }
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      if (dialog.current) dialog.current.scrollTop = 0
      title.current?.focus({ preventScroll: true })
    } else {
      lastChoice.current?.focus()
    }
  }, [selectedCategory])

  return (
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close()
      }}
      className="portal-dialog portal-scrollbar fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-0 bg-[#f2f2f7] p-0 text-[var(--trial-ink)] shadow-[var(--shadow-float)] sm:rounded-[1.75rem]"
    >
      <div className="relative bg-white p-5 sm:p-6">
        <div className="pr-14">
          {selectedOffer ? (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="-ml-1.5 flex min-h-11 items-center gap-1 rounded-lg text-sm font-medium text-[var(--trial-tint)]"
            >
              <ChevronLeft size={18} aria-hidden="true" /> Направления
            </button>
          ) : (
            <p className="text-sm font-medium text-[var(--trial-tint)]">Пробное занятие</p>
          )}
          <h2
            id={heading}
            ref={title}
            tabIndex={selectedOffer ? -1 : undefined}
            className="mt-1 break-words text-[1.6875rem] leading-tight font-bold tracking-[-0.035em] focus:outline-none"
          >
            {selectedOffer ? 'Заявка на пробное' : branch.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={selectedOffer ? 'Закрыть форму' : 'Закрыть условия бассейна'}
          className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full bg-[var(--trial-fill)] text-[var(--trial-secondary)] hover:bg-[var(--trial-tint-soft)] sm:top-6 sm:right-6"
        >
          <X size={20} aria-hidden="true" />
        </button>
        {selectedOffer ? (
          <p className="mt-2 text-pretty text-sm leading-5 text-[var(--trial-secondary)]">
            {branch.name} · {selectedOffer.title}
          </p>
        ) : (
          <>
            <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-[var(--trial-secondary)]">
              <LocationPin />
              <span className="text-pretty">
                {displayAddress(branch)}
                {branch.metro ? ` · ${branch.metro}` : ''}
              </span>
            </p>
            {branch.arrivalText && (
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-5 text-[var(--trial-secondary)]">
                {branch.arrivalText}
              </p>
            )}
          </>
        )}
      </div>
      <div hidden={!selectedOffer} className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <TrialConsultationForm
          branchId={selectedOffer?.branchId ?? null}
          category={selectedOffer?.category}
          consent={consent}
        />
      </div>
      <div
        hidden={Boolean(selectedOffer)}
        className="space-y-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6"
      >
        <PoolPhoto branch={branch} alt={branch.name} className="aspect-[2/1] rounded-2xl" />
        {branch.offers.length > 0 && (
          <div className="divide-y divide-[var(--trial-border)] overflow-hidden rounded-[1.125rem] bg-white">
            {branch.offers.map((offer) => (
              <button
                key={offer.category}
                type="button"
                onClick={(event) => {
                  lastChoice.current = event.currentTarget
                  setSelectedCategory(offer.category)
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[var(--trial-tint-soft)] focus-visible:outline-offset-[-2px] active:bg-[var(--trial-tint-soft)]"
              >
                <span className="min-w-0">
                  <span className="block break-words text-base font-semibold">{offer.title}</span>
                  <span className="mt-1 block text-sm text-[var(--trial-secondary)]">
                    {priceLabel(offer.trialPriceMinor)}
                  </span>
                  {(offer.minAgeMonths !== null || offer.maxAgeMonths !== null) && (
                    <span className="mt-1 block text-sm text-[var(--trial-secondary)]">
                      Возраст{offer.minAgeMonths !== null ? ` от ${ageLabel(offer.minAgeMonths)}` : ''}
                      {offer.maxAgeMonths !== null ? ` до ${ageLabel(offer.maxAgeMonths)}` : ''}
                    </span>
                  )}
                </span>
                <ChevronRight className="shrink-0 text-[var(--trial-tint)]" size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        <p className="text-sm leading-5 text-[var(--trial-secondary)]">
          Администратор расскажет о первом занятии и подберёт удобное время.
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
          <a
            href={legalOperator.phoneHref}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--trial-tint)] px-3 py-2 text-center text-sm font-semibold text-white hover:bg-[#004e9e]"
          >
            <Phone size={17} className="shrink-0" aria-hidden="true" />
            Позвонить в клуб
          </a>
          <a
            href={bookingMapUrl(branch)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-[var(--trial-tint)] hover:bg-[var(--trial-tint-soft)]"
          >
            <Navigation size={15} aria-hidden="true" /> Маршрут
          </a>
        </div>
      </div>
    </dialog>
  )
}
