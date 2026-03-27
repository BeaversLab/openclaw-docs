---
summary: "Referencia de CLI para `openclaw hooks` (ganchos del agente)"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "ganchos"
---

# `openclaw hooks`

Administrar los ganchos del agente (automatizaciones controladas por eventos para comandos como `/new`, `/reset` y el inicio de la puerta de enlace).

Relacionado:

- Hooks: [Hooks](/es/automation/hooks)
- Plugin hooks: [Plugin hooks](/es/plugins/architecture#provider-runtime-hooks)

## Listar todos los ganchos

```bash
openclaw hooks list
```

Listar todos los hooks descubiertos del espacio de trabajo, gestionados, extra y directorios incluidos.

**Opciones:**

- `--eligible`: Mostrar solo los ganchos elegibles (requisitos cumplidos)
- `--json`: Salida como JSON
- `-v, --verbose`: Mostrar información detallada, incluidos los requisitos faltantes

**Ejemplo de salida:**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**Ejemplo (detallado):**

```bash
openclaw hooks list --verbose
```

Muestra los requisitos faltantes para los ganchos no elegibles.

**Ejemplo (JSON):**

```bash
openclaw hooks list --json
```

Devuelve un JSON estructurado para uso programático.

## Obtener información del gancho

```bash
openclaw hooks info <name>
```

Mostrar información detallada sobre un gancho específico.

**Argumentos:**

- `<name>`: Nombre del gancho (por ejemplo, `session-memory`)

**Opciones:**

- `--json`: Salida como JSON

**Ejemplo:**

```bash
openclaw hooks info session-memory
```

**Salida:**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## Verificar la elegibilidad de los ganchos

```bash
openclaw hooks check
```

Mostrar un resumen del estado de elegibilidad de los ganchos (cuántos están listos frente a los que no).

**Opciones:**

- `--json`: Salida como JSON

**Ejemplo de salida:**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## Habilitar un gancho

```bash
openclaw hooks enable <name>
```

Habilitar un gancho específico añadiéndolo a su configuración (`~/.openclaw/config.json`).

**Nota:** Los hooks del espacio de trabajo están deshabilitados de forma predeterminada hasta que se habiliten aquí o en la configuración. Los hooks gestionados por complementos muestran `plugin:<id>` en `openclaw hooks list` y no se pueden habilitar/deshabilitar aquí. Habilite/deshabilite el complemento en su lugar.

**Argumentos:**

- `<name>`: Nombre del gancho (por ejemplo, `session-memory`)

**Ejemplo:**

```bash
openclaw hooks enable session-memory
```

**Salida:**

```
✓ Enabled hook: 💾 session-memory
```

**Lo que hace:**

- Verifica si el gancho existe y es elegible
- Actualiza `hooks.internal.entries.<name>.enabled = true` en su configuración
- Guarda la configuración en el disco

Si el hook proviene de `<workspace>/hooks/`, se requiere este paso de aceptación antes de
que Gateway lo cargue.

**Después de habilitar:**

- Reinicie la puerta de enlace para que los hooks se recarguen (reinicio de la aplicación de la barra de menús en macOS, o reinicie su proceso de puerta de enlace en desarrollo).

## Deshabilitar un Hook

```bash
openclaw hooks disable <name>
```

Deshabilite un hook específico actualizando su configuración.

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

**Después de deshabilitar:**

- Reinicie la puerta de enlace para que los hooks se recarguen

## Instalar paquetes de hooks

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

Instale paquetes de hooks a través del instalador unificado de complementos.

`openclaw hooks install` todavía funciona como un alias de compatibilidad, pero imprime una
advertencia de obsolescencia y reenvía a `openclaw plugins install`.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + opcional **versión exacta** o
dist-tag). Se rechazan las especificaciones Git/URL/archivo y los rangos semver. Las instalaciones de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta.

**Lo que hace:**

- Copia el paquete de hooks en `~/.openclaw/hooks/<id>`
- Habilita los hooks instalados en `hooks.internal.entries.*`
- Registra la instalación en `hooks.internal.installs`

**Opciones:**

- `-l, --link`: Vincula un directorio local en lugar de copiarlo (lo añade a `hooks.internal.load.extraDirs`)
- `--pin`: Registra las instalaciones de npm como `name@version` resueltas exactas en `hooks.internal.installs`

**Archivos compatibles:** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Ejemplos:**

```bash
# Local directory
openclaw plugins install ./my-hook-pack

# Local archive
openclaw plugins install ./my-hook-pack.zip

# NPM package
openclaw plugins install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw plugins install -l ./my-hook-pack
```

Los paquetes de hooks vinculados se tratan como hooks administrados desde un directorio configurado por el operador, no como hooks del espacio de trabajo.

## Actualizar paquetes de hooks

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

Actualiza los paquetes de hooks basados en npm rastreados a través del actualizador unificado de complementos.

`openclaw hooks update` todavía funciona como un alias de compatibilidad, pero imprime una advertencia de obsolescencia y reenvía a `openclaw plugins update`.

**Opciones:**

- `--all`: Actualiza todos los paquetes de hooks rastreados
- `--dry-run`: Muestra qué cambiaría sin escribir

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia, OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

## Hooks incluidos

### session-memory

Guarda el contexto de la sesión en la memoria cuando emite `/new` o `/reset`.

**Activar:**

```bash
openclaw hooks enable session-memory
```

**Salida:** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Ver:** [documentación de session-memory](/es/automation/hooks#session-memory)

### bootstrap-extra-files

Inyecta archivos de arranque adicionales (por ejemplo, monorepo-local `AGENTS.md` / `TOOLS.md`) durante `agent:bootstrap`.

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

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que inicien los canales).

**Eventos**: `gateway:startup`

**Activar**:

```bash
openclaw hooks enable boot-md
```

**Ver:** [documentación de boot-md](/es/automation/hooks#boot-md)

import es from "/components/footer/es.mdx";

<es />
