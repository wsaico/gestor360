import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { publicDashboardService } from '@services/publicDashboardService'
import { announcementService } from '@services/announcementService'
import AnnouncementsCarousel from '@components/dashboard/AnnouncementsCarousel'
import StationAlertsWidget from '@components/dashboard/StationAlertsWidget'
import FlipClock from '@components/dashboard/FlipClock'

export default function StationDashboard() {
    const { stationId } = useParams()
    const [announcements, setAnnouncements] = useState([])
    const [alerts, setAlerts] = useState({ birthdays: [], docs: [] })
    const [loading, setLoading] = useState(true)

    // 1. Initial Fetch
    useEffect(() => {
        async function initData() {
            if (!stationId) return
            try {
                setLoading(true)
                const [annData, alertData] = await Promise.all([
                    announcementService.getPublicAnnouncements(stationId, 'BOARD'),
                    publicDashboardService.getStationAlerts(stationId)
                ])
                setAnnouncements(annData || [])
                setAlerts(alertData || { birthdays: [], docs: [] })
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        initData()

        // 2. Refresh Interval (every 5 minutes)
        const interval = setInterval(initData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [stationId])

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
            }
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center text-3xl font-light animate-pulse text-white">Cargando Gestor360°...</div>

    return (
        <div className="flex h-screen w-screen p-6 gap-6 relative group">
            {/* Fullscreen Toggle (Hidden unless hovered/touched) */}
            <button
                onClick={toggleFullScreen}
                className="absolute top-4 right-4 z-50 p-3 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            </button>

            {/* Left: Main Carousel (75%) */}
            <div className="w-3/4 h-full relative bg-black/20 rounded-3xl overflow-hidden shadow-2xl border border-white/5 backdrop-blur-sm">
                <AnnouncementsCarousel items={announcements} />
            </div>

            {/* Right: Widgets & Info (25%) */}
            <div className="w-1/4 h-full flex flex-col gap-6">
                <div className="flex-1 bg-black/20 rounded-3xl p-6 border border-white/5 backdrop-blur-sm overflow-hidden">
                    <StationAlertsWidget data={alerts} />
                </div>

                {/* Clock / Footer */}
                <div className="h-32 bg-transparent rounded-3xl flex items-center justify-center">
                    <FlipClock />
                </div>
            </div>
        </div>
    )
}
