import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

// Convertir HEX a RGB para opacidades dinámicas
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme debe ser usado dentro de un ThemeProvider')
    }
    return context
}

// Definición de paletas de colores completas (Tailwind Values)
export const COLOR_THEMES = {
    blue: {
        50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
        500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
    },
    green: { // Emerald
        50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
        500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
    },
    purple: { // Violet
        50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
        500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95'
    },
    orange: { // Orange
        50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
        500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12'
    },
    navy: { // Slate
        50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
        500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a'
    }
}

export const ThemeProvider = ({ children }) => {
    // Estado inicial desde localStorage o defaults
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('gestor360_theme_mode') === 'dark'
    })

    const [colorTheme, setColorTheme] = useState(() => {
        return localStorage.getItem('gestor360_theme_color') || 'blue'
    })

    // Efecto para aplicar modo oscuro
    useEffect(() => {
        const root = window.document.documentElement
        if (darkMode) {
            root.classList.add('dark')
            localStorage.setItem('gestor360_theme_mode', 'dark')
        } else {
            root.classList.remove('dark')
            localStorage.setItem('gestor360_theme_mode', 'light')
        }
    }, [darkMode])

    // Efecto para aplicar colores dinámicos
    useEffect(() => {
        const root = window.document.documentElement
        const theme = COLOR_THEMES[colorTheme] || COLOR_THEMES.blue

        // Iterar sobre todos los tonos (50-900) e inyectar variables CSS
        Object.keys(theme).forEach((key) => {
            const hexColor = theme[key]
            root.style.setProperty(`--color-primary-${key}`, hexColor)

            // Convertir HEX a RGB para opacidades dinámicas
            const rgb = hexToRgb(hexColor)
            if (rgb) {
                root.style.setProperty(`--color-primary-${key}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`)
            }
        })

        // Variables de compatibilidad para index.css legacy (si las hubiere)
        root.style.setProperty('--color-primary', theme[600])
        root.style.setProperty('--color-primary-hover', theme[700])
        root.style.setProperty('--color-ring', theme[500])

        localStorage.setItem('gestor360_theme_color', colorTheme)
    }, [colorTheme])

    const [headerColor, setHeaderColor] = useState(() => {
        return localStorage.getItem('gestor360_header_color') || '#ffffff' // Default white
    })

    useEffect(() => {
        localStorage.setItem('gestor360_header_color', headerColor)
    }, [headerColor])

    // Migration/Fix: If user has the old default "Soft Black", switch them to White as requested
    useEffect(() => {
        const stored = localStorage.getItem('gestor360_header_color')
        if (stored === '#1F2937') {
            setHeaderColor('#ffffff')
        }
    }, [])

    const [footerText, setFooterText] = useState(() => {
        return localStorage.getItem('gestor360_footer_text') || 'Hecho con ❤️ por'
    })

    const [footerLink, setFooterLink] = useState(() => {
        return localStorage.getItem('gestor360_footer_link') || 'wsaico.com'
    })

    useEffect(() => {
        localStorage.setItem('gestor360_footer_text', footerText)
    }, [footerText])

    useEffect(() => {
        localStorage.setItem('gestor360_footer_link', footerLink)
    }, [footerLink])

    const toggleTheme = () => {
        setDarkMode(!darkMode)
    }

    const value = {
        darkMode,
        toggleTheme,
        colorTheme,
        setColorTheme,
        availableThemes: COLOR_THEMES,
        headerColor,
        setHeaderColor,
        footerText,
        setFooterText,
        footerLink,
        setFooterLink
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeContext
