import { useTheme } from '@contexts/ThemeContext'

const Footer = () => {
    const { footerText, footerLink } = useTheme()

    const currentYear = new Date().getFullYear()

    return (
        <footer className="mt-auto py-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>Sistema creado con <span className="text-red-500 animate-pulse">♥️</span> por</span>
                    <a
                        href="https://wsaico.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-gray-800 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                        wsaico
                    </a>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    © {currentYear} Gestor360° • Todos los derechos reservados.
                </p>
            </div>
        </footer>
    )
}

export default Footer
