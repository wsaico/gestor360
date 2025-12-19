import { AlertCircle } from 'lucide-react'

/**
 * Componente de diálogo de confirmación
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning' // 'warning' | 'danger' | 'info'
}) => {
  if (!isOpen) return null

  const colors = {
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      border: 'border-primary-200 dark:border-primary-700',
      icon: 'text-primary-600 dark:text-primary-400',
      button: 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
    }
  }

  const style = colors[type] || colors.warning

  return (
    <div className="gestor-modal-backdrop">
      <div className="gestor-modal-content max-w-md">
        <div className="flex items-start space-x-4 p-6">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
            <AlertCircle className={`w-6 h-6 ${style.icon}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>

        <div className="gestor-modal-footer">
          <button
            onClick={onCancel}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`btn text-white ${style.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
