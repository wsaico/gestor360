import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Single Flip Card Component
const FlipCard = ({ digit, unit }) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-14 h-20 md:w-16 md:h-24 bg-[#1a1a1a] rounded-lg shadow-lg border border-white/10 perspective-1000">
                {/* Static Background */}
                <div className="absolute inset-0 flex flex-col">
                    <div className="flex-1 bg-[#222] rounded-t-lg border-b border-black/50 relative overflow-hidden">
                        <span className="absolute bottom-0 left-0 right-0 text-center text-4xl md:text-5xl font-bold text-white translate-y-1/2 font-mono">
                            {digit}
                        </span>
                    </div>
                    <div className="flex-1 bg-[#222] rounded-b-lg border-t border-black/20 relative overflow-hidden">
                        <span className="absolute top-0 left-0 right-0 text-center text-4xl md:text-5xl font-bold text-white -translate-y-1/2 font-mono">
                            {digit}
                        </span>
                    </div>
                </div>

                {/* Animated Overlay for Change */}
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={digit}
                        initial={{ rotateX: 90, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        exit={{ rotateX: -90, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="absolute inset-0 z-20 backface-hidden"
                    >
                        <div className="w-full h-full flex flex-col">
                            <div className="flex-1 bg-[#222] rounded-t-lg border-b border-black/50 relative overflow-hidden flex items-end justify-center">
                                <span className="translate-y-1/2 text-4xl md:text-5xl font-bold text-white font-mono">{digit}</span>
                            </div>
                            <div className="flex-1 bg-[#222] rounded-b-lg border-t border-black/20 relative overflow-hidden flex items-start justify-center">
                                <span className="-translate-y-1/2 text-4xl md:text-5xl font-bold text-white font-mono">{digit}</span>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Hinge Line */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-black/80 z-30 shadow-sm" />
            </div>
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{unit}</span>
        </div>
    )
}

const Divider = () => (
    <div className="flex flex-col gap-2 pt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></div>
    </div>
)

export default function FlipClock() {
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Helpers to get digits
    const format = (num) => num.toString().padStart(2, '0')

    const h = format(time.getHours())
    const m = format(time.getMinutes())
    const s = format(time.getSeconds())

    return (
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/5 shadow-2xl scale-90 md:scale-100 origin-center filter drop-shadow-lg">
            <FlipCard digit={h} unit="Horas" />
            <Divider />
            <FlipCard digit={m} unit="Minutos" />
            <Divider />
            <FlipCard digit={s} unit="Segundos" />
        </div>
    )
}
