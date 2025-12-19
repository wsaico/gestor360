import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { X, ArrowRightLeft, Loader2, Building2, MapPin, Users } from 'lucide-react'
import assetService from '@/services/assetService'
import organizationService from '@/services/organizationService'
import stationService from '@/services/stationService'
import areaService from '@/services/areaService'
import employeeService from '@/services/employeeService'

const TRANSFER_TYPES = {
  STATION: 'STATION',
  AREA: 'AREA',
  ORGANIZATION: 'ORGANIZATION'
}

const AssetTransferModal = ({ isOpen, onClose, asset, onSuccess }) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [transferType, setTransferType] = useState(TRANSFER_TYPES.AREA)

  const [stations, setStations] = useState([])
  const [areas, setAreas] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [targetEmployees, setTargetEmployees] = useState([])

  const [formData, setFormData] = useState({
    to_station_id: '',
    to_area_id: '',
    to_organization_id: '',
    new_responsible_employee_id: '', // Nuevo campo para el responsable en destino
    reason: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // Cargar empleados de la estación de destino cuando cambia
  useEffect(() => {
    const loadTargetEmployees = async () => {
      let targetStationId = null

      if (transferType === TRANSFER_TYPES.STATION && formData.to_station_id) {
        targetStationId = formData.to_station_id
      } else if (transferType === TRANSFER_TYPES.AREA) {
        targetStationId = asset?.station_id // Misma estación
      }

      if (targetStationId) {
        try {
          const employees = await employeeService.getAll(targetStationId, { activeOnly: true })
          setTargetEmployees(employees || [])
        } catch (error) {
          console.error('Error loading target employees:', error)
          setTargetEmployees([])
        }
      } else {
        setTargetEmployees([])
      }
    }

    loadTargetEmployees()
  }, [transferType, formData.to_station_id, asset?.station_id])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load organizations
      const [orgs, stationsData, areasData] = await Promise.all([
        organizationService.getAll(true),
        stationService.getAll(true),
        // Si hay un activo seleccionado, cargamos las áreas de SU estación para transferencias internas
        asset?.station_id ? areaService.getAll(asset.station_id, true) : Promise.resolve([])
      ])

      setOrganizations(orgs)
      setStations(stationsData)
      setAreas(areasData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate based on transfer type
    if (transferType === TRANSFER_TYPES.STATION && !formData.to_station_id) {
      alert('Debe seleccionar una estación de destino')
      return
    }

    if (transferType === TRANSFER_TYPES.AREA && !formData.to_area_id) {
      alert('Debe seleccionar un área de destino')
      return
    }

    if (transferType === TRANSFER_TYPES.ORGANIZATION && !formData.to_organization_id) {
      alert('Debe seleccionar una organización de destino')
      return
    }

    if (!formData.reason) {
      alert('Debe especificar el motivo de la transferencia')
      return
    }

    setLoading(true)

    try {
      const transferData = {
        ...formData,
        transfer_type: transferType
      }

      await assetService.transfer(asset.id, transferData, user.id)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error transferring asset:', error)
      alert(error.message || 'Error al transferir el activo')
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
              <ArrowRightLeft className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Transferir Activo
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
          <div className="p-6 space-y-6">
            {/* Current Location */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Ubicación Actual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Estación:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {asset?.station?.name || 'No especificado'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Área:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {asset?.area?.name || 'No especificado'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Organización:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {asset?.organization?.name || 'Ninguna'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Ubicación:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {asset?.location || 'No especificado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Transfer Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Transferencia
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTransferType(TRANSFER_TYPES.AREA)}
                  className={`
                    p-4 border rounded-lg text-center transition-all
                    ${transferType === TRANSFER_TYPES.AREA
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                    }
                  `}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Área
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferType(TRANSFER_TYPES.STATION)}
                  className={`
                    p-4 border rounded-lg text-center transition-all
                    ${transferType === TRANSFER_TYPES.STATION
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                    }
                  `}
                >
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Estación
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferType(TRANSFER_TYPES.ORGANIZATION)}
                  className={`
                    p-4 border rounded-lg text-center transition-all
                    ${transferType === TRANSFER_TYPES.ORGANIZATION
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                    }
                  `}
                >
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Organización
                  </span>
                </button>
              </div>
            </div>

            {/* Transfer Destination */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Destino de la Transferencia
              </h3>

              {transferType === TRANSFER_TYPES.STATION && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estación de Destino *
                  </label>
                  <select
                    name="to_station_id"
                    value={formData.to_station_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Seleccione una estación...</option>
                    {stations
                      .filter(s => s.id !== asset?.station_id)
                      .map(station => (
                        <option key={station.id} value={station.id}>
                          {station.name} ({station.code})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {transferType === TRANSFER_TYPES.AREA && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Área de Destino *
                  </label>
                  <select
                    name="to_area_id"
                    value={formData.to_area_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Seleccione un área...</option>
                    {areas
                      .filter(a => a.id !== asset?.area_id)
                      .map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {transferType === TRANSFER_TYPES.ORGANIZATION && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Organización de Destino *
                  </label>
                  <select
                    name="to_organization_id"
                    value={formData.to_organization_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Seleccione una organización...</option>
                    {organizations
                      .filter(o => o.id !== asset?.organization_id)
                      .map(org => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.code}) - {org.organization_type}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>

            {/* Nuevo Responsable (Opcional pero recomendado) */}
            {(transferType === TRANSFER_TYPES.STATION || transferType === TRANSFER_TYPES.AREA) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nuevo Responsable (En Destino)
                </label>
                <select
                  name="new_responsible_employee_id"
                  value={formData.new_responsible_employee_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Sin asignar (Se retirará el actual) --</option>
                  {targetEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.dni})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Si se deja en blanco, el activo quedará sin responsable asignado en la nueva ubicación.
                </p>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motivo de la Transferencia *
              </label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Reasignación por necesidad operativa"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas Adicionales
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-500"
                placeholder="Detalles adicionales sobre la transferencia..."
              />
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Nota:</strong> Esta transferencia quedará registrada en el historial de movimientos del activo.
                {transferType === TRANSFER_TYPES.STATION && ' Puede requerir aprobación según las políticas de la organización.'}
              </p>
            </div>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transfiriendo...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Transferir Activo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssetTransferModal
