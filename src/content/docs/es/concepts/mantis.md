---
summary: "Mantis es el sistema de verificación visual de extremo a extremo para reproducir errores de OpenClaw en transportes en vivo, capturar pruebas antes y después, y adjuntar artefactos a las PRs."
title: "Mantis"
read_when:
  - Building or running live visual QA for OpenClaw bugs
  - Adding before and after verification for a pull request
  - Adding Discord, Slack, WhatsApp, or other live transport scenarios
  - Debugging QA runs that need screenshots, browser automation, or VNC access
---

Mantis es el sistema de verificación de extremo a extremo de OpenClaw para errores que necesitan un
entorno de ejecución real, un transporte real y una prueba visible. Ejecuta un escenario contra una
referencia incorrecta conocida, captura pruebas, ejecuta el mismo escenario contra una referencia candidata y
publica la comparación como artefactos que un mantenedor puede inspeccionar desde una PR o
desde un comando local.

Mantis comienza con Discord porque Discord nos proporciona un carril de primer valor alto:
autenticación real de bot, canales reales de gremio, reacciones, hilos, comandos nativos y una
interfaz de usuario del navegador donde los humanos pueden confirmar visualmente lo que mostró el transporte.

## Objetivos

- Reproducir un error desde un issue o PR de GitHub con la misma forma de transporte que los
  usuarios ven.
- Capturar un artefacto **antes** en la referencia de referencia antes de aplicar la solución.
- Capturar un artefacto **después** en la referencia candidata después de aplicar la solución.
- Usar un oráculo determinista siempre que sea posible, como una lectura de reacción REST de Discord
  o una verificación de transcripción del canal.
- Capturar capturas de pantalla cuando el error tiene una superficie de interfaz de usuario visible.
- Ejecutarse localmente desde una CLI controlada por agente y de forma remota desde GitHub.
- Conservar suficiente estado de la máquina para el rescate por VNC cuando el inicio de sesión, la automatización del navegador o
  la autenticación del proveedor se atascen.
- Publicar un estado conciso en un canal de Discord del operador cuando la ejecución se bloquea,
  necesita ayuda manual de VNC o finaliza.

## No objetivos

- Mantis no es un reemplazo para las pruebas unitarias. Una ejecución de Mantis generalmente debería convertirse
  en una prueba de regresión más pequeña después de que se comprenda la solución.
- Mantis no es la puerta de CI rápida normal. Es más lento, usa credenciales en vivo y
  está reservado para errores donde el entorno en vivo importa.
- Mantis no debe requerir un humano para el funcionamiento normal. El VNC manual es una ruta de
  rescate, no la ruta feliz.
- Mantis no almacena secretos sin procesar en artefactos, registros, capturas de pantalla, informes
  Markdown o comentarios en PRs.

## Propiedad

Mantis vive en la pila de QA de OpenClaw.

- OpenClaw posee el tiempo de ejecución del escenario, adaptadores de transporte, esquema de pruebas y
  la CLI local bajo `pnpm openclaw qa mantis`.
- QA Lab posee las piezas del arnés de transporte en vivo, auxiliares de captura del navegador y
  escritores de artefactos.
- Crabbox posee máquinas Linux calentadas cuando se necesita una VM remota.
- GitHub Actions posee el punto de entrada del flujo de trabajo remoto y la retención de artefactos.
- ClawSweeper posee el enrutamiento de comentarios de GitHub: analizar los comandos del mantenedor,
  despachar el flujo de trabajo y publicar el comentario final del PR.
- Los agentes de OpenClaw conducen Mantis a través de Codex cuando un escenario necesita configuración de agente,
  depuración o informes de estado bloqueado.

Este límite mantiene el conocimiento del transporte en OpenClaw, la programación de máquinas en
Crabbox y el pegamento del flujo de trabajo del mantenedor en ClawSweeper.

## Forma del comando

El primer comando local verifica el bot de Discord, el gremio, el canal, el envío de mensajes,
el envío de reacciones y la ruta del artefacto:

```bash
pnpm openclaw qa mantis discord-smoke \
  --output-dir .artifacts/qa-e2e/mantis/discord-smoke
```

El ejecutor local antes y después acepta esta forma:

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-status-reactions-tool-only \
  --baseline origin/main \
  --candidate HEAD \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-status-reactions
```

El ejecutor crea árboles de trabajo (worktrees) separados de línea base y candidatos bajo el directorio de salida, instala dependencias, compila cada referencia, ejecuta el escenario con
`--allow-failures`, luego escribe `baseline/`, `candidate/`, `comparison.json`,
y `mantis-report.md`. Para el primer escenario de Discord, una verificación exitosa
significa que el estado de la línea base es `fail` y el estado del candidato es `pass`.

La segunda sonda antes/después de Discord tiene como objetivo los adjuntos de hilos:

```bash
pnpm openclaw qa mantis run \
  --transport discord \
  --scenario discord-thread-reply-filepath-attachment \
  --baseline <bug-ref> \
  --candidate <fix-ref> \
  --output-dir .artifacts/qa-e2e/mantis/local-discord-thread-attachment
```

Ese escenario publica un mensaje principal con el bot controlador, crea un hilo real de Discord,
llama a la acción `message.thread-reply` de OpenClaw con un `filePath` local del repositorio,
luego sondea el hilo para obtener la respuesta del SUT y el nombre del archivo adjunto. La captura de pantalla de la línea base muestra la respuesta sin archivo adjunto; la captura de pantalla del candidato
muestra el archivo adjunto `mantis-thread-report.md` esperado.

La primera primitiva de VM/navegador es la prueba de humo de escritorio:

```bash
pnpm openclaw qa mantis desktop-browser-smoke \
  --output-dir .artifacts/qa-e2e/mantis/desktop-browser
```

Arrenda o reutiliza una máquina de escritorio Crabbox, inicia un navegador visible dentro de la
sesión VNC, captura el escritorio, extrae los artefactos al directorio de salida local
y escribe el comando de reconexión en el informe. El comando usa por defecto
el proveedor Hetzner porque es el primer proveedor con cobertura de escritorio/VNC funcional en el carril Mantis. Anúlelo con `--provider`, `--crabbox-bin` o
`OPENCLAW_MANTIS_CRABBOX_PROVIDER` cuando se ejecute contra otra flota de Crabbox.

Marcadores útiles de prueba de humo de escritorio:

- `--lease-id <cbx_...>` o `OPENCLAW_MANTIS_CRABBOX_LEASE_ID` reutiliza un escritorio precalentado.
- `--browser-url <url>` cambia la página abierta en el navegador visible.
- `--html-file <path>` renderiza un artefacto HTML local en el navegador visible. Mantis lo usa para capturar la línea de tiempo de reacciones de estado de Discord generada a través de un escritorio Crabbox real.
- `--browser-profile-dir <remote-path>` reutiliza un directorio de datos de usuario de Chrome remoto para que un escritorio Mantis persistente pueda mantener la sesión iniciada entre ejecuciones. Úselo para el perfil de visor web de Discord de larga duración.
- `--browser-profile-archive-env <name>` restaura un archivo del directorio de datos de usuario de Chrome `.tgz` en base64 desde la variable de entorno nombrada antes de iniciar el navegador. Úselo para testigos con sesión iniciada, como Discord Web. La variable de entorno predeterminada es `OPENCLAW_MANTIS_BROWSER_PROFILE_TGZ_B64`.
- `--video-duration <seconds>` controla la duración de la captura MP4. Use una duración más larga para aplicaciones web lentas con sesión iniciada que necesitan tiempo para estabilizarse.
- `--keep-lease` o `OPENCLAW_MANTIS_KEEP_VM=1` mantiene un contrato de aprobación recién creado abierto para la inspección VNC. Las ejecuciones fallidas mantienen el contrato por defecto cuando se creó uno, para que un operador pueda reconectarse.
- `--class`, `--idle-timeout` y `--ttl` ajustan el tamaño de la máquina y la vida útil del contrato.

Para las pruebas de Discord Web, Mantis utiliza una cuenta de visor dedicada en lugar de un token de bot. El escenario de la API de Discord en vivo sigue siendo el oráculo: crea el hilo real, envía el SUT `thread-reply` y verifica el archivo adjunto a través de Discord REST. Cuando se establece `OPENCLAW_QA_DISCORD_CAPTURE_UI_METADATA=1`, el escenario también escribe un artefacto de URL de Discord Web. Cuando se establece `OPENCLAW_QA_DISCORD_KEEP_THREADS=1`, deja ese hilo disponible el tiempo suficiente para que un navegador con sesión iniciada lo abra y lo grabe.

El flujo de trabajo de GitHub abre la URL del hilo candidato en Discord Web, captura
una captura de pantalla, graba un MP4 y genera una vista previa GIF recortada cuando las
herramientas multimedia de Crabbox están disponibles. Se prefiere una ruta de perfil
de visor persistente configurada a través de `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR`, ya que los
archivos completos de perfiles de Chrome pueden superar el límite de tamaño de secretos
de GitHub. Para perfiles pequeños/arranque, el flujo de trabajo también puede restaurar
un archivo `.tgz` en base64 desde
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64`. Si no se configura ninguna fuente de perfil,
el flujo de trabajo todavía publica las capturas de pantalla de archivos adjuntos de
línea base/candidato deterministas y registra un aviso de que el testigo de Discord Web
con sesión iniciada se omitió.

La primitiva de transporte de escritorio completa primero es la prueba de humo de escritorio de Slack:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --output-dir .artifacts/qa-e2e/mantis/slack-desktop \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Arrienda o reutiliza una máquina de escritorio Crabbox, sincroniza el pago actual en la
VM, ejecuta `pnpm openclaw qa slack` dentro de esa VM, abre Slack Web en el
navegador VNC, captura el escritorio visible y copia tanto los artefactos de QA de Slack
como la captura de pantalla de VNC al directorio de salida local. Esta es la primera forma
de Mantis donde la puerta de enlace OpenClaw del SUT y el navegador viven ambos dentro
de la misma VM de escritorio Linux.

Con `--gateway-setup`, el comando prepara un hogar OpenClaw desechable persistente
en `$HOME/.openclaw-mantis/slack-openclaw`, parchea la configuración del Modo Socket de Slack
para el canal seleccionado, inicia `openclaw gateway run` en el puerto
`38973` y mantiene Chrome ejecutándose en la sesión VNC. Este es el modo "déjame
un escritorio Linux con Slack y un claw ejecutándose"; el carril de QA de Slack de bot a bot
sigue siendo el predeterminado cuando se omite `--gateway-setup`.

Entradas requeridas para `--credential-source env`:

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`
- `OPENCLAW_LIVE_OPENAI_KEY` para el carril de modelo remoto. Si solo
  `OPENAI_API_KEY` se establece localmente, Mantis lo asigna a `OPENCLAW_LIVE_OPENAI_KEY`
  antes de invocar a Crabbox para que el reenvío de variables de entorno `OPENCLAW_*`
  de Crabbox pueda llevarlo a la VM.

Con `--gateway-setup --credential-source convex`, Mantis arrenda la credencial del Slack SUT
del grupo compartido antes de crear la VM y reenvía el id del canal arrendado,
el token de la aplicación en modo Socket y el token del bot como el entorno de
ejecución `OPENCLAW_MANTIS_SLACK_*` dentro del escritorio. Esto mantiene los
flujos de trabajo de GitHub delgados: solo necesitan el secreto del broker Convex,
no los tokens crudos del bot o de la aplicación de Slack.

Indicadores útiles del escritorio de Slack:

- `--lease-id <cbx_...>` se ejecuta nuevamente contra una máquina donde un operador ya inició sesión en Slack Web a través de VNC.
- `--gateway-setup` inicia una puerta de enlace persistente de OpenClaw Slack en la VM en lugar de ejecutar solo el carril de QA de bot a bot.
- `--keep-lease` mantiene la VM de la puerta de enlace abierta para la inspección VNC después del éxito; `--no-keep-lease` la detiene después de recopilar los artefactos.
- `--slack-url <url>` abre una URL específica de Slack Web. Sin esto, Mantis deriva `https://app.slack.com/client/<team>/<channel>` desde Slack `auth.test` cuando el token del bot SUT está disponible.
- `--slack-channel-id <id>` controla la lista de permitidos (allowlist) del canal de Slack utilizada por la configuración de la puerta de enlace.
- `OPENCLAW_MANTIS_SLACK_BROWSER_PROFILE_DIR` controla el perfil persistente de Chrome dentro de la VM. El valor predeterminado es `$HOME/.config/openclaw-mantis/slack-chrome-profile`, por lo que un inicio de sesión manual en Slack Web sobrevive a las ejecuciones repetidas en el mismo arrendamiento.
- `--credential-source convex --credential-role ci` usa el grupo de credenciales compartido en lugar de tokens de entorno de Slack directos.
- `--provider-mode`, `--model`, `--alt-model` y `--fast` se pasan al carril en vivo de Slack.

El flujo de trabajo de humo (smoke) de GitHub es `Mantis Discord Smoke`. El flujo de trabajo
de GitHub antes y después para el primer escenario real es `Mantis Discord Status Reactions`.
Acepta:

- `baseline_ref`: la referencia (ref) que se espera que reproduzca el comportamiento de solo cola.
- `candidate_ref`: la referencia que se espera que muestre `queued -> thinking -> done`.

Obtiene la referencia del arnés del flujo de trabajo, construye árboles de trabajo separados para la línea base y el candidato, ejecuta `discord-status-reactions-tool-only` contra cada árbol de trabajo y sube `baseline/`, `candidate/`, `comparison.json` y `mantis-report.md` como artefactos de Actions. También renderiza el HTML de la línea de tiempo de cada carril en un navegador de escritorio Crabbox y publica esas capturas de pantalla VNC junto a los PNG de la línea de tiempo determinista en el comentario del PR. El mismo comentario del PR incrusta vistas previas en GIF recortadas por movimiento y ligeras, generadas por `crabbox media preview`, enlaces a los clips MP4 recortados por movimiento correspondientes y conserva los archivos MP4 completos del escritorio para una inspección profunda. Las capturas de pantalla se mantienen en línea para una revisión rápida. El flujo de trabajo construye la CLI de Crabbox desde `openclaw/crabbox` main para que pueda usar los indicadores actuales de concesión de escritorio/navegador antes de que se publique el siguiente binario de Crabbox.

`Mantis Scenario` es el punto de entrada manual genérico. Toma un `scenario_id`, `candidate_ref`, `baseline_ref` opcional y `pr_number` opcional, y luego despacha el flujo de trabajo propiedad del escenario. El contenedor es intencionalmente ligero: los flujos de trabajo de los escenarios siguen siendo propietarios de la configuración de su transporte, credenciales, clase de VM, oráculo esperado y manifiesto de artefactos.

`Mantis Slack Desktop Smoke` es el primer flujo de trabajo de VM de Slack. Obtiene la referencia del candidato de confianza en un árbol de trabajo separado, arrienda un escritorio Linux Crabbox, ejecuta `pnpm openclaw qa mantis slack-desktop-smoke --gateway-setup` contra ese candidato, abre Slack Web en el navegador VNC, graba el escritorio, genera una vista previa recortada por movimiento con `crabbox media preview`, sube el directorio de artefactos completo y, opcionalmente, publica el comentario de evidencia en línea en el PR objetivo. Por defecto usa AWS para el arrendamiento del escritorio y expone una entrada manual de proveedor para que los operadores puedan cambiar a Hetzner cuando la capacidad de AWS sea lenta o no esté disponible. Use este carril cuando desee "un escritorio Linux con Slack y un claw ejecutándose" en lugar de solo una transcripción de Slack de bot a bot.

`Mantis Telegram Live` envuelve el carril de QA en vivo de Telegram existente en la misma canalización de evidencias del PR. Verifica la referencia del candidato confiable en un árbol de trabajo (worktree) separado, ejecuta `pnpm openclaw qa telegram --credential-source convex
--credential-role ci`, writes a `mantis-evidence.` manifiesto desde el resumen de QA de Telegram y el artefacto de mensaje observado, renderiza el HTML de la transcripción redactada a través de un navegador de escritorio Crabbox, genera un GIF recortado por movimiento
con `crabbox media preview`, y publica el comentario de evidencia del PR en línea cuando hay un número de PR disponible. Este carril es visual-transcripcional en lugar de prueba de Telegram Web con sesión iniciada: la API de Bot de Telegram proporciona evidencia estable de mensajes en vivo, pero el estado de inicio de sesión de Telegram Web no es necesario para la automatización normal de Mantis.

`Mantis Telegram Desktop Proof` es el contenedor nativo agentic de antes/después de Telegram Desktop. Un mantenedor puede activarlo desde un comentario de PR con `@Mantis telegram desktop proof`, desde la interfaz de usuario de Actions con instrucciones de forma libre, o a través del despachador genérico `Mantis Scenario`. El flujo de trabajo entrega el PR, la referencia de base, la referencia candidata y las instrucciones del mantenedor a Codex. El agente lee el PR, decide qué comportamiento visible en Telegram demuestra el cambio, ejecuta el carril de prueba real de usuario Crabbox Telegram Desktop para la base y el candidato, itera hasta que los GIF nativos sean útiles, escribe artefactos `motionPreview` emparejados en `mantis-evidence.json`, carga el paquete y publica una tabla de evidencia del PR de 2 columnas cuando hay disponible un número de PR.

Para la configuración de escritorio de Telegram con humano en el bucle, use el generador de escenarios:

```bash
pnpm openclaw qa mantis telegram-desktop-builder \
  --credential-source convex \
  --credential-role maintainer \
  --keep-lease
```

El generador alquila o reutiliza un escritorio Crabbox, instala el binario nativo de Telegram Desktop para Linux, opcionalmente restaura un archivo de sesión de usuario, configura OpenClaw con el token del bot SUT de Telegram alquilado, inicia `openclaw gateway run` en el puerto `38974`, publica un mensaje de preparación del bot conductor en el grupo privado alquilado y luego captura una captura de pantalla y un MP4 del escritorio VNC visible. Un token de bot nunca inicia sesión en Telegram Desktop; solo configura OpenClaw. El visor de escritorio es una sesión de usuario de Telegram separada restaurada desde `--telegram-profile-archive-env <name>` o creada manualmente a través de VNC y mantenida activa con `--keep-lease`.

Banderas útiles del generador de escritorio de Telegram:

- `--lease-id <cbx_...>` se ejecuta nuevamente contra una VM donde un operador ya inició sesión en Telegram Desktop.
- `--telegram-profile-archive-env <name>` lee un archivo de perfil de Telegram Desktop `.tgz` en base64 desde esa variable de entorno y lo restaura antes del lanzamiento.
- `--telegram-profile-dir <remote-path>` controla el directorio del perfil remoto de Telegram Desktop. El valor predeterminado es `$HOME/.local/share/TelegramDesktop`.
- `--no-gateway-setup` instala y abre Telegram Desktop sin configurar OpenClaw.
- `--credential-source convex --credential-role ci` usa el corredor de credenciales compartido en lugar de tokens de entorno de Telegram directos.

Cada escenario de publicación de PR escribe `mantis-evidence.json` junto a su informe.
Este esquema es el enlace entre el código del escenario y los comentarios de GitHub:

```json
{
  "schemaVersion": 1,
  "id": "discord-status-reactions",
  "title": "Mantis Discord Status Reactions QA",
  "summary": "Human-readable top summary for the PR comment.",
  "scenario": "discord-status-reactions-tool-only",
  "comparison": {
    "baseline": { "sha": "...", "status": "fail", "expected": "queued-only" },
    "candidate": { "sha": "...", "status": "pass", "expected": "queued -> thinking -> done" },
    "pass": true
  },
  "artifacts": [
    {
      "kind": "timeline",
      "lane": "baseline",
      "label": "Baseline queued-only",
      "path": "baseline/timeline.png",
      "targetPath": "baseline.png",
      "alt": "Baseline Discord timeline",
      "width": 420
    }
  ]
}
```

Los valores de `path` del artefacto son relativos al directorio del manifiesto. Los valores
de `targetPath` son rutas relativas bajo el directorio de publicación de la rama
`qa-artifacts`.
El publicador rechaza el cruce de rutas y omite las entradas marcadas
como `"required": false` cuando las vistas previas o videos opcionales no están disponibles.

Tipos de artefactos compatibles:

- `timeline`: captura de pantalla determinista del escenario, generalmente antes/después.
- `desktopScreenshot`: captura de pantalla del escritorio VNC/navegador.
- `motionPreview`: GIF animado en línea generado desde la grabación del escritorio.
- `motionClip`: MP4 recortado por movimiento que elimina la introducción y el final estáticos.
- `fullVideo`: grabación completa en MP4 para una inspección profunda.
- `metadata`: acompañante de registro/JSON.
- `report`: informe Markdown.

El publicador reutilizable es `scripts/mantis/publish-pr-evidence.mjs`. Los flujos de trabajo
lo llaman con el manifiesto, PR objetivo, raíz objetivo `qa-artifacts`, marcador de comentario,
URL del artefacto de Actions, URL de ejecución y origen de la solicitud. Copia los artefactos declarados
a la rama `qa-artifacts`, crea un comentario de PR con un resumen primero que incluye imágenes/vistas previas
en línea y videos vinculados, y luego actualiza el comentario del marcador existente o
crea uno.

También puede activar la ejecución de reacciones de estado directamente desde un comentario de PR:

```text
@Mantis discord status reactions
```

El activador de comentarios es intencionalmente limitado. Solo se ejecuta en comentarios
de solicitudes de extracción de usuarios con acceso de escritura, mantenimiento o administración, y solo reconoce
solicitudes de reacciones de estado de Discord. De manera predeterminada, utiliza la referencia de línea base incorrecta conocida
y el SHA de encabezado del PR actual como candidato. Los mantenedores pueden anular cualquier
referencia:

```text
@Mantis discord status reactions baseline=origin/main candidate=HEAD
```

El QA en vivo de Telegram también se puede activar desde un comentario de PR:

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

De manera predeterminada, utiliza el SHA de encabezado del PR actual como candidato y ejecuta
`telegram-status-command`. Los mantenedores pueden anular `candidate=...`,
`provider=aws|hetzner` y `lease=<cbx_...>` cuando necesitan una referencia específica o un
escritorio Crabbox precalentado.

Ejemplos de comandos de ClawSweeper:

```text
@clawsweeper mantis discord discord-status-reactions-tool-only
@clawsweeper verify e2e discord
```

El primer comando es explícito y se centra en el escenario. El segundo más tarde puede asignar una PR
o issue a escenarios Mantis recomendados a partir de etiquetas, archivos modificados y
hallazgos de revisión de ClawSweeper.

## Ciclo de vida de ejecución

1. Obtener las credenciales.
2. Asignar o reutilizar una VM.
3. Preparar el perfil de escritorio/navegador cuando el escenario necesite evidencia de UI.
4. Preparar una checkout limpia para la referencia de línea base.
5. Instalar dependencias y compilar solo lo que el escenario necesita.
6. Iniciar un OpenClaw Gateway secundario con un directorio de estado aislado.
7. Configurar el transporte en vivo, proveedor, modelo y perfil del navegador.
8. Ejecutar el escenario y capturar la evidencia de línea base.
9. Detener el gateway y preservar los registros.
10. Preparar la referencia candidata en la misma VM.
11. Ejecutar el mismo escenario y capturar la evidencia candidata.
12. Comparar los resultados del oráculo y la evidencia visual.
13. Escribir artefactos de Markdown, JSON, registros, capturas de pantalla y rastros opcionales.
14. Subir artefactos de GitHub Actions.
15. Publicar un mensaje de estado conciso en PR o Discord.

El escenario debería poder fallar de dos maneras diferentes:

- **Bug reproducido**: la línea base falló de la manera esperada.
- **Fallo del arnés**: configuración del entorno, credenciales, API de Discord, navegador o
  proveedor fallaron antes de que el oráculo de bugs fuera significativo.

El informe final debe separar estos casos para que los mantenedores no confundan un entorno
inestable con el comportamiento del producto.

## MVP de Discord

El primer escenario debe apuntar a las reacciones de estado de Discord en los canales del gremio donde
el modo de entrega de respuesta de origen es `message_tool_only`.

Por qué es una buena semilla para Mantis:

- Es visible en Discord como reacciones en el mensaje desencadenante.
- Tiene un oráculo REST sólido a través del estado de reacción del mensaje de Discord.
- Ejercita un OpenClaw Gateway real, autenticación de bot de Discord, envío de mensajes,
  modo de entrega de respuesta de origen, estado de reacción de estado y ciclo de vida del turno del modelo.
- Es lo suficientemente estrecho como para mantener honesta la primera implementación.

Forma esperada del escenario:

```yaml
id: discord-status-reactions-tool-only
transport: discord
baseline:
  expect:
    reproduced: true
candidate:
  expect:
    fixed: true
config:
  messages:
    ackReaction: "👀"
    ackReactionScope: "group-mentions"
    groupChat:
      visibleReplies: "message_tool"
    statusReactions:
      enabled: true
      timing:
        debounceMs: 0
discord:
  requireMention: true
  notifyChannel: operator-notify
evidence:
  rest:
    messageReactions: true
  browser:
    screenshotMessageRow: true
```

La evidencia de línea base debería mostrar la reacción de reconocimiento en cola pero sin
transición de ciclo de vida en el modo solo de herramienta. La evidencia candidata debería mostrar reacciones
de estado de ciclo de vida ejecutándose cuando `messages.statusReactions.enabled` es explícitamente
verdadero.

El primer segmento ejecutable es el escenario de QA en vivo de Discord opcional:

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast \
  --output-dir .artifacts/qa-e2e/mantis/discord-status-reactions-candidate
```

Configura el SUT con manejo de gremios siempre activo, `visibleReplies:
"message_tool"`, `ackReaction: "👀"`, y reacciones de estado explícitas. El oráculo
sondea el mensaje real desencadenante de Discord y espera la secuencia observada
`👀 -> 🤔 -> 👍`. Los artefactos incluyen `discord-qa-reaction-timelines.json`,
`discord-status-reactions-tool-only-timeline.html` y
`discord-status-reactions-tool-only-timeline.png`.

## Piezas de QA existentes

Mantis debe construirse sobre la pila de QA privada existente en lugar de empezar
desde cero:

- `pnpm openclaw qa discord` ya ejecuta un canal de Discord en vivo con bots de
  controlador y SUT.
- El ejecutor de transporte en vivo ya escribe informes y artefactos de mensajes
  observados bajo `.artifacts/qa-e2e/`.
- Los arrendamientos de credenciales de Convex ya proporcionan acceso exclusivo a las credenciales
  de transporte en vivo compartidas.
- El servicio de control del navegador ya admite capturas de pantalla, instantáneas,
  perfiles administrados sin cabeza y perfiles CDP remotos.
- QA Lab ya tiene una interfaz de usuario de depuración y un bus para pruebas
  con forma de transporte.

La primera implementación de Mantis puede ser un ejecutor antes/delgado ligero sobre estas
piezas, más una capa de evidencia visual.

## Modelo de evidencia

Cada ejecución escribe un directorio de artefactos estable:

```text
.artifacts/qa-e2e/mantis/<run-id>/
  mantis-report.md
  mantis-summary.json
  baseline/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  candidate/
    summary.json
    discord-message.json
    screenshot-message-row.png
    gateway-debug/
  comparison.json
  run.log
```

`mantis-summary.json` debe ser la fuente de verdad legible por máquina. El
informe Markdown es para comentarios de PR y revisión humana.

El resumen debe incluir:

- refs y SHA probados
- transporte e identificación de escenario
- proveedor de máquina e identificación de máquina o identificación de arrendamiento
- fuente de credenciales sin valores secretos
- resultado de referencia
- resultado del candidato
- si el error se reprodujo en la referencia
- si el candidato lo corrigió
- rutas de artefactos
- problemas de configuración o limpieza saneados

Las capturas de pantalla son evidencia, no secretos. Aún así necesitan disciplina de redacción:
pueden aparecer nombres de canales privados, nombres de usuario o contenido de mensajes. Para PRs públicos,
se prefieren los enlaces de artefactos de GitHub Actions sobre las imágenes en línea hasta que la historia de redacción
sea más sólida.

## Navegador y VNC

El canal del navegador tiene dos modos:

- **Automatización sin cabeza**: predeterminado para CI. Chrome se ejecuta con CDP habilitado y
  el control del navegador Playwright u OpenClaw captura pantallas.
- **Rescate VNC**: habilitado en la misma VM cuando el inicio de sesión, MFA, anti-automatización de Discord,
  o la depuración visual necesitan un humano.

El perfil del navegador del observador de Discord debe ser lo suficientemente persistente para evitar
iniciar sesión en cada ejecución, pero aislado del estado del navegador personal. Un perfil
pertenece al grupo de máquinas de Mantis, no a la computadora portátil de un desarrollador.

Cuando Mantis se atasca, publica un mensaje de estado de Discord con:

- id de ejecución
- id de escenario
- proveedor de máquinas
- directorio de artefactos
- instrucciones de conexión VNC o noVNC si están disponibles
- texto breve del bloqueador

La primera implementación privada puede publicar estos mensajes en el canal del operador existente
y pasar más tarde a un canal dedicado de Mantis.

## Máquinas

Mantis debe preferir AWS a través de Crabbox para la primera implementación remota.
Crabbox nos proporciona máquinas precargadas, seguimiento de arrendamientos, hidratación, registros, resultados y
limpieza. Si la capacidad de AWS es demasiado lenta o no está disponible, agregue un proveedor Hetzner
detrás de la misma interfaz de máquina.

Requisitos mínimos de la VM:

- Linux con una instalación de Chrome o Chromium compatible con escritorio
- Acceso CDP para la automatización del navegador
- VNC o noVNC para el rescate
- Node 22 y pnpm
- Checkout de OpenClaw y caché de dependencias
- Caché del navegador Chromium de Playwright cuando se usa Playwright
- suficiente CPU y memoria para una pasarela OpenClaw, un navegador y una ejecución de modelo
- acceso de salida a Discord, GitHub, proveedores de modelos y el intermediario de credenciales

La VM no debe mantener secretos sin procesar de larga duración fuera de los almacenes de credenciales o
perfiles de navegador esperados.

## Secretos

Los secretos residen en los secretos de la organización o repositorio de GitHub para ejecuciones remotas, y en
un archivo secreto local controlado por el operador para ejecuciones locales.

Nombres de secretos recomendados:

- `OPENCLAW_QA_DISCORD_MANTIS_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_NOTIFY_CHANNEL_ID`
- `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` para cargas de artefactos públicos de GitHub
- `OPENCLAW_QA_CONVEX_SITE_URL`
- `OPENCLAW_QA_CONVEX_SECRET_CI`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR`
- `OPENCLAW_QA_MANTIS_CRABBOX_COORDINATOR_TOKEN`

A largo plazo, el grupo de credenciales de Convex debe seguir siendo la fuente normal para las credenciales de transporte en vivo. Los secretos de GitHub inician el intermediario y los carriles de reserva. El flujo de trabajo de reacciones de estado de Discord asigna los secretos de Mantis Crabbox de vuelta a las variables de entorno `CRABBOX_COORDINATOR` y `CRABBOX_COORDINATOR_TOKEN` que el CLI de Crabbox espera. Los nombres de secretos de GitHub simples `CRABBOX_*` siguen siendo aceptados como reserva de compatibilidad.

El ejecutor de Mantis nunca debe imprimir:

- Tokens de bot de Discord
- Claves API del proveedor
- cookies del navegador
- contenidos del perfil de autenticación
- Contraseñas VNC
- cargas útiles de credenciales sin procesar

Las cargas públicas de artefactos también deben redactar los metadatos de destino de Discord, como el bot, el gremio, el canal y los ids de mensaje. El flujo de trabajo de humo de GitHub habilita `OPENCLAW_QA_REDACT_PUBLIC_METADATA=1` por esta razón.

Si un token se pega accidentalmente en un problema, PR, chat o registro, rótelo después de que se haya almacenado el nuevo secreto.

## Artefactos de GitHub y comentarios de PR

Los flujos de trabajo de Mantis deben cargar el paquete completo de evidencia como un artefacto de Actions de corta duración. Cuando el flujo de trabajo se ejecuta para un informe de error o un PR de corrección, también debe publicar las capturas de pantalla PNG redactadas en la rama `qa-artifacts` e insertar un comentario en ese error o PR de corrección con capturas de pantalla en línea antes/después. No publique la prueba principal solo en un PR de automatización de QA genérico. Los registros sin procesar, los mensajes observados y otras evidencias voluminosas permanecen en el artefacto de Actions.

Los flujos de trabajo de producción deben publicar esos comentarios con la App de GitHub de Mantis, no con `github-actions[bot]`. Almacene el id de la aplicación y la clave privada como `MANTIS_GITHUB_APP_ID` y `MANTIS_GITHUB_APP_PRIVATE_KEY` secretos de GitHub Actions. El flujo de trabajo usa un marcador oculto como clave de upsert, actualiza ese comentario cuando el token puede editarlo y crea un nuevo comentario propiedad de Mantis cuando un marcador propiedad de un bot más antiguo no se puede editar.

El comentario del PR debe ser corto y visual:

```md
Mantis Discord Status Reactions QA

Summary: Mantis reran the reported Discord status-reaction bug against the known
bad baseline and the candidate fix. The baseline reproduced the bug, while the
candidate showed the expected queued -> thinking -> done sequence.

- Scenario: `discord-status-reactions-tool-only`
- Run: <workflow run link>
- Artifact: <artifact link>
- Baseline: `<status>` at `<sha>`
- Candidate: `<status>` at `<sha>`

| Baseline            | Candidate           |
| ------------------- | ------------------- |
| <inline screenshot> | <inline screenshot> |
```

Cuando la ejecución falla porque el arnés falló, el comentario debe decirlo en lugar de implicar que el candidato falló.

## Notas de despliegue privado

Un despliegue privado ya puede tener una aplicación Mantis Discord. Reutilice esa aplicación en lugar de crear otra cuando tenga los permisos correctos del bot y pueda rotarse de forma segura.

Configure el canal de notificación inicial del operador a través de secretos o
configuración de despliegue. Puede apuntar primero a un canal de mantenimiento
u operaciones existente, y luego trasladarse a un canal dedicado de Mantis una
vez que exista uno.

No ponga ids de gremio, ids de canal, tokens de bot, cookies de navegador o
contraseñas de VNC en este documento. Guárdelos en secretos de GitHub, el
bróker de credenciales o el almacén de secretos local del operador.

## Añadir un escenario

Un escenario de Mantis debe declarar:

- id y título
- transporte
- credenciales requeridas
- política de referencia base
- política de referencia candidata
- parche de configuración de OpenClaw
- pasos de configuración
- estímulo
- oráculo base esperado
- oráculo candidato esperado
- objetivos de captura visual
- presupuesto de tiempo de espera
- pasos de limpieza

Los escenarios deben preferir oráculos pequeños y tipados:

- estado de reacción de Discord para errores de reacción
- referencias de mensajes de Discord para errores de hilos
- ts de hilo de Slack y estado de API de reacción para errores de Slack
- ids de mensaje y cabeceras de correo electrónico para errores de email
- capturas de pantalla del navegador cuando la UI es el único observable fiable

Las comprobaciones de visión deben ser aditivas. Si una API de plataforma puede
demostrar el error, use la API como oráculo de aprobado/rechazado y mantenga
las capturas de pantalla para la confianza humana.

## Expansión de proveedores

Después de Discord, el mismo ejecutor puede añadir:

- Slack: reacciones, hilos, menciones de aplicaciones, modales, subidas de archivos.
- Email: autenticación de Gmail e hilado de mensajes usando `gog` donde los conectores no son
  suficientes.
- WhatsApp: inicio de sesión con QR, reidentificación, entrega de mensajes,
  multimedia, reacciones.
- Telegram: filtrado de menciones de grupo, comandos, reacciones donde estén
  disponibles.
- Matrix: salas cifradas, relaciones de hilo o respuesta, reanudación de reinicio.

Cada transporte debe tener un escenario de humo barato y uno o más escenarios de
clase de error. Los escenarios visuales costosos deben permanecer opcionales.

## Preguntas abiertas

- ¿Qué bot de Discord debe ser el controlador y cuál debe ser el SUT, cuando se
  reutiliza el bot Mantis existente?
- ¿El inicio de sesión del navegador observador debe usar una cuenta de Discord
  humana, una cuenta de prueba, o solo evidencia REST legible por bots para la
  primera fase?
- ¿Cuánto tiempo debe GitHub retener los artefactos de Mantis para los PRs?
- ¿Cuándo debería ClawSweeper recomendar Mantis automáticamente en lugar de esperar
  un comando de mantenimiento?
- ¿Deberían redactarse o recortarse las capturas de pantalla antes de la subida
  para PRs públicos?
