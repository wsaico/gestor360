import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '@services/supabase'
import { useAuth } from '@contexts/AuthContext'
import employeeService from '@services/employeeService'
import jobRoleService from '@services/jobRoleService'
import stationService from '@services/stationService'
import ConfirmDialog from '@components/ConfirmDialog'
import Modal from '@components/Modal'
import EmployeeForm from '@components/rrhh/EmployeeForm'
import * as XLSX from 'xlsx'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  User,
  XCircle
} from 'lucide-react'
import {
  EMPLOYEE_STATUS,
  CONTRACT_TYPE_LABELS,
  WORK_SCHEDULE_LABELS
} from '@utils/constants'
import { formatDate } from '@utils/helpers'

/**
 * Página de lista de empleados con CRUD
 */
const EmployeesPage = () => {
  const navigate = useNavigate()
  const { user, station } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [employees, setEmployees] = useState([])
  const [stations, setStations] = useState([])
  const [selectedStationId, setSelectedStationId] = useState('') // Filter value
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [itemsPerPage] = useState(10) // Can be made dynamic later

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [employeeToDeletePermanently, setEmployeeToDeletePermanently] = useState(null)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchEmployees()
  }, [statusFilter, currentPage, selectedStationId]) // Re-fetch on filter or page change

  // Fetch stations for filter if Admin
  useEffect(() => {
    if (isAdmin) {
      stationService.getAll().then(setStations).catch(console.error)
    }
  }, [isAdmin])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on new search
      fetchEmployees();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        if (data.length === 0) {
          alert('El archivo está vacío')
          return
        }

        let successCount = 0
        let errors = []

        setLoading(true)

        for (const row of data) {
          try {
            // Basic Validation
            if (!row['DNI'] || !row['NOMBRES'] || !row['EMAIL']) {
              if (row['DNI']) errors.push(`DNI ${row['DNI']}: Faltan datos obligatorios`)
              continue
            }

            const fullName = `${row['NOMBRES']} ${row['APELLIDOS'] || ''}`.trim()

            const employeeData = {
              station_id: station?.id,
              dni: String(row['DNI']),
              full_name: fullName,
              email: row['EMAIL'],
              phone: row['TELEFONO'] || '',
              role_name: row['CARGO'] || 'Empleado',
              contract_type: row['TIPO CONTRATO'] || 'INDETERMINADO',
              work_schedule: row['HORARIO'] || 'L-V 8AM-5PM',
              status: 'ACTIVO',
              hire_date: row['FECHA INGRESO'] ? new Date(row['FECHA INGRESO']).toISOString() : new Date().toISOString(),
              salary: Number(row['SALARIO'] || 0),
              birth_date: row['FECHA NACIMIENTO'] ? new Date(row['FECHA NACIMIENTO']).toISOString() : null,
              uniform_size: row['TALLA UNIFORME'] || 'M'
            }

            // Verificar si ya existe por DNI
            let existingEmployee = await employeeService.getByDni(String(row['DNI']))

            // Si no existe por DNI, verificamos por Email (para evitar error de Auth duplicado)
            if (!existingEmployee && row['EMAIL']) {
              existingEmployee = await employeeService.getByEmail(row['EMAIL'])
            }

            if (existingEmployee) {
              // Update existing
              // Remove fields that shouldn't be updated loosely if needed, or update all.
              // We don't update email to avoid auth conflicts usually, but here we can try.
              const { email, ...updateData } = employeeData // Exclude email from update to be safe
              await employeeService.update(existingEmployee.id, updateData)
            } else {
              // Create new
              await employeeService.create(employeeData)
            }
            successCount++
          } catch (err) {
            console.error('Error importing row:', row, err)
            errors.push(`${row['DNI'] || 'Sin DNI'}: ${err.message}`)
          }
        }

        await fetchEmployees()

        let msg = `Importación completada.\nExitosos: ${successCount}`
        if (errors.length > 0) {
          msg += `\nFallidos: ${errors.length}\n\nDetalles:\n${errors.slice(0, 10).join('\n')}`
          if (errors.length > 10) msg += '\n...'
        }
        alert(msg)

      } catch (error) {
        console.error('Error parsing file:', error)
        alert('Error al procesar el archivo Excel')
      } finally {
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'DNI': '12345678',
          'NOMBRES': 'JUAN',
          'APELLIDOS': 'PEREZ',
          'EMAIL': 'juan.perez@empresa.com',
          'TELEFONO': '999999999',
          'CARGO': 'OPERARIO',
          'FECHA INGRESO': '2024-01-01',
          'SALARIO': 1500,
          'FECHA NACIMIENTO': '1990-01-01',
          'TALLA UNIFORME': 'M',
          'TIPO CONTRATO': 'INDETERMINADO',
          'HORARIO': 'L-V 8AM-5PM'
        }
      ]

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(templateData)

      const wscols = Object.keys(templateData[0]).map(k => ({ wch: 20 }))
      ws['!cols'] = wscols

      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Empleados')
      XLSX.writeFile(wb, 'Plantilla_Empleados.xlsx')
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Error al descargar la plantilla')
    }
  }

  /**
   * Obtiene la lista de empleados desde Supabase
   */
  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const stationId = station?.id || null
      // Server-side filtering & pagination
      const filters = {
        status: statusFilter,
        search: searchTerm
      }
      const { data, count } = await employeeService.getAll(stationId, filters, currentPage, itemsPerPage)

      setEmployees(data)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching employees:', error)
      alert('Error al cargar los empleados. Por favor, intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // NOTE: Client-side logic for filteredEmployees removed as we now use server-side.
  const filteredEmployees = employees;

  // ... (rest of filtering logic, delete handlers same as before)

  /**
   * Filtra empleados según búsqueda y estado
   */
  // Client-side filtering removed in favor of Server-side pagination
  // const filteredEmployees = ... (Removed)

  /**
   * Maneja la eliminación de un empleado (cambio a estado CESADO)
   */
  const handleDeleteClick = (employee) => {

    setEmployeeToDelete(employee)
    setShowConfirmDialog(true)
  }

  const handleConfirmDelete = async () => {


    if (!employeeToDelete) {
      console.error('No employee to delete')
      return
    }

    try {

      const result = await employeeService.markAsInactive(employeeToDelete.id)


      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeToDelete.id ? { ...emp, status: EMPLOYEE_STATUS.INACTIVE } : emp
        )
      )

      setShowConfirmDialog(false)
      setEmployeeToDelete(null)
      alert('Empleado marcado como cesado correctamente')

    } catch (error) {
      console.error('Error updating employee:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      })
      setShowConfirmDialog(false)
      setEmployeeToDelete(null)
      alert(error.message || 'Error al actualizar el empleado. Verifica que tengas los permisos necesarios.')
    }
  }

  const handleCancelDelete = () => {

    setShowConfirmDialog(false)
    setEmployeeToDelete(null)
  }

  /**
   * Maneja la eliminación permanente de un empleado
   */
  const handlePermanentDeleteClick = (employee) => {

    setEmployeeToDeletePermanently(employee)
    setShowPermanentDeleteDialog(true)
  }

  const handleConfirmPermanentDelete = async () => {


    if (!employeeToDeletePermanently) {
      console.error('No employee to delete permanently')
      return
    }

    try {

      await employeeService.delete(employeeToDeletePermanently.id)


      // Remover de la lista
      setEmployees((prev) => prev.filter(emp => emp.id !== employeeToDeletePermanently.id))

      setShowPermanentDeleteDialog(false)
      setEmployeeToDeletePermanently(null)
      alert('Empleado eliminado permanentemente')
    } catch (error) {
      console.error('Error deleting employee permanently:', error)
      setShowPermanentDeleteDialog(false)
      setEmployeeToDeletePermanently(null)
      alert(error.message || 'Error al eliminar el empleado permanentemente.')
    }
  }

  const handleCancelPermanentDelete = () => {

    setShowPermanentDeleteDialog(false)
    setEmployeeToDeletePermanently(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando empleados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Empleados</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de personal {station && `- ${station.name}`}
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".xlsx, .xls"
          />
          <button
            onClick={handleDownloadTemplate}
            className="btn btn-secondary btn-md inline-flex items-center space-x-2"
            title="Descargar Plantilla Excel"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            className="btn btn-secondary btn-md inline-flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Carga Masiva</span>
          </button>
          <button
            onClick={async () => {
              if (!confirm("¿Desea buscar y restaurar usuarios ocultos? Úselo si tiene problemas de 'User already registered'.")) return;
              try {
                setLoading(true);
                const { data, error } = await supabase.rpc('sync_zombie_users');
                if (error) throw error;
                alert(`Proceso completado: ${data[0]?.details || 'Sincronización finalizada'}`);
                fetchEmployees();
              } catch (e) {
                console.error(e);
                alert('Error al sincronizar: ' + e.message);
              } finally {
                setLoading(false);
              }
            }}
            className="btn btn-secondary btn-md inline-flex items-center space-x-2 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200"
            title="Reparar usuarios duplicados/fantasmas"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Reparar</span>
          </button>
          <button
            onClick={() => {
              setSelectedEmployee(null)
              setShowModal(true)
            }}
            className="btn btn-primary btn-md inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Filtro por estado */}
          <div className="flex items-center space-x-4">

            {/* Station Filter (Admin Only) */}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedStationId}
                  onChange={(e) => {
                    setSelectedStationId(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="input w-auto max-w-xs"
                >
                  <option value="">Todas las Estaciones</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-auto"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Cesados</option>
              </select>
            </div>

            <button
              onClick={() => {/* Exportar a Excel */ }}
              className="btn btn-secondary btn-md inline-flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Empleados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {employees.filter(e => e.status === EMPLOYEE_STATUS.ACTIVE).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cesados</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                {employees.filter(e => e.status === EMPLOYEE_STATUS.INACTIVE).length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de empleados */}
      <div className="gestor-table-container">
        <div className="overflow-x-auto">
          <table className="gestor-table">
            <thead className="gestor-thead">
              <tr>
                <th className="gestor-th">
                  Empleado
                </th>
                <th className="gestor-th">
                  Estación
                </th>
                <th className="gestor-th">
                  DNI
                </th>
                <th className="gestor-th">
                  Cargo
                </th>
                <th className="gestor-th">
                  Contrato
                </th>
                <th className="gestor-th">
                  Jornada
                </th>
                <th className="gestor-th">
                  Estado
                </th>
                <th className="gestor-th text-right sticky right-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="gestor-tbody">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="gestor-tr-hover">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">
                            {employee.full_name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {employee.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {employee.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-xs">
                        {employee.station ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                            {employee.station.code}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-sm text-gray-900 dark:text-gray-200">{employee.dni}</div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-sm text-gray-900 dark:text-gray-200">{employee.role_name}</div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {employee.contract_type ? CONTRACT_TYPE_LABELS[employee.contract_type] || employee.contract_type : '-'}
                      </div>
                    </td>
                    <td className="gestor-td">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {employee.work_schedule ? WORK_SCHEDULE_LABELS[employee.work_schedule] || employee.work_schedule : '-'}
                      </div>
                    </td>
                    <td className="gestor-td">
                      {employee.status === EMPLOYEE_STATUS.ACTIVE ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-danger">Cesado</span>
                      )}
                    </td>
                    <td className="gestor-td text-right font-medium sticky right-0 z-10 bg-white dark:bg-gray-900 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] border-l border-gray-100 dark:border-gray-800">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/rrhh/empleados/${employee.id}`)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(employee)
                            setShowModal(true)
                          }}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {employee.status === EMPLOYEE_STATUS.ACTIVE ? (
                          <button
                            onClick={() => handleDeleteClick(employee)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Marcar como cesado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePermanentDeleteClick(employee)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar permanentemente"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      < div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow-sm" >
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Mostrando página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages || 1}</span>
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Anterior</span>
                &lt;
              </button>

              {/* Simple Page Numbers */}
              {[...Array(totalPages)].map((_, i) => {
                const p = i + 1;
                // Show current, first, last, and neighbors (simplified)
                if (p !== 1 && p !== totalPages && Math.abs(currentPage - p) > 2) return null;

                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    aria-current={currentPage === p ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === p
                      ? 'bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span className="sr-only">Siguiente</span>
                &gt;
              </button>
            </nav>
          </div>
        </div>
      </div >

      {/* Modal de confirmación - Marcar como cesado */}
      < ConfirmDialog
        isOpen={showConfirmDialog}
        title="Marcar como Cesado"
        message={`¿Está seguro de marcar a "${employeeToDelete?.full_name}" como cesado? Esta acción cambiará el estado del empleado.`}
        confirmText="Marcar como Cesado"
        cancelText="Cancelar"
        type="warning"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Modal de confirmación - Eliminar permanentemente */}
      < ConfirmDialog
        isOpen={showPermanentDeleteDialog}
        title="⚠️ ELIMINAR PERMANENTEMENTE"
        message={`¿Está COMPLETAMENTE SEGURO de eliminar permanentemente a "${employeeToDeletePermanently?.full_name}"?\n\nEsta acción NO se puede deshacer y eliminará todos los datos asociados (documentos, etc.).\n\nSolo elimine si se equivocó al crear el empleado.`}
        confirmText="SÍ, Eliminar Permanentemente"
        cancelText="Cancelar"
        type="danger"
        onConfirm={handleConfirmPermanentDelete}
        onCancel={handleCancelPermanentDelete}
      />

      {/* Modal de Creación/Edición */}
      <Modal
        isOpen={showModal}
        title={selectedEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
        onClose={() => setShowModal(false)}
        maxWidth="max-w-4xl"
      >
        <EmployeeForm
          employee={selectedEmployee}
          onSuccess={() => {
            setShowModal(false)
            fetchEmployees()
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div >
  )
}

export default EmployeesPage
