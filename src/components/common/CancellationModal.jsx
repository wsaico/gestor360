import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Modal simple para ingresar motivo de cancelación
 */
const CancellationModal = ({ isOpen, onClose, onConfirm, title = 'Cancelar Entrega', message = 'Por favor indique el motivo de la cancelación:' }) => {
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setReason('')
            setError('')
        }
    }, [isOpen])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!reason.trim()) {
            setError('El motivo es obligatorio')
            return
        }
        onConfirm(reason)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="gestor-modal-backdrop">
            <div className="gestor-modal-content max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="gestor-modal-header border-b-0 pb-0">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {title}
                            </h3>
                        </div>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="gestor-modal-body pt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            {message}
                        </p>
                        <div className="space-y-2">
                            <label className="label text-xs uppercase font-bold">Motivo</label>
                            <textarea
                                className={`input w-full resize-none ${error ? 'border-red-500 focus:border-red-500 ring-red-200' : ''}`}
                                rows={3}
                                placeholder="Ej: Error en el registro, devolución inmediata..."
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value)
                                    if (error) setError('')
                                }}
                                autoFocus
                            />
                            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                        </div>
                    </div>

                    <div className="gestor-modal-footer bg-gray-50 dark:bg-gray-800/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            className="btn bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30"
                        >
                            Confirmar Cancelación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CancellationModal
