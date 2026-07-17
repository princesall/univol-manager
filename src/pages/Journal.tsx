import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ScrollText } from 'lucide-react'
import { db, filterActive } from '@/lib/db'
import { Card, EmptyState } from '@/components/ui/Primitives'

export function Journal() {
  const entries = useLiveQuery(() => db.journal.orderBy('horodatage').reverse().toArray().then(filterActive), [])

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Journal d'activités</h1>
        <p className="mt-1 text-sm text-ink-700/60">
          Historique des actions effectuées par les utilisateurs — consultation réservée à l'Administrateur.
        </p>
      </div>

      {!entries || entries.length === 0 ? (
        <EmptyState
          title="Aucune activité enregistrée"
          description="Les actions effectuées dans l'application (créations, modifications) apparaîtront ici avec l'utilisateur et l'horodatage."
        />
      ) : (
        <Card className="divide-y divide-ink-900/6">
          {entries.map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-5 py-3.5">
              <div className="mt-0.5 rounded-full bg-ink-900/[0.04] p-1.5 text-ink-700/50">
                <ScrollText size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900">
                  <span className="font-medium">{e.utilisateurNom}</span> — {e.action}{' '}
                  <span className="font-mono-data text-xs text-ink-700/70">{e.cible}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-700/50">
                  {format(new Date(e.horodatage), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
