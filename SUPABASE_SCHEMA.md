# Supabase Database Schema - Gestor360

This document provides a comprehensive mapping of the database tables, columns, and Row Level Security (RLS) policies.

## Tables & Columns

### 1. `stations`
Centralizes information about airport stations/branches.
- `id` (uuid, PK)
- `name` (varchar)
- `code` (varchar, unique)
- `location` (text)
- `is_active` (bool, default true)
- `order_start_time` (time)
- `order_end_time` (time)

### 2. `areas`
Operational areas within a station.
- `id` (uuid, PK)
- `station_id` (uuid, FK to stations)
- `name` (varchar)
- `is_active` (bool, default true)

### 3. `system_users`
Users with access to the management system.
- `id` (uuid, PK, references auth.users)
- `email` (text, unique)
- `username` (text)
- `role` (text)
- `station_id` (uuid, FK to stations, nullable for Global Admins)
- `is_active` (bool, default true)

### 4. `employees`
Personnel records.
- `id` (uuid, PK)
- `station_id` (uuid, FK to stations)
- `full_name` (text)
- `dni` (varchar, unique)
- `email` (text, unique)
- `phone` (text)
- `role_name` (text)
- `area_id` (uuid, FK to areas)
- `birth_date` (date)
- `hire_date` (date)
- `status` (text, default 'ACTIVE')
- `is_visitor` (bool)

### 5. `food_orders`
Management of employee meals.
- `id` (uuid, PK)
- `employee_id` (uuid, FK to employees)
- `station_id` (uuid, FK to stations)
- `menu_id` (uuid, FK to menus)
- `status` (text, default 'PENDING')
- `order_date` (date)
- `order_type` (text)

### 6. `app_settings`
Global system configuration.
- `key` (text, PK)
- `value` (text)
- `updated_at` (timestamptz)

*(Note: Additional tables like `transport_routes`, `transport_schedules`, `announcements`, etc., follow a similar multi-tenant structure linked to `station_id` or `organization_id`.)*

---

## Row Level Security (RLS) Policies

The system uses a strict multi-tenant and role-based access control (RBAC) model.

| Table | Policy Name | Command | Access |
|-------|-------------|---------|--------|
| `announcements` | Anyone can read announcements | SELECT | Public |
| `announcements` | Authenticated users can manage | ALL | Authenticated |
| `areas` | Admins manage areas | ALL | Roles: ADMIN |
| `areas` | Authenticated read areas | SELECT | Authenticated |
| `employees` | Admins manage employees | ALL | Roles: ADMIN |
| `employees` | Station users read employees | SELECT | same station_id |
| `food_orders` | Users manage own orders | ALL | auth.uid() match |
| `system_users` | Admins see all users | SELECT | Roles: ADMIN |
| `stations` | Public read stations | SELECT | Public |

---

## Triggers & Functions

- `handle_new_user()`: Automatically syncs new Auth users to `system_users`.
- `update_updated_at_column()`: Auto-updates timestamps.
- `check_order_time()`: Validates that orders are placed within station-defined time windows.
