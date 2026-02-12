#!/bin/bash
# =============================================================================
# Setup script para el bot de Nadie en Google Cloud e2-micro (free tier)
#
# Prerrequisitos:
#   1. Crear VM e2-micro en GCE (us-central1, us-east1, o us-west1 para free tier)
#   2. OS: Debian 12 o Ubuntu 22.04
#   3. Disco: 30GB standard (gratis)
#   4. SSH a la VM y ejecutar este script
#
# Uso:
#   chmod +x setup-gce.sh
#   ./setup-gce.sh
# =============================================================================

set -euo pipefail

echo "=== Setup Nadie Twitter Bot ==="

# --- Node.js 22 LTS ---
echo ""
echo "--- Instalando Node.js 22 LTS ---"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node: $(node --version), npm: $(npm --version)"

# --- PM2 ---
echo ""
echo "--- Instalando PM2 ---"
sudo npm install -g pm2

# --- Directorio del bot ---
echo ""
echo "--- Preparando directorio ---"
BOT_DIR="/home/nadie-bot"
sudo mkdir -p "$BOT_DIR/twitter-bot"
sudo mkdir -p "$BOT_DIR/logs"
sudo chown -R "$USER:$USER" "$BOT_DIR"

# --- Copiar archivos del bot ---
echo ""
echo "--- Copiando archivos ---"
# Si estas ejecutando esto desde el repo clonado:
if [ -d "./twitter-bot" ]; then
  cp -r ./twitter-bot/* "$BOT_DIR/twitter-bot/"
  echo "Archivos copiados desde ./twitter-bot/"
else
  echo "AVISO: No se encontro ./twitter-bot/ - copia los archivos manualmente a $BOT_DIR/twitter-bot/"
fi

# --- Instalar dependencias ---
echo ""
echo "--- Instalando dependencias ---"
cd "$BOT_DIR/twitter-bot"
npm install

# --- Compilar TypeScript ---
echo ""
echo "--- Compilando TypeScript ---"
npm run build

# --- Crear .env ---
echo ""
echo "--- Configurando variables de entorno ---"
if [ ! -f "$BOT_DIR/twitter-bot/.env" ]; then
  cp "$BOT_DIR/twitter-bot/.env.example" "$BOT_DIR/twitter-bot/.env"
  echo ""
  echo "IMPORTANTE: Edita $BOT_DIR/twitter-bot/.env con tus credenciales:"
  echo "  nano $BOT_DIR/twitter-bot/.env"
  echo ""
else
  echo ".env ya existe, no se sobreescribe"
fi

# --- Configurar PM2 ---
echo ""
echo "--- Configurando PM2 ---"
cd "$BOT_DIR/twitter-bot"

# Cargar variables de entorno del .env para PM2
# PM2 usara dotenv a traves de Node
echo ""
echo "Para arrancar el bot:"
echo "  cd $BOT_DIR/twitter-bot"
echo "  pm2 start ecosystem.config.cjs"
echo ""
echo "Para que PM2 arranque con el sistema:"
echo "  pm2 startup"
echo "  pm2 save"
echo ""
echo "Para ver logs:"
echo "  pm2 logs nadie-bot"
echo ""
echo "Para monitorizar:"
echo "  pm2 monit"
echo ""

# --- PM2 startup ---
echo "--- Configurando arranque automatico ---"
pm2 startup systemd -u "$USER" --hp "$HOME" || true

echo ""
echo "=== Setup completado ==="
echo ""
echo "Siguiente paso:"
echo "  1. Edita .env con tus credenciales: nano $BOT_DIR/twitter-bot/.env"
echo "  2. Arranca: cd $BOT_DIR/twitter-bot && pm2 start ecosystem.config.cjs"
echo "  3. Guarda config PM2: pm2 save"
echo "  4. Verifica: pm2 logs nadie-bot"
