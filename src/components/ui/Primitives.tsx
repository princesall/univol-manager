import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl2 border border-ink-900/8 bg-white shadow-panel',
        className
      )}
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-900/6 text-ink-800',
    success: 'bg-moss-500/12 text-moss-600',
    warning: 'bg-yolk-500/15 text-yolk-700',
    danger: 'bg-signal-red/10 text-signal-red',
    info: 'bg-ink-700/8 text-ink-700',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'default',
}: {
  label: string
  value: string
  sub?: string
  icon?: ReactNode
  accent?: 'default' | 'yolk' | 'moss' | 'clay'
}) {
  const accents: Record<string, string> = {
    default: 'text-ink-900',
    yolk: 'text-yolk-600',
    moss: 'text-moss-600',
    clay: 'text-clay-600',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-700/70">{label}</p>
        {icon && <div className="text-ink-700/50">{icon}</div>}
      </div>
      <p className={clsx('mt-2 font-display text-3xl font-semibold', accents[accent])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-700/60">{sub}</p>}
    </Card>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-900/15 bg-ink-900/[0.02] px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-700/70">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
