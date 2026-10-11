import type {
  HTMLAttributes,
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'
import clsx from 'clsx'

/**
 * Tableau de données UniVol.
 *
 * POURQUOI CE COMPOSANT
 *   Les huit pages de listes réécrivaient les mêmes classes, caractère pour
 *   caractère. Toute correction devait donc être répétée huit fois — et
 *   oubliée une fois sur deux. Ces primitives rendent exactement les mêmes
 *   balises HTML, mais depuis un seul endroit.
 *
 * DÉFILEMENT HORIZONTAL
 *   Le conteneur `<div className="overflow-x-auto">` reste à la charge de la
 *   page : il dépend de la mise en page de chaque écran, pas du tableau.
 *
 * NOMBRES
 *   Les chiffres sont à chasse fixe dans toute l'application (voir
 *   `styles/global.css`), ce qui aligne verticalement les montants en FCFA.
 *   utiliser `align="right"` sur les colonnes de chiffres : c'est ce qui rend
 *   une colonne de montants lisible d'un seul coup d'œil.
 */
export function Table({
  children,
  className,
  /** Largeur minimale avant apparition du défilement horizontal. */
  minLargeur = 'min-w-[720px]',
  ...props
}: HTMLAttributes<HTMLTableElement> & { minLargeur?: string }) {
  return (
    <table className={clsx('w-full text-sm', minLargeur, className)} {...props}>
      {children}
    </table>
  )
}

/**
 * En-tête du tableau. Rend lui-même la ligne d'en-tête : les cellules
 * `TH` se placent donc directement à l'intérieur.
 */
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-ink-900/12 bg-ink-900/[0.025] text-left text-2xs font-semibold uppercase tracking-[0.06em] text-ink-700/70">
        {children}
      </tr>
    </thead>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

/**
 * Ligne unique affichée lorsque la liste est vide.
 *
 * Volontairement sans lignes alternées ni survol : ce n'est pas une donnée,
 * c'est un message. Elle occupe toute la largeur et prend un peu de hauteur,
 * pour que l'absence de résultat se lise comme une information, et non comme
 * un défaut d'affichage.
 */
export function TableVide({
  colSpan,
  children,
}: {
  colSpan: number
  children: ReactNode
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-ink-700/55">
        {children}
      </td>
    </tr>
  )
}

/**
 * Ligne de tableau.
 *
 * @param corps Ligne de données : lignes alternées, séparateur discret et
 *              survol chaud. Sans cette propriété, c'est une ligne d'en-tête.
 */
export function TR({
  children,
  corps = false,
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { corps?: boolean }) {
  return (
    <tr
      className={clsx(
        corps &&
          // Lignes alternées : l'œil suit la bonne ligne sur toute la largeur,
          // même quand la ligne est longue. Le survol passe après, donc il
          // l'emporte.
          'border-b border-ink-900/8 transition-colors duration-150 ease-out-soft last:border-0 even:bg-ink-900/[0.015] hover:bg-yolk-500/[0.07]',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TH({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={clsx('px-5 py-3', className)} {...props}>
      {children}
    </th>
  )
}

export function TD({
  children,
  className,
  align,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={clsx(
        'px-5 py-3.5',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}
