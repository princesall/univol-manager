import { create } from 'zustand'
import { verifierLicence, type LicenceEtat } from '@/lib/licence'

type EtatLicence = 'inconnu' | 'verification' | 'active' | 'inactive'

interface LicenceState {
  etat: EtatLicence
  message: string
  detail: LicenceEtat | null
  verifier: () => Promise<LicenceEtat>
}

export const useLicence = create<LicenceState>((set) => ({
  etat: 'inconnu',
  message: '',
  detail: null,

  verifier: async () => {
    set({ etat: 'verification' })
    const detail = await verifierLicence()
    set({
      etat: detail.actif ? 'active' : 'inactive',
      message: detail.message,
      detail,
    })
    return detail
  },
}))
