// Roles del sistema (RBAC) LEGACY (Mantener para compatibilidad)
export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  MONITOR: 'MONITOR',
  PROVIDER: 'PROVIDER'
}

// ===================================
// PERMISOS Y ROLES DEL SISTEMA (RBAC DINÁMICO)
// ===================================

export const PERMISSIONS = {
  // CONFIGURACIÓN Y SISTEMA
  CONFIG_MANAGE: 'CONFIG_MANAGE',     // Acceso total a configuración
  ROLES_MANAGE: 'ROLES_MANAGE',       // Gestionar roles y permisos

  // USUARIOS
  USERS_VIEW: 'USERS_VIEW',
  USERS_MANAGE: 'USERS_MANAGE',

  // EMPLEADOS (RRHH)
  EMPLOYEES_VIEW: 'EMPLOYEES_VIEW',
  EMPLOYEES_MANAGE: 'EMPLOYEES_MANAGE',

  // ESTACIONES
  STATIONS_VIEW: 'STATIONS_VIEW',
  STATIONS_MANAGE: 'STATIONS_MANAGE',

  // SST
  SST_VIEW: 'SST_VIEW',
  SST_MANAGE: 'SST_MANAGE',

  // ALIMENTACIÓN
  FOOD_VIEW: 'FOOD_VIEW',
  FOOD_MANAGE: 'FOOD_MANAGE',
  FOOD_REPORTS: 'FOOD_REPORTS',

  // ACTIVOS
  ASSETS_VIEW: 'ASSETS_VIEW',
  ASSETS_MANAGE: 'ASSETS_MANAGE'
}

export const PERMISSION_LABELS = {
  CONFIG_MANAGE: 'Gestión de Configuración',
  ROLES_MANAGE: 'Gestión de Roles y Permisos',
  USERS_VIEW: 'Ver Usuarios del Sistema',
  USERS_MANAGE: 'Crear/Editar Usuarios',
  EMPLOYEES_VIEW: 'Ver Lista de Empleados',
  EMPLOYEES_MANAGE: 'Crear/Editar Empleados',
  STATIONS_VIEW: 'Ver Estaciones',
  STATIONS_MANAGE: 'Gestionar Estaciones',
  SST_VIEW: 'Ver Módulo SST',
  SST_MANAGE: 'Gestionar Registros SST',
  FOOD_VIEW: 'Ver Módulo Alimentación',
  FOOD_MANAGE: 'Gestionar Menús y Pedidos',
  FOOD_REPORTS: 'Ver Reportes de Consumo',
  ASSETS_VIEW: 'Ver Inventario de Activos',
  ASSETS_MANAGE: 'Gestionar Activos'
}

export const MODULE_GROUPS = {
  SYSTEM: {
    label: 'Sistema',
    permissions: ['CONFIG_MANAGE', 'ROLES_MANAGE', 'USERS_VIEW', 'USERS_MANAGE', 'STATIONS_VIEW', 'STATIONS_MANAGE']
  },
  RRHH: {
    label: 'Recursos Humanos',
    permissions: ['EMPLOYEES_VIEW', 'EMPLOYEES_MANAGE']
  },
  SST: {
    label: 'Seguridad y Salud (SST)',
    permissions: ['SST_VIEW', 'SST_MANAGE']
  },
  FOOD: {
    label: 'Alimentación',
    permissions: ['FOOD_VIEW', 'FOOD_MANAGE', 'FOOD_REPORTS']
  },
  ASSETS: {
    label: 'Activos',
    permissions: ['ASSETS_VIEW', 'ASSETS_MANAGE']
  }
}

// Estados de empleados
export const EMPLOYEE_STATUS = {
  ACTIVE: 'ACTIVO',
  INACTIVE: 'CESADO'
}

// Tipos de contrato
export const CONTRACT_TYPES = {
  INDETERMINADO: 'INDETERMINADO',
  INCREMENTO_ACTIVIDAD: 'INCREMENTO_ACTIVIDAD'
}

// Jornadas laborales
export const WORK_SCHEDULES = {
  FULL_8HRS: 'FULL_8HRS',
  FULL_6HRS: 'FULL_6HRS',
  PART_TIME: 'PART_TIME'
}

// Labels amigables para tipos de contrato
export const CONTRACT_TYPE_LABELS = {
  INDETERMINADO: 'Indeterminado',
  INCREMENTO_ACTIVIDAD: 'Incremento de Actividad'
}

// Labels amigables para jornadas
export const WORK_SCHEDULE_LABELS = {
  FULL_8HRS: 'Full Time 8 horas',
  FULL_6HRS: 'Full Time 6 horas',
  PART_TIME: 'Part Time'
}

// Tipos de documentos
export const DOCUMENT_TYPES = {
  FOTOCHECK: 'FOTOCHECK',
  LICENSE: 'LICENCIA',
  EMO: 'EMO'
}

// Estados de documentos
export const DOCUMENT_STATUS = {
  VALID: 'VIGENTE',
  EXPIRED: 'VENCIDO',
  EXPIRING: 'POR_VENCER'
}

// =====================================================
// CONSTANTES DEL MÓDULO SST
// =====================================================

// Tipos de elementos (NO son categorías)
export const EPP_ITEM_TYPES = {
  EPP: 'EPP',
  UNIFORME: 'UNIFORME',
  EQUIPO_EMERGENCIA: 'EQUIPO_EMERGENCIA'
}

// Labels para tipos de elementos
export const EPP_ITEM_TYPE_LABELS = {
  EPP: 'EPP',
  UNIFORME: 'Uniforme',
  EQUIPO_EMERGENCIA: 'Equipo de Emergencia'
}

// Unidades de medida de EPPs
export const EPP_UNITS = {
  UNIDAD: 'UNIDAD',
  PAR: 'PAR',
  KIT: 'KIT',
  CAJA: 'CAJA'
}

// Estados de entregas de EPPs
export const DELIVERY_STATUS = {
  PENDING: 'PENDING',
  SIGNED: 'SIGNED',
  CANCELLED: 'CANCELLED'
}

// Labels para estados de entregas
export const DELIVERY_STATUS_LABELS = {
  PENDING: 'Pendiente de Firma',
  SIGNED: 'Firmado',
  CANCELLED: 'Cancelado'
}

// Motivos de entrega/renovación
export const DELIVERY_REASONS = {
  NUEVO_INGRESO: 'NUEVO_INGRESO',
  RENOVACION: 'RENOVACION',
  REPOSICION: 'REPOSICION',
  DETERIORO: 'DETERIORO',
  PERDIDA: 'PERDIDA',
  OTRO: 'OTRO'
}

// Labels para motivos de entrega
export const DELIVERY_REASON_LABELS = {
  NUEVO_INGRESO: 'Nuevo Ingreso',
  RENOVACION: 'Renovación',
  REPOSICION: 'Reposición',
  DETERIORO: 'Deterioro',
  PERDIDA: 'Pérdida',
  OTRO: 'Otro'
}

// Estados de asignación de EPPs
export const ASSIGNMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  RENEWED: 'RENEWED',
  RETURNED: 'RETURNED',
  LOST: 'LOST'
}

// Labels para estados de asignación
export const ASSIGNMENT_STATUS_LABELS = {
  ACTIVE: 'Activo',
  RENEWED: 'Renovado',
  RETURNED: 'Devuelto',
  LOST: 'Extraviado'
}

// Estados de renovación
export const RENEWAL_STATUS = {
  VIGENTE: 'VIGENTE',
  POR_VENCER: 'POR_VENCER',
  VENCIDO: 'VENCIDO'
}

// Labels para estados de renovación
export const RENEWAL_STATUS_LABELS = {
  VIGENTE: 'Vigente',
  POR_VENCER: 'Por Vencer (30 días)',
  VENCIDO: 'Vencido - Requiere Renovación'
}

// Tipos de movimiento de stock
export const STOCK_MOVEMENT_TYPES = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE: 'AJUSTE',
  ENTREGA: 'ENTREGA'
}

// Tipos de incidentes SST
export const INCIDENT_TYPES = {
  ACCIDENTE: 'ACCIDENTE',
  INCIDENTE: 'INCIDENTE',
  CUASI_ACCIDENTE: 'CUASI_ACCIDENTE'
}

// Labels para tipos de incidentes
export const INCIDENT_TYPE_LABELS = {
  ACCIDENTE: 'Accidente',
  INCIDENTE: 'Incidente',
  CUASI_ACCIDENTE: 'Cuasi Accidente'
}

// Severidad de incidentes
export const INCIDENT_SEVERITY = {
  LEVE: 'LEVE',
  MODERADO: 'MODERADO',
  GRAVE: 'GRAVE',
  MUY_GRAVE: 'MUY_GRAVE'
}

// Labels para severidad
export const INCIDENT_SEVERITY_LABELS = {
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  GRAVE: 'Grave',
  MUY_GRAVE: 'Muy Grave'
}

// Categorías de incidentes
export const INCIDENT_CATEGORIES = {
  CAIDA: 'CAIDA',
  GOLPE: 'GOLPE',
  CORTE: 'CORTE',
  QUEMADURA: 'QUEMADURA',
  ATRAPAMIENTO: 'ATRAPAMIENTO',
  EXPOSICION: 'EXPOSICION',
  OTRO: 'OTRO'
}

// Labels para categorías de incidentes
export const INCIDENT_CATEGORY_LABELS = {
  CAIDA: 'Caída',
  GOLPE: 'Golpe',
  CORTE: 'Corte',
  QUEMADURA: 'Quemadura',
  ATRAPAMIENTO: 'Atrapamiento',
  EXPOSICION: 'Exposición Química/Biológica',
  OTRO: 'Otro'
}

// Estados de incidentes
export const INCIDENT_STATUS = {
  REPORTED: 'REPORTED',
  UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
  CLOSED: 'CLOSED'
}

// Labels para estados de incidentes
export const INCIDENT_STATUS_LABELS = {
  REPORTED: 'Reportado',
  UNDER_INVESTIGATION: 'En Investigación',
  CLOSED: 'Cerrado'
}

// Tipos de lesión
export const INJURY_TYPES = {
  NINGUNA: 'NINGUNA',
  LEVE: 'LEVE',
  INCAPACITANTE: 'INCAPACITANTE',
  MORTAL: 'MORTAL'
}

// Labels para tipos de lesión
export const INJURY_TYPE_LABELS = {
  NINGUNA: 'Sin Lesión',
  LEVE: 'Lesión Leve',
  INCAPACITANTE: 'Lesión Incapacitante',
  MORTAL: 'Lesión Mortal'
}

// Estados de pedidos de alimentos
export const FOOD_ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CONSUMED: 'CONSUMED',
  CANCELLED: 'CANCELLED'
}

// Labels amigables para estados de pedidos
export const FOOD_ORDER_STATUS_LABELS = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  CONSUMED: 'Servido',
  CANCELLED: 'Cancelado'
}

// Tipos de comida
export const MEAL_TYPES = {
  BREAKFAST: 'DESAYUNO',
  LUNCH: 'ALMUERZO',
  DINNER: 'CENA'
}

// Labels para tipos de comida
export const MEAL_TYPE_LABELS = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  CENA: 'Cena'
}

// Tipos de pedido
export const ORDER_TYPES = {
  NORMAL: 'NORMAL',
  SPECIAL: 'SPECIAL', // Alias for Visitor/Manual with cost
  VISITOR: 'VISITOR', // Explicit visitor
  MANUAL: 'MANUAL'    // Admin correction
}

// Labels para tipos de pedido
export const ORDER_TYPE_LABELS = {
  NORMAL: 'Normal',
  SPECIAL: 'Especial (Costo Total)',
  VISITOR: 'Visita',
  MANUAL: 'Regularización Manual'
}

// Umbrales para el semáforo de EPPs (días)
export const EPP_ALERT_THRESHOLDS = {
  DANGER: 0,    // Rojo: Vencido
  WARNING: 30,  // Amarillo: Por vencer en 30 días
  SUCCESS: 31   // Verde: Vigente
}

// Umbral para determinar si se requiere Comité vs Supervisor SST
export const SST_COMMITTEE_THRESHOLD = 20

// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: import.meta.env.VITE_APP_NAME || 'Gestor360°',
  VERSION: import.meta.env.VITE_APP_VERSION || '2.0.0',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
}

// Nombres de claves en localStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gestor360_access_token',
  REFRESH_TOKEN: 'gestor360_refresh_token',
  USER_DATA: 'gestor360_user_data',
  STATION_DATA: 'gestor360_station_data'
}

// =====================================================
// CONSTANTES DEL MÓDULO DE INVENTARIO DE ACTIVOS
// =====================================================

// Categorías principales de activos
export const ASSET_CATEGORIES = {
  EQUIPOS_COMPUTO: 'EQUIPOS_COMPUTO',
  EQUIPOS_MOVILES: 'EQUIPOS_MOVILES',
  VEHICULOS_MOTORIZADOS: 'VEHICULOS_MOTORIZADOS',
  VEHICULOS_NO_MOTORIZADOS: 'VEHICULOS_NO_MOTORIZADOS',
  EQUIPOS_RAMPA: 'EQUIPOS_RAMPA',
  HERRAMIENTAS: 'HERRAMIENTAS',
  MOBILIARIO: 'MOBILIARIO',
  ELECTRONICA: 'ELECTRONICA',
  OTRO: 'OTRO'
}

// Labels para categorías de activos
export const ASSET_CATEGORY_LABELS = {
  EQUIPOS_COMPUTO: 'Equipos de Cómputo',
  EQUIPOS_MOVILES: 'Equipos Móviles',
  VEHICULOS_MOTORIZADOS: 'Vehículos Motorizados',
  VEHICULOS_NO_MOTORIZADOS: 'Vehículos No Motorizados',
  EQUIPOS_RAMPA: 'Equipos de Rampa',
  HERRAMIENTAS: 'Herramientas',
  MOBILIARIO: 'Mobiliario',
  ELECTRONICA: 'Electrónica',
  OTRO: 'Otro'
}

// Subcategorías de Equipos de Cómputo
export const COMPUTER_SUBCATEGORIES = {
  LAPTOP: 'Laptop',
  DESKTOP: 'Desktop',
  MONITOR: 'Monitor',
  IMPRESORA: 'Impresora',
  SCANNER: 'Scanner',
  PROYECTOR: 'Proyector',
  UPS: 'UPS/Estabilizador',
  SERVIDOR: 'Servidor',
  SWITCH: 'Switch',
  ROUTER: 'Router',
  OTRO: 'Otro'
}

// Subcategorías de Equipos Móviles
export const MOBILE_SUBCATEGORIES = {
  SMARTPHONE: 'Smartphone',
  TABLET: 'Tablet',
  RADIO: 'Radio Portátil',
  GPS: 'GPS',
  OTRO: 'Otro'
}

// Subcategorías de Vehículos Motorizados
export const MOTORIZED_VEHICLE_SUBCATEGORIES = {
  CAMIONETA: 'Camioneta',
  CAMION: 'Camión',
  MONTACARGA: 'Montacargas',
  BUS: 'Bus',
  TRACTOR: 'Tractor',
  GPU: 'GPU (Ground Power Unit)',
  OTRO: 'Otro'
}

// Subcategorías de Vehículos No Motorizados
export const NON_MOTORIZED_VEHICLE_SUBCATEGORIES = {
  CARRITO_EQUIPAJE: 'Carrito de Equipaje',
  DOLLY: 'Dolly',
  CARRITO_CARGA: 'Carrito de Carga',
  PLATAFORMA: 'Plataforma',
  OTRO: 'Otro'
}

// Subcategorías de Equipos de Rampa
export const RAMP_EQUIPMENT_SUBCATEGORIES = {
  ESCALERA_DELANTERA: 'Escalera Delantera',
  ESCALERA_TRASERA: 'Escalera Trasera',
  BELT_LOADER: 'Belt Loader',
  TRANSPORTADOR: 'Transportador',
  CHOCK: 'Chock/Calzo',
  CONO: 'Cono de Señalización',
  CHALECO_GUIA: 'Chaleco Guía',
  EXTINTOR: 'Extintor',
  OTRO: 'Otro'
}

// Métodos de adquisición de activos
export const ACQUISITION_METHODS = {
  COMPRA: 'COMPRA',
  DONACION: 'DONACION',
  LEASING: 'LEASING',
  ALQUILER: 'ALQUILER',
  FABRICACION_PROPIA: 'FABRICACION_PROPIA',
  OTRO: 'OTRO'
}

// Labels para métodos de adquisición
export const ACQUISITION_METHODS_LABELS = {
  COMPRA: 'Compra',
  DONACION: 'Donación',
  LEASING: 'Leasing',
  ALQUILER: 'Alquiler',
  FABRICACION_PROPIA: 'Fabricación Propia',
  OTRO: 'Otro'
}

// Estados de activos
export const ASSET_STATUS = {
  DISPONIBLE: 'DISPONIBLE',
  EN_USO: 'EN_USO',
  MANTENIMIENTO: 'MANTENIMIENTO',
  BAJA: 'BAJA',
  PERDIDO: 'PERDIDO',
  TRANSFERENCIA: 'TRANSFERENCIA'
}

// Labels para estados de activos
export const ASSET_STATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  EN_USO: 'En Uso',
  MANTENIMIENTO: 'En Mantenimiento',
  BAJA: 'Dado de Baja',
  PERDIDO: 'Perdido/Robado',
  TRANSFERENCIA: 'En Transferencia'
}

// Colores para estados de activos
export const ASSET_STATUS_COLORS = {
  DISPONIBLE: 'primary',
  EN_USO: 'green',
  MANTENIMIENTO: 'yellow',
  BAJA: 'gray',
  PERDIDO: 'red',
  TRANSFERENCIA: 'primary'
}

// Motivos de Baja
export const DECOMMISSION_REASONS = {
  OBSOLESCENCIA: 'OBSOLESCENCIA',
  DANO_IRREPARABLE: 'DANO_IRREPARABLE',
  PERDIDA_ROBO: 'PERDIDA_ROBO',
  VENTA: 'VENTA',
  DONACION: 'DONACION',
  OTRO: 'OTRO'
}

export const DECOMMISSION_REASON_LABELS = {
  OBSOLESCENCIA: 'Obsolescencia Técnica/Funcional',
  DANO_IRREPARABLE: 'Daño Irreparable',
  PERDIDA_ROBO: 'Pérdida o Robo',
  VENTA: 'Venta',
  DONACION: 'Donación',
  OTRO: 'Otro'
}

// Condiciones de activos
export const ASSET_CONDITIONS = {
  NUEVO: 'NUEVO',
  EXCELENTE: 'EXCELENTE',
  BUENO: 'BUENO',
  REGULAR: 'REGULAR',
  MALO: 'MALO',
  INOPERATIVO: 'INOPERATIVO'
}

// Labels para condiciones de activos
export const ASSET_CONDITION_LABELS = {
  NUEVO: 'Nuevo',
  EXCELENTE: 'Excelente',
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  MALO: 'Malo',
  INOPERATIVO: 'Inoperativo'
}

// Colores para condiciones
export const ASSET_CONDITION_COLORS = {
  NUEVO: 'green',
  EXCELENTE: 'green',
  BUENO: 'blue',
  REGULAR: 'yellow',
  MALO: 'orange',
  INOPERATIVO: 'red'
}

// Tipos de movimiento de activos
export const ASSET_MOVEMENT_TYPES = {
  ASIGNACION: 'ASIGNACION',
  DEVOLUCION: 'DEVOLUCION',
  REASIGNACION: 'REASIGNACION',
  TRANSFERENCIA_ESTACION: 'TRANSFERENCIA_ESTACION',
  TRANSFERENCIA_AREA: 'TRANSFERENCIA_AREA',
  TRANSFERENCIA_ORGANIZACION: 'TRANSFERENCIA_ORGANIZACION',
  MANTENIMIENTO: 'MANTENIMIENTO',
  BAJA: 'BAJA',
  PRESTAMO: 'PRESTAMO',
  AJUSTE: 'AJUSTE'
}

// Labels para tipos de movimiento
export const ASSET_MOVEMENT_TYPE_LABELS = {
  ASIGNACION: 'Asignación',
  DEVOLUCION: 'Devolución',
  REASIGNACION: 'Reasignación',
  TRANSFERENCIA_ESTACION: 'Transferencia entre Estaciones',
  TRANSFERENCIA_AREA: 'Transferencia entre Áreas',
  TRANSFERENCIA_ORGANIZACION: 'Transferencia entre Organizaciones',
  MANTENIMIENTO: 'Envío a Mantenimiento',
  BAJA: 'Baja de Activo',
  PRESTAMO: 'Préstamo',
  AJUSTE: 'Ajuste de Inventario'
}

// Tipos de propietario
export const OWNER_TYPES = {
  EMPRESA: 'EMPRESA',
  CLIENTE: 'CLIENTE',
  PROVEEDOR: 'PROVEEDOR',
  TERCERO: 'TERCERO'
}

// Labels para tipos de propietario
export const OWNER_TYPE_LABELS = {
  EMPRESA: 'Empresa Propia',
  CLIENTE: 'Cliente',
  PROVEEDOR: 'Proveedor',
  TERCERO: 'Tercero'
}

// Tipos de organización (configurables)
export const ORGANIZATION_TYPES = {
  CLIENTE: 'CLIENTE',
  AEROLINEA: 'AEROLINEA',
  PROVEEDOR: 'PROVEEDOR',
  CONTRATISTA: 'CONTRATISTA',
  SOCIO: 'SOCIO',
  INTERNO: 'INTERNO',
  OTRO: 'OTRO'
}

// Labels para tipos de organización
export const ORGANIZATION_TYPE_LABELS = {
  CLIENTE: 'Cliente',
  AEROLINEA: 'Aerolínea',
  PROVEEDOR: 'Proveedor',
  CONTRATISTA: 'Contratista',
  SOCIO: 'Socio Comercial',
  INTERNO: 'Interno/Propio',
  OTRO: 'Otro'
}

// Tipos de mantenimiento
export const MAINTENANCE_TYPES = {
  PREVENTIVO: 'PREVENTIVO',
  CORRECTIVO: 'CORRECTIVO',
  CALIBRACION: 'CALIBRACION',
  INSPECCION: 'INSPECCION',
  LIMPIEZA: 'LIMPIEZA'
}

// Labels para tipos de mantenimiento
export const MAINTENANCE_TYPE_LABELS = {
  PREVENTIVO: 'Preventivo',
  CORRECTIVO: 'Correctivo',
  CALIBRACION: 'Calibración',
  INSPECCION: 'Inspección',
  LIMPIEZA: 'Limpieza'
}

// Estados de mantenimiento
export const MAINTENANCE_STATUS = {
  PROGRAMADO: 'PROGRAMADO',
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
}

// Labels para estados de mantenimiento
export const MAINTENANCE_STATUS_LABELS = {
  PROGRAMADO: 'Programado',
  EN_PROCESO: 'En Proceso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado'
}

// Prioridades de mantenimiento
export const MAINTENANCE_PRIORITIES = {
  BAJA: 'BAJA',
  NORMAL: 'NORMAL',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA'
}

// Labels para prioridades de mantenimiento
export const MAINTENANCE_PRIORITY_LABELS = {
  BAJA: 'Baja',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  CRITICA: 'Crítica'
}

// Colores para prioridades
export const MAINTENANCE_PRIORITY_COLORS = {
  BAJA: 'gray',
  NORMAL: 'blue',
  ALTA: 'yellow',
  CRITICA: 'red'
}

// Tipos de baja de activos
export const DISPOSAL_TYPES = {
  VENTA: 'VENTA',
  DONACION: 'DONACION',
  DESECHO: 'DESECHO',
  PERDIDA: 'PERDIDA',
  ROBO: 'ROBO',
  OBSOLESCENCIA: 'OBSOLESCENCIA'
}

// Labels para tipos de baja
export const DISPOSAL_TYPE_LABELS = {
  VENTA: 'Venta',
  DONACION: 'Donación',
  DESECHO: 'Desecho',
  PERDIDA: 'Pérdida',
  ROBO: 'Robo',
  OBSOLESCENCIA: 'Obsolescencia'
}

// Estados de proceso de baja
export const DISPOSAL_STATUS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  COMPLETADO: 'COMPLETADO'
}

// Labels para estados de baja
export const DISPOSAL_STATUS_LABELS = {
  PENDIENTE: 'Pendiente de Aprobación',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  COMPLETADO: 'Completado'
}

// Colores para estados de baja
export const DISPOSAL_STATUS_COLORS = {
  PENDIENTE: 'yellow',
  APROBADO: 'green',
  RECHAZADO: 'red',
  COMPLETADO: 'gray'
}

// Estados de alerta de mantenimiento
export const MAINTENANCE_ALERT_LEVELS = {
  VENCIDO: 'VENCIDO',
  URGENTE: 'URGENTE',
  PROXIMO: 'PROXIMO',
  PROGRAMADO: 'PROGRAMADO'
}

// Labels para alertas de mantenimiento
export const MAINTENANCE_ALERT_LABELS = {
  VENCIDO: 'Vencido - Requiere atención inmediata',
  URGENTE: 'Urgente - Vence en menos de 7 días',
  PROXIMO: 'Próximo - Vence en 30 días',
  PROGRAMADO: 'Programado'
}

// Colores para alertas de mantenimiento
export const MAINTENANCE_ALERT_COLORS = {
  VENCIDO: 'red',
  URGENTE: 'orange',
  PROXIMO: 'yellow',
  PROGRAMADO: 'green'
}

// Umbrales de alertas (días)
export const ASSET_ALERT_THRESHOLDS = {
  MAINTENANCE_URGENT: 7,
  MAINTENANCE_UPCOMING: 30,
  WARRANTY_EXPIRING: 60
}

// Tasas de depreciación por categoría (%)
export const DEFAULT_DEPRECIATION_RATES = {
  EQUIPOS_COMPUTO: 25,
  EQUIPOS_MOVILES: 30,
  VEHICULOS_MOTORIZADOS: 20,
  VEHICULOS_NO_MOTORIZADOS: 10,
  EQUIPOS_RAMPA: 15,
  HERRAMIENTAS: 20,
  MOBILIARIO: 10,
  ELECTRONICA: 25,
  OTRO: 20
}

// Vida útil por categoría (años)
export const DEFAULT_USEFUL_LIFE = {
  EQUIPOS_COMPUTO: 5,
  EQUIPOS_MOVILES: 3,
  VEHICULOS_MOTORIZADOS: 10,
  VEHICULOS_NO_MOTORIZADOS: 8,
  EQUIPOS_RAMPA: 10,
  HERRAMIENTAS: 5,
  MOBILIARIO: 10,
  ELECTRONICA: 5,
  OTRO: 5
}

// Modos de visualización de inventario
export const ASSET_VIEW_MODES = {
  LIST: 'LIST',
  CATALOG: 'CATALOG',
  MAP: 'MAP'
}

// Colores para badges de activos críticos
export const CRITICAL_ASSET_COLOR = 'red'

// Máximo de archivos adjuntos por activo
export const MAX_ASSET_DOCUMENTS = 10

// Máximo de fotos por activo
export const MAX_ASSET_PHOTOS = 5
