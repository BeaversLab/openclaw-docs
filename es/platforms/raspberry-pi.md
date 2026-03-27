---
summary: "OpenClaw en Raspberry Pi (configuración autohospedada económica)"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi (Plataforma)"
---

# OpenClaw en Raspberry Pi

## Objetivo

Ejecutar un OpenClaw Gateway persistente y siempre activo en una Raspberry Pi por un costo único de **~$35-80** (sin tarifas mensuales).

Perfecto para:

- Asistente de IA personal 24/7
- Centro de automatización del hogar
- Bot de Telegram/WhatsApp de bajo consumo y siempre disponible

## Requisitos de Hardware

| Modelo Pi       | RAM     | ¿Funciona?  | Notas                                   |
| --------------- | ------- | ----------- | --------------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ El mejor | El más rápido, recomendado              |
| **Pi 4**        | 4GB     | ✅ Bueno    | Punto ideal para la mayoría de usuarios |
| **Pi 4**        | 2GB     | ✅ OK       | Funciona, añadir swap                   |
| **Pi 4**        | 1GB     | ⚠️ Justo    | Posible con swap, configuración mínima  |
| **Pi 3B+**      | 1GB     | ⚠️ Lento    | Funciona pero es lento                  |
| **Pi Zero 2 W** | 512MB   | ❌          | No recomendado                          |

**Especificaciones mínimas:** 1GB RAM, 1 núcleo, 500MB disco  
**Recomendado:** 2GB+ RAM, SO de 64 bits, tarjeta SD de 16GB+ (o SSD USB)

## Lo que necesitas

- Raspberry Pi 4 o 5 (se recomiendan 2GB+)
- Tarjeta MicroSD (16GB+) o SSD USB (mejor rendimiento)
- Fuente de alimentación (se recomienda la fuente oficial Pi)
- Conexión de red (Ethernet o WiFi)
- ~30 minutos

## 1) Grabar el SO

Use **Raspberry Pi OS Lite (64-bit)** — no se necesita escritorio para un servidor headless.

1. Descargue [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Elija SO: **Raspberry Pi OS Lite (64-bit)**
3. Haga clic en el icono de engranaje (⚙️) para preconfigurar:
   - Establezca nombre de host: `gateway-host`
   - Activar SSH
   - Establecer nombre de usuario/contraseña
   - Configurar WiFi (si no usa Ethernet)
4. Grabar en su tarjeta SD / unidad USB
5. Inserte y arranque la Pi

## 2) Conectar vía SSH

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) Configuración del Sistema

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

El swap evita fallos por falta de memoria:

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

### Opción A: Instalación Estándar (Recomendada)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Opción B: Instalación Modificable (Para experimentar)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

La instalación modificable le da acceso directo a registros y código — útil para depurar problemas específicos de ARM.

## 7) Ejecutar Integración

```bash
openclaw onboard --install-daemon
```

Siga el asistente:

1. **Modo Gateway:** Local
2. **Autenticación:** Se recomiendan claves API (OAuth puede ser delicado en una Pi headless)
3. **Canales:** Telegram es lo más fácil para empezar
4. **Demonio:** Sí (systemd)

## 8) Verificar Instalación

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) Acceder al Panel de OpenClaw

Reemplace `user@gateway-host` con su nombre de usuario y nombre de host o dirección IP de la Pi.

En su computadora, pídale a la Pi que imprima una URL nueva del panel de control:

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

El comando imprime `Dashboard URL:`. Dependiendo de cómo esté
configurado `gateway.auth.token`, la URL puede ser un enlace `http://127.0.0.1:18789/` plano
o uno que incluya `#token=...`.

En otra terminal en su computadora, cree el túnel SSH:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

Luego abra la URL del panel de control impresa en su navegador local.

Si la interfaz de usuario solicita autenticación, pegue el token de `gateway.auth.token`
(o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.

Para acceso remoto siempre activo, consulte [Tailscale](/es/gateway/tailscale).

---

## Optimizaciones de Rendimiento

### Use un SSD USB (Gran Mejora)

Las tarjetas SD son lentas y se desgastan. Un SSD USB mejora drásticamente el rendimiento:

```bash
# Check if booting from USB
lsblk
```

Consulte la [guía de arranque USB Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) para la configuración.

### Acelerar el inicio de la CLI (caché de compilación de módulos)

En hosts Pi de baja potencia, active el caché de compilación de módulos de Node para que las ejecuciones repetidas de la CLI sean más rápidas:

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

Si esta Pi se usa principalmente para ejecutar OpenClaw, agregue un drop-in de servicio para reducir el
jitter de reinicio y mantener el entorno de inicio estable:

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

Luego aplique:

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

Si es posible, mantenga el estado/caché de OpenClaw en un almacenamiento con SSD para evitar
cuellos de botella de E/S aleatoria en la tarjeta SD durante los inicios en frío.

Cómo las políticas `Restart=` ayudan a la recuperación automatizada:
[systemd puede automatizar la recuperación del servicio](https://www.redhat.com/en/blog/systemd-automate-recovery).

### Reducir el Uso de Memoria

```bash
# Disable GPU memory allocation (headless)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
```

### Monitorear Recursos

```bash
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop
```

---

## Notas Específicas de ARM

### Compatibilidad Binaria

La mayoría de las funciones de OpenClaw funcionan en ARM64, pero algunos binarios externos pueden necesitar compilaciones ARM:

| Herramienta          | Estado ARM64 | Notas                               |
| -------------------- | ------------ | ----------------------------------- |
| Node.js              | ✅           | Funciona muy bien                   |
| WhatsApp (Baileys)   | ✅           | JS puro, sin problemas              |
| Telegram             | ✅           | JS puro, sin problemas              |
| gog (Gmail CLI)      | ⚠️           | Verificar versión ARM               |
| Chromium (navegador) | ✅           | `sudo apt install chromium-browser` |

Si una habilidad falla, verifica si su binario tiene una compilación para ARM. Muchas herramientas de Go/Rust la tienen; otras no.

### 32 bits vs 64 bits

**Utiliza siempre un sistema operativo de 64 bits.** Node.js y muchas herramientas modernas lo requieren. Verifícalo con:

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## Configuración de Modelo Recomendada

Dado que la Pi es solo la Gateway (los modelos se ejecutan en la nube), utiliza modelos basados en API:

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

**No intentes ejecutar LLMs locales en una Pi** — incluso los modelos pequeños son demasiado lentos. Deja que Claude/GPT haga el trabajo pesado.

---

## Inicio Automático al Arrancar

La incorporación lo configura, pero para verificar:

```bash
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw
```

---

## Solución de Problemas

### Sin Memoria (OOM)

```bash
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi
```

### Rendimiento Lento

- Usa SSD USB en lugar de tarjeta SD
- Deshabilita servicios no utilizados: `sudo systemctl disable cups bluetooth avahi-daemon`
- Verifica la limitación de la CPU: `vcgencmd get_throttled` (debería devolver `0x0`)

### El servicio no se iniciará

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### Problemas con Binarios ARM

Si una habilidad falla con "exec format error":

1. Verifica si el binario tiene una compilación ARM64
2. Intenta compilar desde el código fuente
3. O usa un contenedor Docker con soporte ARM

### Caídas de WiFi

Para Pis sin cabeza (headless) en WiFi:

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## Comparación de Costos

| Configuración  | Costo Único | Costo Mensual | Notas                            |
| -------------- | ----------- | ------------- | -------------------------------- |
| **Pi 4 (2GB)** | ~$45        | $0            | + energía (~$5/año)              |
| **Pi 4 (4GB)** | ~$55        | $0            | Recomendado                      |
| **Pi 5 (4GB)** | ~$60        | $0            | Mejor rendimiento                |
| **Pi 5 (8GB)** | ~$80        | $0            | Excesivo pero a prueba de futuro |
| DigitalOcean   | $0          | $6/mes        | $72/año                          |
| Hetzner        | $0          | €3.79/mes     | ~$50/año                         |

**Punto de equilibrio:** Una Pi se paga a sí misma en ~6-12 meses en comparación con un VPS en la nube.

---

## Véase También

- [Guía de Linux](/es/platforms/linux) — configuración general de Linux
- [Guía de DigitalOcean](/es/platforms/digitalocean) — alternativa en la nube
- [Guía de Hetzner](/es/install/hetzner) — configuración con Docker
- [Tailscale](/es/gateway/tailscale) — acceso remoto
- [Nodos](/es/nodes) — vincula tu portátil/teléfono con la gateway Pi

import es from "/components/footer/es.mdx";

<es />
