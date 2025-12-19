import { useAuth } from '@contexts/AuthContext'
import { AlertTriangle, Plus } from 'lucide-react'

const IncidentsPage = () => {
  const { station } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incidentes SST</h1>
          <p className="text-gray-600 mt-1">
            Registro y seguimiento de incidentes de seguridad {station && `- ${station.name}`}
          </p>
        </div>
        <button className="btn btn-primary btn-md mt-4 sm:mt-0 inline-flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Registrar Incidente</span>
        </button>
      </div>

      <div className="card">
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Módulo en desarrollo</p>
          <p className="text-sm text-gray-400 mt-2">
            Aquí podrás registrar y hacer seguimiento a incidentes y accidentes laborales
          </p>
        </div>
      </div>
    </div>
  )
}

export default IncidentsPage
