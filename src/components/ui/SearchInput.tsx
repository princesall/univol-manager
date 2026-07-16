import { Search, X } from 'lucide-react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-ink-900/12 bg-white px-3 py-2 focus-within:border-yolk-500 focus-within:ring-2 focus-within:ring-yolk-500/20">
      <Search size={15} className="shrink-0 text-ink-700/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-ink-700/40"
      />
      {value && (
        <button onClick={() => onChange('')} className="shrink-0 text-ink-700/40 hover:text-ink-700">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
