import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useNotification } from '@contexts/NotificationContext'
import eppInventoryService from '@services/eppInventoryService'

const AddStockModal = ({ show, onClose, item, onSuccess, userId }) => {
    const { notify } = useNotification()
    const [formData, setFormData] = useState({
        quantity: 1,
        reason: 'ENTRADA',
        notes: ''
    })
    const [loading, setLoading] = useState(false)

    // Reset form when modal opens or item changes
    useEffect(() => {
        if (show && item) {
            setFormData({
                quantity: 1,
                reason: 'ENTRADA',
                notes: ''
            })
        }
    }, [show, item])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!item || formData.quantity <= 0) return

        try {
            setLoading(true)
            await eppInventoryService.adjustStock(
                item.id,
                parseInt(formData.quantity),
                formData.reason,
                formData.notes || `Ingreso rápido desde operación`,
                userId,
                'MANUAL',
                null
            )

            // alert('Stock ingresado correctamente') -> Handled by parent
            onSuccess() // Should refresh data parent
            onClose()
        } catch (error) {
            console.error('Error adding stock:', error)
            notify.error('Error al ingresar stock: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!show || !item) return null

    return (
        <div className="gestor-modal-backdrop">
            <div className="gestor-modal-content max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="gestor-modal-header">
                        <h3 className="gestor-modal-title">
                            Añadir Stock Rápido: {item.name}
                        </h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="gestor-modal-body space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-700 dark:text-blue-300 mb-2">
                            Stock Actual: <strong>{item.stock_current}</strong>
                        </div>

                        <div>
                            <label className="label">
                                Cantidad a Ingresar (+)
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="input w-full"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="label">
                                Motivo
                            </label>
                            <select
                                className="input w-full"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            >
                                <option value="ENTRADA">Ingreso / Compra</option>
                                <option value="AJUSTE">Ajuste de Inventario</option>
                                <option value="ENTRADA">Devolución</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">
                                Nota (Opcional)
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Ej: Compra de urgencia"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="gestor-modal-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary btn-md"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-md"
                        >
                            {loading ? 'Guardando...' : 'Confirmar Ingreso'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddStockModal
