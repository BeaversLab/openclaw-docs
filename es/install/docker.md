---
summary: "Configuración e incorporación opcionales basadas en Docker para OpenClaw"
read_when:
  - Deseas una puerta de enlace en contenedores en lugar de instalaciones locales
  - Estás validando el flujo de Docker
title: "Docker"
---

# Docker (opcional)

Docker es **opcional**. Úsalo solo si deseas una puerta de enlace en contenedores o para validar el flujo de Docker.

## ¿Es Docker adecuado para mí?

- **Sí**: deseas un entorno de puerta de enlace aislado y desechable o ejecutar OpenClaw en un host sin instalaciones locales.
- **No**: estás ejecutando en tu propia máquina y solo deseas el bucle de desarrollo más rápido. Utiliza el flujo de instalación normal en su lugar.
- **Nota sobre el aislamiento**: el aislamiento del agente también usa Docker, pero **no** requiere que toda la puerta de enlace se ejecute en Docker. Consulte [Sandboxing](/es/gateway/sandboxing).

Esta guía cubre:

- Puerta de enlace en contenedores (OpenClaw completo en Docker)
- Sandbox de agente por sesión (puerta de enlace host + herramientas de agente aisladas por Docker)

Detalles del aislamiento: [Sandboxing](/es/gateway/sandboxing)

## Requisitos

- Docker Desktop (o Docker Engine) + Docker Compose v2
- Al menos 2 GB de RAM para la compilación de la imagen (`pnpm install` puede ser eliminado por OOM en hosts de 1 GB con salida 137)
- Suficiente espacio en disco para imágenes + registros
- Si se ejecuta en un VPS/host público, revise
  [Endurecimiento de seguridad para la exposición de red](/es/gateway/security#04-network-exposure-bind--port--firewall),
  especialmente la política de cortafuegos de Docker `DOCKER-USER`.

## Puerta de enlace en contenedores (Docker Compose)

### Inicio rápido (recomendado)

<Note>
Los valores predeterminados de Docker aquí asumen modos de enlace (`lan`/`loopback`), no alias de host. Use valores de modo de enlace en `gateway.bind` (por ejemplo `lan` o `loopback`), no alias de host como
`0.0.0.0` o `localhost`.
</Note>


Desde la raíz del repositorio:

```bash
./docker-setup.sh
```

Este script:

- construye la imagen de la puerta de enlace localmente (o extrae una imagen remota si `OPENCLAW_IMAGE` está establecido)
- ejecuta la incorporación
- imprime sugerencias de configuración opcionales del proveedor
- inicia la puerta de enlace a través de Docker Compose
- genera un token de puerta de enlace y lo escribe en `.env`

Variables de entorno opcionales:

- `OPENCLAW_IMAGE` — usa una imagen remota en lugar de construirla localmente (ej. `ghcr.io/openclaw/openclaw:latest`)
- `OPENCLAW_DOCKER_APT_PACKAGES` — instalar paquetes apt adicionales durante la compilación
- `OPENCLAW_EXTENSIONS` — preinstalar las dependencias de las extensiones en el momento de la compilación (nombres de extensiones separados por espacios, p. ej. `diagnostics-otel matrix`)
- `OPENCLAW_EXTRA_MOUNTS` — agregar montajes de bind adicionales del host
- `OPENCLAW_HOME_VOLUME` — conservar `/home/node` en un volumen con nombre
- `OPENCLAW_SANDBOX` — optar por el arranque del entorno limitado (sandbox) de la puerta de enlace Docker. Solo los valores verdaderos explícitos lo habilitan: `1`, `true`, `yes`, `on`
- `OPENCLAW_INSTALL_DOCKER_CLI` — paso de argumentos de compilación para compilaciones de imágenes locales (`1` instala la CLI de Docker en la imagen). `docker-setup.sh` establece esto automáticamente cuando `OPENCLAW_SANDBOX=1` para compilaciones locales.
- `OPENCLAW_DOCKER_SOCKET` — anular la ruta del socket de Docker (predeterminado: ruta de `DOCKER_HOST=unix://...`, si no, `/var/run/docker.sock`)
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` — break-glass: permitir destinos de `ws://` de red privada de confianza para rutas de cliente de CLI/onboarding (el valor predeterminado es solo loopback)
- `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` — deshabilitar los indicadores de endurecimiento del navegador contenedor
  `--disable-3d-apis`, `--disable-software-rasterizer`, `--disable-gpu` cuando necesite
  compatibilidad con WebGL/3D.
- `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` — mantener las extensiones habilitadas cuando los flujos
  del navegador las requieran (de forma predeterminada, mantiene las extensiones deshabilitadas en el navegador del entorno limitado).
- `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` — establecer el límite del proceso de renderizado
  de Chromium; establezca en `0` para omitir el indicador y usar el comportamiento predeterminado de Chromium.

Una vez que haya terminado:

- Abra `http://127.0.0.1:18789/` en su navegador.
- Pegue el token en la Interfaz de usuario de control (Configuración → token).
- ¿Necesita la URL de nuevo? Ejecute `docker compose run --rm openclaw-cli dashboard --no-open`.

### Habilitar el entorno limitado (sandbox) del agente para la puerta de enlace Docker (opcional)

`docker-setup.sh` también puede inicializar `agents.defaults.sandbox.*` para
despliegues de Docker.

Habilite con:

```bash
export OPENCLAW_SANDBOX=1
./docker-setup.sh
```

Ruta de socket personalizada (por ejemplo, Docker sin root):

```bash
export OPENCLAW_SANDBOX=1
export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
./docker-setup.sh
```

Notas:

- El script monta `docker.sock` solo después de que se aprueben los requisitos previos del sandbox.
- Si no se puede completar la configuración del sandbox, el script restablece
  `agents.defaults.sandbox.mode` a `off` para evitar configuraciones de sandbox obsoletas/rotas
  en ejecuciones posteriores.
- Si falta `Dockerfile.sandbox`, el script imprime una advertencia y continúa;
  compile `openclaw-sandbox:bookworm-slim` con `scripts/sandbox-setup.sh` si
  es necesario.
- Para valores `OPENCLAW_IMAGE` no locales, la imagen ya debe contener compatibilidad con la CLI de Docker
  para la ejecución del sandbox.

### Automatización/CI (no interactivo, sin ruido de TTY)

Para scripts y CI, desactive la asignación de pseudo-TTY de Compose con `-T`:

```bash
docker compose run -T --rm openclaw-cli gateway probe
docker compose run -T --rm openclaw-cli devices list --json
```

Si su automatización no exporta variables de sesión de Claude, dejarlas sin establecer ahora se resuelve en
valores vacíos de forma predeterminada en `docker-compose.yml` para evitar advertencias repetidas de "variable no establecida".

### Nota de seguridad de red compartida (CLI + puerta de enlace)

`openclaw-cli` usa `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI
puedan alcanzar de manera confiable la puerta de enlace a través de `127.0.0.1` en Docker.

Trate esto como un límite de confianza compartido: el enlace de bucle local no es aislamiento entre estos dos
contenedores. Si necesita una separación más fuerte, ejecute comandos desde una ruta de red de contenedor/host
separada en lugar del servicio `openclaw-cli` incluido.

Para reducir el impacto si el proceso de la CLI se ve comprometido, la configuración de compose elimina
`NET_RAW`/`NET_ADMIN` y habilita `no-new-privileges` en `openclaw-cli`.

Escribe la configuración/espacio de trabajo en el host:

- `~/.openclaw/`
- `~/.openclaw/workspace`

¿Ejecutando en un VPS? Consulte [Hetzner (Docker VPS)](/es/install/hetzner).

### Usar una imagen remota (omitir compilación local)

Las imágenes precompiladas oficiales se publican en:

- [Paquete de GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw)

Use el nombre de imagen `ghcr.io/openclaw/openclaw` (no las imágenes de Docker Hub con nombres similares).

Etiquetas comunes:

- `main` — compilación más reciente de `main`
- `<version>` — compilaciones de etiquetas de lanzamiento (por ejemplo, `2026.2.26`)
- `latest` — etiqueta de la última versión estable

### Metadatos de la imagen base

La imagen principal de Docker actualmente utiliza:

- `node:24-bookworm`

La imagen de Docker ahora publica anotaciones de la imagen base de OCI (sha256 es un ejemplo,
y apunta a la lista de manifiestos multi-arquitectura anclados para esa etiqueta):

- `org.opencontainers.image.base.name=docker.io/library/node:24-bookworm`
- `org.opencontainers.image.base.digest=sha256:3a09aa6354567619221ef6c45a5051b671f953f0a1924d1f819ffb236e520e6b`
- `org.opencontainers.image.source=https://github.com/openclaw/openclaw`
- `org.opencontainers.image.url=https://openclaw.ai`
- `org.opencontainers.image.documentation=https://docs.openclaw.ai/install/docker`
- `org.opencontainers.image.licenses=MIT`
- `org.opencontainers.image.title=OpenClaw`
- `org.opencontainers.image.description=OpenClaw gateway and CLI runtime container image`
- `org.opencontainers.image.revision=<git-sha>`
- `org.opencontainers.image.version=<tag-or-main>`
- `org.opencontainers.image.created=<rfc3339 timestamp>`

Referencia: [anotaciones de imagen OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md)

Contexto de la versión: el historial de etiquetado de este repositorio ya usa Bookworm en
`v2026.2.22` y etiquetas anteriores de 2026 (por ejemplo `v2026.2.21`, `v2026.2.9`).

Por defecto, el script de configuración construye la imagen desde el código fuente. Para extraer una imagen
pre-construida, establezca `OPENCLAW_IMAGE` antes de ejecutar el script:

```bash
export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
./docker-setup.sh
```

El script detecta que `OPENCLAW_IMAGE` no es el valor predeterminado `openclaw:local` y
ejecuta `docker pull` en lugar de `docker build`. Todo lo demás (incorporación,
inicio de la puerta de enlace, generación de tokens) funciona de la misma manera.

`docker-setup.sh` aún se ejecuta desde la raíz del repositorio porque usa el archivo local
`docker-compose.yml` y archivos auxiliares. `OPENCLAW_IMAGE` omite el tiempo de construcción de la imagen local;
no reemplaza el flujo de trabajo de compose/configuración.

### Auxiliares de Shell (opcional)

Para una gestión diaria de Docker más sencilla, instale `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
```

**Agregue a su configuración de shell (zsh):**

```bash
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Luego use `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecute `clawdock-help` para ver todos los comandos.

Consulte el [README del auxiliar `ClawDock`](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md) para obtener más detalles.

### Flujo manual (compose)

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

Nota: ejecute `docker compose ...` desde la raíz del repositorio. Si habilitó
`OPENCLAW_EXTRA_MOUNTS` o `OPENCLAW_HOME_VOLUME`, el script de configuración escribe
`docker-compose.extra.yml`; inclúyalo al ejecutar Compose en otro lugar:

```bash
docker compose -f docker-compose.yml -f docker-compose.extra.yml <command>
```

### Token de la interfaz de control + emparejamiento (Docker)

Si ve "unauthorized" o "disconnected (1008): pairing required", obtenga un
enlace nuevo del panel de control y apruebe el dispositivo del navegador:

```bash
docker compose run --rm openclaw-cli dashboard --no-open
docker compose run --rm openclaw-cli devices list
docker compose run --rm openclaw-cli devices approve <requestId>
```

Más detalles: [Panel de control](/es/web/dashboard), [Dispositivos](/es/cli/devices).

### Montajes adicionales (opcional)

Si desea montar directorios adicionales del host en los contenedores, establezca
`OPENCLAW_EXTRA_MOUNTS` antes de ejecutar `docker-setup.sh`. Esto acepta una
lista separada por comas de montajes de enlace de Docker y los aplica a ambos
`openclaw-gateway` y `openclaw-cli` generando `docker-compose.extra.yml`.

Ejemplo:

```bash
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

Notas:

- Las rutas deben estar compartidas con Docker Desktop en macOS/Windows.
- Cada entrada debe ser `source:target[:options]` sin espacios, tabulaciones o nuevas líneas.
- Si edita `OPENCLAW_EXTRA_MOUNTS`, vuelva a ejecutar `docker-setup.sh` para regenerar el
  archivo compose adicional.
- `docker-compose.extra.yml` se genera. No lo edite manualmente.

### Persistir todo el directorio home del contenedor (opcional)

Si desea que `/home/node` persista tras la recreación del contenedor, establezca un
volumen con nombre mediante `OPENCLAW_HOME_VOLUME`. Esto crea un volumen de Docker y lo monta en
`/home/node`, manteniendo los montajes de enlace estándar de configuración/espacio de trabajo. Use un
volumen con nombre aquí (no una ruta de enlace); para montajes de enlace, use
`OPENCLAW_EXTRA_MOUNTS`.

Ejemplo:

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

Puede combinar esto con montajes adicionales:

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
export OPENCLAW_EXTRA_MOUNTS="$HOME/.codex:/home/node/.codex:ro,$HOME/github:/home/node/github:rw"
./docker-setup.sh
```

Notas:

- Los volúmenes con nombre deben coincidir con `^[A-Za-z0-9][A-Za-z0-9_.-]*$`.
- Si cambia `OPENCLAW_HOME_VOLUME`, vuelva a ejecutar `docker-setup.sh` para regenerar el
  archivo compose adicional.
- El volumen con nombre persiste hasta que se elimine con `docker volume rm <name>`.

### Instalar paquetes apt adicionales (opcional)

Si necesita paquetes del sistema dentro de la imagen (por ejemplo, herramientas de compilación o bibliotecas
de medios), establezca `OPENCLAW_DOCKER_APT_PACKAGES` antes de ejecutar `docker-setup.sh`.
Esto instala los paquetes durante la compilación de la imagen, por lo que persisten incluso si el
contenedor se elimina.

Ejemplo:

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg build-essential"
./docker-setup.sh
```

Notas:

- Esto acepta una lista de nombres de paquetes apt separados por espacios.
- Si cambia `OPENCLAW_DOCKER_APT_PACKAGES`, vuelva a ejecutar `docker-setup.sh` para reconstruir
  la imagen.

### Preinstalar dependencias de extensiones (opcional)

Las extensiones con su propio `package.json` (por ejemplo, `diagnostics-otel`, `matrix`,
`msteams`) instalan sus dependencias de npm en la primera carga. Para incluir
esas dependencias en la imagen, establezca `OPENCLAW_EXTENSIONS` antes
de ejecutar `docker-setup.sh`:

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel matrix"
./docker-setup.sh
```

O al compilar directamente:

```bash
docker build --build-arg OPENCLAW_EXTENSIONS="diagnostics-otel matrix" .
```

Notas:

- Esto acepta una lista de nombres de directorios de extensiones separados por espacios (bajo `extensions/`).
- Solo se ven afectadas las extensiones con un `package.json`; se ignoran los complementos ligeros que no tienen uno.
- Si cambia `OPENCLAW_EXTENSIONS`, vuelva a ejecutar `docker-setup.sh` para reconstruir
  la imagen.

### Contenedor para usuarios avanzados / con todas las funciones (opcional)

La imagen de Docker predeterminada es **prioridad de seguridad** y se ejecuta como el usuario no root `node`
. Esto mantiene la superficie de ataque pequeña, pero significa:

- sin instalación de paquetes del sistema en tiempo de ejecución
- sin Homebrew de forma predeterminada
- sin navegadores Chromium/Playwright incluidos

Si desea un contenedor con más funciones, use estos controles opcionales:

1. **Persista `/home/node`** para que las descargas del navegador y las cachés de herramientas sobrevivan:

```bash
export OPENCLAW_HOME_VOLUME="openclaw_home"
./docker-setup.sh
```

2. **Incorpore dependencias del sistema en la imagen** (repetible + persistente):

```bash
export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"
./docker-setup.sh
```

3. **Instale navegadores Playwright sin `npx`** (evita conflictos de anulación de npm):

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Si necesita que Playwright instale dependencias del sistema, reconstruya la imagen con
`OPENCLAW_DOCKER_APT_PACKAGES` en lugar de usar `--with-deps` en tiempo de ejecución.

4. **Persistir las descargas de navegadores de Playwright**:

- Establezca `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` en
  `docker-compose.yml`.
- Asegúrese de que `/home/node` persista a través de `OPENCLAW_HOME_VOLUME`, o montar
  `/home/node/.cache/ms-playwright` a través de `OPENCLAW_EXTRA_MOUNTS`.

### Permisos + EACCES

La imagen se ejecuta como `node` (uid 1000). Si ve errores de permisos en
`/home/node/.openclaw`, asegúrese de que sus montajes de enlace (bind mounts) del host sean propiedad del uid 1000.

Ejemplo (host Linux):

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si elige ejecutar como root por conveniencia, acepta el compromiso de seguridad.

### Reconstrucciones más rápidas (recomendado)

Para acelerar las reconstrucciones, ordene su Dockerfile para que las capas de dependencias se almacenen en caché.
Esto evita volver a ejecutar `pnpm install` a menos que cambien los archivos de bloqueo (lockfiles):

```dockerfile
FROM node:24-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

# Cache dependencies unless package metadata changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

### Configuración de canal (opcional)

Use el contenedor de CLI para configurar los canales y luego reinicie la puerta de enlace (gateway) si es necesario.

WhatsApp (código QR):

```bash
docker compose run --rm openclaw-cli channels login
```

Telegram (token de bot):

```bash
docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"
```

Discord (token de bot):

```bash
docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
```

Documentación: [WhatsApp](/es/channels/whatsapp), [Telegram](/es/channels/telegram), [Discord](/es/channels/discord)

### OAuth de OpenAI Codex (Docker sin interfaz gráfica)

Si elige OAuth de OpenAI Codex en el asistente, este abre una URL del navegador e intenta
capturar una devolución de llamada (callback) en `http://127.0.0.1:1455/auth/callback`. En configuraciones de Docker o
sin interfaz gráfica, esa devolución de llamada puede mostrar un error del navegador. Copie la URL de redirección completa
a la que llegue y péguela de nuevo en el asistente para finalizar la autenticación.

### Verificaciones de estado (Health checks)

Endpoints de sondeo del contenedor (no se requiere autenticación):

```bash
curl -fsS http://127.0.0.1:18789/healthz
curl -fsS http://127.0.0.1:18789/readyz
```

Alias: `/health` y `/ready`.

`/healthz` es un sondeo de actividad (liveness probe) superficial para "el proceso de la puerta de enlace está activo".
`/readyz` permanece listo durante el período de gracia de inicio, luego se convierte en `503` solo si los
canales administrados requeridos aún están desconectados después del período de gracia o se desconectan más tarde.

La imagen de Docker incluye un `HEALTHCHECK` integrado que hace ping a `/healthz` en
segundo plano. En términos simples: Docker sigue comprobando si OpenClaw sigue
siendo receptivo. Si las comprobaciones siguen fallando, Docker marca el contenedor como `unhealthy`,
y los sistemas de orquestación (política de reinicio de Docker Compose, Swarm, Kubernetes,
etc.) pueden reiniciarlo o reemplazarlo automáticamente.

Instantánea de estado profundo autenticada (puerta de enlace + canales):

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### Prueba de humo de extremo a extremo (Docker)

```bash
scripts/e2e/onboard-docker.sh
```

### Prueba de humo de importación QR (Docker)

```bash
pnpm test:docker:qr
```

### LAN vs loopback (Docker Compose)

`docker-setup.sh` por defecto es `OPENCLAW_GATEWAY_BIND=lan` para que el acceso del host a
`http://127.0.0.1:18789` funcione con la publicación de puertos de Docker.

- `lan` (predeterminado): el navegador del host + la CLI del host pueden alcanzar el puerto de la puerta de enlace publicado.
- `loopback`: solo los procesos dentro del espacio de nombres de red del contenedor pueden alcanzar
  la puerta de enlace directamente; el acceso al puerto publicado por el host puede fallar.

El script de configuración también fija `gateway.mode=local` después del onboarding para que los comandos
de la CLI de Docker tengan como destino el loopback local de forma predeterminada.

Nota de configuración heredada: use valores de modo de enlace en `gateway.bind` (`lan` / `loopback` /
`custom` / `tailnet` / `auto`), no alias de host (`0.0.0.0`, `127.0.0.1`,
`localhost`, `::`, `::1`).

Si ve `Gateway target: ws://172.x.x.x:18789` o errores repetidos de `pairing required`
en los comandos de la CLI de Docker, ejecute:

```bash
docker compose run --rm openclaw-cli config set gateway.mode local
docker compose run --rm openclaw-cli config set gateway.bind lan
docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
```

### Notas

- El enlace de la puerta de enlace es por defecto `lan` para el uso del contenedor (`OPENCLAW_GATEWAY_BIND`).
- El CMD del Dockerfile usa `--allow-unconfigured`; la configuración montada con `gateway.mode` y no `local` aún se iniciará. Sobrescriba el CMD para forzar la protección.
- El contenedor de la puerta de enlace es la fuente de verdad para las sesiones (`~/.openclaw/agents/<agentId>/sessions/`).

### Modelo de almacenamiento

- **Datos persistentes del host:** Docker Compose monta `OPENCLAW_CONFIG_DIR` en `/home/node/.openclaw` y `OPENCLAW_WORKSPACE_DIR` en `/home/node/.openclaw/workspace`, por lo que esas rutas sobreviven al reemplazo del contenedor.
- **Sandbox efímero tmpfs:** cuando `agents.defaults.sandbox` está habilitado, los contenedores del sandbox usan `tmpfs` para `/tmp`, `/var/tmp` y `/run`. Esos montajes están separados de la pila Compose de nivel superior y desaparecen con el contenedor del sandbox.
- **Puntos críticos de crecimiento del disco:** vigile `media/`, `agents/<agentId>/sessions/sessions.json`, archivos de transcripción JSONL, `cron/runs/*.jsonl` y los registros de archivos rotativos bajo `/tmp/openclaw/` (o su `logging.file` configurado). Si también ejecuta la aplicación de macOS fuera de Docker, sus registros de servicio vuelven a estar separados: `~/.openclaw/logs/gateway.log`, `~/.openclaw/logs/gateway.err.log` y `/tmp/openclaw/openclaw-gateway.log`.

## Agente Sandbox (puerto de host + herramientas de Docker)

Profundización: [Sandboxing](/es/gateway/sandboxing)

### Lo que hace

Cuando `agents.defaults.sandbox` está habilitado, las **sesiones no principales** ejecutan herramientas dentro de un contenedor Docker. La puerta de enlace permanece en su host, pero la ejecución de la herramienta está aislada:

- ámbito: `"agent"` por defecto (un contenedor + espacio de trabajo por agente)
- ámbito: `"session"` para el aislamiento por sesión
- carpeta de espacio de trabajo por ámbito montada en `/workspace`
- acceso opcional al espacio de trabajo del agente (`agents.defaults.sandbox.workspaceAccess`)
- política de herramientas de permitir/denegar (denegar gana)
- los medios entrantes se copian en el espacio de trabajo del sandbox activo (`media/inbound/*`) para que las herramientas puedan leerlos (con `workspaceAccess: "rw"`, esto termina en el espacio de trabajo del agente)

Advertencia: `scope: "shared"` deshabilita el aislamiento entre sesiones. Todas las sesiones comparten un contenedor y un espacio de trabajo.

### Perfiles de sandbox por agente (multiagente)

Si utiliza el enrutamiento multiagente, cada agente puede anular la configuración de sandbox y de herramientas: `agents.list[].sandbox` y `agents.list[].tools` (además de `agents.list[].tools.sandbox.tools`). Esto le permite ejecutar niveles de acceso mixtos en una sola puerta de enlace:

- Acceso completo (agente personal)
- Herramientas de solo lectura + espacio de trabajo de solo lectura (agente familiar/trabajo)
- Sin herramientas de sistema de archivos/shell (agente público)

Consulte [Multi-Agent Sandbox & Tools](/es/tools/multi-agent-sandbox-tools) para ver ejemplos, precedencia y solución de problemas.

### Comportamiento predeterminado

- Imagen: `openclaw-sandbox:bookworm-slim`
- Un contenedor por agente
- Acceso al espacio de trabajo del agente: `workspaceAccess: "none"` (predeterminado) usa `~/.openclaw/sandboxes`
  - `"ro"` mantiene el espacio de trabajo del sandbox en `/workspace` y monta el espacio de trabajo del agente como solo lectura en `/agent` (desactiva `write`/`edit`/`apply_patch`)
  - `"rw"` monta el espacio de trabajo del agente como lectura/escritura en `/workspace`
- Auto-poda: inactivo > 24h O antigüedad > 7d
- Red: `none` por defecto (aceptar explícitamente si necesita salida)
  - `host` está bloqueado.
  - `container:<id>` está bloqueado por defecto (riesgo de unión al espacio de nombres).
- Permitido por defecto: `exec`, `process`, `read`, `write`, `edit`, `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- Denegado por defecto: `browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway`

### Habilitar sandbox

Si planea instalar paquetes en `setupCommand`, tenga en cuenta:

- El `docker.network` por defecto es `"none"` (sin salida).
- `docker.network: "host"` está bloqueado.
- `docker.network: "container:<id>"` está bloqueado por defecto.
- Anulación de emergencia: `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`.
- `readOnlyRoot: true` bloquea la instalación de paquetes.
- `user` debe ser root para `apt-get` (omite `user` o establece `user: "0:0"`).
  OpenClaw vuelve a crear los contenedores automáticamente cuando cambia `setupCommand` (o la configuración de docker)
  a menos que el contenedor se haya **usado recientemente** (dentro de ~5 minutos). Los contenedores activos
  registran una advertencia con el comando exacto `openclaw sandbox recreate ...`.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared (agent is default)
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
        },
        prune: {
          idleHours: 24, // 0 disables idle pruning
          maxAgeDays: 7, // 0 disables max-age pruning
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: [
          "exec",
          "process",
          "read",
          "write",
          "edit",
          "sessions_list",
          "sessions_history",
          "sessions_send",
          "sessions_spawn",
          "session_status",
        ],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

Los controles de endurecimiento se encuentran en `agents.defaults.sandbox.docker`:
`network`, `user`, `pidsLimit`, `memory`, `memorySwap`, `cpus`, `ulimits`,
`seccompProfile`, `apparmorProfile`, `dns`, `extraHosts`,
`dangerouslyAllowContainerNamespaceJoin` (solo para romper el cristal en caso de emergencia).

Multiagente: anular `agents.defaults.sandbox.{docker,browser,prune}.*` por agente a través de `agents.list[].sandbox.{docker,browser,prune}.*`
(se ignora cuando `agents.defaults.sandbox.scope` / `agents.list[].sandbox.scope` es `"shared"`).

### Construir la imagen de sandbox predeterminada

```bash
scripts/sandbox-setup.sh
```

Esto construye `openclaw-sandbox:bookworm-slim` usando `Dockerfile.sandbox`.

### Imagen común de sandbox (opcional)

Si desea una imagen de sandbox con herramientas de compilación comunes (Node, Go, Rust, etc.), construya la imagen común:

```bash
scripts/sandbox-common-setup.sh
```

Esto construye `openclaw-sandbox-common:bookworm-slim`. Para usarla:

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "openclaw-sandbox-common:bookworm-slim" } },
    },
  },
}
```

### Imagen de navegador de sandbox

Para ejecutar la herramienta del navegador dentro del sandbox, construya la imagen del navegador:

```bash
scripts/sandbox-browser-setup.sh
```

Esto construye `openclaw-sandbox-browser:bookworm-slim` usando
`Dockerfile.sandbox-browser`. El contenedor ejecuta Chromium con CDP habilitado y
un observador noVNC opcional (con interfaz gráfica a través de Xvfb).

Notas:

- Docker y otros flujos de navegador sin cabeza/en contenedor se mantienen en CDP puro. Chrome MCP `existing-session` es para Chrome local del host, no para la toma de control del contenedor.
- Headful (Xvfb) reduce el bloqueo de bots en comparación con headless.
- Headless todavía se puede usar configurando `agents.defaults.sandbox.browser.headless=true`.
- No se necesita un entorno de escritorio completo (GNOME); Xvfb proporciona la pantalla.
- Los contenedores del navegador utilizan de forma predeterminada una red dedicada de Docker (`openclaw-sandbox-browser`) en lugar de `bridge` global.
- Opcional `agents.defaults.sandbox.browser.cdpSourceRange` restringe el ingreso de CDP en el borde del contenedor por CIDR (por ejemplo `172.21.0.1/32`).
- El acceso del observador noVNC está protegido por contraseña de forma predeterminada; OpenClaw proporciona una URL de token de observador de corta duración que sirve una página de arranque local y mantiene la contraseña en el fragmento de la URL (en lugar de la consulta de la URL).
- Los valores predeterminados de inicio del contenedor del navegador son conservadores para las cargas de trabajo compartidas/en contenedores, incluyendo:
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-software-rasterizer`
  - `--disable-gpu`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--metrics-recording-only`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--disable-extensions`
  - Si `agents.defaults.sandbox.browser.noSandbox` está configurado, `--no-sandbox` y
    `--disable-setuid-sandbox` también se añaden.
  - Los tres indicadores de endurecimiento de gráficos anteriores son opcionales. Si su carga de trabajo necesita
    WebGL/3D, configure `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` para ejecutar sin
    `--disable-3d-apis`, `--disable-software-rasterizer` y `--disable-gpu`.
  - El comportamiento de la extensión se controla mediante `--disable-extensions` y se puede desactivar
    (habilita las extensiones) mediante `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` para
    páginas dependientes de extensiones o flujos de trabajo intensivos en extensiones.
  - `--renderer-process-limit=2` también es configurable con
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT`; configure `0` para dejar que Chromium elija su
    límite de procesos predeterminado cuando sea necesario ajustar la concurrencia del navegador.

Los valores predeterminados se aplican de forma predeterminada en la imagen incluida. Si necesita diferentes
indicadores de Chromium, utilice una imagen de navegador personalizada y proporcione su propio punto de entrada.

Usar configuración:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        browser: { enabled: true },
      },
    },
  },
}
```

Imagen de navegador personalizada:

```json5
{
  agents: {
    defaults: {
      sandbox: { browser: { image: "my-openclaw-browser" } },
    },
  },
}
```

Cuando está habilitado, el agente recibe:

- una URL de control del navegador sandbox (para la herramienta `browser`)
- una URL de noVNC (si está habilitado y headless=false)

Recuerde: si utiliza una lista de permitidos para las herramientas, añada `browser` (y elimínelo de
deny) o la herramienta permanecerá bloqueada.
Las reglas de poda (`agents.defaults.sandbox.prune`) también se aplican a los contenedores del navegador.

### Imagen de sandbox personalizada

Construya su propia imagen y apunte la configuración a ella:

```bash
docker build -t my-openclaw-sbx -f Dockerfile.sandbox .
```

```json5
{
  agents: {
    defaults: {
      sandbox: { docker: { image: "my-openclaw-sbx" } },
    },
  },
}
```

### Política de herramientas (permitir/denegar)

- `deny` tiene prioridad sobre `allow`.
- Si `allow` está vacío: todas las herramientas (excepto deny) están disponibles.
- Si `allow` no está vacío: solo las herramientas en `allow` están disponibles (menos deny).

### Estrategia de poda

Dos controles:

- `prune.idleHours`: eliminar contenedores no usados en X horas (0 = desactivar)
- `prune.maxAgeDays`: eliminar contenedores con más de X días de antigüedad (0 = desactivar)

Ejemplo:

- Mantener sesiones ocupadas pero limitar su vida útil:
  `idleHours: 24`, `maxAgeDays: 7`
- Nunca podar:
  `idleHours: 0`, `maxAgeDays: 0`

### Notas de seguridad

- El muro duro solo se aplica a las **herramientas** (exec/read/write/edit/apply_patch).
- Las herramientas solo para el host como browser/camera/canvas están bloqueadas por defecto.
- Permitir `browser` en el sandbox **rompe el aislamiento** (el navegador se ejecuta en el host).

## Solución de problemas

- Falta la imagen: compila con [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh) o establece `agents.defaults.sandbox.docker.image`.
- El contenedor no se está ejecutando: se creará automáticamente por sesión bajo demanda.
- Errores de permisos en el sandbox: establece `docker.user` a un UID:GID que coincida con el
  propietario de tu espacio de trabajo montado (o haz chown de la carpeta del espacio de trabajo).
- Herramientas personalizadas no encontradas: OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), lo que
  carga `/etc/profile` y puede restablecer PATH. Establece `docker.env.PATH` para anteponer tus
  rutas de herramientas personalizadas (p. ej., `/custom/bin:/usr/local/share/npm-global/bin`), o añade
  un script en `/etc/profile.d/` en tu Dockerfile.

import en from "/components/footer/en.mdx";

<en />
