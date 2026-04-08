---
summary: "Aloje OpenClaw en una Raspberry Pi para autohospedaje siempre activo"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# Raspberry Pi

Ejecute un Gateway de OpenClaw persistente y siempre activo en una Raspberry Pi. Dado que la Pi es solo el gateway (los modelos se ejecutan en la nube a través de API), incluso una Pi modesta maneja bien la carga de trabajo.

## Requisitos previos

- Raspberry Pi 4 o 5 con 2 GB+ de RAM (se recomiendan 4 GB)
- Tarjeta MicroSD (16 GB+) o SSD USB (mejor rendimiento)
- Fuente de alimentación oficial de Pi
- Conexión de red (Ethernet o WiFi)
- Raspberry Pi OS de 64 bits (obligatorio -- no use 32 bits)
- Unos 30 minutos

## Configuración

<Steps>
  <Step title="Flashear el sistema operativo">
    Utilice **Raspberry Pi OS Lite (64 bits)** -- no se necesita escritorio para un servidor headless.

    1. Descargue [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
    2. Elija SO: **Raspberry Pi OS Lite (64 bits)**.
    3. En el diálogo de configuración, preconfigurado:
       - Nombre de host: `gateway-host`
       - Habilitar SSH
       - Establecer nombre de usuario y contraseña
       - Configurar WiFi (si no se usa Ethernet)
    4. Flashee en su tarjeta SD o unidad USB, insértela y arranque la Pi.

  </Step>

<Step title="Conectarse a través de SSH">```bash ssh user@gateway-host ```</Step>

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

  <Step title="Ejecutar onboarding">
    ```bash
    openclaw onboard --install-daemon
    ```

    Siga el asistente. Se recomiendan las claves API sobre OAuth para dispositivos headless. Telegram es el canal más fácil para comenzar.

  </Step>

<Step title="Verificar">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Acceder a la Interfaz de Control">
    En su computadora, obtenga una URL del panel de control desde la Pi:

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    Luego cree un túnel SSH en otra terminal:

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    Abra la URL impresa en su navegador local. Para acceso remoto siempre activo, consulte [Integración con Tailscale](/en/gateway/tailscale).

  </Step>
</Steps>

## Consejos de rendimiento

**Use un SSD USB** -- las tarjetas SD son lentas y se desgastan. Un SSD USB mejora drásticamente el rendimiento. Consulte la [guía de arranque USB de Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot).

**Habilitar caché de compilación de módulos** -- Acelera las invocaciones repetidas de la CLI en hosts Pi de baja potencia:

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

**Reducir el uso de memoria** -- Para configuraciones sin cabeza (headless), libere memoria de la GPU y deshabilite los servicios no utilizados:

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

## Solución de problemas

**Sin memoria** -- Verifique que el intercambio (swap) esté activo con `free -h`. Deshabilite los servicios no utilizados (`sudo systemctl disable cups bluetooth avahi-daemon`). Use solo modelos basados en API.

**Rendimiento lento** -- Use un SSD USB en lugar de una tarjeta SD. Compruebe si hay limitación de la CPU con `vcgencmd get_throttled` (debería devolver `0x0`).

**El servicio no se iniciará** -- Verifique los registros con `journalctl --user -u openclaw-gateway.service --no-pager -n 100` y ejecute `openclaw doctor --non-interactive`. Si esta es una Pi sin cabeza (headless), también verifique que lingering esté habilitado: `sudo loginctl enable-linger "$(whoami)"`.

**Problemas con binarios ARM** -- Si una habilidad falla con "exec format error", verifique si el binario tiene una compilación ARM64. Verifique la arquitectura con `uname -m` (debería mostrar `aarch64`).

**Caídas de WiFi** -- Desactive la administración de energía del WiFi: `sudo iwconfig wlan0 power off`.

## Siguientes pasos

- [Canales](/en/channels) -- conecte Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/en/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/en/install/updating) -- mantenga OpenClaw actualizado
