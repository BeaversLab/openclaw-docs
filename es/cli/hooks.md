---
summary: "Referencia de CLI para `openclaw hooks` (hooks de agente)"
read_when:
  - Quieres gestionar los hooks de agente
  - Quieres instalar o actualizar hooks
title: "hooks"
---

# `openclaw hooks`

Gestiona los hooks de agente (automatizaciones basadas en eventos para comandos como `/new`, `/reset` y el inicio de la puerta de enlace).

Relacionado:

- Hooks: [Hooks](/es/automation/hooks)
- Hooks de complementos: [Complementos](/es/tools/plugin#plugin-hooks)

## Listar todos los hooks

```bash
openclaw hooks list
```

Lista todos los hooks descubiertos de los directorios del espacio de trabajo, gestionados y agrupados.

**Opciones:**

- `--eligible`: Muestra solo los hooks elegibles (requisitos cumplidos)
- `--json`: Salida como JSON
- `-v, --verbose`: Muestra información detallada, incluidos los requisitos faltantes

**Salida de ejemplo:**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
```

**Ejemplo (detallado):**

```bash
openclaw hooks list --verbose
```

Muestra los requisitos faltantes para los hooks no elegibles.

**Ejemplo (JSON):**

```bash
openclaw hooks list --json
```

Devuelve un JSON estructurado para uso programático.

## Obtener información del hook

```bash
openclaw hooks info <name>
```

Muestra información detallada sobre un hook específico.

**Argumentos:**

- `<name>`: Nombre del hook (ej., `session-memory`)

**Opciones:**

- `--json`: Salida como JSON

**Ejemplo:**

```bash
openclaw hooks info session-memory
```

**Salida:**

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## Verificar elegibilidad de los hooks

```bash
openclaw hooks check
```

Muestra un resumen del estado de elegibilidad de los hooks (cuántos están listos frente a los que no).

**Opciones:**

- `--json`: Salida como JSON

**Salida de ejemplo:**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## Habilitar un hook

```bash
openclaw hooks enable <name>
```

Habilita un hook específico agregándolo a tu configuración (`~/.openclaw/config.json`).

**Nota:** Los hooks gestionados por complementos muestran `plugin:<id>` en `openclaw hooks list` y
no se pueden habilitar/deshabilitar aquí. Habilita/deshabilita el complemento en su lugar.

**Argumentos:**

- `<name>`: Nombre del hook (ej., `session-memory`)

**Ejemplo:**

```bash
openclaw hooks enable session-memory
```

**Salida:**

```
✓ Enabled hook: 💾 session-memory
```

**Lo que hace:**

- Comprueba si el hook existe y es elegible
- Actualiza `hooks.internal.entries.<name>.enabled = true` en tu configuración
- Guarda la configuración en el disco

**Después de habilitar:**

- Reinicia la puerta de enlace para que los hooks se recarguen (reinicio de la aplicación de la barra de menús en macOS o reinicia tu proceso de puerta de enlace en desarrollo).

## Deshabilitar un hook

```bash
openclaw hooks disable <name>
```

Deshabilita un hook específico actualizando tu configuración.

**Argumentos:**

- `<name>`: Nombre del hook (p. ej., `command-logger`)

**Ejemplo:**

```bash
openclaw hooks disable command-logger
```

**Salida:**

```
⏸ Disabled hook: 📝 command-logger
```

**Después de desactivar:**

- Reinicie la puerta de enlace para que los hooks se vuelvan a cargar

## Instalar Hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

Instale un paquete de hooks desde una carpeta/archivo local o npm.

Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de
esas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta.

**Lo que hace:**

- Copia el paquete de hooks en `~/.openclaw/hooks/<id>`
- Activa los hooks instalados en `hooks.internal.entries.*`
- Registra la instalación bajo `hooks.internal.installs`

**Opciones:**

- `-l, --link`: Vincula un directorio local en lugar de copiarlo (lo agrega a `hooks.internal.load.extraDirs`)
- `--pin`: Registra las instalaciones de npm como `name@version` resueltas exactas en `hooks.internal.installs`

**Archivos compatibles:** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Ejemplos:**

```bash
# Local directory
openclaw hooks install ./my-hook-pack

# Local archive
openclaw hooks install ./my-hook-pack.zip

# NPM package
openclaw hooks install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw hooks install -l ./my-hook-pack
```

## Actualizar Hooks

```bash
openclaw hooks update <id>
openclaw hooks update --all
```

Actualice los paquetes de hooks instalados (solo instalaciones de npm).

**Opciones:**

- `--all`: Actualiza todos los paquetes de hooks rastreados
- `--dry-run`: Muestra qué cambiaría sin escribir

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia,
OpenClaw imprime una advertencia y pide confirmación antes de continuar. Use
`--yes` global para omitir las solicitudes en ejecuciones de CI/sin interacción.

## Hooks incluidos

### session-memory

Guarda el contexto de la sesión en la memoria cuando emite `/new`.

**Activar:**

```bash
openclaw hooks enable session-memory
```

**Salida:** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Consulte:** [documentación de session-memory](/es/automation/hooks#session-memory)

### bootstrap-extra-files

Inyecta archivos de arranque adicionales (por ejemplo, `AGENTS.md` / `TOOLS.md` locales de monorepo) durante `agent:bootstrap`.

**Activar:**

```bash
openclaw hooks enable bootstrap-extra-files
```

**Ver:** [documentación de bootstrap-extra-files](/es/automation/hooks#bootstrap-extra-files)

### command-logger

Registra todos los eventos de comandos en un archivo de auditoría centralizado.

**Activar:**

```bash
openclaw hooks enable command-logger
```

**Salida:** `~/.openclaw/logs/commands.log`

**Ver registros:**

```bash
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**Ver:** [documentación de command-logger](/es/automation/hooks#command-logger)

### boot-md

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que se inicien los canales).

**Eventos**: `gateway:startup`

**Activar**:

```bash
openclaw hooks enable boot-md
```

**Ver:** [documentación de boot-md](/es/automation/hooks#boot-md)

import en from "/components/footer/en.mdx";

<en />
