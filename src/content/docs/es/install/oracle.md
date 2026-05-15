---
summary: "Alojar OpenClaw en el nivel gratuito Always Free de Oracle Cloud"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

Ejecute una puerta de enlace OpenClaw persistente en el nivel ARM **Always Free** de Oracle Cloud (hasta 4 OCPU, 24 GB de RAM, 200 GB de almacenamiento) sin costo.

## Requisitos previos

- Cuenta de Oracle Cloud ([registrarse](https://www.oracle.com/cloud/free/)) -- consulte la [guía de registro de la comunidad](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si tiene problemas
- Cuenta de Tailscale (gratis en [tailscale.com](https://tailscale.com))
- Un par de claves SSH
- Unos 30 minutos

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
       - **SSH key:** Añada su clave pública
    4. Haga clic en **Create** y anote la dirección IP pública.

    <Tip>
    Si la creación de la instancia falla con "Out of capacity", pruebe con un dominio de disponibilidad diferente o inténtelo más tarde. La capacidad del nivel gratuito es limitada.
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

  <Step title="Configurar la puerta de enlace">
    Utilice la autenticación por token con Tailscale Serve para un acceso remoto seguro.

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    `gateway.trustedProxies=["127.0.0.1"]` aquí es solo para el manejo de IP reenviada/cliente local del proxy Tailscale Serve local. **No** es `gateway.auth.mode: "trusted-proxy"`. Las rutas del visor de diferencias mantienen el comportamiento de cierre de fallo en esta configuración: las solicitudes del visor `127.0.0.1` sin encabezados de proxy reenviados pueden devolver `Diff not found`. Utilice `mode=file` / `mode=both` para los archivos adjuntos, o habilite intencionalmente los visores remotos y configure `plugins.entries.diffs.config.viewerBaseUrl` (o pase un proxy `baseUrl`) si necesita enlaces de visor compartibles.

  </Step>

  <Step title="Asegurar la seguridad de la VCN">
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

    Acceda a la interfaz de usuario de Control desde cualquier dispositivo en su tailnet:

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    Reemplace `<tailnet-name>` con el nombre de su tailnet (visible en `tailscale status`).

  </Step>
</Steps>

## Verificar la postura de seguridad

Con la VCN bloqueada (solo abierto el puerto UDP 41641) y la puerta de enlace vinculada a loopback, el tráfico público está bloqueado en el borde de la red y el acceso de administración es solo a través de tailnet. Esto elimina la necesidad de varios pasos tradicionales de endurecimiento de VPS:

| Paso tradicional                   | ¿Necesario?     | Por qué                                                                                          |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| Cortafuegos UFW                    | No              | La VCN bloquea el tráfico antes de que llegue a la instancia.                                    |
| fail2ban                           | No              | El puerto 22 está bloqueado en la VCN; no hay superficie de fuerza bruta.                        |
| Endurecimiento de sshd             | No              | SSH de Tailscale no usa sshd.                                                                    |
| Deshabilitar inicio de sesión root | No              | Tailscale se autentica por identidad de tailnet, no por usuarios del sistema.                    |
| Autenticación solo por clave SSH   | No              | Igual — la identidad de tailnet reemplaza las claves SSH del sistema.                            |
| Endurecimiento de IPv6             | Generalmente no | Depende de la configuración de la VCN/subred; verifique lo que realmente está asignado/expuesto. |

Aún recomendado:

- `chmod 700 ~/.openclaw` para restringir los permisos del archivo de credenciales.
- `openclaw security audit` para una verificación de posture específica de OpenClaw.
- `sudo apt update && sudo apt upgrade` regular para parches del sistema operativo.
- Revise los dispositivos en la [consola de administración de Tailscale](https://login.tailscale.com/admin) periódicamente.

Comandos de verificación rápida:

```bash
# Confirm no public ports are listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely once Tailscale SSH is confirmed working
sudo systemctl disable --now ssh
```

## Notas sobre ARM

El nivel Always Free es ARM (`aarch64`). La mayoría de las funciones de OpenClaw funcionan bien; un pequeño número de binarios nativos necesita compilaciones ARM:

- Node.js, Telegram, WhatsApp (Baileys): JavaScript puro, sin problemas.
- La mayoría de los paquetes npm con código nativo: artefactos precompilados `linux-arm64` disponibles.
- Asistentes de CLI opcionales (por ejemplo, binarios Go/Rust enviados por habilidades): verifique si hay una versión `aarch64` / `linux-arm64` antes de instalar.

Verifique la arquitectura con `uname -m` (debería imprimir `aarch64`). Para binarios sin una compilación ARM, instálelos desde la fuente o omítalos.

## Persistencia y copias de seguridad

El estado de OpenClaw reside en:

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` por agente, estado del canal/proveedor y datos de sesión.
- `~/.openclaw/workspace/` — el espacio de trabajo del agente (SOUL.md, memoria, artefactos).

Estos sobreviven a los reinicios. Para tomar una instantánea portable:

```bash
openclaw backup create
```

## Alternativa: túnel SSH

Si Tailscale Serve no funciona, use un túnel SSH desde su máquina local:

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Luego abra `http://localhost:18789`.

## Solución de problemas

**Error en la creación de la instancia ("Sin capacidad")** -- Las instancias ARM del nivel gratuito son populares. Intente con un dominio de disponibilidad diferente o reintente fuera de las horas pico.

**Tailscale no se conectará** -- Ejecute `sudo tailscale up --ssh --hostname=openclaw --reset` para volver a autenticarse.

**El Gateway no se iniciará** -- Ejecute `openclaw doctor --non-interactive` y verifique los registros con `journalctl --user -u openclaw-gateway.service -n 50`.

**Problemas con binarios ARM** -- La mayoría de los paquetes de npm funcionan en ARM64. Para binarios nativos, busque lanzamientos `linux-arm64` o `aarch64`. Verifique la arquitectura con `uname -m`.

## Siguientes pasos

- [Canales](/es/channels) -- conecte Telegram, WhatsApp, Discord y más
- [Configuración del Gateway](/es/gateway/configuration) -- todas las opciones de configuración
- [Actualización](/es/install/updating) -- mantener OpenClaw actualizado

## Relacionado

- [Resumen de instalación](/es/install)
- [GCP](/es/install/gcp)
- [Alojamiento VPS](/es/vps)
