import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ENTREPRISE } from '@/config/entreprise'
import type { Vente } from '@/types'

const LABEL_TYPE: Record<string, string> = {
  poussin: 'Poussins d\u2019un jour',
  poulet: 'Poulets',
  chevre: 'Chèvres',
  mouton: 'Moutons',
  boeuf: 'Bœufs',
  autre: 'Volaille',
}

const LABEL_STATUT: Record<string, string> = {
  paye: 'Payée intégralement',
  partiel: 'Paiement partiel',
  attente: 'En attente de paiement',
}

export function Facture({ vente }: { vente: Vente }) {
  const reste = vente.montantTotal - vente.montantPaye

  return (
    <div
      id="facture-imprimable"
      className="mx-auto w-full max-w-[210mm] bg-white p-[14mm] text-ink-950"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between border-b-2 border-ink-950 pb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt={ENTREPRISE.nom} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          <div>
            <p className="font-display text-xl font-bold leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              {ENTREPRISE.nom}
            </p>
            <p className="text-xs text-ink-700">{ENTREPRISE.slogan}</p>
            <p className="mt-1 text-[11px] text-ink-700/70">
              {ENTREPRISE.adresse} · {ENTREPRISE.telephone}
            </p>
            <p className="text-[11px] text-ink-700/70">{ENTREPRISE.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            FACTURE
          </p>
          <p className="mt-1 font-mono-data text-sm text-ink-700">{vente.reference}</p>
          <p className="mt-2 text-xs text-ink-700/70">
            Émise le {format(new Date(vente.dateVente), 'd MMMM yyyy', { locale: fr })}
          </p>
        </div>
      </div>

      {/* Facturé à */}
      <div className="mt-8 flex justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-700/60">Facturé à</p>
          <p className="mt-1.5 text-base font-semibold text-ink-950">{vente.clientNom}</p>
          {vente.clientTelephone && <p className="text-xs text-ink-700/70">{vente.clientTelephone}</p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-700/60">Statut du paiement</p>
          <p
            className="mt-1.5 inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor:
                vente.statutPaiement === 'paye' ? '#4F7A4A22' : vente.statutPaiement === 'partiel' ? '#E6A22E22' : '#C1442C1A',
              color: vente.statutPaiement === 'paye' ? '#3C5F39' : vente.statutPaiement === 'partiel' ? '#96631A' : '#C1442C',
            }}
          >
            {LABEL_STATUT[vente.statutPaiement]}
          </p>
          {vente.bandeRef && <p className="mt-1.5 text-[11px] text-ink-700/60">Bande d'origine : {vente.bandeRef}</p>}
        </div>
      </div>

      {/* Table des articles */}
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink-950">
            <th className="py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-700/70">Désignation</th>
            <th className="py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-700/70">Quantité</th>
            <th className="py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-700/70">Prix unitaire</th>
            <th className="py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-700/70">Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-ink-900/10">
            <td className="py-3.5 text-ink-900">{LABEL_TYPE[vente.type] ?? vente.type}</td>
            <td className="py-3.5 text-right text-ink-700">{vente.quantite.toLocaleString('fr-FR')}</td>
            <td className="py-3.5 text-right text-ink-700">{vente.prixUnitaire.toLocaleString('fr-FR')} FCFA</td>
            <td className="py-3.5 text-right font-medium text-ink-950">{vente.montantTotal.toLocaleString('fr-FR')} FCFA</td>
          </tr>
        </tbody>
      </table>

      {/* Totaux */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-ink-700">Montant total</span>
            <span className="font-medium text-ink-950">{vente.montantTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-700">Montant payé</span>
            <span className="font-medium text-ink-950">{vente.montantPaye.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="mt-1.5 flex justify-between border-t-2 border-ink-950 pt-1.5 text-base">
            <span className="font-semibold text-ink-950">Reste à payer</span>
            <span className="font-bold text-ink-950">{reste.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-20 grid grid-cols-2 gap-12">
        <div>
          <div className="h-16 border-b border-ink-900/40" />
          <p className="mt-2 text-xs font-medium text-ink-900">Le client</p>
          <p className="text-[10px] text-ink-700/60">Nom et signature</p>
        </div>
        <div>
          <div className="h-16 border-b border-ink-900/40" />
          <p className="mt-2 text-xs font-medium text-ink-900">Pour {ENTREPRISE.nom}</p>
          <p className="text-[10px] text-ink-700/60">Nom, fonction et signature</p>
        </div>
      </div>

      {/* Pied de page */}
      <p className="mt-16 border-t border-ink-900/10 pt-4 text-center text-[10px] text-ink-700/50">
        Merci de votre confiance — {ENTREPRISE.nom}, {ENTREPRISE.adresse}
      </p>
    </div>
  )
}
