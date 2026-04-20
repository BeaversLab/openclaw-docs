---
summary: "Ejecutar OpenClaw en un contenedor de Podman sin root"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Ejecutar OpenClaw Gateway en un contenedor rootless de Podman, gestionado por su usuario actual sin privilegios de root.

El modelo previsto es:

- Podman ejecuta el contenedor de gateway.
- La `openclaw` CLI de su host es el plano de control.
- El estado persistente reside en el host bajo `~/.openclaw` de forma predeterminada.
- La gestión diaria utiliza `openclaw --container <name> ...` en lugar de `sudo -u openclaw`, `podman exec` o un usuario de servicio separado.

## Requisitos previos

- **Podman** en modo rootless
- **CLI de OpenClaw** instalado en el host
- **Opcional:** `systemd --user` si desea autoinicio gestionado por Quadlet
- **Opcional:** `sudo` solo si desea `loginctl enable-linger "$(whoami)"` para la persistencia al arranque en un host sin interfaz gráfica

## Inicio rápido

<Steps>
  <Step title="Configuración única">
    Desde la raíz del repositorio, ejecute `./scripts/podman/setup.sh`.
  </Step>

<Step title="Iniciar el contenedor Gateway">Inicie el contenedor con `./scripts/run-openclaw-podman.sh launch`.</Step>

<Step title="Ejecutar el onboarding dentro del contenedor">Ejecute `./scripts/run-openclaw-podman.sh launch setup`, luego abra `http://127.0.0.1:18789/`.</Step>

  <Step title="Gestionar el contenedor en ejecución desde la CLI del host">
    Establezca `OPENCLAW_CONTAINER=openclaw`, luego use comandos normales de `openclaw` desde el host.
  </Step>
</Steps>

Detalles de la configuración:

- `./scripts/podman/setup.sh` construye `openclaw:local` en su almacén de Podman sin root de forma predeterminada, o usa `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` si establece uno.
- Crea `~/.openclaw/openclaw.json` con `gateway.mode: "local"` si falta.
- Crea `~/.openclaw/.env` con `OPENCLAW_GATEWAY_TOKEN` si falta.
- Para lanzamientos manuales, el asistente lee solo una pequeña lista de permitidos de claves relacionadas con Podman desde `~/.openclaw/.env` y pasa variables de entorno de ejecución explícitas al contenedor; no entrega el archivo de entorno completo a Podman.

Configuración gestionada por Quadlet:

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet es una opción solo para Linux porque depende de los servicios de usuario de systemd.

También puede establecer `OPENCLAW_PODMAN_QUADLET=1`.

Variables de entorno de compilación/configuración opcionales:

- `OPENCLAW_IMAGE` o `OPENCLAW_PODMAN_IMAGE` -- use una imagen existente/descargada en lugar de compilar `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- instala paquetes apt adicionales durante la compilación de la imagen
- `OPENCLAW_EXTENSIONS` -- preinstala las dependencias de las extensiones en tiempo de compilación

Inicio del contenedor:

```bash
./scripts/run-openclaw-podman.sh launch
```

El script inicia el contenedor como tu uid/gid actual con `--userns=keep-id` y monta el estado de OpenClaw en el contenedor mediante bind-mount.

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

En macOS, Podman machine puede hacer que el navegador aparezca como no local para la puerta de enlace.
Si la interfaz de usuario de control (Control UI) informa errores de device-auth después del lanzamiento, usa la guía de Tailscale en
[Podman + Tailscale](#podman--tailscale).

<a id="podman--tailscale"></a>

## Podman + Tailscale

Para acceso HTTPS o acceso remoto desde el navegador, sigue la documentación principal de Tailscale.

Nota específica para Podman:

- Mantén el host de publicación de Podman en `127.0.0.1`.
- Prefiere `tailscale serve` gestionado por el host sobre `openclaw gateway --tailscale serve`.
- En macOS, si el contexto de device-auth del navegador local no es fiable, usa el acceso de Tailscale en lugar de soluciones alternativas de túnel local ad hoc.

Ver:

- [Tailscale](/es/gateway/tailscale)
- [Interfaz de usuario de control](/es/web/control-ui)

## Systemd (Quadlet, opcional)

Si ejecutaste `./scripts/podman/setup.sh --quadlet`, la instalación (setup) coloca un archivo Quadlet en:

```bash
~/.config/containers/systemd/openclaw.container
```

Comandos útiles:

- **Iniciar:** `systemctl --user start openclaw.service`
- **Detener:** `systemctl --user stop openclaw.service`
- **Estado:** `systemctl --user status openclaw.service`
- **Registros (Logs):** `journalctl --user -u openclaw.service -f`

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

De forma predeterminada, estos son directorios del host, no un estado de contenedor anónimo, por lo que `openclaw.json`, estado `auth-profiles.json` por agente, estado de canal/proveedor,
sesiones y el espacio de trabajo sobreviven al reemplazo del contenedor.
La configuración de Podman también inicializa `gateway.controlUi.allowedOrigins` para `127.0.0.1` y `localhost` en el puerto de puerta de enlace publicado, para que el panel local funcione con el enlace no de bucle local del contenedor.

Variables de entorno útiles para el iniciador manual:

- `OPENCLAW_PODMAN_CONTAINER` -- nombre del contenedor (`openclaw` de forma predeterminada)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- imagen a ejecutar
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- puerto del host mapeado al contenedor `18789`
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- puerto del host mapeado al contenedor `18790`
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- interfaz del host para los puertos publicados; el valor predeterminado es `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- modo de enlace de la puerta de enlace dentro del contenedor; el valor predeterminado es `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (predeterminado), `auto` o `host`

El iniciador manual lee `~/.openclaw/.env` antes de finalizar los valores predeterminados del contenedor/imagen, por lo que puede conservarlos allí.

Si utiliza un `OPENCLAW_CONFIG_DIR` o un `OPENCLAW_WORKSPACE_DIR` no predeterminado, establezca las mismas variables para ambos comandos `./scripts/podman/setup.sh` y `./scripts/run-openclaw-podman.sh launch` posteriores. El iniciador local del repositorio no conserva las anulaciones de ruta personalizada entre shells.

Nota sobre Quadlet:

- El servicio Quadlet generado mantiene intencionalmente una forma predeterminada fija y endurecida: puertos publicados `127.0.0.1`, `--bind lan` dentro del contenedor y espacio de nombres de usuario `keep-id`.
- Fija `OPENCLAW_NO_RESPAWN=1`, `Restart=on-failure` y `TimeoutStartSec=300`.
- Publica tanto `127.0.0.1:18789:18789` (puerta de enlace) como `127.0.0.1:18790:18790` (puente).
- Lee `~/.openclaw/.env` como un `EnvironmentFile` en tiempo de ejecución para valores como `OPENCLAW_GATEWAY_TOKEN`, pero no consume la lista de permitidos de anulación específica de Podman del lanzador manual.
- Si necesitas puertos de publicación personalizados, host de publicación u otras opciones de ejecución del contenedor, usa el lanzador manual o edita `~/.config/containers/systemd/openclaw.container` directamente, luego recarga y reinicia el servicio.

## Comandos útiles

- **Registros del contenedor:** `podman logs -f openclaw`
- **Detener contenedor:** `podman stop openclaw`
- **Eliminar contenedor:** `podman rm -f openclaw`
- **Abrir URL del panel desde la CLI del host:** `openclaw dashboard --no-open`
- **Estado/salud a través de la CLI del host:** `openclaw gateway status --deep` (sondeo RPC + escaneo de servicio adicional)

## Solución de problemas

- **Permiso denegado (EACCES) en la configuración o el espacio de trabajo:** El contenedor se ejecuta con `--userns=keep-id` y `--user <your uid>:<your gid>` de forma predeterminada. Asegúrate de que las rutas de configuración/espacio de trabajo del host sean propiedad de tu usuario actual.
- **Inicio de la puerta de enlace bloqueado (falta `gateway.mode=local`):** Asegúrate de que `~/.openclaw/openclaw.json` exista y establezca `gateway.mode="local"`. `scripts/podman/setup.sh` crea esto si falta.
- **Los comandos de la CLI del contenedor alcanzan el objetivo incorrecto:** Usa `openclaw --container <name> ...` explícitamente, o exporta `OPENCLAW_CONTAINER=<name>` en tu shell.
- **`openclaw update` falla con `--container`:** Esperado. Reconstruye/pull la imagen, luego reinicia el contenedor o el servicio Quadlet.
- **El servicio Quadlet no se inicia:** Ejecuta `systemctl --user daemon-reload`, luego `systemctl --user start openclaw.service`. En sistemas sin cabeza es posible que también necesites `sudo loginctl enable-linger "$(whoami)"`.
- **SELinux bloquea los montajes de bind:** Deja el comportamiento de montaje predeterminado solo; el lanzador agrega automáticamente `:Z` en Linux cuando SELinux está aplicando o es permisivo.

## Relacionado

- [Docker](/es/install/docker)
- [Proceso en segundo plano de la puerta de enlace](/es/gateway/background-process)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)
