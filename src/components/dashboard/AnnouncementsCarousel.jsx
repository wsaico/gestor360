import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AnnouncementsCarousel({ items = [] }) {
    const [viewMode, setViewMode] = useState('carousel') // 'carousel' | 'mural'
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)

    // Auto-play Logic (Only active in Carousel mode)
    useEffect(() => {
        if (isPaused || viewMode === 'mural') return

        const currentItem = items[currentIndex]
        // Default 10s, but maybe flexible later
        const duration = currentItem.media_type === 'video' ? 30000 : 15000 // Extended default to 15s for reading

        const timer = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length)
        }, duration)

        return () => clearTimeout(timer)
    }, [currentIndex, items, isPaused, viewMode])

    const currentItem = items[currentIndex]

    // Priority Colors
    const borderColor = currentItem.priority === 'high' ? 'border-red-500' :
        currentItem.priority === 'medium' ? 'border-yellow-400' : 'border-blue-500/30'

    const accentColor = currentItem.priority === 'high' ? 'bg-red-600' :
        currentItem.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-600'

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Animation Variants
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            scale: 0.95
        })
    }

    // Helper to detect recognition
    const isRecognition = (item) => {
        const keywords = ['reconocimiento', 'felicitaciones', 'empleado del mes', 'logro', 'premio', 'ganador', 'felicidades']
        return keywords.some(k => item.title.toLowerCase().includes(k)) || item.priority === 'recognition' // Future proofing
    }

    return (
        <div
            className={`w-full h-full relative bg-gray-900 border-t-8 ${borderColor} flex flex-col group overflow-hidden`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
        >
            {/* View Toggle Button */}
            <button
                onClick={() => setViewMode(prev => prev === 'carousel' ? 'mural' : 'carousel')}
                className="absolute top-6 left-6 z-50 bg-black/40 text-white/80 p-2 rounded-full backdrop-blur-md hover:bg-white/20 transition-all"
                title={viewMode === 'carousel' ? "Ver Mural" : "Ver Carrusel"}
            >
                {viewMode === 'carousel' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                )}
            </button>

            <AnimatePresence initial={false} mode="wait">
                {viewMode === 'mural' ? (
                    <motion.div
                        key="mural"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="absolute inset-0 z-40 bg-gray-900 overflow-y-auto p-8 custom-scrollbar"
                    >
                        <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                            <span className="text-yellow-400">❖</span> Mural de Anuncios
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
                            {items.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    layoutId={`item-${idx}`}
                                    onClick={() => {
                                        setCurrentIndex(idx)
                                        setViewMode('carousel')
                                        setIsPaused(true)
                                    }}
                                    className={`relative group cursor-pointer bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 hover:border-gray-500 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${isRecognition(item) ? 'ring-2 ring-yellow-500/50' : ''
                                        }`}
                                >
                                    {/* Thumbnail Area */}
                                    <div className="h-40 bg-gray-900 relative overflow-hidden">
                                        {item.media_type === 'image' || (item.media_type === 'video' && getYouTubeId(item.media_url)) ? (
                                            <img
                                                src={item.media_type === 'video' ? `https://img.youtube.com/vi/${getYouTubeId(item.media_url)}/default.jpg` : item.media_url}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                alt=""
                                            />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${item.priority === 'high' ? 'bg-gradient-to-br from-red-900 to-black' :
                                                item.priority === 'medium' ? 'bg-gradient-to-br from-yellow-800 to-black' :
                                                    'bg-gradient-to-br from-blue-900 to-black'
                                                }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                                            </div>
                                        )}

                                        {/* Type Icon Overlay */}
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg text-white/90">
                                            {item.priority === 'recognition' ? <span>🏆</span> :
                                                item.media_type === 'video' ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg> :
                                                    item.media_type === 'image' ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> :
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>}
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-4">
                                        <div className="mb-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.priority === 'high' ? 'text-red-300 border-red-900 bg-red-900/20' :
                                                item.priority === 'recognition' ? 'text-yellow-300 border-yellow-900 bg-yellow-900/20' :
                                                    'text-blue-300 border-blue-900 bg-blue-900/20'
                                                }`}>
                                                {item.priority === 'high' ? 'Urgente' : item.priority === 'recognition' ? 'Reconocimiento' : 'Info'}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-2 group-hover:text-yellow-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                            {item.message}
                                        </p>
                                        <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                                            <span>Click para ampliar</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="carousel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0"
                    >
                        {/* CAROUSEL CONTENT START */}
                        <AnimatePresence initial={false} custom={1}>
                            <motion.div
                                key={currentIndex}
                                // ... (rest of the carousel logic remains unchanged) ...
                                custom={1}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{
                                    x: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="absolute inset-0 bg-black"
                            >
                                {/* CONTENT RENDERER */}
                                {isRecognition(currentItem) ? (
                                    /* --- RECOGNITION THEME (GOLD/PREMIUM) --- */
                                    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900 via-amber-900 to-black">
                                        {/* Animated Background Effects */}
                                        <div className="absolute inset-0 opacity-40">
                                            <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-yellow-500/20 skew-x-12 blur-3xl animate-pulse" />
                                            <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-amber-500/10 skew-x-12 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                                            {/* Sparkles */}
                                            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-200 rounded-full blur-[2px] animate-ping" />
                                            <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-white rounded-full blur-[1px] animate-ping" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
                                        </div>

                                        <div className="relative z-10 w-full max-w-7xl grid grid-cols-12 gap-8 p-8 md:p-12 pb-24 items-center h-full">
                                            {/* Left: Text */}
                                            <div className="col-span-12 md:col-span-6 flex flex-col justify-center h-full space-y-4 md:space-y-6">
                                                <div className="inline-block relative self-start">
                                                    <div className="absolute inset-0 bg-yellow-500 blur-lg opacity-40 animate-pulse"></div>
                                                    <span className="relative inline-block px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest text-amber-100 bg-amber-900/50 border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] mb-2 backdrop-blur-md">
                                                        ✨ {currentItem.priority === 'high' ? 'Excelencia' : 'Reconocimiento'}
                                                    </span>
                                                </div>

                                                <h1 className={`${currentItem.title.length > 30 ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'} font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-100 to-amber-200 drop-shadow-sm leading-tight tracking-tight`}>
                                                    {currentItem.title}
                                                </h1>

                                                <div className="h-1 w-24 bg-gradient-to-r from-yellow-500 to-transparent rounded-full opacity-50" />

                                                <div className="relative w-full">
                                                    <div className="absolute inset-0 bg-black/20 blur-xl rounded-full -z-10"></div>
                                                    <p className={`${currentItem.message.length > 300 ? 'text-lg md:text-xl' : currentItem.message.length > 150 ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} leading-snug text-yellow-50 font-light drop-shadow-md pr-0 md:pr-4`}>
                                                        {currentItem.message}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right: Image (if exists) */}
                                            {currentItem.media_type === 'image' && (
                                                <div className="col-span-12 md:col-span-6 flex justify-center items-center relative h-full">
                                                    {/* Golden Frame Effect */}
                                                    <div className="relative p-2 bg-gradient-to-tr from-yellow-600 via-amber-200 to-yellow-700 rounded-lg shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-700 w-full max-w-lg aspect-[4/5] md:aspect-auto">
                                                        <div className="bg-black/80 w-full h-full rounded sm:rounded-md overflow-hidden relative">
                                                            <img
                                                                src={currentItem.media_url}
                                                                className="w-full h-full object-cover"
                                                                alt="Recognition"
                                                            />
                                                        </div>
                                                        {/* Shine effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-30 pointer-events-none rounded-lg mix-blend-overlay" />
                                                    </div>
                                                </div>
                                            )}
                                            {/* If no image, maybe show a generic trophy icon or center the text? - keeping structure simple for now */}
                                            {currentItem.media_type !== 'image' && (
                                                <div className="col-span-12 md:col-span-6 flex justify-center items-center opacity-10">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="url(#gold-gradient)"><defs><linearGradient id="gold-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#FCD34D" /><stop offset="100%" stopColor="#451a03" /></linearGradient></defs><path d="M5 2H19C19.5523 2 20 2.44772 20 3V6.2107C22.28 6.57968 24 8.56688 24 11C24 13.6234 22.0125 15.7766 19.4939 16.0955C18.9953 19.227 16.5166 21.6882 13.5 22.3427V23H15V25H9V23H10.5V22.3427C7.48336 21.6882 5.00472 19.227 4.50613 16.0955C1.98751 15.7766 0 13.6234 0 11C0 8.56688 1.72004 6.57968 4 6.2107V3C4 2.44772 4.44772 2 5 2ZM6 4V15.021C6.32174 15.0076 6.64998 15.0029 6.98555 15.0069C10.7497 15.0519 13.5576 17.6534 14.4172 21H9.5828C10.4424 17.6534 13.2503 15.0519 17.0145 15.0069C17.35 15.0029 17.6783 15.0076 18 15.021V4H6ZM2 11C2 12.6569 3.34315 14 5 14C5.35332 14 5.69176 13.926 6 13.7915V8.20847C5.69176 8.07403 5.35332 8 5 8C3.34315 8 2 9.34315 2 11ZM22 11C22 9.34315 20.6569 8 19 8C18.6467 8 18.3082 8.07403 18 8.20847V13.7915C18.3082 13.926 18.6467 14 19 14C20.6569 14 22 12.6569 22 11Z"></path></svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : currentItem.media_type === 'image' ? (
                                    /* IMAGE LAYOUT: SPLIT VIEW (Text Left, Image Right) */
                                    <div className="w-full h-full relative overflow-hidden flex items-center">
                                        {/* 1. Blurred Background */}
                                        <div
                                            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-125"
                                            style={{ backgroundImage: `url(${currentItem.media_url})` }}
                                        />

                                        {/* 2. Content Container (Grid) */}
                                        <div className="relative z-10 w-full h-full grid grid-cols-12 gap-8 p-12 pb-32">
                                            {/* Left: Text (Cols 5) */}
                                            <div className="col-span-5 flex flex-col justify-center space-y-6">
                                                <div>
                                                    <span className={`inline-block px-4 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider text-white border ${borderColor} bg-black/40 backdrop-blur-md shadow-lg`}>
                                                        {currentItem.priority === 'high' ? '🔥 Atención' : '📢 Comunicado'}
                                                    </span>
                                                </div>
                                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-2xl">
                                                    {currentItem.title}
                                                </h1>
                                                <div className="h-1 w-20 bg-white/30 rounded-full" />
                                                <p className="text-xl text-gray-100 font-medium leading-relaxed drop-shadow-lg opacity-90">
                                                    {currentItem.message}
                                                </p>
                                            </div>

                                            {/* Right: Image (Cols 7) */}
                                            <div className="col-span-7 flex items-center justify-center relative">
                                                <motion.img
                                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                    src={currentItem.media_url}
                                                    className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
                                                    alt={currentItem.title}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : currentItem.media_type === 'video' ? (
                                    /* VIDEO LAYOUT: Fullscreen with Overlay Text */
                                    <div className="w-full h-full relative bg-black">
                                        {getYouTubeId(currentItem.media_url) ? (
                                            <div className="w-full h-full pointer-events-none scale-150">
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${getYouTubeId(currentItem.media_url)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${getYouTubeId(currentItem.media_url)}&rel=0&showinfo=0&iv_load_policy=3`}
                                                    className="w-full h-full object-cover"
                                                    allow="autoplay; encrypted-media"
                                                    title="Announcement Video"
                                                />
                                            </div>
                                        ) : (
                                            <video
                                                src={currentItem.media_url}
                                                className="w-full h-full object-cover"
                                                autoPlay muted loop
                                            />
                                        )}

                                        {/* Text Overlay for Video */}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-20" />
                                        <div className="absolute bottom-36 left-12 right-12 z-30 pointer-events-none">
                                            <span className={`inline-block px-3 py-1 rounded mb-4 text-sm font-bold uppercase tracking-wider text-white border ${borderColor} bg-black/50 backdrop-blur-md`}>
                                                {currentItem.priority === 'high' ? 'Atención' : 'Comunicado'}
                                            </span>
                                            <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg leading-tight line-clamp-2">
                                                {currentItem.title}
                                            </h1>
                                            <p className="text-2xl text-gray-200 font-light max-w-5xl leading-relaxed drop-shadow line-clamp-2">
                                                {currentItem.message}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* TEXT ONLY LAYOUT: Elegant Gradient/Solid */
                                    <div className={`w-full h-full relative flex items-center justify-center overflow-hidden
                            ${currentItem.priority === 'high'
                                            ? 'bg-gradient-to-br from-red-900 via-red-800 to-black'
                                            : currentItem.priority === 'medium'
                                                ? 'bg-gradient-to-br from-orange-900 via-yellow-900 to-black'
                                                : 'bg-gradient-to-br from-blue-900 via-slate-900 to-black'}
                        `}>
                                        {/* Decorative Elements */}
                                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

                                        <div className="relative z-10 max-w-5xl p-12 text-center pb-32">
                                            <div className="mb-8 flex justify-center">
                                                <span className={`inline-block px-6 py-2 rounded-full text-base font-bold uppercase tracking-widest text-white border-2 border-white/20 bg-white/5 backdrop-blur-sm shadow-xl`}>
                                                    {currentItem.priority === 'high' ? '🚨 Comunicado Importante 🚨' : 'ℹ️ Información General'}
                                                </span>
                                            </div>
                                            <h1 className="text-6xl md:text-7xl font-black text-white mb-8 leading-tight drop-shadow-2xl tracking-tight">
                                                {currentItem.title}
                                            </h1>
                                            <div className="h-1 w-32 bg-white/20 mx-auto rounded-full mb-8" />
                                            <p className="text-3xl md:text-4xl text-gray-100 font-light leading-normal drop-shadow-lg opacity-95">
                                                {currentItem.message}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                        {/* CAROUSEL CONTENT END */}
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Pause Indicator (Subtle) - Only in Carousel Mode */}
            {
                isPaused && viewMode === 'carousel' && (
                    <div className="absolute top-6 right-6 z-50 bg-black/40 text-white/80 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
                        <span>Lectura Activada</span>
                    </div>
                )
            }

            {/* Thumbnails Navigation Strip - Only in Carousel Mode */}
            {viewMode === 'carousel' && (
                <div className="absolute bottom-0 left-0 right-0 h-28 z-40 bg-gradient-to-t from-black/90 to-transparent flex items-end pb-4 px-6 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-4 mx-auto">
                        {items.map((item, idx) => {
                            const isSelected = idx === currentIndex
                            const ytId = getYouTubeId(item.media_url)
                            const thumbUrl = item.media_type === 'video' && ytId
                                ? `https://img.youtube.com/vi/${ytId}/default.jpg`
                                : item.media_url

                            return (
                                <button
                                    key={idx}
                                    onClick={() => { setCurrentIndex(idx); setIsPaused(true); }} // Pause on interaction
                                    className={`relative h-16 w-28 rounded-xl overflow-hidden transition-all duration-300 transform flex-shrink-0 ${isSelected ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-50 hover:opacity-80 hover:scale-105'}`}
                                >
                                    {item.media_type === 'video' ? (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                            {ytId ? (
                                                <img src={thumbUrl} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            </div>
                                        </div>
                                    ) : item.media_type === 'image' && thumbUrl ? (
                                        <img src={thumbUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        /* Text Only Thumbnail */
                                        <div className={`w-full h-full flex items-center justify-center
                                        ${item.priority === 'high'
                                                ? 'bg-gradient-to-br from-red-800 to-black'
                                                : item.priority === 'medium'
                                                    ? 'bg-gradient-to-br from-yellow-700 to-black'
                                                    : 'bg-gradient-to-br from-blue-800 to-black'}
                                    `}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="3" y2="18"></line></svg>
                                        </div>
                                    )}

                                    {isSelected && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="absolute inset-0 border-2 border-white rounded-xl"
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
