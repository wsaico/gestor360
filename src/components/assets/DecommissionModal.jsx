import React, { useState } from 'react'
import { AlertCircle, X, Save } from 'lucide-react'
import { DECOMMISSION_REASONS, DECOMMISSION_REASON_LABELS } from '@/utils/constants'

export default function DecommissionModal({ isOpen, onClose, asset, onConfirm }) {
    const [reason, setReason] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen || !asset) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!reason) return

        setLoading(true)
        try {
            await onConfirm(asset.id, reason, notes)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl relative animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6 text-red-600 dark:text-red-400">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">Dar de Baja Activo</h3>
                </div>

                <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Activo a dar de baja:</p>
                    <p className="font-mono font-bold text-gray-900 dark:text-white mb-1">{asset.asset_code}</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{asset.asset_name}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                            Motivo de Baja <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-500"
                        >
                            <option value="">Seleccione un motivo...</option>
                            {Object.entries(DECOMMISSION_REASONS).map(([key, value]) => (
                                <option key={key} value={value}>
                                    {DECOMMISSION_REASON_LABELS[key] || value}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                            Notas / Observaciones
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Detalle adicional sobre la baja..."
                            className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Procesando...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Confirmar Baja
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
