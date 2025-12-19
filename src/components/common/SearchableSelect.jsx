import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'

const SearchableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = 'Seleccionar...',
    label,
    disabled = false,
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const wrapperRef = useRef(null)

    // Find selected option object
    const selectedOption = options.find(opt => opt.value === value)

    // Filter options based on search
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        // Close on click outside
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [wrapperRef])

    const handleSelect = (option) => {
        onChange(option.value)
        setIsOpen(false)
        setSearchTerm('')
    }

    const handleClear = (e) => {
        e.stopPropagation()
        onChange('')
        setSearchTerm('')
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div
                className={`input flex items-center justify-between cursor-pointer w-full pr-10 relative ${disabled ? 'bg-gray-100 dark:bg-gray-900 cursor-not-allowed' : 'bg-white dark:bg-gray-800'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="absolute right-2 flex items-center">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black dark:ring-gray-600 ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-200 dark:border-gray-700">
                    <div className="sticky top-0 bg-white dark:bg-gray-800 px-2 py-2 border-b border-gray-100 dark:border-gray-700">
                        <input
                            type="text"
                            className="input input-sm w-full"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {filteredOptions.length === 0 ? (
                        <div className="cursor-default select-none relative py-2 px-4 text-gray-700 dark:text-gray-400">
                            No se encontraron resultados
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 dark:hover:bg-primary-900/20
                                  ${option.value === value ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-900 dark:text-primary-300' : 'text-gray-900 dark:text-gray-200'}
                                  ${option.variant === 'danger' ? 'text-red-600 dark:text-red-400' : ''}
                                  ${option.disabled ? 'opacity-50 bg-gray-50 dark:bg-gray-900' : ''}
                                `}
                                onClick={() => !option.disabled && handleSelect(option)}
                            >
                                <div className="flex items-center">
                                    <span className={`block truncate ${option.value === value ? 'font-semibold' : 'font-normal'}`}>
                                        {option.label}
                                    </span>
                                    {option.subLabel && (
                                        <span className={`ml-2 text-xs truncate ${option.variant === 'danger' ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {option.subLabel}
                                        </span>
                                    )}
                                </div>

                                {option.value === value && (
                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600 dark:text-primary-400">
                                        <Check className="w-5 h-5" />
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default SearchableSelect
