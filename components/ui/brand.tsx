import { Waves } from 'lucide-react'

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/15">
        <Waves className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-extrabold tracking-tight text-slate-900">
          Лотос<span className="text-cyan-600">.</span>
        </p>
        <p className="text-xs text-slate-500">Кабинет родителя</p>
      </div>
    </div>
  )
}
