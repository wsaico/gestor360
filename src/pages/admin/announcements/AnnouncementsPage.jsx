import { useState, useEffect } from 'react'
import { announcementService } from '@services/announcementService'
import { supabase } from '@services/supabase'
import { Plus, Trash2, Edit, Video, Image as ImageIcon, Type, ExternalLink, Upload, Loader2, FileText } from 'lucide-react'
import { ANNOUNCEMENT_TARGETS, ANNOUNCEMENT_TARGET_LABELS } from '@utils/constants'

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
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

        // Realtime Subscription
        const channel = supabase
            .channel('admin-announcements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
                fetchAnnouncements()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        try {
            setUploading(true)
            const url = await announcementService.uploadMedia(file)
            const type = file.type.includes('pdf') ? 'pdf' : 'image'
            setFormData(prev => ({ ...prev, media_url: url, media_type: type }))
        } catch (err) {
            console.error(err)
            alert('Error al subir archivo')
        } finally {
            setUploading(false)
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

            // DEBUG: Ver qué se está enviando
            // alert('Enviando: ' + JSON.stringify(payload.display_targets))

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
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mediaType"
                                            checked={formData.media_type === 'text'}
                                            onChange={() => setFormData({ ...formData, media_type: 'text', media_url: '' })}
                                        />
                                        <span className="dark:text-gray-300">Solo Texto</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mediaType"
                                            checked={formData.media_type === 'image' || formData.media_type === 'pdf'}
                                            onChange={() => setFormData({ ...formData, media_type: 'image' })} // Default to image, handles pdf on upload
                                        />
                                        <span className="dark:text-gray-300">Imagen / PDF</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mediaType"
                                            checked={formData.media_type === 'video'}
                                            onChange={() => setFormData({ ...formData, media_type: 'video', media_url: '' })}
                                        />
                                        <span className="dark:text-gray-300">Video (YouTube)</span>
                                    </label>
                                </div>

                                {/* FILE UPLOAD AREA (Image/PDF) */}
                                {(formData.media_type === 'image' || formData.media_type === 'pdf') && (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-500 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                        {uploading ? (
                                            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                                                <Loader2 className="animate-spin" />
                                                <span className="text-sm font-medium">Subiendo archivo...</span>
                                            </div>
                                        ) : (
                                            <>
                                                {!formData.media_url ? (
                                                    <div className="flex flex-col items-center justify-center gap-2 cursor-pointer relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handleFileUpload}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                        <Upload className="text-gray-400" />
                                                        <p className="text-sm text-gray-500 dark:text-gray-300">Haz clic o arrastra una imagen o PDF aquí</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-100 dark:border-blue-800">
                                                        <div className="flex items-center gap-3">
                                                            {formData.media_type === 'pdf' ? (
                                                                <FileText className="text-red-500" />
                                                            ) : (
                                                                <img
                                                                    src={formData.media_url}
                                                                    alt="Preview"
                                                                    className="w-10 h-10 object-cover rounded"
                                                                />
                                                            )}
                                                            <div className="text-sm truncate max-w-[200px] dark:text-gray-200">
                                                                <span className="font-medium block">
                                                                    {formData.media_type === 'pdf' ? 'Documento PDF' : 'Imagen Adjunta'}
                                                                </span>
                                                                <a href={formData.media_url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 text-xs hover:underline">
                                                                    Ver archivo
                                                                </a>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, media_url: '', media_type: 'image' }))}
                                                            className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* VIDEO URL INPUT */}
                                {formData.media_type === 'video' && (
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">URL de YouTube</label>
                                        <div className="flex gap-2">
                                            <input
                                                required
                                                placeholder="https://youtube.com/..."
                                                value={formData.media_url}
                                                onChange={e => setFormData({ ...formData, media_url: e.target.value })}
                                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            />
                                            {formData.media_url && (
                                                <a href={formData.media_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                                                    <ExternalLink size={20} />
                                                </a>
                                            )}
                                        </div>
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
