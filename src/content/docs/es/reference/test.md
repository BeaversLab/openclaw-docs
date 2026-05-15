---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

- Kit de pruebas completo (suites, en vivo, Docker): [Testing](/es/help/testing)
- Validación de paquetes de actualizaciones y complementos: [Testing updates and plugins](/es/help/testing-updates-plugins)

- `pnpm test:force`: Mata cualquier proceso de puerta de enlace (gateway) persistente que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de puerta de enlace aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Úselo cuando una ejecución previa de la puerta de enlace haya dejado el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite de unidades con cobertura de V8 (vía `vitest.unit.config.ts`). Este es un control de cobertura del carril de unidades predeterminado, no de cobertura de todos los archivos del repositorio completo. Los umbrales son del 70% para líneas/funciones/declaraciones y del 55% para ramas. Debido a que `coverage.all` es falso y los alcances de cobertura del carril predeterminado incluyen pruebas de unidad no rápidas con archivos fuente hermanos, el control mide el origen propiedad de este carril en lugar de cada importación transitiva que suceda a cargar.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos cambiados desde `origin/main`.
- `pnpm test:changed`: ejecución de pruebas cambiadas inteligente y económica. Ejecuta objetivos precisos desde ediciones directas de pruebas, archivos `*.test.ts` hermanos, mapeos de origen explícitos y el gráfico de importación local. Los cambios amplios/de configuración/de paquete se omiten a menos que se asignen a pruebas precisas.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`: ejecución de pruebas cambiadas amplia y explícita. Úselo cuando una edición de arnés de prueba/configuración/paquete debería volver al comportamiento de pruebas cambiadas más amplio de Vitest.
- `pnpm changed:lanes`: muestra los carriles arquitectónicos activados por el diff contra `origin/main`.
- `pnpm check:changed`: ejecuta el control de verificación de cambios inteligente para el diff contra `origin/main`. Ejecuta comandos de typecheck, lint y guard para los carriles arquitectónicos afectados, pero no ejecuta pruebas de Vitest. Use `pnpm test:changed` o `pnpm test <target>` explícito para la prueba de pruebas.
- `pnpm test`: enruta objetivos explícitos de archivos/directorios a través de carriles (lanes) con ámbito de Vitest. Las ejecuciones sin objetivo usan grupos de fragmentos fijos y se expanden a configuraciones hoja para la ejecución paralela local; el grupo de extensiones siempre se expande a las configuraciones de fragmentos por extensión en lugar de un solo proceso gigante del proyecto raíz.
- Las ejecuciones del contenedor de pruebas terminan con un breve resumen de `[test] passed|failed|skipped ... in ...`. La línea de duración propia de Vitest mantiene el detalle por fragmento.
- Estado de prueba compartido de OpenClaw: use `src/test-utils/openclaw-test-state.ts` de Vitest cuando una prueba necesite un `HOME`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`, fixture de configuración, espacio de trabajo, directorio de agente o almacén de perfiles de autenticación aislados.
- Asistentes de E2E de procesos: use `test/helpers/openclaw-test-instance.ts` cuando una prueba E2E a nivel de proceso de Vitest necesite un Gateway en ejecución, entorno CLI, captura de registros y limpieza en un solo lugar.
- Asistentes de E2E de Docker/Bash: los carriles que obtienen (source) `scripts/lib/docker-e2e-image.sh` pueden pasar `docker_e2e_test_state_shell_b64 <label> <scenario>` al contenedor y decodificarlo con `scripts/lib/openclaw-e2e-instance.sh`; los scripts de múltiples viviendas (multi-home) pueden pasar `docker_e2e_test_state_function_b64` y llamar a `openclaw_test_state_create <label> <scenario>` en cada flujo. Los llamadores de menor nivel pueden usar `scripts/lib/openclaw-test-state.mjs shell --label <name> --scenario <name>` para un fragmento de shell dentro del contenedor, o `node scripts/lib/openclaw-test-state.mjs -- create --label <name> --scenario <name> --env-file <path> --json` para un archivo de entorno del host que se pueda obtener. El `--` antes de `create` evita que los tiempos de ejecución de Node más nuevos traten `--env-file` como una bandera de Node. Los carriles de Docker/Bash que lanzan un Gateway pueden obtener (source) `scripts/lib/openclaw-e2e-instance.sh` dentro del contenedor para la resolución del punto de entrada, el inicio simulado de OpenAI, el inicio en primer plano/fondo del Gateway, sondas de preparación, exportación de estado de entorno, volcados de registros y limpieza de procesos.
- Las ejecuciones de fragmentos completas, de extensiones y de patrones de inclusión actualizan los datos de tiempos locales en `.artifacts/vitest-shard-timings.json`; las ejecuciones posteriores de configuración completa usan esos tiempos para equilibrar fragmentos lentos y rápidos. Los fragmentos de CI de patrones de inclusión agregan el nombre del fragmento a la clave de tiempo, lo que mantiene visibles los tiempos de los fragmentos filtrados sin reemplazar los datos de tiempo de configuración completa. Establezca `OPENCLAW_TEST_PROJECTS_TIMINGS=0` para ignorar el artefacto de tiempo local.
- Los archivos de pruebas `plugin-sdk` y `commands` seleccionados ahora se enrutan a través de carriles ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos de uso intensivos de tiempo de ejecución en sus carriles existentes.
- Los archivos de origen con pruebas hermanas se asignan a ese hermano antes de recurrir a comodines de directorio más amplios. Las ediciones de auxiliares en `src/channels/plugins/contracts/test-helpers`, `src/plugin-sdk/test-helpers` y `src/plugins/contracts` utilizan un gráfico de importación local para ejecutar las pruebas de importación en lugar de ejecutar ampliamente cada fragmento cuando la ruta de dependencia es precisa.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/auxiliar de nivel superior.
- La configuración base de Vitest ahora tiene como valor predeterminado `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` y `pnpm test extensions` ejecutan todos los fragmentos de extensiones/complementos. Los complementos de canal pesado, el complemento del navegador y OpenAI se ejecutan como fragmentos dedicados; otros grupos de complementos permanecen por lotes. Use `pnpm test extensions/<id>` para un carril de complemento agrupado.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest, mientras que todavía usa el enrutamiento de carril con alcance para objetivos explícitos de archivo/directorio.
- `pnpm test:perf:imports:changed`: el mismo perfilado de importación, pero solo para archivos cambiados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara la ruta del modo cambiado enrutado con la ejecución del proyecto raíz nativo para el mismo diff de git confirmado.
- `pnpm test:perf:changed:bench -- --worktree` compara el conjunto de cambios del árbol de trabajo actual sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el subproceso principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + montón para el ejecutor de unidades (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: ejecuta en serie cada configuración hoja de Vitest de la suite completa y escribe datos de duración agrupados además de artefactos JSON/registros por configuración. El Agente de Rendimiento de Pruebas utiliza esto como línea base antes de intentar corregir pruebas lentas.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: compara los informes agrupados después de un cambio centrado en el rendimiento.
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo extremo a extremo del gateway (emparejamiento WS/HTTP/nodo de múltiples instancias). Por defecto es `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajuste con `OPENCLAW_E2E_WORKERS=<n>` y establezca `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo de proveedores (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:all`: Construye la imagen de pruebas en vivo compartida, empaqueta OpenClaw una vez como un tarball de npm, construye/reutiliza una imagen de ejecución Node/Git básica más una imagen funcional que instala ese tarball en `/app`, y luego ejecuta carriles de pruebas de humo de Docker con `OPENCLAW_SKIP_DOCKER_BUILD=1` a través de un planificador ponderado. La imagen básica (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) se utiliza para los carriles de instalador/actualización/dependencias de complementos; esos carriles montan el tarball preconstruido en lugar de usar las fuentes del repositorio copiadas. La imagen funcional (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) se usa para los carriles de funcionalidad de la aplicación construida normal. `scripts/package-openclaw-for-docker.mjs` es el único empaquetador de paquetes local/CI y valida el tarball más `dist/postinstall-inventory.json` antes de que Docker lo consuma. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. `node scripts/test-docker-all.mjs --plan-json` emite el plan de CI propiedad del planificador para los carriles seleccionados, tipos de imagen, necesidades de paquete/imagen en vivo, escenarios de estado y verificaciones de credenciales sin construir ni ejecutar Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` controla las ranuras de proceso y por defecto es 10; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` controla el grupo de cola sensible al proveedor y por defecto es 10. Los límites de carriles pesados por defecto son `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; los límites del proveedor por defecto son un carril pesado por proveedor a través de `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` y `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Use `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` para hosts más grandes. Si un carril excede el peso efectivo o el límite de recursos en un host de baja paralelismo, aún puede comenzar desde un grupo vacío y se ejecutará solo hasta que libere capacidad. Los inicios de los carriles se escalonan por 2 segundos por defecto para evitar tormentas de creación del demonio de Docker local; anule con `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. El ejecutor realiza verificaciones previas de Docker por defecto, limpia contenedores obsoletos de OpenClaw E2E, emite el estado del carril activo cada 30 segundos, comparte los cachés de las herramientas CLI del proveedor entre carriles compatibles, reintenta fallas transitorias del proveedor en vivo una vez por defecto (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) y almacena los tiempos de los carriles en `.artifacts/docker-tests/lane-timings.json` para un ordenamiento de los más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto del carril sin ejecutar Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` para ajustar la salida de estado o `OPENCLAW_DOCKER_ALL_TIMINGS=0` para deshabilitar la reutilización de tiempos. Use `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` solo para carriles deterministas/locales o `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` solo para carriles de proveedores en vivo; los alias de paquetes son `pnpm test:docker:local:all` y `pnpm test:docker:live:all`. El modo solo en vivo fusiona los carriles en vivo principales y de cola en un solo grupo de los más largos primero para que los cubos del proveedor puedan empaquetar el trabajo de Claude, Codex y Gemini juntos. El ejecutor deja de programar nuevos carriles agrupados después del primer fallo a menos que se establezca `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`, y cada carril tiene un tiempo de espera de reserva de 120 minutos anulable con `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`; los carriles en vivo/de cola seleccionados usan límites más estrictos por carril. Los comandos de configuración de Docker del backend de CLI tienen su propio tiempo de espera a través de `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (por defecto 180). Los registros por carril, `summary.json`, `failures.json` y los tiempos de las fases se escriben bajo `.artifacts/docker-tests/<run-id>/`; use `pnpm test:docker:timings <summary.json>` para inspeccionar carriles lentos y `pnpm test:docker:rerun <run-id|summary.json|failures.json>` para imprimir comandos baratos de reejecución dirigidos.
- `pnpm test:docker:browser-cdp-snapshot`: Compila un contenedor E2E de origen basado en Chromium, inicia CDP sin procesar más un Gateway aislado, ejecuta `browser doctor --deep` y verifica que las instantáneas de roles de CDP incluyan URLs de enlace, elementos en los que se puede hacer clic promovidos por el cursor, referencias de iframe y metadatos de fotogramas.
- `pnpm test:docker:skill-install`: Instala el archivo tar empaquetado de OpenClaw en un ejecutor Docker simple, deshabilita `skills.install.allowUploadedArchives`, resuelve un slug de habilidad actual desde la búsqueda en vivo de ClawHub, lo instala a través de `openclaw skills install` y verifica `SKILL.md`, `.clawhub/origin.json`, `.clawhub/lock.json` y `skills info --json`.
- Las sondas en vivo de Docker del backend de CLI se pueden ejecutar como carriles enfocados, por ejemplo `pnpm test:docker:live-cli-backend:codex`, `pnpm test:docker:live-cli-backend:codex:resume` o `pnpm test:docker:live-cli-backend:codex:mcp`. Claude y Gemini tienen alias `:resume` y `:mcp` coincidentes.
- `pnpm test:docker:openwebui`: Inicia OpenClaw en Docker + Open WebUI, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales de unit/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway inicializado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envíos salientes y las notificaciones de canal + permisos estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio sin procesar directamente, por lo que la prueba refleja lo que el puente realmente emite.
- `pnpm test:docker:upgrade-survivor`: Instala el archivo tar empaquetado de OpenClaw sobre una instalación de usuario antigua sucia, ejecuta la actualización del paquete más un doctor no interactivo sin claves de proveedor o canal en vivo, luego inicia un Gateway de bucle invertido y verifica que los agentes, la configuración del canal, las listas de permitidos de complementos, los archivos de espacio de trabajo/sesión, el estado de dependencia de complementos heredados obsoletos, el inicio y el estado de RPC sobrevivan.
- `pnpm test:docker:published-upgrade-survivor`: Instala `openclaw@latest` por defecto, siembra archivos de usuario existentes realistas sin claves de proveedor o canal en vivo, configura esa línea base con una receta de comando `openclaw config set` integrada, actualiza esa instalación publicada al tarball OpenClaw empaquetado, ejecuta el doctor no interactivo, escribe `.artifacts/upgrade-survivor/summary.json`, luego inicia un Gateway de bucle de retorno y verifica que los intents configurados, los archivos de espacio de trabajo/sesión, la configuración de complementos obsoleta y el estado de dependencias heredadas, el inicio, `/healthz`, `/readyz` y el estado RPC sobrevivan o se reparen limpiamente. Anule una línea base con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, expanda una matriz local exacta con `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` como `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, o agregue accesorios de escenario con `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues`; el conjunto de problemas reportados incluye `configured-plugin-installs` para verificar que los complementos externos de OpenClaw configurados se instalen automáticamente durante la actualización y `stale-source-plugin-shadow` para evitar que las sombras de complementos de solo fuente interrumpan el inicio. Aceptación de paquetes expone esos como `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` y `published_upgrade_survivor_scenarios`, y resuelve tokens de meta línea base como `last-stable-4` o `all-since-2026.4.23` antes de pasar especificaciones de paquetes exactas a los carriles de Docker.
- `pnpm test:docker:update-migration`: Ejecuta el arnés de supervivencia de actualización publicada en el escenario `plugin-deps-cleanup` con mucho de limpieza, comenzando en `openclaw@2026.4.23` por defecto. El flujo de trabajo separado `Update Migration` amplía este carril con `baselines=all-since-2026.4.23` para que cada paquete estable publicado desde `.23` en adelante se actualice al candidato y demuestre la limpieza de dependencias de complementos configurados fuera de la CI de lanzamiento completo.
- `pnpm test:docker:plugins`: Ejecuta pruebas de humo de instalación/actualización para ruta local, `file:`, paquetes de registro npm con dependencias elevadas, referencias móviles de git, accesorios de ClawHub, actualizaciones de mercado y habilitación/inspección de paquetes de Claude.

## Portero de PR local

Para las comprobaciones de aterrizaje/portero de PR local, ejecute:

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla en un host cargado, vuelva a ejecutarlo una vez antes de tratarlo como una regresión, luego aísle con `pnpm test <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banco de pruebas de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: "Responda con una sola palabra: ok. Sin puntuación ni texto adicional."

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana minimax 1279ms (mín 1114, máx 2431)
- mediana opus 2454ms (mín 1224, máx 3170)

## Banco de pruebas de inicio de CLI

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

La salida incluye `sampleCount`, promedio, p50, p95, min/máx, distribución de código de salida/señal, y resúmenes de RSS máximo para cada comando. Opcionalmente `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la captura de tiempo y perfil utilice el mismo arnés.

Convenciones de salida guardadas:

- `pnpm test:startup:bench:smoke` escribe el artefacto de prueba de humo dirigido en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el dispositivo de línea base verificado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Dispositivo verificado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales con el dispositivo con `pnpm test:startup:bench:check`

## Incorporación E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humo de incorporación en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script impulsa el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia la puerta de enlace y ejecuta `openclaw health`.

## Prueba de humo de importación QR (Docker)

Garantiza que el asistente de tiempo de ejecución QR mantenido se cargue en los tiempos de ejecución Docker Node compatibles (Node 24 predeterminado, Node 22 compatible):

```bash
pnpm test:docker:qr
```

## Relacionado

- [Pruebas](/es/help/testing)
- [Pruebas en vivo](/es/help/testing-live)
- [Pruebas de actualizaciones y complementos](/es/help/testing-updates-plugins)
