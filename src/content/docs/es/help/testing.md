---
summary: "Kit de pruebas: suites unit/e2e/live, ejecutores Docker y qué cubre cada prueba"
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

- [Resumen de QA](/es/concepts/qa-e2e-automation) - arquitectura, superficie de comandos, creación de escenarios.
- [Matrix QA](/es/concepts/qa-matrix) - referencia para `pnpm openclaw qa matrix`.
- [Canal QA](/es/channels/qa-channel) - el plugin de transporte sintético utilizado por escenarios basados en repositorios.

Esta página cubre la ejecución de las suites de pruebas regulares y los ejecutores Docker/Parallels. La sección de ejecutores específicos de QA a continuación ([Ejecutores específicos de QA](#qa-specific-runners)) enumera las invocaciones concretas de `qa` y remite a las referencias anteriores.

</Note>

## Inicio rápido

La mayoría de los días:

- Full gate (esperado antes del push): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Ejecución local de suite completa más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de observación directo de Vitest: `pnpm test:watch`
- La orientación directa de archivos ahora también enruta rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones específicas primero cuando estás iterando en un solo fallo.
- Sitio de QA con Docker: `pnpm qa:lab:up`
- Carril de QA con VM de Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando tocas pruebas o quieres mayor confianza:

- Coverage gate: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite Live (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo live en silencio: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Informes de rendimiento en tiempo de ejecución: envía `OpenClaw Performance` con
  `live_openai_candidate=true` para un turno de agente `openai/gpt-5.5` real o
  `deep_profile=true` para artefactos de CPU/heap/trace de Kova. Las ejecuciones programadas diarias
  publican artefactos de carril de mock-provider, deep-profile y GPT 5.5 en
  `openclaw/clawgrit-reports` cuando `CLAWGRIT_REPORTS_TOKEN` está configurado. El
  informe de mock-provider también incluye números de arranque del gateway a nivel de origen, memoria,
  presión de plugins, bucle de saludo de modelo falso repetido y arranque de CLI.
- Barrido de modelos live con Docker: `pnpm test:docker:live-models`
  - Cada modelo seleccionado ahora ejecuta un turno de texto más una pequeña prueba de estilo de lectura de archivos.
    Los modelos cuyos metadatos anuncian entrada `image` también ejecutan un turno de imagen diminuto.
    Desactive las pruebas adicionales con `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` o
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` cuando aisle fallos del proveedor.
  - Cobertura de CI: `OpenClaw Scheduled Live And E2E Checks` diaria y `OpenClaw Release Checks` manual
    ambos llaman al flujo de trabajo reutilizable live/E2E con
    `include_live_suites: true`, que incluye trabajos de matriz de modelo vivo Docker separados
    distribuidos por proveedor.
  - Para reejecuciones enfocadas de CI, despache `OpenClaw Live And E2E Checks (Reusable)`
    con `include_live_suites: true` y `live_models_only: true`.
  - Agregue nuevos secretos de proveedor de alta señal a `scripts/ci-hydrate-live-auth.sh`
    además de `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` y sus
    llamadores programados/de lanzamiento.
- Prueba de humo de chat vinculado nativo de Codex: `pnpm test:docker:live-codex-bind`
  - Ejecuta un carril vivo Docker contra la ruta del servidor de aplicaciones de Codex, vincula un
    MD sintético de Slack con `/codex bind`, ejercita `/codex fast` y
    `/codex permissions`, luego verifica una respuesta simple y un archivo adjunto de imagen
    que se enrutan a través del enlace del complemento nativo en lugar de ACP.
- Prueba de humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness`
  - Ejecuta turnos de agente de puerta de enlace a través del arnés del servidor de aplicaciones de Codex propiedad del complemento,
    verifica `/codex status` y `/codex models`, y por defecto ejercita imagen,
    cron MCP, subagente y pruebas de Guardian. Desactive la prueba de subagente con
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` cuando aisle otros fallos del
    servidor de aplicaciones de Codex. Para una verificación enfocada del subagente, desactive las otras pruebas:
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Esto sale después de la prueba del subagente a menos que
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` esté configurado.
- Prueba de humo de instalación bajo demanda de Codex: `pnpm test:docker:codex-on-demand`
  - Instala el tarball OpenClaw empaquetado en Docker, ejecuta el onboarding
    de la clave API de OpenAI y verifica que el complemento Codex más la dependencia `@openai/codex`
    se hayan descargado en la raíz npm administrada bajo demanda.
- Prueba de humo de dependencia de herramienta de complemento en vivo: `pnpm test:docker:live-plugin-tool`
  - Empaqueta un plugin de prueba con una dependencia `slugify` real, lo instala a través de
    `npm-pack:`, verifica la dependencia en la raíz npm administrada y luego pide a un
    modelo OpenAI en vivo que llame a la herramienta del plugin y devuelva el slug oculto.
- Prueba de humo del comando de rescate de Crestodian: `pnpm test:live:crestodian-rescue-channel`
  - Verificación opcional de seguridad reforzada (belt-and-suspenders) para la superficie del
    comando de rescate del canal de mensajes. Ejecuta `/crestodian status`, pone en cola un cambio de
    modelo persistente, responde `/crestodian yes` y verifica la ruta de escritura de auditoría/configuración.
- Prueba de humo del planificador Docker de Crestodian: `pnpm test:docker:crestodian-planner`
  - Ejecuta Crestodian en un contenedor sin configuración con una CLI falsa de Claude en `PATH`
    y verifica que el recurso de seguridad del planificador difuso se traduzca en una escritura de configuración
    tipificada y auditada.
- Prueba de humo de la primera ejecución Docker de Crestodian: `pnpm test:docker:crestodian-first-run`
  - Comienza desde un directorio de estado de OpenClaw vacío, enruta `openclaw` básico a
    Crestodian, aplica escrituras de configuración/modelo/agente/plugin de Discord + SecretRef,
    valida la configuración y verifica las entradas de auditoría. La misma ruta de configuración de Anillo 0
    también está cubierta en QA Lab por
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Prueba de humo de costes de Moonshot/Kimi: con `MOONSHOT_API_KEY` establecido, ejecute
  `openclaw models list --provider moonshot --json`, luego ejecute un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  aislado contra `moonshot/kimi-k2.6`. Verifique que el JSON informe Moonshot/K2.6 y que
  la transcripción del asistente almacene `usage.cost` normalizado.

<Tip>Cuando solo necesita un caso de fallo, prefiera restringir las pruebas en vivo a través de las variables de entorno de lista de permitidos que se describen a continuación.</Tip>

## Ejecutores específicos de QA

Estos comandos se encuentran junto a las suites de pruebas principales cuando necesita realismo de laboratorio de QA:

CI ejecuta QA Lab en flujos de trabajo dedicados. La paridad de agentes está anidada bajo `QA-Lab - All Lanes` y la validación de lanzamientos, no como un flujo de trabajo de PR independiente. La validación amplia debe usar `Full Release Validation` con `rerun_group=qa-parity` o el grupo QA release-checks. Las comprobaciones de lanzamiento estables/predeterminadas mantienen el soak exhaustivo en vivo/Docker detrás de `run_release_soak=true`; el perfil `full` fuerza el soak. `QA-Lab - All Lanes` se ejecuta cada noche en `main` y desde un despacho manual con el carril de paridad simulada, el carril Matrix en vivo, el carril Telegram en vivo gestionado por Convex y el carril Discord en vivo gestionado por Convex como trabajos paralelos. El QA programado y las comprobaciones de lanzamiento pasan Matrix `--profile fast` explícitamente, mientras que los valores predeterminados de la CLI de Matrix y la entrada del flujo de trabajo manual siguen siendo `all`; el despacho manual puede dividir `all` en trabajos `transport`, `media`, `e2ee-smoke`, `e2ee-deep` y `e2ee-cli`. `OpenClaw Release Checks` ejecuta la paridad más los carriles rápidos de Matrix y Telegram antes de la aprobación del lanzamiento, usando `mock-openai/gpt-5.5` para las comprobaciones de transporte de lanzamiento para que se mantengan deterministas y eviten el inicio normal de complementos de proveedores. Estas pasarelas de transporte en vivo deshabilitan la búsqueda de memoria; el comportamiento de la memoria sigue cubierto por las suites de paridad de QA.

Los fragmentos de medios en vivo de lanzamiento completo usan `ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, que ya tiene `ffmpeg` y `ffprobe`. Los fragmentos de modelo/backend en vivo de Docker usan la imagen compartida `ghcr.io/openclaw/openclaw-live-test:<sha>` construida una vez por confirmación seleccionada, y luego la extraen con `OPENCLAW_SKIP_DOCKER_BUILD=1` en lugar de reconstruirla dentro de cada fragmento.

- `pnpm openclaw qa suite`
  - Ejecuta escenarios QA respaldados por el repositorio directamente en el host.
  - Ejecuta múltiples escenarios seleccionados en paralelo de forma predeterminada con trabajadores de puerta de enlace aislados. `qa-channel` tiene una concurrencia predeterminada de 4 (limitada por la cantidad de escenarios seleccionados). Use `--concurrency <count>` para ajustar la cantidad de trabajadores, o `--concurrency 1` para el carril serie antiguo.
  - Sale con un valor distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando
    quiera artefactos sin un código de salida fallido.
  - Soporta los modos de proveedor `live-frontier`, `mock-openai` y `aimock`.
    `aimock` inicia un servidor de proveedor local respaldado por AIMock para una cobertura
    experimental de fixtures y protocolos-mock sin reemplazar el carril `mock-openai`
    consciente del escenario.
- `pnpm test:plugins:kitchen-sink-live`
  - Ejecuta el conjunto de pruebas del complemento Kitchen Sink de OpenAI en vivo a través de QA Lab. Instala
    el paquete externo Kitchen Sink, verifica el inventario de la superficie del SDK del complemento,
    sondea `/healthz` y `/readyz`, registra evidencia de CPU/RSS
    de la puerta de enlace, ejecuta un turno de OpenAI en vivo y verifica diagnósticos adversarios.
    Requiere autenticación en vivo de OpenAI como `OPENAI_API_KEY`. En sesiones de Testbox
    hidratadas, obtiene automáticamente el perfil live-auth de Testbox cuando el
    asistente `openclaw-testbox-env` está presente.
- `pnpm test:gateway:cpu-scenarios`
  - Ejecuta el banco de pruebas de inicio de la puerta de enlace más un pequeño paquete de escenarios
    simulados de QA Lab (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) y escribe un resumen de observación
    de CPU combinado bajo `.artifacts/gateway-cpu-scenarios/`.
  - Marca solo observaciones de CPU caliente sostenidas por defecto (`--cpu-core-warn`
    más `--hot-wall-warn-ms`), por lo que los picos breves de inicio se registran como métricas
    sin parecerse a la regresión de bloqueo de la puerta de enlace de varios minutos.
  - Usa artefactos `dist` construidos; ejecute una compilación primero cuando el checkout no
    tenga ya una salida de tiempo de ejecución fresca.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta la misma suite de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza las mismas banderas de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación de QA compatibles que son prácticas para el invitado:
    claves de proveedor basadas en env, la ruta de configuración del proveedor en vivo de QA y `CODEX_HOME`
    cuando están presentes.
  - Los directorios de salida deben permanecer en la raíz del repositorio para que el invitado pueda escribir de vuelta a través del espacio de trabajo montado.
  - Escribe el informe y resumen normal de QA más los registros de Multipass bajo
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para trabajos de QA de estilo operador.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construye un tarball de npm desde el checkout actual, lo instala globalmente en Docker, ejecuta la incorporación no interactiva de la clave de API de OpenAI, configura Telegram por defecto, verifica que el tiempo de ejecución del plugin empaquetado se cargue sin reparación de dependencias de inicio, ejecuta doctor y ejecuta un turno de agente local contra un endpoint OpenAI simulado.
  - Use `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` to run the same packaged-install
    lane with Discord.
- `pnpm test:docker:session-runtime-context`
  - Ejecuta una prueba de humo determinista de Docker de la aplicación compilada para las transcripciones de contexto de tiempo de ejecución integrado. Verifica que el contexto de tiempo de ejecución oculto de OpenClaw se persista como un mensaje personalizado que no se muestra, en lugar de filtrarse en el turno de usuario visible, y luego introduce un JSONL de sesión rota afectada y verifica que `openclaw doctor --fix` lo reescriba a la rama activa con una copia de seguridad.
- `pnpm test:docker:npm-telegram-live`
  - Instala un candidato de paquete OpenClaw en Docker, ejecuta la incorporación del paquete instalado, configura Telegram a través de la CLI instalada y luego reutiliza el carril de QA en vivo de Telegram con ese paquete instalado como la puerta de enlace SUT.
  - El contenedor monta solo el código fuente del arnés `qa-lab` desde el checkout; el paquete instalado es propietario de `dist`, `openclaw/plugin-sdk` y el tiempo de ejecución del plugin empaquetado, por lo que el carril no mezcla los plugins del checkout actual en el paquete bajo prueba.
  - Por defecto es `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`; configure
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` o
    `OPENCLAW_CURRENT_PACKAGE_TGZ` para probar un tarball local resuelto en lugar de
    instalar desde el registro.
  - Usa las mismas credenciales de entorno de Telegram o la fuente de credenciales de Convex que `pnpm openclaw qa telegram`. Para la automatización de CI/release, configure
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` más
    `OPENCLAW_QA_CONVEX_SITE_URL` y el secreto del rol. Si
    `OPENCLAW_QA_CONVEX_SITE_URL` y un secreto de rol de Convex están presentes en CI,
    el contenedor Docker selecciona Convex automáticamente.
  - El contenedor valida el entorno de credenciales de Telegram o Convex en el host antes del trabajo de construcción/instalación de Docker. Configure `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`
    solo cuando se depure deliberadamente la configuración previa a las credenciales.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` anula el
    `OPENCLAW_QA_CREDENTIAL_ROLE` compartido solo para este carril.
  - GitHub Actions expone este carril como el flujo de trabajo manual de mantenedor `NPM Telegram Beta E2E`. No se ejecuta al fusionar. El flujo de trabajo utiliza el entorno `qa-live-shared` y concesiones de credenciales de CI de Convex.
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
  - También instala una línea base npm antigua conocida, habilita Telegram antes de ejecutar `openclaw update --tag <candidate>`, y verifica que el doctor posterior a la actualización del candidato limpie los restos de dependencias de plugins heredados sin una reparación postinstall del lado del arnés.
- `pnpm test:parallels:npm-update`
  - Ejecuta la prueba de humo de actualización de instalación empaquetada nativa a través de invitados Parallels. Cada plataforma seleccionada primero instala el paquete de línea base solicitado, luego ejecuta el comando `openclaw update` instalado en el mismo invitado y verifica la versión instalada, el estado de actualización, la preparación de la puerta de enlace y un turno de agente local.
  - Use `--platform macos`, `--platform windows`, o `--platform linux` mientras itera en un invitado. Use `--json` para la ruta del artefacto de resumen y el estado por carril.
  - El carril OpenAI usa `openai/gpt-5.5` para la prueba de turno de agente en vivo por defecto. Pase `--model <provider/model>` o establezca `OPENCLAW_PARALLELS_OPENAI_MODEL` cuando valide deliberadamente otro modelo de OpenAI.
  - Envuelva las ejecuciones locales largas en un tiempo de espera del host para que los bloqueos del transporte de Parallels no puedan
    consumir el resto de la ventana de pruebas:

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - El script escribe registros de carril anidados bajo `/tmp/openclaw-parallels-npm-update.*`. Inspeccione `windows-update.log`, `macos-update.log`, o `linux-update.log` antes de asumir que el contenedor externo está colgado.
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
  - CLI completa, catálogo de perfiles/escenarios, variables de entorno y diseño de artefactos: [Matrix QA](/es/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real usando los tokens del bot del controlador y del SUT del entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id de grupo debe ser el id numérico del chat de Telegram.
  - Admite `--credential-source convex` para credenciales agrupadas compartidas. Use el modo env por defecto, o configure `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por arrendamientos agrupados.
  - Los valores predeterminados cubren canary, bloqueo de menciones, direccionamiento de comandos, `/status`, respuestas mencionadas de bot a bot y respuestas de comandos nativos principales. Los valores predeterminados de `mock-openai` también cubren regresiones de cadena de respuesta determinista y transmisión de mensajes finales de Telegram. Use `--list-scenarios` para sondas opcionales como `session_status`.
  - Sale con código no cero cuando falla cualquier escenario. Use `--allow-failures` cuando desee
    artefactos sin un código de salida fallido.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de comunicación de bot a bot en `@BotFather` para ambos bots y asegúrese de que el bot conductor pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados bajo `.artifacts/qa-e2e/...`. Los escenarios de respuesta incluyen RTT desde la solicitud de envío del controlador hasta la respuesta observada del SUT.

`Mantis Telegram Live` es el contenedor de evidencia de PR alrededor de este carril. Ejecuta la
referencia candidata con credenciales de Telegram arrendadas por Convex, renderiza la transcripción
de mensajes observados redactados en un navegador de escritorio Crabbox, graba evidencia MP4,
genera un GIF recortado por movimiento, carga el paquete de artefactos y publica evidencia de PR
en línea a través de la aplicación GitHub Mantis cuando `pr_number` está configurado. Los mantenedores pueden
iniciarlo desde la interfaz de usuario de Actions a través de `Mantis Scenario` (`scenario_id:
telegram-live`) o directamente desde un comentario de solicitud de extracción:

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` es el contenedor antes/después nativo de Telegram Desktop
con agente para prueba visual de PR. Inícielo desde la interfaz de usuario de Actions con
`instructions` de forma libre, a través de `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`), o desde un comentario de PR:

```text
@openclaw-mantis telegram desktop proof
```

El agente Mantis lee la PR, decide qué comportamiento visible en Telegram demuestra el
cambio, ejecuta el carril de prueba real de usuario Crabbox Telegram Desktop en las referencias base y
candidata, itera hasta que los GIF nativos sean útiles, escribe un manifiesto
`motionPreview` y publica la misma tabla de GIF de 2 columnas a través de la
aplicación de GitHub Mantis cuando `pr_number` está configurado.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Arrienda o reutiliza un escritorio Crabbox Linux, instala Telegram Desktop nativo, configura OpenClaw con un token de bot SUT de Telegram arrendado, inicia la puerta de enlace y registra evidencia de captura de pantalla/MP4 desde el escritorio VNC visible.
  - Por defecto es `--credential-source convex` para que los flujos de trabajo solo necesiten el secreto del broker Convex. Use `--credential-source env` con las mismas variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop todavía necesita un inicio de sesión/perfil de usuario. El token del bot solo configura OpenClaw. Use `--telegram-profile-archive-env <name>` para un archivo de perfil `.tgz` en base64, o use `--keep-lease` e inicie sesión manualmente a través de VNC una vez.
  - Escribe `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` y `telegram-desktop-builder.mp4` en el directorio de salida.

Los carriles de transporte en vivo comparten un contrato estándar para que los nuevos transportes no se desvíen; la matriz de cobertura por carril vive en [QA overview → Live transport coverage](/es/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` es el conjunto sintético amplio y no es parte de esa matriz.

### Credenciales compartidas de Telegram a través de Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para
QA de transporte en vivo, el laboratorio de QA adquiere un contrato exclusivo de un grupo respaldado por Convex, envía latidos de ese
contrato mientras el carril se está ejecutando y libera el contrato al apagar. El nombre de la sección es anterior
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

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (valor predeterminado `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (valor predeterminado `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (valor predeterminado `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (valor predeterminado `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (valor predeterminado `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de seguimiento opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URLs de bucle invertido `http://` de Convex para el desarrollo exclusivamente local.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en funcionamiento normal.

Los comandos de administrador de mantenimiento (añadir/eliminar/listar pool) requieren
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` específicamente.

Auxiliares de CLI para mantenedores:

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `doctor` antes de las ejecuciones en vivo para verificar la URL del sitio Convex, los secretos del intermediario,
el prefijo del punto final, el tiempo de espera HTTP y la accesibilidad de administrador/lista sin imprimir
los valores secretos. Use `--json` para una salida legible por máquina en scripts y utilidades
CI.

Contrato de punto final predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

- `POST /acquire`
  - Solicitud: `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Éxito: `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Agotado/reintentable: `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - Éxito: `{ status: "ok", index, data }`
- `POST /heartbeat`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Éxito: `{ status: "ok" }` (o `2xx` vacío)
- `POST /release`
  - Solicitud: `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Éxito: `{ status: "ok" }` (o `2xx` vacío)
- `POST /admin/add` (solo secreto de mantenedor)
  - Solicitud: `{ kind, actorId, payload, note?, status? }`
  - Éxito: `{ status: "ok", credential }`
- `POST /admin/remove` (solo secreto de mantenedor)
  - Solicitud: `{ credentialId, actorId }`
  - Éxito: `{ status: "ok", changed, credential }`
  - Guardia de arrendamiento activo: `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (solo secreto de mantenedor)
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
- `kind: "telegram-user"` está reservado para el flujo de trabajo de prueba de Mantis Telegram Desktop. Los carriles genéricos de QA Lab no deben adquirirlo.

Payloads multicanales validados por el broker:

- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Los carriles de Slack también pueden alquilar del pool, pero la validación de payloads de Slack actualmente vive en el ejecutor de QA de Slack en lugar de en el broker. Use
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`
para filas de Slack.

### Añadir un canal a QA

La arquitectura y los nombres de ayuda de escenarios para nuevos adaptadores de canal se encuentran en [Descripción general de QA → Añadir un canal](/es/concepts/qa-e2e-automation#adding-a-channel). El mínimo requerido: implementar el ejecutor de transporte en la costura de host compartida `qa-lab`, declarar `qaRunners` en el manifiesto del complemento, montar como `openclaw qa <runner>` y crear escenarios bajo `qa/scenarios/`.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como "realismo creciente" (y mayor inestabilidad/costo):

### Unitaria / integración (predeterminada)

- Comando: `pnpm test`
- Configuración: las ejecuciones no dirigidas usan el conjunto de fragmentos `vitest.full-*.config.ts` y pueden expandir fragmentos multiproyecto en configuraciones por proyecto para la programación paralela
- Archivos: inventarios core/unit bajo `src/**/*.test.ts`, `packages/**/*.test.ts` y `test/**/*.test.ts`; las pruebas unitarias de UI se ejecutan en el fragmento dedicado `unit-ui`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápido y estable
  - Las pruebas de resolutor y cargador de superficie pública deben demostrar un comportamiento de reserva amplio de `api.js` y
    `runtime-api.js` con accesorios de complementos pequeños generados, no
    API de fuente de complementos empaquetados reales. Las cargas de API de complementos reales pertenecen a
    suites de contrato/integración propiedad del complemento.

Política de dependencias nativas:

- Las instalaciones de prueba predeterminadas omiten las compilaciones nativas opcionales de Discord opus. La recepción de voz de Discord usa el decodificador `opusscript` puro de JS, y `@discordjs/opus` permanece deshabilitado en `allowBuilds` para que las pruebas locales y los carriles de Testbox no compilen el complemento nativo.
- Use un carril de rendimiento de voz de Discord dedicado o un carril en vivo si necesita intencionalmente comparar una compilación nativa de opus. No configure `@discordjs/opus` en `true` en el `allowBuilds` predeterminado; eso hace que los bucles de instalación/prueba no relacionados compilen código nativo.

<AccordionGroup>
  <Accordion title="Proyectos, fragmentos y carriles con alcance">

    - Untargeted `pnpm test` ejecuta doce configuraciones de fragmentos más pequeñas (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso gigante nativo de proyecto raíz. Esto reduce el pico de RSS en máquinas cargadas y evita que el trabajo de auto-respuesta o extensiones starving a suites no relacionadas.
    - `pnpm test --watch` todavía utiliza el gráfico de proyecto nativo root `vitest.config.ts`, ya que un bucle de observación multi-fragmento no es práctico.
    - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` dirigen objetivos explícitos de archivo/directorio a través de carriles con alcance primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto completo de inicio del proyecto raíz.
    - `pnpm test:changed` expande las rutas git modificadas en carriles con alcance baratos por defecto: ediciones directas de pruebas, archivos hermanos `*.test.ts`, mapeos de fuente explícitos y dependientes del gráfico de importación local. Las ediciones de configuración/configuración/paquete no ejecutan pruebas de forma amplia a menos que uses explícitamente `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` es la puerta de control local inteligente normal para trabajos estrechos. Clasifica la diferencia en núcleo, pruebas del núcleo, extensiones, pruebas de extensiones, aplicaciones, documentos, metadatos de lanzamiento, herramientas de Docker en vivo y herramientas, y luego ejecuta los comandos de verificación de tipos, lint y guardia coincidentes. No ejecuta pruebas Vitest; llama a `pnpm test:changed` o `pnpm test <target>` explícito para la prueba de concepto. Los incrementos de versión solo de metadatos de lanzamiento ejecutan comprobaciones de versión/configuración/dependencia raíz dirigidas, con una guardia que rechaza cambios de paquete fuera del campo de versión de nivel superior.
    - Las ediciones del arnés ACP de Docker en vivo ejecutan comprobaciones enfocadas: sintaxis de shell para los scripts de autenticación de Docker en vivo y una ejecución en seco del programador de Docker en vivo. Los cambios `package.json` se incluyen solo cuando la diferencia se limita a `scripts["test:docker:live-*"]`; las ediciones de dependencia, exportación, versión y otras superficies de paquete todavía usan las protecciones más amplias.
    - Las pruebas unitarias ligeras en importaciones de agentes, comandos, complementos, ayudantes de auto-respuesta, `plugin-sdk` y áreas de utilidad pura similares se dirigen a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con mucho estado o tiempo de ejecución se mantienen en los carriles existentes.
    - Los archivos de origen auxiliares `plugin-sdk` y `commands` seleccionados también asignan ejecuciones en modo cambiado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones auxiliares evitan volver a ejecutar la suite pesada completa para ese directorio.
    - `auto-reply` tiene cubos dedicados para ayudantes principales de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. La CI divide aún más el subárbol de respuesta en fragmentos de ejecutor de agente, despacho y comandos/enrutamiento de estado, para que un cubo con muchas importaciones no posea la cola completa de Node.
    - La CI normal de PR/main omite intencionalmente el barrido por lotes de extensiones y el fragmento `agentic-plugins` solo de lanzamiento. La Validación Completa de Lanzamiento envía el flujo de trabajo secundario `Plugin Prerelease` separado para esas suites pesadas en complementos/extensiones en candidatos de lanzamiento.

  </Accordion>

  <Accordion title="Cobertura del ejecutor integrado">

    - Cuando cambie las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación, mantenga ambos niveles de cobertura.
    - Añada regresiones de ayuda centradas para los límites de enrutamiento puro y normalización.
    - Mantenga las suites de integración del ejecutor integrado saludables:
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` y
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Esas suites verifican que los identificadores con ámbito y el comportamiento de compactación todavía fluyan a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayuda no son un sustituto suficiente para esas rutas de integración.

  </Accordion>

  <Accordion title="Grupo y aislamiento predeterminados de Vitest">

    - La configuración base de Vitest predetermina a `threads`.
    - La configuración compartida de Vitest corrige `isolate: false` y usa el ejecutor no aislado a través de los proyectos raíz, e2e y configuraciones en vivo.
    - El carril de la interfaz de usuario raíz mantiene su configuración `jsdom` y optimizador, pero también se ejecuta en el ejecutor compartido no aislado.
    - Cada fragmento `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false` de la configuración compartida de Vitest.
    - `scripts/run-vitest.mjs` añade `--no-maglev` para los procesos secundarios de Node de Vitest por defecto para reducir la saturación de compilación de V8 durante ejecuciones locales grandes. Establezca `OPENCLAW_VITEST_ENABLE_MAGLEV=1` para comparar con el comportamiento estándar de V8.

  </Accordion>

  <Accordion title="Iteración local rápida">

    - `pnpm changed:lanes` muestra qué carriles arquitectónicos activa un diff.
    - El ganador de pre-commit es solo de formateo. Reorganiza los archivos formateados y
      no ejecuta lint, typecheck ni pruebas.
    - Ejecute `pnpm check:changed` explícitamente antes de entregar o hacer push cuando
      necesite la puerta de verificación local inteligente.
    - `pnpm test:changed` se enruta a través de carriles con ámbito económico de forma predeterminada. Use
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el agente
      determine que una edición de harness, configuración, paquete o contrato realmente necesita una cobertura
      más amplia de Vitest.
    - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento
      de enrutamiento, solo con un límite de trabajadores más alto.
    - El escalado automático de trabajadores locales es intencionalmente conservador y se reduce
      cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones
      concurrentes de Vitest causan menos daño de forma predeterminada.
    - La configuración base de Vitest marca los archivos de proyectos/configuración como
      `forceRerunTriggers` para que las reejecuciones en modo modificado permanezcan correctas cuando cambia
      la conexión de las pruebas.
    - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts
      compatibles; configure `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea
      una ubicación de caché explícita para perfilado directo.

  </Accordion>

  <Accordion title="Depuración de rendimiento">

    - `pnpm test:perf:imports` habilita la informes de duración de importación de Vitest más
      la salida de desglose de importación.
    - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a
      archivos cambiados desde `origin/main`.
    - Los datos de temporización de los fragmentos se escriben en `.artifacts/vitest-shard-timings.json`.
      Las ejecuciones de configuración completa usan la ruta de configuración como clave; los fragmentos de CI con patrón de inclusión
      añaden el nombre del fragmento para que los fragmentos filtrados puedan rastrearse
      por separado.
    - Cuando una prueba en caliente aún pasa la mayor parte de su tiempo en importaciones de inicio,
      mantenga las dependencias pesadas detrás de una costura local estrecha `*.runtime.ts` y
      simule esa costura directamente en lugar de importar profundamente los ayudantes de tiempo de ejecución solo
      para pasarlos a través de `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compara las rutas
      `test:changed` con la ruta nativa del proyecto raíz para ese
      diff confirmado e imprime el tiempo de reloj más el RSS máximo de macOS.
    - `pnpm test:perf:changed:bench -- --worktree` evalúa el rendimiento del
      árbol sucio actual enrutando la lista de archivos cambiados a través de
      `scripts/test-projects.mjs` y la configuración raíz de Vitest.
    - `pnpm test:perf:profile:main` escribe un perfil de CPU del subproceso principal para
      el inicio de Vitest/Vite y la sobrecarga de transformación.
    - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la
      suite unitaria con el paralelismo de archivos deshabilitado.

  </Accordion>
</AccordionGroup>

### Estabilidad (gateway)

- Comando: `pnpm test:stability:gateway`
- Configuración: `vitest.gateway.config.ts`, forzada a un trabajador
- Alcance:
  - Inicia un Gateway de bucle local real con diagnósticos habilitados por defecto
  - Impulsa mensajes sintéticos de gateway, memoria y rotación de cargas útiles grandes a través de la ruta de eventos de diagnóstico
  - Consultas `diagnostics.stability` a través del Gateway WS RPC
  - Cubre los asistentes de persistencia del paquete de estabilidad de diagnóstico
  - Asegura que la grabadora permanezca limitada, que las muestras sintéticas de RSS se mantengan por debajo del presupuesto de presión y que las profundidades de la cola por sesión se drenen a cero
- Expectativas:
  - Seguro para CI y sin claves
  - Carril estrecho para el seguimiento de regresiones de estabilidad, no un sustituto de la suite completa de Gateway

### E2E (gateway smoke)

- Comando: `pnpm test:e2e`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` y pruebas E2E de bundled-plugin bajo `extensions/`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, igual que el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
  - `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Ámbito:
  - Comportamiento integral de múltiples instancias de la pasarela
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
  - Crea un espacio aislado (sandbox) desde un Dockerfile local temporal
  - Ejercita el backend de OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec SSH
  - Verifica el comportamiento del sistema de archivos remoto canónico a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la pasarela de prueba y el sandbox
- Sobrescrituras útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente la suite e2e más amplia
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario CLI no predeterminado o un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`, `test/**/*.live.test.ts` y pruebas en vivo de bundled-plugin bajo `extensions/`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - "¿Funciona este proveedor/modelo _hoy_ con credenciales reales?"
  - Detectar cambios de formato del proveedor, peculiaridades de llamada a herramientas, problemas de autenticación y comportamiento de límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de velocidad
  - Se prefiere ejecutar subconjuntos reducidos en lugar de "todo"
- Las ejecuciones en vivo usan claves de API ya exportadas y perfiles de autenticación preparados.
- De forma predeterminada, las ejecuciones en vivo todavía aíslan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los accesorios de unit no puedan mutar su `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesite intencionalmente que las pruebas en vivo usen su directorio de inicio real.
- `pnpm test:live` usa de forma predeterminada un modo más silencioso: mantiene la salida de progreso de `[live] ...` y silencia los registros de arranque de la pasarela y el ruido de Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea volver a tener los registros de inicio completos.
- Rotación de claves de API (específico del proveedor): establezca `*_API_KEYS` con formato de comas/puntos y comas o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por ejecución en vivo a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de velocidad.
- Salida de progreso/latido:
  - Las suites en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de la consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/pasarela se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos del modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de la pasarela/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocando el networking de la pasarela / protocolo WS / emparejamiento: añada `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute un `pnpm test:live` reducido

## Pruebas en vivo (que tocan la red)

Para la matriz de modelos en vivo, pruebas rápidas del backend de CLI, pruebas rápidas de ACP, arnés del app-server de Codex y todas las pruebas en vivo de proveedores de medios (Deepgram, BytePlus, ComfyUI, imagen, música, video, arnés de medios), además del manejo de credenciales para ejecuciones en vivo, consulte [Testing live suites](/es/help/testing-live). Para la lista de verificación dedicada de validación de actualizaciones y complementos, consulte [Testing updates and plugins](/es/help/testing-updates-plugins).

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos categorías:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo correspondiente a la clave de perfil dentro de la imagen de Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando su directorio de configuración local, el espacio de trabajo y el archivo de entorno de perfil opcional. Los puntos de entrada locales coincidentes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker tienen por defecto un límite de pruebas rápidas menor para que un barrido completo de Docker siga siendo práctico:
  `test:docker:live-models` tiene por defecto `OPENCLAW_LIVE_MAX_MODELS=12`, y
  `test:docker:live-gateway` tiene por defecto `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Anule esas variables de entorno cuando
  explícitamente desee el escaneo exhaustivo más grande.
- `test:docker:all` compila la imagen Docker de live una vez a través de `test:docker:live-build`, empaqueta OpenClaw una vez como un tarball de npm a través de `scripts/package-openclaw-for-docker.mjs`, luego compila/reutiliza dos imágenes `scripts/e2e/Dockerfile`. La imagen básica es solo el ejecutor Node/Git para los carriles de instalación/actualización/dependencias de complementos; esos carriles montan el tarball precompilado. La imagen funcional instala el mismo tarball en `/app` para los carriles de funcionalidad de la aplicación compilada. Las definiciones de los carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. El agregado utiliza un planificador local ponderado: `OPENCLAW_DOCKER_ALL_PARALLELISM` controla las ranuras de procesos, mientras que los límites de recursos evitan que todos los carriles pesados de live, npm-install y multi-servicio se inicien a la vez. Si un solo carril es más pesado que los límites activos, el planificador aún puede iniciarlo cuando el grupo está vacío y luego lo mantiene ejecutándose solo hasta que la capacidad esté disponible nuevamente. Los valores predeterminados son 10 ranuras, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; ajuste `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` solo cuando el host de Docker tenga más espacio libre. El ejecutor realiza un preflicht de Docker de forma predeterminada, elimina los contenedores obsoletos de OpenClaw E2E, imprime el estado cada 30 segundos, almacena los tiempos de los carriles exitosos en `.artifacts/docker-tests/lane-timings.json` y usa esos tiempos para iniciar los carriles más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto de carriles ponderados sin compilar ni ejecutar Docker, o `node scripts/test-docker-all.mjs --plan-json` para imprimir el plan de CI para los carriles seleccionados, las necesidades de paquete/imagen y las credenciales.
- `Package Acceptance` es la puerta de enlace de paquetes nativa de GitHub para "¿funciona este archivo tar instalable como un producto?" Resuelve un paquete candidato desde `source=npm`, `source=ref`, `source=url` o `source=artifact`, lo carga como `package-under-test` y luego ejecuta los carriles E2E de Docker reutilizables contra ese archivo tar exacto en lugar de reempaquetar la referencia seleccionada. Los perfiles están ordenados por amplitud: `smoke`, `package`, `product` y `full`. Consulte [Testing updates and plugins](/es/help/testing-updates-plugins) para obtener información sobre el contrato de paquete/actualización/complemento, la matriz de supervivencia de actualización publicada, los valores predeterminados de lanzamiento y la clasificación de fallos.
- Las comprobaciones de compilación y lanzamiento ejecutan `scripts/check-cli-bootstrap-imports.mjs` después de tsdown. El guardia recorre el gráfico de construcción estático desde `dist/entry.js` y `dist/cli/run-main.js` y falla si el inicio previo al despacho importa dependencias de paquetes como Commander, prompt UI, undici o registro antes del despacho de comandos; también mantiene el fragmento de ejecución de la pasarela empaquetada dentro del presupuesto y rechaza las importaciones estáticas de rutas de pasarela frías conocidas. El humo de la CLI empaquetada también cubre la ayuda raíz, la ayuda de incorporación, la ayuda del doctor, el estado, el esquema de configuración y un comando de lista de modelos.
- La compatibilidad heredada de aceptación de paquetes está limitada a `2026.4.25` (`2026.4.25-beta.*` incluida). A través de ese límite, el arnés tolera solo lagunas en los metadatos del paquete enviado: entradas de inventario privado de QA omitidas, `gateway install --wrapper` faltante, archivos de parche faltantes en el accesorio git derivado del tarball, `update.channel` persistente faltante, ubicaciones de registros de instalación de complementos heredados, persistencia de registros de instalación del mercado faltante y migración de metadatos de configuración durante `plugins update`. Para paquetes posteriores a `2026.4.25`, esas rutas son fallos estrictos.
- Ejecutores de prueba de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` y `test:docker:config-reload` inician uno o más contenedores reales y verifican rutas de integración de alto nivel.

Los ejecutores Docker de modelos en vivo también montan (bind-mount) solo los directorios de autenticación de CLI necesarios (o todos los compatibles cuando la ejecución no se restringe), y luego los copian en el directorio home del contenedor antes de la ejecución para que OAuth de CLI externa pueda actualizar los tokens sin modificar el almacenamiento de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; cubre Claude, Codex y Gemini de forma predeterminada, con una cobertura estricta de Droid/OpenCode a través de `pnpm test:docker:live-acp-bind:droid` y `pnpm test:docker:live-acp-bind:opencode`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Prueba de humo de observabilidad: `pnpm qa:otel:smoke` es un carril privado de checkout de código fuente de QA. Intencionalmente no forma parte de los carriles de lanzamiento de Docker del paquete porque el archivo tar de npm omite el QA Lab.
- Prueba de humo en vivo de Open WebUI: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Prueba de humo de integración/canal/agente de tarball de npm: `pnpm test:docker:npm-onboard-channel-agent` instala el tarball empaquetado de OpenClaw globalmente en Docker, configura OpenAI a través de la referencia de entorno de integración más Telegram por defecto, ejecuta doctor y ejecuta un turno de agente simulado de OpenAI. Reutilice un tarball precompilado con `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la reconstrucción del host con `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, o cambie de canal con `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` o `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.

- Prueba de humo del recorrido del usuario de lanzamiento: `pnpm test:docker:release-user-journey` instala el tarball empaquetado de OpenClaw globalmente en un hogar limpio de Docker, ejecuta la integración, configura un proveedor simulado de OpenAI, ejecuta un turno de agente, instala/desinstala complementos externos, configura ClickClack contra un dispositivo local, verifica los mensajes salientes/entrantes, reinicia Gateway y ejecuta doctor.
- Prueba de humo de integración tipificada de lanzamiento: `pnpm test:docker:release-typed-onboarding` instala el tarball empaquetado, impulsa `openclaw onboard` a través de un TTY real, configura OpenAI como proveedor de referencia de entorno, verifica que no haya persistencia de clave sin procesar y ejecuta un turno de agente simulado.
- Prueba de humo de multimedia/memoria de lanzamiento: `pnpm test:docker:release-media-memory` instala el tarball empaquetado, verifica la comprensión de imágenes desde un archivo adjunto PNG, la salida de generación de imágenes compatible con OpenAI, la recuperación de búsqueda de memoria y la supervivencia de la recuperación a través del reinicio de Gateway.
- Prueba de humo del recorrido del usuario de actualización de lanzamiento: `pnpm test:docker:release-upgrade-user-journey` instala `openclaw@latest` por defecto, configura el estado del proveedor/complemento/ClickClack en el paquete publicado, actualiza al tarball candidato y luego vuelve a ejecutar el recorrido principal del agente/complemento/canal. Anule la línea base con `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>`.
- Prueba de humo del mercado de complementos de lanzamiento: `pnpm test:docker:release-plugin-marketplace` se instala desde un mercado de dispositivo local, actualiza el complemento instalado, lo desinstala y verifica que la CLI del complemento desaparezca con los metadatos de instalación eliminados.
- Smoke test de instalación de habilidad: `pnpm test:docker:skill-install` instala el tarball empaquetado de OpenClaw globalmente en Docker, deshabilita las instalaciones de archivos cargados en la configuración, resuelve el slug de habilidad de ClawHub actual en vivo desde la búsqueda, lo instala con `openclaw skills install` y verifica la habilidad instalada más los metadatos de origen/bloqueo de `.clawhub`.
- Smoke test de cambio de canal de actualización: `pnpm test:docker:update-channel-switch` instala el tarball empaquetado de OpenClaw globalmente en Docker, cambia del paquete `stable` a git `dev`, verifica que el canal persistido y el complemento funcionen después de la actualización, luego vuelve a cambiar al paquete `stable` y verifica el estado de la actualización.
- Smoke test de supervivencia de actualización: `pnpm test:docker:upgrade-survivor` instala el tarball empaquetado de OpenClaw sobre una instalación de usuario antigua y sucia con agentes, configuración de canal, listas de permitidos de complementos, estado de dependencias de complementos obsoleto y archivos de espacio de trabajo/sesión existentes. Ejecuta la actualización del paquete más un doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia una Gateway de bucle y verifica la preservación de configuración/estado más los presupuestos de inicio/estado.
- Smoke de actualización publicada del superviviente: `pnpm test:docker:published-upgrade-survivor` instala `openclaw@latest` por defecto, siembra archivos realistas de usuario existente, configura esa línea base con una receta de comando incorporada, valida la configuración resultante, actualiza esa instalación publicada al archivo tarball candidato, ejecuta el doctor de forma no interactiva, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle local y verifica los intents configurados, la preservación del estado, el inicio, `/healthz`, `/readyz` y los presupuestos de estado de RPC. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, solicite al programador agregado que expanda las líneas base locales exactas con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, y expanda los dispositivos con forma de issue con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` como `reported-issues`; el conjunto de issues reportados incluye `configured-plugin-installs` para la reparación automática de la instalación del plugin externo de OpenClaw. Package Acceptance expone esos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, resuelve tokens de meta línea base como `last-stable-4` o `all-since-2026.4.23`, y Full Release Validation expande la puerta del paquete de release-soak a `last-stable-4 2026.4.23 2026.5.2 2026.4.15` más `reported-issues`.
- Smoke de contexto de tiempo de ejecución de sesión: `pnpm test:docker:session-runtime-context` verifica la persistencia de la transcripción del contexto de tiempo de ejecución oculto más la reparación del doctor de las ramas de reescritura de prompt duplicadas afectadas.
- Smoke de instalación global de Bun: `bash scripts/e2e/bun-global-install-smoke.sh` empaqueta el árbol actual, lo instala con `bun install -g` en un hogar aislado y verifica que `openclaw infer image providers --json` devuelva proveedores de imágenes empaquetadas en lugar de colgarse. Reutilice un tarball precompilado con `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la compilación del host con `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` o copie `dist/` de una imagen Docker compilada con `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke: `bash scripts/test-install-sh-docker.sh` comparte una caché de npm entre sus contenedores root, update y direct-npm. Update smoke usa por defecto npm `latest` como línea base estable antes de actualizar al tarball candidato. Anule esto con `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` localmente, o con la entrada `update_baseline_version` del flujo de trabajo Install Smoke en GitHub. Las comprobaciones del instalador sin root mantienen una caché de npm aislada para que las entradas de caché propiedad de root no enmascaren el comportamiento de instalación local del usuario. Establezca `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` para reutilizar la caché root/update/direct-npm entre ejecuciones locales.
- Install Smoke CI omite la actualización global duplicada de direct-npm con `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1`; ejecute el script localmente sin ese entorno cuando se necesite cobertura directa de `npm install -g`.
- Agents delete shared workspace CLI smoke: `pnpm test:docker:agents-delete-shared-workspace` (script: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construye por defecto la imagen root Dockerfile, siembra dos agentes con un espacio de trabajo en un home de contenedor aislado, ejecuta `agents delete --json` y verifica JSON válido además del comportamiento del espacio de trabajo retenido. Reutilice la imagen install-smoke con `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (dos contenedores, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke: `pnpm test:docker:browser-cdp-snapshot` (script: `scripts/e2e/browser-cdp-snapshot-docker.sh`) construye la imagen E2E de origen más una capa de Chromium, inicia Chromium con CDP sin procesar, ejecuta `browser doctor --deep` y verifica que las instantáneas de rol CDP cubran las URLs de enlace, los elementos en los que se puede hacer clic promovidos por el cursor, las referencias iframe y los metadatos de los marcos.
- OpenAI Responses web_search minimal reasoning regression: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) ejecuta un servidor OpenAI simulado a través de Gateway, verifica que `web_search` eleve `reasoning.effort` de `minimal` a `low`, luego fuerza el rechazo del esquema del proveedor y comprueba que el detalle sin procesar aparezca en los registros de Gateway.
- Puente del canal MCP (Gateway con semilla + puente stdio + prueba de humo del marco de notificación raw de Claude): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Herramientas MCP del paquete Pi (servidor MCP stdio real + perfil Pi incrustado permitir/denegar prueba de humo): `pnpm test:docker:pi-bundle-mcp-tools` (script: `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Limpieza de MCP de Cron/subagente (Gateway real + desmontaje del hijo MCP stdio después de ejecuciones de cron aisladas y de subagente de un solo uso): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (prueba de humo de instalación/actualización para ruta local, `file:`, registro npm con dependencias elevadas, metadatos de paquete npm malformados, refs móviles de git, ClawHub kitchen-sink, actualizaciones del mercado y habilitación/inspección de paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  Establezca `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` para omitir el bloque de ClawHub, o anule el par de paquete/runtime predeterminado de kitchen-sink con `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` y `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sin `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, la prueba utiliza un servidor de accesorios local de ClawHub hermético.
- Prueba de humo de actualización de plugin sin cambios: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Prueba de humo de la matriz del ciclo de vida del plugin: `pnpm test:docker:plugin-lifecycle-matrix` instala el tarball empacado de OpenClaw en un contenedor vacío, instala un plugin npm, alterna habilitar/deshabilitar, lo actualiza y degrada a través de un registro npm local, elimina el código instalado y luego verifica que la desinstalación aún elimina el estado obsoleto mientras registra las métricas de RSS/CPU para cada fase del ciclo de vida.
- Prueba de humo de metadatos de recarga de configuración: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` cubre la prueba de humo de instalación/actualización para ruta local, `file:`, registro npm con dependencias elevadas, refs móviles de git, accesorios de ClawHub, actualizaciones del mercado y habilitación/inspección de paquete Claude. `pnpm test:docker:plugin-update` cubre el comportamiento de actualización sin cambios para los plugins instalados. `pnpm test:docker:plugin-lifecycle-matrix` cubre la instalación, habilitación, deshabilitación, actualización, degradación y desinstalación de código faltante de plugins npm con seguimiento de recursos.

Para precompilar y reutilizar manualmente la imagen funcional compartida:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Las anulaciones de imagen específicas de la suite, como `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, siguen prevaleciendo cuando se establecen. Cuando `OPENCLAW_SKIP_DOCKER_BUILD=1` apunta a una imagen compartida remota, los scripts la descargan si aún no está local. Las pruebas de Docker del código QR y del instalador mantienen sus propios Dockerfiles porque validan el comportamiento del paquete/instalación en lugar del tiempo de ejecución de la aplicación compilada compartida.

Los ejecutores Docker de modelos en vivo también montan la copia actual (checkout) en modo de solo lectura y la preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de tiempo de ejecución ligera mientras se ejecuta Vitest contra tu configuración y código fuente local exactos. El paso de preparación omite las cachés locales grandes y las salidas de compilación de la aplicación, tales como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y directorios de salida de Gradle o `.build` locales de la aplicación, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo del gateway no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que también pasa `OPENCLAW_LIVE_GATEWAY_*` cuando necesites limitar o excluir la cobertura en vivo del gateway en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de nivel superior: inicia un contenedor de gateway de OpenClaw con los endpoints HTTP compatibles con OpenAI habilitados, inicia un contenedor anclado de Open WebUI contra ese gateway, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. Establece `OPENWEBUI_SMOKE_MODE=models` para las comprobaciones de CI de ruta de lanzamiento que deben detenerse después del inicio de sesión y descubrimiento de modelos en Open WebUI, sin esperar una finalización de un modelo en vivo. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar extraer la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de arranque en frío. Este carril espera una clave de modelo en vivo utilizable. Proporciónala a través del entorno del proceso, perfiles de autenticación preparados, o un `OPENCLAW_PROFILE_FILE` explícito. Las ejecuciones exitosas imprimen una pequeña carga JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway con semilla, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envío saliente, y las notificaciones de canal y permisos estilo Claude sobre el puente MCP stdio real. La verificación de notaciones inspecciona los marcos MCP stdio sin procesar directamente, por lo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer. `test:docker:pi-bundle-mcp-tools` es determinista y no necesita una clave de modelo en vivo. Construye la imagen Docker del repositorio, inicia un servidor de sonda MCP stdio real dentro del contenedor, materializa ese servidor a través del tiempo de ejecución MCP integrado en el paquete Pi, ejecuta la herramienta, y luego verifica que `coding` y `messaging` mantengan las herramientas `bundle-mcp` mientras que `minimal` y `tools.deny: ["bundle-mcp"]` las filtran. `test:docker:cron-mcp-cleanup` es determinista y no necesita una clave de modelo en vivo. Inicia un Gateway con semilla con un servidor de sonda MCP stdio real, ejecuta un turno de cron aislado y un turno secundario único `/subagents spawn`, y luego verifica que el proceso secundario MCP salga después de cada ejecución.

Smoke test de lenguaje natural del hilo ACP manual (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de hilos ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` montado y cargado antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno cargadas desde `OPENCLAW_PROFILE_FILE`, usando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación externos de CLI
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación externos de CLI bajo `$HOME` se montan como solo lectura bajo `/host-auth...` y luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedor limitadas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anular manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none` o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para limitar la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen existente de `openclaw:local-live` para ejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacenamiento de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el aviso de verificación de nonce utilizado por el humo de Open WebUI
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI fijada

## Verificación de documentos

Ejecute verificaciones de documentos después de editarlos: `pnpm check:docs`.
Ejecute la validación completa de anclajes de Mintlify cuando también necesite verificaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "tubería real" sin proveedores reales:

- Llamada a herramientas de Gateway (mock de OpenAI, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada de herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente de gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de websocket y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad de agente (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad de agente":

- Llamada a herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan el cableado de la sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarla y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la continuidad del historial de sesión y los límites del entorno sandbox.

Las evaluaciones futuras deben mantenerse deterministas primero:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar llamadas a herramientas + orden, lecturas de archivos de habilidades y cableado de sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (uso frente a evitación, restricción, inyección de mensajes).
- Evaluaciones en vivo opcionales (opt-in, con restricciones de entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado se ajuste a su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de aserciones de forma y comportamiento. El carril `pnpm test` unit por defecto omite intencionalmente estos archivos de seam y smoke compartidos; ejecuta los comandos de contrato explícitamente cuando toques superficies compartidas de canal o proveedor.

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
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Cumplimiento de políticas de grupo

### Contratos de estado del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondas de estado del canal
- **registry** - Forma del registro de complementos

### Contratos del proveedor

Ubicados en `src/plugins/contracts/*.contract.test.ts`:

- **auth** - Contrato de flujo de autenticación
- **auth-choice** - Elección/selección de autenticación
- **catalog** - API del catálogo de modelos
- **discovery** - Descubrimiento de complementos
- **loader** - Carga de complementos
- **runtime** - Runtime del proveedor
- **shape** - Forma/interfaz del complemento
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (orientación)

Cuando corrijas un problema de proveedor/modelo descubierto en vivo:

- Agrega una regresión segura para CI si es posible (proveedor simulado/stub, o captura la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantén la prueba en vivo estrecha y opcional mediante variables de entorno
- Preferir apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error en la canalización de sesión/historial/herramientas de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada segura para CI de la puerta de enlace
- Salvaguarda de recorrido de SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo de muestra por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), y luego afirma que los ids de ejecución del segmento de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivo no clasificados para que las nuevas clases no puedan omitirse silenciosamente.

## Relacionado

- [Pruebas en vivo](/es/help/testing-live)
- [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins)
- [CI](/es/ci)
