
/**
 * Utility functions for Organization management
 */

// Mapeo de nombres para normalización/limpieza
export const ORGANIZATION_NAME_MAPPINGS = {
    'LATAM': 'LATAM',
    'LATAM PERU': 'LATAM',
    'LATAM AIRLINES': 'LATAM',
    'LATAM AIRLINES PERU': 'LATAM',
    'SKY': 'SKY',
    'SKY AIRLINE': 'SKY',
    'SKY AIRLINE PERU': 'SKY',
    'JETSMART': 'JetSmart',
    'JET SMART': 'JetSmart',
    'JETSMART AIRLINES': 'JetSmart',
    'TALMA': 'Talma',
    'TALMA SERVICIOS AEROPORTUARIOS': 'Talma'
}

/**
 * Normaliza el nombre de una organización para visualización unificada
 * @param {string} name - Nombre original de la organización
 * @returns {string} - Nombre normalizado
 */
export const getNormalizedOrganizationName = (name) => {
    if (!name) return 'Sin Organización';

    const upperName = name.toUpperCase().trim();

    // Buscar coincidencia directa o parcial
    for (const [key, val] of Object.entries(ORGANIZATION_NAME_MAPPINGS)) {
        if (upperName.includes(key)) {
            return val;
        }
    }

    return name;
}
