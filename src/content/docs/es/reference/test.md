---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

- Kit de pruebas completo (suites, en vivo, Docker): [Testing](/es/help/testing)
- Validación de paquetes de actualizaciones y plugins: [Testing updates and plugins](/es/help/testing-updates-plugins)

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
- Control UI mocked E2E: use `pnpm test:ui:e2e` para el carril de Vitest + Playwright que inicia la Vite Control UI y controla una página Chromium real contra un Gateway WebSocket simulado. Las pruebas viven en `ui/src/**/*.e2e.test.ts`; los mocks compartidos y controles viven en `ui/src/test-helpers/control-ui-e2e.ts`. `pnpm test:e2e` incluye este carril. En los árboles de trabajo de Codex, prefiera `node scripts/run-vitest.mjs run --config test/vitest/vitest.ui-e2e.config.ts --configLoader runner ui/src/ui/e2e/chat-flow.e2e.test.ts` para pruebas rápidas y específicas después de instalar las dependencias, o Testbox/Crabbox para pruebas de GUI más amplias.
- Asistentes de E2E de procesos: use `test/helpers/openclaw-test-instance.ts` cuando una prueba E2E a nivel de proceso de Vitest necesite un Gateway en ejecución, un entorno CLI, captura de registros y limpieza en un solo lugar.
- Pruebas PTY de TUI: use `node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts` para el carril PTY rápido de backend falso. Use `OPENCLAW_TUI_PTY_INCLUDE_LOCAL=1` o `pnpm tui:pty:test:watch --mode local` para la prueba de humo `tui --local` más lenta, que simula solo el endpoint del modelo externo. Afirmar texto visible estable o llamadas a dispositivos (fixtures), no instantáneas ANSI sin procesar.
- Asistentes E2E de Docker/Bash: los carriles que obtienen (source) `scripts/lib/docker-e2e-image.sh` pueden pasar `docker_e2e_test_state_shell_b64 <label> <scenario>` al contenedor y decodificarlo con `scripts/lib/openclaw-e2e-instance.sh`; los scripts multi-home pueden pasar `docker_e2e_test_state_function_b64` y llamar a `openclaw_test_state_create <label> <scenario>` en cada flujo. Los llamadores de menor nivel pueden usar `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` para un fragmento de shell dentro del contenedor, o `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` para un archivo de entorno de host que se pueda obtener (source). El `--` antes de `create` evita que los tiempos de ejecución de Node más nuevos traten `--env-file` como una bandera de Node. Los carriles Docker/Bash que lanzan un Gateway pueden obtener (source) `scripts/lib/openclaw-e2e-instance.sh` dentro del contenedor para la resolución del punto de entrada, inicio simulado de OpenAI, inicio en primer plano/fondo de Gateway, sondas de preparación, exportación de estado de entorno, volcados de registros y limpieza de procesos.
- Las ejecuciones completas, de extensión y de fragmentos (shards) con patrones de inclusión actualizan los datos de sincronización local en `.artifacts/vitest-shard-timings.json`; las ejecuciones posteriores de configuración completa utilizan esos tiempos para equilibrar los fragmentos lentos y rápidos. Los fragmentos de CI con patrones de inclusión añaden el nombre del fragmento a la clave de tiempo, lo que mantiene visibles los tiempos de los fragmentos filtrados sin reemplazar los datos de tiempo de la configuración completa. Establezca `OPENCLAW_TEST_PROJECTS_TIMINGS=0` para ignorar el artefacto de tiempo local.
- Los archivos de prueba `plugin-sdk` y `commands` seleccionados ahora se enrutan a través de carriles ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos de uso intensivo de tiempo de ejecución en sus carriles existentes.
- Los archivos fuente con pruebas asociadas (sibling) se asignan a ese asociado antes de recurrir a globs de directorios más amplios. Las ediciones de ayuda bajo `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` y `src/plugins/contracts` utilizan un gráfico de importación local para ejecutar las pruebas de importación en lugar de ejecutar ampliamente todos los fragmentos cuando la ruta de dependencia es precisa.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/ayuda de nivel superior.
- La configuración base de Vitest ahora tiene como valor predeterminado `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en todas las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` y `pnpm test extensions` ejecutan todos los fragmentos de extensiones/complementos. Los complementos de canales pesados, el complemento del navegador y OpenAI se ejecutan como fragmentos dedicados; otros grupos de complementos permanecen agrupados. Utilice `pnpm test extensions/<id>` para un solo carril de complementos agrupado.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest, mientras sigue utilizando el enrutamiento de carriles con ámbito para objetivos explícitos de archivo/directorio.
- `pnpm test:perf:imports:changed`: el mismo perfilado de importación, pero solo para archivos modificados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara el rendimiento de la ruta enrutada en modo cambiado con la ejecución nativa del proyecto raíz para el mismo diff de git confirmado.
- `pnpm test:perf:changed:bench -- --worktree` crea puntos de referencia del conjunto de cambios del árbol de trabajo actual sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el hilo principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU y de montón para el ejecutor de pruebas unitarias (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: ejecuta cada configuración hoja de la suite completa de Vitest en serie y escribe datos de duración agrupados más artefactos JSON/registros por configuración. El Agente de Rendimiento de Pruebas utiliza esto como línea base antes de intentar correcciones de pruebas lentas.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: compara informes agrupados después de un cambio enfocado en el rendimiento.
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta el agregado E2E del repositorio: pruebas de humo extremo a extremo de gateway más el carril E2E del navegador simulado de Control UI.
- `pnpm test:e2e:gateway`: Ejecuta pruebas de humo extremo a extremo de gateway (emparejamiento WS/HTTP/nodo de varias instancias). Por defecto a `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajuste con `OPENCLAW_E2E_WORKERS=<n>` y establezca `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:all`: Compila la imagen compartida de pruebas en vivo, empaqueta OpenClaw una vez como un tarball de npm, compila/reutiliza una imagen vacía del ejecutor Node/Git más una imagen funcional que instala ese tarball en `/app`, y luego ejecuta carriles de pruebas de humo de Docker con `OPENCLAW_SKIP_DOCKER_BUILD=1` a través de un planificador ponderado. La imagen vacía (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) se usa para los carriles de instalador/actualización/dependencias de complementos; esos carriles montan el tarball precompilado en lugar de usar las fuentes del repositorio copiadas. La imagen funcional (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) se usa para los carriles de funcionalidad de la aplicación compilada normal. `scripts/package-openclaw-for-docker.mjs` es el único empaquetador de paquetes local/CI y valida el tarball más `dist/postinstall-inventory.json` antes de que Docker lo consuma. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. `node scripts/test-docker-all.mjs --plan-json` emite el plan de CI propiedad del planificador para los carriles seleccionados, tipos de imagen, necesidades de paquete/imagen en vivo, escenarios de estado y verificaciones de credenciales sin compilar ni ejecutar Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` controla las ranuras de procesos y por defecto es 10; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` controla el grupo de cola sensible al proveedor y por defecto es 10. Los límites de carriles pesados son por defecto `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; los límites del proveedor son por defecto un carril pesado por proveedor a través de `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` y `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Use `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` para hosts más grandes. Si un carril excede el peso efectivo o el límite de recursos en un host de baja paralelización, aún puede comenzar desde un grupo vacío y se ejecutará solo hasta que libere capacidad. Los inicios de los carriles se escalonan por 2 segundos por defecto para evitar tormentas de creación del demonio local de Docker; anule con `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. El ejecutor realiza verificaciones previas de Docker por defecto, limpia contenedores obsoletos de OpenClaw E2E, emite el estado de carril activo cada 30 segundos, comparte cachés de herramientas de CLI del proveedor entre carriles compatibles, reintenta fallas transitorias del proveedor en vivo una vez por defecto (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) y almacena los tiempos de los carriles en `.artifacts/docker-tests/lane-timings.json` para un ordenamiento de los más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto de carriles sin ejecutar Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` para ajustar la salida de estado o `OPENCLAW_DOCKER_ALL_TIMINGS=0` para deshabilitar la reutilización de tiempos. Use `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` solo para carriles deterministas/locales o `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` solo para carriles de proveedores en vivo; los alias de paquetes son `pnpm test:docker:local:all` y `pnpm test:docker:live:all`. El modo solo en vivo fusiona los carriles principales y de cola en vivo en un solo grupo de los más largos primero para que los cubos del proveedor puedan empaquetar el trabajo de Claude, Codex y Gemini juntos. El ejecutor deja de programar nuevos carriles agrupados después del primer fracaso a menos que se establezca `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`, y cada carril tiene un tiempo de espera de reserva de 120 minutos anulable con `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`; los carriles en vivo/de cola seleccionados usan límites más estrictos por carril. Los comandos de configuración de Docker del backend de CLI tienen su propio tiempo de espera a través de `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (predeterminado 180). Los registros por carril, `summary.json`, `failures.json` y los tiempos de fase se escriben en `.artifacts/docker-tests/<run-id>/`; use `pnpm test:docker:timings <summary.json>` para inspeccionar los carriles lentos y `pnpm test:docker:rerun <run-id|summary.json|failures.json>` para imprimir comandos de repetición dirigidos baratos.
- `pnpm test:docker:browser-cdp-snapshot`: Construye un contenedor E2E de origen respaldado por Chromium, inicia CDP sin procesar más un Gateway aislado, ejecuta `browser doctor --deep` y verifica que las instantáneas de roles de CDP incluyan URL de enlaces, elementos en los que se puede hacer clic promovidos por el cursor, referencias de iframe y metadatos de marcos.
- `pnpm test:docker:skill-install`: Instala el archivo tar empaquetado de OpenClaw en un ejecutor Docker básico, desactiva `skills.install.allowUploadedArchives`, resuelve un slug de habilidad actual desde la búsqueda en vivo de ClawHub, lo instala a través de `openclaw skills install` y verifica `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` y `skills info --json`.
- Las sondas en vivo de Docker del backend de CLI se pueden ejecutar como carriles enfocados, por ejemplo `pnpm test:docker:live-cli-backend:claude`, `pnpm test:docker:live-cli-backend:claude:resume` o `pnpm test:docker:live-cli-backend:claude:mcp`. Gemini tiene alias `:resume` y `:mcp` coincidentes.
- `pnpm test:docker:openwebui`: Inicia OpenClaw en Docker + Open WebUI, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat con proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable, extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites unitarias/e2e normales.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway semillado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envíos salientes y notificaciones de canal + permisos estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio sin procesar directamente para que la prueba refleje lo que el puente realmente emite.
- `pnpm test:docker:upgrade-survivor`: Instala el archivo tar empaquetado de OpenClaw sobre una fixture de usuario antiguo sucio, ejecuta la actualización del paquete más el doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia un Gateway de bucle invertido y verifica que los agentes, la configuración del canal, las listas de permitidos de complementos, los archivos de espacio de trabajo/sesión, el estado obsoleto de las dependencias de complementos heredados, el inicio y el estado de RPC sobrevivan.
- `pnpm test:docker:published-upgrade-survivor`: Instala `openclaw@latest` de forma predeterminada, siembra archivos realistas de usuario existente sin claves de proveedor o canal en vivo, configura esa línea base con una receta de comando `openclaw config set` incorporada, actualiza esa instalación publicada al archivo tar OpenClaw empaquetado, ejecuta el doctor no interactivo, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle invertido y verifica que los intents configurados, los archivos de espacio de trabajo/sesión, la configuración obsoleta de complementos y el estado de dependencias heredadas, el inicio, `/healthz`, `/readyz` y el estado de RPC sobrevivan o se reparen correctamente. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, expanda una matriz local exacta con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, o agregue accesorios de escenario con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues`; el conjunto de problemas reportados incluye `configured-plugin-installs` para verificar que los complementos externos de OpenClaw configurados se instalen automáticamente durante la actualización y `stale-source-plugin-shadow` para evitar que las sombras de complementos solo de fuente interrumpan el inicio. Aceptación de paquetes expone esos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, y resuelve tokens de meta línea base como `last-stable-4` o `all-since-2026.4.23` antes de entregar especificaciones de paquetes exactas a los carriles de Docker.
- `pnpm test:docker:update-migration`: Ejecuta el arnés de supervivencia de actualización publicada en el escenario `plugin-deps-cleanup` con mucho trabajo de limpieza, comenzando en `openclaw@2026.4.23` de forma predeterminada. El flujo de trabajo separado `Update Migration` expande este carril con `baselines=all-since-2026.4.23` para que cada paquete estable publicado desde `.23` en adelante se actualice al candidato y demuestre la limpieza de dependencias de complementos configurados fuera de la CI de lanzamiento completo.
- `pnpm test:docker:plugins`: Ejecuta una prueba de humo de instalación/actualización para ruta local, `file:`, paquetes del registro npm con dependencias elevadas, refs de git en movimiento, accesorios de ClawHub, actualizaciones del mercado, y habilitación/inspección de paquetes de Claude.

## Puerta local de PR

Para las comprobaciones locales de aterrizaje/puerta de PR, ejecute:

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla en un host saturado, ejecútelo nuevamente una vez antes de tratarlo como una regresión, luego aisle con `pnpm test <path/to/test>`. Para hosts con memoria limitada, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Prueba de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: "Responde con una sola palabra: ok. Sin puntuación ni texto adicional."

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana de minimax 1279ms (mínimo 1114, máximo 2431)
- mediana de opus 2454ms (mínimo 1224, máximo 3170)

## Prueba de inicio de CLI

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

Ajustes preestablecidos:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos preajustes

La salida incluye `sampleCount`, promedio, p50, p95, min/máx, distribución de código de salida/señal y resúmenes de RSS máximo para cada comando. El opcional `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la captura de tiempo y perfil use el mismo arnés.

Convenciones de salida guardadas:

- `pnpm test:startup:bench:smoke` escribe el artefacto de humo seleccionado en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el accesorio de referencia (baseline) verificado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Accesorio verificado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Compare los resultados actuales contra el accesorio con `pnpm test:startup:bench:check`

## Bench de inicio de Gateway

Script: [`scripts/bench-gateway-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-startup.ts)

El benchmark usa por defecto la entrada CLI construida en `dist/entry.js`; ejecute
`pnpm build` antes de usar los comandos del script del paquete. Para medir el ejecutor
fuente en su lugar, pase `--entry scripts/run-node.mjs` y mantenga esos resultados
separados de las líneas base de entrada construida.

Uso:

- `pnpm test:startup:gateway -- --runs 5 --warmup 1`
- `pnpm test:startup:gateway -- --case default --runs 10 --warmup 1`
- `pnpm test:startup:gateway -- --case skipChannels --case fiftyPlugins --runs 5`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 5 --output .artifacts/gateway-startup.json`
- `node --import tsx scripts/bench-gateway-startup.ts --case default --runs 3 --cpu-prof-dir .artifacts/gateway-startup-cpu`

IDs de caso:

- `default`: inicio normal de Gateway.
- `skipChannels`: Inicio del Gateway con el inicio del canal omitido.
- `oneInternalHook`: un enlace interno configurado.
- `allInternalHooks`: todos los enlaces internos.
- `fiftyPlugins`: 50 complementos de manifiesto.
- `fiftyStartupLazyPlugins`: 50 complementos de manifiesto de inicio diferido (startup-lazy).

La salida incluye la primera salida del proceso, `/healthz`, `/readyz`, hora del registro de escucha HTTP,
hora del registro de listo del Gateway, tiempo de CPU, relación de núcleos de CPU, RSS máximo, montón, métricas de
rastreo de inicio, retraso del bucle de eventos y métricas detalladas de la tabla de búsqueda de complementos. El script
habilita `OPENCLAW_GATEWAY_STARTUP_TRACE=1` en el entorno secundario del Gateway.

Lea `/healthz` como actividad (liveness): el servidor HTTP puede responder. Lea `/readyz` como
preparación utilizable: los sidecars de complementos de inicio, los canales y el trabajo de post-adjunto crítico para la preparación
se han estabilizado. Los enlaces de inicio del Gateway se envían
de forma asíncrona y no son parte de la garantía de preparación. La hora del registro de listo es la
marca de tiempo del registro interno de listo del Gateway; es útil para la atribución del lado del proceso
pero no sustituye al sonda externa `/readyz`.

Utilice la salida JSON o `--output` al comparar cambios. Utilice `--cpu-prof-dir` solo
después de que la salida del rastreo señale trabajo de importación, compilación o limitado por CPU que no pueda
explicarse solo con los tiempos de fase. No compare los resultados del ejecutor de origen (source-runner) con los
resultados `dist/entry.js` compilados como la misma línea base.

## Prueba de rendimiento de reinicio del Gateway

Script: [`scripts/bench-gateway-restart.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-gateway-restart.ts)

La prueba de rendimiento de reinicio solo es compatible con macOS y Linux. Utiliza SIGUSR1 para
los reinicios en proceso y falla inmediatamente en Windows.

La prueba de rendimiento predeterminada es la entrada de CLI compilada en `dist/entry.js`; ejecute
`pnpm build` antes de usar los comandos de script del paquete. Para medir el ejecutor de origen
en su lugar, pase `--entry scripts/run-node.mjs` y mantenga esos resultados
separados de las líneas base de entrada compilada.

Uso:

- `pnpm test:restart:gateway -- --case skipChannels --runs 1 --restarts 5`
- `pnpm test:restart:gateway -- --case default --runs 3 --restarts 3 --warmup 1`
- `pnpm test:restart:gateway -- --case skipChannelsAcpxProbe --case skipChannelsNoAcpxProbe --runs 1 --restarts 5`
- `node --import tsx scripts/bench-gateway-restart.ts --case fiftyPlugins --runs 1 --restarts 5 --output .artifacts/gateway-restart.json`
- `node --import tsx scripts/bench-gateway-restart.ts --json`

Ids de casos:

- `skipChannels`: reinicio con canales omitidos.
- `skipChannelsAcpxProbe`: reinicio con canales omitidos y sonda de inicio ACPX activada.
- `skipChannelsNoAcpxProbe`: reinicio con canales omitidos y sonda de inicio ACPX desactivada.
- `default`: reinicio normal.
- `fiftyPlugins`: reinicio con 50 complementos de manifiesto.

La salida incluye el siguiente `/healthz`, el siguiente `/readyz`, tiempo de inactividad, tiempo de preparación de reinicio,
CPU, RSS, métricas de traza de inicio para el proceso de reemplazo y métricas de traza de reinicio
para el manejo de señales, drenaje de trabajo activo, fases de cierre, siguiente inicio, tiempo de preparación
y instantáneas de memoria. El script habilita
`OPENCLAW_GATEWAY_STARTUP_TRACE=1` y `OPENCLAW_GATEWAY_RESTART_TRACE=1` en el
entorno secundario de Gateway.

Use este punto de referencia cuando un cambio afecte la señalización de reinicio, los controladores de cierre,
el inicio después del reinicio, el apagado del sidecar, la transferencia de servicio o la preparación después
del reinicio. Comience con `skipChannels` al aislar la mecánica de Gateway del inicio
del canal. Use `default` o casos con muchos complementos solo después de que el caso estrecho explique
la ruta de reinicio.

Las métricas de traza son pistas de atribución, no veredictos. Un cambio de reinicio debe ser
juzgado a partir de múltiples muestras, el intervalo de propietario coincidente, `/healthz` y el comportamiento `/readyz`,
y el contrato de reinicio visible para el usuario.

## Incorporación E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humeo de incorporación en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script impulsa el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia el gateway y ejecuta `openclaw health`.

## Prueba de humeo de importación QR (Docker)

Garantiza que el asistente de tiempo de ejecución QR mantenido se cargue bajo los tiempos de ejecución de Node de Docker compatibles (Node 24 predeterminado, Node 22 compatible):

```bash
pnpm test:docker:qr
```

## Relacionado

- [Testing](/es/help/testing)
- [Testing live](/es/help/testing-live)
- [Testing updates and plugins](/es/help/testing-updates-plugins)
