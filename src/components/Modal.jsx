import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Componente Modal genérico reutilizable
 * @param {boolean} isOpen - Controla si el modal está visible
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} title - Título del modal
 * @param {ReactNode} children - Contenido del modal
 * @param {string} maxWidth - Clase de ancho máximo (default: max-w-lg)
 */
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    // Cerrar con Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
            document.body.style.overflow = 'hidden' // Prevenir scroll del body
        }
        return () => {
            document.removeEventListener('keydown', handleEsc)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="gestor-modal-backdrop z-50">
            <div className={`gestor-modal-content ${maxWidth} w-full m-4 max-h-[90vh] flex flex-col`}>
                {/* Header */}
                <div className="gestor-modal-header flex items-center justify-between shrink-0">
                    <h3 className="gestor-modal-title">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="gestor-modal-body overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default Modal
