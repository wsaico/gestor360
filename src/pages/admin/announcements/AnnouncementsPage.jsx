import { useState, useEffect } from 'react'
import { announcementService } from '@services/announcementService'
import { Plus, Trash2, Edit, Video, Image as ImageIcon, Type, ExternalLink } from 'lucide-react'
import { ANNOUNCEMENT_TARGETS, ANNOUNCEMENT_TARGET_LABELS } from '@utils/constants'

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        media_url: '',
        media_type: 'text',
        priority: 'low',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
        display_targets: [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
    })

    useEffect(() => {
        fetchAnnouncements()
    }, [])

    const fetchAnnouncements = async () => {
        try {
            setLoading(true)
            const data = await announcementService.getAllAnnouncements()
            setAnnouncements(data || [])
        } catch (err) {
            console.error("Error fetching announcements:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este anuncio?')) return
        try {
            await announcementService.deleteAnnouncement(id)
            setAnnouncements(prev => prev.filter(a => a.id !== id))
        } catch (err) {
            alert(err.message)
        }
    }

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item)
            setFormData({
                title: item.title,
                message: item.message,
                media_url: item.media_url || '',
                media_type: item.media_type || 'text',
                priority: item.priority || 'low',
                start_date: item.start_date.split('T')[0],
                end_date: item.end_date.split('T')[0],
                isActive: item.is_active,
                display_targets: item.display_targets || [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
            })
        } else {
            setEditingItem(null)
            // Reset form
            setFormData({
                title: '',
                message: '',
                media_url: '',
                media_type: 'text',
                priority: 'low',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                isActive: true,
                display_targets: [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                media_url: formData.media_url || null,
                media_type: formData.media_type,
                priority: formData.priority,
                start_date: formData.start_date,
                end_date: formData.end_date,
                is_active: formData.isActive,
                display_targets: formData.display_targets
            }

            if (editingItem) {
                await announcementService.updateAnnouncement(editingItem.id, payload)
            } else {
                await announcementService.createAnnouncement(payload)
            }
            setIsModalOpen(false)
            fetchAnnouncements()
        } catch (err) {
            alert(err.message)
        }
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anuncios de Estación</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gestiona el contenido de las pantallas públicas</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus size={20} />
                    Nuevo Anuncio
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Cargando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {announcements.map((item) => (
                        <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-l-4 ${item.priority === 'high' ? 'border-red-500' :
                            item.priority === 'medium' ? 'border-yellow-500' :
                                item.priority === 'recognition' ? 'border-yellow-400' : 'border-blue-500'
                            }`}>
                            {/* Media Preview */}
                            <div className="h-48 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
                                {item.media_type === 'video' && (
                                    item.media_url ? (
                                        <video src={item.media_url} className="w-full h-full object-cover" controls muted />
                                    ) : <Video size={48} className="text-gray-400" />
                                )}
                                {item.media_type === 'image' && (
                                    item.media_url ? (
                                        <img src={item.media_url} className="w-full h-full object-cover" alt={item.title} />
                                    ) : <ImageIcon size={48} className="text-gray-400" />
                                )}
                                {item.media_type === 'text' && (
                                    <div className="p-4 text-center">
                                        <Type size={48} className="mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500 line-clamp-3">{item.message}</p>
                                    </div>
                                )}
                                {!item.is_active && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">INACTIVO</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg dark:text-white line-clamp-1">{item.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                    <span className={`capitalize px-2 py-0.5 rounded border ${item.priority === 'recognition'
                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
                                        : 'bg-gray-100 dark:bg-gray-700 border dark:border-gray-600'
                                        }`}>
                                        {item.priority === 'high' ? '🔴 Urgente' :
                                            item.priority === 'medium' ? '🟡 Normal' :
                                                item.priority === 'recognition' ? '✨ Reconocimiento' : '🔵 Info'}
                                    </span>
                                    <span>{item.start_date} - {item.end_date}</span>
                                </div>

                                {/* Display Targets Badges */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {(item.display_targets || [ANNOUNCEMENT_TARGETS.BOARD, ANNOUNCEMENT_TARGETS.FOOD_KIOSK, ANNOUNCEMENT_TARGETS.DRIVER_KIOSK]).map(target => (
                                        <span key={target} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                            {ANNOUNCEMENT_TARGET_LABELS[target] || target}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-6">
                            <h2 className="text-xl font-bold mb-6 dark:text-white">{editingItem ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Título</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Prioridad</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="low">Info (Azul/Verde)</option>
                                        <option value="medium">Advertencia (Amarillo)</option>
                                        <option value="high">Urgente (Rojo)</option>
                                        <option value="recognition">✨ Reconocimiento (Dorado)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Mensaje / Contenido</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Multimedia</label>
                                <div className="flex gap-4 mb-2">
                                    {['text', 'image', 'video'].map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mediaType"
                                                checked={formData.media_type === type}
                                                onChange={() => setFormData({ ...formData, media_type: type })}
                                            />
                                            <span className="capitalize dark:text-gray-300">{type === 'image' ? 'Imagen' : type === 'video' ? 'Video' : 'Solo Texto'}</span>
                                        </label>
                                    ))}
                                </div>

                                {formData.media_type !== 'text' && (
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">URL del archivo (Supabase Storage o Externo)</label>
                                        <div className="flex gap-2">
                                            <input
                                                required
                                                placeholder="https://..."
                                                value={formData.media_url}
                                                onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            />
                                            <a href={formData.media_url || '#'} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                                                <ExternalLink size={20} />
                                            </a>
                                        </div>
                                        <p className="text-xs text-blue-500 mt-1">Tip: Copia la URL pública de tu bucket o de YouTube.</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Fecha Fin</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Display Targets Selection */}
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                    ¿Dónde se mostrará este anuncio?
                                </label>
                                <div className="space-y-2">
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
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm dark:text-gray-300">{ANNOUNCEMENT_TARGET_LABELS.BOARD}</span>
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
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm dark:text-gray-300">{ANNOUNCEMENT_TARGET_LABELS.FOOD_KIOSK}</span>
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
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm dark:text-gray-300">{ANNOUNCEMENT_TARGET_LABELS.DRIVER_KIOSK}</span>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Selecciona al menos una opción
                                </p>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-300"
                                />
                                <span className="dark:text-white">Anuncio Activo</span>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Guardar Anuncio</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
