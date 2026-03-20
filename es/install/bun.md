---
summary: "Flujo de trabajo de Bun (experimental): instalaciones y problemas frente a pnpm"
read_when:
  - Quieres el bucle de desarrollo local más rápido (bun + watch)
  - Te encuentras con problemas de instalación/ parches/ scripts de ciclo de vida de Bun
title: "Bun (Experimental)"
---

# Bun (experimental)

Objetivo: ejecutar este repositorio con **Bun** (opcional, no recomendado para WhatsApp/Telegram)
sin divergir de los flujos de trabajo de pnpm.

⚠️ **No recomendado para el tiempo de ejecución de Gateway** (errores de WhatsApp/Telegram). Usa Node para producción.

## Estado

- Bun es un tiempo de ejecución local opcional para ejecutar TypeScript directamente (`bun run …`, `bun --watch …`).
- `pnpm` es el valor predeterminado para las compilaciones y sigue siendo totalmente compatible (y utilizado por algunas herramientas de documentación).
- Bun no puede usar `pnpm-lock.yaml` y lo ignorará.

## Instalación

Predeterminado:

```sh
bun install
```

Nota: `bun.lock`/`bun.lockb` están ignorados por git, por lo que no hay cambios en el repositorio de ninguna manera. Si quieres _que no haya escrituras en el archivo de bloqueo_:

```sh
bun install --no-save
```

## Compilar / Probar (Bun)

```sh
bun run build
bun run vitest run
```

## Scripts de ciclo de vida de Bun (bloqueados de forma predeterminada)

Bun puede bloquear los scripts de ciclo de vida de las dependencias a menos que se confíe explícitamente en ellos (`bun pm untrusted` / `bun pm trust`).
Para este repositorio, los scripts comúnmente bloqueados no son necesarios:

- `@whiskeysockets/baileys` `preinstall`: comprueba Node major >= 20 (OpenClaw usa Node 24 de forma predeterminada y todavía admite Node 22 LTS, actualmente `22.16+`).
- `protobufjs` `postinstall`: emite advertencias sobre esquemas de versiones incompatibles (sin artefactos de compilación).

Si encuentras un problema real de tiempo de ejecución que requiera estos scripts, confía en ellos explícitamente:

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Advertencias

- Algunos scripts todavía codifican pnpm de forma rígida (ej. `docs:build`, `ui:*`, `protocol:check`). Ejecuta esos mediante pnpm por ahora.

import es from "/components/footer/es.mdx";

<es />
