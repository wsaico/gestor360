import { useEffect, useState } from 'react';
import { useTheme } from '@contexts/ThemeContext';

const ThemeDebug = () => {
    const { darkMode, colorTheme } = useTheme();
    const [htmlClasses, setHtmlClasses] = useState('');
    const [lsMode, setLsMode] = useState('');

    useEffect(() => {
        // Update debug info every 500ms
        const interval = setInterval(() => {
            setHtmlClasses(document.documentElement.className);
            setLsMode(localStorage.getItem('gestor360_theme_mode'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            padding: '10px',
            borderRadius: '5px',
            zIndex: 9999,
            fontSize: '12px',
            fontFamily: 'monospace'
        }}>
            <div><strong>DEBUG INFO</strong></div>
            <div>Context Dark: {String(darkMode)}</div>
            <div>Context Color: {colorTheme}</div>
            <div>HTML Classes: "{htmlClasses}"</div>
            <div>LS Mode: {lsMode}</div>
            <div>Configured: Tailwind "class" detected</div>
        </div>
    );
};

export default ThemeDebug;
