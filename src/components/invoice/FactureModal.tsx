import { createPortal } from 'react-dom'
import { Printer, X, FileText, Check } from 'lucide-react'
import { Facture } from '@/components/invoice/Facture'
import { Button } from '@/components/ui/Button'
import type { Vente } from '@/types'

export function FactureModal({ vente, onClose }: { vente: Vente | null; onClose: () => void }) {
  if (!vente) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:p-0">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px] print:hidden" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl2 bg-parchment-100 shadow-2xl print:max-h-none print:overflow-visible print:rounded-none print:shadow-none">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-900/8 bg-white px-6 py-4 print:hidden">
          <p className="font-display text-lg font-semibold text-ink-950">Facture — {vente.reference}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Imprimer
            </Button>
            <button onClick={onClose} className="rounded-md p-1.5 text-ink-700/50 hover:bg-ink-900/5 hover:text-ink-900">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto py-6 print:overflow-visible print:py-0">
          <Facture vente={vente} />
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Petite fenêtre de confirmation affichée juste après l'enregistrement d'une
 * vente, proposant de voir/imprimer la facture immédiatement.
 */
export function PostVenteModal({
  vente,
  onVoirFacture,
  onClose,
}: {
  vente: Vente | null
  onVoirFacture: () => void
  onClose: () => void
}) {
  if (!vente) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl2 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss-500/12 text-moss-600">
          <Check size={22} />
        </div>
        <p className="mt-4 font-display text-lg font-semibold text-ink-950">Vente enregistrée</p>
        <p className="mt-1.5 text-sm text-ink-700/70">
          La facture {vente.reference} pour {vente.clientNom} est prête. Tu peux la consulter et l'imprimer
          maintenant, ou plus tard depuis le module Ventes.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={onVoirFacture}>
            <FileText size={15} /> Voir et imprimer la facture
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Plus tard
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
