---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, en vivo, Docker): [Testing](/es/help/testing)

- `pnpm test:force`: Mata cualquier proceso de gateway residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de gateway aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Use esto cuando una ejecución previa del gateway dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Este es un filtro de cobertura unitaria de archivos cargados, no una cobertura de todos los archivos del repositorio completo. Los umbrales son del 70% para líneas/funciones/declaraciones y del 55% para ramas. Debido a que `coverage.all` es falso, el filtro mide los archivos cargados por la suite de cobertura unitaria en lugar de tratar cada archivo fuente de carril dividido como no cubierto.
- `pnpm test:coverage:changed`: Ejecuta la cobertura unitaria solo para los archivos modificados desde `origin/main`.
- `pnpm test:changed`: Expande las rutas de git modificadas en carriles (lanes) de Vitest con alcance cuando la diferencia solo toca archivos fuente/pruebas enrutables. Los cambios de configuración/configuración aún recurren a la ejecución de proyectos raíz nativos, por lo que las ediciones de conexión (wiring) se vuelven a ejecutar ampliamente cuando es necesario.
- `pnpm changed:lanes`: Muestra los carriles arquitectónicos activados por la diferencia contra `origin/main`.
- `pnpm check:changed`: ejecuta la puerta de cambios inteligente para la diferencia contra `origin/main`. Ejecuta el trabajo principal con carriles de prueba principales, el trabajo de extensión con carriles de prueba de extensión, el trabajo solo de pruebas con typecheck de pruebas/solo pruebas, expande los cambios públicos del SDK de complementos o del contrato de complementos a la validación de extensiones, y mantiene los incrementos de versión solo de metadatos de lanzamiento en las comprobaciones de versión/configuración/dependencia raíz dirigidas.
- `pnpm test`: Enruta objetivos explícitos de archivo/directorio a través de carriles (lanes) de Vitest con alcance. Las ejecuciones sin objetivo usan grupos de fragmentos fijos y se expanden a configuraciones hoja para ejecución paralela local; el grupo de extensión siempre se expande a las configuraciones de fragmentos por extensión en lugar de un único proceso gigante de proyecto raíz.
- Las ejecuciones de fragmentos completos y de extensiones actualizan los datos de cronometraje local en `.artifacts/vitest-shard-timings.json`; las ejecuciones posteriores utilizan esos cronometrajes para equilibrar los fragmentos lentos y rápidos. Establezca `OPENCLAW_TEST_PROJECTS_TIMINGS=0` para ignorar el artefacto de cronometraje local.
- Los archivos de prueba seleccionados `plugin-sdk` y `commands` ahora se enrutan a través de carriles ligeros dedicados que mantienen solo `test/setup.ts`, dejando los casos de carga intensiva de tiempo de ejecución en sus carriles existentes.
- Los archivos fuente de ayuda `plugin-sdk` y `commands` seleccionados también asignan `pnpm test:changed` a pruebas hermanas explícitas en esos carriles ligeros, por lo que las ediciones pequeñas de ayuda evitan volver a ejecutar las suites pesadas respaldadas por el runtime.
- `auto-reply` ahora también se divide en tres configuraciones dedicadas (`core`, `top-level`, `reply`) para que el arnés de respuesta no domine las pruebas más ligeras de estado/token/ayuda de nivel superior.
- La configuración base de Vitest ahora tiene como valor predeterminado `pool: "threads"` y `isolate: false`, con el ejecutor compartido no aislado habilitado en todas las configuraciones del repositorio.
- `pnpm test:channels` ejecuta `vitest.channels.config.ts`.
- `pnpm test:extensions` y `pnpm test extensions` ejecutan todos los fragmentos de extensiones/complementos. Las extensiones de canal pesadas y OpenAI se ejecutan como fragmentos dedicados; otros grupos de extensiones permanecen agrupados. Use `pnpm test extensions/<id>` para un carril de complemento agrupado.
- `pnpm test:perf:imports`: habilita los informes de duración de importación + desglose de importación de Vitest, mientras aún usa el enrutamiento de carril con ámbito para objetivos de archivo/directorio explícitos.
- `pnpm test:perf:imports:changed`: mismo perfilado de importación, pero solo para archivos cambiados desde `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compara el rendimiento de la ruta en modo de cambios enrutados con la ejecución del proyecto raíz nativo para el mismo diff de git confirmado.
- `pnpm test:perf:changed:bench -- --worktree` compara el rendimiento del conjunto de cambios del árbol de trabajo actual sin confirmar primero.
- `pnpm test:perf:profile:main`: escribe un perfil de CPU para el hilo principal de Vitest (`.artifacts/vitest-main-profile`).
- `pnpm test:perf:profile:runner`: escribe perfiles de CPU + heap para el ejecutor de unidades (`.artifacts/vitest-runner-profile`).
- Integración de Gateway: opt-in mediante `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de la puerta de enlace (emparejamiento WS/HTTP/nodo de varias instancias). Por defecto es `threads` + `isolate: false` con trabajadores adaptativos en `vitest.e2e.config.ts`; ajustar con `OPENCLAW_E2E_WORKERS=<n>` y establecer `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves de API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.
- `pnpm test:docker:openwebui`: Inicia OpenClaw y Open WebUI en Docker, inicia sesión a través de Open WebUI, verifica `/api/models` y luego ejecuta un chat proxy real a través de `/api/chat/completions`. Requiere una clave de modelo en vivo utilizable (por ejemplo, OpenAI en `~/.profile`), extrae una imagen externa de Open WebUI y no se espera que sea estable en CI como las suites normales de unidad/e2e.
- `pnpm test:docker:mcp-channels`: Inicia un contenedor de Gateway semillado y un segundo contenedor cliente que genera `openclaw mcp serve`, luego verifica el descubrimiento de conversaciones enrutadas, lecturas de transcripciones, metadatos de archivos adjuntos, el comportamiento de la cola de eventos en vivo, el enrutamiento de envíos salientes y las notificaciones de canal y permisos estilo Claude a través del puente stdio real. La aserción de notificación de Claude lee los marcos MCP de stdio sin procesar directamente para que la prueba de humo refleje lo que el puente realmente emite.

## Puerta de enlace PR local

Para verificaciones de aterrizaje/puerta de PR locales, ejecute:

- `pnpm check:changed`
- `pnpm check`
- `pnpm check:test-types`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla esporádicamente en un host cargado, vuelva a ejecutar una vez antes de tratarlo como una regresión y luego aísle con `pnpm test <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test`
- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-vitest-cache pnpm test:changed`

## Banco de pruebas de latencia del modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Responde con una sola palabra: ok. Sin puntuación o texto extra.”

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana de minimax 1279ms (mín 1114, máx 2431)
- mediana de opus 2454ms (mín 1224, máx 3170)

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
- `pnpm tsx scripts/bench-cli-startup.ts --entry openclaw.mjs --entry-secondary dist/entry.js --preset all`
- `pnpm tsx scripts/bench-cli-startup.ts --preset all --output .artifacts/cli-startup-bench-all.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --case gatewayStatusJson --output .artifacts/cli-startup-bench-smoke.json`
- `pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu`
- `pnpm tsx scripts/bench-cli-startup.ts --json`

Ajustes predeterminados:

- `startup`: `--version`, `--help`, `health`, `health --json`, `status --json`, `status`
- `real`: `health`, `status`, `status --json`, `sessions`, `sessions --json`, `agents list --json`, `gateway status`, `gateway status --json`, `gateway health --json`, `config get gateway.port`
- `all`: ambos ajustes predeterminados

La salida incluye `sampleCount`, promedio, p50, p95, mín/máx, distribución de código de salida/señal, y resúmenes de RSS máximos para cada comando. Opcional `--cpu-prof-dir` / `--heap-prof-dir` escribe perfiles V8 por ejecución para que la cronometraje y la captura de perfil utilicen el mismo arnés.

Convenciones de salida guardada:

- `pnpm test:startup:bench:smoke` escribe el artefacto de humo objetivo en `.artifacts/cli-startup-bench-smoke.json`
- `pnpm test:startup:bench:save` escribe el artefacto de la suite completa en `.artifacts/cli-startup-bench-all.json` usando `runs=5` y `warmup=1`
- `pnpm test:startup:bench:update` actualiza el fixture de línea base verificado en `test/fixtures/cli-startup-bench.json` usando `runs=5` y `warmup=1`

Fixture verificado:

- `test/fixtures/cli-startup-bench.json`
- Actualizar con `pnpm test:startup:bench:update`
- Comparar los resultados actuales con el fixture con `pnpm test:startup:bench:check`

## Onboarding E2E (Docker)

Docker es opcional; esto solo es necesario para pruebas de humeo de onboarding en contenedores.

Flujo completo de inicio en frío en un contenedor limpio de Linux:

```bash
scripts/e2e/onboard-docker.sh
```

Este script controla el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia la puerta de enlace y ejecuta `openclaw health`.

## Prueba de humeo de importación QR (Docker)

Asegura que `qrcode-terminal` se cargue bajo los tiempos de ejecución de Node de Docker admitidos (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```
