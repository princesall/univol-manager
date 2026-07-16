import { type ButtonHTMLAttributes, forwardRef } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
          'disabled:opacity-40 disabled:pointer-events-none',
          size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-xs',
          variant === 'primary' &&
            'bg-yolk-500 text-ink-950 hover:bg-yolk-400 active:bg-yolk-600 shadow-sm',
          variant === 'secondary' &&
            'bg-ink-900 text-parchment-50 hover:bg-ink-800 active:bg-ink-950',
          variant === 'ghost' &&
            'bg-transparent text-ink-700 hover:bg-ink-900/5 active:bg-ink-900/10',
          variant === 'danger' &&
            'bg-signal-red text-parchment-50 hover:brightness-110',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
