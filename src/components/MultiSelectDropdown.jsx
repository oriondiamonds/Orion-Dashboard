import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-48 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      >
        <span className="truncate text-gray-700">
          {selected.length === 0 ? 'All' : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 border-b border-gray-100 flex items-center gap-2"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
          {options && options.length > 0 ? (
            options.map((option) => {
              const value = typeof option === 'string' ? option : option.code || option.id || option.name
              const displayLabel = typeof option === 'string' ? option : option.name || option.code || option.id
              const isSelected = selected.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleOption(value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{displayLabel}</span>
                  {isSelected && (
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-6 text-sm text-gray-500 text-center">No options available</div>
          )}
        </div>
      )}
    </div>
  )
}
