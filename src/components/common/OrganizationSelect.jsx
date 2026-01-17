import React, { useMemo } from 'react'
import { Building2 } from 'lucide-react'
import { getNormalizedOrganizationName, ORGANIZATION_NAME_MAPPINGS } from '../../utils/organizationUtils'

/**
 * Componente reutilizable para selección de organizaciones
 * Incluye lógica de limpieza y unificación de nombres duplicados
 */
const OrganizationSelect = ({
    organizations = [],
    value,
    onChange,
    className = "",
    label = "-- Seleccione Organización --",
    showIcon = false,
    ...props
}) => {

    // Lógica de limpieza y deduplicación
    const cleanedOrganizations = useMemo(() => {
        const uniqueOrgs = new Map();

        organizations.forEach(org => {
            const normalizedName = getNormalizedOrganizationName(org.name);

            // Si ya existe una organización con este nombre normalizado, la ignoramos (deduplicación simple)
            // Se conserva el ID de la primera que se encuentre.
            // NOTA: Esto asume que para efectos de visualización/selección básica, cualquiera de los IDs es válido.
            // Si se requiere filtrar por TODOS los IDs asociados a "LATAM", se requeriría una lógica diferente en el padre.
            if (!uniqueOrgs.has(normalizedName)) {
                uniqueOrgs.set(normalizedName, { ...org, name: normalizedName });
            }
        });

        // Convertir a array y ordenar alfabéticamente
        return Array.from(uniqueOrgs.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [organizations]);

    return (
        <label className={`relative ${className} `}>
            {showIcon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                </div>
            )}
            <select
                className={`select select-bordered w-full h-full ${showIcon ? 'pl-10' : ''} bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500`}
                value={value}
                onChange={onChange}
                {...props}
            >
                <option value="">{label}</option>
                {cleanedOrganizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                ))}
            </select>
        </label>
    )
}

export default OrganizationSelect
