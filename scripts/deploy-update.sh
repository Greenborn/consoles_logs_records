#!/usr/bin/env bash
set -euo pipefail

# ================================================================
# deploy-update.sh
# Actualiza un despliegue existente de consoles-logs-records
# Uso: bash scripts/deploy-update.sh --host=IP --user=USUARIO [--run-as=USUARIO_SERVICIO] [opciones]
# ================================================================

# --- Colores ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail() { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# --- Parse flags ---
HOST=""
USER=""
PORT=22
PASSWORD=""
KEY=""
BRANCH=""
DEPLOY_PATH=""
PM2_NAME=""
RUN_AS=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)         HOST="$2"; shift 2 ;;
    --host=*)          HOST="${1#*=}"; shift ;;
    -u|--user)         USER="$2"; shift 2 ;;
    --user=*)          USER="${1#*=}"; shift ;;
    -p|--port)         PORT="$2"; shift 2 ;;
    --port=*)          PORT="${1#*=}"; shift ;;
    -P|--password)     PASSWORD="$2"; shift 2 ;;
    --password=*)      PASSWORD="${1#*=}"; shift ;;
    -k|--key)          KEY="$2"; shift 2 ;;
    --key=*)           KEY="${1#*=}"; shift ;;
    -b|--branch)       BRANCH="$2"; shift 2 ;;
    --branch=*)        BRANCH="${1#*=}"; shift ;;
    -d|--deploy-path)  DEPLOY_PATH="$2"; shift 2 ;;
    --deploy-path=*)   DEPLOY_PATH="${1#*=}"; shift ;;
    -n|--pm2-name)     PM2_NAME="$2"; shift 2 ;;
    --pm2-name=*)      PM2_NAME="${1#*=}"; shift ;;
    -r|--run-as)       RUN_AS="$2"; shift 2 ;;
    --run-as=*)        RUN_AS="${1#*=}"; shift ;;
    *)                 fail "Argumento desconocido: $1";;
  esac
done

# --- Validar requisitos locales ---
[ -z "$HOST" ] && fail "Falta --host (IP o dominio del servidor)"
[ -z "$USER" ] && fail "Falta --user (usuario SSH)"

SSH_CMD="ssh -p $PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
if [ -n "$KEY" ]; then
  [ ! -f "$KEY" ] && fail "Archivo de clave no encontrado: $KEY"
  chmod 600 "$KEY"
  SSH_CMD="$SSH_CMD -i $KEY"
elif [ -n "$PASSWORD" ]; then
  if ! command -v sshpass &>/dev/null; then
    fail "sshpass no instalado. Instala con: sudo apt install sshpass"
  fi
  SSH_PASS="sshpass -p '$PASSWORD'"
else
  fail "Requiere --key (ruta .pem) o --password (contraseña SSH)"
fi

# --- Preguntar valores faltantes ---
if [ -z "$BRANCH" ]; then
  read -rp "$(echo -e "${YELLOW}? Rama a desplegar [main]: ${NC}")" BRANCH
  BRANCH="${BRANCH:-main}"
fi
if [ -z "$DEPLOY_PATH" ]; then
  read -rp "$(echo -e "${YELLOW}? Ruta de instalación en servidor: ${NC}")" DEPLOY_PATH
  [ -z "$DEPLOY_PATH" ] && fail "La ruta es obligatoria"
fi
if [ -z "$PM2_NAME" ]; then
  read -rp "$(echo -e "${YELLOW}? Nombre del proceso PM2 [consoles-logs-records]: ${NC}")" PM2_NAME
  PM2_NAME="${PM2_NAME:-consoles-logs-records}"
fi
if [ -z "$RUN_AS" ]; then
  warn "Si el servicio corre con un usuario distinto a $USER, pásalo con --run-as"
  read -rp "$(echo -e "${YELLOW}? Ejecutar npm/pm2 como usuario (dejar vacío = $USER): ${NC}")" RUN_AS
fi

# --- Construir ssh base ---
SSH_BASE="${SSH_PASS:+$SSH_PASS }$SSH_CMD"

# --- Script remoto ---
SUDO=""
if [ -n "$RUN_AS" ]; then
  SUDO="sudo -u $RUN_AS"
fi

REMOTE_SCRIPT=$(cat <<'SCRIPT'
set -euo pipefail

BRANCH="{BRANCH}"
DEPLOY_PATH="{DEPLOY_PATH}"
PM2_NAME="{PM2_NAME}"
SUDO="{SUDO}"

cd "$DEPLOY_PATH"

echo "[INFO] Stash de cambios locales..."
git stash --include-untracked || true

echo "[INFO] Checkout a rama $BRANCH..."
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "[INFO] Instalando dependencias npm..."
$SUDO npm install

echo "[INFO] Ejecutando migraciones..."
$SUDO npx knex migrate:latest

echo "[INFO] Reiniciando proceso PM2..."
$SUDO pm2 restart "$PM2_NAME" --update-env
$SUDO pm2 list
SCRIPT
)

REMOTE_SCRIPT="${REMOTE_SCRIPT//\{BRANCH\}/$BRANCH}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//\{DEPLOY_PATH\}/$DEPLOY_PATH}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//\{PM2_NAME\}/$PM2_NAME}"
REMOTE_SCRIPT="${REMOTE_SCRIPT//\{SUDO\}/$SUDO}"

# --- Ejecutar ---
log "Conectando a $USER@$HOST:$PORT ..."
log "Rama: $BRANCH | Ruta: $DEPLOY_PATH | PM2: $PM2_NAME | Run-as: ${RUN_AS:-$USER}"
echo ""

TMPFILE=$(mktemp)
echo "$REMOTE_SCRIPT" > "$TMPFILE"

if ! eval "$SSH_BASE" "$USER@$HOST" 'bash -s' < "$TMPFILE"; then
  rm -f "$TMPFILE"
  fail "Falló la actualización remota"
fi

rm -f "$TMPFILE"
echo ""
ok "Actualización completada exitosamente en $HOST"
