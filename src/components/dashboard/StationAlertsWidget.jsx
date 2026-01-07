import { useEffect, useState } from 'react'
import { Bell, Calendar, FileText, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function StationAlertsWidget({ data }) {
    const birthdays = data.birthdays || []
    const docs = data.docs || []

    return (
        <div className="h-full flex flex-col gap-4 relative overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="p-2 bg-yellow-400/20 rounded-lg text-yellow-400">
                    <Bell size={24} className="animate-bounce-slow" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white leading-none">Centro de Alertas</h2>
                    <span className="text-xs text-white/40 uppercase tracking-widest">Monitoreo en Vivo</span>
                </div>
            </div>

            {/* Dynamic Content Area - Split 50/50 vertically */}

            {/* Section 1: Birthdays */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2 text-purple-300">
                    <Calendar size={18} />
                    <span className="font-bold uppercase text-sm tracking-wide">Próximos Cumpleaños</span>
                    <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">{birthdays.length}</span>
                </div>

                <div className="flex-1 relative overflow-hidden bg-white/5 rounded-2xl p-4 border border-white/5">
                    {birthdays.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-white/30 text-sm italic">
                            No hay cumpleaños este mes
                        </div>
                    ) : (
                        <AutoScrollList items={birthdays} type="birthday" />
                    )}
                </div>
            </div>

            {/* Section 2: Expirations */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2 text-orange-300">
                    <FileText size={18} />
                    <span className="font-bold uppercase text-sm tracking-wide">Vencimientos Próximos</span>
                    <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-0.5 rounded-full">{docs.length}</span>
                </div>

                <div className="flex-1 relative overflow-hidden bg-white/5 rounded-2xl p-4 border border-white/5">
                    {docs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-white/30 text-sm italic">
                            Todo en regla ✅
                        </div>
                    ) : (
                        <AutoScrollList items={docs} type="doc" />
                    )}
                </div>
            </div>
        </div>
    )
}

function AutoScrollList({ items, type }) {
    // If few items, no need to scroll
    if (items.length <= 2) {
        return (
            <div className="flex flex-col gap-3">
                {items.map((item, idx) => (
                    <ListItem key={idx} item={item} type={type} />
                ))}
            </div>
        )
    }

    // Auto-scroll logic
    return (
        <div className="w-full h-full relative overflow-hidden">
            <motion.div
                className="flex flex-col gap-3 absolute w-full"
                animate={{ y: [0, -100 * items.length] }} // Rough calculation, better to just cycle
                transition={{
                    y: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: items.length * 3, // 3 seconds per item
                        ease: "linear"
                    }
                }}
            >
                {/* Duplicate list for seamless loop */}
                {[...items, ...items].map((item, idx) => (
                    <ListItem key={`${idx}`} item={item} type={type} />
                ))}
            </motion.div>
        </div>
    )
}

function ListItem({ item, type }) {
    if (type === 'birthday') {
        return (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                    {item.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-white truncate text-sm">{item.full_name}</div>
                    <div className="text-xs text-purple-200 bg-purple-500/20 inline-block px-2 rounded mt-0.5">
                        🎉 {item.birth_day_str}
                    </div>
                </div>
            </div>
        )
    }

    // Doc
    const isExpired = item.status === 'expired'
    return (
        <div className={`flex items-center gap-3 p-3 bg-white/5 rounded-xl border-l-4 shrink-0 ${isExpired ? 'border-red-500 bg-red-500/10' : 'border-orange-500'}`}>
            <div className="min-w-0 flex-1">
                <div className="font-bold text-white truncate text-sm">{item.full_name}</div>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">{item.document_type}</span>
                    <span className={`text-xs font-mono font-bold ${isExpired ? 'text-red-400' : 'text-orange-300'}`}>
                        {item.expiry_date_fmt}
                    </span>
                </div>
            </div>
        </div>
    )
}
