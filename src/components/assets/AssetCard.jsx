import React from 'react'
import { Package, MapPin, User, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import AssetStatusBadge from './AssetStatusBadge'
import AssetConditionBadge from './AssetConditionBadge'
import { formatCurrency, formatDate, calculateMaintenanceStatus } from '@/utils/helpers'
import { ASSET_CATEGORY_LABELS } from '@/utils/constants'

/**
 * Tarjeta de activo para vista de catálogo
 */
const AssetCard = ({ asset, onView, onEdit, onAssign, onTransfer }) => {
  const maintenanceStatus = calculateMaintenanceStatus(asset.next_maintenance_date)
  const showMaintenanceAlert = ['VENCIDO', 'URGENTE'].includes(maintenanceStatus.level)

  return (
    <div className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
      {/* Imagen o Placeholder */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
        {asset.photo_url ? (
          <img
            src={asset.photo_url}
            alt={asset.asset_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-20 h-20 text-gray-400" />
          </div>
        )}

        {/* Badges flotantes */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <AssetStatusBadge status={asset.status} />
          {asset.is_critical && (
            <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
              Crítico
            </span>
          )}
        </div>

        {/* Alerta de mantenimiento */}
        {showMaintenanceAlert && (
          <div className="absolute top-2 left-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              maintenanceStatus.level === 'VENCIDO' ? 'bg-red-600' : 'bg-orange-600'
            } text-white`}>
              <AlertTriangle className="w-3 h-3" />
              Mantenimiento
            </div>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Código y Nombre */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">
            {asset.asset_code}
          </p>
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
            {asset.asset_name}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {ASSET_CATEGORY_LABELS[asset.asset_category] || asset.asset_category}
          </p>
        </div>

        {/* Detalles */}
        <div className="space-y-2 mb-4">
          {/* Ubicación */}
          {(asset.area?.name || asset.location_detail) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {asset.area?.name}
                {asset.location_detail && ` - ${asset.location_detail}`}
              </span>
            </div>
          )}

          {/* Asignado a */}
          {asset.assigned_employee && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {asset.assigned_employee.full_name}
              </span>
            </div>
          )}

          {/* Organización */}
          {asset.organization && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {asset.organization.name}
              </span>
            </div>
          )}

          {/* Valor */}
          {asset.current_value && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(asset.current_value)}
              </span>
            </div>
          )}

          {/* Fecha de adquisición */}
          {asset.acquisition_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                {formatDate(asset.acquisition_date)}
              </span>
            </div>
          )}
        </div>

        {/* Condición */}
        <div className="mb-4">
          <AssetConditionBadge condition={asset.condition} />
        </div>

        {/* Marca y Modelo */}
        {(asset.brand || asset.model) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {[asset.brand, asset.model].filter(Boolean).join(' - ')}
          </p>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onView(asset)}
            className="flex-1 btn btn-sm btn-secondary text-xs"
          >
            Ver
          </button>
          <button
            onClick={() => onEdit(asset)}
            className="flex-1 btn btn-sm btn-primary text-xs"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssetCard
