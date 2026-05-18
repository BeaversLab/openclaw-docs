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

   Ejecuta un sondeo de estado de la puerta de enlace en vivo, incluidos los sondeos de canal cuando se admiten
   (requiere una puerta de enlace accesible). Consulte [Estado](/es/gateway/health).

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

   Repara/migra el configuración/estado + ejecuta verificaciones de estado. Consulte [Doctor](/es/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Solicita a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Estado](/es/gateway/health).

## Inicio rápido y configuración de primera ejecución

Preguntas y respuestas de la primera ejecución — instalación, incorporación, rutas de autenticación, suscripciones, fallos iniciales —
se encuentran en las [Preguntas frecuentes de la primera ejecución](/es/help/faq-first-run).

## ¿Qué es OpenClaw?

<AccordionGroup>
  <Accordion title="¿Qué es OpenClaw, en un párrafo?">
    OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las plataformas de mensajería que ya utilizas (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat y complementos de canal incluidos como QQ Bot) y también puede hacer voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.
  </Accordion>

  <Accordion title="Propuesta de valor">
    OpenClaw no es "simplemente un envoltorio de Claude". Es un **plano de control con prioridad local** que le permite ejecutar un
    asistente capaz en **su propio hardware**, accesible desde las aplicaciones de chat que ya usa, con
    sesiones con estado, memoria y herramientas, sin ceder el control de sus flujos de trabajo a un
    SaaS alojado.

    Aspectos destacados:

    - **Sus dispositivos, sus datos:** ejecute la puerta de enlace donde desee (Mac, Linux, VPS) y mantenga el
      espacio de trabajo + el historial de sesiones localmente.
    - **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      además de voz móvil y Canvas en las plataformas compatibles.
    - **Agnóstico al modelo:** use Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
      por agente y conmutación por error.
    - **Opción solo local:** ejecute modelos locales para que **todos los datos pueden permanecer en su dispositivo** si lo desea.
    - **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
      espacio de trabajo y valores predeterminados.
    - **Código abierto y modificable:** inspeccione, extienda y aloje por sí mismo sin bloqueo de proveedor.

    Documentación: [Puerta de enlace](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
    [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Acabo de configurarlo, ¿qué debo hacer primero?">
    Buenos primeros proyectos:

    - Crear un sitio web (WordPress, Shopify o un sitio estático simple).
    - Prototipar una aplicación móvil (esquema, pantallas, plan de API).
    - Organizar archivos y carpetas (limpieza, nomenclatura, etiquetado).
    - Conectar Gmail y automatizar resúmenes o seguimientos.

    Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
    usas subagentes para el trabajo en paralelo.

  </Accordion>

  <Accordion title="¿Cuáles son los cinco casos de uso cotidianos más importantes de OpenClaw?">
    Los logros cotidianos generalmente se ven así:

    - **Briefings personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que te interesan.
    - **Investigación y redacción:** investigaciones rápidas, resúmenes y primeros borradores para correos electrónicos o documentos.
    - **Recordatorios y seguimientos:** avisos y listas de verificación impulsados por cron o latidos.
    - **Automatización del navegador:** llenar formularios, recopilar datos y repetir tareas web.
    - **Coordinación entre dispositivos:** enviar una tarea desde tu teléfono, dejar que el Gateway la ejecute en un servidor y recibir el resultado en el chat.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ayudar con la generación de clientes, la prospección, la publicidad y los blogs para un SaaS?">
    Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
    resumir prospectos y escribir borradores de correos de prospección o textos publicitarios.

    Para **campañas de prospección o publicidad**, mantén a una persona en el bucle. Evita el spam, respeta las leyes locales y
    las políticas de las plataformas, y revisa todo antes de enviarlo. El patrón más seguro es dejar que
    OpenClaw redacte y tú apruebes.

    Documentación: [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?">
    OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo del IDE. Utiliza
    Claude Code o Codex para el bucle de codificación directa más rápido dentro de un repositorio. Usa OpenClaw cuando quieras
    memoria duradera, acceso multiplataforma y orquestación de herramientas.

    Ventajas:

    - **Memoria persistente + espacio de trabajo** a través de sesiones
    - **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
    - **Orquestación de herramientas** (navegador, archivos, programación, hooks)
    - **Pasarela siempre activa** (ejecuta en un VPS, interactúa desde cualquier lugar)
    - **Nodos** para navegador/pantalla/cámara/exec local

    Demostración: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Habilidades y automatización

<AccordionGroup>
  <Accordion title="¿Cómo personalizo las habilidades sin ensuciar el repositorio?">
    Utilice anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añada una carpeta mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → integradas → `skills.load.extraDirs`, por lo que las anulaciones administradas siguen teniendo prioridad sobre las habilidades integradas sin tocar git. Si necesita la habilidad instalada globalmente pero solo visible para algunos agentes, mantenga la copia compartida en `~/.openclaw/skills` y controle la visibilidad con `agents.defaults.skills` y `agents.list[].skills`. Solo las ediciones dignas de upstream deben residir en el repositorio y salir como PRs.
  </Accordion>

  <Accordion title="¿Puedo cargar habilidades desde una carpeta personalizada?">
    Sí. Añada directorios adicionales mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada es `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → integradas → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo cual OpenClaw trata como `<workspace>/skills` en la siguiente sesión. Si la habilidad solo debe ser visible para ciertos agentes, combínelo con `agents.defaults.skills` o `agents.list[].skills`.
  </Accordion>

  <Accordion title="¿Cómo puedo usar diferentes modelos para diferentes tareas?">
    Hoy los patrones compatibles son:

    - **Cron jobs**: trabajos aislados pueden establecer una sobrescritura de `model` por trabajo.
    - **Sub-agentes**: enruta tareas a agentes separados con diferentes modelos predeterminados.
    - **Cambio bajo demanda**: usa `/model` para cambiar el modelo de la sesión actual en cualquier momento.

    Consulta [Cron jobs](/es/automation/cron-jobs), [Enrutamiento multiagente](/es/concepts/multi-agent) y [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="El bot se congela mientras realiza trabajos pesados. ¿Cómo puedo descargar eso?">
    Use **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
    devuelven un resumen y mantienen su chat principal responsivo.

    Pídale a su bot que "genere un sub-agente para esta tarea" o use `/subagents`.
    Use `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

    Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, configure un
    modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

    Documentación: [Sub-agentes](/es/tools/subagents), [Tareas en segundo plano](/es/automation/tasks).

  </Accordion>

  <Accordion title="¿Cómo funcionan las sesiones de subagente vinculadas a hilos en Discord?">
    Use enlaces de hilos. Puede vincular un hilo de Discord a un objetivo de subagente o sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

    Flujo básico:

    - Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para seguimiento persistente).
    - O vincule manualmente con `/focus <target>`.
    - Use `/agents` para inspeccionar el estado del enlace.
    - Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el autoenfoque.
    - Use `/unfocus` para desvincular el hilo.

    Configuración requerida:

    - Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Invalidaciones de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Auto-vinculación al generar: `channels.discord.threadBindings.spawnSessions` se predetermina a `true`; configúrelo en `false` para desactivar la generación de sesiones vinculadas a hilos.

    Documentación: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="Un subagente terminó, pero la actualización de finalización fue al lugar equivocado o nunca se publicó. ¿Qué debo verificar?">
    Verifique primero la ruta del solicitante resuelta:

    - La entrega del subagente en modo de finalización prefiere cualquier ruta de hilo o conversación vinculada cuando existe una.
    - Si el origen de la finalización solo lleva un canal, OpenClaw recurre a la ruta almacenada de la sesión del solicitante (`lastChannel` / `lastTo` / `lastAccountId`) para que la entrega directa aún pueda tener éxito.
    - Si no existe una ruta vinculada ni una ruta almacenada utilizable, la entrega directa puede fallar y el resultado recurre a la entrega de sesión en cola en lugar de publicarse inmediatamente en el chat.
    - Los objetivos inválidos o obsoletos aún pueden forzar la reserva de la cola o el fallo de entrega final.
    - Si la última respuesta visible del asistente del hijo es el token silencioso exacto `NO_REPLY` / `no_reply`, o exactamente `ANNOUNCE_SKIP`, OpenClaw suprime intencionalmente el anuncio en lugar de publicar un progreso anterior obsoleto.
    - Si el hijo agotó el tiempo de espera después de solo llamadas a herramientas, el anuncio puede colapsarlo en un breve resumen de progreso parcial en lugar de reproducir la salida cruda de la herramienta.

    Depuración:

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentación: [Sub-agentes](/es/tools/subagents), [Tareas en segundo plano](/es/automation/tasks), [Herramientas de sesión](/es/concepts/session-tool).

  </Accordion>

  <Accordion title="Cron o recordatorios no se ejecutan. ¿Qué debo verificar?">
    Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
    los trabajos programados no se ejecutarán.

    Lista de verificación:

    - Confirme que cron está habilitado (`cron.enabled`) y `OPENCLAW_SKIP_CRON` no está configurado.
    - Verifique que el Gateway se esté ejecutando 24/7 (sin suspensión/reinicios).
    - Verifique la configuración de zona horaria para el trabajo (`--tz` vs zona horaria del host).

    Depuración:

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Documentación: [Trabajos Cron](/es/automation/cron-jobs), [Automatización](/es/automation).

  </Accordion>

  <Accordion title="El cron se activó, pero no se envió nada al canal. ¿Por qué?">
    Primero verifique el modo de entrega:

    - `--no-deliver` / `delivery.mode: "none"` significa que no se espera ningún envío de reserva del runner.
    - Un objetivo de anuncio (announce target) faltante o inválido (`channel` / `to`) significa que el runner omitió la entrega saliente.
    - Fallos de autenticación del canal (`unauthorized`, `Forbidden`) significan que el runner intentó entregar pero las credenciales lo bloquearon.
    - Un resultado aislado silencioso (solo `NO_REPLY` / `no_reply`) se trata como intencionalmente no entregable, por lo que el runner también suprime la entrega de reserva en cola.

    Para trabajos cron aislados, el agente aún puede enviar directamente con la herramienta `message`
    cuando hay una ruta de chat disponible. `--announce` solo controla la ruta de
    reserva del runner para el texto final que el agente aún no ha enviado.

    Depuración:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentación: [Cron jobs](/es/automation/cron-jobs), [Background Tasks](/es/automation/tasks).

  </Accordion>

  <Accordion title="¿Por qué una ejecución de cron aislada cambió de modelos o reintentó una vez?">
    Esa suele ser la ruta de cambio de modelo en vivo, no una programación duplicada.

    El cron aislado puede persistir un traspaso de modelo en tiempo de ejecución y reintentar cuando la ejecución
    activa lanza `LiveSessionModelSwitchError`. El reintento mantiene el proveedor/modelo
    cambiado, y si el cambio conllevaba una nueva anulación de perfil de autenticación, el cron
    también persiste eso antes de reintentar.

    Reglas de selección relacionadas:

    - La anulación del modelo del enlace (hook) de Gmail gana primero cuando es aplicable.
    - Luego `model` por trabajo.
    - Luego cualquier anulación de modelo de sesión de cron almacenada.
    - Luego la selección normal de modelo de agente/predeterminado.

    El bucle de reintento está limitado. Después del intento inicial más 2 reintentos de cambio,
    el cron aborta en lugar de hacer un bucle infinito.

    Depuración:

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentación: [Cron jobs](/es/automation/cron-jobs), [cron CLI](/es/cli/cron).

  </Accordion>

  <Accordion title="¿Cómo instalo habilidades en Linux?">
    Use comandos nativos de `openclaw skills` o coloque habilidades en su espacio de trabajo. La interfaz de usuario de Habilidades de macOS no está disponible en Linux.
    Explore habilidades en [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    El `openclaw skills install` nativo escribe en el directorio del espacio de trabajo activo `skills/`
    . Instale la CLI `clawhub` separada solo si desea publicar o

n sincronizar sus propias habilidades. Para instalaciones compartidas entre agentes, coloque la habilidad en
`~/.openclaw/skills` y use `agents.defaults.skills` o
`agents.list[].skills` si desea limitar qué agentes pueden verla.

  </Accordion>

  <Accordion title="¿Puede OpenClaw ejecutar tareas según una programación o continuamente en segundo plano?">
    Sí. Use el programador de Gateway:

    - **Trabajos Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
    - **Latido (Heartbeat)** para verificaciones periódicas de la "sesión principal".
    - **Trabajos aislados** para agentes autónomos que publican resúmenes o envían a chats.

    Documentación: [Trabajos Cron](/es/automation/cron-jobs), [Automatización](/es/automation),
    [Latido](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title="¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?">
    No directamente. Las habilidades de macOS están controladas por `metadata.openclaw.os` más los binarios necesarios, y las habilidades solo aparecen en el mensaje del sistema cuando son elegibles en el **host Gateway**. En Linux, las habilidades exclusivas de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anules el control.

    Tienes tres patrones compatibles:

    **Opción A: ejecutar el Gateway en una Mac (lo más simple).**
    Ejecuta el Gateway donde existen los binarios de macOS y luego conéctate desde Linux en [modo remoto](#gateway-ports-already-running-and-remote-mode) o a través de Tailscale. Las habilidades se cargan normalmente porque el host Gateway es macOS.

    **Opción B: usar un nodo macOS (sin SSH).**
    Ejecuta el Gateway en Linux, empareja un nodo macOS (aplicación de la barra de menús) y configura **Node Run Commands** en "Always Ask" o "Always Allow" en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios necesarios existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si eliges "Always Ask", aprobar "Always Allow" en el mensaje añade ese comando a la lista de permitidos.

    **Opción C: proxy de binarios macOS a través de SSH (avanzado).**
    Mantén el Gateway en Linux, pero haz que los binarios CLI necesarios se resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego anula la habilidad para permitir Linux para que permanezca elegible.

    1. Crea un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Coloca el envoltorio en `PATH` en el host Linux (por ejemplo `~/bin/memo`).
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

  <Accordion title="¿Tienes una integración con Notion o HeyGen?">
    No está integrado hoy en día.

    Opciones:

    - **Habilidad / complemento personalizado:** lo mejor para un acceso a API confiable (tanto Notion como HeyGen tienen APIs).
    - **Automatización del navegador:** funciona sin código, pero es más lento y más frágil.

    Si deseas mantener el contexto por cliente (flujos de trabajo de agencia), un patrón simple es:

    - Una página de Notion por cliente (contexto + preferencias + trabajo activo).
    - Pedir al agente que busque esa página al comienzo de una sesión.

    Si deseas una integración nativa, abre una solicitud de función o crea una habilidad
    orientada a esas APIs.

    Instalar habilidades:

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Las instalaciones nativas aterrizan en el directorio del espacio de trabajo activo `skills/`. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Si solo algunos agentes deben ver una instalación compartida, configura `agents.defaults.skills` o `agents.list[].skills`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de Homebrew Linux FAQ anterior). Consulta [Skills](/es/tools/skills), [Skills config](/es/tools/skills-config) y [ClawHub](/es/clawhub).

  </Accordion>

  <Accordion title="¿Cómo uso mi Chrome con sesión iniciada existente con OpenClaw?">
    Usa el perfil de navegador `user` integrado, que se adjunta a través de Chrome DevTools MCP:

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si deseas un nombre personalizado, crea un perfil MCP explícito:

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    Esta ruta puede usar el navegador local anfitrión o un nodo de navegador conectado. Si la puerta de enlace se ejecuta en otro lugar, ejecuta un nodo anfitrión en la máquina del navegador o usa CDP remoto en su lugar.

    Límites actuales en `existing-session` / `user`:

    - las acciones están basadas en referencias, no en selectores CSS
    - las cargas requieren `ref` / `inputRef` y actualmente admiten un archivo a la vez
    - `responsebody`, exportación PDF, interceptación de descargas y acciones por lotes aún necesitan un navegador administrado o un perfil CDP sin formato

  </Accordion>
</AccordionGroup>

## Sandboxing y memoria

<AccordionGroup>
  <Accordion title="¿Existe una documentación dedicada al sandboxing?">
    Sí. Consulta [Sandboxing](/es/gateway/sandboxing). Para una configuración específica de Docker (puerta de enlace completa en Docker o imágenes de sandbox), consulta [Docker](/es/install/docker).
  </Accordion>

  <Accordion title="Docker se siente limitado, ¿cómo habilito todas las funciones?">
    La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye paquetes del sistema, Homebrew ni navegadores integrados. Para una configuración más completa:

    - Persiste `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
    - Incorpora dependencias del sistema en la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
    - Instala los navegadores de Playwright a través de la CLI incluida:
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Establece `PLAYWRIGHT_BROWSERS_PATH` y asegúrate de que la ruta se persista.

    Documentación: [Docker](/es/install/docker), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Puedo mantener los MDs personales pero hacer que los grupos sean públicos/sandboxed con un agente?">
    Sí, si su tráfico privado son los **MDs** y su tráfico público son los **grupos**.

    Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en el backend de sandbox configurado, mientras que la sesión principal de MD se mantiene en el host. Docker es el backend predeterminado si no elige uno. Luego, restringa las herramientas disponibles en las sesiones de sandbox a través de `tools.sandbox.tools`.

    Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Referencia clave de configuración: [Configuración de gateway](/es/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="¿Cómo puedo vincular una carpeta del host al entorno limitado?">
    Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej., `"/home/user/src:/src:ro"`). Los enlaces globales + por agente se fusionan; los enlaces por agente se ignoran cuando `scope: "shared"`. Utilice `:ro` para cualquier información sensible y recuerde que los enlaces omiten las barreras del sistema de archivos del sandbox.

    OpenClaw valida los orígenes de los enlaces tanto con la ruta normalizada como con la ruta canónica resuelta a través del antecesor existente más profundo. Esto significa que los escapes por padre de enlaces simbólicos (symlink) seguirán fallando (cerrados) incluso cuando el último segmento de la ruta aún no existe, y las comprobaciones de raíz permitida aún se aplican después de la resolución de enlaces simbólicos.

    Consulte [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.

  </Accordion>

  <Accordion title="¿Cómo funciona la memoria?">
    La memoria de OpenClaw son simplemente archivos Markdown en el espacio de trabajo del agente:

    - Notas diarias en `memory/YYYY-MM-DD.md`
    - Notas curadas a largo plazo en `MEMORY.md` (solo sesiones principales/privadas)

    OpenClaw también ejecuta un **vaciado silencioso de memoria precompactación** para recordar al modelo
    que escriba notas duraderas antes de la compactación automática. Esto solo se ejecuta cuando el espacio de trabajo
    es escribible (los entornos limitados de solo lectura lo omiten). Consulte [Memory](/es/concepts/memory).

  </Accordion>

  <Accordion title="La memoria sigue olvidando cosas. ¿Cómo hago que se quede guardada?">
    Pídale al bot que **escriba el dato en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
    el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

    Esto es todavía un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
    sabrá qué hacer. Si sigue olvidando, verifique que la Gateway esté utilizando el mismo
    espacio de trabajo en cada ejecución.

    Documentación: [Memory](/es/concepts/memory), [Agent workspace](/es/concepts/agent-workspace).

  </Accordion>

  <Accordion title="¿La memoria persiste para siempre? ¿Cuáles son los límites?">
    Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
    almacenamiento, no el modelo. El **contexto de sesión** todavía está limitado por la ventana de
    contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso
    existe la búsqueda de memoria: extrae solo las partes relevantes de vuelta al contexto.

    Documentación: [Memory](/es/concepts/memory), [Context](/es/concepts/context).

  </Accordion>

  <Accordion title="¿La búsqueda semántica de memoria requiere una clave de API de OpenAI?">
    Solo si usas **incrustaciones de OpenAI (embeddings)**. Codex OAuth cubre el chat/completions y
    **no** otorga acceso a incrustaciones, por lo que **iniciar sesión con Codex (OAuth o el
    inicio de sesión de Codex CLI)** no ayuda para la búsqueda semántica de memoria. Las incrustaciones de OpenAI
    todavía necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

    Si no configuras un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando puede
    resolver una clave de API (perfiles de autenticación, `models.providers.*.apiKey`, o variables de entorno).
    Prefiere OpenAI si se resuelve una clave de OpenAI, de lo contrario Gemini si se resuelve una clave de Gemini,
    luego Voyage, luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda
    de memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
    configurada y presente, OpenClaw
    prefiere `local`. Ollama es compatible cuando configuras explícitamente
    `memorySearch.provider = "ollama"`.

    Si prefieres permanecer local, establece `memorySearch.provider = "local"` (y opcionalmente
    `memorySearch.fallback = "none"`). Si quieres incrustaciones de Gemini, establece
    `memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
    `memorySearch.remote.apiKey`). Soportamos modelos de incrustación **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**
    - consulta [Memory](/es/concepts/memory) para los detalles de configuración.

  </Accordion>
</AccordionGroup>

## Dónde residen las cosas en el disco

<AccordionGroup>
  <Accordion title="¿Todos los datos utilizados con OpenClaw se guardan localmente?">
    No: **el estado de OpenClaw es local**, pero **los servicios externos aún ven lo que les envías**.

    - **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de Gateway
      (`~/.openclaw` + tu directorio de espacio de trabajo).
    - **Remoto por necesidad:** los mensajes que envíes a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
      sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
      servidores.
    - **Controlas la huella:** el uso de modelos locales mantiene los mensajes en tu máquina, pero el tráfico
      del canal aún pasa a través de los servidores del canal.

    Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="¿Dónde almacena OpenClaw sus datos?">
    Todo se encuentra en `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

    | Ruta                                                            | Propósito                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación de OAuth heredada (copiada en perfiles de autenticación al primer uso)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y opcionales `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga secreta opcional respaldada en archivo para proveedores `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas estáticas `api_key` depuradas)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (ej. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de conversaciones (por agente)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de sesión (por agente)                                       |

    Ruta heredada de agente único: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

    Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura mediante `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="¿Dónde deben residir AGENTS.md / SOUL.md / USER.md / MEMORY.md?">
    Estos archivos residen en el **espacio de trabajo del agente**, no en `~/.openclaw`.

    - **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md`, `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` opcional.
      La raíz en minúsculas `memory.md` es solo entrada de reparación heredada; `openclaw doctor --fix`
      puede combinarla en `MEMORY.md` cuando ambos archivos existen.
    - **Directorio de estado (`~/.openclaw`)**: configuración, estado del canal/proveedor, perfiles de autenticación, sesiones, registros,
      y habilidades compartidas (`~/.openclaw/skills`).

    El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable mediante:

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si el bot "olvida" después de reiniciar, confirma que el Gateway está utilizando el mismo
    espacio de trabajo en cada inicio (y recuerda: el modo remoto utiliza el espacio de trabajo del **host gateway**,
      no tu computadora portátil local).

    Consejo: si deseas un comportamiento o preferencia duradero, pide al bot que **lo escriba en
    AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

    Consulta [Espacio de trabajo del agente](/es/concepts/agent-workspace) y [Memoria](/es/concepts/memory).

  </Accordion>

  <Accordion title="Estrategia de copia de seguridad recomendada">
    Pon tu **espacio de trabajo del agente** en un repositorio git **privado** y haz una copia de seguridad en algún lugar
    privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
    y te permite restaurar la "mente" del asistente más tarde.

    **No** confirmes nada bajo `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
    Si necesitas una restauración completa, haz una copia de seguridad del espacio de trabajo y del directorio de estado
    por separado (consulta la pregunta sobre migración anterior).

    Documentos: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

  </Accordion>

<Accordion title="¿Cómo desinstalo OpenClaw por completo?">Consulta la guía dedicada: [Desinstalación](/es/install/uninstall).</Accordion>

  <Accordion title="¿Pueden los agentes trabajar fuera del espacio de trabajo?">
    Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox estricto.
    Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
    ubicaciones del host a menos que se habilite el sandbox. Si necesitas aislamiento, usa
    [`agents.defaults.sandbox`](/es/gateway/sandboxing) o la configuración de sandbox por agente. Si
    quieres que un repositorio sea el directorio de trabajo predeterminado, apunta el
    `workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantén el
    espacio de trabajo separado a menos que desees intencionalmente que el agente trabaje dentro de él.

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

  <Accordion title="Modo remoto: ¿dónde está el almacenamiento de sesiones?">
    El estado de la sesión es propiedad del **host de puerta de enlace**. Si estás en modo remoto, el almacenamiento de sesiones que te interesa está en la máquina remota, no en tu portátil local. Consulta [Gestión de sesiones](/es/concepts/session).
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

  <Accordion title='Configuré gateway.bind: "lan" (o "tailnet") y ahora nada escucha / la interfaz dice no autorizado'>
    Los enlaces no de bucle local **requieren una ruta de autenticación de puerta de enlace válida**. En la práctica, eso significa:

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
    - Las rutas de llamada locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
    - Para la autenticación por contraseña, configure `gateway.auth.mode: "password"` más `gateway.auth.password` (o `OPENCLAW_GATEWAY_PASSWORD`) en su lugar.
    - Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente a través de SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
    - Las configuraciones de Interfaz de usuario de Control con secreto compartido se autentican mediante `connect.params.auth.token` o `connect.params.auth.password` (almacenados en la configuración de la aplicación/interfaz). Los modos con identidad, como Tailscale Serve o `trusted-proxy`, utilizan encabezados de solicitud en su lugar. Evite poner secretos compartidos en las URL.
    - Con `gateway.auth.mode: "trusted-proxy"`, los proxies inversos de bucle local del mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito y una entrada de bucle local en `gateway.trustedProxies`.

  </Accordion>

  <Accordion title="¿Por qué necesito un token en localhost ahora?">
    OpenClaw exige la autenticación de la puerta de enlace de manera predeterminada, incluido el bucle local (loopback). En la ruta predeterminada normal, esto significa autenticación por token: si no se configura ninguna ruta de autenticación explícita, el inicio de la puerta de enlace se resuelve en modo token y genera un token solo para el tiempo de ejecución para ese inicio, por lo que **los clientes WS locales deben autenticarse**. Configure `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` o `OPENCLAW_GATEWAY_PASSWORD` explícitamente cuando los clientes necesiten un secreto estable entre reinicios. Esto bloquea que otros procesos locales llamen a la Gateway.

    Si prefieres una ruta de autenticación diferente, puedes elegir explícitamente el modo de contraseña (o, para proxies inversos con conocimiento de identidad, `trusted-proxy`). Si **realmente** quieres un bucle local abierto, establece `gateway.auth.mode: "none"` explícitamente en tu configuración. Doctor puede generar un token para ti en cualquier momento: `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="¿Tengo que reiniciar después de cambiar la configuración?">
    La Gateway observa la configuración y admite la recarga en caliente (hot-reload):

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

    - `off`: oculta el texto del lema pero mantiene la línea del título/versión del banner.
    - `default`: usa `All your chats, one OpenClaw.` cada vez.
    - `random`: lemas divertidos/estacionales rotativos (comportamiento predeterminado).
    - Si no quieres ningún banner, establece la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="¿Cómo habilito la búsqueda web (y la recuperación web)?">
    `web_fetch` funciona sin una clave de API. `web_search` depende del proveedor
    seleccionado:

    - Los proveedores con API como Brave, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Perplexity y Tavily requieren su configuración normal de clave de API.
    - Ollama Web Search no requiere clave, pero utiliza su host de Ollama configurado y requiere `ollama signin`.
    - DuckDuckGo no requiere clave, pero es una integración no oficial basada en HTML.
    - SearXNG es sin clave/autohospedado; configure `SEARXNG_BASE_URL` o `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recomendado:** ejecute `openclaw configure --section web` y elija un proveedor.
    Alternativas de entorno:

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
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

    La configuración de búsqueda web específica del proveedor ahora se encuentra bajo `plugins.entries.<plugin>.config.webSearch.*`.
    Las rutas de proveedor `tools.web.search.*` heredadas todavía se cargan temporalmente por compatibilidad, pero no deben usarse para nuevas configuraciones.
    La configuración alternativa de recuperación web de Firecrawl se encuentra bajo `plugins.entries.firecrawl.config.webFetch.*`.

    Notas:

    - Si utiliza listas de permitidos, agregue `web_search`/`web_fetch`/`x_search` o `group:web`.
    - `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
    - Si se omite `tools.web.fetch.provider`, OpenClaw detecta automáticamente el primer proveedor alternativo de recuperación listo de las credenciales disponibles. Hoy el proveedor incluido es Firecrawl.
    - Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno del servicio).

    Documentación: [Herramientas web](/es/tools/web).

  </Accordion>

  <Accordion title="config.apply borró mi configuración. ¿Cómo me recupero y evito esto?">
    `config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

    El OpenClaw actual protege contra muchos sobrescrituras accidentales:

    - Las escrituras de configuración propiedad de OpenClaw validan la configuración completa posterior al cambio antes de escribir.
    - Las escrituras propiedad de OpenClaw que no son válidas o destructivas se rechazan y guardan como `openclaw.json.rejected.*`.
    - Si una edición directa interrumpe el inicio o la recarga en caliente, Gateway falla de forma cerrada o omite la recarga; no reescribe `openclaw.json`.
    - `openclaw doctor --fix` posee la reparación y puede restaurar el último estado conocido bueno mientras guarda el archivo rechazado como `openclaw.json.clobbered.*`.

    Recuperación:

    - Verifica `openclaw logs --follow` para ver `Invalid config at`, `Config write rejected:` o `config reload skipped (invalid config)`.
    - Inspecciona el archivo `openclaw.json.clobbered.*` o `openclaw.json.rejected.*` más reciente junto con la configuración activa.
    - Ejecuta `openclaw config validate` y `openclaw doctor --fix`.
    - Copia de vuelta solo las claves deseadas con `openclaw config set` o `config.patch`.
    - Si no tienes un último estado conocido bueno ni una carga útil rechazada, restaura desde una copia de seguridad, o vuelve a ejecutar `openclaw doctor` y reconfigura los canales/modelos.
    - Si esto fue inesperado, informa un error e incluye tu última configuración conocida o cualquier copia de seguridad.
    - Un agente de codificación local a menudo puede reconstruir una configuración funcional a partir de los registros o el historial.

    Evítalo:

    - Usa `openclaw config set` para cambios pequeños.
    - Usa `openclaw configure` para ediciones interactivas.
    - Usa `config.schema.lookup` primero cuando no estés seguro de una ruta exacta o la forma del campo; devuelve un nodo de esquema superficial más resúmenes secundarios inmediatos para profundizar.
    - Usa `config.patch` para ediciones RPC parciales; mantén `config.apply` solo para el reemplazo completo de la configuración.
    - Si estás usando la herramienta `gateway` exclusiva del propietario desde una ejecución de agente, aún rechazará las escrituras en `tools.exec.ask` / `tools.exec.security` (incluidos los alias `tools.bash.*` heredados que se normalizan a las mismas rutas de ejecución protegidas).

    Documentación: [Config](/es/cli/config), [Configure](/es/cli/configure), [Gateway troubleshooting](/es/gateway/troubleshooting#gateway-rejected-invalid-config), [Doctor](/es/gateway/doctor).

  </Accordion>

  <Accordion title="¿Cómo ejecuto un Gateway central con trabajadores especializados en varios dispositivos?">
    El patrón común es **un Gateway** (por ejemplo, Raspberry Pi) más **nodos** y **agentes**:

    - **Gateway (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
    - **Nodos (dispositivos):** Macs/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
    - **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (por ejemplo, "Hetzner ops", "Datos personales").
    - **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando se desea paralelismo.
    - **TUI:** se conecta al Gateway y cambia de agentes/sesiones.

    Documentación: [Nodos](/es/nodes), [Acceso remoto](/es/gateway/remote), [Enrutamiento multiagente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [TUI](/es/web/tui).

  </Accordion>

  <Accordion title="¿Puede ejecutarse el navegador OpenClaw en modo headless?">
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

    El valor predeterminado es `false` (con interfaz). El modo headless es más propenso a activar comprobaciones anti-bot en algunos sitios. Consulte [Navegador](/es/tools/browser).

    El modo headless utiliza el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias son:

    - Sin ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
    - Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
      Por ejemplo, X/Twitter a menudo bloquea las sesiones headless.

  </Accordion>

  <Accordion title="¿Cómo uso Brave para el control del navegador?">
    Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie el Gateway.
    Vea los ejemplos completos de configuración en [Navegador](/es/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways y nodos remotos

<AccordionGroup>
  <Accordion title="¿Cómo se propagan los comandos entre Telegram, la puerta de enlace y los nodos?">
    Los mensajes de Telegram son gestionados por la **puerta de enlace** (gateway). La puerta de enlace ejecuta el agente y
    solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

    Telegram → Puerta de enlace → Agente → `node.*` → Nodo → Puerta de enlace → Telegram

    Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

  </Accordion>

  <Accordion title="¿Cómo puede mi agente acceder a mi ordenador si el Gateway está alojado de forma remota?">
    Respuesta corta: **empareja tu ordenador como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
    invocar herramientas `node.*` (pantalla, cámara, sistema) en tu máquina local a través del WebSocket del Gateway.

    Configuración típica:

    1. Ejecuta el Gateway en el host siempre activo (VPS/servidor doméstico).
    2. Pon el host del Gateway y tu ordenador en la misma tailnet.
    3. Asegúrate de que el WS del Gateway sea accesible (enlace de tailnet o túnel SSH).
    4. Abre la aplicación de macOS localmente y conéctate en modo **Remote over SSH** (o tailnet directa)
       para que pueda registrarse como nodo.
    5. Aprobar el nodo en el Gateway:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    No se requiere ningún puente TCP separado; los nodos se conectan a través del WebSocket del Gateway.

    Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
    empareja dispositivos en los que confíes y revisa [Seguridad](/es/gateway/security).

    Documentación: [Nodos](/es/nodes), [Protocolo del Gateway](/es/gateway/protocol), [Modo remoto de macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

  </Accordion>

  <Accordion title="Tailscale está conectado pero no recibo respuestas. ¿Qué hago ahora?">
    Comprueba lo básico:

    - El Gateway se está ejecutando: `openclaw gateway status`
    - Estado del Gateway: `openclaw status`
    - Estado del canal: `openclaw channels status`

    Luego verifica la autenticación y el enrutamiento:

    - Si usas Tailscale Serve, asegúrate de que `gateway.auth.allowTailscale` esté configurado correctamente.
    - Si te conectas a través de un túnel SSH, confirma que el túnel local está activo y apunta al puerto correcto.
    - Confirma que tus listas de permitidos (DM o grupo) incluyen tu cuenta.

    Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

  </Accordion>

  <Accordion title="¿Pueden comunicarse entre sí dos instancias de OpenClaw (local + VPS)?">
    Sí. No hay un puente incorporado "de bot a bot", pero puedes configurarlo de algunas
    formas confiables:

    **Lo más sencillo:** utiliza un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
    Haz que el Bot A envíe un mensaje al Bot B y deja que el Bot B responda como de costumbre.

    **Puente CLI (genérico):** ejecuta un script que llame al otro Gateway con
    `openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
    escuche. Si un bot está en un VPS remoto, apunta tu CLI a ese Gateway remoto
    a través de SSH/Tailscale (consulta [Acceso remoto](/es/gateway/remote)).

    Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar el Gateway de destino):

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Consejo: añade una restricción para que los dos bots no bucleen infinitamente (solo menciones, listas
    de permitidos en el canal o una regla de "no responder a mensajes de bots").

    Documentación: [Acceso remoto](/es/gateway/remote), [Agent CLI](/es/cli/agent), [Agent send](/es/tools/agent-send).

  </Accordion>

  <Accordion title="¿Necesito VPS separados para múltiples agentes?">
    No. Un Gateway puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, valores predeterminados de modelo
    y enrutamiento. Esa es la configuración normal y es mucho más barata y sencilla que ejecutar
    un VPS por agente.

    Use VPS separados solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones
    muy diferentes que no desee compartir. De lo contrario, mantenga un Gateway y
    use múltiples agentes o subagentes.

  </Accordion>

  <Accordion title="¿Hay algún beneficio en usar un nodo en mi computadora portátil personal en lugar de SSH desde un VPS?">
    Sí: los nodos son la forma principal de alcanzar su computadora portátil desde un Gateway remoto y
    desbloquean más que el acceso de shell. El Gateway se ejecuta en macOS/Linux (Windows a través de WSL2) y es
    liviano (un VPS pequeño o una caja de clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración
    común es un host siempre encendido más su computadora portátil como nodo.

    - **No se requiere SSH entrante.** Los nodos se conectan al WebSocket del Gateway y usan el emparejamiento de dispositivos.
    - **Controles de ejecución más seguros.** `system.run` está restringido por listas de aprobación/aprobaciones de nodos en esa computadora portátil.
    - **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
    - **Automatización del navegador local.** Mantenga el Gateway en un VPS, pero ejecute Chrome localmente a través de un host de nodo en la computadora portátil, o adjúntese al Chrome local en el host a través de Chrome MCP.

    SSH está bien para el acceso de shell ad-hoc, pero los nodos son más simples para flujos de trabajo de agentes continuos y
    automatización de dispositivos.

    Documentos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Navegador](/es/tools/browser).

  </Accordion>

  <Accordion title="¿Los nodos ejecutan un servicio de gateway?">
    No. Solo se debe ejecutar **un gateway** por host a menos que intencionalmente ejecute perfiles aislados (ver [Múltiples gateways](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan
    al gateway (nodos iOS/Android, o "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin interfaz gráfica
    y control por CLI, consulte [CLI de host de nodo](/es/cli/node).

    Se requiere un reinicio completo para `gateway`, `discovery` y cambios en la superficie de plugins alojados.

  </Accordion>

  <Accordion title="¿Hay alguna forma de API / RPC para aplicar la configuración?">
    Sí.

    - `config.schema.lookup`: inspeccionar un subárbol de configuración con su nodo de esquema superficial, sugerencia de interfaz coincidente y resúmenes de hijos inmediatos antes de escribir
    - `config.get`: obtener la instantánea actual + hash
    - `config.patch`: actualización parcial segura (preferida para la mayoría de las ediciones RPC); recarga en caliente cuando es posible y se reinicia cuando es necesario
    - `config.apply`: validar + reemplazar la configuración completa; recarga en caliente cuando es posible y se reinicia cuando es necesario
    - La herramienta de tiempo de ejecución `gateway` solo para el propietario aún se niega a reescribir `tools.exec.ask` / `tools.exec.security`; los alias `tools.bash.*` heredados se normalizan a las mismas rutas de ejecución protegidas

  </Accordion>

  <Accordion title="Configuración mínima sensata para una primera instalación">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Esto establece su espacio de trabajo y restringe quién puede activar el bot.

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

    Si deseas la interfaz de usuario de Control sin SSH, usa Tailscale Serve en el VPS:

    ```bash
    openclaw gateway --tailscale serve
    ```

    Esto mantiene el enlace vinculado a loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

  </Accordion>

  <Accordion title="¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?">
    Serve expone la **Interfaz de usuario de Control del Gateway + WS**. Los nodos se conectan a través del mismo punto final WS del Gateway.

    Configuración recomendada:

    1. **Asegúrate de que el VPS + Mac estén en la misma tailnet**.
    2. **Usa la aplicación macOS en modo Remoto** (el destino SSH puede ser el nombre de host de la tailnet).
       La aplicación creará un túnel del puerto del Gateway y se conectará como un nodo.
    3. **Aprobar el nodo** en la puerta de enlace:

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    Documentación: [Protocolo de Gateway](/es/gateway/protocol), [Descubrimiento](/es/gateway/discovery), [modo remoto macOS](/es/platforms/mac/remote).

  </Accordion>

  <Accordion title="¿Debo instalar en un segundo portátil o simplemente agregar un nodo?">
    Si solo necesitas **herramientas locales** (pantalla/cámara/exec) en el segundo portátil, agrégalo como un
    **nodo**. Esto mantiene un solo Gateway y evita configuraciones duplicadas. Las herramientas de nodo local
    actualmente son solo para macOS, pero planeamos extenderlas a otros sistemas operativos.

    Instala un segundo Gateway solo cuando necesites **aislamiento estricto** o dos bots totalmente separados.

    Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples gateways](/es/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables de entorno y carga de .env

<AccordionGroup>
  <Accordion title="¿Cómo carga OpenClaw las variables de entorno?">
    OpenClaw lee las variables de entorno del proceso padre (shell, launchd/systemd, CI, etc.) y además carga:

    - `.env` desde el directorio de trabajo actual
    - un `.env` de reserva global desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

    Ningún archivo `.env` sobrescribe las variables de entorno existentes.

    También puedes definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Consulta [/environment](/es/help/environment) para obtener la precedencia completa y las fuentes.

  </Accordion>

  <Accordion title="Inicié el Gateway a través del servicio y mis variables de entorno desaparecieron. ¿Qué hago?">
    Dos soluciones comunes:

    1. Coloque las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de su shell.
    2. Habilite la importación del shell (comodidad opcional):

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

    Esto ejecuta su shell de inicio de sesión e importa solo las claves esperadas faltantes (nunca sobrescribe). Equivalentes de variables de entorno:
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='Establecí COPILOT_GITHUB_TOKEN, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?'>
    `openclaw models status` informa si la **importación del entorno del shell** está habilitada. "Shell env: off"
    **no** significa que falten tus variables de entorno; solo significa que OpenClaw no cargará
    tu shell de inicio de sesión automáticamente.

    Si el Gateway se ejecuta como servicio (launchd/systemd), no heredará tu entorno

n del shell. Solucionalo haciendo una de estas cosas:

    1. Pon el token en `~/.openclaw/.env`:

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. O habilita la importación del shell (`env.shellEnv.enabled: true`).
    3. O agrégalo a tu bloque `env` de configuración (se aplica solo si falta).

    Luego reinicia el gateway y verifica nuevamente:

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
    Las sesiones pueden caducar después de `session.idleMinutes`, pero esto está **deshabilitado por defecto** (por defecto **0**).
    Establézcalo en un valor positivo para habilitar la caducidad por inactividad. Cuando está habilitado, el **siguiente**
    mensaje después del periodo de inactividad inicia un nuevo id de sesión para esa clave de chat.
    Esto no elimina las transcripciones - simplemente inicia una nueva sesión.

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
    es menos eficiente que usar un bot con sesiones separadas. El modelo típico que
    envisionamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
    bot también puede generar subagentes cuando sea necesario.

    Documentación: [Enrutamiento multiagente](/es/concepts/multi-agent), [Subagentes](/es/tools/subagents), [CLI de agentes](/es/cli/agents).

  </Accordion>

  <Accordion title="¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo lo evito?">
    El contexto de la sesión está limitado por la ventana del modelo. Los chats largos, las grandes salidas de herramientas o muchos
    archivos pueden desencadenar una compactación o truncamiento.

    Lo que ayuda:

    - Pida al bot que resuma el estado actual y lo escriba en un archivo.
    - Use `/compact` antes de tareas largas, y `/new` al cambiar de tema.
    - Mantenga el contexto importante en el espacio de trabajo y pida al bot que lo lea de nuevo.
    - Use sub-agentes para trabajos largos o paralelos para que el chat principal se mantenga más pequeño.
    - Elija un modelo con una ventana de contexto más grande si esto sucede a menudo.

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

  <Accordion title='Estoy obteniendo errores de "contexto demasiado grande" - ¿cómo restablezco o compacto?'>
    Usa uno de estos:

    - **Compactar** (mantiene la conversación pero resume turnos anteriores):

      ```
      /compact
      ```

      o `/compact <instructions>` para guiar el resumen.

    - **Restablecer** (ID de sesión nuevo para la misma clave de chat):

      ```
      /new
      /reset
      ```

    Si sigue sucediendo:

    - Habilita o ajusta la **poda de sesiones** (`agents.defaults.contextPruning`) para recortar el resultado de herramientas antiguo.
    - Usa un modelo con una ventana de contexto más grande.

    Documentación: [Compactación](/es/concepts/compaction), [Poda de sesiones](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

  </Accordion>

  <Accordion title='¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?'>
    Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el
    `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos
    o un cambio de herramienta/esquema).

    Solución: inicie una sesión nueva con `/new` (mensaje independiente).

  </Accordion>

  <Accordion title="¿Por qué recibo mensajes de latido cada 30 minutos?">
    Los latidos se ejecutan cada **30m** de forma predeterminada (**1h** al usar autenticación OAuth). Ajusta o desactívalos:

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

    Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados
    de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
    Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

    Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Heartbeat](/es/gateway/heartbeat).

  </Accordion>

  <Accordion title='¿Necesito añadir una "cuenta de bot" a un grupo de WhatsApp?'>
    No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
    Por defecto, las respuestas grupales están bloqueadas hasta que permitas los remitentes (`groupPolicy: "allowlist"`).

    Si deseas que solo **tú** puedas activar las respuestas grupales:

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
    Opción 1 (la más rápida): haz un seguimiento de los registros (tail logs) y envía un mensaje de prueba en el grupo:

    ```bash
    openclaw logs --follow --json
    ```

    Busca `chatId` (o `from`) que termine en `@g.us`, por ejemplo:
    `1234567890-1234567890@g.us`.

    Opción 2 (si ya está configurado/en la lista permitida): enumera los grupos desde la configuración:

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

  </Accordion>

  <Accordion title="¿Por qué OpenClaw no responde en un grupo?">
    Dos causas comunes:

    - El filtrado de menciones está activado (predeterminado). Debes @mencionar al bot (o coincidir con `mentionPatterns`).
    - Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista permitida.

    Consulta [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

  </Accordion>

<Accordion title="¿Los grupos/hilos comparten el contexto con los MD?">Los chats directos se colapsan en la sesión principal de forma predeterminada. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones separadas. Consulta [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).</Accordion>

  <Accordion title="¿Cuántos espacios de trabajo y agentes puedo crear?">
    No hay límites estrictos. Docenas (incluso cientos) están bien, pero vigile lo siguiente:

    - **Crecimiento del disco:** las sesiones + las transcripciones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.
    - **Costo de tokens:** más agentes significa más uso simultáneo del modelo.
    - **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

    Consejos:

    - Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
    - Pode las sesiones antiguas (elimine las entradas JSONL o del almacén) si el disco crece.
    - Use `openclaw doctor` para detectar espacios de trabajo extraviados y desajustes de perfil.

  </Accordion>

  <Accordion title="¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debería configurarlo?">
    Sí. Utiliza el **enrutamiento multiagente** (Multi-Agent Routing) para ejecutar varios agentes aislados y enrutar mensajes entrantes por
    canal/cuenta/par. Slack es compatible como canal y se puede vincular a agentes específicos.

    El acceso a través del navegador es potente pero no "hace todo lo que un humano puede"; anti-bot, CAPTCHAs y MFA pueden
    seguir bloqueando la automatización. Para el control de navegador más fiable, usa Chrome MCP local en el host,
    o usa CDP en la máquina que realmente ejecuta el navegador.

    Configuración recomendada:

    - Host de puerta de enlace (Gateway) siempre activo (VPS/Mac mini).
    - Un agente por rol (vinculaciones).
    - Canal(es) de Slack vinculados a esos agentes.
    - Navegador local a través de Chrome MCP o un nodo cuando sea necesario.

    Documentación: [Enrutamiento multiagente](/es/concepts/multi-agent), [Slack](/es/channels/slack),
    [Navegador](/es/tools/browser), [Nodos](/es/nodes).

  </Accordion>
</AccordionGroup>

## Modelos, conmutación por error y perfiles de autenticación

Preguntas y respuestas sobre modelos — valores predeterminados, selección, alias, cambio, conmutación por error, perfiles de autenticación —
se encuentran en las [Preguntas frecuentes sobre modelos](/es/help/faq-models).

## Gateway: puertos, "ya se está ejecutando" y modo remoto

<AccordionGroup>
  <Accordion title="¿Qué puerto utiliza la Gateway?">
    `gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (Interfaz de control, hooks, etc.).

    Precedencia:

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='¿Por qué el estado de openclaw gateway dice "Runtime: running" (Ejecución: en ejecución) pero "Connectivity probe: failed" (Sonda de conectividad: fallida)?'>
    Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La sonda de conectividad es la CLI conectándose realmente al WebSocket de la gateway.

    Use `openclaw gateway status` y confíe en estas líneas:

    - `Probe target:` (la URL que usó realmente la sonda)
    - `Listening:` (lo que realmente está vinculado en el puerto)
    - `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

  </Accordion>

  <Accordion title='¿Por qué el estado de openclaw gateway muestra "Config (cli)" y "Config (service)" diferentes?'>
    Está editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

    Solución:

    ```bash
    openclaw gateway install --force
    ```

    Ejecute eso desde el mismo `--profile` / entorno que desea que el servicio utilice.

  </Accordion>

  <Accordion title='¿Qué significa "another gateway instance is already listening" (otra instancia de gateway ya está escuchando)?'>
    OpenClaw impone un bloqueo de tiempo de ejecución vinculando el escucha de WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si la vinculación falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

    Solución: detenga la otra instancia, libere el puerto o ejecute con `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?">
    Establezca `gateway.mode: "remote"` y apunte a una URL remota de WebSocket, opcionalmente con credenciales remotas de secreto compartido:

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

    - `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasa la bandera de anulación).
    - La aplicación de macOS observa el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.
    - `gateway.remote.token` / `.password` son solo credenciales remotas del lado del cliente; no habilitan la autenticación del gateway local por sí mismas.

  </Accordion>

  <Accordion title='La Interfaz de Control (Control UI) dice "no autorizado" (o sigue reconectándose). ¿Qué hacer?'>
    La ruta de autenticación de su puerta de enlace y el método de autenticación de la interfaz de usuario no coinciden.

    Datos (del código):

    - La Interfaz de Control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL de la puerta de enlace seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token localStorage a largo plazo.
    - En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo almacenado en caché cuando la puerta de enlace devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Ese reintento con token en caché ahora reutiliza los alcances aprobados en caché almacenados con el token de dispositivo. Los llamadores `deviceToken` explícitos / `scopes` explícitos aún mantienen su conjunto de alcances solicitados en lugar de heredar los alcances en caché.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de arranque.
    - El arranque con código de configuración integrado es solo para nodos. Después de la aprobación, devuelve un token de dispositivo de nodo con `scopes: []` y no devuelve un token de operador transferido.

    Solución:

    - El más rápido: `openclaw dashboard` (imprime + copia la URL del panel, intenta abrirla; muestra una sugerencia SSH si no tiene interfaz gráfica).
    - Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
    - Si es remoto, abra un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
    - Modo de secreto compartido: configure `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` o `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, y luego pegue el secreto correspondiente en la configuración de la Interfaz de Control.
    - Modo Tailscale Serve: asegúrese de que `gateway.auth.allowTailscale` esté habilitado y de que está abriendo la URL de Serve, no una URL de bucle invertido (loopback) / tailnet sin procesar que omita los encabezados de identidad de Tailscale.
    - Modo de proxy de confianza: asegúrese de que está accediendo a través del proxy con conocimiento de identidad configurado, no a través de una URL de puerta de enlace sin procesar. Los proxies de bucle invertido del mismo host también necesitan `gateway.auth.trustedProxy.allowLoopback = true`.
    - Si la discrepancia persiste después del único reintento, rote/vuelva a aprobar el token del dispositivo emparejado:
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si esa llamada de rotación indica que fue denegada, verifique dos cosas:
      - las sesiones de dispositivo emparejado solo pueden rotar su **propio** dispositivo a menos que también tengan `operator.admin`
      - los valores `--scope` explícitos no pueden exceder los alcances de operador actuales de la persona que llama
    - ¿Sigues atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/es/gateway/troubleshooting). Consulte [Panel de control](/es/web/dashboard) para obtener detalles de autenticación.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind selecciona una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que enlazar.

    Solución:

    - Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
    - Cambie a `gateway.bind: "loopback"` / `"lan"`.

    Nota: `tailnet` es explícito. `auto` prefiere el loopback; use `gateway.bind: "tailnet"` cuando desee un enlace exclusivo de tailnet.

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    Por lo general, no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use múltiples Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

    Sí, pero debe aislar:

    - `OPENCLAW_CONFIG_PATH` (configuración por instancia)
    - `OPENCLAW_STATE_DIR` (estado por instancia)
    - `agents.defaults.workspace` (aislamiento del espacio de trabajo)
    - `gateway.port` (puertos únicos)

    Configuración rápida (recomendada):

    - Use `openclaw --profile <name> ...` por instancia (crea automáticamente `~/.openclaw-<name>`).
    - Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
    - Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

    Los perfiles también sufijan los nombres de servicio (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guía completa: [Multiple gateways](/es/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='¿Qué significa "invalid handshake" / código 1008?'>
    El Gateway es un **servidor WebSocket**, y espera que el primer mensaje sea
    un marco `connect`. Si recibe cualquier otra cosa, cierra la conexión
    con el **código 1008** (violación de política).

    Causas comunes:

    - Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
    - Usó el puerto o la ruta incorrectos.
    - Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

    Soluciones rápidas:

    1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
    2. No abra el puerto WS en una pestaña normal del navegador.
    3. Si la autenticación está activa, incluya el token/contraseña en el marco `connect`.

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

    Puede establecer una ruta estable a través de `logging.file`. El nivel de registro de archivo se controla mediante `logging.level`. La verbosidad de la consola se controla mediante `--verbose` y `logging.consoleLevel`.

    Seguimiento de registros más rápido:

    ```bash
    openclaw logs --follow
    ```

    Registros de servicio/supervisor (cuando el gateway se ejecuta a través de launchd/systemd):

    - macOS launchd stdout: `~/Library/Logs/openclaw/gateway.log` (los perfiles usan `gateway-<profile>.log`; stderr está suprimido)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Consulte [Troubleshooting](/es/gateway/troubleshooting) para más información.

  </Accordion>

  <Accordion title="¿Cómo inicio/detengo/reinicio el servicio Gateway?">
    Use los ayudantes del gateway:

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si ejecuta el gateway manualmente, `openclaw gateway --force` puede reclamar el puerto. Consulte [Gateway](/es/gateway).

  </Accordion>

  <Accordion title="Cerré mi terminal en Windows: ¿cómo reinicio OpenClaw?">
    Hay **dos modos de instalación en Windows**:

    **1) WSL2 (recomendado):** la Gateway se ejecuta dentro de Linux.

    Abra PowerShell, entre en WSL y luego reinicie:

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si nunca instaló el servicio, inícielo en primer plano:

    ```bash
    openclaw gateway run
    ```

    **2) Windows nativo (no recomendado):** la Gateway se ejecuta directamente en Windows.

    Abra PowerShell y ejecute:

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si lo ejecuta manualmente (sin servicio), use:

    ```powershell
    openclaw gateway run
    ```

    Documentación: [Windows (WSL2)](/es/platforms/windows), [Manual de servicio de Gateway](/es/gateway).

  </Accordion>

  <Accordion title="La Gateway está activa pero las respuestas nunca llegan. ¿Qué debo comprobar?">
    Comience con un rápido chequeo de estado:

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causas comunes:

    - La autenticación del modelo no se cargó en el **host de la gateway** (compruebe `models status`).
    - El emparejamiento de canales/lista de permitidos está bloqueando las respuestas (compruebe la configuración del canal + los registros).
    - WebChat/Dashboard está abierto sin el token correcto.

    Si es remoto, confirme que la conexión túnel/Tailscale esté activa y que el
    WebSocket de la Gateway sea accesible.

    Documentación: [Canales](/es/channels), [Solución de problemas](/es/gateway/troubleshooting), [Acceso remoto](/es/gateway/remote).

  </Accordion>

  <Accordion title='"Desconectado de la gateway: sin motivo" - ¿y ahora qué?'>
    Esto generalmente significa que la interfaz perdió la conexión WebSocket. Compruebe:

    1. ¿Se está ejecutando la Gateway? `openclaw gateway status`
    2. ¿Está sana la Gateway? `openclaw status`
    3. ¿Tiene la interfaz el token correcto? `openclaw dashboard`
    4. Si es remoto, ¿está activo el enlace túnel/Tailscale?

    Luego consulte los registros:

    ```bash
    openclaw logs --follow
    ```

    Documentación: [Dashboard](/es/web/dashboard), [Acceso remoto](/es/gateway/remote), [Solución de problemas](/es/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Error en setMyCommands de Telegram. ¿Qué debería comprobar?">
    Comience con los registros y el estado del canal:

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Luego compare el error:

    - `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta al límite de Telegram y reintentar con menos comandos, pero algunas entradas del menú todavía deben eliminarse. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si está en un VPS o detrás de un proxy, confirme que el HTTPS saliente está permitido y que el DNS funciona para `api.telegram.org`.

    Si el Gateway es remoto, asegúrese de estar mirando los registros en el host del Gateway.

    Documentación: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

  </Accordion>

  <Accordion title="La TUI no muestra salida. ¿Qué debería comprobar?">
    Primero confirme que el Gateway es accesible y que el agente puede ejecutarse:

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal
    de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

    Documentación: [TUI](/es/web/tui), [Comandos de barra](/es/tools/slash-commands).

  </Accordion>

  <Accordion title="¿Cómo detengo y luego inicio el Gateway por completo?">
    Si instaló el servicio:

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
    Úselo cuando el Gateway se ejecuta en segundo plano como un demonio.

    Si se está ejecutando en primer plano, deténgalo con Ctrl-C, y luego:

    ```bash
    openclaw gateway run
    ```

    Documentación: [Manual de servicio del Gateway](/es/gateway).

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
    - `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

    Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
    desee una ejecución única en primer plano.

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver la autenticación del canal, el enrutamiento del modelo y los errores de RPC.
  </Accordion>
</AccordionGroup>

## Medios y archivos adjuntos

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    Los datos adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente de OpenClaw](/es/start/openclaw) y [Envío del agente](/es/tools/agent-send).

    Envío desde CLI:

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    También compruebe:

    - El canal de destino soporta medios salientes y no está bloqueado por listas de permitidos.
    - El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).
    - `tools.fs.workspaceOnly=true` limita los envíos de rutas locales al espacio de trabajo, temp/media-store y archivos validados por el sandbox.
    - `tools.fs.workspaceOnly=false` permite que `MEDIA:` envíe archivos locales del host que el agente ya puede leer, pero solo para medios más tipos de documentos seguros (imágenes, audio, video, PDF y documentos de Office). Los archivos de texto plano y similares a secretos siguen bloqueados.

    Consulte [Imágenes](/es/nodes/images).

  </Accordion>
</AccordionGroup>

## Seguridad y control de acceso

<AccordionGroup>
  <Accordion title="¿Es seguro exponer OpenClaw a MD entrantes?">
    Trate los MD entrantes como entrada que no es de confianza. Los valores predeterminados están diseñados para reducir el riesgo:

    - El comportamiento predeterminado en los canales con capacidad de MD es **emparejamiento** (pairing):
      - Los remitentes desconocidos reciben un código de emparejamiento; el bot no procesa su mensaje.
      - Apruebe con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
    - Abrir los MD públicamente requiere una opción explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

    Ejecute `openclaw doctor` para revelar políticas de MD riesgosas.

  </Accordion>

  <Accordion title="¿La inyección de prompts es solo una preocupación para los bots públicos?">
    No. La inyección de prompts se trata de **contenido que no es de confianza**, no solo de quién puede enviar MD al bot.
    Si su asistente lee contenido externo (búsqueda/recuperación web, páginas del navegador, correos electrónicos,
    documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
    secuestrar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

    El mayor riesgo ocurre cuando las herramientas están habilitadas: el modelo puede ser engañado para
    exfiltrar contexto o llamar a herramientas en su nombre. Reduzca el radio de explosión por:

    - usar un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir contenido que no es de confianza
    - mantener `web_search` / `web_fetch` / `browser` desactivado para agentes con herramientas habilitadas
    - tratar también el texto de archivos/documentos decodificados como que no es de confianza: OpenResponses
      `input_file` y la extracción de archivos adjuntos multimedia envuelven el texto extraído en
      marcadores de límite de contenido externo explícitos en lugar de pasar el texto del archivo sin procesar
    - sandboxing y listas de permitidos de herramientas estrictas

    Detalles: [Security](/es/gateway/security).

  </Accordion>

  <Accordion title="¿Debería mi bot tener su propio correo electrónico, cuenta de GitHub o número de teléfono?">
    Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
    reduce el radio de impacto si algo sale mal. Esto también facilita la rotación de
    credenciales o la revocación del acceso sin afectar tus cuentas personales.

    Empieza pequeño. Otorga acceso solo a las herramientas y cuentas que realmente necesites y amplía
    más tarde si es necesario.

    Documentación: [Seguridad](/es/gateway/security), [Emparejamiento](/es/channels/pairing).

  </Accordion>

  <Accordion title="¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?">
    **No** recomendamos la autonomía total sobre tus mensajes personales. El patrón más seguro es:

    - Mantener los MD en **modo de emparejamiento** o en una lista de permitidos estricta.
    - Usar un **número o cuenta separado** si quieres que envíe mensajes en tu nombre.
    - Dejar que redacte y luego **aprobar antes de enviar**.

    Si deseas experimentar, hazlo en una cuenta dedicada y mantenla aislada. Consulta
    [Seguridad](/es/gateway/security).

  </Accordion>

<Accordion title="¿Puedo usar modelos más económicos para tareas de asistente personal?">
  Sí, **siempre que** el agente sea solo de chat y la entrada sea confiable. Los niveles más pequeños son más susceptibles al secuestro de instrucciones, por lo que evítalos para agentes con herramientas o al leer contenido que no es de confianza. Si debes usar un modelo más pequeño, restringe las herramientas y ejecútalo dentro de un espacio aislado. Consulta [Seguridad](/es/gateway/security).
</Accordion>

  <Accordion title="Ejecuté /start en Telegram pero no recibí un código de emparejamiento">
    Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
    `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

    Consulta las solicitudes pendientes:

    ```bash
    openclaw pairing list telegram
    ```

    Si deseas acceso inmediato, añade tu id de remitente a la lista de permitidos o establece `dmPolicy: "open"`
    para esa cuenta.

  </Accordion>

  <Accordion title="WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?">
    No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a los envíos explícitos que usted active.

    Aprobar el emparejamiento con:

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Listar solicitudes pendientes:

    ```bash
    openclaw pairing list whatsapp
    ```

    El mensaje del asistente para el número de teléfono: se usa para configurar su **lista de permitidos/propietario** para que se permitan sus propios MD. No se usa para el envío automático. Si ejecuta en su número personal de WhatsApp, use ese número y habilite `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Comandos de chat, abortar tareas y "no se detendrá"

<AccordionGroup>
  <Accordion title="¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?">
    La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** (detallado), **trace** (traza) o **reasoning** (razonamiento) están habilitados
    para esa sesión.

    Solución en el chat donde lo vea:

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    Si sigue siendo ruidoso, verifique la configuración de la sesión en la UI de Control y configure verbose
    en **inherit** (heredar). También confirme que no está usando un perfil de bot con `verboseDefault` establecido
    en `on` en la configuración.

    Documentación: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security/index#reasoning-and-verbose-output-in-groups).

  </Accordion>

  <Accordion title="¿Cómo detengo/cancelo una tarea en ejecución?">
    Envíe cualquiera de estos **como un mensaje independiente** (sin barra):

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

    Estos son desencadenantes de cancelación (no comandos de barra).

    Para procesos en segundo plano (de la herramienta exec), puede pedir al agente que ejecute:

    ```
    process action:kill sessionId:XXX
    ```

    Resumen de comandos de barra: ver [Slash commands](/es/tools/slash-commands).

    La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista de permitidos.

  </Accordion>

  <Accordion title='¿Cómo envío un mensaje de Discord desde Telegram? ("Cross-context messaging denied")'>
    OpenClaw bloquea la mensajería **entre proveedores** (cross-provider) de forma predeterminada. Si una llamada a una herramienta está vinculada
    a Telegram, no se enviará a Discord a menos que lo permita explícitamente.

    Habilite la mensajería entre proveedores para el agente:

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

    Reinicie la puerta de enlace (gateway) después de editar la configuración.

  </Accordion>

  <Accordion title='¿Por qué parece que el bot "ignora" los mensajes rápidos?'>
    Los prompts en medio de la ejecución se dirigen a la ejecución activa de forma predeterminada. Use `/queue` para elegir el comportamiento de la ejecución activa:

    - `steer` - guiar la ejecución activa en el siguiente límite del modelo
    - `followup` - poner en cola los mensajes y ejecutarlos uno a uno después de que finalice la ejecución actual
    - `collect` - poner en cola mensajes compatibles y responder una vez después de que finalice la ejecución actual
    - `interrupt` - abortar la ejecución actual y comenzar de nuevo

    El modo predeterminado es `steer`. Puede agregar opciones como `debounce:0.5s cap:25 drop:summarize` para los modos en cola. Consulte [Cola de comandos](/es/concepts/queue) y [Cola de dirección](/es/concepts/queue-steering).

  </Accordion>
</AccordionGroup>

## Miscelánea

<AccordionGroup>
  <Accordion title="¿Cuál es el modelo predeterminado para Anthropic con una clave API?">
    En OpenClaw, las credenciales y la selección del modelo son independientes. Configurar `ANTHROPIC_API_KEY` (o almacenar una clave API de Anthropic en perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es el que configure en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-6` o `anthropic/claude-opus-4-6`). Si ve `No credentials
    found for profile "anthropic:default"`, significa que la Puerta de enlace no pudo encontrar las credenciales de Anthropic en el `auth-profiles.json` esperado para el agente que se está ejecutando.
  </Accordion>
</AccordionGroup>

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).

## Relacionado

- [Preguntas frecuentes de primera ejecución](/es/help/faq-first-run) — instalación, incorporación, autenticación, suscripciones, fallos tempranos
- [Preguntas frecuentes sobre modelos](/es/help/faq-models) — selección de modelos, conmutación por error, perfiles de autenticación
- [Solución de problemas](/es/help/troubleshooting) — triaje basado en síntomas
