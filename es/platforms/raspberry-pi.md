---
summary: "OpenClaw en Raspberry Pi (configuración autohospedada económica)"
read_when:
  - Configurar OpenClaw en una Raspberry Pi
  - Ejecutar OpenClaw en dispositivos ARM
  - Construir una IA personal siempre activa y barata
title: "Raspberry Pi"
---

# OpenClaw en Raspberry Pi

## Objetivo

Ejecutar un Gateway OpenClaw persistente y siempre activo en una Raspberry Pi por un costo único de **~$35-80** (sin tarifas mensuales).

Perfecto para:

- Asistente de IA personal 24/7
- Centro de automatización del hogar
- Bot de Telegram/WhatsApp de bajo consumo y siempre disponible

## Requisitos de hardware

| Modelo Pi       | RAM     | ¿Funciona?  | Notas                                   |
| --------------- | ------- | ----------- | --------------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ Lo mejor | El más rápido, recomendado              |
| **Pi 4**        | 4GB     | ✅ Bueno    | Punto ideal para la mayoría de usuarios |
| **Pi 4**        | 2GB     | ✅ OK       | Funciona, añadir swap                   |
| **Pi 4**        | 1GB     | ⚠️ Ajustado | Posible con swap, configuración mínima  |
| **Pi 3B+**      | 1GB     | ⚠️ Lento    | Funciona pero es lento                  |
| **Pi Zero 2 W** | 512MB   | ❌          | No recomendado                          |

**Especificaciones mínimas:** 1GB de RAM, 1 núcleo, 500MB de disco  
**Recomendado:** 2GB+ de RAM, SO de 64 bits, tarjeta SD de 16GB+ (o SSD USB)

## Lo que necesitas

- Raspberry Pi 4 o 5 (se recomiendan 2GB+)
- Tarjeta MicroSD (16GB+) o SSD USB (mejor rendimiento)
- Fuente de alimentación (se recomienda la fuente oficial de Pi)
- Conexión de red (Ethernet o WiFi)
- ~30 minutos

## 1) Grabar el SO

Usa **Raspberry Pi OS Lite (64 bits)** — no se necesita escritorio para un servidor headless.

1. Descargar [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Elegir SO: **Raspberry Pi OS Lite (64 bits)**
3. Haz clic en el icono de engranaje (⚙️) para preconfigurar:
   - Establecer nombre de host: `gateway-host`
   - Habilitar SSH
   - Establecer nombre de usuario/contraseña
   - Configurar WiFi (si no usas Ethernet)
4. Grabar en tu tarjeta SD / unidad USB
5. Insertar e iniciar la Pi

## 2) Conectar vía SSH

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) Configuración del sistema

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) Instalar Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) Añadir Swap (Importante para 2GB o menos)

El Swap evita bloqueos por falta de memoria:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for low RAM (reduce swappiness)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) Instalar OpenClaw

### Opción A: Instalación estándar (Recomendada)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Opción B: Instalación personalizable (Para experimentar)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

La instalación personalizable te da acceso directo a registros y código — útil para depurar problemas específicos de ARM.

## 7) Ejecutar la configuración inicial

```bash
openclaw onboard --install-daemon
```

Sigue el asistente:

1. **Modo Gateway:** Local
2. **Autenticación:** Se recomiendan claves API (OAuth puede ser problemático en una Pi headless)
3. **Canales:** Telegram es lo más fácil para empezar
4. **Demonio:** Sí (systemd)

## 8) Verificar instalación

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) Acceder al panel de OpenClaw

Reemplaza `user@gateway-host` con tu nombre de usuario y nombre de host o dirección IP de la Pi.

En tu ordenador, pide a la Pi que imprima una URL nueva del panel de control:

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

El comando imprime `Dashboard URL:`. Dependiendo de cómo esté configurado `gateway.auth.token`,
la URL puede ser un enlace `http://127.0.0.1:18789/` plano o uno
que incluya `#token=...`.

En otra terminal de tu ordenador, crea el túnel SSH:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

A continuación, abre la URL del Panel de control impresa en tu navegador local.

Si la interfaz de usuario solicita autenticación, pega el token de `gateway.auth.token`
(o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de la interfaz de usuario de Control.

Para acceso remoto permanente, consulte [Tailscale](/es/gateway/tailscale).

---

## Optimizaciones de rendimiento

### Usar un SSD USB (Gran mejora)

Las tarjetas SD son lentas y se desgastan. Un SSD USB mejora drásticamente el rendimiento:

```bash
# Check if booting from USB
lsblk
```

Consulte la [guía de arranque USB de Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) para la configuración.

### Acelerar el inicio de la CLI (caché de compilación de módulos)

En hosts Pi de menor potencia, habilite la caché de compilación de módulos de Node para que las ejecuciones repetidas de la CLI sean más rápidas:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

Notas:

- `NODE_COMPILE_CACHE` acelera las ejecuciones posteriores (`status`, `health`, `--help`).
- `/var/tmp` sobrevive mejor a los reinicios que `/tmp`.
- `OPENCLAW_NO_RESPAWN=1` evita el costo de inicio adicional por el autoreinicio de la CLI.
- La primera ejecución calienta la caché; las ejecuciones posteriores se benefician más.

### ajuste de inicio de systemd (opcional)

Si esta Pi se usa principalmente para ejecutar OpenClaw, agregue una anulación de servicio (service drop-in) para reducir la inestabilidad del reinicio
y mantener el entorno de inicio estable:

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Luego aplique los cambios:

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

Si es posible, mantenga el estado/caché de OpenClaw en un almacenamiento con SSD para evitar los cuellos de botella de E/S aleatoria en la tarjeta SD
durante los arranques en frío.

Cómo las políticas `Restart=` ayudan a la recuperación automatizada:
[systemd puede automatizar la recuperación del servicio](https://www.redhat.com/en/blog/systemd-automate-recovery).

### Reducir el uso de memoria

```bash
# Disable GPU memory allocation (headless)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
```

### Monitorear recursos

```bash
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop
```

---

## Notas específicas de ARM

### Compatibilidad binaria

La mayoría de las funciones de OpenClaw funcionan en ARM64, pero algunos binarios externos pueden necesitar compilaciones ARM:

| Herramienta          | Estado ARM64 | Notas                               |
| -------------------- | ------------ | ----------------------------------- |
| Node.js              | ✅           | Funciona genial                     |
| WhatsApp (Baileys)   | ✅           | JS puro, sin problemas              |
| Telegram             | ✅           | JS puro, sin problemas              |
| gog (Gmail CLI)      | ⚠️           | Consultar si hay versión para ARM   |
| Chromium (navegador) | ✅           | `sudo apt install chromium-browser` |

Si una habilidad falla, verifique si su binario tiene una compilación ARM. Muchas herramientas de Go/Rust la tienen; otras no.

### 32 bits vs 64 bits

**Use siempre un sistema operativo de 64 bits.** Node.js y muchas herramientas modernas lo requieren. Verifíquelo con:

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## Configuración de modelo recomendada

Dado que la Pi es solo la puerta de enlace (los modelos se ejecutan en la nube), use modelos basados en API:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**No intente ejecutar LLM locales en una Pi** — incluso los modelos pequeños son demasiado lentos. Deje que Claude/GPT hagan el trabajo pesado.

---

## Inicio automático al arrancar

La incorporación configura esto, pero para verificar:

```bash
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw
```

---

## Solución de problemas

### Sin memoria (OOM)

```bash
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi
```

### Rendimiento lento

- Use SSD USB en lugar de tarjeta SD
- Deshabilite los servicios no utilizados: `sudo systemctl disable cups bluetooth avahi-daemon`
- Verifique la limitación de la CPU: `vcgencmd get_throttled` (debería devolver `0x0`)

### El servicio no se inicia

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### Problemas con binarios ARM

Si una habilidad falla con "exec format error":

1. Verifique si el binario tiene una compilación ARM64
2. Intente compilar desde el código fuente
3. O use un contenedor Docker con soporte ARM

### Caídas de WiFi

Para Pis sin cabeza en WiFi:

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## Comparación de costos

| Configuración  | Costo único | Costo mensual | Notas                            |
| -------------- | ----------- | ------------- | -------------------------------- |
| **Pi 4 (2GB)** | ~$45        | $0            | + energía (~$5/año)              |
| **Pi 4 (4GB)** | ~$55        | $0            | Recomendado                      |
| **Pi 5 (4GB)** | ~$60        | $0            | Mejor rendimiento                |
| **Pi 5 (8GB)** | ~$80        | $0            | Excesivo pero a prueba de futuro |
| DigitalOcean   | $0          | $6/mes        | $72/año                          |
| Hetzner        | $0          | €3,79/mes     | ~$50/año                         |

**Punto de equilibrio:** Una Pi se paga a sí misma en ~6-12 meses frente a un VPS en la nube.

---

## Véase también

- [Guía de Linux](/es/platforms/linux) — configuración general de Linux
- [Guía de DigitalOcean](/es/platforms/digitalocean) — alternativa en la nube
- [Guía de Hetzner](/es/install/hetzner) — configuración de Docker
- [Tailscale](/es/gateway/tailscale) — acceso remoto
- [Nodos](/es/nodes) — empareje su portátil/teléfono con la puerta de enlace Pi

import es from "/components/footer/es.mdx";

<es />
