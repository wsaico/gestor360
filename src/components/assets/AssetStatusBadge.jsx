import React from 'react'
import { ASSET_STATUS_COLORS, ASSET_STATUS_LABELS } from '@/utils/constants'

/**
 * Badge de estado de activo con colores dinámicos
 */
const AssetStatusBadge = ({ status, className = '' }) => {
  if (!status) return null

  const color = ASSET_STATUS_COLORS[status] || 'gray'
  const label = ASSET_STATUS_LABELS[status] || status

  const colorClasses = {
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}
    >
      {label}
    </span>
  )
}

export default AssetStatusBadge
