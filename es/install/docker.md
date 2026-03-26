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
- **Nota sobre el aislamiento (sandboxing)**: el aislamiento de agentes también utiliza Docker, pero **no** requiere que toda la pasarela se ejecute en Docker. Consulta [Sandboxing](/es/gateway/sandboxing).

## Requisitos previos

- Docker Desktop (o Docker Engine) + Docker Compose v2
- Al menos 2 GB de RAM para la compilación de la imagen (`pnpm install` puede terminar por OOM en hosts con 1 GB con el código de salida 137)
- Suficiente espacio en disco para las imágenes y los registros
- Si se ejecuta en un VPS/host público, revise
  [Endurecimiento de seguridad para la exposición a la red](/es/gateway/security#0-4-network-exposure-bind-port-firewall),
  especialmente la política de firewall de Docker `DOCKER-USER`.

## Pasarela en contenedor

<Steps>
  <Step title="Construir la imagen">
    Desde la raíz del repositorio, ejecute el script de configuración:

    ```bash
    ./scripts/docker/setup.sh
    ```

    Esto construye la imagen de la pasarela localmente. Para utilizar una imagen precompilada en su lugar:

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Las imágenes precompiladas se publican en el
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Etiquetas comunes: `main`, `latest`, `<version>` (p. ej. `2026.2.26`).

  </Step>

  <Step title="Completar la incorporación">
    El script de configuración ejecuta la incorporación automáticamente. Hará lo siguiente:

    - solicitar claves API del proveedor
    - generar un token de pasarela y escribirlo en `.env`
    - iniciar la pasarela a través de Docker Compose

  </Step>

  <Step title="Abrir la interfaz de usuario de control">
    Abra `http://127.0.0.1:18789/` en su navegador y pegue el token en
    Configuración.

    ¿Necesita la URL de nuevo?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configurar canales (opcional)">
    Use el contenedor de CLI para agregar canales de mensajería:

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
docker compose run --rm openclaw-cli onboard
docker compose up -d openclaw-gateway
```

<Note>
  Ejecute `docker compose` desde la raíz del repositorio. Si habilitó `OPENCLAW_EXTRA_MOUNTS` o
  `OPENCLAW_HOME_VOLUME`, el script de configuración escribe `docker-compose.extra.yml`; inclúyalo
  con `-f docker-compose.yml -f docker-compose.extra.yml`.
</Note>

### Variables de entorno

El script de configuración acepta estas variables de entorno opcionales:

| Variable                       | Propósito                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `OPENCLAW_IMAGE`               | Use una imagen remota en lugar de compilar localmente                                                  |
| `OPENCLAW_DOCKER_APT_PACKAGES` | Instalar paquetes apt adicionales durante la compilación (separados por espacios)                      |
| `OPENCLAW_EXTENSIONS`          | Preinstalar dependencias de extensión en el momento de la compilación (nombres separados por espacios) |
| `OPENCLAW_EXTRA_MOUNTS`        | Montajes de enlace de host adicionales (`source:target[:opts]` separados por comas)                    |
| `OPENCLAW_HOME_VOLUME`         | Persistir `/home/node` en un volumen de Docker con nombre                                              |
| `OPENCLAW_SANDBOX`             | Optar por el arranque del entorno restringido (`1`, `true`, `yes`, `on`)                               |
| `OPENCLAW_DOCKER_SOCKET`       | Anular la ruta del socket de Docker                                                                    |

### Verificaciones de estado

Endpoints de sonda del contenedor (no se requiere autenticación):

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

La imagen de Docker incluye un `HEALTHCHECK` integrado que hace ping a `/healthz`.
Si las verificaciones siguen fallando, Docker marca el contenedor como `unhealthy` y
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
  Use valores de modo de enlace en `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` /
  `auto`), no alias de host como `0.0.0.0` o `127.0.0.1`.
</Note>

### Almacenamiento y persistencia

Docker Compose monta `OPENCLAW_CONFIG_DIR` en `/home/node/.openclaw` y
`OPENCLAW_WORKSPACE_DIR` en `/home/node/.openclaw/workspace`, por lo que esas rutas
sobreviven al reemplazo del contenedor.

Para obtener detalles completos sobre la persistencia en implementaciones de VM, consulte
[Docker VM Runtime - What persists where](/es/install/docker-vm-runtime#what-persists-where).

**Puntos calientes de crecimiento del disco:** vigile `media/`, los archivos JSONL de sesión, `cron/runs/*.jsonl`,
y los registros de archivos rotativos bajo `/tmp/openclaw/`.

### Asistentes de Shell (opcional)

Para una gestión diaria de Docker más fácil, instale `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Luego use `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecute
`clawdock-help` para todos los comandos.
Consulte el [README del asistente `ClawDock`](https://github.com/openclaw/openclaw/blob/main/scripts/shell-helpers/README.md).

<AccordionGroup>
  <Accordion title="Habilitar el sandbox del agente para la puerta de enlace de Docker">
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
    Deshabilite la asignación de pseudo-TTY de Compose con `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Nota de seguridad de red compartida">
  `openclaw-cli` usa `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI
  puedan alcanzar la puerta de enlace a través de `127.0.0.1`. Trate esto como un límite de
  confianza compartido. La configuración de compose elimina `NET_RAW`/`NET_ADMIN` y habilita
  `no-new-privileges` en `openclaw-cli`.
</Accordion>

  <Accordion title="Permisos y EACCES">
    La imagen se ejecuta como `node` (uid 1000). Si ve errores de permisos en
    `/home/node/.openclaw`, asegúrese de que sus montajes de enlace de host sean propiedad del uid 1000:

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
    La imagen predeterminada prioriza la seguridad y se ejecuta como `node` sin root. Para un contenedor
    con más funciones:

    1. **Persistir `/home/node`**: `export OPENCLAW_HOME_VOLUME="openclaw_home"`
    2. **Incluir dependencias del sistema**: `export OPENCLAW_DOCKER_APT_PACKAGES="git curl jq"`
    3. **Instalar navegadores de Playwright**:
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    4. **Persistir las descargas del navegador**: establezca
       `PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright` y use
       `OPENCLAW_HOME_VOLUME` o `OPENCLAW_EXTRA_MOUNTS`.

  </Accordion>

<Accordion title="OAuth de OpenAI Codex (Docker sin interfaz gráfica)">
  Si elige OpenAI Codex OAuth en el asistente, abre una URL del navegador. En configuraciones de
  Docker o sin interfaz gráfica, copie la URL de redirección completa a la que llegue y péguela
  nuevamente en el asistente para finalizar la autenticación.
</Accordion>

  <Accordion title="Metadatos de la imagen base">
    La imagen principal de Docker utiliza `node:24-bookworm` y publica anotaciones de
    la imagen base OCI, incluyendo `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source` y otras. Consulte
    [Anotaciones de imagen OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### ¿Ejecutando en un VPS?

Consulte [Hetzner (Docker VPS)](/es/install/hetzner) y
[Docker VM Runtime](/es/install/docker-vm-runtime) para ver los pasos de implementación
en VM compartida, incluyendo la integración de binarios, la persistencia y las actualizaciones.

## Sandbox del Agente

Cuando `agents.defaults.sandbox` está habilitado, la puerta de enlace ejecuta las herramientas del agente
(shell, lectura/escritura de archivos, etc.) dentro de contenedores Docker aislados, mientras que la
propia puerta de enlace permanece en el host. Esto proporciona un sólido blindaje alrededor de las sesiones de agentes
que no son de confianza o de múltiples inquilinos sin necesidad de contenedorizar toda la puerta de enlace.

El ámbito del sandbox puede ser por agente (predeterminado), por sesión o compartido. Cada ámbito
obtiene su propio espacio de trabajo montado en `/workspace`. También puede configurar
políticas de permiso/denegación de herramientas, aislamiento de red, límites de recursos y contenedores
de navegador.

Para obtener la configuración completa, las imágenes, las notas de seguridad y los perfiles multiagente, consulte:

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa del sandbox
- [OpenShell](/es/gateway/openshell) -- acceso interactivo de shell a los contenedores del sandbox
- [Sandbox y herramientas multiagente](/es/tools/multi-agent-sandbox-tools) -- anulaciones por agente

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
  <Accordion title="Falta la imagen o el contenedor sandbox no se inicia">
    Construya la imagen del sandbox con
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    o establezca `agents.defaults.sandbox.docker.image` a su imagen personalizada.
    Los contenedores se crean automáticamente por sesión bajo demanda.
  </Accordion>

<Accordion title="Errores de permisos en el sandbox">
  Establezca `docker.user` a un UID:GID que coincida con la propiedad de su espacio de trabajo
  montado, o cambie el propietario (chown) de la carpeta del espacio de trabajo.
</Accordion>

<Accordion title="Herramientas personalizadas no encontradas en el sandbox">
  OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), lo que ejecuta `/etc/profile`
  y puede restablecer PATH. Configure `docker.env.PATH` para anteponer las rutas de sus herramientas
  personalizadas, o añada un script en `/etc/profile.d/` en su Dockerfile.
</Accordion>

<Accordion title="Eliminado por falta de memoria durante la compilación de la imagen (exit 137)">
  La VM necesita al menos 2 GB de RAM. Use una clase de máquina más grande y reintente.
</Accordion>

  <Accordion title="No autorizado o emparejamiento requerido en la interfaz de usuario de control">
    Obtenga un enlace nuevo al panel de control y apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Más detalles: [Panel de control](/es/web/dashboard), [Dispositivos](/es/cli/devices).

  </Accordion>

  <Accordion title="El destino de la puerta de enlace muestra ws://172.x.x.x o errores de emparejamiento desde la CLI de Docker">
    Restablezca el modo de puerta de enlace y el enlace:

    ```bash
    docker compose run --rm openclaw-cli config set gateway.mode local
    docker compose run --rm openclaw-cli config set gateway.bind lan
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

import es from "/components/footer/es.mdx";

<es />
