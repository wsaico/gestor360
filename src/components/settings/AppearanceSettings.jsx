import { Moon, Sun, Check } from 'lucide-react'
import { useTheme } from '@contexts/ThemeContext'

const AppearanceSettings = () => {
    const {
        darkMode, toggleTheme, colorTheme, setColorTheme, availableThemes,
        headerColor, setHeaderColor,
        footerText, setFooterText,
        footerLink, setFooterLink
    } = useTheme()

    const handleColorSelect = (key) => {
        setColorTheme(key)
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Apariencia y Personalización</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Personaliza cómo se ve Gestor360° para ti.
                </p>
            </div>

            {/* Theme Mode Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tema</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div
                        onClick={() => darkMode && toggleTheme()}
                        className={`
              relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none
              ${!darkMode
                                ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }
            `}
                    >
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="flex items-center space-x-2 block text-sm font-medium text-gray-900 dark:text-white">
                                    <Sun className={`h-5 w-5 ${!darkMode ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <span>Claro</span>
                                </span>
                                <span className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    Interfaz clásica con fondos claros.
                                </span>
                            </span>
                        </span>
                        <span
                            className={`
                h-5 w-5 rounded-full border flex items-center justify-center
                ${!darkMode ? 'bg-primary-600 border-transparent' : 'bg-white border-gray-300'}
              `}
                        >
                            {!darkMode && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                        </span>
                    </div>

                    <div
                        onClick={() => !darkMode && toggleTheme()}
                        className={`
              relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none
              ${darkMode
                                ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }
            `}
                    >
                        <span className="flex flex-1">
                            <span className="flex flex-col">
                                <span className="flex items-center space-x-2 block text-sm font-medium text-gray-900 dark:text-white">
                                    <Moon className={`h-5 w-5 ${darkMode ? 'text-primary-600' : 'text-gray-400'}`} />
                                    <span>Oscuro</span>
                                </span>
                                <span className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    Menor fatiga visual en ambientes oscuros.
                                </span>
                            </span>
                        </span>
                        <span
                            className={`
                h-5 w-5 rounded-full border flex items-center justify-center
                ${darkMode ? 'bg-primary-600 border-transparent' : 'bg-white border-gray-300'}
              `}
                        >
                            {darkMode && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                        </span>
                    </div>
                </div>
            </div>

            {/* Accent Color Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Color de Énfasis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Selecciona el color principal para botones y resaltados.
                </p>

                <div className="flex flex-wrap gap-4">
                    {Object.entries(availableThemes).map(([key, theme]) => (
                        <button
                            key={key}
                            onClick={() => handleColorSelect(key)}
                            className={`
                group relative h-12 w-12 rounded-full shadow-sm flex items-center justify-center transition-transform hover:scale-105 focus:outline-none
                ${colorTheme === key ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : ''}
              `}
                            style={{ backgroundColor: theme[600] }}
                            title={key.charAt(0).toUpperCase() + key.slice(1)}
                        >
                            {colorTheme === key && (
                                <Check className="h-6 w-6 text-white" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Header Color Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Color del Encabezado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Personaliza el color de fondo de la barra superior.
                </p>

                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color Personalizado</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                value={headerColor}
                                onChange={(e) => setHeaderColor(e.target.value)}
                                className="h-10 w-20 p-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                            />
                            <span className="text-sm text-gray-500 font-mono">{headerColor}</span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preestablecidos</label>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setHeaderColor('#1F2937')}
                                className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                style={{ backgroundColor: '#1F2937' }}
                                title="Negro Suave"
                            />
                            <button
                                onClick={() => setHeaderColor('#FFFFFF')}
                                className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                style={{ backgroundColor: '#FFFFFF' }}
                                title="Blanco (Por defecto)"
                            />
                            <button
                                onClick={() => setHeaderColor('#111827')}
                                className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                style={{ backgroundColor: '#111827' }}
                                title="Negro Profundo"
                            />
                            <button
                                onClick={() => setHeaderColor('#3B82F6')}
                                className="w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                                style={{ backgroundColor: '#3B82F6' }}
                                title="Azul Corporativo"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Personalization Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Pie de Página (Footer)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Personaliza el mensaje y el enlace que aparecen en la parte inferior de todas las páginas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto del Footer</label>
                        <input
                            type="text"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="Ej: Hecho con ❤️ por"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enlace / Web (URL)</label>
                        <div className="flex items-center">
                            <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 text-sm">
                                https://
                            </span>
                            <input
                                type="text"
                                value={footerLink}
                                onChange={(e) => setFooterLink(e.target.value)}
                                placeholder="wsaico.com"
                                className="flex-1 px-4 py-2 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AppearanceSettings
