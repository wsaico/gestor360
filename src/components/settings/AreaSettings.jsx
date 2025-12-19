import { useState, useEffect } from 'react'
import { Plus, Map } from 'lucide-react'
import { useAuth } from '@contexts/AuthContext'
import areaService from '@services/areaService'
import { useNotification } from '@contexts/NotificationContext'

const AreaSettings = () => {
    const { station } = useAuth()
    const { notify } = useNotification()

    const [areas, setAreas] = useState([])
    const [loading, setLoading] = useState(false)
    const [newAreaName, setNewAreaName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        if (station?.id) {
            fetchAreas()
        }
    }, [station?.id])

    const fetchAreas = async () => {
        try {
            setLoading(true)
            const data = await areaService.getAll(station.id)
            setAreas(data || [])
        } catch (error) {
            console.error('Error fetching areas:', error)
            notify.error('Error al cargar las áreas')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateArea = async (e) => {
        e.preventDefault()
        if (!newAreaName.trim()) return

        try {
            setCreating(true)
            await areaService.create({
                station_id: station.id,
                name: newAreaName.trim().toUpperCase()
            })
            setNewAreaName('')
            await fetchAreas()
            notify.success('Área creada correctamente')
        } catch (error) {
            console.error('Error creating area:', error)
            notify.error(error.message || 'Error al crear el área')
        } finally {
            setCreating(false)
        }
    }

    const handleToggleArea = async (area) => {
        try {
            await areaService.toggleActive(area.id, !area.is_active)
            await fetchAreas()
            notify.success(`Área ${!area.is_active ? 'activada' : 'desactivada'} correctamente`)
        } catch (error) {
            console.error('Error updates area:', error)
            notify.error('Error al actualizar el estado del área')
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestión de Áreas Operativas</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Define las áreas físicas o lógicas de tu estación (Ej: RAMPA, PAX, OMA).
                </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start space-x-3 border border-blue-100 dark:border-blue-800">
                <Map className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-200">¿Para qué sirven las áreas?</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Las áreas permiten segmentar tus inventarios y asignar empleados a zonas específicas para reportes más detallados.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Create Form */}
                <div className="card bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                    <form onSubmit={handleCreateArea} className="flex gap-4 items-end">
                        <div className="flex-1 max-w-sm">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Área</label>
                            <input
                                type="text"
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                className="input w-full"
                                placeholder="Ej: ALMACÉN GENERAL"
                                disabled={creating}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating || !newAreaName.trim()}
                            className="btn btn-primary h-[42px] inline-flex items-center"
                        >
                            {creating ? 'Creando...' : <><Plus className="w-4 h-4 mr-2" /> Agregar</>}
                        </button>
                    </form>
                </div>

                {/* List Table */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Cargando áreas...</td>
                                </tr>
                            ) : areas.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No hay áreas registradas</td>
                                </tr>
                            ) : (
                                areas.map((area) => (
                                    <tr key={area.id}>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{area.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${area.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                }`}>
                                                {area.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <button
                                                onClick={() => handleToggleArea(area)}
                                                className={`font-medium hover:underline ${area.is_active ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
                                            >
                                                {area.is_active ? 'Desactivar' : 'Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default AreaSettings
