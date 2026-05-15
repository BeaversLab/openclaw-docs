---
summary: "Aloja OpenClaw en un Droplet de DigitalOcean"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

Ejecuta un OpenClaw Gateway persistente en un Droplet de DigitalOcean (~$6/mes para el plan Básico de 1 GB).

DigitalOcean es la ruta de VPS de pago más sencilla. Si prefieres opciones más baratas o gratuitas:

- [Hetzner](/es/install/hetzner) — €3.79/mes, más núcleos/RAM por dólar.
- [Oracle Cloud](/es/install/oracle) — Always Free ARM (hasta 4 OCPU, 24 GB RAM), pero el registro puede ser delicado y es solo para ARM.

## Requisitos previos

- Cuenta de DigitalOcean ([registrarse](https://cloud.digitalocean.com/registrations/new))
- Par de claves SSH (o disposición para usar autenticación por contraseña)
- Unos 20 minutos

## Configuración

<Steps>
  <Step title="Crear un Droplet">
    <Warning>
    Usa una imagen base limpia (Ubuntu 24.04 LTS). Evita las imágenes de un clic del Marketplace de terceros a menos que hayas revisado sus scripts de inicio y configuraciones predeterminadas del firewall.
    </Warning>

    1. Inicia sesión en [DigitalOcean](https://cloud.digitalocean.com/).
    2. Haz clic en **Create > Droplets**.
    3. Elige:
       - **Región:** La más cercana a ti
       - **Imagen:** Ubuntu 24.04 LTS
       - **Tamaño:** Basic, Regular, 1 vCPU / 1 GB RAM / 25 GB SSD
       - **Autenticación:** Clave SSH (recomendado) o contraseña
    4. Haz clic en **Create Droplet** y anota la dirección IP.

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

    # Create the non-root user that will own OpenClaw state and services.
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```

    Usa el shell root solo para el arranque del sistema. Ejecuta los comandos de OpenClaw como el usuario no root `openclaw` para que el estado resida bajo `/home/openclaw/.openclaw/` y el Gateway se instale como el servicio systemd de ese usuario.

  </Step>

  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente te guía a través de la autenticación del modelo, la configuración del canal, la generación del token de la puerta de enlace y la instalación del demonio (systemd).

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

<Step title="Verificar la puerta de enlace">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Acceder a la Interfaz de Control">
    De manera predeterminada, el gateway se enlaza a la interfaz de bucle local (loopback). Elija una de estas opciones.

    **Opción A: Túnel SSH (lo más sencillo)**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    Luego abra `http://localhost:18789`.

    **Opción B: Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sudo sh
    sudo tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    Luego abra `https://<magicdns>/` desde cualquier dispositivo en su tailnet.

    Tailscale Serve autentica el tráfico de la Interfaz de Control y WebSocket mediante encabezados de identidad de tailnet, lo que asume que el host del gateway en sí es confiable. Los endpoints de la API HTTP siguen el modo de autenticación normal del gateway (token/contraseña) independientemente. Para requerir credenciales explícitas de secreto compartido a través de Serve, configure `gateway.auth.allowTailscale: false` y use `gateway.auth.mode: "token"` o `"password"`.

    **Opción C: Enlace Tailnet (sin Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    Luego abra `http://<tailscale-ip>:18789` (se requiere token).

  </Step>
</Steps>

## Persistencia y copias de seguridad

El estado de OpenClaw reside en:

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` por agente, estado del canal/proveedor y datos de sesión.
- `~/.openclaw/workspace/` — el espacio de trabajo del agente (SOUL.md, memoria, artefactos).

Estos sobreviven a los reinicios del Droplet. Para tomar una instantánea portable:

```bash
openclaw backup create
```

Las instantáneas de DigitalOcean respaldan todo el Droplet; `openclaw backup create` es portable entre hosts.

## Consejos para 1 GB de RAM

El Droplet de $6 solo tiene 1 GB de RAM. Para que todo funcione sin problemas:

- Asegúrese de que el paso de intercambio (swap) anterior esté en `/etc/fstab` para que sobreviva a los reinicios.
- Prefiera modelos basados en API (Claude, GPT) en lugar de locales: la inferencia de LLM local no cabe en 1 GB.
- Configure `agents.defaults.model.primary` en un modelo más pequeño si se queda sin memoria (OOM) en mensajes grandes.
- Monitoree con `free -h` y `htop`.

## Solución de problemas

**El gateway no se inicia** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway.service -n 50`.

**Puerto ya en uso** -- Ejecute `lsof -i :18789` para encontrar el proceso, luego deténgalo.

**Sin memoria (Out of memory)** -- Verifique que el intercambio (swap) esté activo con `free -h`. Si sigue quedándose sin memoria, use modelos basados en API (Claude, GPT) en lugar de modelos locales, o actualice a un Droplet de 2 GB.

## Próximos pasos

- [Canales](/es/channels) -- conecta Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/es/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/es/install/updating) -- mantén OpenClaw actualizado

## Relacionado

- [Resumen de instalación](/es/install)
- [Fly.io](/es/install/fly)
- [Hetzner](/es/install/hetzner)
- [Alojamiento VPS](/es/vps)
