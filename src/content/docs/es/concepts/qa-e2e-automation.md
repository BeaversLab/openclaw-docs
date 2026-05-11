---
summary: "Resumen de la pila de QA: qa-lab, qa-channel, escenarios con respaldo en repositorio, carriles de transporte en vivo, adaptadores de transporte e informes."
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

- `extensions/qa-channel`: canal de mensajes sintético con DM, canal, hilo,
  superficie de reacción, edición y eliminación.
- `extensions/qa-lab`: interfaz de usuario del depurador y bus de QA para observar la transcripción,
  inyectar mensajes entrantes y exportar un informe en Markdown.
- `extensions/qa-matrix`, complementos de ejecución futuros: adaptadores de transporte en vivo que
  impulsan un canal real dentro de una puerta de enlace de QA secundaria.
- `qa/`: activos semilla con respaldo en repositorio para la tarea de inicio y escenarios de QA
  de referencia.

## Superficie de comandos

Cada flujo de QA se ejecuta bajo `pnpm openclaw qa <subcommand>`. Muchos tienen `pnpm qa:*`
alias de script; se admiten ambas formas.

| Comando                                             | Propósito                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Autocomprobación de QA integrada; escribe un informe en Markdown.                                                                                                                           |
| `qa suite`                                          | Ejecuta escenarios con respaldo en repositorio contra el carril de la puerta de enlace de QA. Alias: `pnpm openclaw qa suite --runner multipass` para una máquina virtual Linux desechable. |
| `qa coverage`                                       | Imprime el inventario de cobertura de escenarios en markdown (`--json` para salida de máquina).                                                                                             |
| `qa parity-report`                                  | Compara dos archivos `qa-suite-summary.json` y escribe el informe de puerta de paridad agéntica.                                                                                            |
| `qa character-eval`                                 | Ejecuta el escenario de QA de personajes en múltiples modelos en vivo con un informe evaluado. Consulte [Informes](#reporting).                                                             |
| `qa manual`                                         | Ejecuta un prompt único contra el carril de proveedor/modelo seleccionado.                                                                                                                  |
| `qa ui`                                             | Inicia la interfaz de usuario del depurador de QA y el bus de QA local (alias: `pnpm qa:lab:ui`).                                                                                           |
| `qa docker-build-image`                             | Construye la imagen de Docker de QA preconfigurada.                                                                                                                                         |
| `qa docker-scaffold`                                | Escribe un andamio docker-compose para el panel de QA + carril de puerta de enlace.                                                                                                         |
| `qa up`                                             | Construye el sitio de QA, inicia la pila respaldada por Docker, imprime la URL (alias: `pnpm qa:lab:up`; la variante `:fast` añade `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).  |
| `qa aimock`                                         | Inicia solo el servidor proveedor AIMock.                                                                                                                                                   |
| `qa mock-openai`                                    | Inicia solo el servidor proveedor `mock-openai` con reconocimiento de escenarios.                                                                                                           |
| `qa credentials doctor` / `add` / `list` / `remove` | Administra el grupo compartido de credenciales de Convex.                                                                                                                                   |
| `qa matrix`                                         | Carril de transporte en vivo contra un servidor doméstico Tuwunel desechable. Consulte [Matrix QA](/es/concepts/qa-matrix).                                                                 |
| `qa telegram`                                       | Carril de transporte en vivo contra un grupo privado real de Telegram.                                                                                                                      |
| `qa discord`                                        | Carril de transporte en vivo contra un canal de gremio (guild) privado real de Discord.                                                                                                     |

## Flujo del operador

El flujo actual del operador de QA es un sitio de QA de dos paneles:

- Izquierda: Panel de control de Gateway (UI de control) con el agente.
- Derecha: QA Lab, mostrando la transcripción tipo Slack y el plan de escenarios.

Ejecútelo con:

```bash
pnpm qa:lab:up
```

Eso construye el sitio de QA, inicia el carril de gateway respaldado por Docker y expone la página de QA Lab donde un operador o bucle de automatización puede asignar al agente una misión de QA, observar el comportamiento del canal real y registrar lo que funcionó, falló o permaneció bloqueado.

Para una iteración más rápida de la UI de QA Lab sin reconstruir la imagen de Docker cada vez, inicie la pila con un paquete QA Lab montado mediante bind:

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` mantiene los servicios de Docker en una imagen precompilada y monta `extensions/qa-lab/web/dist` en el contenedor `qa-lab`. `qa:lab:watch` reconstruye ese paquete ante cambios, y el navegador se recarga automáticamente cuando cambia el hash de los activos de QA Lab.

Para una prueba de humo local de trazas de OpenTelemetry, ejecute:

```bash
pnpm qa:otel:smoke
```

Ese script inicia un receptor de trazas OTLP/HTTP local, ejecuta el escenario de QA `otel-trace-smoke` con el complemento `diagnostics-otel` habilitado, luego decodifica los intervalos protobuf exportados y afirma la forma crítica para el lanzamiento: `openclaw.run`, `openclaw.harness.run`, `openclaw.model.call`, `openclaw.context.assembled` y `openclaw.message.delivery` deben estar presentes; las llamadas al modelo no deben exportar `StreamAbandoned` en turnos exitosos; los IDs de diagnóstico sin procesar y los atributos `openclaw.content.*` deben mantenerse fuera de la traza. Escribe `otel-smoke-summary.json` junto a los artefactos de la suite de QA.

La QA de observabilidad permanece solo en la extracción de fuentes (source-checkout). El archivo tarball de npm omite intencionalmente QA Lab, por lo que los carriles de lanzamiento de Docker del paquete no ejecutan comandos `qa`. Use `pnpm qa:otel:smoke` desde una extracción de fuentes construida al cambiar la instrumentación de diagnóstico.

Para un carril de pruebas de humo (smoke lane) de Matrix real en cuanto al transporte, ejecute:

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La referencia completa de la CLI, el catálogo de perfil/escenario, las variables de entorno y el diseño de artefactos para este carril se encuentran en [Matrix QA](/es/concepts/qa-matrix). En resumen: aprovisiona un servidor doméstico Tuwunel desechable en Docker, registra usuarios de conductor/SUT/observador temporales, ejecuta el complemento Matrix real dentro de una puerta de enlace de QA secundaria con alcance en ese transporte (sin `qa-channel`), y luego escribe un informe Markdown, un resumen JSON, un artefacto de eventos observados y un registro de salida combinado bajo `.artifacts/qa-e2e/matrix-<timestamp>/`.

Para carriles de pruebas de humo de Telegram y Discord reales en cuanto al transporte:

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
```

Ambos apuntan a un canal real preexistente con dos bots (conductor + SUT). Las variables de entorno requeridas, las listas de escenarios, los artefactos de salida y el grupo de credenciales Convex están documentados en [Referencia de QA de Telegram y Discord](#telegram-and-discord-qa-reference) a continuación.

Antes de usar credenciales vivas agrupadas, ejecute:

```bash
pnpm openclaw qa credentials doctor
```

El médico verifica el entorno del intermediario (broker) Convex, valida la configuración del punto final y verifica la accesibilidad de administrador/lista cuando está presente el secreto de mantenimiento. Solo informa el estado establecido/faltante de los secretos.

## Cobertura de transporte en vivo

Los carriles de transporte en vivo comparten un contrato en lugar de que cada uno invente su propia forma de lista de escenarios. `qa-channel` es el amplio conjunto de comportamiento sintético del producto y no forma parte de la matriz de cobertura de transporte en vivo.

| Carril   | Canary | Mencionar bloqueo (gating) | Bloqueo de lista de permitidos | Respuesta de nivel superior | Reanudación tras reinicio | Seguimiento de hilos | Aislamiento de hilos | Observación de reacciones | Comando de ayuda | Registro de comandos nativos |
| -------- | ------ | -------------------------- | ------------------------------ | --------------------------- | ------------------------- | -------------------- | -------------------- | ------------------------- | ---------------- | ---------------------------- |
| Matriz   | x      | x                          | x                              | x                           | x                         | x                    | x                    | x                         |                  |                              |
| Telegram | x      | x                          |                                |                             |                           |                      |                      |                           | x                |                              |
| Discord  | x      | x                          |                                |                             |                           |                      |                      |                           |                  | x                            |

Esto mantiene a `qa-channel` como el amplio conjunto de comportamiento del producto, mientras que Matrix,
Telegram y futuros transportes en vivo comparten una lista de verificación
explícita del contrato de transporte.

Para un carril de VM Linux desechable sin introducir Docker en la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un invitado Multipass nuevo, instala dependencias, compila OpenClaw
dentro del invitado, ejecuta `qa suite` y luego copia el informe de QA normal
y el resumen de nuevo en `.artifacts/qa-e2e/...` en el host.
Reutiliza el mismo comportamiento de selección de escenarios que `qa suite` en el host.
Las ejecuciones de suites en el host y en Multipass ejecutan múltiples escenarios seleccionados en paralelo
con trabajadores de gateway aislados de forma predeterminada. `qa-channel` tiene una concurrencia predeterminada
de 4, limitada por la cantidad de escenarios seleccionados. Use `--concurrency <count>` para ajustar
la cantidad de trabajadores, o `--concurrency 1` para la ejecución en serie.
El comando sale con un valor distinto de cero cuando algún escenario falla. Use `--allow-failures` cuando
desee artefactos sin un código de salida con error.
Las ejecuciones en vivo reenvían las entradas de autenticación de QA compatibles que son prácticas para el
invitado: claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor en vivo de QA y
`CODEX_HOME` cuando esté presente. Mantenga `--output-dir` bajo la raíz del repositorio para que el invitado
pueda escribir a través del espacio de trabajo montado.

## Referencia de QA de Telegram y Discord

Matrix tiene una [página dedicada](/es/concepts/qa-matrix) debido a su cantidad de escenarios y al aprovisionamiento del servidor doméstico (homeserver) respaldado por Docker. Telegram y Discord son más pequeños: unos pocos escenarios cada uno, sin sistema de perfiles, contra canales reales preexistentes, por lo que su referencia reside aquí.

### Marcas (flags) de CLI compartidas

Ambos carriles se registran a través de `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` y aceptan las mismas marcas:

| Marca                                 | Predeterminado                                            | Descripción                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--scenario <id>`                     | —                                                         | Ejecutar solo este escenario. Repetible.                                                                                                     |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord}-<timestamp>` | Donde se escriben los informes/resúmenes/mensajes observados y el registro de salida. Las rutas relativas se resuelven contra `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                           | Raíz del repositorio al invocar desde un cwd neutral.                                                                                        |
| `--sut-account <id>`                  | `sut`                                                     | ID de cuenta temporal dentro de la configuración de la puerta de enlace de QA.                                                               |
| `--provider-mode <mode>`              | `live-frontier`                                           | `mock-openai` o `live-frontier` (el `live-openai` heredado todavía funciona).                                                                |
| `--model <ref>` / `--alt-model <ref>` | predeterminado del proveedor                              | Referencias de modelo primario/alterno.                                                                                                      |
| `--fast`                              | desactivado                                               | Modo rápido del proveedor cuando sea compatible.                                                                                             |
| `--credential-source <env\|convex>`   | `env`                                                     | Consulte [Grupo de credenciales de Convex](#convex-credential-pool).                                                                         |
| `--credential-role <maintainer\|ci>`  | `ci` en CI, `maintainer` en caso contrario                | Rol utilizado cuando `--credential-source convex`.                                                                                           |

Ambos salen con un valor distinto de cero en cualquier escenario fallido. `--allow-failures` escribe artefactos sin establecer un código de salida fallido.

### QA de Telegram

```bash
pnpm openclaw qa telegram
```

Apunta a un grupo privado real de Telegram con dos bots distintos (controlador + SUT). El bot SUT debe tener un nombre de usuario de Telegram; la observación de bot a bot funciona mejor cuando ambos bots tienen el **Modo de comunicación de bot a bot** habilitado en `@BotFather`.

Env requerida cuando `--credential-source env`:

- `OPENCLAW_QA_TELEGRAM_GROUP_ID` — ID de chat numérico (cadena).
- `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`

Opcional:

- `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados (por defecto se redactan).

Escenarios (`extensions/qa-lab/src/live-transports/telegram/telegram-live.runtime.ts:44`):

- `telegram-canary`
- `telegram-mention-gating`
- `telegram-mentioned-message-reply`
- `telegram-help-command`
- `telegram-commands-command`
- `telegram-tools-compact-command`
- `telegram-whoami-command`
- `telegram-context-command`

Artefactos de salida:

- `telegram-qa-report.md`
- `telegram-qa-summary.json` — incluye RTT por respuesta (envío del controlador → respuesta observada del SUT) comenzando con el canary.
- `telegram-qa-observed-messages.json` — cuerpos redactados a menos que `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

### QA de Discord

```bash
pnpm openclaw qa discord
```

Apunta a un canal privado real de un servidor de Discord con dos bots: un bot controlador controlado por el arnés y un bot SUT iniciado por la puerta de enlace OpenClaw secundaria a través del complemento de Discord incluido. Verifica el manejo de menciones en el canal y que el bot SUT haya registrado el comando nativo `/help` con Discord.

Entorno requerido cuando `--credential-source env`:

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` — debe coincidir con el ID de usuario del bot SUT devuelto por Discord (de lo contrario, el carril falla rápido).

Opcional:

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.

Escenarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`):

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`

Artefactos de salida:

- `discord-qa-report.md`
- `discord-qa-summary.json`
- `discord-qa-observed-messages.json` — cuerpos redactados a menos que `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1`.

### Grupo de credenciales de Convex

Tanto los carriles de Telegram como los de Discord pueden arrendar credenciales de un grupo compartido de Convex en lugar de leer las variables de entorno anteriores. Pase `--credential-source convex` (o establezca `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`); QA Lab adquiere un arrendamiento exclusivo, envía latidos durante la duración de la ejecución y lo libera al apagarse. Los tipos de grupo son `"telegram"` y `"discord"`.

Formas de carga útil que el corredor valida en `admin/add`:

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` — `groupId` debe ser una cadena de ID de chat numérica.
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.

Las variables de entorno operativas y el contrato del punto final del agente Convex se encuentran en [Testing → Shared Telegram credentials via Convex](/es/help/testing#shared-telegram-credentials-via-convex-v1) (el nombre de la sección es anterior a la compatibilidad con Discord; la semántica del agente es idéntica para ambos tipos).

## Semillas respaldadas por repositorio

Los activos de semilla residen en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el agente.

`qa-lab` debe seguir siendo un ejecutor genérico de markdown. Cada archivo markdown de escenario es la fuente de verdad para una ejecución de prueba y debe definir:

- metadatos del escenario
- metadatos opcionales de categoría, capacidad, carril y riesgo
- referencias de documentación y código
- requisitos de complementos opcionales
- parche de configuración de puerta de enlace opcional
- el `qa-flow` ejecutable

Se permite que la superficie de tiempo de ejecución reutilizable que respalda `qa-flow` permanezca genérica y transversal. Por ejemplo, los escenarios de markdown pueden combinar auxiliares del lado del transporte con auxiliares del lado del navegador que impulsan la IU de Control integrada a través de la costura `browser.request` de Gateway sin agregar un ejecutor de caso especial.

Los archivos de escenarios deben agruparse por capacidad del producto en lugar de por carpeta del árbol de fuentes. Mantenga los ID de escenarios estables cuando se muevan los archivos; use `docsRefs` y `codeRefs` para la trazabilidad de la implementación.

La línea base debe mantenerse lo suficientemente amplia para cubrir:

- chat de MD y canal
- comportamiento de hilos
- ciclo de vida de acciones de mensajes
- devoluciones de llamada de cron
- recuerdo de memoria
- cambio de modelo
- transferencia de subagente
- lectura de repositorio y lectura de documentación
- una pequeña tarea de compilación como Lobster Invaders

## Carriles simulados de proveedor

`qa suite` tiene dos carriles simulados de proveedor locales:

- `mock-openai` es el simulacro de OpenClaw con conocimiento de escenarios. Sigue siendo el carril simulado determinista predeterminado para QA respaldado por repositorio y puertas de paridad.
- `aimock` inicia un servidor de proveedor respaldado por AIMock para protocolo experimental, accesorios, grabación/reproducción y cobertura de caos. Es aditivo y no reemplaza al despachador de escenarios `mock-openai`.

La implementación del carril del proveedor reside en `extensions/qa-lab/src/providers/`.
Cada proveedor posee sus valores predeterminados, el inicio del servidor local, la configuración del modelo de puerta de enlace,
las necesidades de perfil de autenticación y las banderas de capacidades en vivo/simuladas. El código compartido de la suite y de la
puerta de enlace debe enrutar a través del registro del proveedor en lugar de bifurcarse según los
nombres de los proveedores.

## Adaptadores de transporte

`qa-lab` posee una costura de transporte genérica para escenarios de QA en Markdown. `qa-channel` es el primer adaptador en esa costura, pero el objetivo de diseño es más amplio: los canales reales o sintéticos futuros deben conectarse al mismo ejecutor de suite en lugar de agregar un ejecutor de QA específico del transporte.

A nivel de arquitectura, la división es:

- `qa-lab` posee la ejecución genérica de escenarios, la concurrencia de trabajadores, la escritura de artefactos y los informes.
- El adaptador de transporte posee la configuración de la puerta de enlace, la preparación, la observación de entrada y salida, las acciones de transporte y el estado normalizado del transporte.
- Los archivos de escenarios de Markdown bajo `qa/scenarios/` definen la ejecución de la prueba; `qa-lab` proporciona la superficie de tiempo de ejecución reutilizable que los ejecuta.

### Agregar un canal

Agregar un canal al sistema de QA de Markdown requiere exactamente dos cosas:

1. Un adaptador de transporte para el canal.
2. Un paquete de escenarios que ejerza el contrato del canal.

No agregue una nueva raíz de comando de QA de nivel superior cuando el host compartido `qa-lab` pueda poseer el flujo.

`qa-lab` posee los mecánicos del host compartido:

- la raíz del comando `openclaw qa`
- inicio y desmontaje de la suite
- concurrencia de trabajadores
- escritura de artefactos
- generación de informes
- ejecución de escenarios
- alias de compatibilidad para escenarios antiguos de `qa-channel`

Los complementos del ejecutor poseen el contrato de transporte:

- cómo se monta `openclaw qa <runner>` debajo de la raíz compartida `qa`
- cómo se configura la puerta de enlace para ese transporte
- cómo se verifica la preparación
- cómo se inyectan los eventos entrantes
- cómo se observan los mensajes salientes
- cómo se exponen las transcripciones y el estado normalizado del transporte
- cómo se ejecutan las acciones respaldadas por el transporte
- cómo se maneja el restablecimiento o la limpieza específica del transporte

El mínimo requisito de adopción para un nuevo canal:

1. Mantenga `qa-lab` como el propietario de la raíz `qa` compartida.
2. Implemente el ejecutor de transporte en la costura (seam) del host `qa-lab` compartido.
3. Mantenga los mecanismos específicos del transporte dentro del complemento del ejecutor o del arnés del canal.
4. Monte el ejecutor como `openclaw qa <runner>` en lugar de registrar un comando raíz competidor. Los complementos del ejecutor deben declarar `qaRunners` en `openclaw.plugin.json` y exportar una matriz `qaRunnerCliRegistrations` coincidente desde `runtime-api.ts`. Mantenga `runtime-api.ts` ligero; la ejecución diferida de la CLI y del ejecutor debe permanecer detrás de puntos de entrada separados.
5. Cree o adapte escenarios en markdown bajo los directorios `qa/scenarios/` temáticos.
6. Utilice los asistentes de escenarios genéricos para los nuevos escenarios.
7. Mantenga los alias de compatibilidad existentes funcionando a menos que el repositorio esté realizando una migración intencional.

La regla de decisión es estricta:

- Si el comportamiento puede expresarse una vez en `qa-lab`, póngalo en `qa-lab`.
- Si el comportamiento depende de un transporte de canal, manténgalo en ese complemento del ejecutor o en el arnés del complemento.
- Si un escenario necesita una nueva capacidad que más de un canal pueda usar, agregue un asistente genérico en lugar de una rama específica del canal en `suite.ts`.
- Si un comportamiento solo es significativo para un transporte, mantenga el escenario específico del transporte y hágalo explícito en el contrato del escenario.

### Nombres de asistentes de escenarios

Asistentes genéricos preferidos para nuevos escenarios:

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

Los alias de compatibilidad siguen disponibles para los escenarios existentes — `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus` — pero la creación de nuevos escenarios debe usar los nombres genéricos. Los alias existen para evitar una migración de "flag-day", no como el modelo a futuro.

## Informes

`qa-lab` exporta un informe de protocolo Markdown a partir de la línea de tiempo observada del bus.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué siguió bloqueado
- Qué escenarios de seguimiento vale la pena añadir

Para ver el inventario de escenarios disponibles — útil al dimensionar el trabajo de seguimiento o al conectar un nuevo transporte — ejecute `pnpm openclaw qa coverage` (añada `--json` para una salida legible por máquina).

Para verificaciones de carácter y estilo, ejecute el mismo escenario a través de múltiples referencias de modelos en vivo y escriba un informe Markdown juzgado:

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

El comando ejecuta procesos secundarios locales de la pasarela QA, no Docker. Los escenarios de evaluación de personajes deben establecer el personaje a través de `SOUL.md`, luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe decir al modelo candidato que está siendo evaluado. El comando preserva cada transcripción completa, registra estadísticas básicas de ejecución, y luego pide a los modelos jueces en modo rápido con razonamiento `xhigh` donde sea compatible para clasificar las ejecuciones por naturalidad, ambiente y humor.
Use `--blind-judge-models` al comparar proveedores: el mensaje del juez todavía recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan con etiquetas neutrales como `candidate-01`; el informe mapea las clasificaciones de vuelta a las referencias reales después del análisis.
Las ejecuciones de candidatos usan por defecto pensamiento `high`, con `medium` para GPT-5.5 y `xhigh` para referencias de evaluación de OpenAI más antiguas que lo admitan. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y la forma anterior `--model-thinking <provider/model=level>` se mantiene por compatibilidad.
Las referencias de candidatos de OpenAI usan por defecto el modo rápido, por lo que se utiliza el procesamiento de prioridad donde el proveedor lo admite. Agregue `,fast`, `,no-fast` o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido en cada modelo candidato. Las duraciones de los candidatos y jueces se registran en el informe para el análisis de referencia, pero los mensajes de los jueces dicen explícitamente que no clasifiquen por velocidad.
Las ejecuciones de modelos de candidatos y jueces usan por defecto una concurrencia de 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la pasarela local hagan que una ejecución sea demasiado ruidosa.
Cuando no se pasa ningún candidato `--model`, la evaluación de caracteres usa por defecto `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-6`,
`anthropic/claude-sonnet-4-6`, `zai/glm-5.1`,
`moonshot/kimi-k2.5` y
`google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`.
Cuando no se pasa ningún `--judge-model`, los jueces usan por defecto
`openai/gpt-5.5,thinking=xhigh,fast` y
`anthropic/claude-opus-4-6,thinking=high`.

## Documentación relacionada

- [QA de Matrix](/es/concepts/qa-matrix)
- [Canal de QA](/es/channels/qa-channel)
- [Pruebas](/es/help/testing)
- [Panel de control](/es/web/dashboard)
