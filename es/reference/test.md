---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Ejecutar o corregir pruebas
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, live, Docker): [Testing](/es/help/testing)

- `pnpm test:force`: Mata cualquier proceso de puerta de enlace persistente que tenga el puerto de control predeterminado, luego ejecuta la suite completa de Vitest con un puerto de puerta de enlace aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Úselo cuando una ejecución anterior de la puerta de enlace dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Los umbrales globales son del 70% en líneas/ramas/funciones/declaraciones. La cobertura excluye los puntos de entrada con mucha integración (cableado de CLI, puentes de puerta de enlace/telegram, servidor estático de webchat) para mantener el objetivo centrado en la lógica comprobable por unidades.
- `pnpm test` en Node 22, 23 y 24 usa Vitest `vmForks` de forma predeterminada para un inicio más rápido. Node 25+ vuelve a `forks` hasta que se valide nuevamente. Puede forzar el comportamiento con `OPENCLAW_TEST_VM_FORKS=0|1`.
- `pnpm test`: ejecuta el carril unitario central rápido de forma predeterminada para obtener comentarios locales rápidos.
- `pnpm test:channels`: ejecuta suites con muchas canalizaciones (channels).
- `pnpm test:extensions`: ejecuta suites de extensiones/complementos.
- Integración de puerta de enlace: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de la puerta de enlace (emparejamiento WS/HTTP/nodo de varias instancias). Por defecto es `vmForks` + trabajadores adaptables en `vitest.e2e.config.ts`; ajuste con `OPENCLAW_E2E_WORKERS=<n>` y configure `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.

## Puerta de PR local

Para las comprobaciones de aterrizaje/puerta de PR locales, ejecute:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla intermitentemente en un host cargado, vuelva a ejecutarlo una vez antes de tratarlo como una regresión, y luego aíslelo con `pnpm vitest run <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## Bench de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Responde con una sola palabra: ok. Sin puntuación ni texto extra.”

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana minimax 1279ms (mín 1114, máx 2431)
- mediana opus 2454ms (mín 1224, máx 3170)

## Bench de inicio de CLI

Script: [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Uso:

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

Esto evalúa los siguientes comandos:

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

La salida incluye promedio, p50, p95, min/máx y la distribución de códigos de salida/señales para cada comando.

## E2E de incorporación (Docker)

Docker es opcional; esto solo se necesita para pruebas de humeo de incorporación en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script ejecuta el asistente interactivo a través de un pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia la puerta de enlace y ejecuta `openclaw health`.

## Prueba de humeo de importación QR (Docker)

Asegura que `qrcode-terminal` se cargue bajo los tiempos de ejecución de Docker Node compatibles (Node 24 por defecto, Node 22 compatible):

```bash
pnpm test:docker:qr
```

import es from "/components/footer/es.mdx";

<es />
