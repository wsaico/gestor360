# **Especificación de Requisitos de Software (SRS) & Master Prompt \- Gestor360°**

**Proyecto:** Gestor360° Enterprise

**Copyright:** Wilber Saico ([wsaico.com](https://wsaico.com))

**Versión:** 2.0 (Final Technical Specification)

**Alcance:** Sistema SaaS Multi-Sucursal para Gestión Operativa, RRHH, SST y Alimentación.

## **1\. Arquitectura del Sistema (Core)**

### **1.1 Modelo Multi-Tenant (Aislamiento Lógico)**

El sistema debe operar bajo una arquitectura de **Base de Datos Compartida, Esquema Compartido** (Shared Database, Shared Schema), utilizando una columna discriminadora (station\_id) en **TODAS** las tablas transaccionales.

* **Regla de Oro:** Ninguna consulta SQL (excepto para ROLE\_GLOBAL\_ADMIN) debe ejecutarse sin la cláusula WHERE station\_id \= ?.  
* **Middleware de Seguridad:** Se debe implementar un interceptor en el Backend que inyecte automáticamente el station\_id del usuario logueado en las consultas.

### **1.2 Stack Tecnológico Definido**

* **Frontend:** React 18+ (Vite), TailwindCSS (Diseño Utility-first), Lucide React (Iconos), React Router DOM (Enrutamiento protegido), Axios (HTTP).  
* **Backend:** Node.js con Express o NestJS.  
* **Base de Datos:** PostgreSQL (Requerido por su robustez relacional y manejo de JSONB).  
* **Autenticación:** JWT (JSON Web Tokens) con rotación de claves.

## **2\. Esquema de Base de Datos (Entity Relationship)**

El desarrollador debe implementar las siguientes tablas normalizadas (3NF):

### **2.1 Tablas del Sistema (Globales)**

* **stations**: id (PK, UUID), name, code (ej: JAU), location, created\_at.  
* **system\_users**: id (PK), email (Unique), username (Unique), password\_hash (Bcrypt), role (ENUM: 'ADMIN', 'SUPERVISOR', 'MONITOR', 'PROVIDER'), station\_id (FK \-\> stations, Nullable for Admin), avatar\_url, is\_active.  
* **system\_settings**: id, smtp\_host, smtp\_port, smtp\_user, smtp\_pass\_encrypted, logo\_url.

### **2.2 Tablas de Recursos Humanos**

* **employees**: id (PK), station\_id (FK), full\_name, dni, role\_name, status (ENUM: 'ACTIVO', 'CESADO'), uniform\_size, phone, email, photo\_url, created\_at.  
* **employee\_docs**: id, employee\_id (FK), doc\_type (ENUM: 'FOTOCHECK', 'LICENCIA', 'EMO'), expiry\_date, evidence\_url (S3/Blob path), status (Calculado: VIGENTE/VENCIDO).

### **2.3 Tablas de SST & Inventario**

* **inventory\_items**: id, station\_id (FK), name, stock\_current (Int), stock\_min (Int), lifespan\_months (Int), unit (ej: 'par', 'und').  
* **deliveries**: id, station\_id (FK), employee\_id (FK), delivery\_date, supervisor\_id (FK \-\> system\_users), digital\_signature\_blob (Base64/URL).  
* **delivery\_details**: id, delivery\_id (FK), item\_id (FK), quantity, renewal\_date (Calculado: delivery\_date \+ item.lifespan).  
* **incidents**: id, station\_id (FK), date, type (ENUM: 'ACCIDENTE', 'INCIDENTE'), description, root\_cause, corrective\_actions, status (OPEN/CLOSED).

### **2.4 Tablas de Alimentación & Finanzas**

* **role\_pricing\_config**: id, station\_id (FK), role\_name (Debe coincidir con employees.role\_name), employee\_cost (Decimal), company\_subsidy (Decimal).  
* **menus**: id, station\_id (FK), provider\_id (FK \-\> system\_users), serve\_date, options (JSONB Array: \["Lomo", "Pollo"\]).  
* **food\_orders**: id, station\_id (FK), employee\_id (FK), menu\_date, selected\_option, cost\_applied (Snapshot del costo al momento de pedir), status (PENDING/CONSUMED).

## **3\. Lógica de Negocio y Algoritmos Críticos**

### **3.1 Algoritmo de Renovación de EPPs (Semáforo Dinámico)**

El sistema no debe guardar el "estado" del EPP, debe calcularlo en tiempo real:

1. Obtener la **última entrega** de un ítem específico (delivery\_details) para un empleado.  
2. Comparar renewal\_date vs CurrentDate.  
3. **Lógica:**  
   * Si días\_restantes \< 0 \-\> **ROJO (Vencido)** \-\> Habilitar botón "Renovar".  
   * Si días\_restantes \<= 30 \-\> **AMARILLO (Por vencer)** \-\> Enviar alerta.  
   * Si días\_restantes \> 30 \-\> **VERDE (Vigente)**.

### **3.2 Lógica de Gestión de Ceses (Auditoría Legal)**

Cuando un empleado pasa a estado CESADO:

1. **Bloqueo:** No debe aparecer en los selectores de "Nueva Entrega de EPP" ni "Nuevo Pedido de Alimentos".  
2. **Persistencia:** Sus registros en deliveries y food\_orders **NO** deben eliminarse. Deben permanecer accesibles en los reportes históricos para cumplir con auditorías de SUNAFIL/Ministerio de Trabajo durante 5-10 años (según ley local).

### **3.3 Lógica de Matriz Legal SST**

Al renderizar el módulo SST, el sistema debe ejecutar:

const activeEmployees \= count(employees WHERE station\_id \= X AND status \= 'ACTIVO');  
if (activeEmployees \< 20\) {  
    RenderMode \= "SUPERVISOR\_SST"; // Formularios simplificados  
} else {  
    RenderMode \= "COMITE\_PARITARIO"; // Habilitar módulos de Actas de Reunión y Elecciones  
}

### **3.4 Lógica de Envío de Correos (SMTP)**

El servicio de mailing debe ser agnóstico. Debe usar la configuración inyectada desde la base de datos (system\_settings) y no variables de entorno estáticas, permitiendo que el Admin cambie el proveedor de correo sin reiniciar el servidor.

## **4\. Requisitos de Seguridad y Protección de Datos**

1. **Encriptación:**  
   * Contraseñas: Argon2 o Bcrypt (Salt rounds \>= 10).  
   * Datos Médicos (EMO): Deben almacenarse en una tabla separada o encriptados a nivel de aplicación antes de ir a la BD.  
2. **Sesiones:**  
   * JWT con tiempo de expiración corto (15 min) y Refresh Tokens.  
   * Validación estricta de Rol en cada Endpoint (Middleware checkRole(\['ADMIN', 'SUPERVISOR'\])).  
3. **Logs de Auditoría:**  
   * Registrar cada acción de escritura (INSERT/UPDATE/DELETE) en una tabla audit\_logs con: user\_id, action, table\_affected, old\_value, new\_value, timestamp, ip\_address.

## **5\. Master Prompt para IA Generativa**

*Copia y pega el siguiente bloque en tu herramienta de IA (ChatGPT, Claude, Gemini) para iniciar el desarrollo con el contexto completo:*

**ACTUAR COMO:** Arquitecto de Software Senior y Desarrollador Full Stack experto en Sistemas Enterprise Seguros.

**OBJETIVO:** Generar el código fuente para el sistema **"Gestor360°"**, una plataforma SaaS Multi-Sucursal para la gestión operativa, RRHH y SST.

**CONTEXTO Y REGLAS DE ORO:**

1. **Multi-Tenancy:** Todo el código debe estar diseñado para soportar múltiples estaciones (Jauja, Pisco, etc.) con aislamiento estricto de datos.  
2. **Seguridad:** Implementar autenticación robusta (JWT) y autorización basada en roles (RBAC: Admin, Supervisor, Monitor, Proveedor). La seguridad no es opcional.  
3. **Cumplimiento Legal:** El sistema debe manejar auditorías históricas (no borrar datos de empleados cesados) y adaptarse a la normativa SST (Comité vs Supervisor según número de empleados).  
4. **Escalabilidad:** El código debe ser modular. Usa patrones de diseño limpios (Service-Controller-Repository en Backend, Componentes atómicos en Frontend).

**FUNCIONALIDADES A IMPLEMENTAR (PRIORIDAD ALTA):**

* **Login Seguro:** Validar credenciales contra base de datos y devolver Token \+ Estación \+ Rol.  
* **Dashboard Inteligente:** KPIs en tiempo real filtrados por estación.  
* **Módulo RRHH:** CRUD empleados con manejo de estados (Activo/Cesado) y alertas de vencimiento de documentos.  
* **Módulo SST:** Inventario de EPPs, semáforo de vencimientos, generación de Actas de Entrega en PDF, lógica de Comité vs Supervisor.  
* **Módulo Alimentación:** Configuración de tarifas por cargo (Aporte Empleado vs Empresa) y reportes de nómina.  
* **Panel Admin:** Configuración de SMTP, gestión de usuarios del sistema y ABM de estaciones.

ESTRUCTURA DE DATOS:  
Utiliza el siguiente esquema relacional como referencia absoluta:

* stations (id, name...)  
* system\_users (id, station\_id, role...)  
* employees (id, station\_id, status...)  
* inventory (id, station\_id, stock...)  
* deliveries (id, employee\_id, items...)

INSTRUCCIÓN DE SALIDA:  
Genera el código inicial para el Frontend en React que incluya:

1. Sistema de Rutas Protegidas según Rol.  
2. Contexto de Autenticación (AuthProvider).  
3. Layout principal con Sidebar dinámico.  
4. Módulo de "Gestor de Estación" (Dashboard) simulando la conexión a la API.