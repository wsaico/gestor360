import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import employeeService from '@services/employeeService'
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  User,
  Edit,
  FileText,
  Plus,
  Download,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react'
import { formatDate, calculateDocumentStatus } from '@utils/helpers'
import {
  EMPLOYEE_STATUS,
  DOCUMENT_TYPES,
  CONTRACT_TYPE_LABELS,
  WORK_SCHEDULE_LABELS
} from '@utils/constants'
import supabase from '@services/supabase'

/**
 * Página de detalle completo de empleado con gestión de documentos
 */
const EmployeeDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDocModal, setShowDocModal] = useState(false)

  useEffect(() => {
    fetchEmployeeData()
  }, [id])

  const fetchEmployeeData = async () => {
    try {
      setLoading(true)
      const empData = await employeeService.getById(id)
      const docsData = await employeeService.getDocuments(id)

      setEmployee(empData)
      setDocuments(docsData)
    } catch (error) {
      console.error('Error fetching employee data:', error)
      alert('Error al cargar los datos del empleado')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) return

    try {
      const { error } = await supabase
        .from('employee_docs')
        .delete()
        .eq('id', docId)

      if (error) throw error

      setDocuments(prev => prev.filter(doc => doc.id !== docId))
      alert('Documento eliminado correctamente')
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error al eliminar el documento')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando datos del empleado...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Empleado no encontrado</p>
        <button
          onClick={() => navigate('/rrhh/empleados')}
          className="btn btn-primary btn-md mt-4"
        >
          Volver a la lista
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/rrhh/empleados')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detalle de Empleado</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Información completa del empleado</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/rrhh/empleados/${id}/editar`)}
          className="btn btn-primary btn-md inline-flex items-center space-x-2"
        >
          <Edit className="w-4 h-4" />
          <span>Editar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Datos Personales */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Datos Personales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Estación</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">
                  {employee.station ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                      {employee.station.code} - {employee.station.name}
                    </span>
                  ) : (
                    'No especificado'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nombre Completo</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">DNI</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.dni}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Cargo</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.role_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado</label>
                <div className="mt-1">
                  {employee.status === EMPLOYEE_STATUS.ACTIVE ? (
                    <span className="badge badge-success">Activo</span>
                  ) : (
                    <span className="badge badge-danger">Cesado</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Talla de Uniforme</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">{employee.uniform_size || 'No especificado'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo de Contrato</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">
                  {employee.contract_type ? CONTRACT_TYPE_LABELS[employee.contract_type] || employee.contract_type : 'No especificado'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Jornada Laboral</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">
                  {employee.work_schedule ? WORK_SCHEDULE_LABELS[employee.work_schedule] || employee.work_schedule : 'No especificado'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de Ingreso</label>
                <p className="text-base text-gray-900 dark:text-white mt-1">{formatDate(employee.created_at)}</p>
              </div>
              {employee.birth_date && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fecha de Nacimiento</label>
                  <p className="text-base text-gray-900 dark:text-white mt-1">{formatDate(employee.birth_date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documentos */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documentos
              </h2>
              <button
                onClick={() => setShowDocModal(true)}
                className="btn btn-primary btn-sm inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Documento</span>
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No hay documentos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const status = calculateDocumentStatus(doc.expiry_date)
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${status.status === 'danger' ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10' :
                        status.status === 'warning' ? 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10' :
                          'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className={`w-5 h-5 ${status.status === 'danger' ? 'text-red-600 dark:text-red-400' :
                          status.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-gray-400 dark:text-gray-500'
                          }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.doc_type}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Vence: {formatDate(doc.expiry_date)}
                            {status.daysRemaining !== undefined && (
                              <span className="ml-2">
                                ({status.daysRemaining >= 0 ? `${status.daysRemaining} días` : 'Vencido'})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {status.status === 'success' && (
                          <span className="badge badge-success">{status.label}</span>
                        )}
                        {status.status === 'warning' && (
                          <span className="badge badge-warning">{status.label}</span>
                        )}
                        {status.status === 'danger' && (
                          <span className="badge badge-danger">{status.label}</span>
                        )}
                        {doc.evidence_url && (
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Avatar y Contacto */}
          <div className="card">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-primary-700 font-semibold text-3xl">
                  {employee.full_name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                {employee.full_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{employee.role_name}</p>
            </div>

            <div className="mt-6 space-y-3">
              {employee.email && (
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-gray-200 break-all">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center space-x-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-gray-900 dark:text-gray-200">{employee.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="text-gray-900 dark:text-gray-200">Ingreso: {formatDate(employee.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Acciones Rápidas
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/rrhh/empleados/${id}/editar`)}
                className="btn btn-secondary btn-sm w-full"
              >
                Editar Información
              </button>
              <button className="btn btn-secondary btn-sm w-full">
                Ver Entregas EPP
              </button>
              <button className="btn btn-secondary btn-sm w-full">
                Ver Pedidos Alimentación
              </button>
              {employee.status === EMPLOYEE_STATUS.ACTIVE && (
                <button className="btn btn-danger btn-sm w-full">
                  Marcar como Cesado
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Agregar Documento */}
      {showDocModal && (
        <DocumentModal
          employeeId={id}
          onClose={() => setShowDocModal(false)}
          onSuccess={() => {
            setShowDocModal(false)
            fetchEmployeeData()
          }}
        />
      )}
    </div>
  )
}

/**
 * Modal para agregar documentos
 */
const DocumentModal = ({ employeeId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    doc_type: DOCUMENT_TYPES.FOTOCHECK,
    expiry_date: '',
    evidence_url: ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.expiry_date) {
      alert('La fecha de vencimiento es obligatoria')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('employee_docs')
        .insert([{
          employee_id: employeeId,
          ...formData
        }])

      if (error) throw error

      alert('Documento agregado correctamente')
      onSuccess()
    } catch (error) {
      console.error('Error adding document:', error)
      alert('Error al agregar el documento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="gestor-modal-backdrop">
      <div className="gestor-modal-content max-w-md">
        <div className="gestor-modal-header">
          <h3 className="gestor-modal-title">
            Agregar Documento
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gestor-modal-body space-y-4">
            <div>
              <label className="label">Tipo de Documento</label>
              <select
                value={formData.doc_type}
                onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
                className="input"
                disabled={saving}
              >
                <option value={DOCUMENT_TYPES.FOTOCHECK}>Fotocheck</option>
                <option value={DOCUMENT_TYPES.LICENSE}>Licencia de Conducir</option>
                <option value={DOCUMENT_TYPES.EMO}>Examen Médico Ocupacional (EMO)</option>
              </select>
            </div>

            <div>
              <label className="label">Fecha de Vencimiento</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input"
                disabled={saving}
                required
              />
            </div>

            <div>
              <label className="label">URL del Documento (Opcional)</label>
              <input
                type="url"
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                className="input"
                placeholder="https://..."
                disabled={saving}
              />
            </div>
          </div>

          <div className="gestor-modal-footer">
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
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeDetailPage
