---
summary: "Alojar OpenClaw en un Droplet de DigitalOcean"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

# DigitalOcean

Ejecute un Gateway de OpenClaw persistente en un Droplet de DigitalOcean.

## Requisitos previos

- Cuenta de DigitalOcean ([registrarse](https://cloud.digitalocean.com/registrations/new))
- Par de claves SSH (o disposición a usar autenticación por contraseña)
- Alrededor de 20 minutos

## Configuración

<Steps>
  <Step title="Crear un Droplet">
    <Warning>
    Utilice una imagen base limpia (Ubuntu 24.04 LTS). Evite las imágenes de un clic del Marketplace de terceros a menos que haya revisado sus scripts de inicio y configuraciones predeterminadas del firewall.
    </Warning>

    1. Inicie sesión en [DigitalOcean](https://cloud.digitalocean.com/).
    2. Haga clic en **Create > Droplets**.
    3. Elija:
       - **Región:** La más cercana a usted
       - **Imagen:** Ubuntu 24.04 LTS
       - **Tamaño:** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Autenticación:** Clave SSH (recomendado) o contraseña
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

  <Step title="Ejecutar el asistente de configuración">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente lo guía a través de la autenticación del modelo, la configuración del canal, la generación del token de la puerta de enlace y la instalación del demonio (systemd).

  </Step>

  <Step title="Añadir memoria de intercambio (recomendado para Droplets de 1 GB)">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="Verificar la puerta de enlace">
  ```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u
  openclaw-gateway.service -f ```
</Step>

  <Step title="Acceder a la interfaz de usuario de control">
    La puerta de enlace se vincula al loopback de forma predeterminada. Elija una de estas opciones.

    **Opción A: Túnel SSH (el más simple)**

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

    **Opción C: Tailnet bind (sin Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    Luego abra `http://<tailscale-ip>:18789` (se requiere token).

  </Step>
</Steps>

## Solución de problemas

**Gateway no se inicia** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway.service -n 50`.

**Puerto ya en uso** -- Ejecute `lsof -i :18789` para encontrar el proceso, luego deténgalo.

**Sin memoria** -- Verifique que swap esté activo con `free -h`. Si sigue alcanzando OOM, use modelos basados en API (Claude, GPT) en lugar de modelos locales, o actualice a un Droplet de 2 GB.

## Pasos siguientes

- [Canales](/en/channels) -- conecte Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/en/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/en/install/updating) -- mantenga OpenClaw actualizado

import es from "/components/footer/es.mdx";

<es />
