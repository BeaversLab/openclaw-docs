---
summary: "Aloja OpenClaw en una Raspberry Pi para autoalojamiento siempre activo"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

Ejecuta un OpenClaw Gateway persistente y siempre activo en una Raspberry Pi. Dado que la Pi es solo la puerta de enlace (los modelos se ejecutan en la nube a través de API), incluso una Pi modesta maneja bien la carga de trabajo: el costo típico del hardware es **$35–80 una sola vez**, sin tarifas mensuales.

## Compatibilidad de hardware

| Modelo de Pi | RAM    | ¿Funciona? | Notas                                       |
| ------------ | ------ | ---------- | ------------------------------------------- |
| Pi 5         | 4/8 GB | Lo mejor   | El más rápido, recomendado.                 |
| Pi 4         | 4 GB   | Bueno      | El punto ideal para la mayoría de usuarios. |
| Pi 4         | 2 GB   | Aceptar    | Añade swap.                                 |
| Pi 4         | 1 GB   | Ajustado   | Posible con swap, configuración mínima.     |
| Pi 3B+       | 1 GB   | Lento      | Funciona pero es lento.                     |
| Pi Zero 2 W  | 512 MB | No         | No recomendado.                             |

**Mínimo:** 1 GB de RAM, 1 núcleo, 500 MB de disco libre, SO de 64 bits.
**Recomendado:** 2 GB+ de RAM, tarjeta SD de 16 GB+ (o SSD USB), Ethernet.

## Requisitos previos

- Raspberry Pi 4 o 5 con 2 GB+ de RAM (4 GB recomendados)
- Tarjeta MicroSD (16 GB+) o SSD USB (mejor rendimiento)
- Fuente de alimentación oficial de Pi
- Conexión de red (Ethernet o WiFi)
- Sistema operativo Raspberry Pi de 64 bits (obligatorio -- no use 32 bits)
- Aproximadamente 30 minutos

## Configuración

<Steps>
  <Step title="Flashear el SO">
    Utilice **Raspberry Pi OS Lite (64 bits)** -- no se necesita escritorio para un servidor sin cabeza.

    1. Descargue [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
    2. Elija SO: **Raspberry Pi OS Lite (64 bits)**.
    3. En el cuadro de diálogo de configuración, preconfigure:
       - Nombre de host: `gateway-host`
       - Habilitar SSH
       - Establecer nombre de usuario y contraseña
       - Configurar WiFi (si no usa Ethernet)
    4. Flashee en su tarjeta SD o unidad USB, insértela e inicie la Pi.

  </Step>

<Step title="Conectarse vía SSH">```bash ssh user@gateway-host ```</Step>

  <Step title="Actualizar el sistema">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set timezone (important for cron and reminders)
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

<Step title="Instalar Node.js 24">```bash curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - sudo apt install -y nodejs node --version ```</Step>

  <Step title="Añadir swap (importante para 2 GB o menos)">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # Reduce swappiness for low-RAM devices
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

<Step title="Instalar OpenClaw">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Step>

  <Step title="Ejecutar la configuración inicial">
    ```bash
    openclaw onboard --install-daemon
    ```

    Sigue el asistente. Se recomiendan las claves de API en lugar de OAuth para dispositivos sin cabeza. Telegram es el canal más fácil para empezar.

  </Step>

<Step title="Verificar">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Acceder a la interfaz de control">
    En su computadora, obtenga una URL del tablero desde la Pi:

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    Luego cree un túnel SSH en otra terminal:

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    Abra la URL impresa en su navegador local. Para acceso remoto siempre activo, consulte [Integración con Tailscale](/es/gateway/tailscale).

  </Step>
</Steps>

## Consejos de rendimiento

**Use un SSD USB** -- las tarjetas SD son lentas y se desgastan. Un SSD USB mejora drásticamente el rendimiento. Consulte la [guía de arranque USB de Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot).

**Activar la caché de compilación de módulos** -- Acelera las invocaciones repetidas de la CLI en hosts Pi de baja potencia:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

`OPENCLAW_NO_RESPAWN=1` mantiene los reinicios rutinarios del Gateway en proceso, lo que evita transferencias de procesos adicionales y mantiene el seguimiento de PID simple en hosts pequeños.

**Reducir el uso de memoria** -- Para configuraciones sin cabeza, libere memoria de GPU y deshabilite servicios no utilizados:

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**drop-in de systemd para reinicios estables** -- Si esta Pi ejecuta principalmente OpenClaw, agregue un drop-in de servicio:

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Luego `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`. En una Pi sin cabeza, también habilite lingering una vez para que el servicio de usuario sobreviva al cierre de sesión: `sudo loginctl enable-linger "$(whoami)"`.

## Configuración recomendada del modelo

Dado que la Pi solo ejecuta el gateway, use modelos de API alojados en la nube:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

No ejecute LLM locales en una Pi; incluso los modelos pequeños son demasiado lentos para ser útiles. Deje que Claude o GPT realicen el trabajo del modelo.

## Notas sobre binarios ARM

La mayoría de las funciones de OpenClaw funcionan en ARM64 sin cambios (Node.js, Telegram, WhatsApp/Baileys, Chromium). Los binarios que ocasionalmente carecen de compilaciones ARM son típicamente herramientas CLI opcionales de Go/Rust enviadas por habilidades. Verifique la página de lanzamiento de un binario faltante para buscar artefactos `linux-arm64` / `aarch64` antes de recurrir a compilar desde el código fuente.

## Persistencia y copias de seguridad

El estado de OpenClaw reside en:

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` por agente, estado del canal/proveedor, sesiones.
- `~/.openclaw/workspace/` — espacio de trabajo del agente (SOUL.md, memoria, artefactos).

Estos sobreviven a los reinicios. Toma una instantánea portátil con:

```bash
openclaw backup create
```

Si almacenas estos en una SSD, tanto el rendimiento como la longevidad mejoran en comparación con la tarjeta SD.

## Solución de problemas

**Sin memoria** -- Verifica que la swap esté activa con `free -h`. Deshabilita los servicios no utilizados (`sudo systemctl disable cups bluetooth avahi-daemon`). Usa solo modelos basados en API.

**Rendimiento lento** -- Usa una SSD USB en lugar de una tarjeta SD. Comprueba si hay limitación de CPU con `vcgencmd get_throttled` (debería devolver `0x0`).

**El servicio no se inicia** -- Comprueba los registros con `journalctl --user -u openclaw-gateway.service --no-pager -n 100` y ejecuta `openclaw doctor --non-interactive`. Si es una Pi sin cabeza (headless), verifica también que lingering esté habilitado: `sudo loginctl enable-linger "$(whoami)"`.

**Problemas con binarios ARM** -- Si una habilidad falla con "exec format error", comprueba si el binario tiene una compilación ARM64. Verifica la arquitectura con `uname -m` (debería mostrar `aarch64`).

**Cortes de WiFi** -- Deshabilita la gestión de energía del WiFi: `sudo iwconfig wlan0 power off`.

## Siguientes pasos

- [Canales](/es/channels) -- conecta Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/es/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/es/install/updating) -- mantén OpenClaw actualizado

## Relacionado

- [Visión general de la instalación](/es/install)
- [Servidor Linux](/es/vps)
- [Plataformas](/es/platforms)
