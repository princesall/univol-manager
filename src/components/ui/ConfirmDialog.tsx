import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Supprimer',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl2 bg-white p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-signal-red/10 text-signal-red">
          <AlertTriangle size={20} />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink-950">{title}</p>
        <p className="mt-1.5 text-sm text-ink-700/70">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
