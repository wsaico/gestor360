import { useTheme } from '@contexts/ThemeContext'

const Footer = () => {
    const { footerText, footerLink } = useTheme()

    const currentYear = new Date().getFullYear()

    return (
        <footer className="mt-auto py-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{footerText}</span>
                    <a
                        href={`https://${footerLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary-600 dark:text-primary-400 hover:underline transition-all"
                    >
                        {footerLink}
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
