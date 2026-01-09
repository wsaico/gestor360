import { useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'

const ForgotPasswordPage = () => {
    const navigate = useNavigate()

    return (
        <div className="h-screen flex items-center justify-center bg-[#fbfbff] font-sans">
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl shadow-secondary-100 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-secondary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <KeyRound className="w-10 h-10 text-secondary-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-[#1e1b4b] mb-4">¿Olvidaste tu contraseña?</h1>
                <p className="text-gray-500 mb-8">
                    La recuperación de contraseña se encuentra en mantenimiento. Por favor, solicite un restablecimiento manual al equipo de soporte.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    className="w-full flex items-center justify-center gap-2 bg-secondary-600 hover:bg-secondary-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-secondary-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Volver al Inicio
                </button>
            </div>
        </div>
    )
}

export default ForgotPasswordPage
