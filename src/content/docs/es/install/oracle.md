---
summary: "Alojar OpenClaw en el nivel Always Free ARM de Oracle Cloud"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

# Oracle Cloud

Ejecute una puerta de enlace OpenClaw persistente en el nivel ARM **Always Free** de Oracle Cloud (hasta 4 OCPU, 24 GB de RAM, 200 GB de almacenamiento) sin costo.

## Requisitos previos

- Cuenta de Oracle Cloud ([registrarse](https://www.oracle.com/cloud/free/)) -- consulte la [guía de registro de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si tiene problemas
- Cuenta de Tailscale (gratis en [tailscale.com](https://tailscale.com))
- Un par de claves SSH
- Aproximadamente 30 minutos

## Configuración

<Steps>
  <Step title="Crear una instancia OCI">
    1. Inicie sesión en [Oracle Cloud Console](https://cloud.oracle.com/).
    2. Vaya a **Compute > Instances > Create Instance**.
    3. Configure:
       - **Name:** `openclaw`
       - **Image:** Ubuntu 24.04 (aarch64)
       - **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs:** 2 (o hasta 4)
       - **Memory:** 12 GB (o hasta 24 GB)
       - **Boot volume:** 50 GB (hasta 200 GB gratis)
       - **SSH key:** Agregue su clave pública
    4. Haga clic en **Create** y anote la dirección IP pública.

    <Tip>
    Si la creación de la instancia falla con "Out of capacity", intente con un dominio de disponibilidad diferente o reintente más tarde. La capacidad del nivel gratuito es limitada.
    </Tip>

  </Step>

  <Step title="Conectar y actualizar el sistema">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` es obligatorio para la compilación ARM de algunas dependencias.

  </Step>

  <Step title="Configurar usuario y nombre de host">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    Habilitar linger mantiene los servicios de usuario en ejecución después de cerrar sesión.

  </Step>

  <Step title="Instalar Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    De ahora en adelante, conéctese a través de Tailscale: `ssh ubuntu@openclaw`.

  </Step>

  <Step title="Instalar OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    Cuando se le pregunte "How do you want to hatch your bot?", seleccione **Do this later**.

  </Step>

  <Step title="Configure the gateway">
    Use token auth with Tailscale Serve para acceso remoto seguro.

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway
    ```

  </Step>

  <Step title="Lock down VCN security">
    Bloquee todo el tráfico excepto Tailscale en el borde de la red:

    1. Vaya a **Networking > Virtual Cloud Networks** en la consola de OCI.
    2. Haga clic en su VCN, luego en **Security Lists > Default Security List**.
    3. **Elimine** todas las reglas de ingreso excepto `0.0.0.0/0 UDP 41641` (Tailscale).
    4. Mantenga las reglas de egreso predeterminadas (permitir todo el tráfico saliente).

    Esto bloquea SSH en el puerto 22, HTTP, HTTPS y todo lo demás en el borde de la red. A partir de este momento, solo puede conectarse a través de Tailscale.

  </Step>

  <Step title="Verify">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway
    tailscale serve status
    curl http://localhost:18789
    ```

    Acceda a la interfaz de usuario de Control desde cualquier dispositivo de su tailnet:

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    Reemplace `<tailnet-name>` con el nombre de su tailnet (visible en `tailscale status`).

  </Step>
</Steps>

## Alternativa: túnel SSH

Si Tailscale Serve no funciona, use un túnel SSH desde su máquina local:

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Luego abra `http://localhost:18789`.

## Solución de problemas

**La creación de la instancia falla ("Sin capacidad")** -- Las instancias ARM de nivel gratuito son populares. Intente con un dominio de disponibilidad diferente o reintente en horas fuera de punta.

**Tailscale no se conectará** -- Ejecute `sudo tailscale up --ssh --hostname=openclaw --reset` para volver a autenticarse.

**El Gateway no se iniciará** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway -n 50`.

**Problemas con binarios ARM** -- La mayoría de los paquetes npm funcionan en ARM64. Para binarios nativos, busque versiones `linux-arm64` o `aarch64`. Verifique la arquitectura con `uname -m`.

## Siguientes pasos

- [Canales](/en/channels) -- conecte Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/en/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/en/install/updating) -- mantenga OpenClaw actualizado
