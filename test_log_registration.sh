#!/bin/bash
# Script para probar el endpoint de registro de log

API_URL="https://debug.greenborn.com.ar/api/console-log"
API_KEY="demo_api_key"
curl -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nivel": "info",
    "mensaje": "Prueba de log desde script",
    "datos": {
      "timestamp": "2025-10-13T10:30:00.000Z",
      "modulo": "test",
      "usuario_id": "99999",
      "accion": "test_script"
    }
  }'
