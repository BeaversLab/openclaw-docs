---
summary: "Flujo de trabajo de Bun (experimental): instalaciones y problemas frente a pnpm"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (Experimental)"
---

# Bun (experimental)

Objetivo: ejecutar este repositorio con **Bun** (opcional, no recomendado para WhatsApp/Telegram)
sin divergir de los flujos de trabajo de pnpm.

⚠️ **No recomendado para el tiempo de ejecución de Gateway** (errores de WhatsApp/Telegram). Use Node para producción.

## Estado

- Bun es un tiempo de ejecución local opcional para ejecutar TypeScript directamente (`bun run …`, `bun --watch …`).
- `pnpm` es el valor predeterminado para las compilaciones y sigue siendo totalmente compatible (y utilizado por algunas herramientas de documentación).
- Bun no puede usar `pnpm-lock.yaml` y lo ignorará.

## Instalación

Predeterminado:

```sh
bun install
```

Nota: `bun.lock`/`bun.lockb` están ignorados por git, por lo que tampoco hay agitación en el repositorio de ninguna manera. Si desea _que no se escriba el archivo de bloqueo_:

```sh
bun install --no-save
```

## Compilar / Probar (Bun)

```sh
bun run build
bun run vitest run
```

## Scripts de ciclo de vida de Bun (bloqueados de forma predeterminada)

Bun puede bloquear los scripts de ciclo de vida de las dependencias a menos que sean explícitamente de confianza (`bun pm untrusted` / `bun pm trust`).
Para este repositorio, los scripts comúnmente bloqueados no son necesarios:

- `@whiskeysockets/baileys` `preinstall`: comprueba Node major >= 20 (OpenClaw usa Node 24 de forma predeterminada y aún admite Node 22 LTS, actualmente `22.16+`).
- `protobufjs` `postinstall`: emite advertencias sobre esquemas de versiones incompatibles (sin artefactos de compilación).

Si encuentra un problema real de tiempo de ejecución que requiera estos scripts, confíe en ellos explícitamente:

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Advertencias

- Algunos scripts aún tienen pnpm codificado (por ejemplo, `docs:build`, `ui:*`, `protocol:check`). Ejecútelos a través de pnpm por ahora.

import es from "/components/footer/es.mdx";

<es />
