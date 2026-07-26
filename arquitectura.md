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

### GET /api/applications/:id_aplicacion/errors
Obtiene los errores registrados para una aplicación, paginados de más reciente a más antiguo.

**Headers requeridos:**
- `Authorization: Bearer {API_SECRET}`

**Query params:**
- `page` (opcional, default: 1) — Número de página
- `limit` (opcional, default: 50, max: 500) — Registros por página

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
                "mensaje": "Error crítico",
                "modulo": "auth",
                "usuario_id": "12345",
                "accion": "login_attempt"
            },
            "ipv4": "192.168.1.1",
            "user_agent": "axios/1.7.0",
            "datetime_evento": "2024-10-13T10:30:00.000Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 150,
        "totalPages": 3
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