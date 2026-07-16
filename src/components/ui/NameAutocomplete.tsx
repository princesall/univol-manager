import { useMemo, useRef, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'

export function NameAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
  existeLabel = 'Existant',
  nouveauLabel = 'Sera ajouté automatiquement',
}: {
  value: string
  onChange: (v: string) => void
  suggestions: string[]
  placeholder?: string
  existeLabel?: string
  nouveauLabel?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const correspondanceExacte = useMemo(
    () => suggestions.some((s) => s.trim().toLowerCase() === value.trim().toLowerCase()),
    [suggestions, value]
  )

  const filtrees = useMemo(() => {
    const q = value.trim().toLowerCase()
    const base = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions
    return base.slice(0, 6)
  }, [suggestions, value])

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 rounded-lg border border-ink-900/12 bg-white px-3.5 py-2.5 focus-within:border-yolk-500 focus-within:ring-2 focus-within:ring-yolk-500/20">
        <Search size={15} className="shrink-0 text-ink-700/35" />
        <input
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-700/35"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (blurTimeout.current) clearTimeout(blurTimeout.current)
            setOuvert(true)
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOuvert(false), 120)
          }}
        />
      </div>

      {value.trim() && (
        <p
          className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-medium ${
            correspondanceExacte ? 'text-moss-600' : 'text-ink-700/55'
          }`}
        >
          {correspondanceExacte ? <Check size={11} /> : <Plus size={11} />}
          {correspondanceExacte ? existeLabel : nouveauLabel}
        </p>
      )}

      {ouvert && filtrees.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-ink-900/10 bg-white shadow-panel">
          {filtrees.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(s)
                setOuvert(false)
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 hover:bg-yolk-500/8"
            >
              <Check size={13} className="shrink-0 text-moss-600" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
