import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  Header,
  Footer,
  PageNumber,
} from 'docx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ENTREPRISE } from '@/config/entreprise'

// Palette reprise du design system de l'app.
const VERT_FONCE = '151F18'
const OR = 'C4841D'
const OR_CLAIR = 'F5E6C8'
const GRIS_TEXTE = '3A4E40'
const GRIS_CLAIR = 'F5F1E6'
const BORDURE = 'D8D2C4'
const VERT_POSITIF = '3C5F39'
const ROUGE_NEGATIF = 'C1442C'

let logoCache: Uint8Array | null = null
async function chargerLogo(): Promise<Uint8Array | null> {
  if (logoCache) return logoCache
  try {
    const res = await fetch('/logo.jpg')
    if (!res.ok) return null
    logoCache = new Uint8Array(await res.arrayBuffer())
    return logoCache
  } catch {
    return null
  }
}

const bordureLegere = {
  top: { style: BorderStyle.SINGLE, size: 2, color: BORDURE },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDURE },
  left: { style: BorderStyle.SINGLE, size: 2, color: BORDURE },
  right: { style: BorderStyle.SINGLE, size: 2, color: BORDURE },
}

function celluleEntete(texte: string, alignement: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: VERT_FONCE, fill: VERT_FONCE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: bordureLegere,
    children: [
      new Paragraph({
        alignment: alignement,
        children: [new TextRun({ text: texte, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
      }),
    ],
  })
}

function celluleDonnee(
  texte: string,
  options: { alignement?: (typeof AlignmentType)[keyof typeof AlignmentType]; fond?: string; gras?: boolean; couleur?: string } = {}
) {
  return new TableCell({
    shading: options.fond ? { type: ShadingType.SOLID, color: options.fond, fill: options.fond } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    borders: bordureLegere,
    children: [
      new Paragraph({
        alignment: options.alignement ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text: texte,
            size: 18,
            font: 'Calibri',
            bold: options.gras,
            color: options.couleur ?? '28392E',
          }),
        ],
      }),
    ],
  })
}

async function construireEntete(sousTitre: string) {
  const logo = await chargerLogo()
  const elements: Paragraph[] = []

  if (logo) {
    elements.push(
      new Paragraph({
        children: [new ImageRun({ data: logo, transformation: { width: 64, height: 64 }, type: 'jpg' })],
      })
    )
  }

  elements.push(
    new Paragraph({
      spacing: { before: 120, after: 0 },
      children: [new TextRun({ text: ENTREPRISE.nom, bold: true, size: 40, font: 'Georgia', color: VERT_FONCE })],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: ENTREPRISE.slogan, italics: true, size: 20, font: 'Calibri', color: GRIS_TEXTE })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${ENTREPRISE.adresse} · ${ENTREPRISE.telephone} · ${ENTREPRISE.email}`,
          size: 16,
          font: 'Calibri',
          color: '6B6558',
        }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: OR, space: 8 } },
    }),
    new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: sousTitre.toUpperCase(), bold: true, size: 28, font: 'Calibri', color: VERT_FONCE })],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Généré le ${format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
          italics: true,
          size: 16,
          color: '6B6558',
        }),
      ],
    })
  )

  return elements
}

function piedDePage() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${ENTREPRISE.nom} — Document généré automatiquement par UniVol Manager — Page `,
            size: 14,
            color: '9B9484',
            italics: true,
          }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '9B9484', italics: true }),
        ],
      }),
    ],
  })
}

async function telechargerDocument(doc: Document, nomFichier: string) {
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}

export interface LigneProduction {
  reference: string
  dateMiseEnCouveuse: string
  dateEclosion: string
  oeufs: number
  poussinsEclos: number | string
  tauxEclosion: number | string
}

export async function exporterRapportProductionWord(lignes: LigneProduction[], tauxMoyen: number, nbLotsClos: number) {
  const entete = await construireEntete('Rapport de production')

  const resumeTexte = new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({
        text: `Sur l'ensemble des lots enregistrés, ${nbLotsClos} lot(s) ont atteint l'éclosion, avec un taux d'éclosion moyen de ${tauxMoyen}%. Le détail complet de chaque lot — de la mise en couveuse à l'éclosion — figure dans le tableau ci-dessous.`,
        size: 20,
        font: 'Calibri',
        color: '28392E',
      }),
    ],
  })

  const entetesColonnes = ['Référence', 'Mise en couveuse', "Date d'éclosion", 'Œufs', 'Poussins éclos', "Taux d'éclosion"]
  const lignesTableau = lignes.map((l, i) => {
    const fond = i % 2 === 1 ? GRIS_CLAIR : undefined
    const taux = typeof l.tauxEclosion === 'number' ? `${l.tauxEclosion}%` : String(l.tauxEclosion)
    return new TableRow({
      children: [
        celluleDonnee(l.reference, { fond, gras: true }),
        celluleDonnee(l.dateMiseEnCouveuse, { fond, alignement: AlignmentType.CENTER }),
        celluleDonnee(l.dateEclosion, { fond, alignement: AlignmentType.CENTER }),
        celluleDonnee(String(l.oeufs), { fond, alignement: AlignmentType.RIGHT }),
        celluleDonnee(String(l.poussinsEclos), { fond, alignement: AlignmentType.RIGHT }),
        celluleDonnee(taux, { fond, alignement: AlignmentType.RIGHT, gras: true }),
      ],
    })
  })

  const tableau = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: entetesColonnes.map((t, i) => celluleEntete(t, i === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT)) }),
      ...lignesTableau,
    ],
  })

  const doc = new Document({
    sections: [
      {
        footers: { default: piedDePage() },
        properties: { page: { margin: { top: 700, bottom: 700, left: 800, right: 800 } } },
        children: [...entete, resumeTexte, tableau],
      },
    ],
  })

  await telechargerDocument(doc, `rapport-production-${format(new Date(), 'yyyy-MM-dd')}.docx`)
}

export interface LigneFinanciere {
  type: 'Vente' | 'Dépense' | 'Achat'
  reference: string
  tiers: string
  montant: number
  statut: string
  date: string
}

export async function exporterRapportFinancierWord(
  lignes: LigneFinanciere[],
  resume: { ventes: number; depenses: number; achats: number; net: number }
) {
  const entete = await construireEntete('Rapport financier')

  const phraseResultat =
    resume.net >= 0
      ? `un résultat net positif de ${resume.net.toLocaleString('fr-FR')} FCFA`
      : `un résultat net négatif de ${Math.abs(resume.net).toLocaleString('fr-FR')} FCFA`
  const resumeTexte = new Paragraph({
    spacing: { after: 250 },
    children: [
      new TextRun({
        text: `Sur la période couverte par ce rapport, l'entreprise enregistre ${resume.ventes.toLocaleString('fr-FR')} FCFA de ventes, pour ${resume.achats.toLocaleString('fr-FR')} FCFA d'achats et ${resume.depenses.toLocaleString('fr-FR')} FCFA de dépenses, soit ${phraseResultat}.`,
        size: 20,
        font: 'Calibri',
        color: '28392E',
      }),
    ],
  })

  function ligneResume(label: string, valeur: number, accent = false) {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          shading: accent ? { type: ShadingType.SOLID, color: OR_CLAIR, fill: OR_CLAIR } : undefined,
          borders: bordureLegere,
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: VERT_FONCE })] })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          shading: accent ? { type: ShadingType.SOLID, color: OR_CLAIR, fill: OR_CLAIR } : undefined,
          borders: bordureLegere,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: `${valeur.toLocaleString('fr-FR')} FCFA`,
                  bold: true,
                  size: 20,
                  color: accent ? (valeur >= 0 ? VERT_POSITIF : ROUGE_NEGATIF) : '28392E',
                }),
              ],
            }),
          ],
        }),
      ],
    })
  }

  const tableauResume = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: [
      ligneResume('Total ventes', resume.ventes),
      ligneResume('Total achats', resume.achats),
      ligneResume('Total dépenses', resume.depenses),
      ligneResume('Résultat net', resume.net, true),
    ],
  })

  const espaceApresResume = new Paragraph({ spacing: { before: 300, after: 200 }, children: [] })

  const entetesColonnes = ['Type', 'Référence', 'Tiers', 'Montant (FCFA)', 'Statut', 'Date']
  const lignesTableau = lignes.map((l, i) => {
    const fond = i % 2 === 1 ? GRIS_CLAIR : undefined
    return new TableRow({
      children: [
        celluleDonnee(l.type, { fond }),
        celluleDonnee(l.reference, { fond }),
        celluleDonnee(l.tiers, { fond }),
        celluleDonnee(l.montant.toLocaleString('fr-FR'), { fond, alignement: AlignmentType.RIGHT, gras: true }),
        celluleDonnee(l.statut, { fond, alignement: AlignmentType.CENTER }),
        celluleDonnee(l.date, { fond, alignement: AlignmentType.CENTER }),
      ],
    })
  })

  const tableauDetail = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: entetesColonnes.map((t, i) => celluleEntete(t, i >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT)) }),
      ...lignesTableau,
    ],
  })

  const titreDetail = new Paragraph({
    spacing: { before: 100, after: 150 },
    children: [new TextRun({ text: 'Détail des transactions', bold: true, size: 22, color: VERT_FONCE })],
  })

  const doc = new Document({
    sections: [
      {
        footers: { default: piedDePage() },
        properties: { page: { margin: { top: 700, bottom: 700, left: 800, right: 800 } } },
        children: [...entete, resumeTexte, tableauResume, espaceApresResume, titreDetail, tableauDetail],
      },
    ],
  })

  await telechargerDocument(doc, `rapport-financier-${format(new Date(), 'yyyy-MM-dd')}.docx`)
}
