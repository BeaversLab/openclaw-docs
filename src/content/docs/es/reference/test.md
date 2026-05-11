---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

- Kit de pruebas completo (suites, en vivo, Docker): [Pruebas](/es/help/testing)

- `pnpm test:force`: Mata cualquier proceso de puerta de enlace (gateway) residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de puerta de enlace aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Úselo cuando una ejecución anterior de la puerta de enlace dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite de unidades con cobertura V8 (vía `vitest.unit.config.ts`). Este es un control de cobertura de unidades de archivos cargados, no una cobertura de todos los archivos del repositorio completo. Los umbrales son del 70% para líneas/funciones/declaraciones y del 55% para ramas. Debido a que `coverage.all` es falso, el control mide los archivos cargados por la suite de cobertura de unidades en lugar de tratar cada archivo fuente de división de carril como no cubierto.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos cambiados desde `origin/main`.
- `pnpm test:changed`: ejecución de pruebas cambiadas inteligente y económica. Ejecuta objetivos precisos desde ediciones directas de pruebas, archivos hermanos `*.test.ts`, mapeos de fuente explícitos y el gráfico de importación local. Los cambios amplios/configuración/paquete se omiten a menos que se asignen a pruebas precisas.
- `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`: ejecución de pruebas cambiadas amplia y explícita. Úsela cuando una edición de arnés de prueba/configuración/paquete debería volver al comportamiento de pruebas cambiadas más amplio de Vitest.
- `pnpm changed:lanes`: muestra los carriles arquitectónicos activados por el diff contra `origin/main`.
- `pnpm check:changed`: ejecuta el control de cambios inteligente para el diff contra `origin/main`. Ejecuta comandos de typecheck, lint y guard para los carriles arquitectónicos afectados, pero no ejecuta pruebas de Vitest. Use `pnpm test:changed` o `pnpm test <target>` explícito para la prueba de validación.
- `pnpm test`: enruta objetivos explícitos de archivo/directorio a través de carriles de Vitest con alcance. Las ejecuciones sin objetivo utilizan grupos de fragmentos fijos y se expanden a configuraciones hoja para ejecución paralela local; el grupo de extensiones siempre se expande a las configuraciones de fragmentos por extensión en lugar de un único proceso gigante del proyecto raíz.
- Las ejecuciones del contenedor de pruebas terminan con un breve resumen de `[test] passed|failed|skipped ... in ...`. La línea de duración propia de Vitest mantiene el detalle por fragmento.
- Las ejecuciones de fragmentos completas, de extensión y de patrones de inclusión actualizan los datos de sincronización local en `.artifacts/vitest-shard-timings.json`; las ejecuciones posteriores de toda la configuración utilizan esos tiempos para equilibrar los fragmentos lentos y rápidos. Los fragmentos de CI de patrones de inclusión añaden el nombre del fragmento a la clave de sincronización, lo que mantiene visibles los tiempos de los fragmentos filtrados sin reemplazar los datos de sincronización de toda la configuración. Establezca `OPENCLAW_TEST_PROJECTS_TIMINGS=0` para ignorar el artefacto de sincronización local.
- Los archivos de prueba seleccionados `plugin-sdk` y `commands` ahora se enrutan a través de carriles ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos de gran consumo de ejecución en sus carriles existentes.
- Los archivos fuente con pruebas hermanas se asignan a ese hermano antes de recurrir a globs de directorios más amplios. Las ediciones de ayuda bajo `test/helpers/channels` y `test/helpers/plugins` utilizan un gráfico de importación local para ejecutar las pruebas de importación en lugar de ejecutar ampliamente todos los fragmentos cuando la ruta de dependencia es precisa.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/ayuda de nivel superior.
- La configuración base de Vitest ahora tiene como valor predeterminado `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en todas las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` y `pnpm test extensions` ejecutan todos los fragmentos de extensión/complemento. Los complementos de canal pesados, el complemento del navegador y OpenAI se ejecutan como fragmentos dedicados; otros grupos de complementos permanecen procesados en lotes. Use `pnpm test extensions/<id>` para un único carril de complemento empaquetado.
- `pnpm test:perf:imports`: habilita los informes de duración de importación y desglose de importación de Vitest, mientras sigue utilizando el enrutamiento de carriles con ámbito para objetivos de archivos/directorios explícitos.
- `pnpm test:perf:imports:changed`: mismo perfilado de importación, pero solo para los archivos modificados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara la ruta del modo enrutado de cambios con la ejecución nativa del proyecto raíz para el mismo git diff confirmado.
- `pnpm test:perf:changed:bench -- --worktree` compara el conjunto de cambios actual del árbol de trabajo sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el subproceso principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + pila para el ejecutor de pruebas unitarias (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:groups --full-suite --allow-failures --output .artifacts/test-perf/baseline-before.json`: ejecuta cada configuración hoja de Vitest de suite completa en serie y escribe datos de duración agrupados más artefactos JSON/log por configuración. El Agente de Rendimiento de Pruebas utiliza esto como línea base antes de intentar correcciones de pruebas lentas.
- `pnpm test:perf:groups:compare .artifacts/test-perf/baseline-before.json .artifacts/test-perf/after-agent.json`: compara los informes agrupados después de un cambio centrado en el rendimiento.
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas humo de un extremo a otro de la puerta de enlace (emparejamiento WS/HTTP/nodo de múltiples instancias). Por defecto a `threads` + `isolate: false` con trabajadores adaptables en `vitest.e2e.config.ts`; ajustar con `OPENCLAW_E2E_WORKERS=<n>` y establecer `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:all`: Compila la imagen de pruebas en vivo compartida, empaqueta OpenClaw una vez como un tarball de npm, compila/reutiliza una imagen básica de ejecución de Node/Git además de una imagen funcional que instala ese tarball en `/app`, y luego ejecuta carriles de prueba de humo de Docker con `OPENCLAW_SKIP_DOCKER_BUILD=1` a través de un planificador ponderado. La imagen básica (`OPENCLAW_DOCKER_E2E_BARE_IMAGE`) se utiliza para carriles de instalador/actualización/dependencia de complemento; esos carriles montan el tarball precompilado en lugar de usar las fuentes del repositorio copiadas. La imagen funcional (`OPENCLAW_DOCKER_E2E_FUNCTIONAL_IMAGE`) se utiliza para carriles de funcionalidad de aplicación compilada normal. `scripts/package-openclaw-for-docker.mjs` es el único empaquetador de paquetes local/CI y valida el tarball más `dist/postinstall-inventory.json` antes de que Docker lo consuma. Las definiciones de carriles de Docker viven en `scripts/lib/docker-e2e-scenarios.mjs`; la lógica del planificador vive en `scripts/lib/docker-e2e-plan.mjs`; `scripts/test-docker-all.mjs` ejecuta el plan seleccionado. `node scripts/test-docker-all.mjs --plan-json` emite el plan de CI propiedad del planificador para carriles seleccionados, tipos de imagen, necesidades de paquete/imagen en vivo y verificaciones de credenciales sin compilar ni ejecutar Docker. `OPENCLAW_DOCKER_ALL_PARALLELISM=<n>` controla las ranuras de proceso y por defecto es 10; `OPENCLAW_DOCKER_ALL_TAIL_PARALLELISM=<n>` controla el grupo de cola sensible al proveedor y por defecto es 10. Los límites de carriles pesados son por defecto `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` y `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7`; los límites de proveedores son por defecto un carril pesado por proveedor a través de `OPENCLAW_DOCKER_ALL_LIVE_CLAUDE_LIMIT=4`, `OPENCLAW_DOCKER_ALL_LIVE_CODEX_LIMIT=4` y `OPENCLAW_DOCKER_ALL_LIVE_GEMINI_LIMIT=4`. Use `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` o `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` para hosts más grandes. Si un carril excede el peso efectivo o el límite de recursos en un host de baja paralelismo, aún puede iniciarse desde un grupo vacío y se ejecutará solo hasta que libere capacidad. Los inicios de los carriles se escalonan en 2 segundos por defecto para evitar tormentas de creación del demonio local de Docker; anule con `OPENCLAW_DOCKER_ALL_START_STAGGER_MS=<ms>`. El ejecutor realiza verificaciones previas de Docker por defecto, limpia contenedores obsoletos de OpenClaw E2E, emite el estado de carril activo cada 30 segundos, comparte cachés de herramientas CLI de proveedor entre carriles compatibles, reintenta fallas transitorias de proveedores en vivo una vez por defecto (`OPENCLAW_DOCKER_ALL_LIVE_RETRIES=<n>`) y almacena los tiempos de los carriles en `.artifacts/docker-tests/lane-timings.json` para un ordenamiento de los más largos primero en ejecuciones posteriores. Use `OPENCLAW_DOCKER_ALL_DRY_RUN=1` para imprimir el manifiesto del carril sin ejecutar Docker, `OPENCLAW_DOCKER_ALL_STATUS_INTERVAL_MS=<ms>` para ajustar la salida de estado, o `OPENCLAW_DOCKER_ALL_TIMINGS=0` para deshabilitar la reutilización de tiempos. Use `OPENCLAW_DOCKER_ALL_LIVE_MODE=skip` solo para carriles deterministas locales o `OPENCLAW_DOCKER_ALL_LIVE_MODE=only` solo para carriles de proveedores en vivo; los alias de paquetes son `pnpm test:docker:local:all` y `pnpm test:docker:live:all`. El modo solo en vivo fusiona los carriles en vivo principales y de cola en un solo grupo de los más largos primero para que los cubos de proveedores puedan empaquetar el trabajo de Claude, Codex y Gemini juntos. El ejecutor deja de programar nuevos carriles agrupados después del primer fallo a menos que se establezca `OPENCLAW_DOCKER_ALL_FAIL_FAST=0`, y cada carril tiene un tiempo de espera de reserva de 120 minutos anulable con `OPENCLAW_DOCKER_ALL_LANE_TIMEOUT_MS`; los carriles en vivo/ de cola seleccionados utilizan límites más estrictos por carril. Los comandos de configuración de Docker del backend de CLI tienen su propio tiempo de espera a través de `OPENCLAW_LIVE_CLI_BACKEND_SETUP_TIMEOUT_SECONDS` (predeterminado 180). Los registros por carril, `summary.json`, `failures.json` y los tiempos de fase se escriben en `.artifacts/docker-tests/<run-id>/`; use `pnpm test:docker:timings <summary.json>` para inspeccionar carriles lentos y `pnpm test:docker:rerun <run-id|summary.json|failures.json>` para imprimir comandos de reejecución dirigidos económicos.
- `pnpm test:docker:browser-cdp-snapshot`: Compila un contenedor E2E de fuente basado en Chromium, inicia CDP sin procesar más un Gateway aislado, ejecuta `browser doctor --deep` y verifica que las instantáneas de roles de CDP incluyan URL de enlace, elementos interactivos promovidos por el cursor, referencias de iframe y metadatos de marco.
- Las sondas en vivo de Docker del backend de CLI se pueden ejecutar como carriles enfocados, por ejemplo `pnpm test:docker:live-cli-backend:codex`, `pnpm test:docker:live-cli-backend:codex:resume` o `pnpm test:docker:live-cli-backend:codex:mcp`. Claude y Gemini tienen alias coincidentes `:resume` y `:mcp`.
- `pnpm test:docker:openwebui`: Inicia OpenClaw y Open WebUI en Docker, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat real proxy a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites unitarias/e2e normales.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway semillado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envío saliente y las notificaciones de canal y permisos de estilo Claude sobre el puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio sin procesar directamente, por lo que la prueba refleja lo que el puente realmente emite.

## Comprobación de PR local

Para las comprobaciones de aterizaje/comprobación de puerta de PR local, ejecute:

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla esporádicamente en un host cargado, vuelva a ejecutar una vez antes de tratarlo como una regresión, luego aíslelo con `pnpm test <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banco de pruebas de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Responde con una sola palabra: ok. Sin puntuación ni texto extra.”

Última ejecución (2025-12-31, 20 ejecuciones):

- minimax mediana 1279ms (mín 1114, máx 2431)
- opus mediana 2454ms (mín 1224, máx 3170)

## Benchmark de inicio de CLI

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

Preajustes:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `tasks --json`, `tasks list --json`, `tasks audit --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos preajustes

La salida incluye `sampleCount`, promedio, p50, p95, min/max, distribución de código de salida/señal y resúmenes de RSS máximo para cada comando. Opcional `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la medición de tiempo y la captura de perfil usen el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de humo (smoke) objetivo en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de la suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el dispositivo de referencia (baseline fixture) registrado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Dispositivo (fixture) registrado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales con el dispositivo con `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humo (smoke tests) de incorporación (onboarding) contenerizadas.

Flujo completo de inicio en frío en un contenedor limpio de Linux:

```bash
scripts/e2e/onboard-docker.sh
```

Este script maneja el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia el gateway y ejecuta `openclaw health`.

## Prueba de humo de importación QR (Docker)

Asegura que el asistente de tiempo de ejecución QR mantenido se cargue bajo los tiempos de ejecución de Docker Node compatibles (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```

## Relacionado

- [Pruebas](/es/help/testing)
- [Pruebas en vivo](/es/help/testing-live)
