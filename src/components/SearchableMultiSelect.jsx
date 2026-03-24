import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

/**
 * Searchable multi-select dropdown.
 * options: [{ id, title }] or [{ id, name }]
 * selected: array of ids
 */
export default function SearchableMultiSelect({ label, options = [], selected = [], onChange, placeholder = 'Search...', loading = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter((opt) => {
    const label = opt.title || opt.name || ''
    return label.toLowerCase().includes(query.toLowerCase())
  })

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const selectedLabels = selected.map((id) => {
    const opt = options.find((o) => o.id === id)
    return opt ? (opt.title || opt.name) : id
  })

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      >
        <span className="truncate text-gray-700 flex-1 mr-2">
          {selected.length === 0
            ? <span className="text-gray-400">None selected</span>
            : selectedLabels.slice(0, 2).join(', ') + (selected.length > 2 ? ` +${selected.length - 2} more` : '')}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedLabels.map((lbl, i) => (
            <span
              key={selected[i]}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
            >
              {lbl}
              <button
                type="button"
                onClick={() => toggle(selected[i])}
                className="hover:text-indigo-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-sm text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-400">No results</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 transition ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className="truncate">{opt.title || opt.name}</span>
                    {isSelected && (
                      <div className="flex-shrink-0 w-4 h-4 bg-indigo-600 rounded-sm flex items-center justify-center ml-2">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
