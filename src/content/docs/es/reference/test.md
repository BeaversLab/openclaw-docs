---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, en vivo, Docker): [Testing](/en/help/testing)

- `pnpm test:force`: Mata cualquier proceso de gateway residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de gateway aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Use esto cuando una ejecución previa del gateway dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Los umbrales globales son del 70% para líneas/ramas/funciones/sentencias. La cobertura excluye los puntos de entrada con mucha integración (cableado CLI, puentes gateway/telegram, servidor estático webchat) para mantener el objetivo enfocado en la lógica susceptible de pruebas unitarias.
- `pnpm test:coverage:changed`: Ejecuta la cobertura de unidades solo para los archivos modificados desde `origin/main`.
- `pnpm test:changed`: ejecuta la configuración nativa de proyectos de Vitest con `--changed origin/main`. La configuración base trata los archivos de proyectos/configuración como `forceRerunTriggers` para que los cambios en el cableado todavía se ejecuten ampliamente cuando sea necesario.
- `pnpm test`: ejecuta la configuración nativa de proyectos raíz de Vitest directamente. Los filtros de archivos funcionan de forma nativa en los proyectos configurados.
- La configuración base de Vitest ahora tiene por defecto `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` ejecuta `vitest.extensions.config.ts`.
- `pnpm test:extensions`: ejecuta las suites de extensiones/plugins.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest para la ejecución nativa de proyectos raíz.
- `pnpm test:perf:imports:changed`: mismo perfilado de importación, pero solo para archivos modificados desde `origin/main`.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el hilo principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + heap para el ejecutor de pruebas unitarias (`.artifacts/vitest-runner-profile`).
- Integración con Gateway: participation opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de Gateway (emparejamiento WS/HTTP/nodo de múltiples instancias). Por defecto a `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajustar con `OPENCLAW_E2E_WORKERS=<n>` y establecer `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para omitir.
- `pnpm test:docker:openwebui`: Inicia OpenClaw + Open WebUI en Docker, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat de proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales unitarias/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor Gateway con semilla y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, comportamiento de la cola de eventos en vivo, enrutamiento de envío saliente y notificaciones de canal y permisos estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP stdio brutos directamente, por lo que la prueba refleja lo que el puente realmente emite.

## Puerta de enlace de PR local

Para las comprobaciones de recepción/puerta de PR locales, ejecute:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla esporádicamente en un host cargado, vuelva a ejecutar una vez antes de tratarlo como una regresión, luego aísle con `pnpm test <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banco de pruebas de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: "Responda con una sola palabra: ok. Sin puntuación ni texto adicional."

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana de minimax 1279ms (mín 1114, máx 2431)
- mediana de opus 2454ms (mín 1224, máx 3170)

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

Ajustes predefinidos:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos ajustes predefinidos

La salida incluye `sampleCount`, promedio, p50, p95, mín/máx, distribución de código de salida/señal, y resúmenes de RSS máximo para cada comando. Opcional `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la captura de tiempo y de perfil utilicen el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de humo (smoke) dirigido en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el accesorio de línea base (baseline) confirmado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Accesorio confirmado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales contra el accesorio con `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humo (smoke tests) de integración (onboarding) en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script maneja el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia la puerta de enlace (gateway) y ejecuta `openclaw health`.

## Prueba de humo de importación QR (Docker)

Asegura que `qrcode-terminal` se cargue en los tiempos de ejecución de Docker Node compatibles (Node 24 predeterminado, Node 22 compatible):

```bash
pnpm test:docker:qr
```
