---
summary: "Kit de pruebas: suites unitarias/e2e/live, ejecutores de Docker y qué cubre cada prueba"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Pruebas"
---

OpenClaw tiene tres suites de Vitest (unitaria/integración, e2e, en vivo) y un pequeño conjunto de ejecutores de Docker. Este documento es una guía de "cómo probamos":

- Qué cubre cada suite (y qué deliberadamente _no_ cubre).
- Qué comandos ejecutar para flujos de trabajo comunes (local, pre-push, depuración).
- Cómo las pruebas en vivo descubren las credenciales y seleccionan modelos/proveedores.
- Cómo agregar regresiones para problemas reales de modelos/proveedores.

<Note>
**El stack de QA (qa-lab, qa-channel, live transport lanes)** está documentado por separado:

- [Descripción general de QA](/es/concepts/qa-e2e-automation) - arquitectura, superficie de comandos, creación de escenarios.
- [Matrix QA](/es/concepts/qa-matrix) - referencia para `pnpm openclaw qa matrix`.
- [Canal QA](/es/channels/qa-channel) - el complemento de transporte sintético utilizado por escenarios respaldados por repositorios.

Esta página cubre la ejecución de las suites de pruebas regulares y los ejecutores de Docker/Parallels. La sección de ejecutores específicos de QA a continuación ([Ejecutores específicos de QA](#qa-specific-runners)) enumera las invocaciones concretas de `qa` y remite a las referencias anteriores.

</Note>

## Inicio rápido

La mayoría de los días:

- Puerta completa (esperado antes del push): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Ejecución local completa de suite más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de visualización directo de Vitest: `pnpm test:watch`
- La segmentación directa de archivos ahora también enruta rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones específicas primero cuando estás iterando en un solo fallo.
- Sitio de QA con respaldo de Docker: `pnpm qa:lab:up`
- Carril de QA con respaldo de VM Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando tocas pruebas o quieres mayor confianza:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite Live (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo live en silencio: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Informes de rendimiento en tiempo de ejecución: enviar `OpenClaw Performance` con
  `live_gpt54=true` para un turno de agente `openai/gpt-5.4` real o
  `deep_profile=true` para artefactos de CPU/heap/traza de Kova. Las ejecuciones programadas diarias
  publican artefactos de mock-provider, deep-profile y carriles GPT 5.4 en
  `openclaw/clawgrit-reports` cuando `CLAWGRIT_REPORTS_TOKEN` está configurado. El
  informe de mock-provider también incluye números de arranque del gateway, memoria,
  presión de complementos, bucle de hello-loop de modelo falso repetido y arranque de CLI a nivel de origen.
- Barrido de modelos live con Docker: `pnpm test:docker:live-models`
  - Cada modelo seleccionado ahora ejecuta un turno de texto más una pequeña prueba de estilo de lectura de archivo.
    Los modelos cuyos metadatos anuncian entrada `image` también ejecutan un pequeño turno de imagen.
    Desactive las pruebas adicionales con `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` o
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` cuando aisle fallos del proveedor.
  - Cobertura de CI: el `OpenClaw Scheduled Live And E2E Checks` diario y el
    `OpenClaw Release Checks` manual ambos llaman al flujo de trabajo reutilizable live/E2E con
    `include_live_suites: true`, que incluye trabajos matriciales separados de modelos vivos Docker fragmentados por proveedor.
  - Para reejecuciones de CI enfocadas, despache `OpenClaw Live And E2E Checks (Reusable)`
    con `include_live_suites: true` y `live_models_only: true`.
  - Agregue nuevos secretos de proveedor de alta señal a `scripts/ci-hydrate-live-auth.sh`
    más `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` y sus
    llamadores programados/de lanzamiento.
- Prueba de humo de chat vinculado nativo de Codex: `pnpm test:docker:live-codex-bind`
  - Ejecuta un carril vivo Docker contra la ruta del servidor de aplicaciones de Codex, vincula un
    DM sintético de Slack con `/codex bind`, ejercita `/codex fast` y
    `/codex permissions`, luego verifica una respuesta simple y un archivo adjunto de imagen
    que se enrutan a través del enlace del complemento nativo en lugar de ACP.
- Prueba de humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness`
  - Ejecuta turnos de agente de puerta de enlace a través del arnés del servidor de aplicaciones de Codex propiedad del complemento,
    verifica `/codex status` y `/codex models`, y por defecto ejercita pruebas de imagen,
    cron MCP, sub-agente y Guardian. Desactive la prueba de sub-agente con
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` cuando aisle otros fallos del
    servidor de aplicaciones de Codex. Para una verificación enfocada del sub-agente, desactive las otras pruebas:
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Esto sale después de la prueba del sub-agente a menos que
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` esté establecido.
- Prueba de humo de instalación bajo demanda de Codex: `pnpm test:docker:codex-on-demand`
  - Instala el paquete tarball de OpenClaw en Docker, ejecuta la incorporación
    de la clave API de OpenAI y verifica que el complemento Codex más la dependencia `@openai/codex`
    se descargaron bajo demanda en la raíz npm administrada.
- Prueba de humo de dependencia de herramienta de complemento en vivo: `pnpm test:docker:live-plugin-tool`
  - Empaqueta un plugin de prueba con una dependencia `slugify` real, lo instala a través de
    `npm-pack:`, verifica la dependencia bajo la raíz npm administrada y luego le pide a un
    modelo OpenAI en vivo que llame a la herramienta del plugin y devuelva el slug oculto.
- Prueba de humo del comando de rescate de Crestodian: `pnpm test:live:crestodian-rescue-channel`
  - Verificación de seguridad opcional (tipo cinturón y tirantes) para la superficie del
    comando de rescate del canal de mensajes. Ejecuta `/crestodian status`, pone en cola un cambio
    de modelo persistente, responde `/crestodian yes` y verifica la ruta de escritura de auditoría/configuración.
- Prueba de humo del planificador Docker de Crestodian: `pnpm test:docker:crestodian-planner`
  - Ejecuta Crestodian en un contenedor sin configuración con una CLI Claude falsa en `PATH`
    y verifica que el retorno alternativo del planificador difuso se traduzca en una escritura
    de configuración tipificada y auditada.
- Prueba de humo de la primera ejecución de Docker de Crestodian: `pnpm test:docker:crestodian-first-run`
  - Comienza desde un directorio de estado de OpenClaw vacío, enruta `openclaw` básico a
    Crestodian, aplica escrituras de configuración/modelo/agente/plugin de Discord + SecretRef,
    valida la configuración y verifica las entradas de auditoría. La misma ruta de configuración
    de Ring 0 también está cubierta en QA Lab por
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Prueba de humo de costos de Moonshot/Kimi: con `MOONSHOT_API_KEY` configurado, ejecute
  `openclaw models list --provider moonshot --json`, luego ejecute un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  aislado
  contra `moonshot/kimi-k2.6`. Verifique que el JSON informe Moonshot/K2.6 y que
  la transcripción del asistente almacene `usage.cost` normalizados.

<Tip>Cuando solo necesita un caso de fallo, prefiera restringir las pruebas en vivo a través de las variables de entorno de lista de permitidos que se describen a continuación.</Tip>

## Ejecutores específicos de QA

Estos comandos se encuentran junto a las suites de pruebas principales cuando necesita realismo de laboratorio de QA:

La CI ejecuta QA Lab en flujos de trabajo dedicados. La paridad agéntica está anidada bajo
`QA-Lab - All Lanes` y la validación de lanzamientos, no en un flujo de trabajo de PR independiente.
La validación amplia debería usar `Full Release Validation` con
`rerun_group=qa-parity` o el grupo QA de release-checks. Las comprobaciones de lanzamiento estables/predeterminadas
mantienen las pruebas exhaustivas de live/Docker detrás de `run_release_soak=true`; el
perfil `full` fuerza la activación de las pruebas. `QA-Lab - All Lanes`
se ejecuta cada noche en `main` y desde un despacho manual con el carril de paridad simulada, el carril live de
Matrix, el carril live de Telegram gestionado por Convex, y el carril live de Discord
gestionado por Convex como trabajos en paralelo. El QA programado y las comprobaciones de lanzamiento pasan el
`--profile fast` de Matrix explícitamente, mientras que la CLI de Matrix y la entrada del flujo de trabajo manual
permanecen por defecto en `all`; el despacho manual puede fragmentar `all` en `transport`,
`media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli` trabajos. `OpenClaw Release
Checks` ejecuta la paridad además de los carriles rápidos de Matrix y Telegram antes de la aprobación
del lanzamiento, usando `mock-openai/gpt-5.5` para las comprobaciones de transporte del lanzamiento para que permanezcan
deterministas y eviten el inicio normal del proveedor de complementos. Estas puertas de enlace de transporte live
deshabilitan la búsqueda de memoria; el comportamiento de la memoria permanece cubierto por las suites de paridad de QA.

Los fragmentos de medios live para un lanzamiento completo usan
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, que ya tiene
`ffmpeg` y `ffprobe`. Los fragmentos del modelo/backend live de Docker usan la imagen compartida
`ghcr.io/openclaw/openclaw-live-test:<sha>` construida una vez por commit
seleccionado, luego la descargan con `OPENCLAW_SKIP_DOCKER_BUILD=1` en lugar de reconstruirla
dentro de cada fragmento.

- `pnpm openclaw qa suite`
  - Ejecuta escenarios QA respaldados por el repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo por defecto con trabajadores
    de puerta de enlace aislados. `qa-channel` tiene una concurrencia predeterminada de 4 (limitada por la
    cantidad de escenarios seleccionados). Usa `--concurrency <count>` para ajustar el número
    de trabajadores, o `--concurrency 1` para el carril serie antiguo.
  - Sale con un código de estado distinto de cero cuando algún escenario falla. Use `--allow-failures` cuando desee artefactos sin un código de salida fallido.
  - Soporta los modos de proveedor `live-frontier`, `mock-openai` y `aimock`. `aimock` inicia un servidor de proveedor local respaldado por AIMock para cobertura experimental de fixtures y protocolos-mock sin reemplazar el carril `mock-openai` consciente del escenario.
- `pnpm test:plugins:kitchen-sink-live`
  - Ejecuta el gauntlet del complemento Kitchen Sink de OpenAI en vivo a través de QA Lab. Instala el paquete externo Kitchen Sink, verifica el inventario de superficie del SDK del complemento, sondea `/healthz` y `/readyz`, registra evidencia de CPU/RSS de la puerta de enlace, ejecuta un turno de OpenAI en vivo y verifica diagnósticos adversarios. Requiere autenticación de OpenAI en vivo, como `OPENAI_API_KEY`. En sesiones de Testbox hidratadas, obtiene automáticamente el perfil live-auth de Testbox cuando el asistente `openclaw-testbox-env` está presente.
- `pnpm test:gateway:cpu-scenarios`
  - Ejecuta el benchmark de inicio de la puerta de enlace más un pequeño paquete de escenarios simulados de QA Lab (`channel-chat-baseline`, `memory-failure-fallback`, `gateway-restart-inflight-run`) y escribe un resumen combinado de observaciones de CPU bajo `.artifacts/gateway-cpu-scenarios/`.
  - Marca solo observaciones sostenidas de CPU caliente por defecto (`--cpu-core-warn` más `--hot-wall-warn-ms`), por lo que los picos cortos de inicio se registran como métricas sin parecerse a la regresión de bloqueo de la puerta de enlace de varios minutos.
  - Utiliza artefactos `dist` compilados; ejecute primero una compilación cuando el checkout aún no tenga una salida de tiempo de ejecución fresca.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza los mismos indicadores de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación de QA admitidas que son prácticas para el invitado: claves de proveedor basadas en variables de entorno, la ruta de configuración del proveedor en vivo de QA y `CODEX_HOME` cuando está presente.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el invitado pueda escribir de vuelta a través del espacio de trabajo montado.
  - Escribe el informe y resumen normal de QA más los registros de Multipass bajo `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para trabajos de QA de estilo operador.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construye un tarball de npm desde el checkout actual, lo instala globalmente en Docker, ejecuta la incorporación no interactiva de la clave de API de OpenAI, configura Telegram por defecto, verifica que el tiempo de ejecución del plugin empaquetado se cargue sin reparación de dependencias de inicio, ejecuta doctor y ejecuta un turno de agente local contra un endpoint OpenAI simulado.
  - Use `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` para ejecutar el mismo carril de instalación empaquetada con Discord.
- `pnpm test:docker:session-runtime-context`
  - Ejecuta una prueba de humo determinista de Docker de aplicación compilada para transcripciones de contexto de tiempo de ejecución incrustado. Verifica que el contexto de tiempo de ejecución oculto de OpenClaw se mantenga como un mensaje personalizado no visible en lugar de filtrarse en el turno de usuario visible, luego siembra un JSONL de sesión rota afectada y verifica que `openclaw doctor --fix` lo reescriba a la rama activa con una copia de seguridad.
- `pnpm test:docker:npm-telegram-live`
  - Instala un candidato de paquete OpenClaw en Docker, ejecuta la incorporación del paquete instalado, configura Telegram a través de la CLI instalada y luego reutiliza el carril de QA en vivo de Telegram con ese paquete instalado como la puerta de enlace SUT.
  - El contenedor monta solo el código fuente del arnés `qa-lab` desde la extracción; el paquete instalado posee `dist`, `openclaw/plugin-sdk` y el tiempo de ejecución del complemento incluido, de modo que el carril no mezcle los complementos de la extracción actual en el paquete bajo prueba.
  - Por defecto es `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`; configure `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` o `OPENCLAW_CURRENT_PACKAGE_TGZ` para probar un archivo tar local resuelto en lugar de instalar desde el registro.
  - Usa las mismas credenciales de entorno de Telegram o la fuente de credenciales de Convex que `pnpm openclaw qa telegram`. Para la automatización de CI/lanzamiento, configure `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` más `OPENCLAW_QA_CONVEX_SITE_URL` y el secreto del rol. Si `OPENCLAW_QA_CONVEX_SITE_URL` y un secreto de rol de Convex están presentes en CI, el contenedor Docker selecciona Convex automáticamente.
  - El contenedor valida el entorno de credenciales de Telegram o Convex en el host antes del trabajo de construcción/instalación de Docker. Configure `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1` solo al depurar deliberadamente la configuración previa a las credenciales.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` anula el `OPENCLAW_QA_CREDENTIAL_ROLE` compartido solo para este carril.
  - GitHub Actions expone este carril como el flujo de trabajo manual de mantenedor `NPM Telegram Beta E2E`. No se ejecuta al fusionar. El flujo de trabajo usa el entorno `qa-live-shared` y los arrendamientos de credenciales de CI de Convex.
- GitHub Actions también expone `Package Acceptance` para la prueba de producto en paralelo contra un paquete candidato. Acepta una referencia confiable, especificación npm publicada, URL de tarball HTTPS más SHA-256, o artefacto tarball de otra ejecución, sube el `openclaw-current.tgz` normalizado como `package-under-test`, y luego ejecuta el planificador Docker E2E existente con perfiles de carril smoke, package, product, full o custom. Establezca `telegram_mode=mock-openai` o `live-frontier` para ejecutar el flujo de trabajo de QA de Telegram contra el mismo artefacto `package-under-test`.
  - Prueba de producto beta más reciente:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La prueba con URL de tarball exacta requiere un resumen (digest):

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- La prueba de artefacto descarga un artefacto tarball de otra ejecución de Actions:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Empaqueta e instala la compilación actual de OpenClaw en Docker, inicia la Gateway
    con OpenAI configurado, y luego habilita los canales/complementos incluidos mediante ediciones
    de configuración.
  - Verifica que el descubrimiento de configuración deje ausentes los complementos descargables no configurados,
    que la primera reparación del doctor configurado instale explícitamente cada complemento descargable
    faltante, y que un segundo reinicio no ejecute la reparación de dependencias ocultas.
  - También instala una línea base npm antigua conocida, habilita Telegram antes de ejecutar `openclaw update --tag <candidate>`, y verifica que el doctor de post-actualización del candidato limpie los residuos de dependencias de plugins heredados sin una reparación postinstalación del lado del arnés.
- `pnpm test:parallels:npm-update`
  - Ejecuta la prueba de humo de actualización de instalación de paquete nativo en los invitados de Parallels. Cada plataforma seleccionada primero instala el paquete de línea base solicitado, luego ejecuta el comando `openclaw update` instalado en el mismo invitado y verifica la versión instalada, el estado de actualización, la disponibilidad del gateway y un turno de agente local.
  - Use `--platform macos`, `--platform windows`, o `--platform linux` mientras itera en un invitado. Use `--json` para la ruta del artefacto de resumen y el estado por carril.
  - El carril OpenAI usa `openai/gpt-5.5` para la prueba de turno de agente en vivo por defecto. Pase `--model <provider/model>` o establezca `OPENCLAW_PARALLELS_OPENAI_MODEL` al validar deliberadamente otro modelo de OpenAI.
  - Envuelva las ejecuciones locales largas en un tiempo de espera del host para que los bloqueos del transporte de Parallels no puedan
    consumir el resto de la ventana de pruebas:

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - El script escribe registros de carril anidados bajo `/tmp/openclaw-parallels-npm-update.*`. Inspeccione `windows-update.log`, `macos-update.log`, o `linux-update.log` antes de asumir que el envoltorio exterior está colgado.
  - La actualización de Windows puede pasar de 10 a 15 minutos en el trabajo del médico y de actualización de paquetes posterior a la actualización
    en un invitado en frío; eso sigue siendo saludable cuando el registro de depuración de npm anidado
    está avanzando.
  - No ejecute este contenedor agregado en paralelo con los carriles de pruebas de humo individuales de Parallels
    macOS, Windows o Linux. Comparten el estado de la máquina virtual y pueden colisionar en
    la restauración de instantáneas, el servicio de paquetes o el estado de la puerta de enlace del invitado.
  - La prueba posterior a la actualización ejecuta la superficie normal del complemento empaquetado porque
    las fachadas de capacidad, como el habla, la generación de imágenes y la comprensión
    de medios, se cargan a través de las API de tiempo de ejecución empaquetadas, incluso cuando el
    turno del agente solo verifica una respuesta de texto simple.

- `pnpm openclaw qa aimock`
  - Inicia solo el servidor del proveedor AIMock local para pruebas de humo
    directas del protocolo.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un servidor doméstico Tuwunel desechable respaldado por Docker. Solo para verificación de código fuente - las instalaciones empaquetadas no envían `qa-lab`.
  - CLI completo, catálogo de perfiles/escenarios, variables de entorno y diseño de artefactos: [Matrix QA](/es/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real usando los tokens del bot del controlador y del SUT del entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id de grupo debe ser el id numérico del chat de Telegram.
  - Admite `--credential-source convex` para credenciales agrupadas compartidas. Use el modo env por defecto, o configure `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por arrendamientos agrupados.
  - Los valores predeterminados cubren canary, filtrado de menciones, direccionamiento de comandos, `/status`, respuestas mencionadas de bot a bot y respuestas de comandos nativos principales. Los valores predeterminados de `mock-openai` también cubren regresiones de cadena de respuesta determinista y transmisión de mensajes finales de Telegram. Use `--list-scenarios` para sondas opcionales como `session_status`.
  - Termina con un estado distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando desee
    artefactos sin un código de salida fallido.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de Comunicación Bot a Bot en `@BotFather` para ambos bots y asegúrese de que el bot conductor pueda observar el tráfico del bot de grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados en `.artifacts/qa-e2e/...`. Los escenarios de respuesta incluyen RTT desde la solicitud de envío del conductor hasta la respuesta observada del SUT.

`Mantis Telegram Live` es el contenedor de evidencia de PR para este carril. Ejecuta la referencia candidata con credenciales de Telegram arrendadas por Convex, representa la transcripción de mensajes observados redactados en un navegador de escritorio Crabbox, graba evidencia MP4, genera un GIF recortado por movimiento, carga el paquete de artefactos y publica evidencia de PR en línea a través de la aplicación GitHub Mantis cuando `pr_number` está configurado. Los mantenedores pueden iniciarlo desde la interfaz de usuario de Actions a través de `Mantis Scenario` (`scenario_id:
telegram-live`) o directamente desde un comentario de solicitud de extracción:

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` es el contenedor antes/después nativo agente de Telegram Desktop
para prueba visual de PR. Inícielo desde la interfaz de usuario de Actions con
`instructions` de forma libre, a través de `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`), o desde un comentario de PR:

```text
@Mantis telegram desktop proof
```

El agente Mantis lee la PR, decide qué comportamiento visible en Telegram demuestra el
cambio, ejecuta el carril de prueba real de usuario Crabbox Telegram Desktop en las referencias base y
candidata, itera hasta que los GIF nativos sean útiles, escribe un manifiesto `motionPreview` emparejado, y publica la misma tabla de GIF de 2 columnas a través de la
aplicación de GitHub Mantis cuando `pr_number` está configurado.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Arrienda o reutiliza un escritorio Crabbox Linux, instala Telegram Desktop nativo, configura OpenClaw con un token de bot SUT de Telegram arrendado, inicia la puerta de enlace y registra evidencia de captura de pantalla/MP4 desde el escritorio VNC visible.
  - Por defecto es `--credential-source convex` por lo que los flujos de trabajo solo necesitan el secreto del broker Convex. Use `--credential-source env` con las mismas variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop todavía necesita un inicio de sesión/perfil de usuario. El token del bot solo configura OpenClaw. Use `--telegram-profile-archive-env <name>` para un archivo de perfil `.tgz` en base64, o use `--keep-lease` e inicie sesión manualmente a través de VNC una vez.
  - Escribe `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` y `telegram-desktop-builder.mp4` bajo el directorio de salida.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen; la matriz de cobertura por carril vive en [QA overview → Live transport coverage](/es/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` es el conjunto sintético amplio y no forma parte de esa matriz.

### Credenciales compartidas de Telegram a través de Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para
el control de calidad de transporte en vivo, el laboratorio de control de calidad adquiere un contrato exclusivo de un grupo respaldado por Convex, envía latidos a ese
contrato mientras el carril se está ejecutando y libera el contrato al apagarse. El nombre de la sección es anterior
al soporte de Discord, Slack y WhatsApp; el contrato de arrendamiento se comparte entre tipos.

Andamio del proyecto Convex de referencia:

- `qa/convex-credential-broker/`

Variables de entorno requeridas:

- `OPENCLAW_QA_CONVEX_SITE_URL` (por ejemplo `https://your-deployment.convex.site`)
- Un secreto para el rol seleccionado:
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` para `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` para `ci`
- Selección del rol de credencial:
  - CLI: `--credential-role maintainer|ci`
  - Predeterminado de entorno: `OPENCLAW_QA_CREDENTIAL_ROLE` (por defecto es `ci` en CI, `maintainer` en caso contrario)

Variables de entorno opcionales:

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (predeterminado `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (predeterminado `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (predeterminado `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (predeterminado `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (predeterminado `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de rastro opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URLs de bucle local `http://` de Convex para desarrollo local exclusivamente.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en operación normal.

Los comandos de administrador para mantenedores (pool add/remove/list) requieren
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` específicamente.

Auxiliares de CLI para mantenedores:

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `doctor` antes de ejecuciones en vivo para verificar la URL del sitio Convex, secretos del agente,
prefijo del punto final, tiempo de espera HTTP y accesibilidad de admin/lista sin imprimir
valores secretos. Use `--json` para salida legible por máquina en scripts y utilidades
de CI.

Contrato de punto final predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - Solicitud: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Éxito: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Agotado/reinteligible: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - Éxito: `{ status: "ok", index, data }`
- `POST /heartbeat`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Éxito: `{ status: "ok" }` (o `2xx` vacío)
- `POST /release`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Éxito: `{ status: "ok" }` (o vacío `2xx`)
- `POST /admin/add` (solo mantenedor secreto)
  - Solicitud: `{ kind, actorId, payload, note?, status? }`
  - Éxito: `{ status: "ok", credential }`
- `POST /admin/remove` (solo mantenedor secreto)
  - Solicitud: `{ credentialId, actorId }`
  - Éxito: `{ status: "ok", changed, credential }`
  - Guardia de arrendamiento activo: `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (solo mantenedor secreto)
  - Solicitud: `{ kind?, status?, includePayload?, limit? }`
  - Éxito: `{ status: "ok", credentials, count }`

Forma del payload para el tipo Telegram:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` debe ser una cadena de ID de chat de Telegram numérica.
- `admin/add` valida esta forma para `kind: "telegram"` y rechaza payloads malformados.

Forma del payload para el tipo de usuario real de Telegram:

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` y `telegramApiId` deben ser cadenas numéricas.
- `tdlibArchiveSha256` y `desktopTdataArchiveSha256` deben ser cadenas hexadecimales SHA-256.
- `kind: "telegram-user"` representa una cuenta de Telegram desechable. Trate el arrendamiento como a nivel de cuenta: el controlador CLI de TDLib y el testigo visual de Telegram Desktop se restauran desde el mismo payload, y solo un trabajo debe tener el arrendamiento a la vez.

Restauración del arrendamiento de usuario real de Telegram:

```bash
tmp=$(mktemp -d /tmp/openclaw-telegram-user.XXXXXX)
node --import tsx scripts/e2e/telegram-user-credential.ts lease-restore \
  --user-driver-dir "$tmp/user-driver" \
  --desktop-workdir "$tmp/desktop" \
  --lease-file "$tmp/lease.json"
TELEGRAM_USER_DRIVER_STATE_DIR="$tmp/user-driver" \
  uv run ~/.codex/skills/custom/telegram-e2e-bot-to-bot/scripts/user-driver.py status --json
node --import tsx scripts/e2e/telegram-user-credential.ts release --lease-file "$tmp/lease.json"
```

Use el perfil de Desktop restaurado con `Telegram -workdir "$tmp/desktop"` cuando se necesite una grabación visual. En entornos de operador local, `scripts/e2e/telegram-user-credential.ts` lee `~/.codex/skills/custom/telegram-e2e-bot-to-bot/convex.local.env` por defecto si faltan las variables de entorno del proceso.

Sesión de Crabbox impulsada por agente:

```bash
pnpm qa:telegram-user:crabbox -- start \
  --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz \
  --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json \
  --text /status
pnpm qa:telegram-user:crabbox -- finish \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` arrienda la credencial `telegram-user`, restaura la misma cuenta en
TDLib y Telegram Desktop en un escritorio Linux Crabbox, inicia una puerta de enlace
SUT simulada local desde el checkout actual, abre el chat de Telegram visible, inicia
la grabación del escritorio y escribe un `session.json` privado. Mientras la sesión esté
activa, un agente puede seguir probando hasta quedar satisfecho:

- `send --session <file> --text <message>` envía a través del usuario real de TDLib y espera la respuesta del SUT.
- `run --session <file> -- <remote command>` ejecuta un comando arbitrario en el Crabbox y guarda su salida, por ejemplo `bash -lc 'source /tmp/openclaw-telegram-user-crabbox/env.sh && python3 /tmp/openclaw-telegram-user-crabbox/user-driver.py transcript --limit 20 --json'`.
- `screenshot --session <file>` captura el escritorio visible actual.
- `status --session <file>` imprime el contrato y el comando WebVNC.
- `finish --session <file>` detiene la grabadora, captura artefactos de captura de pantalla/video/recorte de movimiento, libera la credencial Convex, detiene los procesos locales del SUT y detiene el contrato del Crabbox a menos que se pase `--keep-box`.
- `publish --session <file> --pr <number>` publica un comentario de PR solo con GIF por defecto. Pase `--full-artifacts` solo cuando se necesiten intencionadamente artefactos de registros o JSON.

Para reproducciones visuales deterministas, pase `--mock-response-file <path>` a `start`
o al atajo `probe` de un solo comando. El ejecutor utiliza por defecto una clase
Crabbox estándar, grabación a 24fps, vistas previas de GIF de movimiento a 24fps y ancho
de GIF de 1920px. Anule con `--class`, `--record-fps`, `--preview-fps` y
`--preview-width` solo cuando la prueba necesite diferentes configuraciones de captura.

Prueba de Crabbox de un solo comando:

```bash
pnpm qa:telegram-user:crabbox -- --text /status
```

El comando por defecto `probe` es un atajo para un ciclo de inicio/envío/finalización. Úselo
para una prueba rápida de `/status`. Use los comandos de sesión para la revisión de PR,
trabajo de reproducción de errores, o cualquier caso donde el agente necesite minutos de experimentación
arbitraria antes de decidir que la prueba está completa. Use `--id <cbx_...>` para
reutilizar un contrato de escritorio activo, `--keep-box` para mantener VNC abierto después de terminar,
`--desktop-chat-title <name>` para elegir el chat visible, y `--tdlib-url <tgz>`
cuando se usa un archivo `libtdjson.so` de Linux precompilado en lugar de construir TDLib en
una caja nueva. El ejecutor verifica `--tdlib-url` con `--tdlib-sha256 <hex>` o,
por defecto, un archivo `<url>.sha256` hermano.

Cargas de múltiples canales validadas por el broker:

- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Los carriles de Slack también pueden alquilar del grupo, pero la validación del payload de Slack actualmente vive en el ejecutor de QA de Slack en lugar de en el intermediario. Use `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }` para las filas de Slack.

### Agregar un canal a QA

La arquitectura y los nombres de los asistentes de escenarios para los nuevos adaptadores de canal viven en [Resumen de QA → Agregar un canal](/es/concepts/qa-e2e-automation#adding-a-channel). El requisito mínimo: implementar el ejecutor de transporte en la costura de host compartida `qa-lab`, declarar `qaRunners` en el manifiesto del complemento, montar como `openclaw qa <runner>` y escribir escenarios bajo `qa/scenarios/`.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como "realismo creciente" (y creciente inestabilidad/costo):

### Unitaria / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: las ejecuciones sin destino utilizan el conjunto de fragmentos `vitest.full-*.config.ts` y pueden expandir los fragmentos multiproyecto en configuraciones por proyecto para la programación paralela
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts` y `test/**/*.test.ts`; las pruebas unitarias de UI se ejecutan en el fragmento dedicado `unit-ui`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápida y estable
  - Las pruebas del resolver y del cargador de superficie pública deben demostrar un comportamiento alternativo amplio de `api.js` y
    `runtime-api.js` con accesorios de complementos pequeños generados, no
    APIs de fuente de complementos empaquetados reales. Las cargas de API de complementos reales pertenecen a
    suites de contrato/integración propiedad del complemento.

Política de dependencias nativas:

- Las instalaciones de prueba predeterminadas omiten las compilaciones opcionales nativas de Discord opus. La recepción de voz de Discord usa el decodificador `opusscript` puro de JS, y `@discordjs/opus` permanece deshabilitado en `allowBuilds` para que las pruebas locales y los carriles de Testbox no compilen el complemento nativo.
- Utilice un carril dedicado de rendimiento de voz de Discord o en vivo si necesita intencionalmente comparar una compilación opus nativa. No establezca `@discordjs/opus` en `true` en el `allowBuilds` predeterminado; eso hace que bucles de instalación/prueba no relacionados compilen código nativo.

<AccordionGroup>
  <Accordion title="Proyectos, shards y carriles con alcance">

    - `pnpm test` sin destino ejecuta doce configuraciones de shard más pequeñas (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso gigante de proyecto raíz nativo. Esto reduce el pico de RSS en máquinas cargadas y evita que el trabajo de auto-respuesta/extensiones famine suites no relacionadas.
    - `pnpm test --watch` todavía utiliza el gráfico de proyectos raíz `vitest.config.ts` nativo, porque un bucle de observación multi-shard no es práctico.
    - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` enrutan objetivos explícitos de archivo/directorio a través de carriles con alcance primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto completo de inicio del proyecto raíz.
    - `pnpm test:changed` expande las rutas de git cambiadas en carriles con alcance económicos por defecto: ediciones directas de pruebas, archivos `*.test.ts` hermanos, mapeos de fuente explícitos y dependientes del gráfico de importación local. Las ediciones de configuración/configuración/paquete no ejecutan pruebas ampliamente a menos que uses explícitamente `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` es la puerta de verificación local inteligente normal para trabajo estrecho. Clasifica la diferencia en núcleo, pruebas de núcleo, extensiones, pruebas de extensiones, aplicaciones, documentos, metadatos de lanzamiento, herramientas de Docker en vivo y herramientas, y luego ejecuta los comandos de typecheck, lint y guard correspondientes. No ejecuta pruebas de Vitest; llama a `pnpm test:changed` o `pnpm test <target>` explícito para pruebas de validación. Los aumentos de versión solo de metadatos de lanzamiento ejecutan verificaciones de versión/configuración/dependencia-raíz dirigidas, con un guard que rechaza cambios de paquete fuera del campo de versión de nivel superior.
    - Las ediciones del arnés ACP de Docker en vivo ejecutan verificaciones enfocadas: sintaxis de shell para los scripts de autenticación de Docker en vivo y una ejecución en seco del planificador de Docker en vivo. Los cambios `package.json` se incluyen solo cuando la diferencia se limita a `scripts["test:docker:live-*"]`; las ediciones de dependencia, exportación, versión y otras superficies de paquete todavía usan los guards más amplios.
    - Las pruebas unitarias ligeras en importaciones de agentes, comandos, complementos, ayudantes de auto-respuesta, `plugin-sdk` y áreas similares de utilidades puras pasan por el carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con mucho estado/runtime se quedan en los carriles existentes.
    - Los archivos de fuente de ayudante `plugin-sdk` y `commands` seleccionados también asignan ejecuciones en modo cambiado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de ayudantes evitan volver a ejecutar la suite pesada completa para ese directorio.
    - `auto-reply` tiene cubos dedicados para ayudantes de núcleo de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. La CI divide aún más el subárbol de respuesta en shards de agent-runner, dispatch y commands/state-routing para que un cubo pesado de importación no sea propietario de la cola completa de Node.
    - La CI normal de PR/main omite intencionalmente el barrido por lotes de extensiones y el shard `agentic-plugins` solo de lanzamiento. La validación completa de lanzamiento despacha el flujo de trabajo hijo `Plugin Prerelease` separado para esas suites pesadas de complementos/extensiones en los candidatos de lanzamiento.

  </Accordion>

  <Accordion title="Cobertura del runner integrado">

    - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación,
      mantenga ambos niveles de cobertura.
    - Añada regresiones de ayuda enfocadas para límites de enrutamiento puro y
      normalización.
    - Mantenga los conjuntos de integración del runner integrado saludables:
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Esos conjuntos verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
      a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda
      no son un sustituto suficiente para esas rutas de integración.

  </Accordion>

  <Accordion title="Grupo y valores predeterminados de aislamiento de Vitest">

    - La configuración base de Vitest tiene como valor predeterminado `threads`.
    - La configuración compartida de Vitest fija `isolate: false` y utiliza el
      runner no aislado en las configuraciones de proyectos raíz, e2e y live.
    - El carril UI raíz mantiene su configuración `jsdom` y optimizador, pero también se ejecuta en el
      runner compartido no aislado.
    - Cada fragmento `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false`
      de la configuración compartida de Vitest.
    - `scripts/run-vitest.mjs` añade `--no-maglev` para los procesos secundarios Node
      de Vitest de forma predeterminada para reducir la sobrecarga de compilación de V8 durante ejecuciones locales grandes.
      Establezca `OPENCLAW_VITEST_ENABLE_MAGLEV=1` para comparar con el comportamiento
      estándar de V8.

  </Accordion>

  <Accordion title="Iteración local rápida">

    - `pnpm changed:lanes` muestra qué carriles arquitectónicos activa una diferencia.
    - El gancho de pre-commit es solo para formato. Vuelve a preparar los archivos con formato
      y no ejecuta lint, typecheck ni pruebas.
    - Ejecute `pnpm check:changed` explícitamente antes de la entrega o el envío cuando necesite la puerta de verificación local inteligente.
    - `pnpm test:changed` se enruta a través de carriles de alcance económico de forma predeterminada. Use
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el agente
      decida que una edición de arnés, configuración, paquete o contrato realmente necesita una cobertura
      más amplia de Vitest.
    - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento
      de enrutamiento, solo con un límite más alto de trabajadores.
    - La escala automática de trabajadores locales es intencionalmente conservadora y se reduce
      cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones
      concurrentes de Vitest causan menos daño de forma predeterminada.
    - La configuración base de Vitest marca los proyectos/archivos de configuración como
      `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia
      el cableado de las pruebas.
    - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts
      compatibles; establezca `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea
      una ubicación de caché explícita para el perfilado directo.

  </Accordion>

  <Accordion title="Depuración de rendimiento">

    - `pnpm test:perf:imports` activa el informe de duración de importación de Vitest más
      la salida de desglose de importaciones.
    - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a
      los archivos modificados desde `origin/main`.
    - Los datos de tiempo de fragmentación (shard) se escriben en `.artifacts/vitest-shard-timings.json`.
      Las ejecuciones de configuración completa usan la ruta de configuración como clave; los fragmentos (shards) de CI con patrones de inclusión
      añaden el nombre del fragmento para que los fragmentos filtrados puedan rastrearse
      por separado.
    - Cuando una prueba rápida aún pasa la mayor parte de su tiempo en importaciones de inicio,
      mantenga las dependencias pesadas detrás de una costura `*.runtime.ts` local estrecha y
      simule esa costura directamente en lugar de importar profundamente los ayudantes de tiempo de ejecución solo
      para pasarlos a través de `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compara las rutas enrutadas
      `test:changed` con la ruta nativa del proyecto raíz para ese diff
      confirmado e imprime el tiempo de reloj más el RSS máximo de macOS.
    - `pnpm test:perf:changed:bench -- --worktree` evalúa el rendimiento del
      árbol sucio actual dirigiendo la lista de archivos cambiados a través de
      `scripts/test-projects.mjs` y la configuración raíz de Vitest.
    - `pnpm test:perf:profile:main` escribe un perfil de CPU del subproceso principal para
      la sobrecarga de inicio y transformación de Vitest/Vite.
    - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montículo (heap) del ejecutor para la
      suite unitaria con el paralelismo de archivos desactivado.

  </Accordion>
</AccordionGroup>

### Estabilidad (gateway)

- Comando: `pnpm test:stability:gateway`
- Configuración: `vitest.gateway.config.ts`, forzada a un trabajador
- Alcance:
  - Inicia un Gateway de bucle real (loopback) con diagnósticos activados por defecto
  - Genera un movimiento sintético de mensajes de gateway, memoria y cargas útiles grandes a través de la ruta de eventos de diagnóstico
  - Realiza consultas `diagnostics.stability` a través del Gateway WS RPC
  - Cubre los ayudantes de persistencia del paquete de estabilidad de diagnóstico
  - Afirma que la grabadora permanece limitada, las muestras sintéticas de RSS se mantienen por debajo del presupuesto de presión y las profundidades de la cola por sesión se drenan de nuevo a cero
- Expectativas:
  - Seguro para CI y sin claves
  - Carril estrecho para el seguimiento de regresiones de estabilidad, no un sustituto de la suite completa del Gateway

### E2E (prueba de humo del gateway)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` y pruebas E2E de bundled-plugin bajo `extensions/`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 por defecto).
  - Se ejecuta en modo silencioso por defecto para reducir la sobrecarga de E/S de la consola.
- Anulaciones útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el conteo de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de un extremo a otro de la pasarela de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E: Prueba de humo del backend de OpenShell

- Comando: `pnpm test:e2e:openshell`
- Archivo: `extensions/openshell/src/backend.e2e.test.ts`
- Alcance:
  - Inicia una pasarela OpenShell aislada en el host mediante Docker
  - Crea un sandbox desde un Dockerfile local temporal
  - Ejercita el backend OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere un CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la pasarela de prueba y el sandbox
- Anulaciones útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o a un script contenedor

### En vivo (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`, `test/**/*.live.test.ts` y pruebas en vivo de bundled-plugin bajo `extensions/`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - "¿Funciona realmente este proveedor/modelo _hoy_ con credenciales reales?"
  - Detectar cambios en el formato del proveedor, peculiaridades de la llamada a herramientas, problemas de autenticación y comportamiento del límite de velocidad
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas de proveedores reales, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiere ejecutar subconjuntos reducidos en lugar de "todo"
- Live ejecuta el código fuente `~/.profile` para obtener las claves de API faltantes.
- De forma predeterminada, las ejecuciones live aún aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los dispositivos de unidad no puedan mutar su `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando intencionalmente necesite que las pruebas en vivo usen su directorio de inicio real.
- `pnpm test:live` ahora se predetermina a un modo más silencioso: mantiene la salida de progreso de `[live] ...`, pero suprime el aviso adicional de `~/.profile` y silencia los registros de arranque de la puerta de enlace y el ruido de Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea volver a tener los registros de inicio completos.
- Rotación de claves de API (específico del proveedor): establezca `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por live a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan en las respuestas de límite de tasa.
- Salida de progreso/latido:
  - Las suites Live ahora emiten líneas de progreso a stderr para que las llamadas prolongadas al proveedor se vean activas incluso cuando la captura de la consola de Vitest está tranquila.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace se transmitan inmediatamente durante las ejecuciones live.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de la puerta de enlace/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisiones:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocando redes de la puerta de enlace / protocolo WS / emparejamiento: agregue `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` reducido

## Pruebas Live (que tocan la red)

Para la matriz de modelos en vivo, pruebas humo del backend de CLI, pruebas humo de ACP, arnés del servidor de aplicaciones de Codex y todas las pruebas en vivo de proveedores de medios (Deepgram, BytePlus, ComfyUI, imagen, música, video, arnés de medios), además del manejo de credenciales para ejecuciones en vivo, consulte [Testing live suites](/es/help/testing-live). Para la lista de verificación dedicada de actualización y validación de complementos, consulte [Testing updates and plugins](/es/help/testing-updates-plugins).

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo correspondiente a la clave de perfil dentro de la imagen de Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando su directorio de configuración local y espacio de trabajo (y obteniendo `~/.profile` si está montado). Los puntos de entrada locales correspondientes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen por defecto un límite de pruebas humo más pequeño para que un barrido completo de Docker sea práctico:
  `test:docker:live-models` tiene como valor predeterminado `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene como valor predeterminado `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anule esas variables de entorno cuando
  explícitamente desee el escaneo exhaustivo más grande.
- `test:docker:all` compila la imagen Docker de vivo una vez a través de `test:docker:live-build`, empaqueta OpenClaw una vez como un tarball npm a través de `scripts/package-openclaw-for-docker.mjs`, luego compila/reutiliza dos imágenes `scripts/e2e/Dockerfile`. La imagen simple es solo el ejecutor Node/Git para los carriles de instalación/actualización/dependencias de complementos; esos carriles montan el tarball precompilado. La imagen funcional instala el mismo tarball en `/app` para los carriles de funcionalidad de aplicación compilada. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. El agregado utiliza un planificador local ponderado: `OPENCLAW_DOCKER_ALL_PARALLELISM` controla las ranuras de proceso, mientras que los límites de recursos evitan que los carriles pesados de vivo, npm-install y multiservicio comiencen todos a la vez. Si un solo carril es más pesado que los límites activos, el planificador aún puede iniciarlo cuando el grupo está vacío y luego lo mantiene ejecutándose solo hasta que la capacidad esté disponible nuevamente. Los valores predeterminados son 10 ranuras, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; ajuste `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` solo cuando el host Docker tenga más espacio disponible. El ejecutor realiza un preflicht de Docker de forma predeterminada, elimina los contenedores E2E de OpenClaw obsoletos, imprime el estado cada 30 segundos, almacena los tiempos de carril exitosos en `.artifacts/docker-tests/lane-timings.json` y utiliza esos tiempos para iniciar los carriles más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto de carril ponderado sin compilar ni ejecutar Docker, o `node scripts/test-docker-all.mjs --plan-json` para imprimir el plan de CI para los carriles seleccionados, necesidades de paquete/imagen y credenciales.
- `Package Acceptance` es la puerta de enlace de paquetes nativa de GitHub para "¿funciona este archivo tar instalable como un producto?" Resuelve un paquete candidato a partir de `source=npm`, `source=ref`, `source=url` o `source=artifact`, lo carga como `package-under-test` y luego ejecuta los carriles E2E de Docker reutilizables contra ese archivo tar exacto en lugar de reempaquetar la referencia seleccionada. Los perfiles se ordenan por amplitud: `smoke`, `package`, `product` y `full`. Consulte [Testing updates and plugins](/es/help/testing-updates-plugins) para obtener información sobre el contrato de paquete/actualización/complemento, la matriz de supervivencia de actualización publicada, los valores predeterminados de lanzamiento y la triage de fallos.
- Las comprobaciones de compilación y lanzamiento ejecutan `scripts/check-cli-bootstrap-imports.mjs` después de tsdown. El guardia recorre el grafo de compilación estático desde `dist/entry.js` y `dist/cli/run-main.js` y falla si el inicio antes del envío importa dependencias de paquetes como Commander, prompt UI, undici o logging antes del envío del comando; también mantiene el fragmento de ejecución del gateway empaquetado dentro del presupuesto y rechaza las importaciones estáticas de rutas conocidas del gateway frío. El humo del CLI empaquetado también cubre la ayuda raíz, la ayuda de incorporación, la ayuda del doctor, el estado, el esquema de configuración y un comando de lista de modelos.
- La compatibilidad heredada de aceptación de paquetes tiene como límite `2026.4.25` (`2026.4.25-beta.*` incluido). Hasta ese punto de corte, el arnés tolera solo lagunas en los metadatos del paquete enviado: entradas de inventario privado de QA omitidas, `gateway install --wrapper` faltante, archivos de parche faltantes en el accesorio git derivado del tarball, `update.channel` persistente faltante, ubicaciones heredadas de registros de instalación de complementos, persistencia de registros de instalación del marketplace faltante y migración de metadatos de configuración durante `plugins update`. Para los paquetes posteriores a `2026.4.25`, esas rutas son fallos estrictos.
- Ejecutores de pruebas de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` y `test:docker:config-reload` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.

Los ejecutores Docker de modelos en vivo también realizan un bind-mount solo de los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no se limita), y luego los copian en el directorio home del contenedor antes de la ejecución para que el OAuth de CLI externa pueda actualizar los tokens sin modificar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; cubre Claude, Codex y Gemini de forma predeterminada, con una cobertura estricta de Droid/OpenCode a través de `pnpm test:docker:live-acp-bind:droid` y `pnpm test:docker:live-acp-bind:opencode`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo de observabilidad: `pnpm qa:otel:smoke` es un carril privado de checkout de fuentes de QA. Intencionalmente no forma parte de los carriles de publicación de Docker del paquete porque el tarball de npm omite QA Lab.
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Humo de onboarding/canal/agente de tarball de Npm: `pnpm test:docker:npm-onboard-channel-agent` instala el tarball empaquetado de OpenClaw globalmente en Docker, configura OpenAI a través de onboarding de env-ref más Telegram por defecto, ejecuta doctor y ejecuta un turno de agente de OpenAI simulado. Reutiliza un tarball preconstruido con `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omite la reconstrucción del host con `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, o cambia de canal con `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` o `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.
- Humo de instalación de habilidad: `pnpm test:docker:skill-install` instala el tarball empaquetado de OpenClaw globalmente en Docker, deshabilita las instalaciones de archivos subidos en la configuración, resuelve el slug de habilidad de ClawHub en vivo actual desde la búsqueda, lo instala con `openclaw skills install` y verifica la habilidad instalada más los metadatos de origen/bloqueo `.clawhub`.
- Humo de cambio de canal de actualización: `pnpm test:docker:update-channel-switch` instala el tarball empaquetado de OpenClaw globalmente en Docker, cambia del paquete `stable` a git `dev`, verifica el canal persistente y el funcionamiento del complemento posterior a la actualización, luego vuelve a cambiar al paquete `stable` y verifica el estado de actualización.
- Humo de superviviente de actualización: `pnpm test:docker:upgrade-survivor` instala el tarball empaquetado de OpenClaw sobre una fixture de usuario antiguo sucio con agentes, configuración de canal, listas de permisos de complementos, estado de dependencia de complementos obsoleto y archivos de espacio de trabajo/sesión existentes. Ejecuta la actualización del paquete más un doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia una puerta de enlace de bucle invertido y verifica la preservación de configuración/estado más los presupuestos de inicio/estado.
- Humo de supervivencia de actualización publicada: `pnpm test:docker:published-upgrade-survivor` instala `openclaw@latest` de forma predeterminada, siembra archivos de usuario existentes realistas, configura esa línea base con una receta de comando integrada, valida la configuración resultante, actualiza esa instalación publicada al archivo tarball candidato, ejecuta el doctor de forma no interactiva, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle de retorno y verifica los intents configurados, la preservación del estado, el inicio, `/healthz`, `/readyz` y los presupuestos de estado de RPC. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, pida al programador agregado que expanda las líneas base locales exactas con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, y expanda las accesorios con forma de problema con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` como `reported-issues`; el conjunto de problemas reportados incluye `configured-plugin-installs` para la reparación automática de la instalación del complemento externo OpenClaw. Aceptación del paquete expone esos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, resuelve tokens de meta línea base como `last-stable-4` o `all-since-2026.4.23`, y Validación de lanzamiento completo expande el puerta de paquete de lanzamiento-soak a `last-stable-4 2026.4.23 2026.5.2 2026.4.15` más `reported-issues`.
- Humo del contexto de tiempo de ejecución de la sesión: `pnpm test:docker:session-runtime-context` verifica la persistencia de la transcripción del contexto de tiempo de ejecución oculto más la reparación del doctor de las ramas de reescritura de indicaciones duplicadas afectadas.
- Humo de instalación global de Bun: `bash scripts/e2e/bun-global-install-smoke.sh` empaqueta el árbol actual, lo instala con `bun install -g` en un hogar aislado y verifica que `openclaw infer image providers --json` devuelva proveedores de imágenes empaquetados en lugar de colgarse. Reutilice un tarball preconstruido con `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la compilación del host con `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` o copie `dist/` de una imagen Docker construida con `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Prueba de humo del instalador Docker: `bash scripts/test-install-sh-docker.sh` comparte una caché de npm en sus contenedores root, update y direct-npm. La prueba de humo de actualización utiliza por defecto npm `latest` como línea base estable antes de actualizar al tarball candidato. Anule esto con `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` localmente, o con la entrada `update_baseline_version` del flujo de trabajo Install Smoke en GitHub. Las comprobaciones del instalador que no son root mantienen una caché de npm aislada para que las entradas de caché propiedad de root no enmascaren el comportamiento de instalación local del usuario. Establezca `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` para reutilizar la caché root/update/direct-npm en ejecuciones locales.
- Install Smoke CI omite la actualización global duplicada de direct-npm con `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1`; ejecute el script localmente sin esa variable de entorno cuando se necesite cobertura directa de `npm install -g`.
- Prueba de humo CLI de eliminación de espacio de trabajo compartido por agentes: `pnpm test:docker:agents-delete-shared-workspace` (script: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construye la imagen raíz del Dockerfile por defecto, inicializa dos agentes con un espacio de trabajo en un directorio home de contenedor aislado, ejecuta `agents delete --json` y verifica el JSON válido más el comportamiento del espacio de trabajo retenido. Reutilice la imagen install-smoke con `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Redes de puerta de enlace (dos contenedores, autenticación WS + estado de salud): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Prueba de humo de instantáneas CDP del navegador: `pnpm test:docker:browser-cdp-snapshot` (script: `scripts/e2e/browser-cdp-snapshot-docker.sh`) construye la imagen E2E de origen más una capa de Chromium, inicia Chromium con CDP sin procesar, ejecuta `browser doctor --deep` y verifica que las instantáneas de rol CDP cubran las URL de los enlaces, los elementos en los que se puede hacer clic promocionados por el cursor, las referencias de iframe y los metadatos de los marcos.
- Regresión de razonamiento mínimo de web_search en OpenAI Responses: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) ejecuta un servidor OpenAI simulado a través de Gateway, verifica que `web_search` eleve `reasoning.effort` de `minimal` a `low`, luego fuerza el rechazo del esquema del proveedor y comprueba que el detalle sin procesar aparezca en los registros de Gateway.
- Puente de canal MCP (Gateway sembrado + puente stdio + prueba de humo de tramas de notificación sin procesar de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Herramientas MCP del paquete Pi (servidor MCP stdio real + perfil incrustado Pi permitir/denegar prueba de humo): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Limpieza MCP de Cron/subagente (Gateway real + desmontaje del hijo MCP stdio después de ejecuciones de cron aisladas y subagentes de un solo uso): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Complementos (prueba de humo de instalación/actualización para ruta local, `file:`, registro npm con dependencias elevadas, refs móviles de git, kitchen-sink de ClawHub, actualizaciones del mercado y habilitación/inspección del paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  Establezca `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` para omitir el bloque ClawHub, o anule el par predeterminado de paquete/runtime de kitchen-sink con `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` y `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sin `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, la prueba utiliza un servidor de accesorios local ClawHub hermético.
- Prueba de humo de actualización de complemento sin cambios: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Prueba de humo de la matriz del ciclo de vida del complemento: `pnpm test:docker:plugin-lifecycle-matrix` instala el tarball OpenClaw empaquetado en un contenedor vacío, instala un complemento npm, alterna habilitar/deshabilitar, lo actualiza y degrada a través de un registro npm local, elimina el código instalado y luego verifica que la desinstalación aún elimina el estado obsoleto mientras registra las métricas RSS/CPU para cada fase del ciclo de vida.
- Prueba de humo de metadatos de recarga de configuración: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Complementos: `pnpm test:docker:plugins` cubre la prueba de humo de instalación/actualización para ruta local, `file:`, registro npm con dependencias elevadas, refs móviles de git, accesorios ClawHub, actualizaciones del mercado y habilitación/inspección del paquete Claude. `pnpm test:docker:plugin-update` cubre el comportamiento de actualización sin cambios para los complementos instalados. `pnpm test:docker:plugin-lifecycle-matrix` cubre la instalación, habilitación, deshabilitación, actualización, degradación y desinstalación de código faltante de complementos npm con seguimiento de recursos.

Para precompilar y reutilizar manualmente la imagen funcional compartida:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Las anulaciones de imagen específicas de la suite, como `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, todavía tienen prioridad si se configuran. Cuando `OPENCLAW_SKIP_DOCKER_BUILD=1` apunta a una imagen compartida remota, los scripts la descargan si aún no está local. Las pruebas de Docker de QR y del instalador mantienen sus propios Dockerfiles porque validan el comportamiento del paquete/instalación en lugar del tiempo de ejecución de la aplicación compartida construida.

Los ejecutores Docker de modelos en vivo también montan el checkout actual de solo lectura y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras ejecuta Vitest contra su código fuente/configuración local exacta. El paso de preparación omite grandes cachés locales exclusivos y resultados de compilación de la aplicación como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y `.build` locales de la aplicación o directorios de resultados de Gradle, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo de la puerta de enlace no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` aún ejecuta `pnpm test:live`, así que también pase `OPENCLAW_LIVE_GATEWAY_*` cuando necesite acotar o excluir la cobertura en vivo de la puerta de enlace desde ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor anclado de Open WebUI contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. Establezca `OPENWEBUI_SMOKE_MODE=models` para verificaciones de CI de ruta de lanzamiento que deben detenerse después del inicio de sesión de Open WebUI y el descubrimiento del modelo, sin esperar una finalización del modelo en vivo. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de inicio en frío. Este carril espera una clave de modelo en vivo utilizable, y `OPENCLAW_PROFILE_FILE` (`~/.profile` de forma predeterminada) es la forma principal de proporcionarla en ejecuciones Dockerizadas. Las ejecuciones exitosas imprimen una pequeña carga útil JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway con semilla, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envíos salientes y notificaciones de canales y permisos de estilo Claude a través del puente stdio MCP real. La verificación de notaciones inspecciona los marcos stdio MCP sin procesar directamente, de modo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico resulta exponer. `test:docker:pi-bundle-mcp-tools` es determinista y no necesita una clave de modelo en vivo. Construye la imagen Docker del repositorio, inicia un servidor de sonda MCP stdio real dentro del contenedor, materializa ese servidor a través del tiempo de ejecución MCP del paquete Pi integrado, ejecuta la herramienta y luego verifica que `coding` y `messaging` mantengan las herramientas `bundle-mcp` mientras que `minimal` y `tools.deny: ["bundle-mcp"]` las filtran. `test:docker:cron-mcp-cleanup` es determinista y no necesita una clave de modelo en vivo. Inicia un Gateway con semilla con un servidor de sonda MCP stdio real, ejecuta un turno cron aislado y un turno secundario de un solo disparo `/subagents spawn`, y luego verifica que el proceso secundario MCP salga después de cada ejecución.

Prueba de humo manual de hilo en lenguaje sencillo ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conserve este script para flujos de trabajo de regresión/depuración. Puede volver a ser necesario para la validación del enrutamiento de hilos ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (predeterminado: `~/.profile`) montado en `/home/node/.profile` y obtenido (sourced) antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno obtenidas de `OPENCLAW_PROFILE_FILE`, usando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación de CLI externos
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como solo lectura bajo `/host-auth...` y luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedores reducidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por la prueba de humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI fijada

## Integridad de la documentación

Ejecute las comprobaciones de la documentación después de editar documentos: `pnpm check:docs`.
Ejecute la validación completa de anclajes de Mintlify cuando también necesite comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada a herramientas de la puerta de enlace (OpenAI simulado, puerta de enlace real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada a herramienta de OpenAI simulada de extremo a extremo a través del bucle de agente de la puerta de enlace")
- Asistente de puerta de enlace (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de fiabilidad del agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de fiabilidad del agente":

- Llamada a herramientas simulada a través de la puerta de enlace real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de la configuración (`src/gateway/gateway.test.ts`).

Lo que todavía falta para las habilidades (consulte [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usar y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la transferencia del historial de sesión y los límites del espacio aislado.

Las evaluaciones futuras deben mantenerse primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y el cableado de la sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, bloqueo, inyección de mensajes).
- Evaluaciones en vivo opcionales (opcional, limitadas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma del complemento y del canal)

Las pruebas de contrato verifican que cada complemento y canal registrado cumpla con su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de aserciones de forma y comportamiento. El carril `pnpm test` unit predeterminado omite intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canal o proveedor.

### Comandos

- Todos los contratos: `pnpm test:contracts`
- Solo contratos de canal: `pnpm test:contracts:channels`
- Solo contratos de proveedor: `pnpm test:contracts:plugins`

### Contratos de canal

Ubicados en `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Forma básica del complemento (id, nombre, capacidades)
- **setup** - Contrato del asistente de configuración
- **session-binding** - Comportamiento de vinculación de sesión
- **outbound-payload** - Estructura del payload del mensaje
- **inbound** - Manejo de mensajes entrantes
- **actions** - Manejadores de acciones del canal
- **threading** - Manejo del ID del hilo (Thread ID)
- **directory** - API de directorio/lista
- **group-policy** - Aplicación de políticas de grupo

### Contratos de estado del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos de proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API del catálogo de modelos
- **discovery** - Descubrimiento de complementos
- **loader** - Carga de complementos
- **runtime** - Tiempo de ejecución del proveedor
- **shape** - Forma/interfaz del complemento
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando corrija un problema de proveedor/modelo descubierto en live:

- Agregue una regresión segura para CI si es posible (proveedor simulado/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo para live (límites de velocidad, políticas de autenticación), mantenga la prueba de live estrecha y opcional mediante variables de entorno
- Prefiera apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error en la canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo live de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Guarda de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`) y luego afirma que los identificadores de ejecución del segmento de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en los identificadores de objetivo no clasificados para que las nuevas clases no puedan omitirse silenciosamente.

## Relacionado

- [Pruebas en vivo](/es/help/testing-live)
- [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins)
- [IC](/es/ci)
