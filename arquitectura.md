# Arquitectura del Servicio Console Logs Records

## Descripción General
Servicio desarrollado en Node.js para el registro y almacenamiento de eventos de console logs de aplicaciones remotas.

## Stack Tecnológico

### Backend
- **Runtime:** Node.js >= 22.0.0
- **Framework:** Express.js
- **Base de Datos:** MariaDB
- **ORM/Query Builder:** Knex.js
- **Variables de Entorno:** dotenv

### Dependencias Principales
```json
{
  "express": "^4.19.2",
  "knex": "^3.1.0",
  "mysql2": "^3.9.7",
  "dotenv": "^16.4.5",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "morgan": "^1.10.0"
}
```

## Configuración de Entorno (.env)

```env
# Configuración del Servidor
PORT=3000
NODE_ENV=production

# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=console_logs_user
DB_PASSWORD=secure_password
DB_NAME=console_logs_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# Configuración de Seguridad
API_SECRET=your_api_secret_key_here
CORS_ORIGIN=*
```

## Estructura de Base de Datos

### Tabla: aplicaciones_registradas
```sql
CREATE TABLE aplicaciones_registradas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_aplicacion VARCHAR(64) UNIQUE NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    nombre_aplicacion VARCHAR(255) NOT NULL,
    descripcion TEXT,
    pm2_process_names TEXT NOT NULL DEFAULT '[]',
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_id_aplicacion (id_aplicacion),
    INDEX idx_api_key (api_key)
);
```

### Tabla: log_operaciones
```sql
CREATE TABLE log_operaciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_aplicacion VARCHAR(64) NOT NULL,
    datetime_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    json_evento JSON NOT NULL,
    ipv4 VARCHAR(15),
    ipv6 VARCHAR(39),
    user_agent TEXT,
    nivel_log ENUM('debug', 'info', 'warn', 'error') DEFAULT 'info',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_aplicacion) REFERENCES aplicaciones_registradas(id_aplicacion) ON DELETE CASCADE,
    INDEX idx_id_aplicacion (id_aplicacion),
    INDEX idx_datetime_evento (datetime_evento),
    INDEX idx_nivel_log (nivel_log)
);
```

## API Endpoints

### Autenticación
El servicio implementa dos esquemas de autenticación:

1. **API Key de aplicación** — `Authorization: Bearer {api_key}`
   - La `api_key` se valida contra la tabla `aplicaciones_registradas`.
   - Usada por endpoints públicos de registro de logs.

2. **API Secret interno** — `Authorization: Bearer {API_SECRET}`
   - El secreto se valida contra la variable de entorno `API_SECRET`.
   - Usada por endpoints privados de administración y consulta.

### POST /api/console-log
Registra un evento de console log.

**Headers requeridos:**
- `Authorization: Bearer {api_key}`
- `Content-Type: application/json`

**Body:**
```json
{
    "nivel": "info|debug|warn|error",
    "mensaje": "Mensaje del log",
    "datos": {
        "timestamp": "2024-10-13T10:30:00.000Z",
        "modulo": "auth",
        "usuario_id": "12345",
        "accion": "login_attempt"
    }
}
```

**Response 200:**
```json
{
    "success": true,
    "message": "Log registrado exitosamente",
    "log_id": 123456
}
```

**Response 400:**
```json
{
    "success": false,
    "error": "Datos de entrada inválidos",
    "details": "El campo 'mensaje' es requerido"
}
```

**Response 401:**
```json
{
    "success": false,
    "error": "API Key inválida o ausente"
}
```

### GET /health
Health check del servicio. No requiere autenticación.

**Response 200:**
```json
{
    "status": "ok",
    "timestamp": "2024-10-13T10:30:00.000Z"
}
```

### GET /api/applications/:id_aplicacion
Obtiene los detalles de una aplicación registrada.

**Headers requeridos:**
- `Authorization: Bearer {API_SECRET}`

**Response 200:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "id_aplicacion": "mi-app",
        "nombre_aplicacion": "Mi Aplicación",
        "descripcion": "Descripción de la aplicación",
        "pm2_process_names": "[\"mi-app-pm2\"]",
        "activa": true,
        "fecha_creacion": "2024-10-13T10:30:00.000Z"
    }
}
```

**Response 401:**
```json
{
    "success": false,
    "error": "API Key inválida o ausente"
}
```

**Response 404:**
```json
{
    "success": false,
    "error": "Aplicación no encontrada"
}
```

### GET /api/applications/:id_aplicacion/logs
Obtiene los logs registrados para una aplicación con filtros y paginación.

**Headers requeridos:**
- `Authorization: Bearer {API_SECRET}`

**Query params (todos opcionales):**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `nivel` | string | — | Filtrar por nivel(es). Múltiples separados por coma (ej. `error,warn`) |
| `fecha_desde` | ISO datetime | — | Filtro desde en `datetime_evento` (ej. `2025-01-01T00:00:00Z`) |
| `fecha_hasta` | ISO datetime | — | Filtro hasta en `datetime_evento` |
| `buscar` | string | — | Búsqueda textual parcial en `mensaje` |
| `modulo` | string | — | Filtro exacto dentro de `json_evento.modulo` |
| `usuario_id` | string | — | Filtro exacto dentro de `json_evento.usuario_id` |
| `accion` | string | — | Filtro exacto dentro de `json_evento.accion` |
| `limite` | int | 50 | Cantidad de registros por página (max 500) |
| `offset` | int | 0 | Desplazamiento para paginación |

**Response 200:**
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "id_aplicacion": "mi-app",
            "nivel_log": "error",
            "json_evento": {
                "timestamp": "2024-10-13T10:30:00.000Z",
                "modulo": "auth",
                "usuario_id": "12345",
                "accion": "login_attempt"
            },
            "mensaje": "Error crítico",
            "ipv4": "192.168.1.1",
            "ipv6": null,
            "user_agent": "axios/1.7.0",
            "datetime_evento": "2024-10-13T10:30:00.000Z",
            "fecha_creacion": "2024-10-13T10:30:00.000Z"
        }
    ],
    "pagination": {
        "total": 150,
        "limit": 50,
        "offset": 0
    }
}
```

**Response 401:**
```json
{
    "success": false,
    "error": "API Key inválida o ausente"
}
```

**Response 404:**
```json
{
    "success": false,
    "error": "Aplicación no encontrada"
}
```

### GET /api/applications/:id_aplicacion/pm2-logs
Obtiene los últimos logs de error de PM2 para los procesos asociados a una aplicación.

**Headers requeridos:**
- `Authorization: Bearer {API_SECRET}`

**Query params (opcionales):**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `lines` | int | 50 | Número de líneas por archivo de log (max 500) |
| `process` | string | — | Filtrar por un nombre específico de proceso PM2 |

**Response 200:**
```json
{
    "success": true,
    "data": [
        {
            "process": "mi-app-pm2",
            "files": [
                {
                    "file": "mi-app-pm2-error.log",
                    "size": 45123,
                    "lines": 50,
                    "content": "[2025-07-27T10:00:00.000Z] Error: conexión rechazada\n..."
                }
            ]
        }
    ]
}
```

**Response 400 (process name inválido):**
```json
{
    "success": false,
    "error": "El proceso 'inexistente' no está configurado en pm2_process_names de esta aplicación"
}
```

**Response 401:**
```json
{
    "success": false,
    "error": "API Key inválida o ausente"
}
```

**Response 404:**
```json
{
    "success": false,
    "error": "Aplicación no encontrada"
}
```


## Estructura del Proyecto

```
consoles_logs_records/
├── src/
│   ├── config/
│   │   ├── database.js          # Configuración de Knex
│   │   └── environment.js       # Variables de entorno
│   ├── controllers/
│   │   ├── logsController.js    # Controlador de logs
│   │   └── appsController.js    # Controlador de aplicaciones
│   ├── middleware/
│   │   ├── auth.js              # Middleware de autenticación (api_key)
│   │   ├── privateAuth.js       # Middleware de autenticación (API_SECRET)
│   │   ├── validation.js        # Middleware de validación
│   │   └── errorHandler.js      # Manejo de errores
│   ├── models/
│   │   ├── LogOperacion.js      # Modelo de log
│   │   └── Aplicacion.js        # Modelo de aplicación
│   ├── routes/
│   │   ├── logs.js              # Rutas de logs
│   │   └── applications.js      # Rutas de aplicaciones
│   ├── services/
│   │   ├── logService.js        # Lógica de negocio logs
│   │   └── authService.js       # Lógica de autenticación
│   ├── utils/
│   │   ├── logger.js            # Sistema de logging interno
│   │   └── helpers.js           # Funciones auxiliares
│   └── app.js                   # Configuración principal de Express
├── migrations/
│   ├── 001_create_aplicaciones.js
│   └── 002_create_log_operaciones.js
├── seeds/
│   └── initial_data.js
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── .gitignore
├── knexfile.js                  # Configuraci��n de Knex
├── package.json
├── README.md
└── server.js                    # Punto de entrada
```

## Configuración de Knex (knexfile.js)

```javascript
require('dotenv').config();

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};
```

## Middleware de Autenticación

El servicio implementará autenticación por API Key:

1. **Validación de API Key**: Verificar que la API Key existe y está activa
2. **Rate Limiting**: Limitar requests por minuto por aplicación
3. **Logging de Requests**: Registrar todos los intentos de acceso
4. **CORS**: Configuración flexible de CORS según origen

## Consideraciones de Seguridad

- **Validación de Entrada**: Sanitización de todos los datos JSON recibidos
- **Rate Limiting**: Máximo 1000 requests por minuto por API Key
- **Logging de Seguridad**: Registro de intentos de acceso no autorizados
- **Headers de Seguridad**: Implementación con Helmet.js
- **Validación de IP**: Registro y validación de direcciones IPv4/IPv6

## Monitoreo y Logging

- **Logs Internos**: Winston para logging del servicio
- **Health Check**: Endpoint `/health` para verificar estado del servicio
- **Métricas**: Contadores de requests, errores y performance
- **Alertas**: Notificaciones por alta carga de errores o fallos de DB

## Comandos de Deployment

```bash
# Instalación de dependencias
npm install

# Ejecutar migraciones
npm run migrate

# Ejecutar seeds (opcional)
npm run seed

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start

# Ejecutar tests
npm test
```

## Variables de Rendimiento

- **Conexiones DB**: Pool de 2-10 conexiones según carga
- **Timeout**: 30 segundos para queries de base de datos
- **Compresión**: Gzip habilitado para responses > 1KB
- **Paginación**: Máximo 500 registros por consulta

## Backup y Recuperación

- **Backup Automático**: Respaldo diario de la base de datos
- **Retención**: Logs mayores a 90 días se archivan
- **Índices**: Optimización automática de índices por performance