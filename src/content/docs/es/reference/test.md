---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, live, Docker): [Testing](/en/help/testing)

- `pnpm test:force`: Mata cualquier proceso de gateway residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de gateway aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Use esto cuando una ejecución previa del gateway dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Los umbrales globales son del 70% para líneas/ramas/funciones/sentencias. La cobertura excluye los puntos de entrada con mucha integración (cableado CLI, puentes gateway/telegram, servidor estático webchat) para mantener el objetivo enfocado en la lógica susceptible de pruebas unitarias.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos modificados desde `origin/main`.
- `pnpm test:changed`: ejecuta el wrapper con `--changed origin/main`. La configuración base de Vitest trata los manifiestos/archivos de configuración del wrapper como `forceRerunTriggers`, por lo que los cambios en el planificador todavía se vuelven a ejecutar ampliamente cuando es necesario.
- `pnpm test`: ejecuta el wrapper completo. Mantiene solo un pequeño manifiesto de anulación de comportamiento en git, luego usa una instantánea de sincronización registrada para separar los archivos de unidad más pesados medidos en carriles dedicados.
- Los archivos de unidad por defecto son `threads` en el wrapper; mantenga las excepciones solo de bifurcación (fork-only) documentadas en `test/fixtures/test-parallel.behavior.json`.
- `pnpm test:channels` ahora por defecto es `threads` a través de `vitest.channels.config.ts`; la ejecución de control directa de la suite completa del 22 de marzo de 2026 pasó limpia sin excepciones de bifurcación específicas del canal.
- `pnpm test:extensions` se ejecuta a través del wrapper y mantiene documentadas las excepciones solo de bifurcación de extensiones en `test/fixtures/test-parallel.behavior.json`; el carril de extensión compartida todavía por defecto es `threads`.
- `pnpm test:extensions`: ejecuta las suites de extensiones/plugins.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest para el wrapper.
- `pnpm test:perf:imports:changed`: mismo perfilado de importación, pero solo para archivos modificados desde `origin/main`.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el subproceso principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + heap para el ejecutor de unidades (`.artifacts/vitest-runner-profile`).
- `pnpm test:perf:update-timings`: actualiza la instantánea de sincronización de archivos lentos registrada utilizada por `scripts/test-parallel.mjs`.
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de la puerta de enlace (emparejamiento de múltiples instancias WS/HTTP/nodo). Por defecto es `forks` + trabajadores adaptativos en `vitest.e2e.config.ts`; ajusta con `OPENCLAW_E2E_WORKERS=<n>` y establece `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:openwebui`: Inicia OpenClaw y Open WebUI en Docker, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales de unitarias/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway semillado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente y notificaciones de canal y permisos estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio sin procesar directamente para que la prueba de humo refleje lo que el puente realmente emite.

## Portero de PR local

Para comprobaciones de aterizaje/portero de PR locales, ejecute:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla esporádicamente en un host cargado, vuelva a ejecutarlo una vez antes de tratarlo como una regresión, luego aíslelo con `pnpm vitest run <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Bench de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Reply with a single word: ok. No punctuation or extra text.”

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Ajustes preestablecidos:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos preajustes

La salida incluye `sampleCount`, promedio, p50, p95, min/máx, distribución de código de salida/señal, y resúmenes de RSS máximo para cada comando. Opcionalmente, `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la medición de tiempo y la captura de perfiles utilicen el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de humo específico en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el accesorio de línea base verificado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Accesorio verificado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales contra el accesorio con `pnpm test:startup:bench:check`

## Incorporación E2E (Docker)

Docker es opcional; esto solo es necesario para pruebas de humo de incorporación en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script maneja el asistente interactivo a través de una pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, y luego inicia el gateway y ejecuta `openclaw health`.

## Prueba de humo de importación QR (Docker)

Asegura que `qrcode-terminal` se cargue bajo los tiempos de ejecución Docker Node compatibles (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```
