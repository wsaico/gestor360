import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Megaphone, ChevronRight, BellRing } from 'lucide-react'

const AnnouncementModal = ({ announcements, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (announcements && announcements.length > 0) {
            // "Smart" Check: Have we seen the latest announcement?
            const latestId = announcements[0].id
            const lastSeenId = localStorage.getItem('last_seen_announcement_id')

            // If the priority/latest announcement is new, show it.
            // Or if allowReplay is true (optional logic). For now, simple:
            if (latestId !== lastSeenId) {
                setIsOpen(true)
            }
        }
    }, [announcements])

    if (!announcements || announcements.length === 0 || !isOpen) return null

    const currentAnnouncement = announcements[currentIndex]

    const handleClose = () => {
        // Mark as seen when closed
        try {
            if (announcements.length > 0) {
                localStorage.setItem('last_seen_announcement_id', announcements[0].id)
            }
        } catch (e) { console.error(e) }

        setIsOpen(false)
        if (onClose) onClose()
    }

    const nextAnnouncement = () => {
        if (currentIndex < announcements.length - 1) {
            setCurrentIndex(currentIndex + 1)
        } else {
            handleClose()
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative"
                >
                    {/* Header Image / Illustration Area */}
                    <div className="bg-[#FF4545] h-32 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                        <div className="absolute top-4 left-4 w-12 h-12 bg-white/10 rounded-full blur-md"></div>

                        <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 shadow-lg">
                            <BellRing className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-6">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-2xl font-black text-gray-800 leading-tight">
                                {currentAnnouncement.title}
                            </h3>
                            {announcements.length > 1 && (
                                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                    {currentIndex + 1} / {announcements.length}
                                </span>
                            )}
                        </div>

                        <div className="prose prose-sm text-gray-600 mb-8 leading-relaxed">
                            <p>{currentAnnouncement.message}</p>
                        </div>

                        {/* Navigation Dots if multiple */}
                        {announcements.length > 1 && (
                            <div className="flex justify-center gap-1.5 mb-6">
                                {announcements.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-[#FF4545]' : 'w-1.5 bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                        )}

                        <button
                            onClick={nextAnnouncement}
                            className="w-full bg-[#FF4545] text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>{currentIndex < announcements.length - 1 ? 'Siguiente' : 'Entendido'}</span>
                            {currentIndex < announcements.length - 1 && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </div>

                    {/* Close Button (Top Right) */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors z-20 backdrop-blur-sm"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default AnnouncementModal
