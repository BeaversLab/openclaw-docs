---
summary: "Ejecutar OpenClaw en un contenedor rootless de Podman"
read_when:
  - You want a containerized gateway with Podman instead of Docker
title: "Podman"
---

# Podman

Ejecute OpenClaw Gateway en un contenedor de Podman **sin privilegios de root**. Usa la misma imagen que Docker (construida desde el [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) del repositorio).

## Requisitos previos

- **Podman** (modo sin privilegios de root)
- Acceso a **sudo** para la configuración única (crear el usuario dedicado y construir la imagen)

## Inicio rápido

<Steps>
  <Step title="Configuración única">
    Desde la raíz del repositorio, ejecute el script de configuración. Crea un usuario dedicado `openclaw`, construye la imagen del contenedor e instala el script de lanzamiento:

    ```bash
    ./scripts/podman/setup.sh
    ```

    Esto también crea una configuración mínima en `~openclaw/.openclaw/openclaw.json` (establece `gateway.mode` en `"local"`) para que el Gateway pueda iniciarse sin ejecutar el asistente.

    De forma predeterminada, el contenedor **no** se instala como un servicio systemd: lo iniciará manualmente en el siguiente paso. Para una configuración de estilo de producción con inicio automático y reinicios, pase `--quadlet` en su lugar:

    ```bash
    ./scripts/podman/setup.sh --quadlet
    ```

    (O configure `OPENCLAW_PODMAN_QUADLET=1`. Use `--container` para instalar solo el contenedor y el script de lanzamiento).

    **Variables de entorno de compilación opcionales** (establecer antes de ejecutar `scripts/podman/setup.sh`):

    - `OPENCLAW_DOCKER_APT_PACKAGES` -- instala paquetes apt adicionales durante la compilación de la imagen.
    - `OPENCLAW_EXTENSIONS` -- preinstala las dependencias de las extensiones (nombres separados por espacios, p. ej., `diagnostics-otel matrix`).

  </Step>

  <Step title="Iniciar el Gateway">
    Para un inicio manual rápido:

    ```bash
    ./scripts/run-openclaw-podman.sh launch
    ```

  </Step>

  <Step title="Ejecutar el asistente de incorporación">
    Para agregar canales o proveedores de forma interactiva:

    ```bash
    ./scripts/run-openclaw-podman.sh launch setup
    ```

    Luego abra `http://127.0.0.1:18789/` y use el token de `~openclaw/.openclaw/.env` (o el valor impreso por la configuración).

  </Step>
</Steps>

## Systemd (Quadlet, opcional)

Si ejecutó `./scripts/podman/setup.sh --quadlet` (o `OPENCLAW_PODMAN_QUADLET=1`), se instala una unidad de [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) para que el gateway se ejecute como un servicio de usuario de systemd para el usuario openclaw. El servicio está habilitado y se inicia al final de la configuración.

- **Inicio:** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **Detener:** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **Estado:** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **Registros:** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

El archivo quadlet se encuentra en `~openclaw/.config/containers/systemd/openclaw.container`. Para cambiar los puertos o las variables de entorno, edite ese archivo (o el `.env` que fuente), luego `sudo systemctl --machine openclaw@ --user daemon-reload` y reinicie el servicio. En el arranque, el servicio se inicia automáticamente si el lingering está habilitado para openclaw (la configuración hace esto cuando loginctl está disponible).

Para agregar quadlet **después** de una configuración inicial que no lo usó, vuelva a ejecutar: `./scripts/podman/setup.sh --quadlet`.

## El usuario openclaw (sin inicio de sesión)

`scripts/podman/setup.sh` crea un usuario de sistema dedicado `openclaw`:

- **Shell:** `nologin` — sin inicio de sesión interactivo; reduce la superficie de ataque.
- **Inicio:** p. ej. `/home/openclaw` — contiene `~/.openclaw` (configuración, espacio de trabajo) y el script de lanzamiento `run-openclaw-podman.sh`.
- **Podman sin root:** El usuario debe tener un rango **subuid** y **subgid**. Muchas distribuciones los asignan automáticamente cuando se crea el usuario. Si la configuración imprime una advertencia, agregue líneas a `/etc/subuid` y `/etc/subgid`:

  ```text
  openclaw:100000:65536
  ```

  Luego inicie la puerta de enlace como ese usuario (p. ej. desde cron o systemd):

  ```bash
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh
  sudo -u openclaw /home/openclaw/run-openclaw-podman.sh setup
  ```

- **Configuración:** Solo `openclaw` y root pueden acceder a `/home/openclaw/.openclaw`. Para editar la configuración: use la interfaz de usuario de Control una vez que la puerta de enlace se esté ejecutando, o `sudo -u openclaw $EDITOR /home/openclaw/.openclaw/openclaw.json`.

## Entorno y configuración

- **Token:** Almacenado en `~openclaw/.openclaw/.env` como `OPENCLAW_GATEWAY_TOKEN`. `scripts/podman/setup.sh` y `run-openclaw-podman.sh` lo generan si falta (usa `openssl`, `python3`, o `od`).
- **Opcional:** En ese `.env` puede establecer claves de proveedor (p. ej. `GROQ_API_KEY`, `OLLAMA_API_KEY`) y otras variables de entorno de OpenClaw.
- **Puertos del host:** De forma predeterminada, el script asigna `18789` (puerta de enlace) y `18790` (puente). Anule la asignación de puertos del **host** con `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` y `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` al lanzar.
- **Enlace de puerta de enlace:** De forma predeterminada, `run-openclaw-podman.sh` inicia la puerta de enlace con `--bind loopback` para un acceso local seguro. Para exponer en la red de área local (LAN), establezca `OPENCLAW_GATEWAY_BIND=lan` y configure `gateway.controlUi.allowedOrigins` (o habilite explícitamente el respaldo de encabezado de host) en `openclaw.json`.
- **Rutas:** La configuración y el espacio de trabajo del host tienen como valor predeterminado `~openclaw/.openclaw` y `~openclaw/.openclaw/workspace`. Sobrescriba las rutas del host utilizadas por el script de inicio con `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR`.

## Modelo de almacenamiento

- **Datos persistentes del host:** `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR` se montan con bind (montaje de vinculación) en el contenedor y retienen el estado en el host.
- **Sandbox efímero tmpfs:** si habilita `agents.defaults.sandbox`, los contenedores del sandbox de herramientas montan `tmpfs` en `/tmp`, `/var/tmp` y `/run`. Esas rutas están respaldadas en memoria y desaparecen con el contenedor del sandbox; la configuración del contenedor Podman de nivel superior no añade sus propios montajes tmpfs.
- **Puntos calientes de crecimiento del disco:** las rutas principales a vigilar son `media/`, `agents/<agentId>/sessions/sessions.json`, archivos JSONL de transcripción, `cron/runs/*.jsonl` y registros de archivos rotativos bajo `/tmp/openclaw/` (o su `logging.file` configurado).

`scripts/podman/setup.sh` ahora prepara el tar de la imagen en un directorio temporal privado e imprime el directorio base elegido durante la configuración. Para ejecuciones sin root, acepta `TMPDIR` solo cuando esa base sea segura de usar; de lo contrario, recurre a `/var/tmp` y luego a `/tmp`. El tar guardado permanece solo para el propietario y se transmite al `podman load` del usuario objetivo, por lo que los directorios temporales privados de quien llama no bloquean la configuración.

## Comandos útiles

- **Registros:** Con quadlet: `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`. Con script: `sudo -u openclaw podman logs -f openclaw`
- **Detener:** Con quadlet: `sudo systemctl --machine openclaw@ --user stop openclaw.service`. Con script: `sudo -u openclaw podman stop openclaw`
- **Iniciar de nuevo:** Con quadlet: `sudo systemctl --machine openclaw@ --user start openclaw.service`. Con script: vuelve a ejecutar el script de inicio o `podman start openclaw`
- **Eliminar contenedor:** `sudo -u openclaw podman rm -f openclaw` — la configuración y el espacio de trabajo en el host se mantienen

## Solución de problemas

- **Permiso denegado (EACCES) en config o auth-profiles:** El contenedor usa por defecto `--userns=keep-id` y se ejecuta con el mismo uid/gid que el usuario del host que ejecuta el script. Asegúrese de que su host `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR` sean propiedad de ese usuario.
- **Inicio del Gateway bloqueado (falta `gateway.mode=local`):** Asegúrese de que `~openclaw/.openclaw/openclaw.json` exista y establezca `gateway.mode="local"`. `scripts/podman/setup.sh` crea este archivo si falta.
- **Podman sin root falla para el usuario openclaw:** Compruebe que `/etc/subuid` y `/etc/subgid` contienen una línea para `openclaw` (ej. `openclaw:100000:65536`). Añádala si falta y reinicie.
- **Nombre de contenedor en uso:** El script de inicio usa `podman run --replace`, por lo que el contenedor existente se reemplaza al iniciar de nuevo. Para limpiar manualmente: `podman rm -f openclaw`.
- **Script no encontrado al ejecutarse como openclaw:** Asegúrese de que se haya ejecutado `scripts/podman/setup.sh` para que `run-openclaw-podman.sh` se copie al home de openclaw (ej. `/home/openclaw/run-openclaw-podman.sh`).
- **Servicio Quadlet no encontrado o falla al iniciar:** Ejecute `sudo systemctl --machine openclaw@ --user daemon-reload` después de editar el archivo `.container`. Quadlet requiere cgroups v2: `podman info --format '{{.Host.CgroupsVersion}}'` debería mostrar `2`.

## Opcional: ejecutar como su propio usuario

Para ejecutar la pasarela como tu usuario normal (sin usuario dedicado openclaw): crea la imagen, crea `~/.openclaw/.env` con `OPENCLAW_GATEWAY_TOKEN`, y ejecuta el contenedor con `--userns=keep-id` y montajes a tu `~/.openclaw`. El script de lanzamiento está diseñado para el flujo de usuario openclaw; para una configuración de usuario único puedes ejecutar el comando `podman run` del script manualmente, apuntando la configuración y el espacio de trabajo a tu hogar. Recomendado para la mayoría de usuarios: usa `scripts/podman/setup.sh` y ejecuta como el usuario openclaw para que la configuración y el proceso estén aislados.

import es from "/components/footer/es.mdx";

<es />
