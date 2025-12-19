import React from 'react'
import { ASSET_CONDITION_COLORS, ASSET_CONDITION_LABELS } from '@/utils/constants'

/**
 * Badge de condición de activo con colores dinámicos
 */
const AssetConditionBadge = ({ condition, className = '' }) => {
  if (!condition) return null

  const color = ASSET_CONDITION_COLORS[condition] || 'gray'
  const label = ASSET_CONDITION_LABELS[condition] || condition

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

export default AssetConditionBadge
