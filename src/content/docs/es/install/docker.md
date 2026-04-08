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
- **Nota sobre el aislamiento**: el aislamiento del agente también utiliza Docker, pero **no** requiere que la pasarela completa se ejecute en Docker. Consulte [Aislamiento](/en/gateway/sandboxing).

## Requisitos previos

- Docker Desktop (o Docker Engine) + Docker Compose v2
- Al menos 2 GB de RAM para la compilación de la imagen (`pnpm install` puede terminar por OOM en hosts con 1 GB con el código de salida 137)
- Suficiente espacio en disco para las imágenes y los registros
- Si se ejecuta en un VPS/huésped público, revise
  [Endurecimiento de seguridad para la exposición a la red](/en/gateway/security),
  especialmente la política de firewall `DOCKER-USER` de Docker.

## Pasarela en contenedor

<Steps>
  <Step title="Construir la imagen">
    Desde la raíz del repositorio, ejecute el script de configuración:

    ```bash
    ./scripts/docker/setup.sh
    ```

    Esto construye la imagen de la pasarela localmente. Para utilizar una imagen preconstruida en su lugar:

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

  <Step title="Abrir la Interfaz de Control">
    Abra `http://127.0.0.1:18789/` en su navegador y pegue el secreto compartido
    configurado en Configuración. El script de configuración escribe un token en `.env` de forma
    predeterminada; si cambia la configuración del contenedor a autenticación por contraseña,
    utilice esa contraseña en su lugar.

    ¿Necesita la URL de nuevo?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configurar canales (opcional)">
    Utilice el contenedor de la CLI para añadir canales de mensajería:

    ```bash
    # WhatsApp (QR)
    docker compose run --rm openclaw-cli channels login

    # Telegram
    docker compose run --rm openclaw-cli channels add --channel telegram --token "<token>"

    # Discord
    docker compose run --rm openclaw-cli channels add --channel discord --token "<token>"
    ```

    Documentación: [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord)

  </Step>
</Steps>

### Flujo manual

Si prefieres ejecutar cada paso tú mismo en lugar de usar el script de configuración:

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>Ejecute `docker compose` desde la raíz del repositorio. Si habilitó `OPENCLAW_EXTRA_MOUNTS` o `OPENCLAW_HOME_VOLUME`, el script de configuración escribe `docker-compose.extra.yml`; inclúyalo con `-f docker-compose.yml -f docker-compose.extra.yml`.</Note>

<Note>Debido a que `openclaw-cli` comparte el espacio de nombres de red de `openclaw-gateway`, es una herramienta posterior al inicio. Antes de `docker compose up -d openclaw-gateway`, ejecute la incorporación y la escritura de la configuración de tiempo de configuración a través de `openclaw-gateway` con `--no-deps --entrypoint node`.</Note>

### Variables de entorno

El script de configuración acepta estas variables de entorno opcionales:

| Variable                       | Propósito                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`               | Utilizar una imagen remota en lugar de compilar localmente                                      |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Instalar paquetes apt adicionales durante la compilación (separados por espacios)               |
| `OPENCLAW_EXTENSIONS`          | Preinstalar dependencias de extensión en tiempo de compilación (nombres separados por espacios) |
| `OPENCLAW_EXTRA_MOUNTS`        | Montajes de enlace de host adicionales (`source:target[:opts]` separados por comas)             |
| `OPENCLAW_HOME_VOLUME`         | Persistir `/home/node` en un volumen de Docker con nombre                                       |
| `OPENCLAW_SANDBOX`             | Optar por el arranque en sandbox (`1`, `true`, `yes`, `on`)                                     |
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

<Note>Use valores de modo de enlace en `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), no alias de host como `0.0.0.0` o `127.0.0.1`.</Note>

### Almacenamiento y persistencia

Docker Compose monta `OPENCLAW_CONFIG_DIR` en `/home/node/.openclaw` y
`OPENCLAW_WORKSPACE_DIR` en `/home/node/.openclaw/workspace`, por lo que esas rutas
sobreviven al reemplazo del contenedor.

Ese directorio de configuración montado es donde OpenClaw mantiene:

- `openclaw.json` para la configuración de comportamiento
- `agents/<agentId>/agent/auth-profiles.json` para la autenticación almacenada de proveedores OAuth/API-key
- `.env` para secretos de tiempo de ejecución respaldados por variables de entorno, como `OPENCLAW_GATEWAY_TOKEN`

Para obtener detalles completos sobre la persistencia en implementaciones de VM, consulte
[Docker VM Runtime - What persists where](/en/install/docker-vm-runtime#what-persists-where).

**Puntos calientes de crecimiento del disco:** vigila `media/`, archivos JSONL de sesión, `cron/runs/*.jsonl`
y registros de archivos rotativos en `/tmp/openclaw/`.

### Ayudantes de Shell (opcionales)

Para una gestión diaria de Docker más sencilla, instala `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si instalaste ClawDock desde la antigua ruta raw `scripts/shell-helpers/clawdock-helpers.sh`, vuelve a ejecutar el comando de instalación anterior para que tu archivo auxiliar local rastree la nueva ubicación.

Luego usa `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecuta
`clawdock-help` para ver todos los comandos.
Consulta [ClawDock](/en/install/clawdock) para obtener la guía completa del auxiliar.

<AccordionGroup>
  <Accordion title="Habilitar el sandbox del agente para la puerta de enlace Docker">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Ruta de socket personalizada (ej. Docker sin root):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    El script monta `docker.sock` solo después de que se cumplan los requisitos previos del sandbox. Si
    la configuración del sandbox no se puede completar, el script restablece `agents.defaults.sandbox.mode`
    a `off`.

  </Accordion>

  <Accordion title="Automatización / CI (no interactivo)">
    Deshabilita la asignación de pseudo-TTY de Compose con `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Nota de seguridad de red compartida">`openclaw-cli` usa `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI puedan llegar a la puerta de enlace a través de `127.0.0.1`. Trata esto como un límite de confianza compartido. La configuración de compose elimina `NET_RAW`/`NET_ADMIN` y habilita `no-new-privileges` en `openclaw-cli`.</Accordion>

  <Accordion title="Permisos y EACCES">
    La imagen se ejecuta como `node` (uid 1000). Si ves errores de permisos en
    `/home/node/.openclaw`, asegúrate de que tus montajes de enlace del host sean propiedad del uid 1000:

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
    La imagen predeterminada prioriza la seguridad y se ejecuta como `node` no root. Para un
    contenedor con más funciones:

    1. **Persistir `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Incluir dependencias del sistema**: `export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Instalar navegadores Playwright**:
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Persistir descargas del navegador**: configure
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` y use
       `OPENCLAW_HOME_VOLUME` o `OPENCLAW_EXTRA_MOUNTS`.

  </Accordion>

<Accordion title="OpenAI Codex OAuth (Docker sin cabeza)">Si elige OpenAI Codex OAuth en el asistente, este abre una URL del navegador. En configuraciones de Docker o sin cabeza, copie la URL de redireccionamiento completa a la que llegue y péguela de nuevo en el asistente para finalizar la autenticación.</Accordion>

  <Accordion title="Metadatos de la imagen base">
    La imagen principal de Docker usa `node:24-bookworm` y publica anotaciones de imagen base OCI
    que incluyen `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, entre otros. Consulte
    [Anotaciones de imagen OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### ¿Ejecutando en un VPS?

Consulte [Hetzner (Docker VPS)](/en/install/hetzner) y
[Docker VM Runtime](/en/install/docker-vm-runtime) para ver los pasos de implementación en VM compartida,
incluida la creación de binarios, la persistencia y las actualizaciones.

## Agente Sandbox

Cuando `agents.defaults.sandbox` está habilitado, la puerta de enlace ejecuta las herramientas del agente
(shell, lectura/escritura de archivos, etc.) dentro de contenedores Docker aislados mientras que la
propia puerta de enlace permanece en el host. Esto proporciona un muro sólido alrededor de sesiones de agente
que no son de confianza o multiinquilino sin necesidad de contenerizar toda la puerta de enlace.

El alcance del sandbox puede ser por agente (predeterminado), por sesión o compartido. Cada alcance
obtiene su propio espacio de trabajo montado en `/workspace`. También puedes configurar
políticas de herramientas de permitir/denegar, aislamiento de red, límites de recursos y
contenedores del navegador.

Para obtener la configuración completa, las imágenes, las notas de seguridad y los perfiles multiagente, consulte:

- [Sandboxing](/en/gateway/sandboxing) -- referencia completa del sandbox
- [OpenShell](/en/gateway/openshell) -- acceso al shell interactivo de los contenedores del sandbox
- [Multi-Agent Sandbox and Tools](/en/tools/multi-agent-sandbox-tools) -- anulaciones por agente

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

Construya la imagen predeterminada del sandbox:

```bash
scripts/sandbox-setup.sh
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="Imagen no encontrada o el contenedor del sandbox no se inicia">
    Construya la imagen del sandbox con
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    o establezca `agents.defaults.sandbox.docker.image` en su imagen personalizada.
    Los contenedores se crean automáticamente por sesión bajo demanda.
  </Accordion>

<Accordion title="Errores de permisos en el sandbox">Establezca `docker.user` en un UID:GID que coincida con la propiedad de su espacio de trabajo montado, o ejecute chown en la carpeta del espacio de trabajo.</Accordion>

<Accordion title="Herramientas personalizadas no encontradas en el sandbox">OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), lo que ejecuta `/etc/profile` y puede restablecer PATH. Establezca `docker.env.PATH` para anteponer sus rutas de herramientas personalizadas, o agregue un script en `/etc/profile.d/` en su Dockerfile.</Accordion>

<Accordion title="Terminado por OOM durante la compilación de la imagen (salida 137)">La VM necesita al menos 2 GB de RAM. Use una clase de máquina más grande e inténtelo de nuevo.</Accordion>

  <Accordion title="No autorizado o emparejamiento requerido en la interfaz de usuario de control">
    Obtenga un enlace nuevo del panel y apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Más detalles: [Dashboard](/en/web/dashboard), [Devices](/en/cli/devices).

  </Accordion>

  <Accordion title="El destino de la puerta de enlace muestra ws://172.x.x.x o errores de emparejamiento desde la CLI de Docker">
    Restablecer el modo de puerta de enlace y el enlace:

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Relacionado

- [Resumen de instalación](/en/install) — todos los métodos de instalación
- [Podman](/en/install/podman) — alternativa a Podman para Docker
- [ClawDock](/en/install/clawdock) — configuración comunitaria de Docker Compose
- [Actualización](/en/install/updating) — mantener OpenClaw actualizado
- [Configuración](/en/gateway/configuration) — configuración de la puerta de enlace después de la instalación
