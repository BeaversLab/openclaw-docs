---
summary: "Flujo de trabajo de Bun (experimental): instalaciones y problemas frente a pnpm"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (experimental)"
---

<Warning>Bun is **not recommended for gateway runtime** (known issues with WhatsApp and Telegram). Use Node for production.</Warning>

Bun es un tiempo de ejecución local opcional para ejecutar TypeScript directamente (`bun run ...`, `bun --watch ...`). El administrador de paquetes predeterminado sigue siendo `pnpm`, que es totalmente compatible y utilizado por las herramientas de documentación. Bun no puede usar `pnpm-lock.yaml` y lo ignorará.

## Instalar

<Steps>
  <Step title="Install dependencies">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` están en gitignore, por lo que no hay cambios en el repositorio. Para omitir por completo las escrituras del archivo de bloqueo:

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="Build and test">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## Scripts de ciclo de vida

Bun bloquea los scripts de ciclo de vida de las dependencias a menos que sean de confianza explícita. Para este repositorio, los scripts comúnmente bloqueados no son necesarios:

- `@whiskeysockets/baileys` `preinstall` -- verifica Node principal >= 20 (OpenClaw usa Node 24 por defecto y aún admite Node 22 LTS, actualmente `22.16+`)
- `protobufjs` `postinstall` -- emite advertencias sobre esquemas de versión incompatibles (sin artefactos de compilación)

Si encuentras un problema en tiempo de ejecución que requiere estos scripts, confía en ellos explícitamente:

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Advertencias

Algunos scripts aún tienen pnpm codificado de forma rígida (por ejemplo `docs:build`, `ui:*`, `protocol:check`). Ejecuta esos a través de pnpm por ahora.

## Relacionado

- [Resumen de instalación](/es/install)
- [Node.js](/es/install/node)
- [Actualizando](/es/install/updating)
