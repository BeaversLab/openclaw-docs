---
summary: "Alojar OpenClaw en un Droplet de DigitalOcean"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

Ejecute un OpenClaw Gateway persistente en un DigitalOcean Droplet.

## Requisitos previos

- Cuenta de DigitalOcean ([registrarse](https://cloud.digitalocean.com/registrations/new))
- Par de claves SSH (o disposición a usar autenticación por contraseña)
- Alrededor de 20 minutos

## Configuración

<Steps>
  <Step title="Crear un Droplet">
    <Warning>
    Utilice una imagen base limpia (Ubuntu 24.04 LTS). Evite las imágenes de un clic de Marketplace de terceros a menos que haya revisado sus scripts de inicio y las configuraciones predeterminadas del firewall.
    </Warning>

    1. Inicie sesión en [DigitalOcean](https://cloud.digitalocean.com/).
    2. Haga clic en **Create > Droplets**.
    3. Elija:
       - **Region:** La más cercana a usted
       - **Image:** Ubuntu 24.04 LTS
       - **Size:** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Authentication:** Clave SSH (recomendado) o contraseña
    4. Haga clic en **Create Droplet** y anote la dirección IP.

  </Step>

  <Step title="Conectar e instalar">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 24
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs

    # Install OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw --version
    ```

  </Step>

  <Step title="Ejecutar la configuración inicial">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente lo guiará a través de la autenticación del modelo, la configuración del canal, la generación del token de la puerta de enlace y la instalación del demonio (systemd).

  </Step>

  <Step title="Añadir swap (recomendado para Droplets de 1 GB)">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="Verificar la puerta de enlace">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Acceder a la interfaz de control">
    De forma predeterminada, la puerta de enlace se enlaza a loopback. Elija una de estas opciones.

    **Opción A: Túnel SSH (la más sencilla)**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    Luego abra `http://localhost:18789`.

    **Opción B: Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    Luego abra `https://<magicdns>/` desde cualquier dispositivo en su tailnet.

    **Opción C: Enlace Tailnet (sin Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    Luego abra `http://<tailscale-ip>:18789` (se requiere token).

  </Step>
</Steps>

## Solución de problemas

**La puerta de enlace no se inicia** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway.service -n 50`.

**Puerto ya en uso** -- Ejecute `lsof -i :18789` para encontrar el proceso y luego deténgalo.

**Memoria insuficiente** -- Verifica que el intercambio (swap) esté activo con `free -h`. Si sigues experimentando errores de falta de memoria (OOM), utiliza modelos basados en API (Claude, GPT) en lugar de modelos locales, o actualiza a un Droplet de 2 GB.

## Próximos pasos

- [Canales](/es/channels) -- conecta Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/es/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/es/install/updating) -- mantén OpenClaw actualizado

## Relacionado

- [Resumen de instalación](/es/install)
- [Fly.io](/es/install/fly)
- [Hetzner](/es/install/hetzner)
- [Alojamiento VPS](/es/vps)
