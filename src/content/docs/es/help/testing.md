---
summary: "Kit de pruebas: suites unit/e2e/live, ejecutores Docker y lo que cubre cada prueba"
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
- [Canal de QA](/es/channels/qa-channel) - el complemento de transporte sintético utilizado por escenarios basados en repositorio.

Esta página cubre la ejecución de las suites de pruebas regulares y los ejecutores Docker/Parallels. La sección de ejecutores específicos de QA a continuación ([Ejecutores específicos de QA](#qa-specific-runners)) enumera las invocaciones concretas de `qa` y remite a las referencias anteriores.

</Note>

## Inicio rápido

La mayoría de los días:

- Puerta completa (esperado antes de enviar): `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Ejecución completa de suite local más rápida en una máquina con recursos: `pnpm test:max`
- Bucle de vigilancia directo de Vitest: `pnpm test:watch`
- La orientación directa de archivos ahora también enruta rutas de extensión/canal: `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Prefiere ejecuciones específicas primero cuando estás iterando en un solo fallo.
- Sitio de QA con respaldo de Docker: `pnpm qa:lab:up`
- Carril de QA con respaldo de VM Linux: `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Cuando tocas pruebas o quieres mayor confianza:

- Puerta de cobertura: `pnpm test:coverage`
- Suite E2E: `pnpm test:e2e`

Al depurar proveedores/modelos reales (requiere credenciales reales):

- Suite en vivo (modelos + sondas de herramientas/imágenes del gateway): `pnpm test:live`
- Apuntar a un archivo en vivo de forma silenciosa: `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Informes de rendimiento en tiempo de ejecución: enviar `OpenClaw Performance` con
  `live_openai_candidate=true` para un turno de agente `openai/gpt-5.5` real o
  `deep_profile=true` para artefactos de CPU/heap/traza de Kova. Las ejecuciones programadas diarias
  publican artefactos de carril de proveedor simulado, perfil profundo y GPT 5.5 en
  `openclaw/clawgrit-reports` cuando `CLAWGRIT_REPORTS_TOKEN` está configurado. El
  informe de proveedor simulado también incluye números de arranque del gateway a nivel de origen, memoria,
  presión de complementos, bucle hello-loop de modelo falso repetido y arranque de CLI.
- Barrido de modelo en vivo con Docker: `pnpm test:docker:live-models`
  - Cada modelo seleccionado ahora ejecuta un turno de texto más una pequeña sonda de estilo de lectura de archivos.
    Los modelos cuyos metadatos anuncian entrada `image` también ejecutan un pequeño turno de imagen.
    Desactive las sondas adicionales con `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` o
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` cuando esté aislando fallos del proveedor.
  - Cobertura de CI: `OpenClaw Scheduled Live And E2E Checks` diaria y `OpenClaw Release Checks` manual
    ambos llaman al flujo de trabajo reutilizable live/E2E con
    `include_live_suites: true`, que incluye trabajos matriciales separados de modelos live en Docker fragmentados por proveedor.
  - Para reejecuciones focalizadas de CI, despache `OpenClaw Live And E2E Checks (Reusable)`
    con `include_live_suites: true` y `live_models_only: true`.
  - Agregue nuevos secretos de proveedor de alta señal a `scripts/ci-hydrate-live-auth.sh`
    más `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` y sus
    llamadores programados/de lanzamiento.
- Humo de chat enlazado de Codex nativo: `pnpm test:docker:live-codex-bind`
  - Ejecuta un carril live en Docker contra la ruta del servidor de aplicaciones de Codex, enlaza un
    DM sintético de Slack con `/codex bind`, ejercita `/codex fast` y
    `/codex permissions`, y luego verifica una respuesta simple y un adjunto de imagen
    que se enrutan a través del enlace del complemento nativo en lugar de ACP.
- Humo del arnés del servidor de aplicaciones de Codex: `pnpm test:docker:live-codex-harness`
  - Ejecuta turnos de agente de gateway a través del arnés del servidor de aplicaciones de Codex propiedad del complemento,
    verifica `/codex status` y `/codex models`, y por defecto ejercita sondas de imagen,
    cron MCP, subagente y Guardian. Desactive la sonda del subagente con
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` cuando esté aislando otros fallos del
    servidor de aplicaciones de Codex. Para una verificación focalizada del subagente, desactive las otras sondas:
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Esto sale después de la sonda del subagente a menos que
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` esté establecido.
- Humo de instalación bajo demanda de Codex: `pnpm test:docker:codex-on-demand`
  - Instala el tarball empaquetado de OpenClaw en Docker, ejecuta el onboarding
    de la clave de API de OpenAI y verifica que el complemento Codex y la dependencia `@openai/codex`
    se descargaron bajo demanda en la raíz del proyecto npm gestionado.
- Humo de dependencia de herramientas de complemento live: `pnpm test:docker:live-plugin-tool`
  - Empaqueta un complemento de prueba con una dependencia real `slugify`, lo instala a través de
    `npm-pack:`, verifica la dependencia bajo la raíz del proyecto npm gestionado,
    y luego pide a un modelo en vivo de OpenAI que llame a la herramienta del complemento y devuelva el slug
    oculto.
- Prueba de humo del comando de rescate de Crestodian: `pnpm test:live:crestodian-rescue-channel`
  - Verificación de seguridad opcional (belt-and-suspenders) para la superficie del comando de rescate del canal de mensajes.
    Ejercita `/crestodian status`, pone en cola un cambio persistente del
    modelo, responde `/crestodian yes` y verifica la ruta de escritura de auditoría/configuración.
- Prueba de humo del planificador Docker de Crestodian: `pnpm test:docker:crestodian-planner`
  - Ejecuta Crestodian en un contenedor sin configuración con una Claude CLI falsa en `PATH`
    y verifica que el respaldo (fallback) del planificador difuso se traduzca en una escritura de configuración tipificada y auditada.
- Prueba de humo de la primera ejecución Docker de Crestodian: `pnpm test:docker:crestodian-first-run`
  - Comienza desde un directorio de estado OpenClaw vacío, verifica el punto de entrada de Crestodian de incorporación moderno,
    aplica escrituras de configuración/modelo/agente/complemento Discord + SecretRef,
    valida la configuración y verifica las entradas de auditoría. La misma ruta de configuración del Anillo 0
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
- `pnpm openclaw qa coverage --match <query>`
  - Busca IDs de escenarios, títulos, superficies, IDs de cobertura, referencias de docs, referencias de código,
    complementos y requisitos de proveedores, e imprime los objetivos de suite coincidentes.
  - Use esto antes de una ejecución de QA Lab cuando conoce el comportamiento tocado o la ruta del archivo
    pero no el escenario más pequeño. Es solo consultivo; aún elija mock,
    live, Multipass, Matrix, o transport proof según el comportamiento que se esté cambiando.
- `pnpm test:plugins:kitchen-sink-live`
  - Ejecuta el calvario del complemento Kitchen Sink en vivo de OpenAI a través de QA Lab. Instala
    el paquete externo Kitchen Sink, verifica el inventario de la superficie del SDK del complemento,
    sondea `/healthz` y `/readyz`, registra evidencia de CPU/RSS
    de la puerta de enlace, ejecuta un turno en vivo de OpenAI y verifica diagnósticos adversarios.
    Requiere autenticación en vivo de OpenAI como `OPENAI_API_KEY`. En sesiones de Testbox hidratadas
    obtiene automáticamente el perfil live-auth de Testbox cuando el asistente
    `openclaw-testbox-env` está presente.
- `pnpm test:gateway:cpu-scenarios`
  - Ejecuta el banco de pruebas de inicio de la puerta de enlace más un pequeño paquete de escenarios simulados del laboratorio de QA
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) y escribe un resumen combinado de observaciones de CPU
    bajo `.artifacts/gateway-cpu-scenarios/`.
  - Marca solo observaciones sostenidas de CPU activa por defecto (`--cpu-core-warn`
    más `--hot-wall-warn-ms`), por lo que los picos breves de inicio se registran como métricas
    sin parecer la regresión de fijación de la puerta de enlace de varios minutos.
  - Usa artefactos `dist` construidos; ejecute primero una compilación cuando el checkout no
    tenga ya una salida de tiempo de ejecución reciente.
- `pnpm openclaw qa suite --runner multipass`
  - Ejecuta el mismo conjunto de pruebas de QA dentro de una VM Linux desechable de Multipass.
  - Mantiene el mismo comportamiento de selección de escenarios que `qa suite` en el host.
  - Reutiliza los mismos indicadores de selección de proveedor/modelo que `qa suite`.
  - Las ejecuciones en vivo reenvían las entradas de autenticación de QA compatibles que son prácticas para el invitado:
    claves de proveedor basadas en entorno, la ruta de configuración del proveedor en vivo de QA, y `CODEX_HOME`
    cuando está presente.
  - Los directorios de salida deben permanecer bajo la raíz del repositorio para que el invitado pueda escribir de vuelta a través
    del espacio de trabajo montado.
  - Escribe el informe y resumen normal de QA más los registros de Multipass bajo
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Inicia el sitio de QA respaldado por Docker para el trabajo de QA estilo operador.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construye un tarball de npm desde el checkout actual, lo instala globalmente en
    Docker, ejecuta la incorporación no interactiva de claves de API de OpenAI, configura Telegram
    por defecto, verifica que el tiempo de ejecución del complemento empaquetado se cargue sin reparación
    de dependencias de inicio, ejecuta el doctor y ejecuta un turno de agente local contra un
    endpoint simulado de OpenAI.
  - Use `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` para ejecutar el mismo carril de instalación empaquetada
    con Discord.
- `pnpm test:docker:session-runtime-context`
  - Ejecuta una prueba de humo determinista de la aplicación construida en Docker para transcripciones de contexto de
    tiempo de ejecución incrustado. Verifica que el contexto de tiempo de ejecución oculto de OpenClaw se persista como un
    mensaje personalizado que no se muestra en lugar de filtrarse en el turno visible del usuario,
    luego siembra una sesión rota afectada JSONL y verifica
    que `openclaw doctor --fix` la reescriba a la rama activa con una copia de seguridad.
- `pnpm test:docker:npm-telegram-live`
  - Instala un candidato de paquete OpenClaw en Docker, ejecuta el onboarding del paquete instalado, configura Telegram a través de la CLI instalada y luego reutiliza el carril de QA de Telegram en vivo con ese paquete instalado como el SUT Gateway.
  - El contenedor monta solo el código fuente del arnés `qa-lab` desde el checkout; el paquete instalado posee `dist`, `openclaw/plugin-sdk` y el tiempo de ejecución del plugin incluido, por lo que el carril no mezcla los plugins del checkout actual en el paquete bajo prueba.
  - Por defecto es `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta`; establezca `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` o `OPENCLAW_CURRENT_PACKAGE_TGZ` para probar un tarball local resuelto en lugar de instalar desde el registro.
  - Usa las mismas credenciales de entorno de Telegram o la fuente de credenciales de Convex que `pnpm openclaw qa telegram`. Para la automatización de CI/release, establezca `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` más `OPENCLAW_QA_CONVEX_SITE_URL` y el secreto del rol. Si `OPENCLAW_QA_CONVEX_SITE_URL` y un secreto de rol de Convex están presentes en CI, el contenedor Docker selecciona Convex automáticamente.
  - El contenedor valida las credenciales de entorno de Telegram o Convex en el host antes del trabajo de construcción/instalación de Docker. Establezca `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1` solo cuando se depure deliberadamente la configuración previa a las credenciales.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` anula el `OPENCLAW_QA_CREDENTIAL_ROLE` compartido solo para este carril.
  - GitHub Actions expone este carril como el flujo de trabajo manual de mantenedor `NPM Telegram Beta E2E`. No se ejecuta al fusionar (merge). El flujo de trabajo usa el entorno `qa-live-shared` y los arrendamientos de credenciales de CI de Convex.
- GitHub Actions también expone `Package Acceptance` para prueba de producto paralela (side-run) contra un paquete candidato. Acepta una referencia confiable, especificación npm publicada, URL de tarball HTTPS más SHA-256, o artefacto de tarball de otra ejecución, carga el `openclaw-current.tgz` normalizado como `package-under-test` y luego ejecuta el planificador Docker E2E existente con perfiles de carril smoke, package, product, full o custom. Establezca `telegram_mode=mock-openai` o `live-frontier` para ejecutar el flujo de trabajo de QA de Telegram contra el mismo artefacto `package-under-test`.
  - Prueba de producto de la última versión beta:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La prueba exacta de URL de tarball requiere un resumen y utiliza la política de seguridad de URL pública:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Los espejos de tarball empresariales/privados utilizan una política explícita de fuente confiable:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` lee `.github/package-trusted-sources.json` de la referencia de flujo de trabajo confiable y no acepta credenciales de URL ni una omisión de red privada de entrada de flujo de trabajo. Si la política nombrada declara autenticación bearer, configure el secreto `OPENCLAW_TRUSTED_PACKAGE_TOKEN` fijo.

- La prueba de artefacto descarga un artefacto tarball de otra ejecución de Actions:

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Empaqueta e instala la compilación actual de OpenClaw en Docker, inicia el Gateway
    con OpenAI configurado y luego habilita los canales/complementos empaquetados mediante ediciones de
    configuración.
  - Verifica que el descubrimiento de configuración deje ausentes los complementos descargables no configurados,
    que la primera reparación del doctor configurada instale explícitamente cada complemento descargable
    faltante y que un segundo reinicio no ejecute la reparación de dependencias
    ocultas.
  - También instala una línea base de npm conocida anterior, habilita Telegram antes de ejecutar
    `openclaw update --tag <candidate>` y verifica que el doctor posterior a la actualización del candidato limpie los restos de dependencias de complementos heredados sin una
    reparación posterior a la instalación en el lado del arnés.
- `pnpm test:parallels:npm-update`
  - Ejecuta la prueba de actualización de instalación empaquetada nativa en los invitados de Parallels. Cada
    plataforma seleccionada primero instala el paquete de línea base solicitado, luego ejecuta
    el comando `openclaw update` instalado en el mismo invitado y verifica la
    versión instalada, el estado de actualización, la preparación de la puerta de enlace y un turno
    de agente local.
  - Use `--platform macos`, `--platform windows` o `--platform linux` mientras
    itera en un invitado. Use `--json` para la ruta del artefacto de resumen y
    el estado por carril.
  - El carril de OpenAI usa `openai/gpt-5.5` para la prueba de turno de agente en vivo por
    defecto. Pase `--model <provider/model>` o establezca
    `OPENCLAW_PARALLELS_OPENAI_MODEL` cuando valide deliberadamente otro
    modelo de OpenAI.
  - Envuelva las ejecuciones locales largas en un tiempo de espera del host para que los bloqueos del transporte de Parallels no
    consuman el resto de la ventana de pruebas:

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - El script escribe registros de carriles anidados bajo `/tmp/openclaw-parallels-npm-update.*`.
    Inspeccione `windows-update.log`, `macos-update.log` o `linux-update.log`
    antes de asumir que el envoltorio externo está colgado.
  - La actualización de Windows puede tardar de 10 a 15 minutos en el trabajo de doctor y actualización de paquetes posterior a la actualización en un invitado en frío; eso sigue siendo saludable cuando el registro de depuración npm anidado está avanzando.
  - No ejecute este envoltorio agregado en paralelo con carriles de pruebas humo individuales de Parallels macOS, Windows o Linux. Comparten el estado de la máquina virtual y pueden entrar en conflicto en la restauración de instantáneas, el servicio de paquetes o el estado de la puerta de enlace del invitado.
  - La prueba posterior a la actualización ejecuta la superficie del complemento empaquetado normal porque las fachadas de capacidad, como el habla, la generación de imágenes y la comprensión de medios, se cargan a través de las API de tiempo de ejecución empaquetadas, incluso cuando el turno del agente solo verifica una respuesta de texto simple.

- `pnpm openclaw qa aimock`
  - Inicia solo el servidor del proveedor AIMock local para pruebas de humo del protocolo directo.
- `pnpm openclaw qa matrix`
  - Ejecuta el carril de QA en vivo de Matrix contra un servidor doméstico Tuwunel respaldado por Docker desechable. Solo para descarga de código fuente: las instalaciones empaquetadas no envían `qa-lab`.
  - CLI completo, catálogo de perfiles/escenarios, variables de entorno y diseño de artefactos: [Matrix QA](/es/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Ejecuta el carril de QA en vivo de Telegram contra un grupo privado real utilizando los tokens del bot del controlador y del SUT desde el entorno.
  - Requiere `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` y `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. El id del grupo debe ser el id numérico del chat de Telegram.
  - Admite `--credential-source convex` para credenciales agrupadas compartidas. Use el modo de entorno por defecto, o configure `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` para optar por arrendamientos agrupados.
  - Los valores predeterminados cubren canary, filtrado de menciones, direccionamiento de comandos, `/status`, respuestas mencionadas de bot a bot y respuestas de comandos nativos principales. Los valores predeterminados de `mock-openai` también cubren regresiones de cadenas de respuestas deterministas y transmisión de mensajes finales de Telegram. Use `--list-scenarios` para sondas opcionales como `session_status`.
  - Sale con un valor distinto de cero cuando falla cualquier escenario. Use `--allow-failures` cuando
    desee artefactos sin un código de salida fallido.
  - Requiere dos bots distintos en el mismo grupo privado, con el bot SUT exponiendo un nombre de usuario de Telegram.
  - Para una observación estable de bot a bot, habilite el Modo de Comunicación Bot a Bot en `@BotFather` para ambos bots y asegúrese de que el bot controlador pueda observar el tráfico del bot del grupo.
  - Escribe un informe de QA de Telegram, un resumen y un artefacto de mensajes observados en `.artifacts/qa-e2e/...`. Los escenarios de respuesta incluyen RTT desde la solicitud de envío del controlador hasta la respuesta del SUT observada.

`Mantis Telegram Live` es el contenedor de evidencias de PR alrededor de este carril. Ejecuta la referencia candidata con credenciales de Telegram arrendadas por Convex, renderiza la transcripción de mensajes observados redactados en un navegador de escritorio Crabbox, registra evidencia MP4, genera un GIF recortado por movimiento, sube el paquete de artefactos y publica evidencias en línea de PR a través de la aplicación de GitHub Mantis cuando `pr_number` está establecido. Los mantenedores pueden iniciarlo desde la interfaz de usuario de Actions a través de `Mantis Scenario` (`scenario_id:
telegram-live`) o directamente desde un comentario de solicitud de extracción:

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` es el contenedor nativo agentic de Telegram Desktop antes/después para pruebas visuales de PR. Inícielo desde la interfaz de usuario de Actions con `instructions` de forma libre, a través de `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`), o desde un comentario de PR:

```text
@openclaw-mantis telegram desktop proof
```

El agente Mantis lee el PR, decide qué comportamiento visible en Telegram prueba el cambio, ejecuta el carril de pruebas de Telegram Desktop Crabbox de usuario real en las referencias de base y candidatas, itera hasta que los GIF nativos sean útiles, escribe un manifiesto `motionPreview` emparejado y publica la misma tabla GIF de 2 columnas a través de la aplicación de GitHub Mantis cuando `pr_number` está establecido.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Arrienda o reutiliza un escritorio Linux Crabbox, instala Telegram Desktop nativo, configura OpenClaw con un token de bot SUT de Telegram arrendado, inicia el gateway y registra evidencia de captura de pantalla/MP4 desde el escritorio VNC visible.
  - Por defecto es `--credential-source convex` para que los flujos de trabajo solo necesiten el secreto del broker de Convex. Use `--credential-source env` con las mismas variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop aún necesita un inicio de sesión/perfil de usuario. El token del bot configura solo OpenClaw. Usa `--telegram-profile-archive-env <name>` para un archivo de perfil `.tgz` en base64, o usa `--keep-lease` e inicia sesión manualmente a través de VNC una vez.
  - Escribe `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` y `telegram-desktop-builder.mp4` en el directorio de salida.

Los carriles de transporte en vivo (live transport lanes) comparten un contrato estándar para que los nuevos transportes no se desvíen; la matriz de cobertura por carril se encuentra en [Descripción general de QA → Cobertura de transporte en vivo](/es/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` es el conjunto sintético amplio y no forma parte de esa matriz.

### Credenciales compartidas de Telegram a través de Convex (v1)

Cuando `--credential-source convex` (o `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) está habilitado para
el QA de transporte en vivo, el laboratorio de QA adquiere un contrato exclusivo de un grupo respaldado por Convex, envía latidos a ese
contrato mientras el carril se está ejecutando y libera el contrato al apagar. El nombre de la sección es anterior
al soporte de Discord, Slack y WhatsApp; el contrato de arrendamiento se comparte entre tipos.

Andamio del proyecto Convex de referencia:

- `qa/convex-credential-broker/`

Variables de entorno requeridas:

- `OPENCLAW_QA_CONVEX_SITE_URL` (por ejemplo `https://your-deployment.convex.site`)
- Un secreto para el rol seleccionado:
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` para `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` para `ci`
- Selección del rol de credenciales:
  - CLI: `--credential-role maintainer|ci`
  - Valor predeterminado de entorno: `OPENCLAW_QA_CREDENTIAL_ROLE` (por defecto es `ci` en CI, `maintainer` en caso contrario)

Variables de entorno opcionales:

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (predeterminado `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (predeterminado `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (predeterminado `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (predeterminado `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (predeterminado `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de rastreo opcional)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permite URLs de retorno de bucle `http://` de Convex para desarrollo local solamente.

`OPENCLAW_QA_CONVEX_SITE_URL` debe usar `https://` en operación normal.

Los comandos de administrador del mantenedor (añadir/eliminar/listar pool) requieren
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` específicamente.

Auxiliares de CLI para mantenedores:

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Use `doctor` antes de las ejecuciones en vivo para verificar la URL del sitio Convex, secretos del intermediario,
prefijo del endpoint, tiempo de espera HTTP y accesibilidad de admin/lista sin imprimir
valores secretos. Use `--json` para salida legible por máquina en scripts y utilidades de CI.

Contrato de endpoint predeterminado (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`):

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
- `POST /admin/add` (solo secreto del mantenedor)
  - Solicitud: `{ kind, actorId, payload, note?, status? }`
  - Éxito: `{ status: "ok", credential }`
- `POST /admin/remove` (solo secreto del mantenedor)
  - Solicitud: `{ credentialId, actorId }`
  - Éxito: `{ status: "ok", changed, credential }`
  - Guardia de arrendamiento activo: `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (solo secreto del mantenedor)
  - Solicitud: `{ kind?, status?, includePayload?, limit? }`
  - Éxito: `{ status: "ok", credentials, count }`

Forma de carga útil para el tipo Telegram:

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` debe ser una cadena de ID de chat de Telegram numérica.
- `admin/add` valida esta forma para `kind: "telegram"` y rechaza cargas útiles malformadas.

Forma de carga útil para el tipo Telegram usuario real:

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` y `telegramApiId` deben ser cadenas numéricas.
- `tdlibArchiveSha256` y `desktopTdataArchiveSha256` deben ser cadenas hexadecimales SHA-256.
- `kind: "telegram-user"` está reservado para el flujo de trabajo de prueba de escritorio de Mantis Telegram. Los carriles genéricos del Laboratorio de QA no deben adquirirlo.

Cargas útiles multicanal validadas por el intermediario:

- Discord: `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp: `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Los carriles de Slack también pueden alquilar del grupo, pero la validación de la carga útil de Slack actualmente
vive en el ejecutor de QA de Slack en lugar del intermediario. Use
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`
para las filas de Slack.

### Añadir un canal a QA

La arquitectura y los nombres de los ayudantes de escenarios para nuevos adaptadores de canal viven en [Resumen de QA → Añadir un canal](/es/concepts/qa-e2e-automation#adding-a-channel). El mínimo exigible: implementar el ejecutor de transporte en la costura del host `qa-lab` compartido, declarar `qaRunners` en el manifiesto del complemento, montar como `openclaw qa <runner>` y escribir escenarios bajo `qa/scenarios/`.

## Suites de pruebas (qué se ejecuta dónde)

Piense en las suites como "realismo creciente" (y creciente inestabilidad/costo):

### Unidad / integración (predeterminado)

- Comando: `pnpm test`
- Configuración: las ejecuciones no dirigidas usan el conjunto de fragmentos `vitest.full-*.config.ts` y pueden expandir los fragmentos multiproyecto en configuraciones por proyecto para la programación paralela
- Archivos: inventarios principales/de unidad bajo `src/**/*.test.ts`, `packages/**/*.test.ts` y `test/**/*.test.ts`; las pruebas unitarias de la IU se ejecutan en el fragmento dedicado `unit-ui`
- Alcance:
  - Pruebas unitarias puras
  - Pruebas de integración en proceso (autenticación de puerta de enlace, enrutamiento, herramientas, análisis, configuración)
  - Regresiones deterministas para errores conocidos
- Expectativas:
  - Se ejecuta en CI
  - No se requieren claves reales
  - Debe ser rápido y estable
  - Las pruebas del cargador del resolvedor y de la superficie pública deben demostrar un amplio comportamiento de alternativa `api.js` y
    `runtime-api.js` con accesorios de complementos diminutos generados, no
    API de fuentes de complementos empaquetados reales. Las cargas de API de complementos reales pertenecen a
    suites de contrato/integración propiedad del complemento.

Política de dependencias nativas:

- Las instalaciones de pruebas predeterminadas omiten las compilaciones nativas opcionales de Discord opus. La voz de Discord usa `libopus-wasm` incluido, y `@discordjs/opus` permanece deshabilitado en `allowBuilds`, por lo que las pruebas locales y los carriles de Testbox no compilan el complemento nativo.
- Compare el rendimiento de opus nativo en el repositorio de referencia `libopus-wasm`, no en los bucles de instalación/prueba predeterminados de OpenClaw. No establezca `@discordjs/opus` en `true` en el `allowBuilds` predeterminado; eso hace que los bucles de instalación/prueba no relacionados compilen código nativo.

<AccordionGroup>
  <Accordion title="Proyectos, fragmentos y carriles con ámbito">

    - Sin orientación `pnpm test` ejecuta doce configuraciones de fragmentos más pequeñas (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) en lugar de un único proceso nativo gigante de proyecto raíz. Esto reduce el RSS pico en las máquinas cargadas y evita que el trabajo de auto-respuesta/extensión prive de recursos a suites no relacionadas.
    - `pnpm test --watch` todavía usa el gráfico de proyecto raíz `vitest.config.ts` nativo, porque un bucle de vigilancia multi-fragmento no es práctico.
    - `pnpm test`, `pnpm test:watch` y `pnpm test:perf:imports` dirigen objetivos explícitos de archivo/directorio a través de carriles con ámbito primero, por lo que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` evita pagar el impuesto de inicio completo del proyecto raíz.
    - `pnpm test:changed` expande las rutas git modificadas en carriles con ámbito baratos por defecto: ediciones directas de pruebas, archivos hermanos `*.test.ts`, asignaciones de origen explícitas y dependientes del gráfico de importación local. Las ediciones de configuración/configuración/paquete no ejecutan pruebas de forma amplia a menos que use explícitamente `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` es la puerta de verificación local inteligente normal para trabajos estrechos. Clasifica la diferencia en núcleo, pruebas de núcleo, extensiones, pruebas de extensión, aplicaciones, documentos, metadatos de lanzamiento, herramientas Docker en vivo y herramientas, y luego ejecuta los comandos de verificación de tipos, lint y guarda correspondientes. No ejecuta pruebas de Vitest; llame a `pnpm test:changed` o a `pnpm test <target>` explícito para la prueba de verificación. Los incrementos de versión solo de metadatos de lanzamiento ejecutan verificaciones de versión/configuración/dependencia raíz específicas, con un guardia que rechaza cambios de paquete fuera del campo de versión de nivel superior.
    - Las ediciones del arnés ACP de Docker en vivo ejecutan verificaciones enfocadas: sintaxis de shell para los scripts de autenticación de Docker en vivo y una ejecución en seco del programador de Docker en vivo. Los cambios `package.json` se incluyen solo cuando la diferencia se limita a `scripts["test:docker:live-*"]`; las ediciones de dependencia, exportación, versión y otras de superficie de paquete todavía usan los guardianes más amplios.
    - Las pruebas unitarias ligeras en importaciones de agentes, comandos, complementos, asistentes de auto-respuesta, `plugin-sdk` y áreas similares de utilidad pura se enrutan a través del carril `unit-fast`, que omite `test/setup-openclaw-runtime.ts`; los archivos con estado/pesados en tiempo de ejecución se mantienen en los carriles existentes.
    - Los archivos de origen de asistente seleccionados `plugin-sdk` y `commands` también asignan ejecuciones en modo modificado a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones de asistentes evitan volver a ejecutar la suite pesada completa para ese directorio.
    - `auto-reply` tiene depósitos dedicados para asistentes de núcleo de nivel superior, pruebas de integración `reply.*` de nivel superior y el subárbol `src/auto-reply/reply/**`. El CI divide aún más el subárbol de respuesta en fragmentos de agente-ejecutor, despacho y comandos/enrutamiento de estado, de modo que un depósito pesado en importaciones no sea dueño de la cola completa de Node.
    - El CI normal de PR/main omite intencionalmente el barrido por lotes de extensiones y el fragmento `agentic-plugins` solo de lanzamiento. La validación completa de lanzamiento envía el flujo de trabajo hijo separado `Plugin Prerelease` para esas suites pesadas en complementos/extensiones en los candidatos de lanzamiento.

  </Accordion>

  <Accordion title="Cobertura del runner integrado">

    - Cuando cambies las entradas de descubrimiento de herramientas de mensajes o el contexto de tiempo de ejecución de compactación, mantén ambos niveles de cobertura.
    - Añade regresiones de ayudantes enfocadas para los límites de enrutamiento puro y normalización.
    - Mantén las suites de integración del runner integrado saludables:
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`,
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts` y
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`.
    - Esas suites verifican que los ids con ámbito y el comportamiento de compactación aún fluyan
      a través de las rutas reales `run.ts` / `compact.ts`; las pruebas solo de ayudantes no son
      un sustituto suficiente para esas rutas de integración.

  </Accordion>

  <Accordion title="Grupo y aislamiento predeterminados de Vitest">

    - La configuración base de Vitest tiene por defecto `threads`.
    - La configuración compartida de Vitest fija `isolate: false` y utiliza el
      runner no aislado en los proyectos raíz, configuraciones e2e y live.
    - El carril de la interfaz de usuario raíz mantiene su configuración `jsdom` y su optimizador, pero también se ejecuta en el
      runner compartido no aislado.
    - Cada shard `pnpm test` hereda los mismos valores predeterminados `threads` + `isolate: false`
      de la configuración compartida de Vitest.
    - `scripts/run-vitest.mjs` añade `--no-maglev` para los procesos secundarios de Node de
      Vitest por defecto para reducir la sobrecarga de compilación de V8 durante ejecuciones locales grandes.
      Establece `OPENCLAW_VITEST_ENABLE_MAGLEV=1` para comparar con el comportamiento estándar de V8.
    - `scripts/run-vitest.mjs` termina las ejecuciones explícitas de Vitest sin vigilancia después
      de 5 minutos sin salida estándar ni de error. Establece
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` para desactivar el perro guardián para una
      investigación intencionalmente silenciosa.

  </Accordion>

  <Accordion title="Iteración local rápida">

    - `pnpm changed:lanes` muestra qué carriles arquitectónicos activa un diff.
    - El ganador de pre-commit es solo de formato. Vuelve a preparar los archivos formateados y
      no ejecuta lint, typecheck o pruebas.
    - Ejecute `pnpm check:changed` explícitamente antes de la entrega o el envío cuando
      necesite la puerta de verificación local inteligente.
    - `pnpm test:changed` se enruta a través de carriles con ámbito económico de forma predeterminada. Use
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` solo cuando el agente
      decida que una edición de arnés, configuración, paquete o contrato realmente necesita una cobertura
      más amplia de Vitest.
    - `pnpm test:max` y `pnpm test:changed:max` mantienen el mismo comportamiento de
      enrutamiento, solo con un límite de trabajadores más alto.
    - El escalado automático de trabajadores locales es intencionalmente conservador y se ralentiza
      cuando el promedio de carga del host ya es alto, por lo que múltiples ejecuciones
      concurrentes de Vitest causan menos daño de forma predeterminada.
    - La configuración base de Vitest marca los archivos de proyectos/configuración como
      `forceRerunTriggers` para que las reejecuciones en modo cambiado se mantengan correctas cuando cambia
      la conexión de las pruebas.
    - La configuración mantiene `OPENCLAW_VITEST_FS_MODULE_CACHE` habilitado en los hosts
      compatibles; configure `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si desea
      una ubicación de caché explícita para perfilar directamente.

  </Accordion>

  <Accordion title="Depuración de rendimiento">

    - `pnpm test:perf:imports` activa el informe de duración de importación de Vitest además
      de la salida de desglose de importación.
    - `pnpm test:perf:imports:changed` limita la misma vista de perfilado a
      los archivos modificados desde `origin/main`.
    - Los datos de tiempo de los fragmentos (shards) se escriben en `.artifacts/vitest-shard-timings.json`.
      Las ejecuciones de configuración completa usan la ruta de configuración como clave; los fragmentos de CI con patrones de inclusión
      añaden el nombre del fragmento para que los fragmentos filtrados puedan rastrearse
      por separado.
    - Cuando una prueba rápida todavía pasa la mayor parte de su tiempo en importaciones de inicio,
      mantenga las dependencias pesadas detrás de una costura `*.runtime.ts` local estrecha y
      simule esa costura directamente en lugar de importar profundamente los asistentes de tiempo de ejecución solo
      para pasarlos a través de `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compara las rutas
      `test:changed` con la ruta nativa del proyecto raíz para ese diff
      confirmado e imprime el tiempo de reloj además del RSS máximo de macOS.
    - `pnpm test:perf:changed:bench -- --worktree` evalúa el rendimiento del
      árbol sucio actual enrutando la lista de archivos modificados a través de
      `scripts/test-projects.mjs` y la configuración raíz de Vitest.
    - `pnpm test:perf:profile:main` escribe un perfil de CPU del hilo principal para
      la sobrecarga de inicio y transformación de Vitest/Vite.
    - `pnpm test:perf:profile:runner` escribe perfiles de CPU y montón del ejecutor para la
      suite unitaria con el paralelismo de archivos desactivado.

  </Accordion>
</AccordionGroup>

### Estabilidad (gateway)

- Comando: `pnpm test:stability:gateway`
- Configuración: `vitest.gateway.config.ts`, forzado a un trabajador
- Alcance:
  - Inicia un Gateway de bucle de retorno real con diagnósticos activados por defecto
  - Impulsa una carga sintética de mensajes, memoria y grandes cargas útiles a través de la ruta de eventos de diagnóstico
  - Consultas `diagnostics.stability` a través del Gateway WS RPC
  - Cubre los asistentes de persistencia del paquete de estabilidad de diagnóstico
  - Asegura que la grabadora permanezca limitada, que las muestras sintéticas de RSS se mantengan por debajo del presupuesto de presión y que las profundidades de la cola por sesión se vacíen de nuevo a cero
- Expectativas:
  - Seguro para CI y sin claves
  - Carril estrecho para el seguimiento de regresiones de estabilidad, no un sustituto de la suite completa de Gateway

### E2E (agregado de repositorio)

- Comando: `pnpm test:e2e`
- Alcance:
  - Ejecuta el carril E2E de prueba de humo del gateway
  - Ejecuta el carril E2E del navegador de Control UI simulado
- Expectativas:
  - Seguro para CI y sin claves
  - Requiere que Playwright Chromium esté instalado

### E2E (gateway smoke)

- Comando: `pnpm test:e2e:gateway`
- Configuración: `vitest.e2e.config.ts`
- Archivos: `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` y pruebas E2E de bundled-plugin bajo `extensions/`
- Valores predeterminados de tiempo de ejecución:
  - Usa Vitest `threads` con `isolate: false`, coincidiendo con el resto del repositorio.
  - Usa trabajadores adaptativos (CI: hasta 2, local: 1 de forma predeterminada).
  - Se ejecuta en modo silencioso de forma predeterminada para reducir la sobrecarga de E/S de la consola.
- anulaciones útiles:
- `OPENCLAW_E2E_WORKERS=<n>` para forzar el recuento de trabajadores (limitado a 16).
- `OPENCLAW_E2E_VERBOSE=1` para volver a habilitar la salida detallada de la consola.
- Alcance:
  - Comportamiento de extremo a extremo de la puerta de enlace de múltiples instancias
  - Superficies WebSocket/HTTP, emparejamiento de nodos y redes más pesadas
- Expectativas:
  - Se ejecuta en CI (cuando está habilitado en la canalización)
  - No se requieren claves reales
  - Más partes móviles que las pruebas unitarias (pueden ser más lentas)

### E2E (Control UI mocked browser)

- Comando: `pnpm test:ui:e2e`
- Configuración: `test/vitest/vitest.ui-e2e.config.ts`
- Archivos: `ui/src/**/*.e2e.test.ts`
- Alcance:
  - Inicia la interfaz de usuario de control de Vite
  - Conduce una página Chromium real a través de Playwright
  - Reemplaza el WebSocket de la puerta de enlace con simulacros deterministas en el navegador
- Expectativas:
  - Se ejecuta en CI como parte de `pnpm test:e2e`
  - No se requiere una puerta de enlace real, agentes o claves de proveedor
  - La dependencia del navegador debe estar presente (`pnpm --dir ui exec playwright install chromium`)

### E2E: OpenShell backend smoke

- Comando: `pnpm test:e2e:openshell`
- Archivo: `extensions/openshell/src/backend.e2e.test.ts`
- Alcance:
  - Inicia una puerta de enlace OpenShell aislada en el host mediante Docker
  - Crea un entorno sandbox a partir de un Dockerfile local temporal
  - Ejerce el backend de OpenShell de OpenClaw a través de `sandbox ssh-config` real + exec de SSH
  - Verifica el comportamiento del sistema de archivos canónico remoto a través del puente fs del sandbox
- Expectativas:
  - Solo opcional; no es parte de la ejecución `pnpm test:e2e` predeterminada
  - Requiere una CLI `openshell` local más un demonio Docker funcional
  - Usa `HOME` / `XDG_CONFIG_HOME` aislados, luego destruye la puerta de enlace y el sandbox de prueba
- Anulaciones útiles:
  - `OPENCLAW_E2E_OPENSHELL=1` para habilitar la prueba al ejecutar manualmente el conjunto e2e más amplio
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` para apuntar a un binario de CLI no predeterminado o a un script contenedor

### Live (proveedores reales + modelos reales)

- Comando: `pnpm test:live`
- Configuración: `vitest.live.config.ts`
- Archivos: `src/**/*.live.test.ts`, `test/**/*.live.test.ts` y pruebas en vivo de bundled-plugin bajo `extensions/`
- Predeterminado: **habilitado** por `pnpm test:live` (establece `OPENCLAW_LIVE_TEST=1`)
- Alcance:
  - "¿Este proveedor/modelo realmente funciona _hoy_ con credenciales reales?"
  - Detectar cambios en el formato del proveedor, peculiaridades de las llamadas a herramientas, problemas de autenticación y comportamiento de los límites de tasa
- Expectativas:
  - No es estable en CI por diseño (redes reales, políticas reales del proveedor, cuotas, interrupciones)
  - Cuesta dinero / usa límites de tasa
  - Prefiera ejecutar subconjuntos reducidos en lugar de "todo"
- Las ejecuciones en vivo utilizan claves de API ya exportadas y perfiles de autenticación preparados.
- De forma predeterminada, las ejecuciones en vivo aún aislan `HOME` y copian el material de configuración/autenticación en un directorio de prueba temporal para que los accesorios de unidad no puedan mutar su `~/.openclaw` real.
- Establezca `OPENCLAW_LIVE_USE_REAL_HOME=1` solo cuando necesite intencionalmente que las pruebas en vivo usen su directorio de inicio real.
- `pnpm test:live` tiene como valor predeterminado un modo más silencioso: mantiene la salida de progreso `[live] ...` y silencia los registros de arranque de la puerta de enlace y el ruido de Bonjour. Establezca `OPENCLAW_LIVE_TEST_QUIET=0` si desea recuperar los registros completos de inicio.
- Rotación de claves de API (específica del proveedor): establezca `*_API_KEYS` con formato de coma/punto y coma o `*_API_KEY_1`, `*_API_KEY_2` (por ejemplo `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) o anulación por prueba en vivo a través de `OPENCLAW_LIVE_*_KEY`; las pruebas se reintentan ante respuestas de límite de tasa.
- Salida de progreso/latido:
  - Los conjuntos en vivo ahora emiten líneas de progreso a stderr para que las llamadas largas al proveedor se vean activas incluso cuando la captura de consola de Vitest está silenciosa.
  - `vitest.live.config.ts` deshabilita la intercepción de la consola de Vitest para que las líneas de progreso del proveedor/puerta de enlace se transmitan inmediatamente durante las ejecuciones en vivo.
  - Ajuste los latidos de modelo directo con `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajuste los latidos de gateway/sonda con `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## ¿Qué suite debería ejecutar?

Use esta tabla de decisión:

- Editando lógica/pruebas: ejecute `pnpm test` (y `pnpm test:coverage` si cambió mucho)
- Tocando red del gateway / protocolo WS / emparejamiento: añada `pnpm test:e2e`
- Depurando "mi bot está caído" / fallos específicos del proveedor / llamadas a herramientas: ejecute una `pnpm test:live` reducida

## Pruebas en vivo (que tocan la red)

Para la matriz de modelos en vivo, pruebas de humo del backend CLI, pruebas de humo ACP, arnés del servidor de aplicaciones Codex y todas las pruebas en vivo de proveedores de medios (Deepgram, BytePlus, ComfyUI, imagen, música, video, arnés de medios), además del manejo de credenciales para ejecuciones en vivo, consulte [Testing live suites](/es/help/testing-live). Para la lista de verificación dedicada de actualización y validación de complementos, consulte [Testing updates and plugins](/es/help/testing-updates-plugins).

## Ejecutores de Docker (verificaciones opcionales de "funciona en Linux")

Estos ejecutores de Docker se dividen en dos grupos:

- Ejecutores de modelos en vivo: `test:docker:live-models` y `test:docker:live-gateway` ejecutan solo su archivo en vivo de clave de perfil correspondiente dentro de la imagen Docker del repositorio (`src/agents/models.profiles.live.test.ts` y `src/gateway/gateway-models.profiles.live.test.ts`), montando su directorio de configuración local, espacio de trabajo y archivo de entorno de perfil opcional. Los puntos de entrada locales coincidentes son `test:live:models-profiles` y `test:live:gateway-profiles`.
- Los ejecutores en vivo de Docker mantienen sus propios límites prácticos cuando es necesario:
  `test:docker:live-models` por defecto al conjunto curado compatible de alta señal, y
  `test:docker:live-gateway` por defecto a `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` y
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Establezca `OPENCLAW_LIVE_MAX_MODELS`
  o las variables de entorno del gateway cuando desee explícitamente un límite más pequeño o un escaneo más grande.
- `test:docker:all` compila la imagen de Docker en vivo una vez a través de `test:docker:live-build`, empaqueta OpenClaw una vez como un archivo tar npm a través de `scripts/package-openclaw-for-docker.mjs`, y luego compila/reutiliza dos imágenes `scripts/e2e/Dockerfile`. La imagen básica es solo el ejecutor de Node/Git para los carriles de instalación/actualización/dependencias de complementos; esos carriles montan el archivo tar precompilado. La imagen funcional instala el mismo archivo tar en `/app` para los carriles de funcionalidad de la aplicación compilada. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. El agregado utiliza un planificador local ponderado: `OPENCLAW_DOCKER_ALL_PARALLELISM` controla las ranuras de procesos, mientras que los límites de recursos evitan que los carriles pesados de live, npm-install y multi-servicio se inicien todos a la vez. Si un solo carril es más pesado que los límites activos, el planificador aún puede iniciarlo cuando el grupo está vacío y luego lo mantiene ejecutándose solo hasta que la capacidad esté disponible nuevamente. Los valores predeterminados son 10 ranuras, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; ajuste `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` solo cuando el host de Docker tenga más espacio libre. El ejecutor realiza un control previo de Docker de manera predeterminada, elimina los contenedores E2E de OpenClaw obsoletos, imprime el estado cada 30 segundos, almacena los tiempos de carril exitosos en `.artifacts/docker-tests/lane-timings.json` y usa esos tiempos para iniciar los carriles más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto de carril ponderado sin compilar ni ejecutar Docker, o `node scripts/test-docker-all.mjs --plan-json` para imprimir el plan de CI para los carriles seleccionados, necesidades de paquete/imagen y credenciales.
- `Package Acceptance` es la puerta de enlace de paquetes nativa de GitHub para "¿funciona este archivo tar instalable como un producto?" Resuelve un paquete candidato de `source=npm`, `source=ref`, `source=url` o `source=artifact`, lo carga como `package-under-test` y luego ejecuta los carriles Docker E2E reutilizables contra ese archivo tar exacto en lugar de reempaquetar la referencia seleccionada. Los perfiles se ordenan por amplitud: `smoke`, `package`, `product` y `full`. Consulte [Testing updates and plugins](/es/help/testing-updates-plugins) para obtener el contrato de paquete/actualización/complemento, la matriz de supervivientes de actualización publicada, los valores predeterminados de lanzamiento y la clasificación de fallos.
- Las comprobaciones de compilación y lanzamiento ejecutan `scripts/check-cli-bootstrap-imports.mjs` después de tsdown. El guardia recorre el gráfico de compilación estática desde `dist/entry.js` y `dist/cli/run-main.js` y falla si el inicio previo al despacho importa dependencias de paquetes como Commander, prompt UI, undici o registro antes del despacho de comandos; también mantiene el fragmento de ejecución de la pasarela empaquetada dentro del presupuesto y rechaza las importaciones estáticas de rutas conocidas de la pasarela en frío. El humo del CLI empaquetado también cubre la ayuda raíz, la ayuda de incorporación, la ayuda del doctor, el estado, el esquema de configuración y un comando de lista de modelos.
- La compatibilidad heredada de Package Acceptance está limitada a `2026.4.25` (`2026.4.25-beta.*` incluido). A través de ese límite, el arnés tolera solo lagunas en los metadatos del paquete enviado: entradas de inventario privado de QA omitidas, `gateway install --wrapper` faltantes, archivos de parche faltantes en el accesorio git derivado del tar, `update.channel` persistente faltante, ubicaciones heredadas de registros de instalación de complementos, persistencia de registros de instalación del mercado faltante y migración de metadatos de configuración durante `plugins update`. Para paquetes posteriores a `2026.4.25`, esas rutas son fallos estrictos.
- Ejecutores de pruebas de humo de contenedores: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:agent-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` y `test:docker:config-reload` inician uno o más contenedores reales y verifican rutas de integración de nivel superior.
- Carriles E2E Docker/Bash que instalan el paquete tarball de OpenClaw a través de `scripts/lib/openclaw-e2e-instance.sh` limitan `npm install` en `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` (por defecto `600s`; establezca `0` para desactivar el contenedor para depuración).

Los ejecutores Docker de modelos en vivo también montan solo los directorios de autenticación de CLI necesarios (o todos los soportados cuando la ejecución no se reduce), luego los copian en el directorio del contenedor antes de la ejecución para que OAuth de CLI externa pueda actualizar los tokens sin mutar el almacén de autenticación del host:

- Modelos directos: `pnpm test:docker:live-models` (script: `scripts/test-live-models-docker.sh`)
- Prueba de humo de enlace ACP: `pnpm test:docker:live-acp-bind` (script: `scripts/test-live-acp-bind-docker.sh`; cubre Claude, Codex y Gemini por defecto, con una cobertura estricta de Droid/OpenCode a través de `pnpm test:docker:live-acp-bind:droid` y `pnpm test:docker:live-acp-bind:opencode`)
- Prueba de humo del backend de CLI: `pnpm test:docker:live-cli-backend` (script: `scripts/test-live-cli-backend-docker.sh`)
- Prueba de humo del arnés del servidor de aplicaciones Codex: `pnpm test:docker:live-codex-harness` (script: `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agente de desarrollo: `pnpm test:docker:live-gateway` (script: `scripts/test-live-gateway-models-docker.sh`)
- Observability smokes: `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke`, y `pnpm qa:observability:smoke` son carriles privadas de checkout de código fuente de QA. Intencionalmente no son parte de los carriles de lanzamiento de Docker del paquete porque el tarball de npm omite QA Lab.
- Open WebUI live smoke: `pnpm test:docker:openwebui` (script: `scripts/e2e/openwebui-docker.sh`)
- Asistente de incorporación (TTY, andamiaje completo): `pnpm test:docker:onboard` (script: `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke: `pnpm test:docker:npm-onboard-channel-agent` instala el tarball empaquetado de OpenClaw globalmente en Docker, configura OpenAI a través de la incorporación por referencia de entorno y Telegram por defecto, ejecuta doctor y ejecuta un turno de agente de OpenAI simulado. Reutilice un tarball preconstruido con `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la reconstrucción del host con `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, o cambie de canal con `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` o `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.

- Release user journey smoke: `pnpm test:docker:release-user-journey` instala el tarball empaquetado de OpenClaw globalmente en un directorio home limpio de Docker, ejecuta la incorporación, configura un proveedor de OpenAI simulado, ejecuta un turno de agente, instala/desinstala complementos externos, configura ClickClack contra un dispositivo local, verifica los mensajes salientes/entrantes, reinicia Gateway y ejecuta doctor.
- Release typed onboarding smoke: `pnpm test:docker:release-typed-onboarding` instala el tarball empaquetado, impulsa `openclaw onboard` a través de un TTY real, configura OpenAI como proveedor de referencia de entorno, verifica que no haya persistencia de clave sin procesar y ejecuta un turno de agente simulado.
- Release media/memory smoke: `pnpm test:docker:release-media-memory` instala el tarball empaquetado, verifica la comprensión de imágenes desde un archivo adjunto PNG, la salida de generación de imágenes compatible con OpenAI, la recuperación de búsqueda de memoria y la supervivencia de la recuperación a través del reinicio de Gateway.
- Release upgrade user journey smoke: `pnpm test:docker:release-upgrade-user-journey` instala `openclaw@latest` por defecto, configura el estado del proveedor/complemento/ClickClack en el paquete publicado, actualiza al tarball candidato y luego vuelve a ejecutar el recorrido principal del agente/complemento/canal. Anule la línea base con `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>`.
- Prueba de humo del marketplace de lanzamiento de complementos: `pnpm test:docker:release-plugin-marketplace` instala desde un marketplace de accesorios local, actualiza el complemento instalado, lo desinstala y verifica que la CLI del complemento desaparezca con los metadatos de instalación eliminados.
- Prueba de humo de instalación de habilidades: `pnpm test:docker:skill-install` instala el archivo tarball OpenClaw empaquetado globalmente en Docker, deshabilita las instalaciones de archivos subidos en la configuración, resuelve el slug de la habilidad ClawHub en vivo actual desde la búsqueda, la instala con `openclaw skills install` y verifica la habilidad instalada más los metadatos de origen/bloqueo `.clawhub`.
- Prueba de humo de cambio de canal de actualización: `pnpm test:docker:update-channel-switch` instala el archivo tarball OpenClaw empaquetado globalmente en Docker, cambia del paquete `stable` a git `dev`, verifica el canal persistente y el funcionamiento del complemento después de la actualización, luego vuelve a cambiar al paquete `stable` y verifica el estado de la actualización.
- Prueba de humo de superviviente de actualización: `pnpm test:docker:upgrade-survivor` instala el archivo tarball OpenClaw empaquetado sobre un accesorio de usuario antiguo sucio con agentes, configuración de canal, listas de permitidos de complementos, estado de dependencia de complementos obsoleto y archivos de área de trabajo/sesión existentes. Ejecuta la actualización del paquete más un doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia una Gateway de bucle invertido y verifica la preservación de la configuración/estado más los presupuestos de inicio/estado.
- Publicado actualización survivor smoke: `pnpm test:docker:published-upgrade-survivor` instala `openclaw@latest` por defecto, inicializa archivos de usuarios existentes realistas, configura esa línea base con una receta de comandos predefinida, valida la configuración resultante, actualiza esa instalación publicada al paquete tar del candidato, ejecuta un doctor no interactivo, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle de retorno y verifica los intents configurados, la preservación del estado, el inicio, `/healthz`, `/readyz` y los presupuestos de estado de RPC. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, pida al planificador agregado que expanda las líneas base locales exactas con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` tales como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, y expanda las fixtures con forma de problema con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` tales como `reported-issues`; el conjunto de problemas reportados incluye `configured-plugin-installs` para la reparación automática de la instalación del plugin externo de OpenClaw. Aceptación de Paquetes expone esos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, resuelve tokens de meta línea base tales como `last-stable-4` o `all-since-2026.4.23`, y Validación de Lanzamiento Completo expande el puerta de paquetes de embebido de lanzamiento a `last-stable-4 2026.4.23 2026.5.2 2026.4.15` más `reported-issues`.
- Humo del contexto de tiempo de ejecución de la sesión: `pnpm test:docker:session-runtime-context` verifica la persistencia de la transcripción del contexto de tiempo de ejecución oculto más la reparación del doctor de las ramas de reescritura de mensajes duplicadas afectadas.
- Humo de instalación global de Bun: `bash scripts/e2e/bun-global-install-smoke.sh` empaqueta el árbol actual, lo instala con `bun install -g` en un hogar aislado y verifica que `openclaw infer image providers --json` devuelva proveedores de imágenes empaquetadas en lugar de colgar. Reutilice un paquete tar precompilado con `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, omita la compilación del host con `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` o copie `dist/` desde una imagen de Docker construida con `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke: `bash scripts/test-install-sh-docker.sh` comparte una caché de npm en sus contenedores root, update y direct-npm. Update smoke utiliza por defecto npm `latest` como base estable antes de actualizar al paquete tarball candidato. Anule esto con `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` localmente, o con la entrada `update_baseline_version` del flujo de trabajo Install Smoke en GitHub. Las comprobaciones del instalador no root mantienen una caché de npm aislada para que las entradas de caché propiedad de root no enmascaren el comportamiento de instalación local del usuario. Configure `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` para reutilizar la caché root/update/direct-npm en ejecuciones locales repetidas.
- Install Smoke CI omite la actualización global duplicada de direct-npm con `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1`; ejecute el script localmente sin esa variable de entorno cuando se necesite cobertura directa de `npm install -g`.
- Agents delete shared workspace CLI smoke: `pnpm test:docker:agents-delete-shared-workspace` (script: `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construye la imagen del Dockerfile raíz por defecto, inicializa dos agentes con un espacio de trabajo en un directorio home de contenedor aislado, ejecuta `agents delete --json` y verifica un JSON válido además del comportamiento del espacio de trabajo retenido. Reutilice la imagen install-smoke con `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (dos contenedores, WS auth + health): `pnpm test:docker:gateway-network` (script: `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke: `pnpm test:docker:browser-cdp-snapshot` (script: `scripts/e2e/browser-cdp-snapshot-docker.sh`) construye la imagen E2E de origen más una capa de Chromium, inicia Chromium con CDP sin procesar, ejecuta `browser doctor --deep` y verifica que las instantáneas de roles de CDP cubran las URL de los enlaces, los elementos clicables promovidos por el cursor, las referencias iframe y los metadatos de los marcos.
- OpenAI Responses web_search minimal reasoning regression: `pnpm test:docker:openai-web-search-minimal` (script: `scripts/e2e/openai-web-search-minimal-docker.sh`) ejecuta un servidor OpenAI simulado a través de Gateway, verifica que `web_search` eleve `reasoning.effort` de `minimal` a `low`, luego fuerza el rechazo del esquema del proveedor y comprueba que el detalle sin procesar aparezca en los registros de Gateway.
- Puente de canal MCP (Gateway sembrado + puente stdio + prueba de humo de marco de notificación Claude sin procesar): `pnpm test:docker:mcp-channels` (script: `scripts/e2e/mcp-channels-docker.sh`)
- Herramientas MCP del paquete OpenClaw (servidor MCP stdio real + perfil OpenClaw incrustado permitir/denegar prueba de humo): `pnpm test:docker:agent-bundle-mcp-tools` (script: `scripts/e2e/agent-bundle-mcp-tools-docker.sh`)
- Limpieza MCP de Cron/subagente (Gateway real + desmontaje del hijo MCP stdio después de ejecuciones cron aisladas y de subagente de un solo uso): `pnpm test:docker:cron-mcp-cleanup` (script: `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Complementos (prueba de humo de instalación/actualización para ruta local, `file:`, registro npm con dependencias elevadas, metadatos de paquete npm malformados, referencias móviles de git, ClawHub kitchen-sink, actualizaciones del mercado y habilitar/inspeccionar el paquete Claude): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)
  Establezca `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` para omitir el bloque ClawHub, o anule el par de paquete/ejecución predeterminado de kitchen-sink con `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` y `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sin `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, la prueba utiliza un servidor de accesorios local ClawHub hermético.
- Prueba de humo de actualización de complemento sin cambios: `pnpm test:docker:plugin-update` (script: `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Prueba de humo de matriz de ciclo de vida del complemento: `pnpm test:docker:plugin-lifecycle-matrix` instala el tarball OpenClaw empaquetado en un contenedor vacío, instala un complemento npm, alterna habilitar/deshabilitar, lo actualiza y degrada a través de un registro npm local, elimina el código instalado y luego verifica que la desinstalación aún elimina el estado obsoleto mientras registra las métricas de RSS/CPU para cada fase del ciclo de vida.
- Prueba de humo de metadatos de recarga de configuración: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` cubre la prueba de humo de instalación/actualización para la ruta local, `file:`, registro npm con dependencias elevadas, refs móviles de git, ClawHub fixtures, actualizaciones del marketplace y habilitación/inspección de Claude-bundle. `pnpm test:docker:plugin-update` cubre el comportamiento de actualización sin cambios para los plugins instalados. `pnpm test:docker:plugin-lifecycle-matrix` cubre la instalación, habilitación, deshabilitación, actualización, desactualización y desinstalación de código faltante del plugin npm con seguimiento de recursos.

Para precompilar y reutilizar manualmente la imagen funcional compartida:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Las invalidaciones de imagen específicas de la suite, como `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, tienen prioridad cuando se establecen. Cuando `OPENCLAW_SKIP_DOCKER_BUILD=1` apunta a una imagen compartida remota, los scripts la descargan si aún no está local. Las pruebas de Docker del instalador y del código QR mantienen sus propios Dockerfiles porque validan el comportamiento del paquete/instalación en lugar del tiempo de ejecución de la aplicación construida compartida.

Los ejecutores Docker de modelo en vivo también montan el checkout actual en modo de solo lectura y lo preparan en un directorio de trabajo temporal dentro del contenedor. Esto mantiene la imagen de ejecución ligera mientras ejecuta Vitest contra tu código fuente/configuración local exacta. El paso de preparación omite las grandes cachés locales y las salidas de compilación de la aplicación como `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, y `.build` locales de la aplicación o directorios de salida de Gradle, para que las ejecuciones en vivo de Docker no pasen minutos copiando artefactos específicos de la máquina. También establecen `OPENCLAW_SKIP_CHANNELS=1` para que las sondas en vivo del gateway no inicien trabajadores de canales reales de Telegram/Discord/etc. dentro del contenedor. `test:docker:live-models` todavía ejecuta `pnpm test:live`, así que pasa también `OPENCLAW_LIVE_GATEWAY_*` cuando necesites acotar o excluir la cobertura en vivo del gateway en ese carril de Docker. `test:docker:openwebui` es una prueba de humo de compatibilidad de alto nivel: inicia un contenedor de puerta de enlace OpenClaw con los puntos finales HTTP compatibles con OpenAI habilitados, inicia un contenedor Open WebUI anclado contra esa puerta de enlace, inicia sesión a través de Open WebUI, verifica que `/api/models` exponga `openclaw/default`, y luego envía una solicitud de chat real a través del proxy `/api/chat/completions` de Open WebUI. Establece `OPENWEBUI_SMOKE_MODE=models` para las comprobaciones de CI de ruta de lanzamiento que deben detenerse después del inicio de sesión y descubrimiento del modelo en Open WebUI, sin esperar una finalización del modelo en vivo. La primera ejecución puede ser notablemente más lenta porque Docker puede necesitar descargar la imagen de Open WebUI y Open WebUI puede necesitar finalizar su propia configuración de inicio en frío. Este carril espera una clave de modelo en vivo utilizable. Proporciónala a través del entorno del proceso, perfiles de autenticación preparados, o un `OPENCLAW_PROFILE_FILE` explícito. Las ejecuciones exitosas imprimen una pequeña carga útil JSON como `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` es intencionalmente determinista y no necesita una cuenta real de Telegram, Discord o iMessage. Inicia un contenedor Gateway con semilla, inicia un segundo contenedor que genera `openclaw mcp serve`, y luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envío saliente y las notificaciones de canal + permisos estilo Claude a través del puente stdio MCP real. La verificación de notaciones inspecciona los cuadros stdio MCP sin procesar directamente, por lo que la prueba de humo valida lo que el puente realmente emite, no solo lo que un SDK de cliente específico sucede a exponer. `test:docker:agent-bundle-mcp-tools` es determinista y no necesita una clave de modelo en vivo. Construye la imagen Docker del repositorio, inicia un servidor de sonda stdio MCP real dentro del contenedor, materializa ese servidor a través del tiempo de ejecución MCP del paquete OpenClaw incrustado, ejecuta la herramienta y luego verifica que `coding` y `messaging` mantengan las herramientas `bundle-mcp` mientras que `minimal` y `tools.deny: ["bundle-mcp"]` las filtran. `test:docker:cron-mcp-cleanup` es determinista y no necesita una clave de modelo en vivo. Inicia un Gateway con semilla con un servidor de sonda stdio MCP real, ejecuta un turno cron aislado y un turno hijo único `sessions_spawn`, y luego verifica que el proceso hijo MCP salga después de cada ejecución.

Prueba de humo manual de hilo en lenguaje plano de ACP (no CI):

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Mantenga este script para flujos de trabajo de regresión/depuración. Puede ser necesario nuevamente para la validación del enrutamiento de hilos de ACP, así que no lo elimine.

Variables de entorno útiles:

- `OPENCLAW_CONFIG_DIR=...` (predeterminado: `~/.openclaw`) montado en `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (predeterminado: `~/.openclaw/workspace`) montado en `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` montado y origen antes de ejecutar las pruebas
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` para verificar solo las variables de entorno obtenidas de `OPENCLAW_PROFILE_FILE`, usando directorios de configuración/espacio de trabajo temporales y sin montajes de autenticación de CLI externos
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (predeterminado: `~/.cache/openclaw/docker-cli-tools`) montado en `/home/node/.npm-global` para instalaciones de CLI en caché dentro de Docker
- Los directorios/archivos de autenticación de CLI externos bajo `$HOME` se montan como solo lectura bajo `/host-auth...`, luego se copian en `/home/node/...` antes de que comiencen las pruebas
  - Directorios predeterminados: `.minimax`
  - Archivos predeterminados: `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Las ejecuciones de proveedor reducidas montan solo los directorios/archivos necesarios inferidos de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Anule manualmente con `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, o una lista separada por comas como `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` para reducir la ejecución
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` para filtrar proveedores dentro del contenedor
- `OPENCLAW_SKIP_DOCKER_BUILD=1` para reutilizar una imagen `openclaw:local-live` existente para reejecuciones que no necesitan una reconstrucción
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` para asegurar que las credenciales provengan del almacén de perfiles (no del entorno)
- `OPENCLAW_OPENWEBUI_MODEL=...` para elegir el modelo expuesto por la puerta de enlace para la prueba de humo de Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` para anular el mensaje de verificación de nonce utilizado por el Open WebUI smoke
- `OPENWEBUI_IMAGE=...` para anular la etiqueta de imagen de Open WebUI fijada

## Cordura de documentos

Ejecuta comprobaciones de documentos después de editarlos: `pnpm check:docs`.
Ejecuta la validación completa de anclas de Mintlify cuando también necesites comprobaciones de encabezados en la página: `pnpm docs:check-links:anchors`.

## Regresión sin conexión (segura para CI)

Estas son regresiones de "canalización real" sin proveedores reales:

- Llamada de herramientas de Gateway (OpenAI simulado, gateway real + bucle de agente): `src/gateway/gateway.test.ts` (caso: "ejecuta una llamada de herramienta simulada de OpenAI de extremo a extremo a través del bucle de agente de gateway")
- Asistente de Gateway (WS `wizard.start`/`wizard.next`, escribe configuración + autenticación aplicada): `src/gateway/gateway.test.ts` (caso: "ejecuta el asistente a través de ws y escribe la configuración del token de autenticación")

## Evaluaciones de confiabilidad de agentes (habilidades)

Ya tenemos algunas pruebas seguras para CI que se comportan como "evaluaciones de confiabilidad de agentes":

- Llamada de herramientas simulada a través del gateway real + bucle de agente (`src/gateway/gateway.test.ts`).
- Flujos de extremo a extremo del asistente que validan la conexión de sesión y los efectos de configuración (`src/gateway/gateway.test.ts`).

Lo que aún falta para las habilidades (ver [Habilidades](/es/tools/skills)):

- **Toma de decisiones:** cuando las habilidades se enumeran en el mensaje, ¿el agente elige la habilidad correcta (o evita las irrelevantes)?
- **Cumplimiento:** ¿el agente lee `SKILL.md` antes de usarlo y sigue los pasos/argumentos requeridos?
- **Contratos de flujo de trabajo:** escenarios de múltiples turnos que afirman el orden de las herramientas, la persistencia del historial de sesión y los límites del espacio aislado.

Las evaluaciones futuras deben ser primero deterministas:

- Un ejecutor de escenarios que utiliza proveedores simulados para afirmar las llamadas a herramientas + el orden, las lecturas de archivos de habilidades y la conexión de sesión.
- Un pequeño conjunto de escenarios centrados en habilidades (usar frente a evitar, restricciones, inyección de mensajes).
- Evaluaciones en vivo opcionales (participación opcional, restringidas por entorno) solo después de que el conjunto seguro para CI esté en su lugar.

## Pruebas de contrato (forma de complemento y canal)

Las pruebas de contrato verifican que cada complemento y canal registrado cumpla con su contrato de interfaz. Iteran sobre todos los complementos descubiertos y ejecutan una suite de afirmaciones de forma y comportamiento. El carril `pnpm test` unit (unidad) predeterminado omite intencionalmente estos archivos compartidos de seam y smoke; ejecute los comandos de contrato explícitamente cuando toque superficies compartidas de canal o proveedor.

### Comandos

- Todos los contratos: `pnpm test:contracts`
- Solo contratos de canal: `pnpm test:contracts:channels`
- Solo contratos de proveedor: `pnpm test:contracts:plugins`

### Contratos de canal

Ubicados en `src/channels/plugins/contracts/*.contract.test.ts`:

- **plugin** - Forma básica del complemento (id, nombre, capacidades)
- **setup** - Contrato del asistente de configuración
- **session-binding** - Comportamiento de enlace de sesión
- **outbound-payload** - Estructura del payload del mensaje
- **inbound** - Manejo de mensajes entrantes
- **actions** - Manejadores de acciones del canal
- **threading** - Manejo del ID de hilo
- **directory** - API de directorio/lista
- **group-policy** - Aplicación de la política de grupo

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
- **runtime** - Tiempo de ejecución del proveedor
- **shape** - Forma/interfaz del complemento
- **wizard** - Asistente de configuración

### Cuándo ejecutar

- Después de cambiar las exportaciones o subrutas de plugin-sdk
- Después de agregar o modificar un complemento de canal o proveedor
- Después de refactorizar el registro o descubrimiento de complementos

Las pruebas de contrato se ejecutan en CI y no requieren claves de API reales.

## Agregar regresiones (guía)

Cuando corrija un problema de proveedor/modelo descubierto en vivo:

- Agregue una regresión segura para CI si es posible (proveedor simulado/stub, o capture la transformación exacta de la forma de la solicitud)
- Si es inherentemente solo en vivo (límites de tasa, políticas de autenticación), mantenga la prueba en vivo estrecha y opcional mediante variables de entorno
- Preferir apuntar a la capa más pequeña que detecte el error:
  - error de conversión/reproducción de solicitud del proveedor → prueba directa de modelos
  - error de canalización de sesión/historial/herramienta de la puerta de enlace → prueba de humo en vivo de la puerta de enlace o prueba simulada de la puerta de enlace segura para CI
- Guardrail de recorrido SecretRef:
  - `src/secrets/exec-secret-ref-id-parity.test.ts` deriva un objetivo muestreado por clase SecretRef a partir de los metadatos del registro (`listSecretTargetRegistryEntries()`), luego afirma que los ids de ejecución de segmentos de recorrido son rechazados.
  - Si añades una nueva familia de objetivos SecretRef `includeInPlan` en `src/secrets/target-registry-data.ts`, actualiza `classifyTargetClass` en esa prueba. La prueba falla intencionalmente en ids de objetivos no clasificados para que las nuevas clases no puedan omitirse silenciosamente.

## Relacionado

- [Pruebas en vivo](/es/help/testing-live)
- [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins)
- [IC](/es/ci)
