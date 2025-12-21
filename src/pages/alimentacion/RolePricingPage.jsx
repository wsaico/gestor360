import { useState, useEffect } from 'react'
import { useAuth } from '@contexts/AuthContext'
import pricingService from '@services/pricingService'
import jobRoleService from '@services/jobRoleService'
import stationService from '@services/stationService'
import { DollarSign, Plus, Edit, Trash2, AlertCircle } from 'lucide-react'

/**
 * Página de configuración de tarifas por cargo
 * Solo accesible para ADMIN y SUPERVISOR
 */
const RolePricingPage = () => {
  const { user, station, updateStation } = useAuth()

  const [pricings, setPricings] = useState([])
  const [jobRoles, setJobRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPricing, setEditingPricing] = useState(null)

  // Admin Station Selection
  const [stations, setStations] = useState([])

  useEffect(() => {
    if (user?.role === 'ADMIN' && !station) {
      loadStations()
    }
  }, [user, station])

  useEffect(() => {
    if (station?.id) {
      fetchData()
    } else if (user?.role !== 'ADMIN') {
      setLoading(false)
    }
  }, [station])

  const loadStations = async () => {
    try {
      const data = await stationService.getAll()
      setStations(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading stations:', error)
      setLoading(false)
    }
  }

  const handleStationSelect = (stationId) => {
    const selected = stations.find(s => s.id === stationId)
    if (selected) {
      updateStation(selected)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pricingData, rolesData] = await Promise.all([
        pricingService.getAll(station.id),
        jobRoleService.getAll()
      ])
      setPricings(pricingData)
      setJobRoles(rolesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (pricing) => {
    setEditingPricing(pricing)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingPricing(null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta configuración de precio?')) {
      return
    }

    try {
      await pricingService.delete(id)
      setPricings(prev => prev.filter(p => p.id !== id))
      alert('Configuración eliminada correctamente')
    } catch (error) {
      console.error('Error deleting pricing:', error)
      alert(error.message || 'Error al eliminar la configuración')
    }
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setEditingPricing(null)
    fetchData()
  }

  // Obtener roles que ya tienen configuración
  const configuredRoles = pricings.map(p => p.role_name)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando tarifas...</p>
        </div>
      </div>
    )
  }

  if (!station && user?.role === 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="p-4 bg-blue-50 rounded-full">
          <DollarSign className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Configuración de Tarifas</h2>
        <p className="text-gray-500 text-center max-w-md">
          Seleccione una estación para configurar las tarifas y subsidios de alimentación.
        </p>
        <div className="w-64">
          <select
            className="input w-full"
            onChange={(e) => handleStationSelect(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Seleccione una estación</option>
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarifas por Cargo</h1>
          <p className="text-gray-600 mt-1">
            Configuración de costos de alimentación {station && `- ${station.name}`}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarifa</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Cómo funciona el sistema de tarifas:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Aporte Empleado:</strong> Monto que el empleado paga por el menú</li>
              <li><strong>Subsidio Empresa:</strong> Monto que la empresa subsidia</li>
              <li><strong>Costo Total:</strong> Aporte Empleado + Subsidio Empresa</li>
            </ul>
            <p className="mt-2">
              Ejemplo: Si el Supervisor paga S/ 5.00 y la empresa subsidia S/ 10.00, el menú tiene un valor total de S/ 15.00
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      {pricings.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay tarifas configuradas</p>
            <p className="text-sm text-gray-400 mt-2">
              Haga clic en "Nueva Tarifa" para comenzar
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aporte Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subsidio Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pricings.map((pricing) => {
                  const totalCost = pricingService.calculateTotalCost(pricing)
                  return (
                    <tr key={pricing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {pricing.role_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          S/ {Number(pricing.employee_cost).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          S/ {Number(pricing.company_subsidy).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          S/ {totalCost.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(pricing)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDelete(pricing.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PricingModal
          stationId={station.id}
          pricing={editingPricing}
          jobRoles={jobRoles.filter(r => !configuredRoles.includes(r.name) || r.name === editingPricing?.role_name)}
          onClose={() => {
            setShowModal(false)
            setEditingPricing(null)
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

/**
 * Modal para crear/editar configuración de precio
 */
const PricingModal = ({ stationId, pricing, jobRoles, onClose, onSuccess }) => {
  const isEdit = !!pricing

  const [formData, setFormData] = useState({
    station_id: stationId,
    role_name: pricing?.role_name || '',
    employee_cost: pricing?.employee_cost || '0.00',
    company_subsidy: pricing?.company_subsidy || '0.00',
    total_cost: pricing ? (Number(pricing.employee_cost) + Number(pricing.company_subsidy)).toFixed(2) : '0.00'
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Logic:
  // 1. Change Total -> Adjust Subsidy (Total - Employee)
  // 2. Change Employee -> Adjust Subsidy (Total - Employee) to keep Total fixed, OR update Total?
  //    User wants to "place a value... and calculate without manual".
  //    If I set Total=15, then Employee=5 --> Subsidy should be 10. (Total fixed)
  //    If I set Employee=5, Subsidy=10 --> Total should be 15. (Total calculated)

  const handleTotalChange = (e) => {
    const total = e.target.value
    const employee = formData.employee_cost

    // Auto-calc Subsidy
    const subsidy = (Number(total) - Number(employee)).toFixed(2)

    setFormData(prev => ({
      ...prev,
      total_cost: total,
      company_subsidy: Number(subsidy) < 0 ? '0.00' : subsidy
    }))
  }

  const handleEmployeeChange = (e) => {
    const employee = e.target.value
    const total = formData.total_cost

    // If Total is set (>0), we adjust Subsidy to match Total
    // If Total is 0, we assume we are building up the cost, so we update Total

    if (Number(total) > 0) {
      const subsidy = (Number(total) - Number(employee)).toFixed(2)
      setFormData(prev => ({
        ...prev,
        employee_cost: employee,
        company_subsidy: Number(subsidy) < 0 ? '0.00' : subsidy
      }))
    } else {
      const subsidy = formData.company_subsidy
      const newTotal = (Number(employee) + Number(subsidy)).toFixed(2)
      setFormData(prev => ({
        ...prev,
        employee_cost: employee,
        total_cost: newTotal
      }))
    }
  }

  const handleSubsidyChange = (e) => {
    const subsidy = e.target.value
    const employee = formData.employee_cost

    // When changing subsidy explicitly, usually we want to update the total
    const newTotal = (Number(employee) + Number(subsidy)).toFixed(2)

    setFormData(prev => ({
      ...prev,
      company_subsidy: subsidy,
      total_cost: newTotal
    }))
  }

  const handleChangeRaw = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.role_name) {
      newErrors.role_name = 'El cargo es obligatorio'
    }

    const employeeCost = Number(formData.employee_cost)
    if (isNaN(employeeCost) || employeeCost < 0) {
      newErrors.employee_cost = 'El aporte debe ser un número positivo'
    }

    const companySubsidy = Number(formData.company_subsidy)
    if (isNaN(companySubsidy) || companySubsidy < 0) {
      newErrors.company_subsidy = 'El subsidio debe ser un número positivo'
    }

    const totalCost = Number(formData.total_cost)
    if (isNaN(totalCost) || totalCost <= 0) {
      // Warning but maybe allow? User requested calculations.
      // Let's enforce at least real cost.
      newErrors.total_cost = 'El costo total debe ser mayor a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      const dataToSave = {
        station_id: formData.station_id,
        role_name: formData.role_name,
        employee_cost: Number(formData.employee_cost),
        company_subsidy: Number(formData.company_subsidy)
      }

      if (isEdit) {
        await pricingService.update(pricing.id, dataToSave)
        alert('Configuración actualizada correctamente')
      } else {
        await pricingService.create(dataToSave)
        alert('Configuración creada correctamente')
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving pricing:', error)
      alert(error.message || 'Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {isEdit ? 'Editar Tarifa' : 'Nueva Tarifa'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cargo */}
          <div>
            <label htmlFor="role_name" className="label">
              Cargo <span className="text-red-500">*</span>
            </label>
            <select
              id="role_name"
              name="role_name"
              value={formData.role_name}
              onChange={handleChangeRaw}
              className={`input ${errors.role_name ? 'border-red-500' : ''}`}
              disabled={saving || isEdit}
            >
              <option value="">Seleccione un cargo</option>
              {jobRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_name && (
              <p className="mt-1 text-sm text-red-600">{errors.role_name}</p>
            )}
            {isEdit && (
              <p className="mt-1 text-xs text-gray-500">El cargo no se puede modificar</p>
            )}
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {/* Costo Total - Moved Top as per request for better flow */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
            <label htmlFor="total_cost" className="block text-sm font-bold text-blue-900 mb-1">
              Costo Total del Menú (S/)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-bold">S/</span>
              <input
                type="number"
                id="total_cost"
                name="total_cost"
                value={formData.total_cost}
                onChange={handleTotalChange}
                step="0.01"
                min="0"
                className={`input pl-8 font-bold text-lg text-blue-900 ${errors.total_cost ? 'border-red-500' : ''}`}
                disabled={saving}
                placeholder="0.00"
              />
            </div>
            {errors.total_cost && (
              <p className="mt-1 text-sm text-red-600">{errors.total_cost}</p>
            )}
            <p className="text-xs text-blue-700 mt-2">
              Ingrese el valor total y el sistema calculará el subsidio automáticamente al ingresar el aporte.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Aporte Empleado */}
            <div>
              <label htmlFor="employee_cost" className="label">
                Aporte Empleado (S/)
              </label>
              <input
                type="number"
                id="employee_cost"
                name="employee_cost"
                value={formData.employee_cost}
                onChange={handleEmployeeChange}
                step="0.01"
                min="0"
                className={`input ${errors.employee_cost ? 'border-red-500' : ''}`}
                disabled={saving}
              />
              {errors.employee_cost && (
                <p className="mt-1 text-sm text-red-600">{errors.employee_cost}</p>
              )}
            </div>

            {/* Subsidio Empresa */}
            <div>
              <label htmlFor="company_subsidy" className="label">
                Subsidio Empresa (S/)
              </label>
              <input
                type="number"
                id="company_subsidy"
                name="company_subsidy"
                value={formData.company_subsidy}
                onChange={handleSubsidyChange}
                step="0.01"
                min="0"
                className={`input ${errors.company_subsidy ? 'border-red-500' : ''}`}
                disabled={saving}
              />
              {errors.company_subsidy && (
                <p className="mt-1 text-sm text-red-600">{errors.company_subsidy}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-md"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={saving}
            >
              {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RolePricingPage
