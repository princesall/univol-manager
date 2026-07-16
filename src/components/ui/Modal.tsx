import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-xl2 bg-white shadow-2xl`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-ink-900/8 bg-white px-6 py-4">
          <p className="font-display text-lg font-semibold text-ink-950">{title}</p>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-700/50 hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-800">{label}</label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-ink-900/12 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-700/35 focus:border-yolk-500 focus:ring-2 focus:ring-yolk-500/20'
