---
summary: Notas y soluciones para el fallo "__name is not a function" en Node + tsx
read_when:
  - Debugging Node-only dev scripts or watch mode failures
  - Investigating tsx/esbuild loader crashes in OpenClaw
title: "Fallo de Node + tsx"
---

# Fallo "\_\_name is not a function" en Node + tsx

## Resumen

Ejecutar OpenClaw a través de Node con `tsx` falla al inicio con:

```
[openclaw] Failed to start CLI: TypeError: __name is not a function
    at createSubsystemLogger (.../src/logging/subsystem.ts:203:25)
    at .../src/agents/auth-profiles/constants.ts:25:20
```

Esto comenzó después de cambiar los scripts de desarrollo de Bun a `tsx` (commit `2871657e`, 2026-01-06). La misma ruta de ejecución funcionaba con Bun.

## Entorno

- Node: v25.x (observado en v25.3.0)
- tsx: 4.21.0
- SO: macOS (es probable que también se reproduzca en otras plataformas que ejecuten Node 25)

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

## Comprobación de versión de Node

- Node 25.3.0: falla
- Node 22.22.0 (Homebrew `node@22`): falla
- Node 24: aún no instalado aquí; necesita verificación

## Notas / hipótesis

- `tsx` utiliza esbuild para transformar TS/ESM. El `keepNames` de esbuild emite un helper `__name` y envuelve las definiciones de funciones con `__name(...)`.
- El fallo indica que `__name` existe pero no es una función en tiempo de ejecución, lo que implica que el helper falta o ha sido sobrescrito para este módulo en la ruta del cargador de Node 25.
- Se han reportado problemas similares con el helper `__name` en otros consumidores de esbuild cuando el helper falta o es reescrito.

## Historial de regresiones

- `2871657e` (2026-01-06): scripts cambiados de Bun a tsx para hacer que Bun sea opcional.
- Antes de eso (ruta con Bun), `openclaw status` y `gateway:watch` funcionaban.

## Soluciones temporales

- Usar Bun para los scripts de desarrollo (reversión temporal actual).
- Usar Node + tsc watch y luego ejecutar el resultado compilado:

  ```bash
  pnpm exec tsc --watch --preserveWatchOutput
  node --watch openclaw.mjs status
  ```

- Confirmado localmente: `pnpm exec tsc -p tsconfig.json` + `node openclaw.mjs status` funciona en Node 25.
- Deshabilitar esbuild keepNames en el cargador TS si es posible (evita la inserción del helper `__name`); tsx actualmente no expone esto.
- Probar Node LTS (22/24) con `tsx` para ver si el problema es específico de Node 25.

## Referencias

- [https://opennext.js.org/cloudflare/howtos/keep_names](https://opennext.js.org/cloudflare/howtos/keep_names)
- [https://esbuild.github.io/api/#keep-names](https://esbuild.github.io/api/#keep-names)
- [https://github.com/evanw/esbuild/issues/1031](https://github.com/evanw/esbuild/issues/1031)

## Próximos pasos

- Reproducir en Node 22/24 para confirmar la regresión en Node 25.
- Prueba `tsx` nightly o fija una versión anterior si existe una regresión conocida.
- Si se reproduce en Node LTS, envía un repro mínimo upstream con el stack trace `__name`.

import es from "/components/footer/es.mdx";

<es />
