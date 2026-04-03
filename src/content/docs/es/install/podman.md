---
summary: "Ejecutar OpenClaw en un contenedor rootless de Podman"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Ejecutar OpenClaw Gateway en un contenedor rootless de Podman, gestionado por su usuario actual sin privilegios de root.

El modelo previsto es:

- Podman ejecuta el contenedor de gateway.
- Su `openclaw` CLI en el host es el plano de control.
- El estado persistente reside en el host bajo `~/.openclaw` de forma predeterminada.
- La gestión día a día utiliza `openclaw --container <name> ...` en lugar de `sudo -u openclaw`, `podman exec` o un usuario de servicio separado.

## Requisitos previos

- **Podman** en modo rootless
- **CLI de OpenClaw** instalado en el host
- **Opcional:** `systemd --user` si desea un inicio automático gestionado por Quadlet
- **Opcional:** `sudo` solo si desea `loginctl enable-linger "$(whoami)"` para la persistencia al arranque en un host headless

## Inicio rápido

<Steps>
  <Step title="Configuración única">
    Desde la raíz del repositorio, ejecute `./scripts/podman/setup.sh`.
  </Step>

<Step title="Iniciar el contenedor Gateway">Inicie el contenedor con `./scripts/run-openclaw-podman.sh launch`.</Step>

<Step title="Ejecutar la incorporación dentro del contenedor">Ejecute `./scripts/run-openclaw-podman.sh launch setup`, luego abra `http://127.0.0.1:18789/`.</Step>

  <Step title="Gestionar el contenedor en ejecución desde la CLI del host">
    Establezca `OPENCLAW_CONTAINER=openclaw`, luego use comandos normales de `openclaw` desde el host.
  </Step>
</Steps>

Detalles de la configuración:

- `./scripts/podman/setup.sh` construye `openclaw:local` en su almacén rootless de Podman de forma predeterminada, o usa `OPENCLAW_IMAGE` / `OPENCLAW_PODMAN_IMAGE` si establece uno.
- Crea `~/.openclaw/openclaw.json` con `gateway.mode: "local"` si falta.
- Crea `~/.openclaw/.env` con `OPENCLAW_GATEWAY_TOKEN` si falta.
- Para lanzamientos manuales, el asistente lee solo una pequeña lista blanca de claves relacionadas con Podman desde `~/.openclaw/.env` y pasa variables de entorno de ejecución explícitas al contenedor; no entrega el archivo de entorno completo a Podman.

Configuración gestionada por Quadlet:

```bash
./scripts/podman/setup.sh --quadlet
```

Quadlet es una opción solo para Linux porque depende de los servicios de usuario de systemd.

También puede establecer `OPENCLAW_PODMAN_QUADLET=1`.

Variables de entorno de compilación/configuración opcionales:

- `OPENCLAW_IMAGE` o `OPENCLAW_PODMAN_IMAGE` -- use una imagen existente/obtenida en lugar de compilar `openclaw:local`
- `OPENCLAW_DOCKER_APT_PACKAGES` -- instale paquetes apt adicionales durante la compilación de la imagen
- `OPENCLAW_EXTENSIONS` -- preinstale las dependencias de las extensiones en el momento de la compilación

Inicio del contenedor:

```bash
./scripts/run-openclaw-podman.sh launch
```

El script inicia el contenedor como su uid/gid actual con `--userns=keep-id` y monta el estado de OpenClaw mediante bind-mount en el contenedor.

Incorporación:

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Luego abra `http://127.0.0.1:18789/` y use el token de `~/.openclaw/.env`.

Predeterminado del CLI del host:

```bash
export OPENCLAW_CONTAINER=openclaw
```

Luego, comandos como estos se ejecutarán automáticamente dentro de ese contenedor:

```bash
openclaw dashboard --no-open
openclaw gateway status --deep
openclaw doctor
openclaw channels login
```

En macOS, Podman machine puede hacer que el navegador aparezca como no local para la puerta de enlace.
Si la Interfaz de Control informa errores de autenticación de dispositivo después del lanzamiento, prefiera el flujo del túnel SSH en [macOS Podman SSH tunnel](#macos-podman-ssh-tunnel). Para
el acceso HTTPS remoto, use la guía de Tailscale en
[Podman + Tailscale](#podman--tailscale).

## Túnel SSH de Podman en macOS

En macOS, Podman machine puede hacer que el navegador aparezca como no local para la puerta de enlace incluso cuando el puerto publicado está solo en `127.0.0.1`.

Para el acceso del navegador local, use un túnel SSH hacia la VM de Podman y abra el puerto localhost del túnel en su lugar.

Puerto de túnel local recomendado:

- `28889` en el host Mac
- reenviado a `127.0.0.1:18789` dentro de la VM de Podman

Inicie el túnel en una terminal separada:

```bash
ssh -N \
  -i ~/.local/share/containers/podman/machine/machine \
  -p <podman-vm-ssh-port> \
  -L 28889:127.0.0.1:18789 \
  core@127.0.0.1
```

En ese comando, `<podman-vm-ssh-port>` es el puerto SSH de la VM de Podman en el host Mac. Verifique su valor actual con:

```bash
podman system connection list
```

Permita el origen del navegador en túnel una vez. Esto es necesario la primera vez que usa el túnel porque el lanzador puede presembrar el puerto publicado por Podman, pero no puede inferir su puerto de túnel del navegador elegido:

```bash
OPENCLAW_CONTAINER=openclaw openclaw config set gateway.controlUi.allowedOrigins \
  '["http://127.0.0.1:18789","http://localhost:18789","http://127.0.0.1:28889","http://localhost:28889"]' \
  --strict-json
podman restart openclaw
```

Ese es un paso único para el túnel `28889` predeterminado.

Luego abra:

```text
http://127.0.0.1:28889/
```

Notas:

- `18789` generalmente ya está ocupado en el host Mac por el puerto de puerta de enlace publicado por Podman, por lo que el túnel usa `28889` como puerto del navegador local.
- Si la interfaz de usuario solicita aprobación de emparejamiento, prefiera comandos explícitos dirigidos al contenedor o comandos de URL explícitos para que la CLI del host no recurra a archivos de emparejamiento local:

```bash
openclaw --container openclaw devices list
openclaw --container openclaw devices approve --latest
```

- Forma equivalente de URL explícita:

```bash
openclaw devices list \
  --url ws://127.0.0.1:28889 \
  --token "$(sed -n 's/^OPENCLAW_GATEWAY_TOKEN=//p' ~/.openclaw/.env | head -n1)"
```

<a id="podman--tailscale"></a>

## Podman + Tailscale

Para acceso HTTPS o navegador remoto, siga la documentación principal de Tailscale.

Nota específica de Podman:

- Mantenga el host de publicación de Podman en `127.0.0.1`.
- Prefiera `tailscale serve` administrado por el host en lugar de `openclaw gateway --tailscale serve`.
- Para el acceso del navegador local macOS sin HTTPS, prefiera la sección de túnel SSH anterior.

Ver:

- [Tailscale](/en/gateway/tailscale)
- [Interfaz de control](/en/web/control-ui)

## Systemd (Quadlet, opcional)

Si ejecutó `./scripts/podman/setup.sh --quadlet`, la configuración instala un archivo Quadlet en:

```bash
~/.config/containers/systemd/openclaw.container
```

Comandos útiles:

- **Iniciar:** `systemctl --user start openclaw.service`
- **Detener:** `systemctl --user stop openclaw.service`
- **Estado:** `systemctl --user status openclaw.service`
- **Registros:** `journalctl --user -u openclaw.service -f`

Después de editar el archivo Quadlet:

```bash
systemctl --user daemon-reload
systemctl --user restart openclaw.service
```

Para la persistencia al arranque en hosts SSH/sin cabeza, habilite el persistencia (lingering) para su usuario actual:

```bash
sudo loginctl enable-linger "$(whoami)"
```

## Configuración, entorno y almacenamiento

- **Directorio de configuración:** `~/.openclaw`
- **Directorio de espacio de trabajo:** `~/.openclaw/workspace`
- **Archivo de token:** `~/.openclaw/.env`
- **Asistente de inicio:** `./scripts/run-openclaw-podman.sh`

El script de inicio y Quadlet montan el estado del host en el contenedor:

- `OPENCLAW_CONFIG_DIR` -> `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR` -> `/home/node/.openclaw/workspace`

De forma predeterminada, estos son directorios del host, no estado de contenedor anónimo, por lo que la configuración y el espacio de trabajo sobreviven al reemplazo del contenedor.
La configuración de Podman también inicializa `gateway.controlUi.allowedOrigins` para `127.0.0.1` y `localhost` en el puerto de puerta de enlace publicado para que el tablero local funcione con el enlace no loopback del contenedor.

Variables de entorno útiles para el iniciador manual:

- `OPENCLAW_PODMAN_CONTAINER` -- nombre del contenedor (`openclaw` por defecto)
- `OPENCLAW_PODMAN_IMAGE` / `OPENCLAW_IMAGE` -- imagen a ejecutar
- `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` -- puerto del host mapeado al contenedor `18789`
- `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` -- puerto del host mapeado al contenedor `18790`
- `OPENCLAW_PODMAN_PUBLISH_HOST` -- interfaz del host para los puertos publicados; el valor predeterminado es `127.0.0.1`
- `OPENCLAW_GATEWAY_BIND` -- modo de enlace de la pasarela dentro del contenedor; el valor predeterminado es `lan`
- `OPENCLAW_PODMAN_USERNS` -- `keep-id` (predeterminado), `auto`, o `host`

El lanzador manual lee `~/.openclaw/.env` antes de finalizar los valores predeterminados del contenedor/imagen, por lo que puede persistirlos allí.

Si utiliza un `OPENCLAW_CONFIG_DIR` o `OPENCLAW_WORKSPACE_DIR` no predeterminado, establezca las mismas variables tanto para `./scripts/podman/setup.sh` como para los comandos `./scripts/run-openclaw-podman.sh launch` posteriores. El lanzador local del repositorio no persiste las anulaciones de ruta personalizadas entre shells.

Nota sobre Quadlet:

- El servicio Quadlet generado mantiene intencionalmente una forma predeterminada fija y endurecida: puertos publicados `127.0.0.1`, `--bind lan` dentro del contenedor y espacio de nombres de usuario `keep-id`.
- Todavía lee `~/.openclaw/.env` para el entorno de ejecución de la pasarela, como `OPENCLAW_GATEWAY_TOKEN`, pero no consume la lista de permitidos de anulación específica de Podman del lanzador manual.
- Si necesita puertos de publicación personalizados, host de publicación u otros indicadores de ejecución del contenedor, use el lanzador manual o edite `~/.config/containers/systemd/openclaw.container` directamente, luego recargue y reinicie el servicio.

## Comandos útiles

- **Registros del contenedor:** `podman logs -f openclaw`
- **Detener contenedor:** `podman stop openclaw`
- **Eliminar contenedor:** `podman rm -f openclaw`
- **Abrir URL del panel desde la CLI del host:** `openclaw dashboard --no-open`
- **Salud/estado a través de la CLI del host:** `openclaw gateway status --deep`

## Solución de problemas

- **Permission denied (EACCES) en configuración o espacio de trabajo:** El contenedor se ejecuta con `--userns=keep-id` y `--user <your uid>:<your gid>` de forma predeterminada. Asegúrese de que las rutas de configuración/espacio de trabajo del host sean propiedad de su usuario actual.
- **Inicio de Gateway bloqueado (falta `gateway.mode=local`):** Asegúrese de que `~/.openclaw/openclaw.json` exista y establezca `gateway.mode="local"`. `scripts/podman/setup.sh` crea esto si falta.
- **Los comandos de CLI del contenedor alcanzan el objetivo incorrecto:** Use `openclaw --container <name> ...` explícitamente, o exporte `OPENCLAW_CONTAINER=<name>` en su shell.
- **`openclaw update` falla con `--container`:** Es esperado. Reconstruya/pull de la imagen, luego reinicie el contenedor o el servicio Quadlet.
- **El servicio Quadlet no se inicia:** Ejecute `systemctl --user daemon-reload`, luego `systemctl --user start openclaw.service`. En sistemas sin headless también puede necesitar `sudo loginctl enable-linger "$(whoami)"`.
- **SELinux bloquea los montajes de enlace:** Deje el comportamiento de montaje predeterminado solo; el iniciador auto-agrega `:Z` en Linux cuando SELinux está aplicando o es permisivo.

## Relacionado

- [Docker](/en/install/docker)
- [Proceso en segundo plano de Gateway](/en/gateway/background-process)
- [Solución de problemas de Gateway](/en/gateway/troubleshooting)
