---
summary: "Configuración y incorporación opcionales basadas en Docker para OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

# Docker (opcional)

Docker es **opcional**. Úselo solo si desea una puerta de enlace contenerizada o para validar el flujo de Docker.

## ¿Es Docker adecuado para mí?

- **Sí**: desea un entorno de puerta de enlace aislado y desechable o ejecutar OpenClaw en un host sin instalaciones locales.
- **No**: estás ejecutándolo en tu propia máquina y solo quieres el bucle de desarrollo más rápido. Utiliza el flujo de instalación normal.
- **Nota sobre el aislamiento (sandboxing)**: el aislamiento de agentes también utiliza Docker, pero **no** requiere que toda la pasarela se ejecute en Docker. Consulte [Aislamiento (Sandboxing)](/es/gateway/sandboxing).

## Requisitos previos

- Docker Desktop (o Docker Engine) + Docker Compose v2
- Al menos 2 GB de RAM para la compilación de la imagen (`pnpm install` puede terminar por OOM en hosts con 1 GB con el código de salida 137)
- Suficiente espacio en disco para las imágenes y los registros
- Si se ejecuta en un VPS/host público, revise
  [Endurecimiento de seguridad para la exposición a la red](/es/gateway/security),
  especialmente la política del cortafuegos de Docker `DOCKER-USER`.

## Pasarela en contenedor

<Steps>
  <Step title="Construir la imagen">
    Desde la raíz del repositorio, ejecute el script de configuración:

    ```bash
    ./scripts/docker/setup.sh
    ```

    Esto construye la imagen de la pasarela localmente. Para usar una imagen preconstruida en su lugar:

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Las imágenes preconstruidas se publican en el
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Etiquetas comunes: `main`, `latest`, `<version>` (ej. `2026.2.26`).

  </Step>

  <Step title="Completar la incorporación (onboarding)">
    El script de configuración ejecuta la incorporación automáticamente. Hará lo siguiente:

    - solicitar las claves de API del proveedor
    - generar un token de pasarela y escribirlo en `.env`
    - iniciar la pasarela mediante Docker Compose

    Durante la configuración, la incorporación previa al inicio y la escritura de configuraciones se ejecutan a través de
    `openclaw-gateway` directamente. `openclaw-cli` es para los comandos que ejecuta después
    de que el contenedor de la pasarela ya existe.

  </Step>

  <Step title="Abrir la interfaz de usuario de control">
    Abra `http://127.0.0.1:18789/` en su navegador y pegue el token en
    Configuración (Settings).

    ¿Necesita la URL de nuevo?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configurar canales (opcional)">
    Use el contenedor de CLI para añadir canales de mensajería:

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    Documentación: [WhatsApp](/es/channels/whatsapp), [Telegram](/es/channels/telegram), [Discord](/es/channels/discord)

  </Step>
</Steps>

### Flujo manual

Si prefieres ejecutar cada paso tú mismo en lugar de usar el script de configuración:

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.mode local
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.bind lan
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set gateway.controlUi.allowedOrigins \
  '["http://localhost:18789","http://127.0.0.1:18789"]' --strict-json
docker compose up -d openclaw-gateway
```

<Note>
  Ejecute `docker compose` desde la raíz del repositorio. Si habilitó `OPENCLAW_EXTRA_MOUNTS` o
  `OPENCLAW_HOME_VOLUME`, el script de configuración escribe `docker-compose.extra.yml`; inclúyalo
  con `-f docker-compose.yml -f docker-compose.extra.yml`.
</Note>

<Note>
  Como `openclaw-cli` comparte el espacio de nombres de red de `openclaw-gateway`, es una
  herramienta posterior al inicio. Antes de `docker compose up -d openclaw-gateway`, ejecute el
  onboarding y la escritura de configuración de tiempo de configuración a través de
  `openclaw-gateway` con `--no-deps --entrypoint node`.
</Note>

### Variables de entorno

El script de configuración acepta estas variables de entorno opcionales:

| Variable                       | Propósito                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | Utilizar una imagen remota en lugar de compilar localmente                                      |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Instalar paquetes apt adicionales durante la compilación (separados por espacios)               |
| `OPENCLAW_EXTENSIONS`          | Preinstalar dependencias de extensión en tiempo de compilación (nombres separados por espacios) |
| `OPENCLAW_EXTRA_MOUNTS`        | Montajes de enlace de host adicionales (`source:target[:opts]` separados por comas)             |
| `OPENCLAW_HOME_VOLUME`         | Persistir `/home/node` en un volumen de Docker con nombre                                       |
| `OPENCLAW_SANDBOX`             | Optar por el arranque del entorno seguro (`1`, `true`, `yes`, `on`)                             |
| `OPENCLAW_DOCKER_SOCKET`       | Anular la ruta del socket de Docker                                                             |

### Verificaciones de estado

Endpoints de sondeo del contenedor (no se requiere autenticación):

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

La imagen de Docker incluye un `HEALTHCHECK` incorporado que hace ping a `/healthz`.
Si las comprobaciones siguen fallando, Docker marca el contenedor como `unhealthy` y
los sistemas de orquestación pueden reiniciarlo o reemplazarlo.

Instantánea de estado profundo autenticada:

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs loopback

`scripts/docker/setup.sh` por defecto es `OPENCLAW_GATEWAY_BIND=lan` para que el acceso del host a
`http://127.0.0.1:18789` funcione con la publicación de puertos de Docker.

- `lan` (predeterminado): el navegador del host y la CLI del host pueden alcanzar el puerto de puerta de enlace publicado.
- `loopback`: solo los procesos dentro del espacio de nombres de red del contenedor pueden alcanzar
  la puerta de enlace directamente.

<Note>
  Use bind mode values in `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), not
  host aliases like `0.0.0.0` or `127.0.0.1`.
</Note>

### Almacenamiento y persistencia

Docker Compose bind-mounts `OPENCLAW_CONFIG_DIR` to `/home/node/.openclaw` and
`OPENCLAW_WORKSPACE_DIR` to `/home/node/.openclaw/workspace`, so those paths
survive container replacement.

Para obtener detalles completos sobre la persistencia en implementaciones de VM, consulte
[Docker VM Runtime - What persists where](/es/install/docker-vm-runtime#what-persists-where).

**Puntos calientes de crecimiento del disco:** vigile `media/`, los archivos JSONL de sesión, `cron/runs/*.jsonl`,
y los registros de archivos rotativos bajo `/tmp/openclaw/`.

### Asistentes de shell (opcionales)

Para una gestión diaria de Docker más fácil, instale `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Luego use `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecute
`clawdock-help` para todos los comandos.
Consulte el [README de `ClawDock` Helper](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md).

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Custom socket path (e.g. rootless Docker):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    The script mounts `docker.sock` only after sandbox prerequisites pass. If
    sandbox setup cannot complete, the script resets `agents.defaults.sandbox.mode`
    to `off`.

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    Disable Compose pseudo-TTY allocation with `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Nota de seguridad de red compartida">
  `openclaw-cli` usa `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI
  puedan alcanzar la pasarela a través de `127.0.0.1`. Trate esto como un límite de confianza
  compartido. La configuración de compose elimina `NET_RAW`/`NET_ADMIN` y habilita
  `no-new-privileges` en `openclaw-cli`.
</Accordion>

  <Accordion title="Permisos y EACCES">
    La imagen se ejecuta como `node` (uid 1000). Si ve errores de permisos en
    `/home/node/.openclaw`, asegúrese de que sus montajes de enlace del host sean propiedad del uid 1000:

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

  </Accordion>

  <Accordion title="Reconstrucciones más rápidas">
    Ordene su Dockerfile para que las capas de dependencias se almacenen en caché. Esto evita volver a ejecutar
    `pnpm install` a menos que cambien los archivos de bloqueo:

    ```dockerfile
    FROM node:24-bookworm
    RUN curl -fsSL https://bun.sh/install | bash
    ENV PATH="/root/.bun/bin:${PATH}"
    RUN corepack enable
    WORKDIR /app
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

  </Accordion>

  <Accordion title="Opciones de contenedor para usuarios avanzados">
    La imagen predeterminada prioriza la seguridad y se ejecuta como `node` sin privilegios de root. Para un contenedor
    con más funciones:

    1. **Persistir `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Incluir dependencias del sistema**: `export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Instalar navegadores Playwright**:
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Persistir las descargas del navegador**: configure
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` y use
       `OPENCLAW_HOME_VOLUME` o `OPENCLAW_EXTRA_MOUNTS`.

  </Accordion>

<Accordion title="OpenAI Codex OAuth (Docker sin interfaz gráfica)">
  Si elige OpenAI Codex OAuth en el asistente, este abre una URL del navegador. En entornos Docker o
  sin interfaz gráfica, copie la URL de redireccionamiento completa donde aterrice y péguela de
  nuevo en el asistente para finalizar la autenticación.
</Accordion>

  <Accordion title="Metadatos de la imagen base">
    La imagen principal de Docker utiliza `node:24-bookworm` y publica anotaciones de imagen base OCI, incluyendo `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source` y otras. Consulte
    [Anotaciones de imagen OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### ¿Ejecutando en un VPS?

Consulte [Hetzner (Docker VPS)](/es/install/hetzner) y
[Docker VM Runtime](/es/install/docker-vm-runtime) para ver los pasos de implementación en VM compartida,
incluyendo la creación de binarios, la persistencia y las actualizaciones.

## Sandbox del Agente

Cuando `agents.defaults.sandbox` está habilitado, la puerta de enlace ejecuta la ejecución de herramientas del agente
(shell, lectura/escritura de archivos, etc.) dentro de contenedores Docker aislados, mientras que la
propia puerta de enlace permanece en el host. Esto le proporciona un muro sólido alrededor de sesiones de agentes
no confiables o multiinquilino sin tener que contenerizar toda la puerta de enlace.

El ámbito del sandbox puede ser por agente (por defecto), por sesión o compartido. Cada ámbito
obtiene su propio espacio de trabajo montado en `/workspace`. También puede configurar
políticas de herramientas de permitir/denegar, aislamiento de red, límites de recursos y
contenedores de navegador.

Para obtener la configuración completa, imágenes, notas de seguridad y perfiles multiagente, consulte:

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa del sandbox
- [OpenShell](/es/gateway/openshell) -- acceso interactivo de shell a contenedores sandbox
- [Multi-Agent Sandbox and Tools](/es/tools/multi-agent-sandbox-tools) -- anulaciones por agente

### Activación rápida

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        scope: "agent", // session | agent | shared
      },
    },
  },
}
```

Construya la imagen sandbox predeterminada:

```bash
scripts/sandbox-setup.sh
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="Imagen faltante o contenedor sandbox no se inicia">
    Construya la imagen sandbox con
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    o establezca `agents.defaults.sandbox.docker.image` a su imagen personalizada.
    Los contenedores se crean automáticamente por sesión bajo demanda.
  </Accordion>

<Accordion title="Errores de permiso en el sandbox">
  Establezca `docker.user` a un UID:GID que coincida con la propiedad de su espacio de trabajo
  montado, o haga chown a la carpeta del espacio de trabajo.
</Accordion>

<Accordion title="Custom tools not found in sandbox">
  OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), el cual obtiene recursos de
  `/etc/profile` y puede restablecer PATH. Establezca `docker.env.PATH` para anteponer sus rutas de
  herramientas personalizadas, o añada un script en `/etc/profile.d/` en su Dockerfile.
</Accordion>

<Accordion title="OOM-killed during image build (exit 137)">
  La VM necesita al menos 2 GB de RAM. Use una clase de máquina más grande e inténtelo de nuevo.
</Accordion>

  <Accordion title="Unauthorized or pairing required in Control UI">
    Obtenga un enlace nuevo del panel de control y apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Más detalles: [Dashboard](/es/web/dashboard), [Dispositivos](/es/cli/devices).

  </Accordion>

  <Accordion title="Gateway target shows ws://172.x.x.x or pairing errors from Docker CLI">
    Restablezca el modo de gateway y el enlace (bind):

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

import es from "/components/footer/es.mdx";

<es />
