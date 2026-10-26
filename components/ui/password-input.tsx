'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string
}

export function PasswordInput({ inputClassName = '', disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative mt-2 block">
      <input
        {...props}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        className={
          'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 font-normal text-slate-900 ' +
          inputClassName
        }
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-cyan-700 disabled:opacity-40"
      >
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </span>
  )
}
