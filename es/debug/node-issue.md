---
summary: Node + tsx "__name is not a function" notas de fallos y soluciones temporales
read_when:
  - Depuración de scripts de desarrollo solo de Node o fallos en modo observación
  - Investigando fallos del cargador tsx/esbuild en OpenClaw
title: "Fallo de Node + tsx"
---

# Fallo de Node + tsx "__name is not a function"

## Resumen

Ejecutar OpenClaw mediante Node con `tsx` falla al inicio con:

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

Esto comenzó después de cambiar los scripts de desarrollo de Bun a `tsx` (commit `2871657e`, 2026-01-06). La misma ruta de ejecución funcionaba con Bun.

## Entorno

- Node: v25.x (observado en v25.3.0)
- tsx: 4.21.0
- SO: macOS (la reproducción también es probable en otras plataformas que ejecuten Node 25)

## Reproducción (solo Node)

```bash
# in repo root
node --version
pnpm install
node --import tsx src/entry.ts status
```

## Reproducción mínima en el repositorio

```bash
node --import tsx scripts/repro/tsx-name-repro.ts
```

## Verificación de versión de Node

- Node 25.3.0: falla
- Node 22.22.0 (Homebrew `node@22`): falla
- Node 24: aún no instalado aquí; necesita verificación

## Notas / hipótesis

- `tsx` usa esbuild para transformar TS/ESM. El `keepNames` de esbuild emite un auxiliar `__name` y envuelve las definiciones de funciones con `__name(...)`.
- El fallo indica que `__name` existe pero no es una función en tiempo de ejecución, lo que implica que el auxiliar falta o se ha sobrescrito para este módulo en la ruta del cargador de Node 25.
- Se han informado problemas similares con el auxiliar `__name` en otros consumidores de esbuild cuando el auxiliar falta o se reescribe.

## Historial de regresiones

- `2871657e` (2026-01-06): scripts cambiados de Bun a tsx para hacer que Bun sea opcional.
- Antes de eso (ruta Bun), `openclaw status` y `gateway:watch` funcionaban.

## Soluciones temporales

- Usar Bun para los scripts de desarrollo (reversión temporal actual).
- Usar Node + tsc watch y luego ejecutar el resultado compilado:

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- Confirmado localmente: `pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` funciona en Node 25.
- Deshabilitar esbuild keepNames en el cargador TS si es posible (evita la inserción del auxiliar `__name`); tsx actualmente no expone esto.
- Probar Node LTS (22/24) con `tsx` para ver si el problema es específico de Node 25.

## Referencias

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## Próximos pasos

- Reproducir en Node 22/24 para confirmar la regresión en Node 25.
- Probar `tsx` nightly o fijar a una versión anterior si existe una regresión conocida.
- Si se reproduce en Node LTS, enviar un caso de reproducción mínimo aguas arriba con el seguimiento de la pila `__name`.

import en from "/components/footer/en.mdx";

<en />
