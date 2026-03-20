---
summary: "Ejecute OpenClaw en un contenedor Podman sin privilegios de root"
read_when:
  - Desea una puerta de enlace en contenedor con Podman en lugar de Docker
title: "Podman"
---

# Podman

Ejecute la puerta de enlace OpenClaw en un contenedor Podman **sin privilegios de root** (rootless). Utiliza la misma imagen que Docker (construya desde el [Dockerfile](https://github.com/openclaw/openclaw/blob/main/Dockerfile) del repositorio).

## Requisitos

- Podman (rootless)
- Sudo para la configuración de una sola vez (crear usuario, construir imagen)

## Inicio rápido

**1. Configuración única** (desde la raíz del repositorio; crea el usuario, construye la imagen, instala el script de lanzamiento):

```bash
./setup-podman.sh
```

Esto también crea un `~openclaw/.openclaw/openclaw.json` mínimo (establece `gateway.mode="local"`) para que la puerta de enlace pueda iniciarse sin ejecutar el asistente.

Por defecto, el contenedor **no** se instala como un servicio systemd, lo inicias manualmente (ver más abajo). Para una configuración estilo producción con inicio automático y reinicios, instálelo en su lugar como un servicio de usuario systemd Quadlet:

```bash
./setup-podman.sh --quadlet
```

(O establezca `OPENCLAW_PODMAN_QUADLET=1`; use `--container` para instalar solo el contenedor y el script de lanzamiento).

Variables de entorno de tiempo de compilación opcionales (establézcalas antes de ejecutar `setup-podman.sh`):

- `OPENCLAW_DOCKER_APT_PACKAGES` — instalar paquetes apt adicionales durante la compilación de la imagen
- `OPENCLAW_EXTENSIONS` — preinstalar dependencias de extensiones (nombres de extensiones separados por espacios, p. ej. `diagnostics-otel matrix`)

**2. Iniciar gateway** (manual, para pruebas rápidas de humo):

```bash
./scripts/run-openclaw-podman.sh launch
```

**3. Asistente de incorporación** (ej. para agregar canales o proveedores):

```bash
./scripts/run-openclaw-podman.sh launch setup
```

Luego abra `http://127.0.0.1:18789/` y use el token de `~openclaw/.openclaw/.env` (o el valor impreso por la configuración).

## Systemd (Quadlet, opcional)

Si ejecutó `./setup-podman.sh --quadlet` (o `OPENCLAW_PODMAN_QUADLET=1`), se instala una unidad [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html) para que la puerta de enlace se ejecute como un servicio de usuario systemd para el usuario openclaw. El servicio está habilitado e iniciado al final de la configuración.

- **Iniciar:** `sudo systemctl --machine openclaw@ --user start openclaw.service`
- **Detener:** `sudo systemctl --machine openclaw@ --user stop openclaw.service`
- **Estado:** `sudo systemctl --machine openclaw@ --user status openclaw.service`
- **Registros:** `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`

El archivo quadlet se encuentra en `~openclaw/.config/containers/systemd/openclaw.container`. Para cambiar los puertos o las variables de entorno, edite ese archivo (o el `.env` que utiliza), luego `sudo systemctl --machine openclaw@ --user daemon-reload` y reinicie el servicio. Al arrancar, el servicio se inicia automáticamente si el lingering está habilitado para openclaw (la configuración hace esto cuando loginctl está disponible).

Para agregar quadlet **después** de una configuración inicial que no lo usó, vuelva a ejecutar: `./setup-podman.sh --quadlet`.

## El usuario openclaw (sin inicio de sesión)

`setup-podman.sh` crea un usuario de sistema dedicado `openclaw`:

- **Shell:** `nologin` — sin inicio de sesión interactivo; reduce la superficie de ataque.
- **Inicio:** p. ej. `/home/openclaw` — contiene `~/.openclaw` (configuración, espacio de trabajo) y el script de inicio `run-openclaw-podman.sh`.
- **Podman sin privilegios:** El usuario debe tener un rango **subuid** y **subgid**. Muchas distribuciones asignan estos automáticamente cuando se crea el usuario. Si la configuración imprime una advertencia, añada líneas a `/etc/subuid` y `/etc/subgid`:

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

- **Token:** Almacenado en `~openclaw/.openclaw/.env` como `OPENCLAW_GATEWAY_TOKEN`. `setup-podman.sh` y `run-openclaw-podman.sh` lo generan si falta (usa `openssl`, `python3`, o `od`).
- **Opcional:** En ese `.env` puede establecer claves de proveedor (p. ej. `GROQ_API_KEY`, `OLLAMA_API_KEY`) y otras variables de entorno de OpenClaw.
- **Puertos del host:** De manera predeterminada, el script mapea `18789` (puerta de enlace) y `18790` (puente). Anule el mapeo del puerto del **host** con `OPENCLAW_PODMAN_GATEWAY_HOST_PORT` y `OPENCLAW_PODMAN_BRIDGE_HOST_PORT` al iniciar.
- **Enlace de la puerta de enlace:** De manera predeterminada, `run-openclaw-podman.sh` inicia la puerta de enlace con `--bind loopback` para un acceso local seguro. Para exponer en la LAN, establezca `OPENCLAW_GATEWAY_BIND=lan` y configure `gateway.controlUi.allowedOrigins` (o habilite explícitamente el respaldo de encabezado de host) en `openclaw.json`.
- **Rutas:** La configuración y el espacio de trabajo del host son por defecto `~openclaw/.openclaw` y `~openclaw/.openclaw/workspace`. Anule las rutas del host usadas por el script de inicio con `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR`.

## Modelo de almacenamiento

- **Datos persistentes del host:** `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR` se montan con bind en el contenedor y retienen el estado en el host.
- **Sandbox tmpfs efímero:** si habilitas `agents.defaults.sandbox`, los contenedores del sandbox de herramientas montan `tmpfs` en `/tmp`, `/var/tmp` y `/run`. Esas rutas están respaldadas en memoria y desaparecen con el contenedor del sandbox; la configuración del contenedor de nivel superior de Podman no añade sus propios montajes tmpfs.
- **Puntos críticos de crecimiento del disco:** las rutas principales a vigilar son `media/`, `agents/<agentId>/sessions/sessions.json`, los archivos JSONL de transcripciones, `cron/runs/*.jsonl` y los registros de archivos rotativos bajo `/tmp/openclaw/` (o tu `logging.file` configurado).

`setup-podman.sh` ahora prepara el archivo tar de la imagen en un directorio temporal privado e imprime el directorio base elegido durante la configuración. Para ejecuciones sin root, acepta `TMPDIR` solo cuando esa base sea segura de usar; de lo contrario, recurre a `/var/tmp` y luego a `/tmp`. El tar guardado permanece solo para el propietario y se transmite al `podman load` del usuario de destino, por lo que los directorios temporales privados de la persona que llama no bloquean la configuración.

## Comandos útiles

- **Registros:** Con quadlet: `sudo journalctl --machine openclaw@ --user -u openclaw.service -f`. Con script: `sudo -u openclaw podman logs -f openclaw`
- **Detener:** Con quadlet: `sudo systemctl --machine openclaw@ --user stop openclaw.service`. Con script: `sudo -u openclaw podman stop openclaw`
- **Iniciar de nuevo:** Con quadlet: `sudo systemctl --machine openclaw@ --user start openclaw.service`. Con script: vuelve a ejecutar el script de lanzamiento o `podman start openclaw`
- **Eliminar contenedor:** `sudo -u openclaw podman rm -f openclaw` — la configuración y el espacio de trabajo en el host se mantienen

## Solución de problemas

- **Permiso denegado (EACCES) en config o auth-profiles:** El contenedor usa por defecto `--userns=keep-id` y se ejecuta con el mismo uid/gid que el usuario del host que ejecuta el script. Asegúrate de que tu `OPENCLAW_CONFIG_DIR` y `OPENCLAW_WORKSPACE_DIR` del host sean propiedad de ese usuario.
- **Inicio de la puerta de enlace bloqueado (falta `gateway.mode=local`):** Asegúrate de que `~openclaw/.openclaw/openclaw.json` exista y establezca `gateway.mode="local"`. `setup-podman.sh` crea este archivo si falta.
- **Fallo de Podman sin root para el usuario openclaw:** Compruebe que `/etc/subuid` y `/etc/subgid` contienen una línea para `openclaw` (p. ej., `openclaw:100000:65536`). Agréguela si falta y reinicie.
- **Nombre de contenedor en uso:** El script de inicio utiliza `podman run --replace`, por lo que el contenedor existente se reemplaza cuando inicia de nuevo. Para limpiar manualmente: `podman rm -f openclaw`.
- **Script no encontrado al ejecutar como openclaw:** Asegúrese de que se haya ejecutado `setup-podman.sh` para que `run-openclaw-podman.sh` se copie en el directorio personal de openclaw (p. ej., `/home/openclaw/run-openclaw-podman.sh`).
- **Servicio Quadlet no encontrado o falla al iniciar:** Ejecute `sudo systemctl --machine openclaw@ --user daemon-reload` después de editar el archivo `.container`. Quadlet requiere cgroups v2: `podman info --format '{{.Host.CgroupsVersion}}'` debería mostrar `2`.

## Opcional: ejecutar como su propio usuario

Para ejecutar la puerta de enlace como su usuario normal (sin un usuario openclaw dedicado): construya la imagen, cree `~/.openclaw/.env` con `OPENCLAW_GATEWAY_TOKEN` y ejecute el contenedor con `--userns=keep-id` y montajes en su `~/.openclaw`. El script de inicio está diseñado para el flujo de usuario openclaw; para una configuración de un solo usuario, puede ejecutar el comando `podman run` del script manualmente, apuntando la configuración y el espacio de trabajo a su directorio personal. Recomendado para la mayoría de los usuarios: use `setup-podman.sh` y ejecute como el usuario openclaw para que la configuración y el proceso estén aislados.

import en from "/components/footer/en.mdx";

<en />
