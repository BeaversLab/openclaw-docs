---
summary: "Configuración y incorporación opcionales basadas en Docker para OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker es **opcional**. Úselo solo si desea una puerta de enlace contenerizada o para validar el flujo de Docker.

## ¿Es Docker adecuado para mí?

- **Sí**: desea un entorno de puerta de enlace aislado y desechable o ejecutar OpenClaw en un host sin instalaciones locales.
- **No**: está ejecutando en su propia máquina y solo desea el bucle de desarrollo más rápido. Use el flujo de instalación normal en su lugar.
- **Nota sobre el sandbox**: el backend de sandbox predeterminado usa Docker cuando el sandbox está habilitado, pero el sandbox está desactivado de forma predeterminada y **no** requiere que toda la puerta de enlace se ejecute en Docker. También están disponibles los backends de sandbox SSH y OpenShell. Consulte [Sandboxing](/es/gateway/sandboxing).

## Requisitos previos

- Docker Desktop (o Docker Engine) + Docker Compose v2
- Al menos 2 GB de RAM para la compilación de la imagen (`pnpm install` puede terminar por OOM en hosts de 1 GB con salida 137)
- Suficiente espacio en disco para imágenes y registros
- Si se ejecuta en un VPS/host público, revise
  [Endurecimiento de seguridad para la exposición a la red](/es/gateway/security),
  especialmente la política de firewall `DOCKER-USER` de Docker.

## Puerta de enlace contenerizada

<Steps>
  <Step title="Construir la imagen">
    Desde la raíz del repositorio, ejecute el script de configuración:

    ```bash
    ./scripts/docker/setup.sh
    ```

    Esto construye la imagen de la puerta de enlace localmente. Para usar una imagen preconstruida en su lugar:

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Las imágenes preconstruidas se publican en el
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Etiquetas comunes: `main`, `latest`, `<version>` (ej. `2026.2.26`).

  </Step>

  <Step title="Completar la incorporación">
    El script de configuración ejecuta la incorporación automáticamente. Esto:

    - solicitará las claves API del proveedor
    - generará un token de puerta de enlace y lo escribirá en `.env`
    - iniciará la puerta de enlace a través de Docker Compose

    Durante la configuración, la incorporación previa al inicio y la escritura de configuración se ejecutan a través de
    `openclaw-gateway` directamente. `openclaw-cli` es para comandos que ejecuta después
    de que el contenedor de la puerta de enlace ya existe.

  </Step>

  <Step title="Abrir la interfaz de control">
    Abra `http://127.0.0.1:18789/` en su navegador y pegue el secreto compartido
    configurado en Configuración. El script de configuración escribe un token en `.env` de
    forma predeterminada; si cambia la configuración del contenedor a autenticación por contraseña, use esa
    contraseña en su lugar.

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

Si prefiere ejecutar cada paso usted mismo en lugar de usar el script de configuración:

```bash
docker build -t openclaw:local -f Dockerfile .
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js onboard --mode local --no-install-daemon
docker compose run --rm --no-deps --entrypoint node openclaw-gateway \
  dist/index.js config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"},{"path":"gateway.controlUi.allowedOrigins","value":["http://localhost:18789","http://127.0.0.1:18789"]}]'
docker compose up -d openclaw-gateway
```

<Note>Ejecute `docker compose` desde la raíz del repositorio. Si habilitó `OPENCLAW_EXTRA_MOUNTS` o `OPENCLAW_HOME_VOLUME`, el script de configuración escribe `docker-compose.extra.yml`; inclúyalo con `-f docker-compose.yml -f docker-compose.extra.yml`.</Note>

<Note>Debido a que `openclaw-cli` comparte el espacio de nombres de red de `openclaw-gateway`, es una herramienta posterior al inicio. Antes de `docker compose up -d openclaw-gateway`, ejecute la incorporación y la escritura de configuración de tiempo de configuración a través de `openclaw-gateway` con `--no-deps --entrypoint node`.</Note>

### Variables de entorno

El script de configuración acepta estas variables de entorno opcionales:

| Variable                                   | Propósito                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | Usar una imagen remota en lugar de compilar localmente                                               |
| `OPENCLAW_DOCKER_APT_PACKAGES`             | Instalar paquetes apt adicionales durante la compilación (separados por espacios)                    |
| `OPENCLAW_EXTENSIONS`                      | Preinstalar dependencias de plugins en el momento de la compilación (nombres separados por espacios) |
| `OPENCLAW_EXTRA_MOUNTS`                    | Montajes de enlace de host adicionales (separados por comas `source:target[:opts]`)                  |
| `OPENCLAW_HOME_VOLUME`                     | Persistir `/home/node` en un volumen de Docker con nombre                                            |
| `OPENCLAW_SANDBOX`                         | Optar por el arranque del sandbox (`1`, `true`, `yes`, `on`)                                         |
| `OPENCLAW_DOCKER_SOCKET`                   | Anular la ruta del socket de Docker                                                                  |
| `OPENCLAW_DISABLE_BONJOUR`                 | Desactiva la publicidad de Bonjour/mDNS (por defecto es `1` para Docker)                             |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Desactivar las superposiciones de montaje de bind del código fuente del complemento incluido         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | Endpoint compartido del recopilador OTLP/HTTP para la exportación de OpenTelemetry                   |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | Endpoints OTLP específicos de señal para trazas, métricas o registros                                |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | Anulación del protocolo OTLP. Hoy en día solo se admite `http/protobuf`                              |
| `OTEL_SERVICE_NAME`                        | Nombre de servicio utilizado para los recursos de OpenTelemetry                                      |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | Optar por los últimos atributos semánticos experimentales de GenAI                                   |
| `OPENCLAW_OTEL_PRELOADED`                  | Omitir el inicio de un segundo SDK de OpenTelemetry cuando ya hay uno precargado                     |

Los mantenedores pueden probar el código fuente del complemento incluido contra una imagen empaquetada montando
un directorio de código fuente del complemento sobre su ruta de código fuente empaquetada, por ejemplo
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
Ese directorio de código fuente montado anula el paquete compilado coincidente
`/app/dist/extensions/synology-chat` para el mismo id de complemento.

### Observabilidad

La exportación de OpenTelemetry es saliente desde el contenedor Gateway hacia su recopilador
OTLP. No requiere un puerto Docker publicado. Si construye la imagen
localmente y desea que el exportador de OpenTelemetry incluido esté disponible dentro de la imagen,
incluya sus dependencias de tiempo de ejecución:

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

La imagen oficial de versión de Docker de OpenClaw incluye el código fuente
`diagnostics-otel` del complemento incluido. Dependiendo del estado de la imagen y el caché, el
Gateway aún puede preparar las dependencias de tiempo de ejecución locales del complemento OpenTelemetry la
primera vez que se activa el complemento, así que permita que ese primer arranque llegue al registro
de paquetes o precaliente la imagen en su canal de lanzamiento. Para habilitar la exportación, permita y
habilite el complemento `diagnostics-otel` en la configuración, luego configure
`diagnostics.otel.enabled=true` o use el ejemplo de configuración en
[OpenTelemetry export](/es/gateway/opentelemetry). Los encabezados de autenticación del recopilador se
configuran a través de `diagnostics.otel.headers`, no a través de variables de entorno
de Docker.

Las métricas de Prometheus utilizan el puerto de Gateway ya publicado. Habilite el
complemento `diagnostics-prometheus`, luego haga scraping:

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

La ruta está protegida por la autenticación de Gateway. No exponga un puerto público `/metrics` separado ni una ruta de proxy inverso sin autenticación. Consulte [Métricas de Prometheus](/es/gateway/prometheus).

### Comprobaciones de estado

Endpoints de sonda del contenedor (no se requiere autenticación):

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

La imagen de Docker incluye un `HEALTHCHECK` integrado que hace ping a `/healthz`.
Si las comprobaciones siguen fallando, Docker marca el contenedor como `unhealthy` y
los sistemas de orquestación pueden reiniciarlo o reemplazarlo.

Instantánea de estado profunda autenticada:

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs loopback

`scripts/docker/setup.sh` es por defecto `OPENCLAW_GATEWAY_BIND=lan` para que el acceso del host a
`http://127.0.0.1:18789` funcione con la publicación de puertos de Docker.

- `lan` (predeterminado): el navegador del host y la CLI del host pueden alcanzar el puerto de puerta de enlace publicado.
- `loopback`: solo los procesos dentro del espacio de nombres de red del contenedor pueden alcanzar
  la puerta de enlace directamente.

<Note>Use valores de modo de enlace en `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), no alias de host como `0.0.0.0` o `127.0.0.1`.</Note>

### Proveedores locales del host

Cuando OpenClaw se ejecuta en Docker, `127.0.0.1` dentro del contenedor es el contenedor
en sí, no su máquina host. Use `host.docker.internal` para proveedores de IA que
se ejecutan en el host:

| Proveedor | URL predeterminada del host | URL de configuración de Docker      |
| --------- | --------------------------- | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`     | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434`    | `http://host.docker.internal:11434` |

La configuración de Docker incluida usa esas URL del host como valores predeterminados de integración para LM Studio y Ollama, y `docker-compose.yml` asigna `host.docker.internal` a la
puerta de enlace del host de Docker para el motor de Docker en Linux. Docker Desktop ya proporciona
el mismo nombre de host en macOS y Windows.

Los servicios del host también deben escuchar en una dirección accesible desde Docker:

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Si utiliza su propio archivo Compose o el comando `docker run`, añada la misma asignación de host
usted mismo, por ejemplo
`--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

La red puente de Docker generalmente no reenvía el multicast Bonjour/mDNS
(`224.0.0.251:5353`) de manera confiable. La configuración de Compose incluida, por lo tanto, establece por defecto
`OPENCLAW_DISABLE_BONJOUR=1` para que la Gateway no entre en un bucle de fallos o reinicie
repetidamente la publicidad cuando el puente descarta el tráfico multicast.

Use la URL de la Gateway publicada, Tailscale o DNS-SD de área amplia para hosts Docker.
Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo cuando se ejecute con red de host, macvlan
u otra red donde se sepa que el multicast mDNS funciona.

Para problemas y solución de problemas, consulte [Descubrimiento Bonjour](/es/gateway/bonjour).

### Almacenamiento y persistencia

Docker Compose monta `OPENCLAW_CONFIG_DIR` en `/home/node/.openclaw` y
`OPENCLAW_WORKSPACE_DIR` en `/home/node/.openclaw/workspace`, por lo que esas rutas
sobreviven al reemplazo del contenedor.

Ese directorio de configuración montado es donde OpenClaw guarda:

- `openclaw.json` para la configuración de comportamiento
- `agents/<agentId>/agent/auth-profiles.json` para la autenticación OAuth/clave de API del proveedor almacenada
- `.env` para secretos de tiempo de ejecución respaldados por variables de entorno, como `OPENCLAW_GATEWAY_TOKEN`

Para obtener detalles completos sobre la persistencia en implementaciones de VM, consulte
[Docker VM Runtime - Qué persiste dónde](/es/install/docker-vm-runtime#what-persists-where).

**Puntos calientes de crecimiento del disco:** vigile `media/`, los archivos JSONL de sesión, `cron/runs/*.jsonl`
y los registros de archivos rotativos bajo `/tmp/openclaw/`.

### Ayudantes de Shell (opcionales)

Para una gestión diaria de Docker más fácil, instale `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si instaló ClawDock desde la ruta `scripts/shell-helpers/clawdock-helpers.sh` antigua, vuelva a ejecutar el comando de instalación anterior para que su archivo de ayudante local rastree la nueva ubicación.

Luego use `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecute
`clawdock-help` para ver todos los comandos.
Consulte [ClawDock](/es/install/clawdock) para la guía completa de ayudantes.

<AccordionGroup>
  <Accordion title="Habilitar sandbox del agente para la puerta de enlace Docker">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Ruta de socket personalizada (por ejemplo, Docker sin root):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    El script monta `docker.sock` solo después de que se cumplan los requisitos previos del sandbox. Si
    la configuración del sandbox no puede completarse, el script restablece `agents.defaults.sandbox.mode`
    a `off`.

  </Accordion>

  <Accordion title="Automatización / CI (no interactivo)">
    Desactive la asignación de seudo-TTY de Compose con `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Nota de seguridad de red compartida">`openclaw-cli` utiliza `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI puedan alcanzar la puerta de enlace a través de `127.0.0.1`. Trate esto como un límite de confianza compartido. La configuración de compose elimina `NET_RAW`/`NET_ADMIN` y habilita `no-new-privileges` en `openclaw-cli`.</Accordion>

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
    La imagen predeterminada prioriza la seguridad y se ejecuta como no root `node`. Para un
    contenedor con más funciones:

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

<Accordion title="OpenAI Codex OAuth (Docker sin interfaz gráfica)">Si selecciona OpenAI Codex OAuth en el asistente, este abrirá una URL del navegador. En configuraciones de Docker o sin interfaz gráfica, copie la URL de redireccionamiento completa a la que llegue y péguela de nuevo en el asistente para finalizar la autenticación.</Accordion>

  <Accordion title="Metadatos de la imagen base">
    La imagen principal de tiempo de ejecución de Docker utiliza `node:24-bookworm-slim` y publica anotaciones
    de imagen base de OCI, incluyendo `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source` y otras. El resumen de la base de Node se
    actualiza a través de PR de Dependabot para la imagen base de Docker; las compilaciones de lanzamiento no ejecutan
    una capa de actualización de la distribución. Consulte
    [Anotaciones de imagen OCI](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### ¿Ejecutando en un VPS?

Consulte [Hetzner (Docker VPS)](/es/install/hetzner) y
[Docker VM Runtime](/es/install/docker-vm-runtime) para ver los pasos de implementación en VM compartida
incluyendo la integración de binarios, la persistencia y las actualizaciones.

## Sandbox del agente

Cuando `agents.defaults.sandbox` está habilitado con el backend de Docker, la puerta de enlace
ejecuta la ejecución de herramientas del agente (shell, lectura/escritura de archivos, etc.) dentro de contenedores
Docker aislados, mientras que la puerta de enlace en sí permanece en el host. Esto le proporciona un barrera firme
alrededor de sesiones de agentes no confiables o multiinquilino sin tener que contenerizar toda la
puerta de enlace.

El ámbito del sandbox puede ser por agente (predeterminado), por sesión o compartido. Cada ámbito
obtiene su propio espacio de trabajo montado en `/workspace`. También puede configurar
políticas de herramientas de permitir/denegar, aislamiento de red, límites de recursos y contenedores
del navegador.

Para obtener la configuración completa, las imágenes, las notas de seguridad y los perfiles de múltiples agentes, consulte:

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa del sandbox
- [OpenShell](/es/gateway/openshell) -- acceso de shell interactivo a los contenedores del sandbox
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

Construya la imagen del sandbox predeterminada:

```bash
scripts/sandbox-setup.sh
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="Imagen faltante o el contenedor del sandbox no se inicia">
    Construya la imagen del sandbox con
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    o establezca `agents.defaults.sandbox.docker.image` a su imagen personalizada.
    Los contenedores se crean automáticamente por sesión bajo demanda.
  </Accordion>

<Accordion title="Errores de permiso en el sandbox">Establezca `docker.user` a un UID:GID que coincida con la propiedad de su espacio de trabajo montado, o ejecute chown en la carpeta del espacio de trabajo.</Accordion>

<Accordion title="Herramientas personalizadas no encontradas en el sandbox">OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), lo que fuente `/etc/profile` y puede restablecer PATH. Establezca `docker.env.PATH` para anteponer sus rutas de herramientas personalizadas, o agregue un script bajo `/etc/profile.d/` en su Dockerfile.</Accordion>

<Accordion title="OOM-killed durante la construcción de la imagen (salida 137)">La VM necesita al menos 2 GB de RAM. Use una clase de máquina más grande y reintentar.</Accordion>

  <Accordion title="No autorizado o emparejamiento requerido en la Interfaz de Usuario de Control">
    Obtenga un enlace fresco del panel de control y apruebe el dispositivo del navegador:

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    docker compose run --rm openclaw-cli devices list
    docker compose run --rm openclaw-cli devices approve <requestId>
    ```

    Más detalles: [Dashboard](/es/web/dashboard), [Devices](/es/cli/devices).

  </Accordion>

  <Accordion title="El destino de la puerta de enlace muestra ws://172.x.x.x o errores de emparejamiento desde la CLI de Docker">
    Restablezca el modo de puerta de enlace y el enlace:

    ```bash
    docker compose run --rm openclaw-cli config set --batch-json '[{"path":"gateway.mode","value":"local"},{"path":"gateway.bind","value":"lan"}]'
    docker compose run --rm openclaw-cli devices list --url ws://127.0.0.1:18789
    ```

  </Accordion>
</AccordionGroup>

## Relacionado

- [Install Overview](/es/install) — todos los métodos de instalación
- [Podman](/es/install/podman) — Alternativa a Podman para Docker
- [ClawDock](/es/install/clawdock) — Configuración comunitaria de Docker Compose
- [Actualización](/es/install/updating) — mantener OpenClaw actualizado
- [Configuración](/es/gateway/configuration) — configuración de la puerta de enlace después de la instalación
