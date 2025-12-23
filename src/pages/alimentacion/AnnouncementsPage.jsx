import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Edit, Calendar, Info, Save, X, Megaphone, CheckCircle, ArrowRight } from 'lucide-react'
import { announcementService } from '../../services/announcementService'
import stationService from '../../services/stationService'
import { formatDate } from '../../utils/helpers'
import { ANNOUNCEMENT_TARGETS, ANNOUNCEMENT_TARGET_LABELS } from '../../utils/constants'

const AnnouncementsPage = () => {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        end_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        is_active: true,
        station_id: '', // Empty for Global
        display_targets: [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK] // Default: all
    })
    const [stations, setStations] = useState([]) // For selector
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadAnnouncements()
        loadStations()
    }, [])

    const loadStations = async () => {
        try {
            const data = await stationService.getAll(true)
            setStations(data)
        } catch (e) { console.error(e) }
    }

    const loadAnnouncements = async () => {
        try {
            setLoading(true)
            const data = await announcementService.getAll()
            setAnnouncements(data || [])
        } catch (err) {
            console.error(err)
            setError('Error al cargar anuncios')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingId) {
                // Convert '' to null for DB
                const payload = { ...formData, station_id: formData.station_id || null }
                await announcementService.update(editingId, payload)
            } else {
                const payload = { ...formData, station_id: formData.station_id || null }
                await announcementService.create(payload)
            }
            setIsModalOpen(false)
            setFormData({
                title: '',
                message: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                is_active: true,
                station_id: ''
            })
            setEditingId(null)
            loadAnnouncements()
        } catch (err) {
            console.error(err)
            alert('Error al guardar')
        }
    }

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que deseas eliminar este anuncio?')) {
            try {
                await announcementService.delete(id)
                loadAnnouncements()
            } catch (err) {
                console.error(err)
                alert('Error al eliminar')
            }
        }
    }

    const handleEdit = (announcement) => {
        setFormData({
            title: announcement.title,
            message: announcement.message,
            start_date: announcement.start_date,
            end_date: announcement.end_date,
            is_active: announcement.is_active,
            station_id: announcement.station_id || '',
            display_targets: announcement.display_targets || [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
        })
        setEditingId(announcement.id)
        setIsModalOpen(true)
    }

    const openCreateModal = () => {
        setEditingId(null)
        setFormData({
            title: '',
            message: '',
            start_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
            end_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
            is_active: true,
            station_id: '',
            display_targets: [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
        })
        setIsModalOpen(true)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-orange-500" />
                        Comunicados y Anuncios
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona los mensajes que verán los empleados al ingresar (ej. Navidad, Avisos).</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    Crear Anuncio
                </button>
            </header>

            {/* Lista de Anuncios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white rounded-xl shadow-sm border p-6 relative overflow-hidden group ${!item.is_active ? 'opacity-60 grayscale' : 'border-orange-100'}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {item.is_active ? 'ACTIVO' : 'INACTIVO'}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(item)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>

                        {/* Station Badge */}
                        <div className="mb-2 space-y-2">
                            {item.station_id ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Estación: {stations.find(s => s.id === item.station_id)?.name || '...'}
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Global (Todas)
                                </span>
                            )}

                            {/* Display Targets Badges */}
                            <div className="flex flex-wrap gap-1">
                                {(item.display_targets || [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]).map(target => (
                                    <span key={target} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        {ANNOUNCEMENT_TARGET_LABELS[target] || target}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            {item.message}
                        </p>

                        <div className="flex items-center text-xs text-gray-500 gap-4 mt-auto pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>Del: {formatDate(item.start_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <ArrowRight size={14} className="text-gray-300" />
                                <span>Al: {formatDate(item.end_date)}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {announcements.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No hay anuncios registrados aún.</p>
                    </div>
                )}
            </div>

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                    >
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingId ? 'Editar Anuncio' : 'Nuevo Anuncio'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Station Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estación Destino</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={formData.station_id}
                                    onChange={e => setFormData({ ...formData, station_id: e.target.value })}
                                >
                                    <option value="">-- Todas las Estaciones (Global) --</option>
                                    {stations.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Si seleccionas una estación, solo los empleados de esa estación verán el anuncio.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título Grande (Ej: ¡Feliz Navidad!)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje Detallado</label>
                                <textarea
                                    required
                                    rows="4"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Escribe aquí el contenido del anuncio..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Display Targets Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ¿Dónde se mostrará este anuncio?
                                </label>
                                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.display_targets.includes(ANNOUNCEMENT_TARGETS.BOARD)}
                                            onChange={(e) => {
                                                const targets = e.target.checked
                                                    ? [...formData.display_targets, ANNOUNCEMENT_TARGETS.BOARD]
                                                    : formData.display_targets.filter(t => t !== ANNOUNCEMENT_TARGETS.BOARD)
                                                setFormData({ ...formData, display_targets: targets })
                                            }}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{ANNOUNCEMENT_TARGET_LABELS.BOARD}</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.display_targets.includes(ANNOUNCEMENT_TARGETS.FOOD_KIOSK)}
                                            onChange={(e) => {
                                                const targets = e.target.checked
                                                    ? [...formData.display_targets, ANNOUNCEMENT_TARGETS.FOOD_KIOSK]
                                                    : formData.display_targets.filter(t => t !== ANNOUNCEMENT_TARGETS.FOOD_KIOSK)
                                                setFormData({ ...formData, display_targets: targets })
                                            }}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{ANNOUNCEMENT_TARGET_LABELS.FOOD_KIOSK}</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.display_targets.includes(ANNOUNCEMENT_TARGETS.DRIVER_KIOSK)}
                                            onChange={(e) => {
                                                const targets = e.target.checked
                                                    ? [...formData.display_targets, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
                                                    : formData.display_targets.filter(t => t !== ANNOUNCEMENT_TARGETS.DRIVER_KIOSK)
                                                setFormData({ ...formData, display_targets: targets })
                                            }}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{ANNOUNCEMENT_TARGET_LABELS.DRIVER_KIOSK}</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Selecciona al menos una opción
                                </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="activeCheck"
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <label htmlFor="activeCheck" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Anuncio Activo (Visible para todos)
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:translate-y-[-1px] transition-all flex justify-center items-center gap-2"
                                >
                                    <Save size={18} />
                                    Guardar Anuncio
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default AnnouncementsPage
