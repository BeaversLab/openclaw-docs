---
summary: "Alojar OpenClaw en el nivel Always Free ARM de Oracle Cloud"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

Ejecute una puerta de enlace OpenClaw persistente en el nivel ARM **Always Free** de Oracle Cloud (hasta 4 OCPU, 24 GB de RAM, 200 GB de almacenamiento) sin costo.

## Requisitos previos

- Cuenta de Oracle Cloud ([registrarse](https://www.oracle.com/cloud/free/)) -- consulte la [guía de registro de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si encuentra problemas
- Cuenta de Tailscale (gratis en [tailscale.com](https://tailscale.com))
- Un par de claves SSH
- Unos 30 minutos

## Configuración

<Steps>
  <Step title="Crear una instancia de OCI">
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
    Si la creación de la instancia falla con "Out of capacity", pruebe con un dominio de disponibilidad diferente o reintente más tarde. La capacidad de nivel gratuito es limitada.
    </Tip>

  </Step>

  <Step title="Conectar y actualizar el sistema">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` es necesario para la compilación ARM de algunas dependencias.

  </Step>

  <Step title="Configurar usuario y nombre de host">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    Habilitar linger mantiene los servicios de usuario ejecutándose después de cerrar sesión.

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

  <Step title="Configurar la puerta de enlace">
    Utilice la autenticación por token con Tailscale Serve para el acceso remoto seguro.

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    `gateway.trustedProxies=["127.0.0.1"]` aquí es solo para el manejo de IP reenviada/cliente local del proxy local de Tailscale Serve. **No** es `gateway.auth.mode: "trusted-proxy"`. Las rutas del visor de diferencias mantienen el comportamiento de cierre seguro (fail-closed) en esta configuración: las solicitudes del visor `127.0.0.1` sin encabezados de proxy reenviados pueden devolver `Diff not found`. Use `mode=file` / `mode=both` para los adjuntos, o habilite intencionalmente los visores remotos y configure `plugins.entries.diffs.config.viewerBaseUrl` (o pase un proxy `baseUrl`) si necesita enlaces de visor compartibles.

  </Step>

  <Step title="Bloquear la seguridad de la VCN">
    Bloquee todo el tráfico excepto Tailscale en el borde de la red:

    1. Vaya a **Networking > Virtual Cloud Networks** en la consola de OCI.
    2. Haga clic en su VCN, luego en **Security Lists > Default Security List**.
    3. **Elimine** todas las reglas de entrada excepto `0.0.0.0/0 UDP 41641` (Tailscale).
    4. Mantenga las reglas de salida predeterminadas (permitir todo el tráfico saliente).

    Esto bloquea SSH en el puerto 22, HTTP, HTTPS y todo lo demás en el borde de la red. A partir de este momento, solo puede conectarse a través de Tailscale.

  </Step>

  <Step title="Verificar">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
    tailscale serve status
    curl http://localhost:18789
    ```

    Acceda a la Interfaz de Control desde cualquier dispositivo en su tailnet:

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    Reemplace `<tailnet-name>` con el nombre de su tailnet (visible en `tailscale status`).

  </Step>
</Steps>

## Alternativa: Túnel SSH

Si Tailscale Serve no funciona, use un túnel SSH desde su máquina local:

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Luego abra `http://localhost:18789`.

## Solución de problemas

**La creación de la instancia falla ("Out of capacity")** -- Las instancias ARM de nivel gratuito son populares. Intente con un dominio de disponibilidad diferente o reintente fuera de las horas pico.

**Tailscale no se conectará** -- Ejecute `sudo tailscale up --ssh --hostname=openclaw --reset` para volver a autenticarse.

**La puerta de enlace no se iniciará** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway.service -n 50`.

**Problemas con binarios ARM** -- La mayoría de los paquetes npm funcionan en ARM64. Para binarios nativos, busca lanzamientos `linux-arm64` o `aarch64`. Verifica la arquitectura con `uname -m`.

## Pasos siguientes

- [Canales](/es/channels) -- conecta Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/es/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/es/install/updating) -- mantén OpenClaw actualizado

## Relacionado

- [Resumen de instalación](/es/install)
- [GCP](/es/install/gcp)
- [Alojamiento VPS](/es/vps)
