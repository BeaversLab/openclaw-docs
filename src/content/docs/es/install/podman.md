---
summary: "Ejecutar OpenClaw en un contenedor de Podman sin root"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

Ejecuta el OpenClaw Gateway en un contenedor rootless de Podman, gestionado por tu usuario no root actual.

El modelo previsto es:

- Podman ejecuta el contenedor del gateway.
- Tu `openclaw` CLI del host es el plano de control.
- El estado persistente reside en el host bajo `~/.openclaw` de forma predeterminada.
- La gestión día a día utiliza `openclaw --container <name> ...` en lugar de `sudo -u openclaw`, `podman exec` o un usuario de servicio separado.

## Requisitos previos

- **Podman** en modo rootless
- **OpenClaw CLI** instalado en el host
- **Opcional:** `systemd --user` si deseas el inicio automático gestionado por Quadlet
- **Opcional:** `sudo` solo si deseas `loginctl enable-linger "$(whoami)"` para la persistencia al arranque en un host headless

## Inicio rápido

<Steps>
  <Step title="Configuración única">
    Desde la raíz del repositorio, ejecuta `./scripts/podman/setup.sh`.
  </Step>

<Step title="Iniciar el contenedor del Gateway">Inicia el contenedor con `./scripts/run-openclaw-podman.sh launch`.</Step>

<Step title="Ejecutar el onboarding dentro del contenedor">Ejecuta `./scripts/run-openclaw-podman.sh launch setup`, luego abre `http://127.0.0.1:18789/`.</Step>

  <Step title="Gestionar el contenedor en ejecución desde el CLI del host">
    Establece `OPENCLAW_CONTAINER=openclaw`, luego usa los comandos normales de `openclaw` desde el host.
  </Step>
</Steps>

Detalles de la configuración:

- `./scripts/podman/setup.sh` construye `openclaw:local` en tu almacén rootless de Podman de forma predeterminada, o usa `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` si estableces uno.
- Crea `~/.openclaw/openclaw.json` con `gateway.mode: "local"` si falta.
- Crea `~/.openclaw/.env` con `OPENCLAW_GATEWAY_TOKEN` si falta.
- Para los lanzamientos manuales, el asistente lee solo una pequeña lista de permitidos (allowlist) de claves relacionadas con Podman desde `~/.openclaw/.env` y pasa variables de entorno de tiempo de ejecución explícitas al contenedor; no entrega el archivo de entorno completo a Podman.

Configuración gestionada por Quadlet:

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet es una opción solo para Linux porque depende de los servicios de usuario de systemd.

También puedes establecer `OPENCLAW_PODMAN_QUADLET=1`.

Variables de entorno de compilación/configuración opcionales:

- `OPENCLAW_IMAGE` o `OPENCLAW_PODMAN_IMAGE` -- usa una imagen existente/descargada en lugar de compilar `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- instala paquetes apt adicionales durante la compilación de la imagen
- `OPENCLAW_EXTENSIONS` -- preinstala las dependencias de los complementos en el momento de la compilación
- `OPENCLAW_INSTALL_BROWSER` -- preinstala Chromium y Xvfb para la automatización del navegador (establece en `1` para habilitar)

Inicio del contenedor:

```bash
./scripts/run-openclaw-podman.sh launch
```

El script inicia el contenedor con tu uid/gid actual usando `--userns=keep-id` y monta el estado de OpenClaw en el contenedor.

Incorporación:

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Luego abre `http://127.0.0.1:18789/` y usa el token de `~/.openclaw/.env`.

Predeterminado del CLI del host:

```bash
export OPENCLAW_CONTAINER=openclaw
```

Luego, comandos como estos se ejecutarán automáticamente dentro de ese contenedor:

```bash
openclaw dashboard --no-open
openclaw gateway status --deep   # includes extra service scan
openclaw doctor
openclaw channels login
```

En macOS, la máquina Podman puede hacer que el navegador parezca no local para la puerta de enlace.
Si la interfaz de usuario de control informa errores de autenticación de dispositivo después del inicio, usa la guía de Tailscale en
[Podman and Tailscale](#podman--tailscale).

<a id="podman--tailscale"></a>

## Podman y Tailscale

Para acceso HTTPS o acceso remoto desde el navegador, sigue la documentación principal de Tailscale.

Nota específica para Podman:

- Mantén el host de publicación de Podman en `127.0.0.1`.
- Prefiere `tailscale serve` administrado por el host en lugar de `openclaw gateway --tailscale serve`.
- En macOS, si el contexto de device-auth del navegador local no es fiable, usa el acceso de Tailscale en lugar de soluciones alternativas de túnel local ad hoc.

Ver:

- [Tailscale](/es/gateway/tailscale)
- [Control UI](/es/web/control-ui)

## Systemd (Quadlet, opcional)

Si ejecutaste `./scripts/podman/setup.sh --quadlet`, la instalación coloca un archivo Quadlet en:

```bash
~/.config/containers/systemd/openclaw.container
```

Comandos útiles:

- **Inicio:** `systemctl --user start openclaw.service`
- **Detener:** `systemctl --user stop openclaw.service`
- **Estado:** `systemctl --user status openclaw.service`
- **Registros:** `journalctl --user -u openclaw.service -f`

Después de editar el archivo Quadlet:

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

Para la persistencia al arranque en hosts SSH/headless, habilita el lingering (permanencia) para tu usuario actual:

```bash
sudo loginctl enable-linger "$(whoami)"
```

## Configuración, entorno y almacenamiento

- **Directorio de configuración:** `~/.openclaw`
- **Directorio de espacio de trabajo:** `~/.openclaw/workspace`
- **Archivo de token:** `~/.openclaw/.env`
- **Asistente de lanzamiento:** `./scripts/run-openclaw-podman.sh`

El script de lanzamiento y Quadlet montan el estado del host en el contenedor mediante bind-mount:

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

Por defecto, estos son directorios del host, no un estado anónimo del contenedor, por lo que
`openclaw.json`, estado `auth-profiles.json` por agente, estado del canal/proveedor,
sesiones y el espacio de trabajo sobreviven al reemplazo del contenedor.
La configuración de Podman también siembra `gateway.controlUi.allowedOrigins` para `127.0.0.1` y `localhost` en el puerto de la puerta de enlace publicado, para que el panel local funcione con el enlace de no bucle de retorno del contenedor.

Variables de entorno útiles para el iniciador manual:

- `OPENCLAW_PODMAN_CONTAINER` -- nombre del contenedor (`openclaw` por defecto)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- imagen a ejecutar
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- puerto del host mapeado al contenedor `18789`
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- puerto del host mapeado al contenedor `18790`
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- interfaz del host para los puertos publicados; el valor predeterminado es `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- modo de enlace de la puerta de enlace dentro del contenedor; el valor predeterminado es `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (predeterminado), `auto`, o `host`

El iniciador manual lee `~/.openclaw/.env` antes de finalizar los valores predeterminados del contenedor/imagen, por lo que puede persistirlos allí.

Si utiliza un `OPENCLAW_CONFIG_DIR` o `OPENCLAW_WORKSPACE_DIR` no predeterminado, establezca las mismas variables tanto para `./scripts/podman/setup.sh` como para los comandos `./scripts/run-openclaw-podman.sh launch` posteriores. El iniciador local del repositorio no persiste las anulaciones de ruta personalizada entre shells.

Nota sobre Quadlet:

- El servicio Quadlet generado mantiene intencionalmente una forma predeterminada fija y endurecida: `127.0.0.1` puertos publicados, `--bind lan` dentro del contenedor y `keep-id` espacio de nombres de usuario.
- Fija `OPENCLAW_NO_RESPAWN=1`, `Restart=on-failure` y `TimeoutStartSec=300`.
- Publica tanto `127.0.0.1:18789:18789` (puerta de enlace) como `127.0.0.1:18790:18790` (puente).
- Lee `~/.openclaw/.env` como un `EnvironmentFile` en tiempo de ejecución para valores como `OPENCLAW_GATEWAY_TOKEN`, pero no consume la lista de permitidos de anulación específica de Podman del iniciador manual.
- Si necesita puertos de publicación personalizados, host de publicación u otras marcas de ejecución de contenedor, use el iniciador manual o edite `~/.config/containers/systemd/openclaw.container` directamente, luego recargue y reinicie el servicio.

## Comandos útiles

- **Registros del contenedor:** `podman logs -f openclaw`
- **Detener contenedor:** `podman stop openclaw`
- **Eliminar contenedor:** `podman rm -f openclaw`
- **Abrir la URL del panel desde la CLI del host:** `openclaw dashboard --no-open`
- **Estado/salud a través de la CLI del host:** `openclaw gateway status --deep` (sondeo RPC + escaneo
  de servicio adicional)

## Solución de problemas

- **Permiso denegado (EACCES) en la configuración o el espacio de trabajo:** El contenedor se ejecuta con `--userns=keep-id` y `--user <your uid>:<your gid>` de manera predeterminada. Asegúrese de que las rutas de configuración/espacio de trabajo del host sean propiedad de su usuario actual.
- **Inicio de la puerta de enlace bloqueado (falta `gateway.mode=local`):** Asegúrese de que `~/.openclaw/openclaw.json` exista y establezca `gateway.mode="local"`. `scripts/podman/setup.sh` lo crea si falta.
- **Los comandos de CLI del contenedor alcanzan el objetivo incorrecto:** Use `openclaw --container <name> ...` explícitamente, o exporte `OPENCLAW_CONTAINER=<name>` en su shell.
- **`openclaw update` falla con `--container`:** Esperado. Reconstruya/extraiga la imagen y luego reinicie el contenedor o el servicio Quadlet.
- **El servicio Quadlet no se inicia:** Ejecute `systemctl --user daemon-reload` y luego `systemctl --user start openclaw.service`. En sistemas sin cabeza, es posible que también necesite `sudo loginctl enable-linger "$(whoami)"`.
- **SELinux bloquea los montajes de enlace:** Deje el comportamiento de montaje predeterminado como está; el iniciador agrega automáticamente `:Z` en Linux cuando SELinux está en modo de aplicación o permisión.

## Relacionado

- [Docker](/es/install/docker)
- [Proceso en segundo plano de la puerta de enlace](/es/gateway/background-process)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)
