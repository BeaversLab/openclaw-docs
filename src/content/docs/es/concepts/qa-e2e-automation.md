---
summary: "Resumen de la pila de QA: qa-lab, qa-channel, escenarios respaldados por repositorio, carriles de transporte en vivo, adaptadores de transporte e informes."
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

- `extensions/qa-channel`: canal de mensajes sintético con superficies de MD, canal, hilo,
  reacción, edición y eliminación.
- `extensions/qa-lab`: interfaz de usuario del depurador y bus de QA para observar la transcripción,
  inyectar mensajes entrantes y exportar un informe en Markdown.
- `extensions/qa-matrix`, complementos de ejecutor futuros: adaptadores de transporte en vivo que
  impulsan un canal real dentro de una puerta de enlace de QA secundaria.
- `qa/`: activos semilla respaldados por repositorio para la tarea de inicio y escenarios
  de QA de referencia.
- [Mantis](/es/concepts/mantis): verificación antes y después en vivo para errores que
  necesitan transportes reales, capturas de pantalla del navegador, estado de la VM y evidencia de PR.

## Superficie de comandos

Cada flujo de QA se ejecuta bajo `pnpm openclaw qa <subcommand>`. Muchos tienen `pnpm qa:*`
alias de script; se admiten ambas formas.

| Comando                                             | Propósito                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | Autocomprobación de QA incluida; escribe un informe en Markdown.                                                                                                                                                                                                                                                                   |
| `qa suite`                                          | Ejecuta escenarios respaldados por repositorio contra el carril de la puerta de enlace de QA. Alias: `pnpm openclaw qa suite --runner multipass` para una VM Linux desechable.                                                                                                                                                     |
| `qa coverage`                                       | Imprime el inventario de cobertura de escenarios en markdown (`--json` para salida de máquina).                                                                                                                                                                                                                                    |
| `qa parity-report`                                  | Compara dos archivos `qa-suite-summary.json` y escribe el informe de paridad agéntica, o usa `--runtime-axis --token-efficiency` para escribir informes de paridad de tiempo de ejecución y eficiencia de tokens de Codex-vs-OpenClaw desde un resumen de par de tiempo de ejecución.                                              |
| `qa character-eval`                                 | Ejecuta el escenario de QA de personaje en múltiples modelos en vivo con un informe juzgado. Consulte [Informes](#reporting).                                                                                                                                                                                                      |
| `qa manual`                                         | Ejecuta un prompt único contra el carril de proveedor/modelo seleccionado.                                                                                                                                                                                                                                                         |
| `qa ui`                                             | Inicia la interfaz de usuario del depurador de QA y el bus de QA local (alias: `pnpm qa:lab:ui`).                                                                                                                                                                                                                                  |
| `qa docker-build-image`                             | Construye la imagen de Docker de QA preconfigurada.                                                                                                                                                                                                                                                                                |
| `qa docker-scaffold`                                | Escribe un andamio de docker-compose para el panel de QA + carril de puerta de enlace.                                                                                                                                                                                                                                             |
| `qa up`                                             | Construye el sitio de QA, inicia la pala basada en Docker, imprime la URL (alias: `pnpm qa:lab:up`; la variante `:fast` añade `--use-prebuilt-image --bind-ui-dist --skip-ui-build`).                                                                                                                                              |
| `qa aimock`                                         | Inicia solo el servidor del proveedor AIMock.                                                                                                                                                                                                                                                                                      |
| `qa mock-openai`                                    | Inicia solo el servidor proveedor `mock-openai` consciente de escenarios.                                                                                                                                                                                                                                                          |
| `qa credentials doctor` / `add` / `list` / `remove` | Gestiona el grupo compartido de credenciales de Convex.                                                                                                                                                                                                                                                                            |
| `qa matrix`                                         | Carril de transporte en vivo contra un servidor doméstico Tuwunel desechable. Consulte [Matrix QA](/es/concepts/qa-matrix).                                                                                                                                                                                                        |
| `qa telegram`                                       | Carril de transporte en vivo contra un grupo privado real de Telegram.                                                                                                                                                                                                                                                             |
| `qa discord`                                        | Carril de transporte en vivo contra un canal de guild (servidor) privado real de Discord.                                                                                                                                                                                                                                          |
| `qa slack`                                          | Carril de transporte en vivo contra un canal privado real de Slack.                                                                                                                                                                                                                                                                |
| `qa mantis`                                         | Ejecutor de verificación antes y después para errores de transporte en vivo, con evidencia de reacciones de estado de Discord, pruebas de humo de escritorio/navegador Crabbox y pruebas de humo Slack-en-VNC. Consulte [Mantis](/es/concepts/mantis) y [Mantis Slack Desktop Runbook](/es/concepts/mantis-slack-desktop-runbook). |

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

`qa:lab:up:fast` mantiene los servicios Docker en una imagen precompilada y monta `extensions/qa-lab/web/dist` en el contenedor `qa-lab`. `qa:lab:watch` reconstruye ese paquete cuando hay cambios y el navegador se recarga automáticamente cuando cambia el hash de recursos de QA Lab.

Para una prueba de humo local de señales de OpenTelemetry, ejecute:

```bash
pnpm qa:otel:smoke
```

Ese script inicia un receptor OTLP/HTTP local, ejecuta el escenario de QA `otel-trace-smoke` con el complemento `diagnostics-otel` habilitado y luego afirma que se exportan trazas, métricas y registros. Decodifica los intervalos de traza protobuf exportados y verifica la forma crítica para la versión: `openclaw.run`, `openclaw.harness.run`, un intervalo de llamada de modelo de convención semántica GenAI reciente, `openclaw.context.assembled`, y `openclaw.message.delivery` deben estar presentes. La prueba de humo fuerza `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`, por lo que el intervalo de llamada de modelo debe usar el nombre `{gen_ai.operation.name} {gen_ai.request.model}`; las llamadas al modelo no deben exportar `StreamAbandoned` en turnos exitosos; los IDs de diagnóstico brutos y los atributos `openclaw.content.*` deben mantenerse fuera de la traza. Las cargas útiles OTLP brutas no deben contener el centinela de solicitud, el centinela de respuesta o la clave de sesión de QA. Escribe `otel-smoke-summary.json` junto a los artefactos del conjunto de pruebas de QA.

Para ejecutar una prueba de humo de OpenTelemetry respaldada por recopilador, ejecute:

```bash
pnpm qa:otel:collector-smoke
```

Ese carril coloca un contenedor Docker real del recopilador OpenTelemetry frente al mismo receptor local. Úselo al cambiar la conexión de puntos finales, la compatibilidad del recopilador o el comportamiento de exportación OTLP que el receptor en proceso podría enmascarar.

Para la prueba de humo de extracción de Prometheus protegida, ejecute:

```bash
pnpm qa:prometheus:smoke
```

Ese alias ejecuta el escenario de QA `docker-prometheus-smoke` con `diagnostics-prometheus` habilitado, verifica que las extracciones no autenticadas sean rechazadas y luego comprueba que la extracción autenticada incluya familias de métricas críticas para la versión sin contenido de solicitud, contenido de respuesta, identificadores de diagnóstico brutos, tokens de autenticación o rutas locales.

Para ejecutar ambas pruebas de humo de observabilidad una tras otra, use:

```bash
pnpm qa:observability:smoke
```

Para el carril de OpenTelemetry respaldado por recopilador más la prueba de humo de extracción de Prometheus protegida, use:

```bash
pnpm qa:observability:collector-smoke
```

La QA de observabilidad permanece solo en la fuente de pago. El archivo tarball npm omite intencionalmente QA Lab, por lo que los carriles de lanzamiento de Docker del paquete no ejecutan comandos `qa`. Use `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke` o `pnpm qa:observability:smoke` desde una fuente de pago compilada al cambiar la instrumentación de diagnóstico.

Para un carril de prueba de humo Matrix real de transporte, ejecute:

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

La referencia completa de la CLI, el catálogo de perfiles/escenarios, las variables de entorno y el diseño de artefactos para este carril se encuentran en [Matrix QA](/es/concepts/qa-matrix). En resumen: aprovisiona un homeserver Tuwunel desechable en Docker, registra usuarios temporales de controlador/SUT/observador, ejecuta el complemento Matrix real dentro de una puerta de enlace de QA secundaria con alcance a ese transporte (sin `qa-channel`), y luego escribe un informe Markdown, un resumen JSON, un artefacto de eventos observados y un registro de salida combinado bajo `.artifacts/qa-e2e/matrix-<timestamp>/`.

Los escenarios cubren el comportamiento del transporte que las pruebas unitarias no pueden probar de extremo a extremo: filtrado de menciones, políticas de permitir bots, listas de permitidos, respuestas de nivel superior y en hilos, enrutamiento de MD, manejo de reacciones, supresión de ediciones entrantes, deduplicación de repetición de reinicio, recuperación de interrupción del homeserver, entrega de metadatos de aprobación, manejo de medios y flujos de arranque/recuperación/verificación de E2EE de Matrix. El perfil CLI de E2EE también impulsa `openclaw matrix encryption setup` y comandos de verificación a través del mismo homeserver desechable antes de verificar las respuestas de la puerta de enlace.

Discord también tiene escenarios opcionales exclusivos de Mantis para la reproducción de errores. Use
`--scenario discord-status-reactions-tool-only` para la línea de tiempo de reacción de estado explícita,
o `--scenario discord-thread-reply-filepath-attachment` para crear un
hilo real de Discord y verificar que `message.thread-reply` preserve un
archivo adjunto `filePath`. Estos escenarios se mantienen fuera del carril de Discord en vivo predeterminado
porque son sondas de repro antes/después en lugar de una cobertura de humo amplia.
El flujo de trabajo Mantis de hilo-archivo adjunto también puede agregar un video testigo web de Discord
con sesión iniciada cuando `MANTIS_DISCORD_VIEWER_CHROME_PROFILE_DIR` o
`MANTIS_DISCORD_VIEWER_CHROME_PROFILE_TGZ_B64` están configurados en el entorno
de QA. Ese perfil de visor es solo para captura visual; la decisión de aprobado/reprobado
aún proviene del oráculo REST de Discord.

La CI usa la misma superficie de comando en `.github/workflows/qa-live-transports-convex.yml`. Las ejecuciones programadas y manuales predeterminadas ejecutan el perfil rápido de Matrix con credenciales de frontera en vivo, `--fast`, y `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS=3000`. El manual `matrix_profile=all` se distribuye en los cinco fragmentos de perfil para que el catálogo exhaustivo pueda ejecutarse en paralelo mientras se mantiene un directorio de artefactos por fragmento.

Para los carriles de pruebas de humeo (smoke lanes) de Telegram, Discord y Slack con transporte real:

```bash
pnpm openclaw qa telegram
pnpm openclaw qa discord
pnpm openclaw qa slack
```

Ellos tienen como objetivo un canal real preexistente con dos bots (controlador + SUT). Las variables de entorno requeridas, listas de escenarios, artefactos de salida y el grupo de credenciales de Convex están documentados en [Referencia de QA de Telegram, Discord y Slack](#telegram-discord-and-slack-qa-reference) a continuación.

Para una ejecución completa de VM de escritorio de Slack con rescate VNC, ejecute:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --gateway-setup \
  --scenario slack-canary \
  --keep-lease
```

Ese comando arrienda una máquina de escritorio/navegador Crabbox, ejecuta el carril activo de Slack dentro de la VM, abre Slack Web en el navegador VNC, captura el escritorio y copia `slack-qa/`, `slack-desktop-smoke.png`, y `slack-desktop-smoke.mp4` cuando la captura de video esté disponible de vuelta al directorio de artefactos de Mantis. Los arriendos de escritorio/navegador de Crabbox proporcionan las herramientas de captura y los paquetes auxiliares de navegador/compilación nativa por adelantado, por lo que el escenario solo debe instalar alternativas en arriendos antiguos. Mantis informa los tiempos totales y por fase en `mantis-slack-desktop-smoke-report.md` para que las ejecuciones lentas muestren si el tiempo se destinó al calentamiento del arriendo, adquisición de credenciales, configuración remota o copia de artefactos. Reutilice `--lease-id <cbx_...>` después de iniciar sesión manualmente en Slack Web a través de VNC; los arriendos reutilizados también mantienen el caché de la tienda pnpm de Crabbox caliente. El `--hydrate-mode source` predeterminado verifica desde una extracción de origen y ejecuta install/build dentro de la VM. Use `--hydrate-mode prehydrated` solo cuando el espacio de trabajo remoto reutilizado ya tenga `node_modules` y un `dist/` compilado; ese modo omite el costoso paso de install/build y falla de forma cerrada cuando el espacio de trabajo no está listo. Con `--gateway-setup`, Mantis deja un gateway de Slack OpenClaw persistente ejecutándose dentro de la VM en el puerto `38973`; sin él, el comando ejecuta el carril de QA de Slack normal de bot a bot y sale después de la captura de artefactos.

Para probar la interfaz de usuario de aprobación nativa de Slack con evidencia de escritorio, ejecute el modo de punto de control de aprobación de Mantis:

```bash
pnpm openclaw qa mantis slack-desktop-smoke \
  --approval-checkpoints \
  --credential-source convex \
  --credential-role maintainer
```

Este modo es mutuamente exclusivo con `--gateway-setup`. Ejecuta los escenarios de aprobación de Slack, rechaza los ids de escenarios que no sean de aprobación, espera en cada estado de aprobación pendiente y resuelto, renderiza el mensaje observado de la API de Slack en `approval-checkpoints/<scenario>-pending.png` y `approval-checkpoints/<scenario>-resolved.png`, y luego falla si falta o está vacío algún punto de control, evidencia de mensaje, reconocimiento o captura de pantalla renderizada. Los arrendamientos de CI frío aún pueden mostrar el inicio de sesión de Slack en `slack-desktop-smoke.png`; las imágenes de los puntos de control de aprobación son la prueba visual para este carril.

La lista de verificación del operador, el comando de despacho del flujo de trabajo de GitHub, el contrato de comentario de evidencia, la tabla de decisiones del modo de hidratación, la interpretación del tiempo y los pasos de manejo de fallos se encuentran en [Mantis Slack Desktop Runbook](/es/concepts/mantis-slack-desktop-runbook).

Para una tarea de escritorio estilo agente/CV, ejecute:

```bash
pnpm openclaw qa mantis visual-task \
  --browser-url https://example.net \
  --expect-text "Example Domain" \
  --vision-model openai/gpt-5.5
```

`visual-task` arrienda o reutiliza una máquina de escritorio/navegador Crabbox, inicia `crabbox record --while`, conduce el navegador visible a través de un `visual-driver` anidado, captura `visual-task.png`, ejecuta `openclaw infer image describe` contra la captura de pantalla cuando se selecciona `--vision-mode image-describe`, y escribe `visual-task.mp4`, `mantis-visual-task-summary.json`, `mantis-visual-task-driver-result.json` y `mantis-visual-task-report.md`. Cuando se establece `--expect-text`, el prompt de visión solicita un veredicto JSON estructurado y solo pasa cuando el modelo reporta evidencia visible positiva; una respuesta negativa que simplemente cita el texto objetivo falla la aserción. Use `--vision-mode metadata` para una prueba de humo sin modelo que demuestra la infraestructura de escritorio, navegador, captura de pantalla y video sin llamar a un proveedor de comprensión de imágenes. La grabación es un artefacto requerido para `visual-task`; si Crabbox no graba ningún `visual-task.mp4` no vacío, la tarea falla incluso cuando el controlador visual pasó. Ante un fallo, Mantis mantiene el arrendamiento para VNC a menos que la tarea ya hubiera pasado y `--keep-lease` no se hubiera establecido.

Antes de usar credenciales en vivo agrupadas, ejecute:

```bash
pnpm openclaw qa credentials doctor
```

El médico comprueba el entorno del broker de Convex, valida la configuración de los puntos de conexión y verifica la accesibilidad de admin/list cuando el secreto del mantenedor está presente. Reporta solo el estado establecido/faltante para los secretos.

## Cobertura de transporte en vivo

Los carriles de transporte en vivo comparten un contrato en lugar de que cada uno invente su propia forma de lista de escenarios. `qa-channel` es el amplio conjunto de comportamiento sintético del producto y no es parte de la matriz de cobertura de transporte en vivo.

| Carril   | Canary | Control de mención | Bot a bot | Bloqueo de lista blanca | Respuesta de nivel superior | Reanudación tras reinicio | Seguimiento de hilo | Aislamiento de hilo | Observación de reacción | Comando de ayuda | Registro de comandos nativos |
| -------- | ------ | ------------------ | --------- | ----------------------- | --------------------------- | ------------------------- | ------------------- | ------------------- | ----------------------- | ---------------- | ---------------------------- |
| Matriz   | x      | x                  | x         | x                       | x                           | x                         | x                   | x                   | x                       |                  |                              |
| Telegram | x      | x                  | x         |                         |                             |                           |                     |                     |                         | x                |                              |
| Discord  | x      | x                  | x         |                         |                             |                           |                     |                     |                         |                  | x                            |
| Slack    | x      | x                  | x         | x                       | x                           | x                         | x                   | x                   |                         |                  |                              |

Esto mantiene `qa-channel` como el conjunto de comportamiento del producto amplio mientras que Matrix,
Telegram y futuros transportes en vivo comparten una lista de verificación
explícita de contrato de transporte.

Para un carril de VM Linux desechable sin traer Docker a la ruta de QA, ejecute:

```bash
pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline
```

Esto inicia un nuevo huésped Multipass, instala las dependencias, construye OpenClaw
dentro del huésped, ejecuta `qa suite` y luego copia el informe de QA normal y
el resumen de vuelta a `.artifacts/qa-e2e/...` en el host.
Reutiliza el mismo comportamiento de selección de escenarios que `qa suite` en el host.
Las ejecuciones de suites en el host y en Multipass ejecutan múltiples escenarios seleccionados en paralelo
con trabajadores de gateway aislados de forma predeterminada. `qa-channel` tiene una concurrencia predeterminada
de 4, limitada por la cantidad de escenarios seleccionados. Use `--concurrency <count>` para ajustar
la cantidad de trabajadores, o `--concurrency 1` para una ejecución en serie.
Use `--pack personal-agent` para ejecutar el paquete de referencia del asistente personal. El
selector de paquetes es aditivo con marcas `--scenario` repetidas: los escenarios
explícitos se ejecutan primero, luego los escenarios del paquete se ejecutan en orden de paquete con los duplicados eliminados.
Use `--pack observability` cuando un ejecutor de QA personalizado ya proporcione la
configuración del recolector OpenTelemetry y desee que los escenarios de diagnóstico de
humo de OpenTelemetry y Prometheus se seleccionen juntos.
El comando sale con un valor distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando
desea artefactos sin un código de salida con error.
Las ejecuciones en vivo reenvían las entradas de autenticación de QA compatibles que son prácticas para el
huésped: claves de proveedor basadas en env, la ruta de configuración del proveedor de QA en vivo y
`CODEX_HOME` cuando esté presente. Mantenga `--output-dir` bajo la raíz del repositorio para que el huésped
pueda escribir de vuelta a través del espacio de trabajo montado.

## Referencia de QA para Telegram, Discord y Slack

Matrix tiene una [página dedicada](/es/concepts/qa-matrix) debido a su cantidad de escenarios y aprovisionamiento de servidor doméstico (homeserver) respaldado por Docker. Telegram, Discord y Slack son más pequeños: un puñado de escenarios cada uno, sin sistema de perfiles, contra canales reales preexistentes, por lo que su referencia vive aquí.

### Marcas de CLI compartidas

Estos carriles se registran a través de `extensions/qa-lab/src/live-transports/shared/live-transport-cli.ts` y aceptan las mismas marcas:

| Marca                                 | Predeterminado                                                  | Descripción                                                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--scenario <id>`                     | -                                                               | Ejecutar solo este escenario. Repetible.                                                                                                         |
| `--output-dir <path>`                 | `<repo>/.artifacts/qa-e2e/{telegram,discord,slack}-<timestamp>` | Donde se escriben los informes/resúmenes/mensajes observados y el registro de salida. Las rutas relativas se resuelven respecto a `--repo-root`. |
| `--repo-root <path>`                  | `process.cwd()`                                                 | Raíz del repositorio al invocar desde un cwd neutral.                                                                                            |
| `--sut-account <id>`                  | `sut`                                                           | ID de cuenta temporal dentro de la configuración de la puerta de enlace de QA.                                                                   |
| `--provider-mode <mode>`              | `live-frontier`                                                 | `mock-openai` o `live-frontier` (el `live-openai` heredado aún funciona).                                                                        |
| `--model <ref>` / `--alt-model <ref>` | valor predeterminado del proveedor                              | Referencias de modelo primario/alternativo.                                                                                                      |
| `--fast`                              | desactivado                                                     | Modo rápido del proveedor cuando sea compatible.                                                                                                 |
| `--credential-source <env\|convex>`   | `env`                                                           | Consulte [Grupo de credenciales de Convex](#convex-credential-pool).                                                                             |
| `--credential-role <maintainer\|ci>`  | `ci` en CI, `maintainer` en caso contrario                      | Rol utilizado cuando `--credential-source convex`.                                                                                               |

Cada carril sale con un valor distinto de cero en cualquier escenario fallido. `--allow-failures` escribe artefactos sin establecer un código de salida fallido.

### QA de Telegram

```bash
pnpm openclaw qa telegram
```

Apunta a un grupo privado real de Telegram con dos bots distintos (controlador + SUT). El bot SUT debe tener un nombre de usuario de Telegram; la observación de bot a bot funciona mejor cuando ambos bots tienen el **Modo de comunicación de bot a bot** activado en `@BotFather`.

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

El conjunto predeterminado implícito siempre cubre canary, control de menciones, respuestas de comandos nativos, direccionamiento de comandos y respuestas grupales de bot a bot. Los valores predeterminados de `mock-openai` también incluyen comprobaciones determinísticas de cadenas de respuesta y transmisión de mensajes finales. `telegram-current-session-status-tool` sigue siendo opcional porque solo es estable cuando se encierra en un hilo directamente después de canary, no después de respuestas de comandos nativos arbitrarios. Use `pnpm openclaw qa telegram --list-scenarios --provider-mode mock-openai` para imprimir la división actual predeterminada/opcional con referencias de regresión.

Artefactos de salida:

- `telegram-qa-report.md`
- `telegram-qa-summary.json` - incluye RTT por respuesta (envío del controlador → respuesta del SUT observada) comenzando con el canary.
- `telegram-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_TELEGRAM_CAPTURE_CONTENT=1`.

La comparación de RTT de paquetes utiliza el mismo contrato de credenciales de Telegram mientras mantiene
sus controles de muestra RTT en la ruta del arnés RTT:

```bash
pnpm rtt openclaw@beta \
  --credential-source convex \
  --credential-role maintainer \
  --samples 20 \
  --sample-timeout-ms 30000
```

Cuando se establece `--credential-source convex`, el contenedor Docker RTT arrienda una
credencial `kind: "telegram"`, exporta el entorno de grupo/controlador/bot SUT arrendado a la
ejecución del paquete instalado, envía latidos al arrendamiento y lo libera al apagar.
`--samples` y `--sample-timeout-ms` todavía alimentan
`OPENCLAW_NPM_TELEGRAM_WARM_SAMPLES` y
`OPENCLAW_NPM_TELEGRAM_SAMPLE_TIMEOUT_MS`, por lo que `result.json` sigue siendo comparable
entre ejecuciones RTT basadas en entorno y basadas en Convex.

### QA de Discord

```bash
pnpm openclaw qa discord
```

Apunta a un canal de gremio privado real de Discord con dos bots: un bot controlador controlado por el arnés y un bot SUT iniciado por la puerta de enlace secundaria de OpenClaw a través del complemento Discord incluido. Verifica el manejo de menciones en el canal, que el bot SUT ha registrado el comando nativo `/help` con Discord y escenarios de evidencia Mantis opcionales.

Entorno requerido cuando `--credential-source env`:

- `OPENCLAW_QA_DISCORD_GUILD_ID`
- `OPENCLAW_QA_DISCORD_CHANNEL_ID`
- `OPENCLAW_QA_DISCORD_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_BOT_TOKEN`
- `OPENCLAW_QA_DISCORD_SUT_APPLICATION_ID` - debe coincidir con el id de usuario del bot SUT devuelto por Discord (de lo contrario, el carril falla rápido).

Opcional:

- `OPENCLAW_QA_DISCORD_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.
- `OPENCLAW_QA_DISCORD_VOICE_CHANNEL_ID` selecciona el canal de voz/escenario para `discord-voice-autojoin`; sin él, el escenario elige el primer canal de voz/escenario visible para el bot SUT.

Escenarios (`extensions/qa-lab/src/live-transports/discord/discord-live.runtime.ts:36`):

- `discord-canary`
- `discord-mention-gating`
- `discord-native-help-command-registration`
- `discord-voice-autojoin` - escenario de voz opcional. Se ejecuta solo, habilita `channels.discord.voice.autoJoin` y verifica que el estado de voz actual del bot SUT sea el canal de voz/escenario objetivo. Las credenciales de Convex Discord pueden incluir `voiceChannelId` opcional; de lo contrario, el ejecutor descubre el primer canal de voz/escenario visible en el gremio.
- `discord-status-reactions-tool-only` - escenario de Mantis opcional. Se ejecuta solo porque cambia el SUT a respuestas de gremio siempre activas y solo de herramientas con `messages.statusReactions.enabled=true`, luego captura una línea de tiempo de reacciones REST más artefactos visuales HTML/PNG. Los informes antes/después de Mantis también conservan los artefactos MP4 proporcionados por el escenario como `baseline.mp4` y `candidate.mp4`.

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
  --model openai/gpt-5.5 \
  --alt-model openai/gpt-5.5 \
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

Apunta a un canal privado real de Slack con dos bots distintos: un bot controlador controlado por el arnés y un bot SUT iniciado por la puerta de enlace secundaria OpenClaw a través del complemento Slack incluido.

Entorno requerido cuando `--credential-source env`:

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

Opcional:

- `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` habilita puntos de control
  de aprobación visual para Mantis. El ejecutor escribe `<scenario>.pending.json` y
  `<scenario>.resolved.json`, y luego espera los archivos `.ack.json` coincidentes.
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` anula el tiempo de espera
  de reconocimiento del punto de control. El valor predeterminado es `120000`.

Escenarios (`extensions/qa-lab/src/live-transports/slack/slack-live.runtime.ts`):

- `slack-canary`
- `slack-mention-gating`
- `slack-allowlist-block`
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-thread-follow-up`
- `slack-thread-isolation`
- `slack-approval-exec-native` - escenario de aprobación de ejecución nativa de Slack opcional.
  Solicita una aprobación de ejecución a través de la puerta de enlace, verifica que el mensaje de Slack tenga
  botones de aprobación nativos, lo resuelve y verifica la actualización de Slack resuelta.
- `slack-approval-plugin-native` - escenario de aprobación de complemento nativo de Slack opcional.
  Habilita el reenvío de aprobaciones de ejecución y complemento juntos para que los eventos del complemento no sean
  suprimidos por el enrutamiento de aprobación de ejecución, y luego verifica la misma ruta de interfaz de usuario nativa de Slack pendiente/resuelta.

Artefactos de salida:

- `slack-qa-report.md`
- `slack-qa-summary.json`
- `slack-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_SLACK_CAPTURE_CONTENT=1`.
- `approval-checkpoints/` - solo cuando Mantis establece
  `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR`; contiene el JSON del punto de control,
  el JSON de reconocimiento y las capturas de pantalla pendientes/resueltas.

#### Configuración del espacio de trabajo de Slack

El carril necesita dos aplicaciones de Slack distintas en un mismo espacio de trabajo, además de un canal del que ambos bots sean miembros:

- `channelId` - el id de `Cxxxxxxxxxx` de un canal al que se hayan invitado ambos bots. Utilice un canal dedicado; el carril publica en cada ejecución.
- `driverBotToken` - token de bot (`xoxb-...`) de la aplicación **Driver**.
- `sutBotToken` - token de bot (`xoxb-...`) de la aplicación **SUT**, que debe ser una aplicación de Slack separada del controlador para que su id de usuario de bot sea distinto.
- `sutAppToken`: token de nivel de aplicación (`xapp-...`) de la aplicación SUT con `connections:write`, utilizado por Socket Mode para que la aplicación SUT pueda recibir eventos.

Se prefiere un espacio de trabajo de Slack dedicado a QA antes que reutilizar un espacio de trabajo de producción.

El manifiesto SUT a continuación reduce intencionalmente la instalación de producción del complemento Slack incluido (`extensions/slack/src/setup-shared.ts:10`) a los permisos y eventos cubiertos por la suite de QA en vivo de Slack. Para la configuración del canal de producción como la ven los usuarios, consulte [Configuración rápida del canal de Slack](/es/channels/slack#quick-setup); el par QA Driver/SUT está intencionalmente separado porque el carril necesita dos identificadores de usuario de bot distintos en un solo espacio de trabajo.

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

Copie el _Bot User OAuth Token_ (`xoxb-...`): ese se convierte en `driverBotToken`. El controlador solo necesita publicar mensajes e identificarse; sin eventos, sin Socket Mode.

**2. Crear la aplicación SUT**

Repita _Create New App → From a manifest_ en el mismo espacio de trabajo. Esta aplicación de QA usa intencionalmente una versión más reducida del manifiesto de producción del complemento Slack incluido (`extensions/slack/src/setup-shared.ts:10`): los alcances y eventos de reacción se omiten porque la suite de QA en vivo de Slack aún no cubre el manejo de reacciones.

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

Una vez que Slack crea la aplicación, haga dos cosas en su página de configuración:

- _Install to Workspace_ → copie el _Bot User OAuth Token_ → ese se convierte en `sutBotToken`.
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → añada el alcance `connections:write` → guarde → copie el valor `xapp-...` → ese se convierte en `sutAppToken`.

Verifique que los dos bots tengan identificadores de usuario distintos llamando a `auth.test` en cada token. El tiempo de ejecución distingue el controlador y el SUT por el identificador de usuario; reutilizar una aplicación para ambos fallará inmediatamente el filtrado de menciones.

**3. Crear el canal**

En el espacio de trabajo de QA, cree un canal (p. ej., `#openclaw-qa`) e invite a ambos bots desde dentro del canal:

```
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

Copia el id `Cxxxxxxxxxx` de _información del canal → Acerca de → ID del canal_ - ese se convierte en `channelId`. Un canal público funciona; si usas un canal privado, ambas aplicaciones ya tienen `groups:history` por lo que las lecturas del historial del arnés seguirán teniendo éxito.

**4. Registra las credenciales**

Dos opciones. Usa variables de entorno para la depuración en una sola máquina (configura las cuatro variables `OPENCLAW_QA_SLACK_*` y pasa `--credential-source env`), o inicializa el grupo compartido de Convex para que CI y otros mantenedores puedan arrendarlas.

Para el grupo de Convex, escribe los cuatro campos en un archivo JSON:

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

Con `OPENCLAW_QA_CONVEX_SITE_URL` y `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` exportados en tu shell, registra y verifica:

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

Espera `count: 1`, `status: "active"`, ningún campo `lease`.

**5. Verificar de extremo a extremo**

Ejecuta el carril localmente para confirmar que ambos bots pueden hablarse entre sí a través del intermediario:

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

Una ejecución exitosa se completa en bien menos de 30 segundos y `slack-qa-report.md` muestra tanto `slack-canary` como `slack-mention-gating` en el estado `pass`. Si el carril se bloquea por ~90 segundos y sale con `Convex credential pool exhausted for kind "slack"`, o bien el grupo está vacío o todas las filas están arrendadas: `qa credentials list --kind slack --status all --json` te dirá cuál es el caso.

### QA de WhatsApp

```bash
pnpm openclaw qa whatsapp
```

Apunta a dos cuentas dedicadas de WhatsApp Web: una cuenta de controlador controlada por el arnés y una cuenta SUT iniciada por la puerta de enlace secundaria de OpenClaw a través del complemento de WhatsApp incluido.

Entorno requerido cuando `--credential-source env`:

- `OPENCLAW_QA_WHATSAPP_DRIVER_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_SUT_PHONE_E164`
- `OPENCLAW_QA_WHATSAPP_DRIVER_AUTH_ARCHIVE_BASE64`
- `OPENCLAW_QA_WHATSAPP_SUT_AUTH_ARCHIVE_BASE64`

Opcional:

- `OPENCLAW_QA_WHATSAPP_GROUP_JID` habilita `whatsapp-mention-gating`.
- `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1` mantiene los cuerpos de los mensajes en los artefactos de mensajes observados.

Escenarios (`extensions/qa-lab/src/live-transports/whatsapp/whatsapp-live.runtime.ts`):

- `whatsapp-canary`
- `whatsapp-pairing-block`
- `whatsapp-mention-gating`
- `whatsapp-approval-exec-native` - escenario de aprobación de ejecutivo nativo de WhatsApp opcional. Solicita una aprobación de ejecutivo a través de la puerta de enlace, verifica que el mensaje de WhatsApp tenga capacidades de aprobación de reacción nativa, la resuelve y verifica el seguimiento de WhatsApp resuelto.
- `whatsapp-approval-plugin-native` - escenario de aprobación de complemento nativo de WhatsApp opcional. Habilita el reenvío de aprobaciones de ejecutivos y complementos juntos, luego verifica la misma ruta de WhatsApp nativa pendiente/resuelta.

Artefactos de salida:

- `whatsapp-qa-report.md`
- `whatsapp-qa-summary.json`
- `whatsapp-qa-observed-messages.json` - cuerpos redactados a menos que `OPENCLAW_QA_WHATSAPP_CAPTURE_CONTENT=1`.

### Grupo de credenciales de Convex

Los carriles de Telegram, Discord, Slack y WhatsApp pueden arrendar credenciales de un grupo compartido de Convex en lugar de leer las variables de entorno anteriores. Pase `--credential-source convex` (o configure `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`); QA Lab adquiere un arrendamiento exclusivo, envía latidos durante la duración de la ejecución y lo libera al apagarse. Los tipos de grupos son `"telegram"`, `"discord"`, `"slack"` y `"whatsapp"`.

Formas de carga útil que el corredor valida en `admin/add`:

- Telegram (`kind: "telegram"`): `{ groupId: string, driverToken: string, sutToken: string }` - `groupId` debe ser una cadena de ID de chat numérica.
- Usuario real de Telegram (`kind: "telegram-user"`): `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }` - Solo prueba de Mantis Telegram Desktop. Los carriles genéricos de QA Lab no deben adquirir este tipo.
- Discord (`kind: "discord"`): `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string }`.
- WhatsApp (`kind: "whatsapp"`): `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }` - los números de teléfono deben ser cadenas E.164 distintas.

El flujo de trabajo de prueba de Mantis Telegram Desktop mantiene un arrendamiento exclusivo de `telegram-user` de Convex tanto para el controlador CLI de TDLib como para el testigo de Telegram Desktop, y luego lo libera después de publicar la prueba.

Cuando un PR necesita un diff visual determinista, Mantis puede usar la misma respuesta de modelo simulado en `main` y en el head del PR mientras cambia el formateador de Telegram o la capa de entrega. Los valores predeterminados de captura están ajustados para los comentarios del PR: clase Crabbox estándar, grabación de escritorio a 24 fps, GIF de movimiento a 24 fps y ancho de vista previa de 1920 px. Los comentarios antes/después deben publicar un paquete limpio que contenga solo los GIF previstos.

Los carriles de Slack también pueden usar el grupo. Las comprobaciones de forma de payload de Slack actualmente residen en el ejecutor de QA de Slack en lugar de en el broker; use `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`, con un ID de canal de Slack como `Cxxxxxxxxxx`. Consulte [Configuración del espacio de trabajo de Slack](#setting-up-the-slack-workspace) para el aprovisionamiento de aplicaciones y alcances.

Las variables de entorno operativas y el contrato del endpoint del broker de Convex residen en [Pruebas → Credenciales compartidas de Telegram a través de Convex](/es/help/testing#shared-telegram-credentials-via-convex-v1) (el nombre de la sección es anterior al grupo multicanal; la semántica de arrendamiento se comparte entre tipos).

## Semillas respaldadas por repositorio

Los activos de semillas residen en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/<theme>/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el agente.

`qa-lab` debe mantenerse como un ejecutor de markdown genérico. Cada archivo de escenario de markdown es la fuente de verdad para una ejecución de prueba y debe definir:

- metadatos del escenario
- metadatos opcionales de categoría, capacidad, carril y riesgo
- refs de documentos y código
- requisitos opcionales de complementos
- parche de configuración opcional de puerta de enlace
- el `qa-flow` ejecutable

Se permite que la superficie de tiempo de ejecución reutilizable que respalda `qa-flow` se mantenga genérica y transversal. Por ejemplo, los escenarios de markdown pueden combinar ayudantes del lado del transporte con ayudantes del lado del navegador que impulsan la interfaz de usuario de Control integrada a través de la costura `browser.request` de la Gateway sin agregar un ejecutor de caso especial.

Los archivos de escenarios deben agruparse por capacidad del producto en lugar de por carpeta del árbol de origen. Mantenga los ID de escenario estables cuando se muevan los archivos; use `docsRefs` y `codeRefs` para la trazabilidad de implementación.

La lista de referencia debe mantenerse lo suficientemente amplia para cubrir:

- chat de DM y canal
- comportamiento de hilo
- ciclo de vida de la acción del mensaje
- devoluciones de llamada de cron
- recuerdo de memoria
- cambio de modelo
- transferencia a subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Carriles simulados de proveedor

`qa suite` tiene dos carriles simulados de proveedor locales:

- `mock-openai` es el simulacro OpenClaw consciente de escenarios. Permanece como el carril simulado determinista predeterminado para QA respaldado por repositorio y puertas de paridad.
- `aimock` inicia un servidor de proveedor respaldado por AIMock para protocolos experimentales, accesorios, cobertura de grabación/reproducción y caos. Es aditivo y no reemplaza al despachador de escenarios `mock-openai`.

La implementación del carril del proveedor se encuentra bajo `extensions/qa-lab/src/providers/`. Cada proveedor posee sus valores predeterminados, el inicio del servidor local, la configuración del modelo de puerta de enlace, las necesidades de almacenamiento de perfil de autenticación y los indicadores de capacidad en vivo/simulada. El código compartido de la suite y la puerta de enlace debe enrutar a través del registro del proveedor en lugar de bifurcarse en los nombres de los proveedores.

## Adaptadores de transporte

`qa-lab` posee una costura de transporte genérica para escenarios de QA en markdown. `qa-channel` es el primer adaptador en esa costura, pero el objetivo de diseño es más amplio: los canales reales o sintéticos futuros deben conectarse al mismo ejecutor de suite en lugar de agregar un ejecutor de QA específico del transporte.

A nivel de arquitectura, la división es:

- `qa-lab` posee la ejecución genérica de escenarios, la concurrencia de trabajadores, la escritura de artefactos y los informes.
- El adaptador de transporte posee la configuración de la puerta de enlace, la disponibilidad, la observación de entrada y salida, las acciones de transporte y el estado de transporte normalizado.
- Los archivos de escenarios de markdown bajo `qa/scenarios/` definen la ejecución de la prueba; `qa-lab` proporciona la superficie de tiempo de ejecución reutilizable que los ejecuta.

### Agregar un canal

Agregar un canal al sistema de QA de markdown requiere exactamente dos cosas:

1. Un adaptador de transporte para el canal.
2. Un paquete de escenarios que ejercite el contrato del canal.

No agregue una nueva raíz de comando QA de nivel superior cuando el host compartido `qa-lab` pueda poseer el flujo.

`qa-lab` posee la mecánica del host compartido:

- la raíz del comando `openclaw qa`
- inicio y desmontaje de la suite
- concurrencia de trabajadores
- escritura de artefactos
- generación de informes
- ejecución del escenario
- alias de compatibilidad para escenarios `qa-channel` antiguos

Los complementos del ejecutor son los propietarios del contrato de transporte:

- cómo se monta `openclaw qa <runner>` debajo de la raíz `qa` compartida
- cómo se configura la puerta de enlace para ese transporte
- cómo se comprueba la preparación
- cómo se inyectan los eventos entrantes
- cómo se observan los mensajes salientes
- cómo se exponen las transcripciones y el estado normalizado del transporte
- cómo se ejecutan las acciones respaldadas por el transporte
- cómo se maneja el restablecimiento o limpieza específica del transporte

El requisito mínimo de adopción para un canal nuevo:

1. Mantener `qa-lab` como propietario de la raíz `qa` compartida.
2. Implementar el ejecutor de transporte en la costura del host `qa-lab` compartida.
3. Mantener los mecánicos específicos del transporte dentro del complemento del ejecutor o del arnés del canal.
4. Montar el ejecutor como `openclaw qa <runner>` en lugar de registrar un comando raíz competidor. Los complementos del ejecutor deben declarar `qaRunners` en `openclaw.plugin.json` y exportar una matriz `qaRunnerCliRegistrations` coincidente desde `runtime-api.ts`. Mantener `runtime-api.ts` ligero; la ejecución diferida de la CLI y del ejecutor debe permanecer detrás de puntos de entrada separados.
5. Crear o adaptar escenarios en markdown en los directorios `qa/scenarios/` temáticos.
6. Usar los ayudantes genéricos de escenarios para escenarios nuevos.
7. Mantener los alias de compatibilidad existentes funcionando a menos que el repositorio esté realizando una migración intencional.

La regla de decisión es estricta:

- Si el comportamiento se puede expresar una vez en `qa-lab`, colóquelo en `qa-lab`.
- Si el comportamiento depende de un transporte de canal, manténgalo en ese complemento del ejecutor o arnés del complemento.
- Si un escenario necesita una nueva capacidad que más de un canal pueda usar, agregue un ayudante genérico en lugar de una rama específica del canal en `suite.ts`.
- Si un comportamiento solo es significativo para un transporte, mantenga el escenario específico del transporte y hágalo explícito en el contrato del escenario.

### Nombres de ayudantes de escenario

Ayudantes genéricos preferidos para escenarios nuevos:

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

Los alias de compatibilidad siguen disponibles para los escenarios existentes: `waitForQaChannelReady`, `waitForOutboundMessage`, `waitForNoOutbound`, `formatConversationTranscript`, `resetBus`, pero la creación de nuevos escenarios debe usar los nombres genéricos. Los alias existen para evitar una migración abrupta, no como el modelo a seguir.

## Informes

`qa-lab` exporta un informe de protocolo Markdown a partir de la línea de tiempo observada del bus.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué permaneció bloqueado
- Qué escenarios de seguimiento vale la pena agregar

Para obtener el inventario de escenarios disponibles, útil al dimensionar el trabajo de seguimiento o al conectar un nuevo transporte, ejecute `pnpm openclaw qa coverage` (agregue `--json` para una salida legible por máquina).
Al elegir una prueba enfocada para un comportamiento o ruta de archivo modificada, ejecute `pnpm openclaw qa coverage --match <query>`.
El informe de coincidencias busca metadatos de escenarios, referencias de documentación, referencias de código, ID de cobertura, complementos y requisitos del proveedor, y luego imprime los objetivos `qa suite --scenario ...` coincidentes.
Trátelo como una ayuda de descubrimiento, no como un reemplazo de puerta; el escenario seleccionado aún necesita el modo de proveedor correcto, transporte en vivo, Multipass, Testbox o canal de lanzamiento para el comportamiento bajo prueba.

Para verificar el carácter y el estilo, ejecute el mismo escenario en múltiples referencias de modelo en vivo
y escriba un informe Markdown evaluado:

```bash
pnpm openclaw qa character-eval \
  --model openai/gpt-5.5,thinking=medium,fast \
  --model openai/gpt-5.2,thinking=xhigh \
  --model openai/gpt-5,thinking=xhigh \
  --model anthropic/claude-opus-4-8,thinking=high \
  --model anthropic/claude-sonnet-4-6,thinking=high \
  --model zai/glm-5.1,thinking=high \
  --model moonshot/kimi-k2.5,thinking=high \
  --model google/gemini-3.1-pro-preview,thinking=high \
  --judge-model openai/gpt-5.5,thinking=xhigh,fast \
  --judge-model anthropic/claude-opus-4-8,thinking=high \
  --blind-judge-models \
  --concurrency 16 \
  --judge-concurrency 16
```

El comando ejecuta procesos secundarios de la puerta de enlace de QA local, no Docker. Los escenarios de evaluación de personajes deben establecer el personaje a través de `SOUL.md`, y luego ejecutar turnos de usuario ordinarios como chat, ayuda del espacio de trabajo y pequeñas tareas de archivos. No se debe informar al modelo candidato que está siendo evaluado. El comando conserva cada transcripción completa, registra estadísticas básicas de ejecución, y luego solicita a los modelos jueces en modo rápido con razonamiento `xhigh` donde sea compatible para clasificar las ejecuciones por naturalidad, ambiente y humor. Use `--blind-judge-models` al comparar proveedores: el mensaje del juez aún recibe cada transcripción y estado de ejecución, pero las referencias de los candidatos se reemplazan por etiquetas neutrales como `candidate-01`; el informe asigna las clasificaciones a las referencias reales después del análisis.
Las ejecuciones de candidatos por defecto usan pensamiento `high`, con `medium` para GPT-5.5 y `xhigh` para referencias de evaluación más antiguas de OpenAI que lo admitan. Anule un candidato específico en línea con `--model provider/model,thinking=<level>`. `--thinking <level>` todavía establece un respaldo global, y la forma más antigua `--model-thinking <provider/model=level>` se mantiene por compatibilidad.
Las referencias de candidatos de OpenAI por defecto usan el modo rápido, por lo que se utiliza el procesamiento de prioridad donde el proveedor lo admita. Agregue `,fast`, `,no-fast`, o `,fast=false` en línea cuando un solo candidato o juez necesite una anulación. Pase `--fast` solo cuando desee forzar el modo rápido para cada modelo candidato. Las duraciones de los candidatos y jueces se registran en el informe para el análisis comparativo, pero los mensajes de los jueces indican explícitamente no clasificar por velocidad.
Las ejecuciones de modelos de candidatos y jueces por defecto tienen una concurrencia de 16. Reduzca `--concurrency` o `--judge-concurrency` cuando los límites del proveedor o la presión de la puerta de enlace local hagan que una ejecución sea demasiado ruidosa.
Cuando no se pasa ningún candidato `--model`, la evaluación de personajes por defecto es `openai/gpt-5.5`, `openai/gpt-5.2`, `openai/gpt-5`, `anthropic/claude-opus-4-8`, `anthropic/claude-sonnet-4-6`, `zai/glm-5.1`, `moonshot/kimi-k2.5` y `google/gemini-3.1-pro-preview` cuando no se pasa ningún `--model`.
Cuando no se pasa ningún `--judge-model`, los jueces por defecto son `openai/gpt-5.5,thinking=xhigh,fast` y `anthropic/claude-opus-4-8,thinking=high`.

## Documentación relacionada

- [QA de Matrix](/es/concepts/qa-matrix)
- [Paquete de referencia de agente personal](/es/concepts/personal-agent-benchmark-pack)
- [Canal de QA](/es/channels/qa-channel)
- [Pruebas](/es/help/testing)
- [Panel](/es/web/dashboard)
