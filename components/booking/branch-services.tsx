import { ChevronDown, ChevronRight, CreditCard, MapPin, UserRound, UsersRound } from 'lucide-react'
import { bookingBranchUrl, bookingCityUrl, type BookingBranch } from '@/lib/booking-contracts'
export function BranchServices({ branch }: { branch: BookingBranch }) {
  const path = bookingBranchUrl(branch.id)
  return (
    <>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
        {branch.city} · Лотос
      </p>
      <a href={bookingCityUrl(branch.city)} className="flex items-start gap-3">
        <h1 className="min-w-0 flex-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {branch.name}
        </h1>
        <ChevronDown className="mt-2 shrink-0 text-slate-400" size={20} />
      </a>
      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-slate-500">
        <MapPin size={17} className="mt-1 shrink-0 text-cyan-600" />
        {branch.address}
      </p>
      <div className="mt-8 space-y-3">
        {[
          {
            href: path + '?service=individual',
            label: 'Индивидуальные занятия',
            description: 'Тренировка с тренером один на один',
            Icon: UserRound,
          },
          {
            href: path + '?service=group',
            label: 'Групповые занятия',
            description: 'Выберите направление, день и время',
            Icon: UsersRound,
          },
          {
            href: path + '?service=subscription',
            label: 'Абонементы',
            description: 'Ваш абонемент и история оплат',
            Icon: CreditCard,
          },
        ].map(({ href, label, description, Icon }) => (
          <a
            key={href}
            href={href}
            className="group flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-cyan-300 hover:bg-cyan-50/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Icon size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-slate-300 group-hover:text-cyan-700" />
          </a>
        ))}
      </div>
    </>
  )
}
