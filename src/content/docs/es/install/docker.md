---
summary: "Configuración e incorporación opcionales basadas en Docker para OpenClaw"
read_when:
  - You want a containerized gateway instead of local installs
  - You are validating the Docker flow
title: "Docker"
---

Docker es **opcional**. Úselo solo si desea una puerta de enlace contenerizada o para validar el flujo de Docker.

## ¿Es Docker adecuado para mí?

- **Sí**: desea un entorno de puerta de enlace aislado y desechable o ejecutar OpenClaw en un host sin instalaciones locales.
- **No**: está ejecutando en su propia máquina y solo desea el bucle de desarrollo más rápido. Use el flujo de instalación normal en su lugar.
- **Nota sobre el aislamiento**: el backend de sandbox predeterminado utiliza Docker cuando el aislamiento está habilitado, pero el aislamiento está desactivado de forma predeterminada y **no** requiere que la puerta de enlace completa se ejecute en Docker. También están disponibles los backends de sandbox SSH y OpenShell. Consulte [Sandboxing](/es/gateway/sandboxing).

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

    Esto construye la imagen de la puerta de enlace localmente. Para utilizar una imagen precompilada en su lugar:

    ```bash
    export OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
    ./scripts/docker/setup.sh
    ```

    Las imágenes precompiladas se publican en el
    [GitHub Container Registry](https://github.com/openclaw/openclaw/pkgs/container/openclaw).
    Etiquetas comunes: `main`, `latest`, `<version>` (p. ej., `2026.2.26`).

  </Step>

  <Step title="Completar la incorporación">
    El script de configuración ejecuta la incorporación automáticamente. Esto:

    - solicitará las claves de API del proveedor
    - generará un token de puerta de enlace y lo escribirá en `.env`
    - creará el directorio de clave secreta del perfil de autenticación
    - iniciará la puerta de enlace a través de Docker Compose

    Durante la configuración, la incorporación previa al inicio y la escritura de configuración se ejecutan a través de
    `openclaw-gateway` directamente. `openclaw-cli` es para comandos que ejecuta después
    de que el contenedor de la puerta de enlace ya existe.

  </Step>

  <Step title="Abrir la interfaz de usuario de control">
    Abra `http://127.0.0.1:18789/` en su navegador y pegue el secreto compartido
    configurado en Configuración. El script de configuración escribe un token en `.env` de
    forma predeterminada; si cambia la configuración del contenedor a autenticación por contraseña, utilice esa
    contraseña en su lugar.

    ¿Necesita la URL de nuevo?

    ```bash
    docker compose run --rm openclaw-cli dashboard --no-open
    ```

  </Step>

  <Step title="Configurar canales (opcional)">
    Use el contenedor de la CLI para añadir canales de mensajería:

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

<Note>Ejecute `docker compose` desde la raíz del repositorio. Si habilitó `OPENCLAW_EXTRA_MOUNTS` o `OPENCLAW_HOME_VOLUME`, el script de configuración escribe `docker-compose.extra.yml`; inclúyalo después de cualquier archivo de anulación estándar, por ejemplo `-f docker-compose.yml -f docker-compose.override.yml -f docker-compose.extra.yml` cuando existen ambos archivos de anulación.</Note>

<Note>Debido a que `openclaw-cli` comparte el espacio de nombres de red de `openclaw-gateway`, es una herramienta posterior al inicio. Antes de `docker compose up -d openclaw-gateway`, ejecute la incorporación y escrituras de configuración de tiempo de configuración a través de `openclaw-gateway` con `--no-deps --entrypoint node`.</Note>

### Variables de entorno

El script de configuración acepta estas variables de entorno opcionales:

| Variable                                   | Propósito                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_IMAGE`                           | Usar una imagen remota en lugar de compilar localmente                                                    |
| `OPENCLAW_IMAGE_APT_PACKAGES`              | Instalar paquetes apt adicionales durante la compilación (separados por espacios)                         |
| `OPENCLAW_IMAGE_PIP_PACKAGES`              | Instalar paquetes adicionales de Python durante la compilación (separados por espacios)                   |
| `OPENCLAW_EXTENSIONS`                      | Preinstalar dependencias de complementos en el momento de la compilación (nombres separados por espacios) |
| `OPENCLAW_EXTRA_MOUNTS`                    | Montajes de enlace de host adicionales (`source:target[:opts]` separados por comas)                       |
| `OPENCLAW_HOME_VOLUME`                     | Persistir `/home/node` en un volumen de Docker con nombre                                                 |
| `OPENCLAW_SANDBOX`                         | Optar por el arranque del entorno limitado (sandbox) (`1`, `true`, `yes`, `on`)                           |
| `OPENCLAW_SKIP_ONBOARDING`                 | Omitir el paso de incorporación interactivo (`1`, `true`, `yes`, `on`)                                    |
| `OPENCLAW_DOCKER_SOCKET`                   | Anular la ruta del socket de Docker                                                                       |
| `OPENCLAW_DISABLE_BONJOUR`                 | Desactivar la publicidad de Bonjour/mDNS (por defecto es `1` para Docker)                                 |
| `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS` | Desactivar las superposiciones de montaje de enlace de código fuente de complementos incluidos            |
| `OTEL_EXPORTER_OTLP_ENDPOINT`              | Punto de conexión del recolector OTLP/HTTP compartido para la exportación de OpenTelemetry                |
| `OTEL_EXPORTER_OTLP_*_ENDPOINT`            | Endpoints OTLP específicos de la señal para trazas, métricas o registros                                  |
| `OTEL_EXPORTER_OTLP_PROTOCOL`              | Invalidación del protocolo OTLP. Actualmente solo se admite `http/protobuf`                               |
| `OTEL_SERVICE_NAME`                        | Nombre del servicio utilizado para los recursos de OpenTelemetry                                          |
| `OTEL_SEMCONV_STABILITY_OPT_IN`            | Optar por los últimos atributos semánticos experimentales de GenAI                                        |
| `OPENCLAW_OTEL_PRELOADED`                  | Omitir el inicio de un segundo SDK de OpenTelemetry cuando ya hay uno precargado                          |

La imagen oficial de Docker no incluye Homebrew. Durante la incorporación, OpenClaw
oculta los instaladores de dependencias de habilidades que solo usan brew cuando se ejecuta en un contenedor
Linux sin `brew`; esas dependencias deben ser proporcionadas por una imagen personalizada
o instaladas manualmente. Para dependencias disponibles desde paquetes Debian, use
`OPENCLAW_IMAGE_APT_PACKAGES` durante la construcción de la imagen. El nombre heredado
`OPENCLAW_DOCKER_APT_PACKAGES` todavía se acepta.
Para dependencias de Python, use `OPENCLAW_IMAGE_PIP_PACKAGES`. Esto ejecuta
`python3 -m pip install --break-system-packages` durante la construcción de la imagen, por lo que debe fijar
las versiones de los paquetes y usar solo los índices de paquetes que confíe.

Los mantenedores pueden probar el código fuente del complemento incluido contra una imagen empaquetada montando
un directorio de origen del complemento sobre su ruta de origen empaquetada, por ejemplo
`OPENCLAW_EXTRA_MOUNTS=/path/to/fork/extensions/synology-chat:/app/extensions/synology-chat:ro`.
Ese directorio de origen montado anula el paquete compilado `/app/dist/extensions/synology-chat` correspondiente para el mismo id de complemento.

### Observabilidad

La exportación de OpenTelemetry es saliente desde el contenedor Gateway hacia su recopilador
OTLP. No requiere un puerto Docker publicado. Si construye la imagen
localmente y desea que el exportador OpenTelemetry incluido esté disponible dentro de la imagen,
incluya sus dependencias de tiempo de ejecución:

```bash
export OPENCLAW_EXTENSIONS="diagnostics-otel"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4318"
export OTEL_SERVICE_NAME="openclaw-gateway"
./scripts/docker/setup.sh
```

Instale el complemento oficial `@openclaw/diagnostics-otel` de ClawHub en
las instalaciones empaquetadas de Docker antes de habilitar la exportación. Las imágenes personalizadas construidas desde el código fuente aún pueden
incluir el código fuente del complemento local con
`OPENCLAW_EXTENSIONS=diagnostics-otel`. Para habilitar la exportación, permita y habilite el
complemento `diagnostics-otel` en la configuración, luego configure
`diagnostics.otel.enabled=true` o use el ejemplo de configuración en [OpenTelemetry
export](/es/gateway/opentelemetry). Los encabezados de autenticación del recopilador se configuran a través de
`diagnostics.otel.headers`, no a través de variables de entorno de Docker.

Las métricas de Prometheus utilizan el puerto del Gateway ya publicado. Instale
`clawhub:@openclaw/diagnostics-prometheus`, habilite el complemento
`diagnostics-prometheus` y luego extraiga:

```text
http://<gateway-host>:18789/api/diagnostics/prometheus
```

La ruta está protegida por la autenticación del Gateway. No exponga un puerto público `/metrics` separado ni una ruta de proxy inverso sin autenticación. Consulte
[Métricas de Prometheus](/es/gateway/prometheus).

### Verificaciones de estado

Endpoints de sondas del contenedor (no se requiere autenticación):

```bash
curl -fsS http://127.0.0.1:18789/healthz   # liveness
curl -fsS http://127.0.0.1:18789/readyz     # readiness
```

La imagen de Docker incluye un `HEALTHCHECK` integrado que hace ping a `/healthz`.
Si las comprobaciones siguen fallando, Docker marca el contenedor como `unhealthy` y
los sistemas de orquestación pueden reiniciarlo o reemplazarlo.

Instantánea de estado profundo autenticado:

```bash
docker compose exec openclaw-gateway node dist/index.js health --token "$OPENCLAW_GATEWAY_TOKEN"
```

### LAN vs loopback

`scripts/docker/setup.sh` es `OPENCLAW_GATEWAY_BIND=lan` de manera predeterminada, por lo que el acceso del host a
`http://127.0.0.1:18789` funciona con la publicación de puertos de Docker.

- `lan` (predeterminado): el navegador del host y la CLI del host pueden alcanzar el puerto del gateway publicado.
- `loopback`: solo los procesos dentro del espacio de nombres de red del contenedor pueden alcanzar
  el gateway directamente.

<Note>Use valores de modo de enlace en `gateway.bind` (`lan` / `loopback` / `custom` / `tailnet` / `auto`), no alias de host como `0.0.0.0` o `127.0.0.1`.</Note>

### Proveedores locales del host

Cuando OpenClaw se ejecuta en Docker, `127.0.0.1` dentro del contenedor es el contenedor
mismo, no su máquina host. Use `host.docker.internal` para proveedores de IA que
se ejecutan en el host:

| Proveedor | URL predeterminada del host | URL de configuración de Docker      |
| --------- | --------------------------- | ----------------------------------- |
| LM Studio | `http://127.0.0.1:1234`     | `http://host.docker.internal:1234`  |
| Ollama    | `http://127.0.0.1:11434`    | `http://host.docker.internal:11434` |

La configuración de Docker incluida utiliza esas URL del host como valores predeterminados para la incorporación de LM Studio y Ollama,
y `docker-compose.yml` asigna `host.docker.internal` al
puerta de enlace del host de Docker para el Docker Engine de Linux. Docker Desktop ya proporciona
el mismo nombre de host en macOS y Windows.

Los servicios del host también deben estar escuchando en una dirección accesible desde Docker:

```bash
lms server start --port 1234 --bind 0.0.0.0
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Si utiliza su propio archivo Compose o el comando `docker run`, agregue el mismo
mapeo de host usted mismo, por ejemplo
`--add-host=host.docker.internal:host-gateway`.

### Bonjour / mDNS

La red de puente de Docker generalmente no reenvía el multidifusión Bonjour/mDNS
(`224.0.0.251:5353`) de manera confiable. Por lo tanto, la configuración Compose incluida establece `OPENCLAW_DISABLE_BONJOUR=1` de forma predeterminada para que la Gateway no entre en un bucle de fallos o se reinicie repetidamente
el anuncio cuando el puente suelta tráfico multidifusión.

Utilice la URL de Gateway publicada, Tailscale o DNS-SD de área amplia para hosts Docker.
Establezca `OPENCLAW_DISABLE_BONJOUR=0` solo cuando se ejecute con red de host, macvlan,
u otra red donde se sepa que el multidifusión mDNS funciona.

Para ver problemas y solución de problemas, consulte [Descubrimiento Bonjour](/es/gateway/bonjour).

### Almacenamiento y persistencia

Docker Compose bind-mounts `OPENCLAW_CONFIG_DIR` en `/home/node/.openclaw`,
`OPENCLAW_WORKSPACE_DIR` en `/home/node/.openclaw/workspace`, y
`OPENCLAW_AUTH_PROFILE_SECRET_DIR` en `/home/node/.config/openclaw`, por lo que esas
rutas sobreviven al reemplazo del contenedor. Cuando cualquier variable no está establecida, el archivo incluido
`docker-compose.yml` recurre bajo `${HOME}`, o `/tmp` cuando `HOME` en sí mismo
también falta. Esto evita que `docker compose up` emita una especificación de volumen
con fuente vacía en entornos básicos.

Ese directorio de configuración montado es donde OpenClaw mantiene:

- `openclaw.json` para la configuración de comportamiento
- `agents/<agentId>/agent/auth-profiles.json` para la autenticación OAuth/clave de API del proveedor almacenada
- `.env` para secretos de tiempo de ejecución respaldados por variables de entorno como `OPENCLAW_GATEWAY_TOKEN`

El directorio de clave secreta del perfil de autenticación almacena la clave de cifrado local utilizada para
el material del token del perfil de autenticación respaldado por OAuth. Manténgala con el estado de su host Docker,
pero separada de `OPENCLAW_CONFIG_DIR`.

Los complementos descargables instalados almacenan su estado de paquete bajo el directorio
inicio de OpenClaw montado, por lo que los registros de instalación del complemento y las raíces del paquete sobreviven al
reemplazo del contenedor. El inicio de Gateway no genera árboles de dependencias de complementos incluidos.

Para obtener detalles completos sobre la persistencia en implementaciones de VM, consulte
[Docker VM Runtime - What persists where](/es/install/docker-vm-runtime#what-persists-where).

**Puntos calientes de crecimiento del disco:** vigile `media/`, archivos JSONL de sesión,
`cron/runs/*.jsonl`, raíces de paquetes de plugins instalados y registros de archivos rotativos
bajo `/tmp/openclaw/`.

### Auxiliares de shell (opcionales)

Para una gestión diaria de Docker más fácil, instale `ClawDock`:

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Si instaló ClawDock desde la ruta `scripts/shell-helpers/clawdock-helpers.sh` antigua, vuelva a ejecutar el comando de instalación anterior para que su archivo auxiliar local rastree la nueva ubicación.

Luego use `clawdock-start`, `clawdock-stop`, `clawdock-dashboard`, etc. Ejecute
`clawdock-help` para todos los comandos.
Consulte [ClawDock](/es/install/clawdock) para obtener la guía completa de auxiliares.

<AccordionGroup>
  <Accordion title="Enable agent sandbox for Docker gateway">
    ```bash
    export OPENCLAW_SANDBOX=1
    ./scripts/docker/setup.sh
    ```

    Ruta de socket personalizada (por ejemplo, Docker sin privilegios):

    ```bash
    export OPENCLAW_SANDBOX=1
    export OPENCLAW_DOCKER_SOCKET=/run/user/1000/docker.sock
    ./scripts/docker/setup.sh
    ```

    El script monta `docker.sock` solo después de que se cumplan los requisitos previos del sandbox. Si
    la configuración del sandbox no puede completarse, el script restablece `agents.defaults.sandbox.mode`
    a `off`. Los turnos en modo de código de Codex siguen restringidos a Codex
    `workspace-write` mientras el sandbox de OpenClaw está activo; no monte el
    socket Docker del host en contenedores del sandbox del agente.

  </Accordion>

  <Accordion title="Automation / CI (non-interactive)">
    Deshabilite la asignación de pseudo-TTY de Compose con `-T`:

    ```bash
    docker compose run -T --rm openclaw-cli gateway probe
    docker compose run -T --rm openclaw-cli devices list --json
    ```

  </Accordion>

<Accordion title="Nota de seguridad de red compartida">
  `openclaw-cli` usa `network_mode: "service:openclaw-gateway"` para que los comandos de la CLI puedan alcanzar la puerta de enlace a través de `127.0.0.1`. Trate esto como un límite de confianza compartido. La configuración de compose elimina `NET_RAW`/`NET_ADMIN` y habilita `no-new-privileges` tanto en `openclaw-gateway` como en `openclaw-cli`.
</Accordion>

  <Accordion title="Fallos de DNS de Docker Desktop en openclaw-cli">
    Algunas configuraciones de Docker Desktop fallan en las búsquedas de DNS desde el sidecar
    `openclaw-cli` de red compartida después de que se elimina `NET_RAW`, lo que se manifiesta como
    `EAI_AGAIN` durante los comandos respaldados por npm como `openclaw plugins install`.
    Mantenga el archivo compose reforzado predeterminado para el funcionamiento normal de la puerta de enlace. La
    sustitución local a continuación relaja la postura de seguridad del contenedor de la CLI
    restaurando las capacidades predeterminadas de Docker, así que úsela solo para el comando de la CLI
    ocasional que necesita acceso al registro de paquetes, no como su invocación
    predeterminada de Compose:

    ```bash
    printf '%s\n' \
      'services:' \
      '  openclaw-cli:' \
      '    cap_drop: !reset []' \
      > docker-compose.cli-no-dropped-caps.local.yml

    docker compose -f docker-compose.yml -f docker-compose.cli-no-dropped-caps.local.yml run --rm openclaw-cli plugins install <package>
    ```

    Si ya creó un contenedor `openclaw-cli` de larga ejecución, vuelva a crearlo
    con la misma sustitución. `docker compose exec` y `docker exec` no pueden
    cambiar las capacidades de Linux en un contenedor ya creado.

  </Accordion>

  <Accordion title="Permisos y EACCES">
    La imagen se ejecuta como `node` (uid 1000). Si ves errores de permisos en
    `/home/node/.openclaw`, asegúrate de que tus montajes de enlace del host sean propiedad del uid 1000:

    ```bash
    sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
    ```

    La misma discrepancia puede aparecer como una advertencia de complemento tal como
    `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
    seguida de `plugin present but blocked`. Eso significa que el uid del proceso y el
    propietario del directorio del complemento montado no coinciden. Se prefiere ejecutar el contenedor como el
    uid 1000 predeterminado y corregir la propiedad del montaje de enlace. Solo ejecuta chown
    `/path/to/openclaw-config/npm` a `root:root` si ejecutas intencionalmente
    OpenClaw como root a largo plazo.

  </Accordion>

  <Accordion title="Reconstrucciones más rápidas">
    Ordena tu Dockerfile para que las capas de dependencias se almacenen en caché. Esto evita volver a ejecutar
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
    2. **Incluir dependencias del sistema**: `export OPENCLAW_IMAGE_APT_PACKAGES="git curl jq"`
    3. **Incluir dependencias de Python**: `export OPENCLAW_IMAGE_PIP_PACKAGES="requests==2.32.5 humanize==4.14.0"`
    4. **Incluir Playwright Chromium**: `export OPENCLAW_INSTALL_BROWSER=1`
    5. **O instalar los navegadores de Playwright en un volumen persistente**:
       ```bash
       docker compose run --rm openclaw-cli \
         node /app/node_modules/playwright-core/cli.js install chromium
       ```
    6. **Persistir las descargas del navegador**: usa `OPENCLAW_HOME_VOLUME` o
       `OPENCLAW_EXTRA_MOUNTS`. OpenClaw detecta automáticamente el Chromium
       administrado por Playwright de la imagen Docker en Linux.

  </Accordion>

<Accordion title="OAuth de OpenAI Codex (Docker sin cabeza)">Si eliges OAuth de OpenAI Codex en el asistente, abre una URL del navegador. En configuraciones de Docker o sin cabeza, copia la URL de redireccionamiento completa donde aterrices y pégala de nuevo en el asistente para finalizar la autenticación.</Accordion>

  <Accordion title="Metadatos de la imagen base">
    La imagen de tiempo de ejecución principal de Docker usa `node:24-bookworm-slim` e incluye `tini` como proceso de init de entrada (PID 1) para asegurar que los procesos zombie sean recogidos y las señales se manejen correctamente en contenedores de larga duración. Publica anotaciones de imagen base OCI incluyendo `org.opencontainers.image.base.name`,
    `org.opencontainers.image.source`, y otras. El resumen base de Node se
    actualiza a través de PRs de imagen base Docker de Dependabot; las compilaciones de lanzamiento no ejecutan
    una capa de actualización de distribución. Consulte
    [OCI image annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md).
  </Accordion>
</AccordionGroup>

### ¿Ejecutando en un VPS?

Consulte [Hetzner (Docker VPS)](/es/install/hetzner) y
[Docker VM Runtime](/es/install/docker-vm-runtime) para los pasos de implementación en VM compartida
incluyendo la creación de binarios, persistencia y actualizaciones.

## Sandbox del agente

Cuando `agents.defaults.sandbox` está habilitado con el backend de Docker, la puerta de enlace
ejecuta la ejecución de herramientas del agente (shell, lectura/escritura de archivos, etc.) dentro de contenedores Docker
aislados mientras que la puerta de enlace misma se mantiene en el host. Esto le da un muro sólido
alrededor de sesiones de agente que no son de confianza o multiinquilino sin contenedorizar toda la
puerta de enlace.

El ámbito del sandbox puede ser por agente (predeterminado), por sesión o compartido. Cada ámbito
obtiene su propio espacio de trabajo montado en `/workspace`. También puede configurar
políticas de herramientas de permitir/denegar, aislamiento de red, límites de recursos y contenedores
del navegador.

Para la configuración completa, imágenes, notas de seguridad y perfiles de múltiples agentes, consulte:

- [Sandboxing](/es/gateway/sandboxing) -- referencia completa del sandbox
- [OpenShell](/es/gateway/openshell) -- acceso interactivo de shell a los contenedores del sandbox
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

Construya la imagen de sandbox predeterminada (desde una verificación de fuente):

```bash
scripts/sandbox-setup.sh
```

Para instalaciones de npm sin una verificación de fuente, consulte [Sandboxing § Images and setup](/es/gateway/sandboxing#images-and-setup) para comandos en línea `docker build`.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Imagen faltante o contenedor de espacio aislado no se inicia">
    Construya la imagen del espacio aislado con
    [`scripts/sandbox-setup.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/sandbox-setup.sh)
    (source checkout) o el comando en línea `docker build` de [Sandboxing § Imágenes y configuración](/es/gateway/sandboxing#images-and-setup) (npm install),
    o establezca `agents.defaults.sandbox.docker.image` en su imagen personalizada.
    Los contenedores se crean automáticamente por sesión bajo demanda.
  </Accordion>

<Accordion title="Errores de permisos en el espacio aislado">Establezca `docker.user` en un UID:GID que coincida con la propiedad de su espacio de trabajo montado, o ejecute chown en la carpeta del espacio de trabajo.</Accordion>

<Accordion title="Herramientas personalizadas no encontradas en el espacio aislado">OpenClaw ejecuta comandos con `sh -lc` (shell de inicio de sesión), lo que hace sourcing de `/etc/profile` y puede restablecer PATH. Establezca `docker.env.PATH` para anteponer sus rutas de herramientas personalizadas, o agregue un script bajo `/etc/profile.d/` en su Dockerfile.</Accordion>

<Accordion title="OOM-killed durante la construcción de la imagen (salida 137)">La VM necesita al menos 2 GB de RAM. Use una clase de máquina más grande y vuelva a intentarlo.</Accordion>

  <Accordion title="No autorizado o emparejamiento requerido en la UI de Control">
    Obtenga un enlace fresco del tablero y apruebe el dispositivo del navegador:

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

- [Resumen de instalación](/es/install) — todos los métodos de instalación
- [Podman](/es/install/podman) — alternativa Podman a Docker
- [ClawDock](/es/install/clawdock) — configuración comunitaria de Docker Compose
- [Actualización](/es/install/updating) — manteniendo OpenClaw actualizado
- [Configuración](/es/gateway/configuration) — configuración de la puerta de enlace después de la instalación
