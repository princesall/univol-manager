import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  /**
   * Affiche un indicateur et neutralise le bouton pendant une action.
   *
   * Sans cet état, un utilisateur qui attend une réponse réseau clique à
   * nouveau — et crée un doublon. C'est le cas typique de l'enregistrement
   * d'une vente.
   */
  chargement?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      chargement = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || chargement}
        aria-busy={chargement || undefined}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-[background-color,box-shadow,transform] duration-150 ease-out-soft',
          // Anneau de focus explicite : indispensable au clavier, et souvent
          // oublié. Sa couleur suit celle du bouton.
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-parchment-50',
          // Léger enfoncement à l'appui : le bouton répond au doigt.
          'active:translate-y-px',
          'disabled:opacity-45 disabled:pointer-events-none',
          size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-xs',

          variant === 'primary' &&
            'bg-yolk-500 text-ink-950 shadow-xs hover:bg-yolk-400 active:bg-yolk-600 focus-visible:ring-yolk-500',

          variant === 'secondary' &&
            'bg-ink-900 text-parchment-50 shadow-xs hover:bg-ink-800 active:bg-ink-950 focus-visible:ring-ink-700',

          variant === 'ghost' &&
            'text-ink-700 hover:bg-ink-900/6 active:bg-ink-900/10 focus-visible:ring-ink-700/40',

          // Une vraie couleur d'état plutôt qu'un filtre de luminosité :
          // le survol reste maîtrisé et cohérent avec la charte.
          variant === 'danger' &&
            'bg-signal-red text-parchment-50 shadow-xs hover:bg-signal-redDark active:bg-signal-redDark focus-visible:ring-signal-red',

          className
        )}
        {...props}
      >
        {chargement && <Loader2 size={15} className="shrink-0 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
