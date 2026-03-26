---
summary: "Cómo ejecutar pruebas localmente (vitest) y cuándo usar los modos force/coverage"
read_when:
  - Running or fixing tests
title: "Pruebas"
---

# Pruebas

- Kit de pruebas completo (suites, en vivo, Docker): [Testing](/es/help/testing)

- `pnpm test:force`: Mata cualquier proceso de gateway residual que mantenga el puerto de control predeterminado y luego ejecuta la suite completa de Vitest con un puerto de gateway aislado para que las pruebas del servidor no colisionen con una instancia en ejecución. Use esto cuando una ejecución previa del gateway dejó el puerto 18789 ocupado.
- `pnpm test:coverage`: Ejecuta la suite unitaria con cobertura V8 (vía `vitest.unit.config.ts`). Los umbrales globales son del 70% para líneas/ramas/funciones/sentencias. La cobertura excluye los puntos de entrada con mucha integración (cableado CLI, puentes gateway/telegram, servidor estático webchat) para mantener el objetivo enfocado en la lógica susceptible de pruebas unitarias.
- `pnpm test` en Node 22, 23 y 24 usa Vitest `vmForks` de forma predeterminada para un inicio más rápido. Node 25+ vuelve a `forks` hasta que se vuelva a validar. Puede forzar el comportamiento con `OPENCLAW_TEST_VM_FORKS=0|1`.
- `pnpm test`: ejecuta el contenedor completo. Mantiene solo un pequeño manifiesto de anulación de comportamiento en git, luego utiliza una instantánea de sincronización verificada para extraer los archivos de unidad más pesados medidos en carriles dedicados.
- `pnpm test:channels`: ejecuta suites con muchas operaciones de canal.
- `pnpm test:extensions`: ejecuta suites de extensiones/plugins.
- `pnpm test:perf:update-timings`: actualiza la instantánea de sincronización de archivos lentos verificada utilizada por `scripts/test-parallel.mjs`.
- Integración de Gateway: participación opcional a través de `OPENCLAW_TEST_INCLUDE_GATEWAY=1 pnpm test` o `pnpm test:gateway`.
- `pnpm test:e2e`: Ejecuta pruebas de humo de extremo a extremo de Gateway (emparejamiento WS/HTTP/node de varias instancias). Por defecto es `vmForks` + trabajadores adaptativos en `vitest.e2e.config.ts`; ajustar con `OPENCLAW_E2E_WORKERS=<n>` y establecer `OPENCLAW_E2E_VERBOSE=1` para registros detallados.
- `pnpm test:live`: Ejecuta pruebas en vivo del proveedor (minimax/zai). Requiere claves API y `LIVE=1` (o `*_LIVE_TEST=1` específico del proveedor) para no omitir.

## Puerta local de PR

Para comprobaciones locales de aterrizaje/puerta de PR, ejecute:

- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm check:docs`

Si `pnpm test` falla intermitentemente en un host cargado, vuelva a ejecutar una vez antes de tratarlo como una regresión, luego aísle con `pnpm vitest run <path/to/test>`. Para hosts con restricciones de memoria, use:

- `OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test`

## Bench de latencia de modelo (claves locales)

Script: [`scripts/bench-model.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-model.ts)

Uso:

- `source ~/.profile && pnpm tsx scripts/bench-model.ts --runs 10`
- Env opcional: `MINIMAX_API_KEY`, `MINIMAX_BASE_URL`, `MINIMAX_MODEL`, `ANTHROPIC_API_KEY`
- Prompt predeterminado: “Responde con una sola palabra: ok. Sin puntuación ni texto adicional.”

Última ejecución (2025-12-31, 20 ejecuciones):

- mediana minimax 1279ms (min 1114, max 2431)
- mediana opus 2454ms (min 1224, max 3170)

## Bench de inicio de CLI

Script: [`scripts/bench-cli-startup.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/bench-cli-startup.ts)

Uso:

- `pnpm tsx scripts/bench-cli-startup.ts`
- `pnpm tsx scripts/bench-cli-startup.ts --runs 12`
- `pnpm tsx scripts/bench-cli-startup.ts --entry dist/entry.js --timeout-ms 45000`

Esto realiza benchmarks de estos comandos:

- `--version`
- `--help`
- `health --json`
- `status --json`
- `status`

El resultado incluye el promedio, p50, p95, mínimo/máximo y la distribución de códigos de salida/señales para cada comando.

## Onboarding E2E (Docker)

Docker es opcional; esto solo se necesita para pruebas de humeo de incorporación en contenedores.

Flujo completo de inicio en frío en un contenedor Linux limpio:

```bash
scripts/e2e/onboard-docker.sh
```

Este script controla el asistente interactivo a través de una pseudo-tty, verifica los archivos de configuración/espacio de trabajo/sesión, luego inicia la puerta de enlace y ejecuta `openclaw health`.

## QR import smoke (Docker)

Asegura que `qrcode-terminal` se cargue bajo los tiempos de ejecución de Docker Node compatibles (Node 24 predeterminado, Node 22 compatible):

```bash
pnpm test:docker:qr
```

import es from "/components/footer/es.mdx";

<es />
