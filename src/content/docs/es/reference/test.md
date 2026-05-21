---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

- Kit de pruebas completo (suites, live, Docker): [Testing](/es/help/testing)
- Validación de paquetes de actualizaciones y complementos: [Testing updates and plugins](/es/help/testing-updates-plugins)

- `pnpm test:force`: Mata cualquier proceso de puerta de enlace (gateway) persistente que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de puerta de enlace aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Úselo cuando una ejecución previa de la puerta de enlace haya dejado el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite de unidades con cobertura de V8 (vía `vitest.unit.config.ts`). Este es un control de cobertura del carril de unidades predeterminado, no de cobertura de todos los archivos del repositorio completo. Los umbrales son del 70% para líneas/funciones/declaraciones y del 55% para ramas. Debido a que `coverage.all` es falso y los alcances de cobertura del carril predeterminado incluyen pruebas de unidad no rápidas con archivos fuente hermanos, el control mide el origen propiedad de este carril en lugar de cada importación transitiva que suceda a cargar.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos cambiados desde `origin/main`.
- `pnpm test:changed`: ejecución de pruebas cambiadas inteligente y económica. Ejecuta objetivos precisos desde ediciones directas de pruebas, archivos `*.test.ts` hermanos, mapeos de origen explícitos y el gráfico de importación local. Los cambios amplios/de configuración/de paquete se omiten a menos que se asignen a pruebas precisas.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`: ejecución de pruebas cambiadas amplia y explícita. Úselo cuando una edición de arnés de prueba/configuración/paquete debería volver al comportamiento de pruebas cambiadas más amplio de Vitest.
- `pnpm changed:lanes`: muestra los carriles arquitectónicos activados por el diff contra `origin/main`.
- `pnpm check:changed`: ejecuta el control de verificación de cambios inteligente para el diff contra `origin/main`. Ejecuta comandos de typecheck, lint y guard para los carriles arquitectónicos afectados, pero no ejecuta pruebas de Vitest. Use `pnpm test:changed` o `pnpm test <target>` explícito para la prueba de pruebas.
- Árboles de trabajo de Codex y linked/sparse checkouts: evita el `pnpm test*`, `pnpm check*` y `pnpm crabbox:run` local directo, a menos que hayas verificado que pnpm no reconciliará las dependencias. Para pruebas pequeñas de archivos explícitos, usa `node scripts/run-vitest.mjs <path-or-filter>`; para puertas modificadas o pruebas generales, usa `node scripts/crabbox-wrapper.mjs run --provider blacksmith-testbox ... --shell -- "pnpm check:changed"` para que pnpm se ejecute dentro de Testbox.
- `OPENCLAW_HEAVY_CHECK_LOCK_SCOPE=worktree <local-heavy-check command>`: mantiene la serialización de verificación pesada dentro del árbol de trabajo actual en lugar del directorio común de Git para comandos como `pnpm check:changed` y `pnpm test ...` dirigidos. Úsalo solo en hosts locales de alta capacidad cuando ejecutes intencionadamente comprobaciones independientes en árboles de trabajo vinculados.
- `pnpm test`: enruta objetivos de archivo/directorio explícitos a través de carriles de Vitest con ámbito. Las ejecuciones sin destino usan grupos de fragmentos fijos y se expanden a configuraciones hoja para ejecución paralela local; el grupo de extensión siempre se expande a las configuraciones de fragmentos por extensión en lugar de un único proceso gigante de proyecto raíz.
- Las ejecuciones del contenedor de pruebas terminan con un breve resumen de `[test] passed|failed|skipped ... in ...`. La línea de duración propia de Vitest permanece como el detalle por fragmento.
- Estado de prueba compartido de OpenClaw: usa `src/test-utils/openclaw-test-state.ts` de Vitest cuando una prueba necesita un `HOME`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`, fixture de configuración, espacio de trabajo, directorio de agente o almacén de perfiles de autenticación aislados.
- Auxiliares de E2E de proceso: usa `test/helpers/openclaw-test-instance.ts` cuando una prueba E2E a nivel de proceso de Vitest necesita un Gateway en ejecución, entorno CLI, captura de registros y limpieza en un solo lugar.
- Asistentes de E2E Docker/Bash: los lanes que hacen source de `scripts/lib/docker-e2e-image.sh` pueden pasar `docker_e2e_test_state_shell_b64 <label> <scenario>` al contenedor y decodificarlo con `scripts/lib/openclaw-e2e-instance.sh`; los scripts multi-hogar pueden pasar `docker_e2e_test_state_function_b64` y llamar a `openclaw_test_state_create <label> <scenario>` en cada flujo. Los llamadores de menor nivel pueden usar `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` para un fragmento de shell dentro del contenedor, o `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` para un archivo de entorno del host que pueda ser importado. El `--` antes de `create` evita que los tiempos de ejecución de Node más nuevos traten `--env-file` como un indicador de Node. Los lanes Docker/Bash que inician un Gateway pueden hacer source de `scripts/lib/openclaw-e2e-instance.sh` dentro del contenedor para la resolución del punto de entrada, el inicio simulado de OpenAI, el inicio en primer/plano plano del Gateway, sondas de preparación, exportación del estado del entorno, volcados de registros y limpieza de procesos.
- Las ejecuciones de shards completas, de extensión y de patrones de inclusión actualizan los datos de cronometraje local en `.artifacts/vitest-shard-timings.json`; las ejecuciones posteriores de toda la configuración utilizan esos tiempos para equilibrar los shards lentos y rápidos. Los shards de CI de patrones de inclusión añaden el nombre del shard a la clave de cronometraje, lo que mantiene visibles los tiempos de los shards filtrados sin reemplazar los datos de cronometraje de toda la configuración. Establezca `OPENCLAW_TEST_PROJECTS_TIMINGS=0` para ignorar el artefacto de cronometraje local.
- Los archivos de prueba seleccionados `plugin-sdk` y `commands` ahora se enrutan a través de lanes ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos de uso intensivo de tiempo de ejecución en sus lanes existentes.
- Los archivos de origen con pruebas hermanas se asignan a ese hermano antes de recurrir a globbs de directorios más amplios. Las ediciones de asistentes bajo `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` y `src/plugins/contracts` utilizan un gráfico de importación local para ejecutar las pruebas de importación en lugar de ejecutar ampliamente cada shard cuando la ruta de dependencia es precisa.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/asistentes de nivel superior.
- La configuración base de Vitest ahora usa por defecto `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` y `pnpm test extensions` ejecutan todos los shards de extensiones/complementos. Los complementos de canal pesado, el complemento del navegador y OpenAI se ejecutan como shards dedicados; otros grupos de complementos permanecen agrupados. Use `pnpm test extensions/<id>` para un carril de complementos agrupado.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest, mientras todavía usa el enrutamiento de carril con ámbito para objetivos de archivo/directorio explícitos.
- `pnpm test:perf:imports:changed`: el mismo perfilado de importación, pero solo para archivos cambiados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara el rendimiento de la ruta en modo cambiado enrutado con la ejecución del proyecto raíz nativo para el mismo diff de git confirmado.
- `pnpm test:perf:changed:bench -- --worktree` compara el rendimiento del conjunto de cambios del árbol de trabajo actual sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el hilo principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + heap para el ejecutor de unitarios (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: ejecuta cada configuración hoja de Vitest de suite completa en serie y escribe datos de duración agrupados más artefactos JSON/registros por configuración. El Agente de Rendimiento de Pruebas usa esto como su línea base antes de intentar correcciones de pruebas lentas.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: compara los informes agrupados después de un cambio centrado en el rendimiento.
- Integración de Gateway: participación a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de Gateway (emparejamiento WS/HTTP/nodo de múltiples instancias). Por defecto es `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajuste con `OPENCLAW_E2E_WORKERS=<n>` y establezca `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específicas del proveedor) para no omitirlas.
- `pnpm test:docker:all`: Construye la imagen compartida de pruebas en vivo, empaqueta OpenClaw una vez como un archivo tar npm, construye/reutiliza una imagen básica de ejecución Node/Git más una imagen funcional que instala ese archivo tar en `/app`, y luego ejecuta carriles de pruebas de humo de Docker con `OPENCLAW_SKIP_DOCKER_BUILD=1` a través de un planificador ponderado. La imagen básica (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) se usa para carriles de instalador/actualización/dependencias de complementos; esos carriles montan el archivo tar preconstruido en lugar de usar fuentes de repositorio copiadas. La imagen funcional (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) se usa para carriles de funcionalidad de aplicación construida normal. `scripts/package-openclaw-for-docker.mjs` es el único empaquetador de paquetes local/CI y valida el archivo tar más `dist/postinstall-inventory.json` antes de que Docker lo consuma. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. `node scripts/test-docker-all.mjs --plan-json` emite el plan de CI propiedad del planificador para los carriles seleccionados, tipos de imagen, necesidades de paquete/imagen en vivo, escenarios de estado y verificaciones de credenciales sin construir ni ejecutar Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` controla las ranuras de proceso y el valor predeterminado es 10; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` controla el grupo de cola sensible al proveedor y el valor predeterminado es 10. Los límites de carriles pesados tienen como valor predeterminado `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; los límites del proveedor tienen como valor predeterminado un carril pesado por proveedor a través de `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` y `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Use `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` para hosts más grandes. Si un carril excede el peso efectivo o el límite de recursos en un host de baja paralelismo, aún puede comenzar desde un grupo vacío y se ejecutará solo hasta que libere capacidad. Los inicios de los carriles se escalonan 2 segundos de forma predeterminada para evitar tormentas de creación del demonio local de Docker; anule con `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. El ejecutor realiza una comprobación previa de Docker de forma predeterminada, limpia contenedores obsoletos de OpenClaw E2E, emite el estado del carril activo cada 30 segundos, comparte cachés de herramientas CLI del proveedor entre carriles compatibles, reintentará fallos transitorios del proveedor en vivo una vez de forma predeterminada (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) y almacena los tiempos de los carriles en `.artifacts/docker-tests/lane-timings.json` para un ordenamiento de los más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto del carril sin ejecutar Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` para ajustar la salida de estado, o `OPENCLAW_DOCKER_ALL_TIMINGS=0` para deshabilitar la reutilización de tiempos. Use `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` solo para carriles deterministas locales o `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` solo para carriles de proveedores en vivo; los alias de paquetes son `pnpm test:docker:local:all` y `pnpm test:docker:live:all`. El modo solo en vivo fusiona los carriles en vivo principales y de cola en un solo grupo de los más largos primero para que los cubos del proveedor puedan empaquetar el trabajo de Claude, Codex y Gemini juntos. El ejecutor deja de programar nuevos carriles agrupados después del primer fallo a menos que se establezca `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`, y cada carril tiene un tiempo de espera de reserva de 120 minutos anulable con `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`; los carriles en vivo/de cola seleccionados usan límites más estrictos por carril. Los comandos de configuración de Docker del backend de CLI tienen su propio tiempo de espera a través de `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (predeterminado 180). Los registros por carril, `summary.json`, `failures.json` y los tiempos de fase se escriben en `.artifacts/docker-tests/<run-id>/`; use `pnpm test:docker:timings <summary.json>` para inspeccionar los carriles lentos y `pnpm test:docker:rerun <run-id|summary.json|failures.json>` para imprimir comandos de repetición dirigidos económicos.
- `pnpm test:docker:browser-cdp-snapshot`: Construye un contenedor E2E de origen respaldado por Chromium, inicia CDP sin procesar más un Gateway aislado, ejecuta `browser doctor --deep` y verifica que las instantáneas de roles de CDP incluyan URL de enlace, elementos interactivos promovidos por el cursor, referencias de iframe y metadatos de trama.
- `pnpm test:docker:skill-install`: Instala el archivo tar empaquetado de OpenClaw en un ejecutor Docker vacío, deshabilita `skills.install.allowUploadedArchives`, resuelve un slug de habilidad actual desde la búsqueda en vivo de ClawHub, lo instala a través de `openclaw skills install` y verifica `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` y `skills info --json`.
- Las sondas en vivo del backend de CLI en Docker se pueden ejecutar como carriles centrados, por ejemplo `pnpm test:docker:live-cli-backend:claude`, `pnpm test:docker:live-cli-backend:claude:resume` o `pnpm test:docker:live-cli-backend:claude:mcp`. Gemini tiene alias `:resume` y `:mcp` coincidentes.
- `pnpm test:docker:openwebui`: Inicia OpenClaw en Docker + Open WebUI, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat real con proxy a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable, extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales de unidad/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway con semilla y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envíos salientes y las notificaciones de canal y permisos de estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP de stdio sin procesar directamente, por lo que la prueba de humo refleja lo que el puente realmente emite.
- `pnpm test:docker:upgrade-survivor`: Instala el archivo tar empaquetado de OpenClaw sobre un accesorio de usuario antiguo sucio, ejecuta la actualización del paquete más el doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia un Gateway de bucle invertido y verifica que los agentes, la configuración del canal, las listas de permitidos de plugins, los archivos de espacio de trabajo/sesión, el estado de dependencia de plugins heredados obsoletos, el inicio y el estado de RPC sobrevivan.
- `pnpm test:docker:published-upgrade-survivor`: Instala `openclaw@latest` de forma predeterminada, siembra archivos de usuario existentes realistas sin claves de proveedor o canal en vivo, configura esa línea base con una receta de comando `openclaw config set` integrada, actualiza esa instalación publicada al tarball OpenClaw empaquetado, ejecuta un doctor no interactivo, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle de retorno y verifica que los intents configurados, los archivos de espacio de trabajo/sesión, la configuración de complementos obsoleta y el estado de dependencias heredado, el inicio, `/healthz`, `/readyz` y el estado de RPC sobrevivan o se reparen limpiamente. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, expanda una matriz local exacta con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, o agregue accesorios de escenarios con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues`; el conjunto de problemas reportados incluye `configured-plugin-installs` para verificar que los complementos externos de OpenClaw configurados se instalen automáticamente durante la actualización y `stale-source-plugin-shadow` para evitar que las sombras de complementos solo fuente interrumpan el inicio. La Aceptación de Paquetes expone estos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, y resuelve tokens de metalínea base como `last-stable-4` o `all-since-2026.4.23` antes de pasar especificaciones de paquetes exactas a los carriles de Docker.
- `pnpm test:docker:update-migration`: Ejecuta el arnés de supervivencia de actualización publicada en el escenario `plugin-deps-cleanup` de mucha limpieza, comenzando en `openclaw@2026.4.23` de forma predeterminada. El flujo de trabajo separado `Update Migration` amplía este carril con `baselines=all-since-2026.4.23` para que cada paquete publicado estable desde `.23` en adelante se actualice al candidato y demuestre la limpieza de dependencias de complementos configurados fuera de la CI de Lanzamiento Completo.
- `pnpm test:docker:plugins`: Ejecuta una prueba de humo de instalación/actualización para ruta local, `file:`, paquetes de registro npm con dependencias elevadas, referencias móviles de git, accesorios de ClawHub, actualizaciones del mercado y habilitación/inspección de paquetes Claude.

## Portero de PR local

Para las comprobaciones de aterrizaje/portero de PR locales, ejecute:

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla en un host cargado, vuelva a ejecutarlo una vez antes de tratarlo como una regresión, luego aíslelo con `pnpm test <path/to/test>`. Para hosts con memoria limitada, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Bench de latencia del modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: "Responde con una sola palabra: ok. Sin puntuación ni texto extra."

Última ejecución (2025-12-31, 20 ejecuciones):

- minimax mediana 1279ms (min 1114, max 2431)
- opus mediana 2454ms (min 1224, max 3170)

## Bench de inicio de CLI

Script: [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Uso:

- `pnpm test:startup:bench`
- `pnpm test:startup:bench:smoke`
- `pnpm test:startup:bench:save`
- `pnpm test:startup:bench:update`
- `pnpm test:startup:bench:check`
- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --case gatewayStatus --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case tasksJson --case tasksListJson --case tasksAuditJson --runs 3`
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Presets:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos preajustes

La salida incluye `sampleCount`, promedio, p50, p95, min/máx, distribución de código de salida/señal, y resúmenes de RSS máximo para cada comando. Opcionalmente, `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la medición de tiempo y la captura de perfiles utilicen el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de prueba de humo seleccionado en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el accesorio de línea base confirmado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Accesorio confirmado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales contra el accesorio con `pnpm test:startup:bench:check`

## Benchmark de inicio de Gateway

Script: [`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

El benchmark utiliza por defecto la entrada CLI compilada en `dist/entry.js`; ejecute
`pnpm build` antes de usar los comandos de package-script. Para medir en su lugar
el ejecutor de origen, pase `--entry scripts/run-node.mjs` y mantenga esos resultados
separados de las líneas base de entrada compilada.

Uso:

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

Ids de casos:

- `default`: inicio normal de Gateway.
- `skipChannels`: inicio de Gateway con el inicio del canal omitido.
- `oneInternalHook`: un gancho interno configurado.
- `allInternalHooks`: todos los ganchos internos.
- `fiftyPlugins`: 50 complementos de manifiesto.
- `fiftyStartupLazyPlugins`: 50 complementos de manifiesto startup-lazy.

La salida incluye la primera salida del proceso, `/healthz`, `/readyz`, la hora del registro de escucha HTTP,
la hora del registro listo de Gateway, el tiempo de CPU, la relación de núcleos de CPU, RSS máximo, heap, métricas de
traza de inicio, retraso del bucle de eventos y métricas detalladas de la tabla de búsqueda de complementos. El script
habilita `OPENCLAW_GATEWAY_STARTUP_TRACE=1` en el entorno secundario de Gateway.

Lea `/healthz` como liveness: el servidor HTTP puede responder. Lea `/readyz` como
readiness utilizable: los sidecars de complementos de inicio, los canales y el trabajo post-adjunto
crítico para la disponibilidad se han asentado. Los ganchos de inicio de Gateway se envían
de forma asíncrona y no forman parte de la garantía de readiness. La hora del registro listo es la
marca de tiempo del registro listo interno de Gateway; es útil para la atribución
del lado del proceso, pero no es un sustituto de la sonda externa `/readyz`.

Use JSON output o `--output` al comparar cambios. Use `--cpu-prof-dir` solo
after el trace output apunta a import, compile, o CPU-bound work que cannot
be explained from phase timings alone. No compare source-runner results con
built `dist/entry.js` results as the same baseline.

## Gateway restart bench

Script: [`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

El benchmark de reinicio es compatible solo con macOS y Linux. Utiliza SIGUSR1 para
reinicios en proceso y falla inmediatamente en Windows.

El benchmark por defecto usa la entrada CLI construida en `dist/entry.js`; ejecute
`pnpm build` antes de usar los comandos de package-script. Para medir el source
runner en su lugar, pase `--entry scripts/run-node.mjs` y mantenga esos resultados
separados de las líneas base de entrada construida.

Uso:

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

Case ids:

- `skipChannels`: reinicio con canales omitidos.
- `skipChannelsAcpxProbe`: reinicio con canales omitidos y sonda de inicio ACPX activada.
- `skipChannelsNoAcpxProbe`: reinicio con canales omitidos y sonda de inicio ACPX desactivada.
- `default`: reinicio normal.
- `fiftyPlugins`: reinicio con 50 complementos de manifiesto.

La salida incluye el siguiente `/healthz`, el siguiente `/readyz`, tiempo de inactividad, tiempo de preparación de reinicio,
CPU, RSS, métricas de traza de inicio para el proceso de reemplazo y métricas de traza de reinicio
para el manejo de señales, drenaje de trabajo activo, fases de cierre, siguiente inicio, tiempo de
preparación e instantáneas de memoria. El script habilita
`OPENCLAW_GATEWAY_STARTUP_TRACE=1` y `OPENCLAW_GATEWAY_RESTART_TRACE=1` en el
entorno secundario de Gateway.

Utilice este punto de referencia cuando un cambio afecte a las señales de reinicio, a los manejadores de cierre, al inicio tras el reinicio, al apagado del sidecar, a la entrega del servicio o a la disponibilidad tras el reinicio. Comience con `skipChannels` cuando aisle los mecanismos de Gateway del inicio del canal. Utilice `default` o casos con muchos complementos solo después de que el caso estrecho explique la ruta de reinicio.

Las métricas de rastreo son pistas de atribución, no veredictos. Un cambio de reinicio debe juzgarse a partir de varias muestras, del span del propietario coincidente, del comportamiento de `/healthz` y `/readyz`, y del contrato de reinicio visible para el usuario.

## Onboarding E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humeo de integración en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script controla el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión y luego inicia el gateway y ejecuta `openclaw health`.

## Prueba de humeo de importación QR (Docker)

Asegura que el asistente de tiempo de ejecución de QR mantenido se cargue en los tiempos de ejecución de Docker Node compatibles (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```

## Relacionado

- [Pruebas](/es/help/testing)
- [Pruebas en vivo](/es/help/testing-live)
- [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins)
