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

  // Empêche la page située derrière de défiler pendant qu'une fenêtre est
  // ouverte. Sans cela, la molette déplace le contenu masqué : la fenêtre
  // semble « flotter » et le retour à la liste se fait à un endroit imprévu.
  useEffect(() => {
    if (!open) return

    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = precedent
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${width} max-h-[90vh] overflow-y-auto rounded-xl2 bg-white shadow-overlay`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-900/8 bg-white px-6 py-4">
          <p className="font-display text-lg font-semibold text-ink-950">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md p-1.5 text-ink-700/50 transition-colors duration-150 ease-out-soft hover:bg-ink-900/6 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yolk-500"
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
  aide,
}: {
  label: string
  children: ReactNode
  /** Précision affichée sous le champ, quand la saisie prête à confusion. */
  aide?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-800">{label}</label>
      {children}
      {aide && <p className="mt-1 text-2xs text-ink-700/60">{aide}</p>}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-ink-900/12 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors duration-150 ease-out-soft placeholder:text-ink-700/35 focus:border-yolk-500 focus:ring-2 focus:ring-yolk-500/20'
