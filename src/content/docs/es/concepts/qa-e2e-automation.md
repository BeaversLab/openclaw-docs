---
summary: "Descripción general de la pila de QA: qa-lab, qa-channel, escenarios respaldados por repositorio, carriles de transporte en vivo, adaptadores de transporte e informes."
read_when:
  - Understanding how the QA stack fits together
  - Extending qa-lab, qa-channel, or a transport adapter
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Descripción general de QA"
---

La pila privada de QA está diseñada para ejercitar OpenClaw de una manera más realista,
en forma de canal de lo que puede hacerlo una sola prueba unitaria.

Piezas actuales:

- `extensions/qa-channel`: canal de mensajes sintético con superficies de MD, canal, hilo, reacción, edición y eliminación.
- `extensions/qa-lab`: interfaz de usuario de depuración y bus de QA para observar la transcripción, inyectar mensajes entrantes y exportar un informe en Markdown.
- `extensions/qa-matrix`, complementos de ejecución futuros: adaptadores de transporte en vivo que impulsan un canal real dentro de una puerta de enlace de QA secundaria.
- `qa/`: activos semilla respaldados por repositorio para la tarea de inicio y escenarios de referencia de QA.
- [Mantis](/es/concepts/mantis): verificación antes y después en vivo para errores que necesitan transportes reales, capturas de pantalla del navegador, estado de la VM y evidencias de PR.

## Superficie de comandos

Cada flujo de QA se ejecuta bajo `pnpm openclaw qa <subcommand>`. Muchos tienen alias de script `pnpm qa:*`; se admiten ambas formas.

| Comando                                             | Propósito                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Autocomprobación de QA incluida; escribe un informe en Markdown.                                                                                                                                                                                                                                                                        |
| `qa suite`                                          | Ejecuta escenarios respaldados por repositorio contra el carril de la puerta de enlace de QA. Alias: `pnpm openclaw qa suite --runner multipass` para una VM Linux desechable.                                                                                                                                                          |
| `qa coverage`                                       | Imprime el inventario de cobertura de escenarios en markdown (`--json` para salida de máquina).                                                                                                                                                                                                                                         |
| `qa parity-report`                                  | Compara dos archivos `qa-suite-summary.json` y escribe el informe de paridad de agentes.                                                                                                                                                                                                                                                |
| `qa character-eval`                                 | Ejecuta el escenario de QA de personajes en varios modelos en vivo con un informe evaluado. Consulte [Informes](#reporting).                                                                                                                                                                                                            |
| `qa manual`                                         | Ejecuta un prompt único contra el carril de proveedor/modelo seleccionado.                                                                                                                                                                                                                                                              |
| `qa ui`                                             | Inicia la interfaz de usuario del depurador de QA y el bus de QA local (alias: `pnpm qa:lab:ui`).                                                                                                                                                                                                                                       |
| `qa docker-build-image`                             | Construye la imagen de Docker de QA preconfigurada.                                                                                                                                                                                                                                                                                     |
| `qa docker-scaffold`                                | Escribe un andamio de docker-compose para el panel de QA + carril de puerta de enlace.                                                                                                                                                                                                                                                  |
| `qa up`                                             | Construye el sitio de QA, inicia el stack respaldado por Docker, imprime la URL (alias: `pnpm qa:lab:up`; la variante `:fast` añade `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).                                                                                                                                             |
| `qa aimock`                                         | Inicia solo el servidor del proveedor AIMock.                                                                                                                                                                                                                                                                                           |
| `qa mock-openai`                                    | Inicia solo el servidor del proveedor `mock-openai` con conocimiento de escenarios.                                                                                                                                                                                                                                                     |
| `qa credentials doctor` / `add` / `list` / `remove` | Gestiona el grupo compartido de credenciales de Convex.                                                                                                                                                                                                                                                                                 |
| `qa matrix`                                         | Carril de transporte en vivo contra un homeserver Tuwunel desechable. Consulte [Matrix QA](/es/concepts/qa-matrix).                                                                                                                                                                                                                     |
| `qa telegram`                                       | Carril de transporte en vivo contra un grupo privado real de Telegram.                                                                                                                                                                                                                                                                  |
| `qa discord`                                        | Carril de transporte en vivo contra un canal de guild (servidor) privado real de Discord.                                                                                                                                                                                                                                               |
| `qa slack`                                          | Carril de transporte en vivo contra un canal privado real de Slack.                                                                                                                                                                                                                                                                     |
| `qa mantis`                                         | Ejecutor de verificación antes y después para errores de transporte en vivo, con evidencia de reacciones de estado en Discord, pruebas de humo de escritorio/navegador Crabbox y pruebas de humo de Slack en VNC. Consulte [Mantis](/es/concepts/mantis) y [Manual de Mantis Slack Desktop](/es/concepts/mantis-slack-desktop-runbook). |

## Flujo del operador

El flujo actual del operador de QA es un sitio de QA de dos paneles:

- Izquierda: Panel de control de Gateway (UI de control) con el agente.
- Derecha: QA Lab, mostrando la transcripción estilo Slack y el plan de escenarios.

Ejecútelo con:

```bash
pnpm qa:lab:up
```

Esto construye el sitio de QA, inicia el carril de gateway respaldado por Docker y expone la página de QA Lab donde un operador o bucle de automatización puede darle al agente una misión de QA, observar el comportamiento del canal real y registrar qué funcionó, qué falló o qué permaneció bloqueado.

Para una iteración más rápida de la interfaz de usuario de QA Lab sin reconstruir la imagen de Docker cada vez, inicie el stack con un paquete QA Lab montado mediante bind:

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` mantiene los servicios de Docker en una imagen preconstruida y monta `extensions/qa-lab/web/dist` en el contenedor `qa-lab`. `qa:lab:watch` reconstruye ese paquete cuando hay cambios, y el navegador se recarga automáticamente cuando cambia el hash de los activos de QA Lab.

Para una prueba de humo local de rastreo de OpenTelemetry, ejecute:

```bash
pnpm qa:otel:smoke
```

Ese script inicia un receptor local de trazas OTLP/HTTP, ejecuta el escenario de `otel-trace-smoke` con el complemento `diagnostics-otel` habilitado, luego decodifica los intervalos protobuf exportados y afirma la forma crítica para la versión: `openclaw.run`, `openclaw.harness.run`, `openclaw.model.call`, `openclaw.context.assembled` y `openclaw.message.delivery` deben estar presentes; las llamadas al modelo no deben exportar `StreamAbandoned` en turnos exitosos; los IDs de diagnóstico brutos y los atributos `openclaw.content.*` deben mantenerse fuera de la traza. Escribe `otel-smoke-summary.json` junto a los artefactos de la suite QA.

La QA de observabilidad permanece solo en el código fuente. El tarball de npm omite intencionalmente QA Lab, por lo que los carriles de publicación de Docker del paquete no ejecutan comandos `qa`. Use `pnpm qa:otel:smoke` desde una descarga de código fuente compilada cuando cambie la instrumentación de diagnósticos.

Para un carril de pruebas de humo (smoke lane) de Matrix con transporte real, ejecute:

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La referencia completa de la CLI, el catálogo de perfiles/escenarios, las variables de entorno y el diseño de artefactos para este carril se encuentran en [Matrix QA](/es/concepts/qa-matrix). En resumen: aprovisiona un servidor doméstico Tuwunel desechable en Docker, registra usuarios temporales de controlador/SUT/observador, ejecuta el complemento Matrix real dentro de una puerta de enlace de QA secundaria con alcance a ese transporte (sin `qa-channel`), y luego escribe un informe Markdown, un resumen JSON, un artefacto de eventos observados y un registro de salida combinado bajo `.artifacts/qa-e2e/matrix-<timestamp>/`.

Los escenarios cubren el comportamiento del transporte que las pruebas unitarias no pueden probar de extremo a extremo: filtrado de menciones, políticas de allow-bot, listas de permitidos, respuestas de nivel superior y en hilos, enrutamiento de MD, manejo de reacciones, supresión de ediciones entrantes, deduplicación de repetición de reinicio, recuperación de interrupción del servidor doméstico, entrega de metadatos de aprobación, manejo de medios y flujos de arranque/recuperación/verificación de E2EE de Matrix. El perfil de CLI E2EE también impulsa los comandos `openclaw matrix encryption setup` y de verificación a través del mismo servidor doméstico desechable antes de verificar las respuestas de la puerta de enlace.

Discord también tiene escenarios opcionales exclusivos de Mantis para la reproducción de errores. Use
`--scenario discord-status-reactions-tool-only` para la línea de tiempo de reacción de estado explícita,
o `--scenario discord-thread-reply-filepath-attachment` para crear un
hilo real de Discord y verificar que `message.thread-reply` preserve un
archivo adjunto `filePath`. Estos escenarios se mantienen fuera del carril predeterminado de Discord en vivo
porque son sondas de reproducción antes/después en lugar de una cobertura de humo amplia.
El flujo de trabajo de Mantis de hilo-archivo-adjunto también puede agregar un video testigo web de Discord
con sesión iniciada cuando `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` o
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` se configura en el entorno
de QA. Ese perfil de visor es solo para captura visual; la decisión de aprobado/reprobado
aún proviene del oráculo REST de Discord.

La CI utiliza la misma superficie de comando en `.github/workflows/qa-live-transports-convex.yml`. Las ejecuciones programadas y manuales predeterminadas ejecutan el perfil rápido de Matrix con credenciales en vivo de frontier, `--fast`, y `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`. El comando manual `matrix_profile=all` se distribuye en los cinco fragmentos de perfil para que el catálogo exhaustivo pueda ejecutarse en paralelo mientras se mantiene un directorio de artefactos por fragmento.

Para los carriles de humo reales de transporte de Telegram, Discord y Slack:

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

Tienen como objetivo un canal real preexistente con dos bots (controlador + SUT). Las variables de entorno requeridas, las listas de escenarios, los artefactos de salida y el grupo de credenciales Convex están documentados en [Referencia de QA de Telegram, Discord y Slack](#telegram-discord-and-slack-qa-reference) a continuación.

Para una ejecución completa de VM de escritorio de Slack con rescate VNC, ejecute:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Ese comando arrienda una máquina de escritorio/navegador Crabbox, ejecuta el canal en vivo de Slack dentro de la VM, abre Slack Web en el navegador VNC, captura el escritorio y copia `slack-qa/`, `slack-desktop-smoke.png` y `slack-desktop-smoke.mp4` cuando la captura de video está disponible de vuelta al directorio de artefactos de Mantis. Los arriendos de escritorio/navegador de Crabbox proporcionan las herramientas de captura y los paquetes auxiliares de navegador/compilación nativa por adelantado, por lo que el escenario solo debería instalar alternativas en arriendos antiguos. Mantis reporta los tiempos totales y por fase en `mantis-slack-desktop-smoke-report.md` para que las ejecuciones lentas muestren si el tiempo se destinó al calentamiento del arriendo, adquisición de credenciales, configuración remota o copia de artefactos. Reutilice `--lease-id <cbx_...>` después de iniciar sesión manualmente en Slack Web a través de VNC; los arriendos reutilizados también mantienen la caché de la tienda pnpm de Crabbox caliente. El `--hydrate-mode source` predeterminado verifica desde una copia del código fuente y ejecuta install/build dentro de la VM. Use `--hydrate-mode prehydrated` solo cuando el espacio de trabajo remoto reutilizado ya tenga `node_modules` y un `dist/` compilado; ese modo omite el costoso paso de install/build y falla de forma cerrada cuando el espacio de trabajo no está listo. Con `--gateway-setup`, Mantis deja un gateway de Slack de OpenClaw persistente ejecutándose dentro de la VM en el puerto `38973`; sin él, el comando ejecuta el canal normal de QA de Slack de bot a bot y sale después de la captura de artefactos.

La lista de verificación del operador, el comando de despacho del flujo de trabajo de GitHub, el contrato de comentario de evidencia, la tabla de decisiones del modo de hidratación, la interpretación de los tiempos y los pasos de manejo de fallos se encuentran en [Mantis Slack Desktop Runbook](/es/concepts/mantis-slack-desktop-runbook).

Para una tarea de escritorio de estilo agente/CV, ejecute:

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.4
```

`visual-task` arrienda o reutiliza una máquina de escritorio/navegador Crabbox, inicia `crabbox record --while`, controla el navegador visible a través de un `visual-driver` anidado, captura `visual-task.png`, ejecuta `openclaw infer image describe` contra la captura de pantalla cuando se selecciona `--vision-mode image-describe` y escribe `visual-task.mp4`, `mantis-visual-task-summary.json`, `mantis-visual-task-driver-result.json` y `mantis-visual-task-report.md`. Cuando se establece `--expect-text`, el prompt de visión solicita un veredicto JSON estructurado y solo pasa cuando el modelo informa evidencia visible positiva; una respuesta negativa que simplemente cita el texto objetivo falla la aserción. Use `--vision-mode metadata` para una prueba de humo sin modelo que demuestre el escritorio, el navegador, la captura de pantalla y la infraestructura de video sin llamar a un proveedor de comprensión de imágenes. La grabación es un artefacto requerido para `visual-task`; si Crabbox no graba ningún `visual-task.mp4` no vacío, la tarea falla incluso si el controlador visual pasó. En caso de falla, Mantis mantiene el contrato para VNC a menos que la tarea ya hubiera pasado y no se hubiera establecido `--keep-lease`.

Antes de usar credenciales en vivo agrupadas, ejecute:

```bash
pnpm openclaw qa credentials doctor
```

El doctor verifica el entorno del broker de Convex, valida la configuración del endpoint y verifica la accesibilidad de administración/lista cuando el secreto del mantenedor está presente. Reporta solo el estado establecido/faltante de los secretos.

## Cobertura de transporte en vivo

Los carriles de transporte en vivo comparten un contrato en lugar de que cada uno invente su propia forma de lista de escenarios. `qa-channel` es el suite amplio de comportamiento de producto sintético y no es parte de la matriz de cobertura de transporte en vivo.

| Carril   | Canary | Filtrado de mención | Bot a bot | Bloqueo de lista blanca | Respuesta de nivel superior | Reanudación de reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda | Registro de comandos nativos |
| -------- | ------ | ------------------- | --------- | ----------------------- | --------------------------- | ----------------------- | ------------------- | ------------------- | ----------------------- | ---------------- | ---------------------------- |
| Matriz   | x      | x                   | x         | x                       | x                           | x                       | x                   | x                   | x                       |                  |                              |
| Telegram | x      | x                   | x         |                         |                             |                         |                     |                     |                         | x                |                              |
| Discord  | x      | x                   | x         |                         |                             |                         |                     |                     |                         |                  | x                            |
| Slack    | x      | x                   | x         | x                       | x                           | x                       | x                   | x                   |                         |                  |                              |

Esto mantiene `qa-channel` como la suite general de comportamiento del producto, mientras que Matrix, Telegram y futuros transportes en vivo comparten una lista de verificación explícita del contrato de transporte.

Para un carril de máquina virtual (VM) de Linux desechable sin introducir Docker en la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un invitado Multipass nuevo, instala dependencias, compila OpenClaw dentro del invitado, ejecuta `qa suite`, y luego copia el informe y el resumen de QA normales de vuelta a `.artifacts/qa-e2e/...` en el host.
Reutiliza el mismo comportamiento de selección de escenarios que `qa suite` en el host.
Las ejecuciones de suite en el host y en Multipass ejecutan múltiples escenarios seleccionados en paralelo con trabajadores de gateway aislados de manera predeterminada. `qa-channel` tiene una concurrencia predeterminada de 4, limitada por la cantidad de escenarios seleccionados. Use `--concurrency <count>` para ajustar la cantidad de trabajadores, o `--concurrency 1` para la ejecución en serie.
El comando sale con un valor distinto de cero cuando algún escenario falla. Use `--allow-failures` cuando desee artefactos sin un código de salida de error.
Las ejecuciones en vivo reenvían las entradas de autenticación de QA admitidas que son prácticas para el invitado: claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor en vivo de QA y `CODEX_HOME` cuando está presente. Mantenga `--output-dir` bajo la raíz del repositorio para que el invitado pueda escribir de vuelta a través del espacio de trabajo montado.

## Referencia de QA de Telegram, Discord y Slack

Matrix tiene una [página dedicada](/es/concepts/qa-matrix) debido a su cantidad de escenarios y al aprovisionamiento del servidor doméstico (homeserver) respaldado por Docker. Telegram, Discord y Slack son más pequeños: unos pocos escenarios cada uno, sin sistema de perfiles, contra canales reales preexistentes, por lo que su referencia reside aquí.

### Indicadores CLI compartidos

Estos carriles se registran a través de `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` y aceptan los mismos indicadores:

| Indicador                             | Predeterminado                                                  | Descripción                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | -                                                               | Ejecutar solo este escenario. Repetible.                                                                                                     |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | Dónde se escriben los informes/resúmenes/mensajes observados y el registro de salida. Las rutas relativas se resuelven contra `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                                 | Raíz del repositorio al invocar desde un directorio de trabajo actual (cwd) neutral.                                                         |
| `--sut-account <id>`                  | `sut`                                                           | ID de cuenta temporal dentro de la configuración de la puerta de enlace de QA.                                                               |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` o `live-frontier` (el `live-openai` heredado aún funciona).                                                                    |
| `--model <ref>` / `--alt-model <ref>` | predeterminado del proveedor                                    | Referencias de modelos principal/alterno.                                                                                                    |
| `--fast`                              | desactivado                                                     | Modo rápido del proveedor cuando sea compatible.                                                                                             |
| `--credential-source <env\|convex>`   | `env`                                                           | Consulte [Grupo de credenciales de Convex](#convex-credential-pool).                                                                         |
| `--credential-role <maintainer\|ci>`  | `ci` en CI, `maintainer` en caso contrario                      | Rol utilizado cuando `--credential-source convex`.                                                                                           |

Cada carril sale con un valor distinto de cero en cualquier escenario fallido. `--allow-failures` escribe artefactos sin establecer un código de salida fallido.

### Pruebas de QA de Telegram

```bash
pnpm openclaw qa telegram
```

Apunta a un grupo privado real de Telegram con dos bots distintos (controlador + SUT). El bot SUT debe tener un nombre de usuario de Telegram; la observación de bot a bot funciona mejor cuando ambos bots tienen el **Modo de comunicación de bot a bot** habilitado en `@BotFather`.

Variables de entorno requeridas cuando `--credential-source env`:

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` - ID de chat numérico (cadena).
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

Opcional:

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados (por defecto se redactan).

Escenarios (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts`):

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-status-command`
- `telegram-repeated-command-authorization`
- `telegram-other-bot-command-gating`
- `telegram-context-command`
- `telegram-current-session-status-tool`
- `telegram-reply-chain-exact-marker`
- `telegram-stream-final-single-message`
- `telegram-long-final-reuses-preview`
- `telegram-long-final-three-chunks`

El conjunto predeterminado implícito siempre cubre canary, bloqueo de menciones, respuestas de comandos nativas, direccionamiento de comandos y respuestas de grupo de bot a bot. Los valores predeterminados de `mock-openai` también incluyen comprobaciones determinantes de cadena de respuesta y transmisión de mensaje final. `telegram-current-session-status-tool` permanece opcional porque solo es estable cuando se encadena directamente después de canary, no después de respuestas de comandos nativas arbitrarias. Use `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` para imprimir la división actual predeterminada/opcional con referencias de regresión.

Artefactos de salida:

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - incluye RTT por respuesta (envío del controlador → respuesta observada del SUT) comenzando con el canary.
- `telegram-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

### Discord QA

```bash
pnpm openclaw qa discord
```

Apunta a un canal de gremio privado real de Discord con dos bots: un bot controlador controlado por el arnés y un bot SUT iniciado por la puerta de enlace secundaria de OpenClaw a través del complemento de Discord incluido. Verifica el manejo de menciones en el canal, que el bot SUT ha registrado el comando nativo `/help` con Discord y escenarios de evidencia de Mantis opcionales.

Variables de entorno requeridas cuando `--credential-source env`:

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - debe coincidir con el ID de usuario del bot SUT devuelto por Discord (de lo contrario, el carril falla rápido).

Opcional:

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` selecciona el canal de voz/escenario para `discord-voice-autojoin`; sin él, el escenario selecciona el primer canal de voz/escenario visible para el bot SUT.

Escenarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`):

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - escenario de voz opcional. Se ejecuta por sí solo, habilita `channels.discord.voice.autoJoin` y verifica que el estado de voz actual del bot SUT en Discord sea el canal de voz/escenario objetivo. Las credenciales de Discord de Convex pueden incluir `voiceChannelId` opcional; de lo contrario, el ejecutor descubre el primer canal de voz/escenario visible en el gremio.
- `discord-status-reactions-tool-only` - escenario opcional de Mantis. Se ejecuta por sí solo porque cambia el SUT a respuestas de gremio siempre activas y solo de herramientas con `messages.statusReactions.enabled=true`, luego captura una línea de tiempo de reacciones REST más artefactos visuales HTML/PNG. Los informes de Mantis antes/después también preservan los artefactos MP4 proporcionados por el escenario como `baseline.mp4` y `candidate.mp4`.

Ejecute explícitamente el escenario de unión automática de voz de Discord:

```bash
pnpm openclaw qa discord \
  --scenario discord-voice-autojoin \
  --provider-mode mock-openai
```

Ejecute explícitamente el escenario de reacción de estado de Mantis:

```bash
pnpm openclaw qa discord \
  --scenario discord-status-reactions-tool-only \
  --provider-mode live-frontier \
  --model openai/gpt-5.4 \
  --alt-model openai/gpt-5.4 \
  --fast
```

Artefactos de salida:

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`.
- `discord-qa-reaction-timelines.json` y `discord-status-reactions-tool-only-timeline.png` cuando se ejecuta el escenario de reacción de estado.

### Slack QA

```bash
pnpm openclaw qa slack
```

Apunta a un canal privado real de Slack con dos bots distintos: un bot controlador controlado por el arnés y un bot SUT iniciado por la puerta de enlace secundaria de OpenClaw a través del complemento de Slack incluido.

Entorno requerido cuando `--credential-source env`:

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

Opcional:

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.

Escenarios (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts:39`):

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`

Artefactos de salida:

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`.

#### Configuración del espacio de trabajo de Slack

El carril necesita dos aplicaciones de Slack distintas en un mismo espacio de trabajo, además de un canal del que ambos bots sean miembros:

- `channelId`: el id `Cxxxxxxxxxx` de un canal al que hayan sido invitados ambos bots. Utilice un canal dedicado; el carril publica en cada ejecución.
- `driverBotToken`: token de bot (`xoxb-...`) de la aplicación **Driver**.
- `sutBotToken`: token de bot (`xoxb-...`) de la aplicación **SUT**, que debe ser una aplicación de Slack separada del controlador para que su id de usuario de bot sea distinto.
- `sutAppToken`: token a nivel de aplicación (`xapp-...`) de la aplicación SUT con `connections:write`, utilizado por el modo Socket para que la aplicación SUT pueda recibir eventos.

Se prefiere un espacio de trabajo de Slack dedicado a QA antes que reutilizar un espacio de trabajo de producción.

El manifiesto SUT a continuación restringe intencionalmente la instalación de producción del complemento Slack incluido (`extensions/slack/src/setup-shared.ts:10`) a los permisos y eventos cubiertos por la suite de QA de Slack en vivo. Para la configuración del canal de producción tal como la ven los usuarios, consulte [Configuración rápida del canal de Slack](/es/channels/slack#quick-setup); el par QA Driver/SUT está intencionalmente separado porque el carril necesita dos id de usuario de bot distintos en un mismo espacio de trabajo.

**1. Crear la aplicación Driver**

Vaya a [api.slack.com/apps](https://api.slack.com/apps) → _Create New App_ → _From a manifest_ → elija el espacio de trabajo de QA, pegue el siguiente manifiesto y luego _Install to Workspace_:

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "Test driver bot for OpenClaw QA Slack live lane"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["chat:write", "channels:history", "groups:history", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

Copie el _Bot User OAuth Token_ (`xoxb-...`): ese se convierte en `driverBotToken`. El controlador solo necesita publicar mensajes e identificarse a sí mismo; sin eventos, sin modo Socket.

**2. Crear la aplicación SUT**

Repita _Create New App → From a manifest_ en el mismo espacio de trabajo. Esta aplicación de QA utiliza intencionalmente una versión más reducida del manifiesto de producción del complemento Slack incluido (`extensions/slack/src/setup-shared.ts:10`): los alcances y eventos de reacción se omiten porque la suite de QA de Slack en vivo aún no cubre el manejo de reacciones.

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "usergroups:read", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_home_opened", "app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed"]
    }
  }
}
```

Después de que Slack cree la aplicación, haga dos cosas en su página de configuración:

- _Install to Workspace_ → copie el _Bot User OAuth Token_ → ese se convierte en `sutBotToken`.
- _Información básica → Tokens de nivel de aplicación → Generar token y alcances_ → agregar alcance `connections:write` → guardar → copiar el valor del `xapp-...` → eso se convierte en `sutAppToken`.

Verifique que los dos bots tengan identificadores de usuario distintos llamando a `auth.test` en cada token. El tiempo de ejecución distingue el controlador y el SUT por identificador de usuario; reutilizar una aplicación para ambos fallará inmediatamente en mention-gating.

**3. Crear el canal**

En el espacio de trabajo de QA, cree un canal (por ejemplo, `#openclaw-qa`) e invite a ambos bots desde dentro del canal:

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

Copie el identificador `Cxxxxxxxxxx` desde _información del canal → Acerca de → ID del canal_ - ese se convierte en `channelId`. Funciona un canal público; si usa un canal privado, ambas aplicaciones ya tienen `groups:history`, por lo que las lecturas del historial del arnés seguirán teniendo éxito.

**4. Registrar las credenciales**

Dos opciones. Use variables de entorno para la depuración de una sola máquina (configure las cuatro variables `OPENCLAW_QA_SLACK_*` y pase `--credential-source env`), o inicialice el grupo compartido de Convex para que CI y otros mantenedores puedan alquilarlas.

Para el grupo de Convex, escriba los cuatro campos en un archivo JSON:

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

Con `OPENCLAW_QA_CONVEX_SITE_URL` y `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` exportados en su shell, registre y verifique:

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

Espere `count: 1`, `status: "active"`, ningún campo `lease`.

**5. Verificar de extremo a extremo**

Ejecute el carril localmente para confirmar que ambos bots pueden comunicarse entre sí a través del intermediario:

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

Una ejecución exitosa se completa en bien menos de 30 segundos y `slack-qa-report.md` muestra tanto `slack-canary` como `slack-mention-gating` en el estado `pass`. Si el carril se bloquea durante unos 90 segundos y sale con `Convex credential pool exhausted for kind "slack"`, o bien el grupo está vacío o cada fila está alquilada - `qa credentials list --kind slack --status all --json` le dirá cuál.

### Grupo de credenciales de Convex

Los carriles de Telegram, Discord, Slack y WhatsApp pueden arrendar credenciales de un grupo compartido de Convex en lugar de leer las variables de entorno anteriores. Pase `--credential-source convex` (o configure `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`); QA Lab adquiere un arrendamiento exclusivo, envía latidos durante la duración de la ejecución y lo libera al apagar. Los tipos de grupo son `"telegram"`, `"discord"`, `"slack"` y `"whatsapp"`.

Las formas de carga útil que el agente valida en `admin/add`:

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` debe ser una cadena de ID de chat numérico.
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - los números de teléfono deben ser cadenas E.164 distintas.

Los carriles de Slack también pueden usar el grupo. Las comprobaciones de forma de carga útil de Slack actualmente residen en el ejecutor de QA de Slack en lugar de en el agente; use `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`, con un ID de canal de Slack como `Cxxxxxxxxxx`. Consulte [Configuración del espacio de trabajo de Slack](#setting-up-the-slack-workspace) para el aprovisionamiento de la aplicación y el alcance.

Las variables de entorno operativas y el contrato de punto final del agente Convex residen en [Pruebas → Credenciales de Telegram compartidas a través de Convex](/es/help/testing#shared-telegram-credentials-via-convex-v1) (el nombre de la sección es anterior al grupo multicanal; la semántica de arrendamiento se comparte entre tipos).

## Semillas respaldadas por repositorio

Los activos de semilla residen en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el
agente.

`qa-lab` debe seguir siendo un ejecutor de markdown genérico. Cada archivo de markdown de escenario es
la fuente de verdad para una ejecución de prueba y debe definir:

- metadatos del escenario
- metadatos opcionales de categoría, capacidad, carril y riesgo
- referencias de documentos y código
- requisitos de complemento opcionales
- parche de configuración de puerta de enlace opcional
- el `qa-flow` ejecutable

La superficie de tiempo de ejecución reutilizable que respalda `qa-flow` puede mantenerse genérica
y transversal. Por ejemplo, los escenarios de markdown pueden combinar ayudantes del lado
del transporte con ayudantes del lado del navegador que impulsan la interfaz de usuario de Control integrada a través de
costura `browser.request` del Gateway sin agregar un ejecutor de caso especial.

Los archivos de escenarios deben agruparse por capacidad del producto en lugar de por carpeta
del árbol de fuentes. Mantenga los ID de escenarios estables cuando se muevan los archivos; use `docsRefs` y `codeRefs`
para la trazabilidad de la implementación.

La lista base debe mantenerse lo suficientemente amplia para cubrir:

- Chat de MD y canal
- comportamiento de hilo
- ciclo de vida de acción de mensaje
- devoluciones de llamada de cron
- recuperación de memoria
- cambio de modelo
- transferencia de subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Carriles simulados de proveedores

`qa suite` tiene dos carriles simulados de proveedor local:

- `mock-openai` es el simulacro de OpenClaw consciente de escenarios. Sigue siendo el carril
  simulado determinista predeterminado para QA respaldado por repositorio y puertas de paridad.
- `aimock` inicia un servidor de proveedor respaldado por AIMock para protocolos experimentales,
  dispositivos, grabación/reproducción y cobertura de caos. Es aditivo y no
  reemplaza al despachador de escenarios `mock-openai`.

La implementación del carril del proveedor reside bajo `extensions/qa-lab/src/providers/`.
Cada proveedor posee sus valores predeterminados, el inicio del servidor local, la configuración del modelo de puerta de enlace,
las necesidades de preparación del perfil de autenticación y las indicaciones de capacidad en vivo/simulada. El código compartido de la suite
y de la puerta de enlace debe enrutar a través del registro del proveedor en lugar de bifurcarse según los
nombres de los proveedores.

## Adaptadores de transporte

`qa-lab` posee una costura de transporte genérica para escenarios de QA de markdown. `qa-channel` es el primer adaptador en esa costura, pero el objetivo de diseño es más amplio: los canales reales o sintéticos futuros deben conectarse al mismo ejecutor de suite en lugar de agregar un ejecutor de QA específico del transporte.

A nivel de arquitectura, la división es:

- `qa-lab` posee la ejecución genérica de escenarios, la concurrencia de trabajadores, la escritura de artefactos y los informes.
- El adaptador de transporte posee la configuración de la puerta de enlace, la preparación, la observación de entrada y salida, las acciones de transporte y el estado de transporte normalizado.
- Los archivos de escenarios Markdown en `qa/scenarios/` definen la ejecución de la prueba; `qa-lab` proporciona la superficie de ejecución reutilizable que los ejecuta.

### Agregar un canal

Agregar un canal al sistema QA de Markdown requiere exactamente dos cosas:

1. Un adaptador de transporte para el canal.
2. Un paquete de escenarios que ejercite el contrato del canal.

No agregue una nueva raíz de comando QA de nivel superior cuando el host `qa-lab` compartido pueda ser el propietario del flujo.

`qa-lab` posee la mecánica del host compartido:

- la raíz del comando `openclaw qa`
- inicio y desmontaje del conjunto de pruebas (suite)
- concurrencia de trabajadores
- escritura de artefactos
- generación de informes
- ejecución de escenarios
- alias de compatibilidad para escenarios `qa-channel` más antiguos

Los complementos del ejecutor son propietarios del contrato de transporte:

- cómo se monta `openclaw qa <runner>` debajo de la raíz `qa` compartida
- cómo se configura la puerta de enlace para ese transporte
- cómo se verifica la preparación
- cómo se inyectan los eventos entrantes
- cómo se observan los mensajes salientes
- cómo se exponen las transcripciones y el estado de transporte normalizado
- cómo se ejecutan las acciones respaldadas por el transporte
- cómo se maneja el restablecimiento o la limpieza específica del transporte

El umbral mínimo de adopción para un nuevo canal:

1. Mantenga `qa-lab` como propietario de la raíz `qa` compartida.
2. Implemente el ejecutor de transporte en la costura (seam) del host `qa-lab` compartido.
3. Mantenga la mecánica específica del transporte dentro del complemento del ejecutor o el arnés del canal.
4. Monte el ejecutor como `openclaw qa <runner>` en lugar de registrar un comando raíz competidor. Los complementos del ejecutor deben declarar `qaRunners` en `openclaw.plugin.json` y exportar una matriz `qaRunnerCliRegistrations` coincidente desde `runtime-api.ts`. Mantenga `runtime-api.ts` ligero; la ejecución diferida de la CLI y del ejecutor debe permanecer detrás de puntos de entrada separados.
5. Cree o adapte escenarios Markdown en los directorios `qa/scenarios/` temáticos.
6. Use los asistentes de escenarios genéricos para nuevos escenarios.
7. Mantén los alias de compatibilidad existentes funcionando a menos que el repositorio esté realizando una migración intencional.

La regla de decisión es estricta:

- Si el comportamiento se puede expresar una vez en `qa-lab`, ponlo en `qa-lab`.
- Si el comportamiento depende de un transporte de un canal, mantenlo en ese plugin de ejecución (runner) o arnés de plugin.
- Si un escenario necesita una nueva capacidad que más de un canal puede usar, añade un ayudante genérico en lugar de una rama específica del canal en `suite.ts`.
- Si un comportamiento solo es significativo para un transporte, mantén el escenario específico del transporte y haz que eso sea explícito en el contrato del escenario.

### Nombres de ayudantes de escenario

Ayudantes genéricos preferidos para nuevos escenarios:

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

Los alias de compatibilidad permanecen disponibles para los escenarios existentes - `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus` - pero la creación de nuevos escenarios debería usar los nombres genéricos. Los alias existen para evitar una migración de "flag-day", no como el modelo a seguir.

## Informes

`qa-lab` exporta un informe de protocolo Markdown a partir de la línea de tiempo del bus observado.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué permaneció bloqueado
- Qué escenarios de seguimiento vale la pena añadir

Para ver el inventario de escenarios disponibles, útil al dimensionar el trabajo de seguimiento o al conectar un nuevo transporte, ejecuta `pnpm openclaw qa coverage` (añade `--json` para una salida legible por máquina).

Para verificar caracteres y estilos, ejecuta el mismo escenario en múltiples referencias de modelos en vivo y escribe un informe Markdown juzgado:

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-6,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-6,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

El comando ejecuta procesos secundarios locales de la puerta de enlace de QA, no Docker. Los escenarios de evaluación de personajes deben establecer el personaje a través de `SOUL.md`, luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe decir al modelo candidato que está siendo evaluado. El comando conserva cada transcripción completa, registra estadísticas básicas de ejecución y luego pregunta a los modelos de jueces en modo rápido con razonamiento `xhigh` cuando esté soportado para clasificar las ejecuciones por naturalidad, ambiente y humor. Use `--blind-judge-models` al comparar proveedores: el prompt del juez todavía recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan con etiquetas neutrales como `candidate-01`; el informe asigna las clasificaciones de vuelta a las referencias reales después del análisis. Las ejecuciones de candidatos por defecto usan pensamiento `high`, con `medium` para GPT-5.5 y `xhigh` para referencias de evaluación de OpenAI más antiguas que lo soportan. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y el formato más antiguo `--model-thinking <provider/model=level>` se mantiene por compatibilidad. Las referencias de candidatos de OpenAI por defecto están en modo rápido, por lo que se utiliza el procesamiento prioritario donde el proveedor lo soporta. Agregue `,fast`, `,no-fast`, o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido para cada modelo candidato. Las duraciones de los candidatos y jueces se registran en el informe para el análisis de referencia, pero los prompts de los jueces dicen explícitamente no clasificar por velocidad. Las ejecuciones de modelos de candidatos y jueces por defecto ambas a una concurrencia de 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la puerta de enlace local hagan que una ejecución sea demasiado ruidosa. Cuando no se pasa ningún `--model` de candidato, la evaluación de caracteres por defecto es `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5`, y `google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`. Cuando no se pasa ningún `--judge-model`, los jueces por defecto son `openai/gpt-5.5,thinking=xhigh,fast` y `anthropic/claude-opus-4-6,thinking=high`.

## Documentos relacionados

- [QA de Matrix](/es/concepts/qa-matrix)
- [Canal de QA](/es/channels/qa-channel)
- [Pruebas](/es/help/testing)
- [Panel de control](/es/web/dashboard)
