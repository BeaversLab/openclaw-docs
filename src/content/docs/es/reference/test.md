---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, live, Docker): [Testing](/es/help/testing)

- `pnpm test:force`: Mata cualquier proceso de gateway residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de gateway aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Use esto cuando una ejecución previa del gateway dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Los umbrales globales son del 70% para líneas/ramas/funciones/sentencias. La cobertura excluye los puntos de entrada con mucha integración (cableado CLI, puentes gateway/telegram, servidor estático webchat) para mantener el objetivo enfocado en la lógica susceptible de pruebas unitarias.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos modificados desde `origin/main`.
- `pnpm test:changed`: expande las rutas de git modificadas en carriles de Vitest con alcance cuando el diff solo toca archivos de origen/prueba enrutables. Los cambios de configuración/configuración todavía recurren a la ejecución de proyectos raíz nativos, por lo que las ediciones de cableado se vuelven a ejecutar ampliamente cuando es necesario.
- `pnpm test`: enruta objetivos de archivo/directorio explícitos a través de carriles de Vitest con alcance. Las ejecuciones no dirigidas ahora ejecutan once configuraciones de fragmentos secuenciales (`vitest.full-core-unit-src.config.ts`, `vitest.full-core-unit-security.config.ts`, `vitest.full-core-unit-ui.config.ts`, `vitest.full-core-unit-support.config.ts`, `vitest.full-core-support-boundary.config.ts`, `vitest.full-core-contracts.config.ts`, `vitest.full-core-bundled.config.ts`, `vitest.full-core-runtime.config.ts`, `vitest.full-agentic.config.ts`, `vitest.full-auto-reply.config.ts`, `vitest.full-extensions.config.ts`) en lugar de un único proceso gigante de proyecto raíz.
- Los archivos de prueba `plugin-sdk` y `commands` seleccionados ahora se enrutan a través de carriles ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos con gran carga de tiempo de ejecución en sus carriles existentes.
- Los archivos de origen auxiliares `plugin-sdk` y `commands` seleccionados también mapean `pnpm test:changed` a pruebas explícitas adyacentes en esos carriles ligeros, por lo que las pequeñas ediciones auxiliares evitan volver a ejecutar las suites pesadas respaldadas por el tiempo de ejecución.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/auxiliar de nivel superior.
- La configuración base de Vitest ahora tiene por defecto `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en todas las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` ejecuta `vitest.extensions.config.ts`.
- `pnpm test:extensions`: ejecuta suites de extensiones/complementos.
- `pnpm test:perf:imports`: habilita el informe de duración de importación + desglose de importación de Vitest, mientras sigue utilizando el enrutamiento de carriles con alcance para objetivos de archivo/directorio explícitos.
- `pnpm test:perf:imports:changed`: mismo perfilado de importación, pero solo para los archivos cambiados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara la ruta del modo de cambios enrutados con la ejecución nativa del proyecto raíz para el mismo git diff confirmado.
- `pnpm test:perf:changed:bench -- --worktree` compara el conjunto de cambios del árbol de trabajo actual sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el hilo principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + heap para el ejecutor de unidades (`.artifacts/vitest-runner-profile`).
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de Gateway (emparejamiento multi-instancia WS/HTTP/nodo). Por defecto a `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajuste con `OPENCLAW_E2E_WORKERS=<n>` y establezca `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:openwebui`: Inicia OpenClaw en Docker + Open WebUI, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales de unidad/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway semillado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envíos salientes y notificaciones de canal y permisos al estilo de Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio sin procesar directamente para que el reflejo de humo refleje lo que el puente realmente emite.

## Puerta de PR local

Para verificaciones locales de aterrizaje/puerta de PR, ejecute:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla en un host cargado, ejecútelo de nuevo antes de tratarlo como una regresión, luego aíslelo con `pnpm test <path/to/test>`. Para hosts con memoria limitada, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banco de pruebas de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Responde con una sola palabra: ok. Sin puntuación ni texto extra.”

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Preajustes:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos preajustes

La salida incluye `sampleCount`, promedio, p50, p95, min/máx, distribución de código de salida/señal, y resúmenes de RSS máximo para cada comando. Opcionalmente, `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la captura de tiempos y perfiles utilice el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de smoke (prueba básica) objetivo en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el dispositivo de línea base confirmado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Dispositivo confirmado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales con el dispositivo con `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker es opcional; solo se necesita para pruebas de smoke de incorporación (onboarding) en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script ejecuta el asistente interactivo a través de un pseudo-tty, verifica los archivos de config/espacio de trabajo/sesión, luego inicia el gateway y ejecuta `openclaw health`.

## Prueba de smoke de importación QR (Docker)

Asegura que `qrcode-terminal` se cargue bajo los tiempos de ejecución de Docker Node admitidos (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```
