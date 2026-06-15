---
summary: "Preguntas frecuentes sobre la configuración, uso y configuración de OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "Preguntas frecuentes"
---

Respuestas rápidas y solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error de modelos). Para el diagnóstico en tiempo de ejecución, consulte [Solución de problemas](/es/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/es/gateway/configuration).

## Primeros 60 segundos si algo está roto

1. **Estado rápido (primera comprobación)**

   ```bash
   openclaw status
   ```

   Resumen local rápido: SO + actualización, accesibilidad de puerta de enlace/servicio, agentes/sesiones, configuración del proveedor + problemas de tiempo de ejecución (cuando la puerta de enlace es accesible).

2. **Informe copiable (seguro para compartir)**

   ```bash
   openclaw status --all
   ```

   Diagnóstico de solo lectura con el final del registro (tokens redactados).

3. **Demonio + estado del puerto**

   ```bash
   openclaw gateway status
   ```

   Muestra el tiempo de ejecución del supervisor frente a la accesibilidad RPC, la URL de destino de la sonda y qué configuración usó probablemente el servicio.

4. **Sondas profundas**

   ```bash
   openclaw status --deep
   ```

   Ejecuta una prueba de estado de la puerta de enlace en vivo, incluyendo pruebas de canal cuando es compatible
   (requiere una puerta de enlace accesible). Consulte [Salud](/es/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si RPC está caído, recurrir a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivos son independientes de los registros del servicio; consulte [Registro](/es/logging) y [Solución de problemas](/es/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra el estado/configuración + ejecuta comprobaciones de estado. Consulte [Doctor](/es/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Solicita a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Salud](/es/gateway/health).

## Inicio rápido y configuración de primera ejecución

Preguntas y respuestas de la primera ejecución — instalación, incorporación, rutas de autenticación, suscripciones, fallos iniciales —
residen en las [Preguntas frecuentes de la primera ejecución](/es/help/faq-first-run).

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un párrafo?">
    OpenClaw es un asistente de IA personal que ejecuta en sus propios dispositivos. Responde en las superficies de mensajería que ya utiliza (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat y complementos de canal incluidos como QQ Bot) y también puede hacer voz + un Canvas en vivo en plataformas compatibles. La **Puerta de enlace** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Propuesta de valor">
    OpenClaw no es "simplemente un envoltorio de Claude". Es un **plano de control local-first** que te permite ejecutar un
    asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
    sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un
    SaaS alojado.

    Destacados:

    - **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
      espacio de trabajo + historial de sesiones localmente.
    - **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      más voz móvil y Canvas en plataformas compatibles.
    - **Agnóstico al modelo:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      y conmutación por error por agente.
    - **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
    - **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y configuraciones predeterminadas.
    - **Código abierto y modificable:** inspecciona, extiende y autoaloja sin bloqueo de proveedor.

    Documentación: [Gateway](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
    [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo: ¿qué debería hacer primero?">
    Buenos primeros proyectos:

    - Construir un sitio web (WordPress, Shopify o un sitio estático simple).
    - Prototipar una aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw?">
    Los logros cotidianos generalmente se ven así:

    - **Briefings personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que te interesan.
    - **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** empujones y listas de verificación impulsados por cron o latidos.
    - **Automatización del navegador:** llenar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** enviar una tarea desde tu teléfono, dejar que el Gateway la ejecute en un servidor y recibir el resultado de vuelta en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de clientes, prospección, anuncios y blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de correos de prospección o anuncios.

    Para **campañas de prospección o anuncios**, mantén a un humano en el bucle. Evita el spam, cumple las leyes locales y
    las políticas de la plataforma, y revisa todo antes de enviarlo. El patrón más seguro es dejar que
    OpenClaw redacte y tú apruebes.

    Documentos: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo de IDE. Usa
    Claude Code o Codex para el bucle de codificación directa más rápido dentro de un repositorio. Usa OpenClaw cuando quieras
    memoria duradera, acceso entre dispositivos y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, ganchos)
    - **Gateway siempre activo** (ejecutar en un VPS, interactuar desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin ensuciar el repositorio?">
    Use anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añada una carpeta mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, por lo que las anulaciones administradas siguen ganando a las habilidades empaquetadas sin tocar git. Si necesita que la habilidad esté instalada globalmente pero solo sea visible para algunos agentes, mantenga la copia compartida en `~/.openclaw/skills` y controle la visibilidad con `agents.defaults.skills` y `agents.list[].skills`. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Añada directorios adicionales mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de manera predeterminada, lo que OpenClaw trata como `<workspace>/skills` en la siguiente sesión. Si la habilidad solo debe ser visible para ciertos agentes, combínelo con `agents.defaults.skills` o `agents.list[].skills`.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos o configuraciones para diferentes tareas?">
    Hoy los patrones compatibles son:

    - **Cron jobs**: los trabajos aislados pueden establecer una anulación de `model` por trabajo.
    - **Agentes**: enruta tareas a agentes separados con diferentes modelos predeterminados, niveles de pensamiento y parámetros de transmisión.
    - **Cambio bajo demanda**: usa `/model` para cambiar el modelo de la sesión actual en cualquier momento.

    Por ejemplo, usa el mismo modelo con diferentes configuraciones por agente:

    ```json5
    {
      agents: {
        list: [
          {
            id: "coder",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "high",
            params: { temperature: 0.1 },
          },
          {
            id: "chat",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "off",
            params: { temperature: 0.8 },
          },
        ],
      },
    }
    ```

    Pon los valores predeterminados compartidos por modelo en `agents.defaults.models["provider/model"].params`, luego pon las anulaciones específicas del agente en `agents.list[].params` plano. No definas entradas `agents.list[].models["provider/model"].params` anidadas separadas para el mismo modelo; `agents.list[].models` es para el catálogo de modelos por agente y anulaciones en tiempo de ejecución.

    Consulta [Cron jobs](/es/automation/cron-jobs), [Enrutamiento multiagente](/es/concepts/multi-agent), [Configuración](/es/gateway/config-agents) y [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza un trabajo pesado. ¿Cómo puedo externalizar eso?">
    Usa **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen tu chat principal receptivo.

    Pide a tu bot que "genere un sub-agente para esta tarea" o usa `/subagents`.
    Usa `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, establece un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentos: [Sub-agentes](/es/tools/subagents), [Tareas en segundo plano](/es/automation/tasks).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de subagentes vinculadas a hilos en Discord?">
    Utilice enlaces de hilos. Puede vincular un hilo de Discord a un subagente o un objetivo de sesión para que los mensajes de seguimiento en ese hilo permanezcan en esa sesión vinculada.

    Flujo básico:

    - Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para un seguimiento persistente).
    - O vincule manualmente con `/focus <target>`.
    - Use `/agents` para inspeccionar el estado del vínculo.
    - Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el auto-desenfoque.
    - Use `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Sobrescrituras de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Vinculación automática al generar: `channels.discord.threadBindings.spawnSessions` se predetermina a `true`; establézcalo en `false` para desactivar la generación de sesiones vinculadas a hilos.

    Documentación: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="Un subagente terminó, pero la actualización de finalización fue al lugar incorrecto o nunca se publicó. ¿Qué debería comprobar?">
    Primero verifique la ruta del solicitante resuelta:

    - La entrega de subagente en modo de finalización prefiere cualquier ruta de hilo o conversación vinculada cuando existe una.
    - Si el origen de finalización solo lleva un canal, OpenClaw recurre a la ruta almacenada de la sesión del solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa aún pueda tener éxito.
    - Si no existe una ruta vinculada ni una ruta almacenada utilizable, la entrega directa puede fallar y el resultado recurre a la entrega de sesión en cola en lugar de publicarse inmediatamente en el chat.
    - Los objetivos inválidos o obsoletos aún pueden forzar la reversión a la cola o el fallo final de la entrega.
    - Si la última respuesta visible del asistente del hijo es el token silencioso exacto `NO_REPLY` / `no_reply`, o exactamente `ANNOUNCE_SKIP`, OpenClaw suprime intencionalmente el anuncio en lugar de publicar un progreso anterior obsoleto.
    - La salida de herramienta/toolResult no se promueve al texto de resultado del hijo; el resultado es la última respuesta visible del asistente del hijo.

    Depuración:

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentación: [Sub-agentes](/es/tools/subagents), [Tareas en segundo plano](/es/automation/tasks), [Herramientas de sesión](/es/concepts/session-tool).

  </Accordion>

  <Accordion title="Cron o recordatorios no se activan. ¿Qué debería comprobar?">
    Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    los trabajos programados no se ejecutarán.

    Lista de verificación:

    - Confirme que cron está habilitado (`cron.enabled`) y `OPENCLAW_SKIP_CRON` no está establecido.
    - Compruebe que el Gateway está funcionando 24/7 (sin suspensiones/reinicios).
    - Verifique la configuración de zona horaria para el trabajo (`--tz` vs zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Trabajos de Cron](/es/automation/cron-jobs), [Automatización](/es/automation).

  </Accordion>

  <Accordion title="Se disparó el cron, pero no se envió nada al canal. ¿Por qué?">
    Primero verifique el modo de entrega:

    - `--no-deliver` / `delivery.mode: "none"` significa que no se espera un envío de reserva por parte del ejecutor.
    - Un destino de anuncio faltante o no válido (`channel` / `to`) significa que el ejecutor omitió la entrega saliente.
    - Los fallos de autenticación del canal (`unauthorized`, `Forbidden`) significan que el ejecutor intentó entregar pero las credenciales lo bloquearon.
    - Un resultado aislado silencioso (solo `NO_REPLY` / `no_reply`) se trata como no entregable intencionalmente, por lo que el ejecutor también suprime la entrega de reserva en cola.

    Para trabajos cron aislados, el agente aún puede enviar directamente con la herramienta `message` cuando hay una ruta de chat disponible. `--announce` solo controla la ruta de reserva del ejecutor para el texto final que el agente aún no ha enviado.

    Depuración:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentos: [Cron jobs](/es/automation/cron-jobs), [Background Tasks](/es/automation/tasks).

  </Accordion>

  <Accordion title="¿Por qué una ejecución de cron aislada cambió de modelos o reintentó una vez?">
    Esa suele ser la ruta de cambio de modelo en vivo, no una programación duplicada.

    El cron aislado puede persistir un cambio de modelo en tiempo de ejecución y reintentar cuando la ejecución activa lanza `LiveSessionModelSwitchError`. El reintento mantiene el proveedor/modelo cambiado, y si el cambio llevó una nueva anulación de perfil de autenticación, el cron también lo persiste antes de reintentar.

    Reglas de selección relacionadas:

    - La anulación del modelo del enlace de Gmail gana primero cuando es aplicable.
    - Luego por trabajo `model`.
    - Luego cualquier anulación de modelo de sesión de cron almacenada.
    - Luego la selección normal de modelo del agente/predeterminado.

    El bucle de reintento está limitado. Después del intento inicial más 2 reintentos de cambio, el cron aborta en lugar de bucle infinito.

    Depuración:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentos: [Cron jobs](/es/automation/cron-jobs), [cron CLI](/es/cli/cron).

  </Accordion>

  <Accordion title="¿Cómo instalo habilidades en Linux?">
    Utilice comandos nativos de `openclaw skills` o coloque las habilidades en su espacio de trabajo. La interfaz de usuario de habilidades de macOS no está disponible en Linux.
    Explore habilidades en [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills install <skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    El `openclaw skills install` nativo escribe en el directorio del espacio de trabajo activo `skills/`
    de forma predeterminada. Agregue `--global` para instalar en el directorio de habilidades compartidas administradas
    para todos los agentes locales. Instale la CLI `clawhub` separada
    solo si desea publicar o sincronizar sus propias habilidades. Use
    `agents.defaults.skills` o `agents.list[].skills` si desea limitar
    qué agentes pueden ver las habilidades compartidas.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas según un programa o de forma continua en segundo plano?">
    Sí. Utilice el programador de Gateway:

    - **Trabajos Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Latido (Heartbeat)** para comprobaciones periódicas de la "sesión principal".
    - **Trabajos aislados** para agentes autónomos que publican resúmenes o envían a chats.

    Documentación: [Trabajos Cron](/es/automation/cron-jobs), [Automatización](/es/automation),
    [Latido](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están controladas por `metadata.openclaw.os` además de los binarios necesarios, y las habilidades solo aparecen en el prompt del sistema cuando son elegibles en el **host de la Gateway (pasarela)**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anules el control de acceso.

    Tienes tres patrones admitidos:

    **Opción A: ejecutar la Gateway en un Mac (lo más sencillo).**
    Ejecuta la Gateway donde existen los binarios de macOS, luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host de la Gateway es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta la Gateway en Linux, empareja un nodo macOS (aplicación de la barra de menús) y establece **Node Run Commands** (Ejecutar comandos de nodo) en "Always Ask" (Preguntar siempre) o "Always Allow" (Permitir siempre) en el Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios necesarios existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Preguntar siempre", aprobar "Permitir siempre" en el prompt añade ese comando a la lista de permitidos.

    **Opción C: hacer proxy de los binarios de macOS a través de SSH (avanzado).**
    Mantén la Gateway en Linux, pero haz que los binarios de CLI necesarios resuelvan a envoltorios SSH que se ejecutan en un Mac. Luego anula la habilidad para permitir Linux de modo que permanezca elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Coloca el envoltorio en `PATH` en el host de Linux (por ejemplo `~/bin/memo`).
    3. Anula los metadatos de la habilidad (espacio de trabajo o `~/.openclaw/skills`) para permitir Linux:

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. Inicia una nueva sesión para que se actualice la instantánea de habilidades.

  </Accordion>

  <Accordion title="¿Tienen una integración con Notion o HeyGen?">
    No está integrado de forma nativa hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** es lo mejor para un acceso confiable a la API (tanto Notion como HeyGen tienen APIs).
    - **Automatización del navegador:** funciona sin código, pero es más lento y más frágil.

    Si desea mantener el contexto por cliente (flujos de trabajo de agencias), un patrón sencillo es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pida al agente que obtenga esa página al inicio de una sesión.

    Si desea una integración nativa, abra una solicitud de función o cree una habilidad
    dirigida a esas APIs.

    Instalar habilidades:

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Las instalaciones nativas se ubican en el directorio del espacio de trabajo activo `skills/`. Para habilidades compartidas entre todos los agentes locales, use `openclaw skills install <slug> --global` (o colóquelas manualmente en `~/.openclaw/skills/<name>/SKILL.md`). Si solo algunos agentes deben ver una instalación compartida, configure `agents.defaults.skills` o `agents.list[].skills`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulte la entrada de Homebrew Linux FAQ anterior). Consulte [Skills](/es/tools/skills), [Skills config](/es/tools/skills-config) y [ClawHub](/es/tools/clawhub).

  </Accordion>

  <Accordion title="¿Cómo uso mi Chrome existente con la sesión iniciada con OpenClaw?">
    Use el perfil de navegador `user` integrado, que se adjunta a través de Chrome DevTools MCP:

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si desea un nombre personalizado, cree un perfil MCP explícito:

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Esta ruta puede usar el navegador host local o un nodo de navegador conectado. Si la Gateway se ejecuta en otro lugar, ejecute un host de nodo en la máquina del navegador o use CDP remoto en su lugar.

    Límites actuales en `existing-session` / `user`:

    - las acciones están basadas en referencias, no en selectores CSS
    - las cargas requieren `ref` / `inputRef` y actualmente admiten un archivo a la vez
    - `responsebody`, exportación de PDF, intercepción de descargas y acciones por lotes aún necesitan un navegador administrado o un perfil CDP sin procesar

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Existe un documento dedicado al sandboxing?">
    Sí. Consulte [Sandboxing](/es/gateway/sandboxing). Para la configuración específica de Docker (puerta de enlace completa en Docker o imágenes de sandbox), consulte [Docker](/es/install/docker).
  </Accordion>

  <Accordion title="Docker se siente limitado: ¿cómo habilito todas las funciones?">
    La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
    paquetes del sistema, Homebrew ni navegadores integrados. Para una configuración más completa:

    - Mantenga `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Integre dependencias del sistema en la imagen con `OPENCLAW_IMAGE_APT_PACKAGES`.
    - Instale los navegadores Playwright a través de la CLI incluida:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Configure `PLAYWRIGHT_BROWSERS_PATH` y asegúrese de que la ruta se mantenga.

    Documentación: [Docker](/es/install/docker), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MDs personales pero hacer que los grupos sean públicos/sandboxed con un agente?">
    Sí, siempre que su tráfico privado sean los **MDs** y su tráfico público sean los **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en el backend de sandbox configurado, mientras que la sesión principal de MD se mantiene en el host. Docker es el backend predeterminado si no elige uno. Luego, restrinja las herramientas disponibles en las sesiones de sandbox a través de `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración de la puerta de enlace](/es/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="¿Cómo vinculo una carpeta del host dentro del sandbox?">
    Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (por ejemplo, `"/home/user/src:/src:ro"`). Los vínculos globales + por agente se combinan; los vínculos por agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los vínculos saltan las paredes del sistema de archivos del sandbox.

    OpenClaw valida los orígenes de los vínculos tanto con la ruta normalizada como con la ruta canónica resuelta a través del ancestro existente más profundo. Eso significa que los escapes por enlace simbólico del padre todavía fallan cerrados incluso cuando el último segmento de la ruta todavía no existe, y las comprobaciones de raíz permitida todavía se aplican después de la resolución del enlace simbólico.

    Consulte [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.

  </Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son solo archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas curadas a largo plazo en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **flush de memoria silencioso pre-compacción** para recordar al modelo
    que escriba notas duraderas antes de la auto-compacción. Esto solo se ejecuta cuando el espacio de trabajo
    es escribible (los sandbox de solo lectura lo omiten). Consulte [Memory](/es/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que persista?">
    Pída al bot que **escriba el hecho en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

    Esto todavía es un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
    sabrá qué hacer. Si sigue olvidando, verifique que la Gateway esté usando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memory](/es/concepts/memory), [Agent workspace](/es/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
    almacenamiento, no el modelo. El **contexto de la sesión** todavía está limitado por la ventana de
    contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Es por eso que
    existe la búsqueda de memoria: recupera solo las partes relevantes al contexto.

    Documentos: [Memory](/es/concepts/memory), [Context](/es/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda de memoria semántica requiere una clave de API de OpenAI?">
    Solo si usas **embeddings de OpenAI**. Codex OAuth cubre el chat/completions y
    **no** otorga acceso a embeddings, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Los embeddings de
    OpenAI aún necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw usa embeddings de OpenAI. Las configuraciones
    heredadas que todavía dicen `memorySearch.provider = "auto"` también se resuelven a OpenAI.
    Si no hay ninguna clave de API de OpenAI disponible, la búsqueda de memoria semántica permanece no disponible
    hasta que configures una clave o elijas explícitamente otro proveedor.

    Si prefieres mantenerte local, establece `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres embeddings de Gemini, establece
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Admitimos modelos de embeddings **OpenAI, compatibles con OpenAI, Gemini,
    Voyage, Mistral, Bedrock, Ollama, LM Studio, GitHub Copilot, DeepInfra o locales**
    - consulta [Memory](/es/concepts/memory) para conocer los detalles de configuración.

  </Accordion>
</AccordionGroup>

## Dónde residen las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Todos los datos utilizados con OpenClaw se guardan localmente?">
    No - **el estado de OpenClaw es local**, pero **los servicios externos todavía ven lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de la puerta de enlace
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Controlas la huella:** el uso de modelos locales mantiene los mensajes (prompts) en tu máquina, pero el tráfico
      del canal todavía pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo se encuentra bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación heredada de OAuth (copiada en los perfiles de autenticación en el primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y opcionales `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga secreta opcional respaldada en archivo para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas estáticas `api_key` limpiadas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (ej. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                       |

    Ruta heredada de agente único: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben vivir los archivos AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos viven en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md`, `memory/YYYY-MM-DD.md` y opcional `HEARTBEAT.md`.
      El raíz en minúsculas `memory.md` es solo para entrada de reparación heredada; `openclaw doctor --fix`
      puede fusionarlo en `MEMORY.md` cuando ambos archivos existen.
    - **Directorio de estado (`~/.openclaw`)**: configuración, estado del canal/proveedor, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable a través de:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de un reinicio, confirme que el Gateway está usando el mismo
    espacio de trabajo en cada lanzamiento (y recuerde: el modo remoto usa el espacio de trabajo del **host del gateway**,
      no su computadora portátil local).

    Consejo: si desea un comportamiento o preferencia duradero, pida al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Vea [Agent workspace](/es/concepts/agent-workspace) y [Memory](/es/concepts/memory).

  </Accordion>

  <Accordion title="¿Puedo hacer SOUL.md más grande?">
    Sí. `SOUL.md` es uno de los archivos de arranque del espacio de trabajo que se inyectan en el
    contexto del agente. El límite de inyección predeterminado por archivo es de `20000` caracteres,
    y el presupuesto total de arranque entre archivos es de `60000` caracteres.

    Cambie los valores predeterminados compartidos en su configuración de OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          bootstrapMaxChars: 50000,
          bootstrapTotalMaxChars: 300000,
        },
      },
    }
    ```

    O anule un agente:

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            bootstrapMaxChars: 50000,
            bootstrapTotalMaxChars: 300000,
          },
        ],
      },
    }
    ```

    Use `/context` para verificar los tamaños brutos frente a los inyectados y si ocurrió truncamiento.
    Mantenga `SOUL.md` enfocado en la voz, la postura y la personalidad; ponga las reglas de operación
    en `AGENTS.md` y los hechos duraderos en la memoria.

    Consulte [Contexto](/es/concepts/context) y [Configuración del agente](/es/gateway/config-agents).

  </Accordion>

  <Accordion title="Estrategia de copia de seguridad recomendada">
    Ponga su **espacio de trabajo del agente** en un repositorio git **privado** y respáldelo en algún lugar
    privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
    y le permite restaurar la "mente" del asistente más tarde.

    **No** confíe nada bajo `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesita una restauración completa, respalde tanto el espacio de trabajo como el directorio de estado
    por separado (consulte la pregunta sobre migración anterior).

    Documentos: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo completamente OpenClaw?">Consulte la guía dedicada: [Desinstalación](/es/install/uninstall).</Accordion>

  <Accordion title="¿Pueden los agentes trabajar fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un espacio aislado estricto.
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el espacio aislado. Si necesita aislamiento, use
    [`agents.defaults.sandbox`](/es/gateway/sandboxing) o configuraciones de espacio aislado por agente. Si
    quiere que un repositorio sea el directorio de trabajo predeterminado, apunte el
    `workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantenga el
    espacio de trabajo separado a menos que intencionalmente quiera que el agente trabaje dentro de él.

    Ejemplo (repositorio como cwd predeterminado):

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Modo remoto: ¿dónde está el almacenamiento de sesión?">
    El estado de la sesión es propiedad del **host de la puerta de enlace**. Si está en modo remoto, el almacenamiento de sesión que le importa está en la máquina remota, no en su computadora portátil local. Consulte [Gestión de sesiones](/es/concepts/session).
  </Accordion>
</AccordionGroup>

## Conceptos básicos de configuración

<AccordionGroup>
  <Accordion title="¿Qué formato tiene la configuración? ¿Dónde está?">
    OpenClaw lee una configuración opcional de **JSON5** desde `$OPENCLAW_CONFIG_PATH` (predeterminado: `~/.openclaw/openclaw.json`):

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si falta el archivo, usa valores predeterminados relativamente seguros (incluido un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='Configuré gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la IU dice no autorizado'>
    Los enlaces no de bucle invertido (non-loopback) **requieren una ruta de autenticación de puerta de enlace válida**. En la práctica, esto significa:

    - autenticación de secreto compartido: token o contraseña
    - `gateway.auth.mode: "trusted-proxy"` detrás de un proxy inverso con reconocimiento de identidad configurado correctamente

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    Notas:

    - `gateway.remote.token` / `.password` **no** habilitan la autenticación de puerta de enlace local por sí mismos.
    - Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
    - Para la autenticación por contraseña, configure `gateway.auth.mode: "password"` más `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`) en su lugar.
    - Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente mediante SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de reserva remota).
    - Las configuraciones de IU de Control con secreto compartido se autentican mediante `connect.params.auth.token` o `connect.params.auth.password` (almacenados en la configuración de la aplicación/IU). Los modos con identidad, como Tailscale Serve o `trusted-proxy`, utilizan encabezados de solicitud en su lugar. Evite poner secretos compartidos en URL.
    - Con `gateway.auth.mode: "trusted-proxy"`, los proxies inversos de bucle invertido del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito y una entrada de bucle invertido en `gateway.trustedProxies`.

  </Accordion>

  <Accordion title="¿Por qué ahora necesito un token en localhost?">
    OpenClaw exige la autenticación de la puerta de enlace (gateway) de forma predeterminada, incluido el bucle local (loopback). En la ruta predeterminada normal, esto significa autenticación por token: si no se configura una ruta de autenticación explícita, el inicio de la puerta de enlace se resuelve en modo token y genera un token solo para el tiempo de ejecución para ese inicio, por lo que **los clientes WS locales deben autenticarse**. Configure `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` o `OPENCLAW_GATEWAY_PASSWORD` explícitamente cuando los clientes necesiten un secreto estable entre reinicios. Esto bloquea que otros procesos locales llamen a la puerta de enlace.

    Si prefiere una ruta de autenticación diferente, puede elegir explícitamente el modo de contraseña (o, para proxies inversos con reconocimiento de identidad, `trusted-proxy`). Si **realmente** desea un bucle local abierto, establezca `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    La puerta de enlace (Gateway) supervisa la configuración y admite la recarga en caliente (hot-reload):

    - `gateway.reload.mode: "hybrid"` (predeterminado): aplica cambios seguros en caliente, reinicia para los críticos
    - `hot`, `restart`, `off` también son compatibles

  </Accordion>

  <Accordion title="¿Cómo desactivo los lemas divertidos de la CLI?">
    Establezca `cli.banner.taglineMode` en la configuración:

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`: oculta el texto del lema pero mantiene la línea de título/versión del banner.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: lemas divertidos/temporales rotativos (comportamiento predeterminado).
    - Si no desea ningún banner, establezca la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="¿Cómo habilito la búsqueda web (y la recuperación web)?">
    `web_fetch` funciona sin una clave API. `web_search` depende de su proveedor
    seleccionado:

    - Los proveedores con API como Brave, Exa, Firecrawl, Gemini, Kimi, MiniMax Search, Perplexity y Tavily requieren su configuración normal de clave API.
    - Grok puede reutilizar xAI OAuth desde la autenticación del modelo, o recurrir a `XAI_API_KEY` / configuración de web-search del complemento.
    - Ollama Web Search no requiere clave, pero utiliza su host Ollama configurado y requiere `ollama signin`.
    - DuckDuckGo no requiere clave, pero es una integración HTML no oficial.
    - SearXNG no requiere clave / es autoalojado; configure `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recomendado:** ejecute `openclaw configure --section web` y elija un proveedor.
    Alternativas de entorno:

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: xAI OAuth, `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` o `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`
    - SearXNG: `SEARXNG_BASE_URL`
    - Tavily: `TAVILY_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
        },
        tools: {
          web: {
            search: {
              enabled: true,
              provider: "brave",
              maxResults: 5,
            },
            fetch: {
              enabled: true,
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    La configuración de búsqueda web específica del proveedor ahora se encuentra en `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas de proveedor heredadas `tools.web.search.*` todavía se cargan temporalmente por compatibilidad, pero no se deben usar para configuraciones nuevas.
    La configuración alternativa de web-fetch de Firecrawl se encuentra en `plugins.entries.firecrawl.config.webFetch.*`.

    Notas:

    - Si usa listas de permitidos, añada `web_search`/`web_fetch`/`x_search` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Si se omite `tools.web.fetch.provider`, OpenClaw detecta automáticamente el primer proveedor de recuperación alternativo listo a partir de las credenciales disponibles. Hoy, el proveedor incluido es Firecrawl.
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno del servicio).

    Documentación: [Herramientas web](/es/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envía un objeto parcial, todo lo demás se elimina.

    El OpenClaw actual protege contra muchos sobrescrituras accidentales:

    - Las escrituras de configuración propiedad de OpenClaw validan la configuración completa posterior al cambio antes de escribir.
    - Las escrituras propiedad de OpenClaw que no son válidas o destructivas se rechazan y guardan como `openclaw.json.rejected.*`.
    - Si una edición directa interrumpe el inicio o la recarga en caliente, Gateway falla de forma segura (closed) o omite la recarga; no reescribe `openclaw.json`.
    - `openclaw doctor --fix` es propietario de la reparación y puede restaurar el último estado conocido bueno (last-known-good) mientras guarda el archivo rechazado como `openclaw.json.clobbered.*`.

    Recuperación:

    - Compruebe `openclaw logs --follow` para ver `Invalid config at`, `Config write rejected:` o `config reload skipped (invalid config)`.
    - Inspeccione el `openclaw.json.clobbered.*` o `openclaw.json.rejected.*` más reciente junto con la configuración activa.
    - Ejecute `openclaw config validate` y `openclaw doctor --fix`.
    - Copie solo las claves deseadas con `openclaw config set` o `config.patch`.
    - Si no tiene un último estado conocido bueno o una carga útil rechazada, restaure desde una copia de seguridad, o vuelva a ejecutar `openclaw doctor` y reconfigure los canales/modelos.
    - Si esto fue inesperado, informe un error e incluya su última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional desde los registros o el historial.

    Evítelo:

    - Use `openclaw config set` para cambios pequeños.
    - Use `openclaw configure` para ediciones interactivas.
    - Use `config.schema.lookup` primero cuando no esté seguro de una ruta exacta o la forma del campo; devuelve un nodo de esquema superficial más resúmenes de hijos inmediatos para profundizar (drill-down).
    - Use `config.patch` para ediciones RPC parciales; mantenga `config.apply` solo para el reemplazo de configuración completa.
    - Si está utilizando la herramienta `gateway` orientada al agente desde una ejecución de agente, aún rechazará las escrituras en `tools.exec.ask` / `tools.exec.security` (incluidos los alias `tools.bash.*` heredados que se normalizan a las mismas rutas de ejecución protegidas).

    Documentación: [Config](/es/cli/config), [Configure](/es/cli/configure), [Gateway troubleshooting](/es/gateway/troubleshooting#gateway-rejected-invalid-config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto una puerta de enlace (Gateway) central con trabajadores especializados en varios dispositivos?">
    El patrón común es **una puerta de enlace (Gateway)** (por ejemplo, Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
    - **Nodos (dispositivos):** Macs/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (por ejemplo, "operaciones de Hetzner", "datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando se desea paralelismo.
    - **TUI:** se conecta a la puerta de enlace (Gateway) y cambia entre agentes/sesiones.

    Documentación: [Nodos](/es/nodes), [Acceso remoto](/es/gateway/remote), [Enrutamiento multiagente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [TUI](/es/web/tui).

  </Accordion>

  <Accordion title="¿Puede ejecutarse el navegador de OpenClaw en modo headless?">
    Sí. Es una opción de configuración:

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    El valor predeterminado es `false` (con interfaz gráfica). Es más probable que el modo headless active comprobaciones anti-bot en algunos sitios. Consulte [Navegador](/es/tools/browser).

    El modo headless utiliza el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - Sin ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea las sesiones headless.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie la puerta de enlace (Gateway).
    Vea los ejemplos completos de configuración en [Navegador](/es/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Puertas de enlace (gateways) y nodos remotos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, el gateway y los nodos?">
    Los mensajes de Telegram son manejados por el **gateway**. El gateway ejecuta el agente y
    solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

    Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi computadora si el Gateway está alojado de forma remota?">
    Respuesta corta: **empareja tu computadora como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
    llamar a herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del Gateway WebSocket.

    Configuración típica:

    1. Ejecuta el Gateway en el host siempre activo (VPS/servidor doméstico).
    2. Pon el host del Gateway + tu computadora en la misma tailnet.
    3. Asegúrate de que el WS del Gateway sea accesible (enlace de tailnet o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en el modo **Remoto por SSH** (o tailnet directa)
       para que pueda registrarse como un nodo.
    5. Aproba el nodo en el Gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere un puente TCP separado; los nodos se conectan a través del Gateway WebSocket.

    Recordatorio de seguridad: emparejar un nodo de macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/es/gateway/security).

    Documentación: [Nodos](/es/nodes), [Protocolo del Gateway](/es/gateway/protocol), [Modo remoto de macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago?">
    Comprueba lo básico:

    - La puerta de enlace (Gateway) está ejecutándose: `openclaw gateway status`
    - Estado de la puerta de enlace: `openclaw status`
    - Estado del canal: `openclaw channels status`

    A continuación, verifica la autenticación y el enrutamiento:

    - Si usas Tailscale Serve, asegúrate de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si te conectas a través de un túnel SSH, confirma que el túnel local está activo y apunta al puerto correcto.
    - Confirma que tus listas de permitidos (DM o grupo) incluyen tu cuenta.

    Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

  </Accordion>

  <Accordion title="¿Pueden dos instancias de OpenClaw comunicarse entre sí (local + VPS)?">
    Sí. No hay un puente "bot-a-bot" integrado, pero puedes configurarlo de algunas
    formas fiables:

    **Lo más simple:** usa un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haz que el Bot A envíe un mensaje al Bot B y luego deja que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecuta un script que llame a la otra puerta de enlace con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunta tu CLI a esa puerta de enlace remota
    a través de SSH/Tailscale (ver [Acceso remoto](/es/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar la puerta de enlace objetivo):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añade una restricción para que los dos bots no entren en un bucle infinito (solo menciones, listas
    de permitidos de canal, o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/es/gateway/remote), [CLI del Agente](/es/cli/agent), [Envío del Agente](/es/tools/agent-send).

  </Accordion>

  <Accordion title="¿Necesito VPS separados para múltiples agentes?">
    No. Una única puerta de enlace (Gateway) puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, configuraciones predeterminadas de modelo
    y enrutamiento. Esa es la configuración normal y es mucho más económica y sencilla que ejecutar
    una VPS por agente.

    Use VPS separadas solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones
    muy diferentes que no desee compartir. De lo contrario, mantenga una puerta de enlace (Gateway)
    y use múltiples agentes o subagentes.

  </Accordion>

  <Accordion title="¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde una VPS?">
    Sí: los nodos son la forma principal de llegar a su laptop desde una puerta de enlace (Gateway) remota, y permiten
    más que solo el acceso a la shell. La puerta de enlace (Gateway) se ejecuta en macOS/Linux (Windows a través de WSL2) y es
    ligera (una VPS pequeña o una caja tipo Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración
    común es un host siempre activo más su laptop como un nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket de la puerta de enlace (Gateway) y usan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está limitado por listas de aprobación/aprobaciones de nodos en esa laptop.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantenga la puerta de enlace (Gateway) en una VPS, pero ejecute Chrome localmente a través de un host de nodo en la laptop, o conéctese al Chrome local en el host a través de Chrome MCP.

    SSH está bien para el acceso ad-hoc a la shell, pero los nodos son más simples para los flujos de trabajo continuos de agentes y
    la automatización de dispositivos.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de puerta de enlace?">
    No. Solo debe ejecutarse **una puerta de enlace** por host, a menos que ejecute intencionadamente perfiles aislados (consulte [Múltiples puertas de enlace](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan
    a la puerta de enlace (nodos iOS/Android o "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin interfaz gráfica
    y control por CLI, consulte [CLI de host de nodos](/es/cli/node).

    Se requiere un reinicio completo para `gateway`, `discovery`, y los cambios en la superficie de complementos alojados.

  </Accordion>

  <Accordion title="¿Hay alguna forma API / RPC para aplicar la configuración?">
    Sí.

    - `config.schema.lookup`: inspeccionar un subárbol de configuración con su nodo de esquema superficial, sugerencia de interfaz coincidente y resúmenes de hijos inmediatos antes de escribir
    - `config.get`: obtener la instantánea actual + hash
    - `config.patch`: actualización parcial segura (preferida para la mayoría de ediciones RPC); recarga en caliente cuando es posible y se reinicia cuando es necesario
    - `config.apply`: validar + reemplazar la configuración completa; recarga en caliente cuando es posible y se reinicia cuando es necesario
    - La herramienta de tiempo de ejecución `gateway` orientada al agente aún se niega a reescribir `tools.exec.ask` / `tools.exec.security`; los alias `tools.bash.*` heredados se normalizan a las mismas rutas de ejecución protegidas

  </Accordion>

  <Accordion title="Configuración mínima sensata para una primera instalación">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Esto configura su espacio de trabajo y restringe quién puede activar el bot.

  </Accordion>

  <Accordion title="¿Cómo configuro Tailscale en un VPS y me conecto desde mi Mac?">
    Pasos mínimos:

    1. **Instalar + iniciar sesión en el VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **Instalar + iniciar sesión en tu Mac**
       - Usa la aplicación de Tailscale e inicia sesión en la misma tailnet.
    3. **Habilitar MagicDNS (recomendado)**
       - En la consola de administración de Tailscale, habilita MagicDNS para que el VPS tenga un nombre estable.
    4. **Usar el nombre de host de la tailnet**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    Si deseas la interfaz de usuario de control sin SSH, usa Tailscale Serve en el VPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Esto mantiene el enlace vinculado al loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?">
    Serve expone la **Interfaz de usuario de control del Gateway + WS**. Los nodos se conectan a través del mismo endpoint del Gateway WS.

    Configuración recomendada:

    1. **Asegúrate de que el VPS y el Mac estén en la misma tailnet**.
    2. **Usa la aplicación macOS en modo remoto** (el destino SSH puede ser el nombre de host de la tailnet).
       La aplicación realizará un túnel del puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en el gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentación: [Protocolo del Gateway](/es/gateway/protocol), [Descubrimiento](/es/gateway/discovery), [Modo remoto de macOS](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente agregar un nodo?">
    Si solo necesitas **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, agrégalo como un
    **nodo**. Esto mantiene un solo Gateway y evita configuraciones duplicadas. Las herramientas de nodo local son
    actualmente exclusivas de macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instala un segundo Gateway solo cuando necesites **aislamiento estricto** o dos bots completamente separados.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples gateways](/es/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables de entorno y carga de .env

<AccordionGroup>
  <Accordion title="¿Cómo carga OpenClaw las variables de entorno?">
    OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y additionally carga:

    - `.env` desde el directorio de trabajo actual
    - un `.env` de respaldo global desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

    Ningún archivo `.env` anula las variables de entorno existentes.
    Las variables de credenciales del proveedor son una excepción para el `.env` del espacio de trabajo: claves como
    `GEMINI_API_KEY`, `XAI_API_KEY` o `MISTRAL_API_KEY` se ignoran del `.env` del espacio de trabajo
    y deben residir en el entorno del proceso, `~/.openclaw/.env`, o en el archivo de configuración `env`.

    También puedes definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consulta [/environment](/es/help/environment) para obtener información completa sobre la precedencia y las fuentes.

  </Accordion>

  <Accordion title="Inicié el Gateway mediante el servicio y mis variables de entorno desaparecieron. ¿Qué hago ahora?">
    Dos soluciones comunes:

    1. Coloca las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no hereda tu entorno de shell.
    2. Habilita la importación de shell (comodidad opcional):

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    Esto ejecuta tu shell de inicio de sesión e importa solo las claves esperadas faltantes (nunca las anula). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='He configurado COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` informa si la **importación de entorno de shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno; solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como un servicio (launchd/systemd), no heredará tu entorno
    de shell. Soluciónalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación de shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque de configuración `env` (se aplica solo si falta).

    Luego reinicia el gateway y verifica de nuevo:

    ```bash
    openclaw models status
    ```

    Los tokens de Copilot se leen desde `COPILOT_GITHUB_TOKEN` (también `GH_TOKEN` / `GITHUB_TOKEN`).
    Consulta [/concepts/model-providers](/es/concepts/model-providers) y [/environment](/es/help/environment).

  </Accordion>
</AccordionGroup>

## Sesiones y múltiples chats

<AccordionGroup>
  <Accordion title="¿Cómo inicio una conversación nueva?">
    Envía `/new` o `/reset` como un mensaje independiente. Consulta [Gestión de sesiones](/es/concepts/session).
  </Accordion>

  <Accordion title="¿Las sesiones se reinician automáticamente si nunca envío /new?">
    Las sesiones pueden expirar después de `session.idleMinutes`, pero esto está **deshabilitado por defecto** (por defecto **0**).
    Establécelo en un valor positivo para habilitar la expiración por inactividad. Cuando está habilitado, el **siguiente**
    mensaje después del periodo de inactividad inicia un id de sesión nuevo para esa clave de chat.
    Esto no elimina las transcripciones; solo inicia una nueva sesión.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Hay alguna forma de crear un equipo de instancias de OpenClaw (un CEO y muchos agentes)?">
    Sí, a través del **enrutamiento multiagente** y los **subagentes**. Puedes crear un agente
    coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

    Dicho esto, esto es mejor visto como un **experimento divertido**. Consume muchos tokens y a menudo
    es menos eficiente que usar un solo bot con sesiones separadas. El modelo típico que
    imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar subagentes cuando sea necesario.

    Documentación: [Enrutamiento multiagente](/es/concepts/multi-agent), [Subagentes](/es/tools/subagents), [CLI de Agentes](/es/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de la tarea? ¿Cómo lo evito?">
    El contexto de la sesión está limitado por la ventana del modelo. Los chats largos, las grandes salidas de herramientas o muchos
    archivos pueden desencadenar una compactación o truncamiento.

    Lo que ayuda:

    - Pide al bot que resuma el estado actual y lo escriba en un archivo.
    - Usa `/compact` antes de tareas largas, y `/new` al cambiar de tema.
    - Mantén el contexto importante en el espacio de trabajo y pide al bot que lo vuelva a leer.
    - Usa subagentes para trabajos largos o paralelos para que el chat principal se mantenga más pequeño.
    - Elige un modelo con una ventana de contexto más grande si esto sucede a menudo.

  </Accordion>

  <Accordion title="¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado?">
    Usa el comando de restablecimiento:

    ```bash
    openclaw reset
    ```

    Restablecimiento completo no interactivo:

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    Luego vuelve a ejecutar la configuración:

    ```bash
    openclaw onboard --install-daemon
    ```

    Notas:

    - La incorporación también ofrece **Restablecer** si ve una configuración existente. Consulta [Incorporación (CLI)](/es/start/wizard).
    - Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), restablece cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
    - Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

  </Accordion>

  <Accordion title='Estoy recibiendo errores de "contexto demasiado grande" - ¿cómo lo restablezco o compacto?'>
    Utilice uno de estos:

    - **Compactar** (mantiene la conversación pero resume los turnos anteriores):

      ```
      /compact
      ```

      o `/compact <instructions>` para guiar el resumen.

    - **Restablecer** (ID de sesión nueva para la misma clave de chat):

      ```
      /new
      /reset
      ```

    Si sigue ocurriendo:

    - Habilite o ajuste la **poda de sesión** (`agents.defaults.contextPruning`) para recortar el resultado de herramientas antiguo.
    - Utilice un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/es/concepts/compaction), [Poda de sesión](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido cada 30 minutos?">
    Los latidos se ejecutan cada **30m** de forma predeterminada (**1h** al usar autenticación OAuth). Ajuste o desactívelos:

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
    Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

    Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title='¿Necesito agregar una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    De manera predeterminada, las respuestas grupales están bloqueadas hasta que permitas remitentes (`groupPolicy: "allowlist"`).

    Si deseas que solo **tú** puedas activar respuestas grupales:

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="¿Cómo obtengo el JID de un grupo de WhatsApp?">
    Opción 1 (la más rápida): observa los registros y envía un mensaje de prueba en el grupo:

    ```bash
    openclaw logs --follow --json
    ```

    Busca `chatId` (o `from`) que termine en `@g.us`, como:
    `1234567890-1234567890@g.us`.

    Opción 2 (si ya está configurado/en la lista de permitidos): lista los grupos desde la configuración:

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

  </Accordion>

  <Accordion title="¿Por qué OpenClaw no responde en un grupo?">
    Dos causas comunes:

    - El filtrado de menciones está activado (predeterminado). Debes @mencionar al bot (o que coincida con `mentionPatterns`).
    - Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista de permitidos.

    Consulta [Grupos](/es/channels/groups) y [Mensajes grupales](/es/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten el contexto con los MD?">Los chats directos se colapsan en la sesión principal de manera predeterminada. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones separadas. Consulta [Grupos](/es/channels/groups) y [Mensajes grupales](/es/channels/group-messages).</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero vigile lo siguiente:

    - **Crecimiento del disco:** las sesiones + transcripciones viven en `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significan mayor uso simultáneo del modelo.
    - **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Pode sesiones antiguas (elimine JSONL o entradas de almacén) si el disco crece.
    - Use `openclaw doctor` para detectar espacios de trabajo huérfanos y discordancias en los perfiles.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debo configurarlo?">
    Sí. Use **Enrutamiento Multiagente** para ejecutar múltiples agentes aislados y enrutar mensajes entrantes por
    canal/cuenta/par. Slack es compatible como canal y puede vincularse a agentes específicos.

    El acceso al navegador es potente pero no "hacer cualquier cosa que un humano pueda"; los anti-bot, CAPTCHAs y MFA aún
    pueden bloquear la automatización. Para el control del navegador más confiable, use Chrome MCP local en el host,
    o use CDP en la máquina que realmente ejecuta el navegador.

    Configuración recomendada:

    - Host de Gateway siempre activo (VPS/Mac mini).
    - Un agente por rol (vinculaciones).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local a través de Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Enrutamiento Multiagente](/es/concepts/multi-agent), [Slack](/es/channels/slack),
    [Navegador](/es/tools/browser), [Nodos](/es/nodes).

  </Accordion>
</AccordionGroup>

## Modelos, conmutación por error y perfiles de autenticación

Preguntas y respuestas sobre modelos — valores predeterminados, selección, alias, cambio, conmutación por error, perfiles de autenticación —
se encuentran en [Preguntas frecuentes sobre modelos](/es/help/faq-models).

## Gateway: puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto usa el Gateway?">
    `gateway.port` controla el puerto único multiplexado para WebSocket + HTTP (Interfaz de usuario de control, enlaces, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace de openclaw dice "Runtime: running" pero "Connectivity probe: failed"?'>
    Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La prueba de conectividad es la CLI conectándose realmente al WebSocket de la puerta de enlace.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que usó realmente la prueba)
    - `Listening:` (lo que realmente está vinculado al puerto)
    - `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

  </Accordion>

  <Accordion title='¿Por qué el estado de la puerta de enlace de openclaw muestra "Config (cli)" y "Config (service)" diferentes?'>
    Está editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

    Solución:

    ```bash
    openclaw gateway install --force
    ```

    Ejecute eso desde el mismo `--profile` / entorno que desea que use el servicio.

  </Accordion>

  <Accordion title='¿Qué significa "another gateway instance is already listening"?'>
    OpenClaw aplica un bloqueo de tiempo de ejecución vinculando el escucha WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si la vinculación falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

    Solución: detenga la otra instancia, libere el puerto o ejecute con `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?">
    Establezca `gateway.mode: "remote"` y apunte a una URL de WebSocket remota, opcionalmente con credenciales remotas de secreto compartido:

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    Notas:

    - `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasas la marca de anulación).
    - La aplicación de macOS observa el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.
    - `gateway.remote.token` / `.password` son solo credenciales remotas del lado del cliente; no habilitan la autenticación del gateway local por sí mismas.

  </Accordion>

  <Accordion title='La interfaz de control (Control UI) dice "no autorizado" (o sigue reconectando). ¿Qué hacer ahora?'>
    La ruta de autenticación de tu puerta de enlace (gateway) y el método de autenticación de la interfaz no coinciden.

    Datos (del código):

    - La interfaz de control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token de localStorage a largo plazo.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo almacenado en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Ese reintento con token en caché ahora reutiliza los alcances (scopes) aprobados en caché almacenados con el token del dispositivo. Los que llaman con `deviceToken` explícita / `scopes` explícita todavía mantienen su conjunto de alcances solicitados en lugar de heredar los alcances en caché.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartido explícito, luego `deviceToken` explícita, luego token de dispositivo almacenado, luego token de arranque (bootstrap).
    - El arranque (bootstrap) mediante código de configuración integrado es solo para nodos. Después de la aprobación, devuelve un token de dispositivo de nodo con `scopes: []` y no devuelve un token de operador entregado.

    Solución:

    - El más rápido: `openclaw dashboard` (imprime + copia la URL del tablero, intenta abrirla; muestra un hint de SSH si no tiene interfaz gráfica/headless).
    - Si aún no tienes un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, abre un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/`.
    - Modo de secreto compartido: establece `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` o `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, luego pega el secreto correspondiente en la configuración de la interfaz de control.
    - Modo Tailscale Serve: asegúrate de que `gateway.auth.allowTailscale` esté habilitado y de que estás abriendo la URL de Serve, no una URL de loopback/tailnet sin procesar que omita los encabezados de identidad de Tailscale.
    - Modo de proxy de confianza: asegúrate de que estás accediendo a través del proxy con reconocimiento de identidad configurado, no a través de una URL de puerta de enlace sin procesar. Los proxies de loopback del mismo host también necesitan `gateway.auth.trustedProxy.allowLoopback = true`.
    - Si la discrepancia persiste después del reintento único, rota/vuelve a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si esa llamada de rotación indica que fue denegada, verifica dos cosas:
      - las sesiones de dispositivo emparejado (paired-device) solo pueden rotar su **propio** dispositivo a menos que también tengan `operator.admin`
      - los valores `--scope` explícitos no pueden exceder los alcances del operador actual de quien llama
    - ¿Sigues atascado? Ejecuta `openclaw status --all` y sigue [Solución de problemas](/es/gateway/troubleshooting). Consulta [Panel de control](/es/web/dashboard) para obtener detalles de autenticación.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind selecciona una IP de Tailscale de tus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que enlazarse.

    Solución:

    - Inicia Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambia a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere loopback; usa `gateway.bind: "tailnet"` cuando quieras un enlace exclusivo de tailnet.

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    Generalmente no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Usa múltiples Gateways solo cuando necesites redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debes aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Usa `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Establece un `gateway.port` único en cada configuración de perfil (o pasa `--port` para ejecuciones manuales).
    - Instala un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también añaden sufijos a los nombres de servicio (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Multiple gateways](/es/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "invalid handshake" / código 1008?'>
    El Gateway es un servidor **WebSocket**, y espera que el primer mensaje sea
    un trama `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrecta.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activada, incluya el token/contraseña en la trama `connect`.

    Si está usando la CLI o la TUI, la URL debería verse así:

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    Detalles del protocolo: [Gateway protocol](/es/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Registro y depuración

<AccordionGroup>
  <Accordion title="¿Dónde están los registros?">
    Registros de archivo (estructurados):

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Puede establecer una ruta estable a través de `logging.file`. El nivel de registro de archivo está controlado por `logging.level`. La verbosidad de la consola está controlada por `--verbose` y `logging.consoleLevel`.

    Seguimiento de registros más rápido:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando el gateway se ejecuta a través de launchd/systemd):

    - macOS launchd stdout: `~/Library/Logs/openclaw/gateway.log` (los perfiles usan `gateway-<profile>.log`; stderr se suprime)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Troubleshooting](/es/gateway/troubleshooting) para obtener más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/detengo/reinicio el servicio Gateway?">
    Use los asistentes del gateway:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si ejecuta el gateway manualmente, `openclaw gateway --force` puede reclamar el puerto. Consulte [Gateway](/es/gateway).

  </Accordion>

  <Accordion title="Cerré mi terminal en Windows: ¿cómo reinicio OpenClaw?">
    Hay **dos modos de instalación en Windows**:

    **1) WSL2 (recomendado):** el Gateway se ejecuta dentro de Linux.

    Abra PowerShell, ingrese a WSL y luego reinicie:

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si nunca instaló el servicio, inícielo en primer plano:

    ```bash
    openclaw gateway run
    ```

    **2) Windows nativo (no recomendado):** el Gateway se ejecuta directamente en Windows.

    Abra PowerShell y ejecute:

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si lo ejecuta manualmente (sin servicio), use:

    ```powershell
    openclaw gateway run
    ```

    Docs: [Windows (WSL2)](/es/platforms/windows), [Gateway service runbook](/es/gateway).

  </Accordion>

  <Accordion title="El Gateway está activo pero las respuestas nunca llegan. ¿Qué debo verificar?">
    Comience con un rápido chequeo de salud:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - La autenticación del modelo no se cargó en el **host del gateway** (verifique `models status`).
    - El emparejamiento de canales/lista de permitidos está bloqueando las respuestas (verifique la configuración del canal + registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si está remoto, confirme que la conexión del túnel/Tailscale está activa y que el
    WebSocket del Gateway es accesible.

    Docs: [Channels](/es/channels), [Troubleshooting](/es/gateway/troubleshooting), [Remote access](/es/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado del gateway: sin razón" - ¿y ahora qué?'>
    Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Verifique:

    1. ¿Está ejecutándose el Gateway? `openclaw gateway status`
    2. ¿Está el Gateway saludable? `openclaw status`
    3. ¿Tiene la interfaz el token correcto? `openclaw dashboard`
    4. Si está remoto, ¿está activo el enlace del túnel/Tailscale?

    Luego revise los registros en tiempo real:

    ```bash
    openclaw logs --follow
    ```

    Docs: [Dashboard](/es/web/dashboard), [Remote access](/es/gateway/remote), [Troubleshooting](/es/gateway/troubleshooting).

  </Accordion>

  <Accordion title="¿Falla el setMyCommands de Telegram? ¿Qué debo comprobar?">
    Empiece con los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero aún así algunas entradas del menú deben eliminarse. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si está en un VPS o detrás de un proxy, confirme que el HTTPS saliente está permitido y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar mirando los registros en el host del Gateway.

    Documentos: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

  </Accordion>

  <Accordion title="La TUI no muestra salida. ¿Qué debo comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentos: [TUI](/es/web/tui), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo y luego inicio el Gateway por completo?">
    Si instaló el servicio:

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
    Úselo cuando el Gateway se ejecuta en segundo plano como un demonio.

    Si se está ejecutando en primer plano, deténgalo con Ctrl-C, luego:

    ```bash
    openclaw gateway run
    ```

    Documentos: [Manual de servicio del Gateway](/es/gateway).

  </Accordion>

  <Accordion title="ELI5: reinicio de openclaw gateway frente a openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
    desee una ejecución única en primer plano.

  </Accordion>

  <Accordion title="La forma más rápida de obtener más detalles cuando algo falla">
    Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver la autenticación del canal, el enrutamiento del modelo y los errores de RPC.
  </Accordion>
</AccordionGroup>

## Medios y archivos adjuntos

<AccordionGroup>
  <Accordion title="Mi habilidad generó una imagen/PDF, pero no se envió nada">
    Los archivos adjuntos salientes del agente deben usar campos de medios estructurados como `media`, `mediaUrl`, `path` o `filePath`. Consulte [Configuración del asistente OpenClaw](/es/start/openclaw) y [Envío de agente](/es/tools/agent-send).

    Envío por CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También revise:

    - El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048 px).
    - `tools.fs.workspaceOnly=true` limita los envíos de ruta local al espacio de trabajo, temp/media-store y archivos validados por el sandbox.
    - `tools.fs.workspaceOnly=false` permite que los envíos de medios locales estructurados usen archivos locales del host que el agente ya puede leer, pero solo para medios más tipos de documentos seguros (imágenes, audio, video, PDF, documentos de Office y documentos de texto validados como Markdown/MD, TXT, JSON, YAML y YML). Esto no es un escáner de secretos: un archivo `secret.txt` o `config.json` legible por el agente se puede adjuntar cuando la extensión y la validación de contenido coinciden. Mantenga los archivos confidenciales fuera de las rutas legibles por el agente o mantenga `tools.fs.workspaceOnly=true` para envíos de ruta local más estrictos.

    Consulte [Imágenes](/es/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="¿Es seguro exponer OpenClaw a mensajes entrantes (DMs)?">
    Trate los mensajes entrantes como entrada no confiable. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales que permiten MDs es **emparejamiento** (pairing):
      - Los remitentes desconocidos reciben un código de emparejamiento; el bot no procesa su mensaje.
      - Apruebe con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir los MDs públicamente requiere una aceptación explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

    Ejecute `openclaw doctor` para mostrar las políticas de MDs riesgosas.

  </Accordion>

  <Accordion title="¿Es la inyección de comandos (prompt injection) solo una preocupación para los bots públicos?">
    No. La inyección de comandos se trata de **contenido no confiable**, no solo de quién puede enviar MDs al bot.
    Si su asistente lee contenido externo (búsqueda web/obtención, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
    filtrar contexto o llamar herramientas en su nombre. Reduzca el radio de impacto por:

    - usando un agente de "lectura" de solo lectura o sin herramientas para resumir contenido no confiable
    - manteniendo `web_search` / `web_fetch` / `browser` desactivados para agentes con herramientas habilitadas
    - tratando el texto de archivos/documentos decodificados como no confiable también: OpenResponses
      `input_file` y la extracción de archivos adjuntos multimedia envuelven el texto extraído en
      marcadores de límite de contenido externo explícito en lugar de pasar el texto sin procesar del archivo
    - sandboxing y listas de permitidos de herramientas estrictas

    Detalles: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Es OpenClaw menos seguro porque usa TypeScript/Node en lugar de Rust/WASM?">
    El lenguaje y el tiempo de ejecución son importantes, pero no son el principal riesgo para un agente personal. Los riesgos prácticos de OpenClaw son la exposición de la puerta de enlace (gateway), quién puede enviar mensajes al bot, la inyección de prompts, el alcance de las herramientas, el manejo de credenciales, el acceso al navegador, el acceso de ejecución y la confianza en habilidades (skills) o complementos de terceros.

    Rust y WASM pueden proporcionar un aislamiento más fuerte para algunas clases de código, pero no resuelven la inyección de prompts, listas permitidas (allowlists) deficientes, la exposición pública de la puerta de enlace, herramientas demasiado amplias o un perfil de navegador que ya ha iniciado sesión en cuentas sensibles. Trata esos elementos como los controles principales:

    - mantén la puerta de enlace privada o autenticada
    - usa emparejamiento y listas permitidas para mensajes directos y grupos
    - deniega o pone en sandbox herramientas arriesgadas para entradas no confiables
    - instala solo complementos y habilidades de confianza
    - ejecuta `openclaw security audit --deep` después de cambios en la configuración

    Detalles: [Seguridad](/es/gateway/security), [Sandboxing](/es/gateway/sandboxing).

  </Accordion>

  <Accordion title="Vi informes sobre instancias de OpenClaw expuestas. ¿Qué debería verificar?">
    Primero verifica tu implementación real:

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    Una línea base más segura es:

    - Puerta de enlace vinculada a `loopback`, o expuesta solo a través de acceso privado autenticado como una tailnet, túnel SSH, autenticación de token/contraseña, o un proxy de confianza configurado correctamente
    - Mensajes directos en modo `pairing` o `allowlist`
    - grupos en lista permitida y restringidos por mención, a menos que cada miembro sea de confianza
    - herramientas de alto riesgo (`exec`, `browser`, `gateway`, `cron`) denegadas o con alcance estricto para agentes que leen contenido no confiable
    - sandboxing habilitado donde la ejecución de herramientas necesita un radio de explosión más pequeño

    Los enlaces públicos sin autenticación, mensajes directos/grupos abiertos con herramientas y el control del navegador expuesto son los hallazgos que debes corregir primero. Detalles:
    [Lista de verificación de auditoría de seguridad](/es/gateway/security#security-audit-checklist).

  </Accordion>

  <Accordion title="¿Es seguro instalar habilidades de ClawHub y complementos de terceros?">
    Trate las habilidades y complementos de terceros como código que elige confiar.
    Las páginas de habilidades de ClawHub exponen el estado del escaneo antes de la instalación, y los flujos de instalación/actualización de complementos de OpenClaw ejecutan comprobaciones de código peligroso integradas, pero los escaneos no son un límite de seguridad completo.

    Patrón más seguro:

    - prefiera autores confiables y versiones fijas
    - lea la habilidad o el complemento antes de habilitarlo
    - mantenga las listas de permitidos de complementos y habilidades reducidas
    - ejecute flujos de trabajo con entradas que no son de confianza en un entorno sandbox con herramientas mínimas
    - evite dar al código de terceros acceso amplio al sistema de archivos, ejecución, navegador o secretos

    Detalles: [Habilidades](/es/tools/skills), [Complementos](/es/tools/plugin),
    [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Mi bot debería tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados reduce el radio de expansión si algo sale mal. Esto también facilita la rotación de credenciales o la revocación de acceso sin afectar sus cuentas personales.

    Empiece pequeño. Otorgue acceso solo a las herramientas y cuentas que realmente necesite y amplíelo más tarde si es necesario.

    Documentación: [Seguridad](/es/gateway/security), [Emparejamiento](/es/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y eso es seguro?">
    **No** recomendamos la autonomía completa sobre sus mensajes personales. El patrón más seguro es:

    - Mantener los MD en **modo de emparejamiento** o una lista de permitidos estricta.
    - Usar un **número o cuenta separado** si desea que envíe mensajes en su nombre.
    - Permitir que redacte y luego **aprobar antes de enviar**.

    Si desea experimentar, hágalo en una cuenta dedicada y manténgala aislada. Vea
    [Seguridad](/es/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más baratos para tareas de asistente personal?">
  Sí, **siempre que** el agente sea solo de chat y la entrada sea confiable. Los niveles inferiores son más susceptibles al secuestro de instrucciones, así que evítalos para agentes con herramientas habilitadas o al leer contenido que no es de confianza. Si debes usar un modelo más pequeño, bloquea las herramientas y ejecútalo dentro de un entorno protegido (sandbox). Consulta
  [Seguridad](/es/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

    Comprueba las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si deseas acceso inmediato, añade tu id de remitente a la lista de permitidos o establece `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a los envíos explícitos que tú activas.

    Aprueba el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lista las solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    El asistente para el número de teléfono: se usa para configurar tu **lista de permitidos/propietario** para que se permitan tus propios MD. No se usa para el envío automático. Si ejecutas en tu número personal de WhatsApp, usa ese número y habilita `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Comandos de chat, abortar tareas y "no se detendrá"

<AccordionGroup>
  <Accordion title="¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?">
    La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose**, **trace** o **reasoning** están activados
    para esa sesión.

    Solución en el chat donde lo veas:

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    Si sigue siendo ruidoso, verifica la configuración de la sesión en la Interfaz de Control (Control UI) y establece verbose
    en **inherit** (heredar). También confirma que no estás usando un perfil de bot con `verboseDefault` establecido
    en `on` en la configuración.

    Documentación: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security/index#reasoning-and-verbose-output-in-groups).

  </Accordion>

  <Accordion title="¿Cómo detengo/cancelo una tarea en ejecución?">
    Envía cualquiera de estos **como un mensaje independiente** (sin barra):

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    Estos son disparadores de aborto (no comandos de barra).

    Para procesos en segundo plano (de la herramienta exec), puedes pedirle al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: consulta [Slash commands](/es/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **independiente** que comienza con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes autorizados.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea la mensajería **entre proveedores** (cross-provider) de forma predeterminada. Si una llamada a una herramienta está vinculada
    a Telegram, no se enviará a Discord a menos que lo permitas explícitamente.

    Activa la mensajería entre proveedores para el agente:

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    Reinicia la puerta de enlace (gateway) después de editar la configuración.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes rápidos?'>
    De forma predeterminada, los indicadores de ejecución intermedia se dirigen a la ejecución activa. Use `/queue` para elegir el comportamiento de ejecución activa:

    - `steer` - guiar la ejecución activa en el siguiente límite del modelo
    - `followup` - poner en cola los mensajes y ejecutarlos uno a uno después de que termine la ejecución actual
    - `collect` - poner en cola los mensajes compatibles y responder una vez después de que termine la ejecución actual
    - `interrupt` - abortar la ejecución actual y comenzar de nuevo

    El modo predeterminado es `steer`. Puede agregar opciones como `debounce:0.5s cap:25 drop:summarize` para los modos en cola. Consulte [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).

  </Accordion>
</AccordionGroup>

## Varios

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave API?">
    En OpenClaw, las credenciales y la selección del modelo son independientes. Configurar `ANTHROPIC_API_KEY` (o almacenar una clave API de Anthropic en perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es el que configure en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o `anthropic/claude-opus-4-6`). Si ve `No credentials
    found for profile "anthropic:default"`, significa que la puerta de enlace no pudo encontrar las credenciales de Anthropic en el `auth-profiles.json` esperado para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).

## Relacionado

- [Preguntas frecuentes de primera ejecución](/es/help/faq-first-run) — instalación, incorporación, autenticación, suscripciones, fallos tempranos
- [Preguntas frecuentes sobre modelos](/es/help/faq-models) — selección de modelos, conmutación por error, perfiles de autenticación
- [Solución de problemas](/es/help/troubleshooting) — triaje basado en síntomas
