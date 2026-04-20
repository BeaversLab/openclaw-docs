---
summary: "Flujo de trabajo de Bun (experimental): instalaciones y problemas frente a pnpm"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (Experimental)"
---

# Bun (Experimental)

<Warning>Bun **no está recomendado para el runtime de gateway** (problemas conocidos con WhatsApp y Telegram). Use Node para producción.</Warning>

Bun es un runtime local opcional para ejecutar TypeScript directamente (`bun run ...`, `bun --watch ...`). El gestor de paquetes predeterminado sigue siendo `pnpm`, que es totalmente compatible y utilizado por las herramientas de documentación. Bun no puede usar `pnpm-lock.yaml` y lo ignorará.

## Instalación

<Steps>
  <Step title="Install dependencies">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` están ignorados por git, por lo que no hay cambios excesivos en el repositorio. Para omitir por completo la escritura de archivos de bloqueo:

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="Compila y prueba">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## Scripts de ciclo de vida

Bun bloquea los scripts de ciclo de vida de las dependencias a menos que se confíe explícitamente en ellos. Para este repositorio, los scripts comúnmente bloqueados no son necesarios:

- `@whiskeysockets/baileys` `preinstall` -- comprueba que Node major >= 20 (OpenClaw por defecto usa Node 24 y todavía soporta Node 22 LTS, actualmente `22.14+`)
- `protobufjs` `postinstall` -- emite advertencias sobre esquemas de versiones incompatibles (sin artefactos de compilación)

Si encuentras un problema en tiempo de ejecución que requiere estos scripts, confía en ellos explícitamente:

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## Advertencias

Algunos scripts todavía tienen pnpm codificado (por ejemplo `docs:build`, `ui:*`, `protocol:check`). Ejecuta esos a través de pnpm por ahora.
