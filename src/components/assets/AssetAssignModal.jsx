import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, UserPlus, Loader2, Search } from 'lucide-react'
import assetService from '@/services/assetService'
import employeeService from '@/services/employeeService'

const AssetAssignModal = ({ isOpen, onClose, asset, onSuccess, stationId }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadEmployees()
    }
  }, [isOpen, stationId])

  const loadEmployees = async () => {
    try {
      if (!stationId) return

      const data = await employeeService.getAll(stationId, { activeOnly: true })
      setEmployees(data || [])
    } catch (error) {
      console.error('Error loading employees:', error)
      setEmployees([]) // Fallback to empty on error
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedEmployee) {
      alert('Debe seleccionar un empleado')
      return
    }

    setLoading(true)

    try {
      await assetService.assign(asset.id, selectedEmployee.id, notes, user.id)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error assigning asset:', error)
      alert(error.message || 'Error al asignar el activo')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Asignar Activo
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {asset?.asset_name} - {asset?.asset_code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar Empleado
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, código o cargo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Employee List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seleccione un Empleado
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron empleados
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => setSelectedEmployee(employee)}
                        className={`
                          w-full p-4 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left
                          ${selectedEmployee?.id === employee.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                        `}
                      >
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {employee.photo_url ? (
                            <img
                              src={employee.photo_url}
                              alt={employee.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {employee.full_name}
                            </p>
                            {selectedEmployee?.id === employee.id && (
                              <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                                Seleccionado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.employee_code} • {employee.position}
                          </p>
                          {employee.area && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {employee.area.name}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas de Asignación
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Motivo de la asignación, condiciones especiales, etc..."
              />
            </div>

            {/* Selected Employee Summary */}
            {selectedEmployee && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <h4 className="text-sm font-medium text-primary-900 dark:text-primary-300 mb-2">
                  Resumen de Asignación
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Activo:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {asset?.asset_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Código:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {asset?.asset_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Asignar a:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedEmployee.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Cargo:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedEmployee.position}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !selectedEmployee}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Asignando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Asignar Activo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssetAssignModal
