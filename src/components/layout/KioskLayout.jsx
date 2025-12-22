import { Outlet } from 'react-router-dom'

const KioskLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative">
            {/* Background Ambience or Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-0 pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 h-screen w-screen flex flex-col">
                {children || <Outlet />}
            </div>
        </div>
    )
}

export default KioskLayout
