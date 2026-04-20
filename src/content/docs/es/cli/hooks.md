---
summary: "Referencia de CLI para `openclaw hooks` (ganchos del agente)"
read_when:
  - You want to manage agent hooks
  - You want to inspect hook availability or enable workspace hooks
title: "ganchos"
---

# `openclaw hooks`

Administrar los ganchos del agente (automatizaciones controladas por eventos para comandos como `/new`, `/reset` y el inicio de la puerta de enlace).

Ejecutar `openclaw hooks` sin un subcomando es equivalente a `openclaw hooks list`.

Relacionado:

- Hooks: [Hooks](/es/automation/hooks)
- Plugin hooks: [Plugin hooks](/es/plugins/architecture#provider-runtime-hooks)

## Listar todos los hooks

```bash
openclaw hooks list
```

Lista todos los hooks descubiertos de los directorios del espacio de trabajo, gestionados, extra y incluidos.

**Opciones:**

- `--eligible`: Mostrar solo los hooks elegibles (requisitos cumplidos)
- `--json`: Salida como JSON
- `-v, --verbose`: Mostrar información detallada incluyendo los requisitos faltantes

**Salida de ejemplo:**

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

- `<name>`: Nombre del hook o clave del hook (ej., `session-memory`)

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

## Verificar elegibilidad de hooks

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

Habilita un hook específico añadiéndolo a tu configuración (`~/.openclaw/openclaw.json` por defecto).

**Nota:** Los hooks del espacio de trabajo están deshabilitados por defecto hasta que se habiliten aquí o en la configuración. Los hooks gestionados por complementos muestran `plugin:<id>` en `openclaw hooks list` y no se pueden habilitar/deshabilitar aquí. Habilita/deshabilita el complemento en su lugar.

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

- Verifica si el hook existe y es elegible
- Actualiza `hooks.internal.entries.<name>.enabled = true` en tu configuración
- Guarda la configuración en el disco

Si el hook proviene de `<workspace>/hooks/`, este paso de aceptación es obligatorio antes de
que la Gateway lo cargue.

**Después de habilitar:**

- Reinicia la gateway para que los hooks se recarguen (reinicia la aplicación de la barra de menús en macOS, o reinicia tu proceso de gateway en desarrollo).

## Deshabilitar un hook

```bash
openclaw hooks disable <name>
```

Deshabilita un hook específico actualizando tu configuración.

**Argumentos:**

- `<name>`: Nombre del hook (ej., `command-logger`)

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

## Notas

- `openclaw hooks list --json`, `info --json` y `check --json` escriben JSON estructurado directamente en stdout.
- Los hooks administrados por complementos no se pueden habilitar ni deshabilitar aquí; en su lugar, habilite o deshabilite el complemento propietario.

## Instalar Paquetes de Hooks

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

Instale paquetes de hooks a través del instalador unificado de complementos.

`openclaw hooks install` todavía funciona como un alias de compatibilidad, pero imprime una
advertencia de obsolescencia y reenvía a `openclaw plugins install`.

Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos de semver son rechazados. Las
instalaciones de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
esas a una versión preliminar, OpenClaw se detiene y le pide que se suscriba explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

**Lo que hace:**

- Copia el paquete de hooks en `~/.openclaw/hooks/<id>`
- Habilita los hooks instalados en `hooks.internal.entries.*`
- Registra la instalación en `hooks.internal.installs`

**Opciones:**

- `-l, --link`: Enlazar un directorio local en lugar de copiarlo (lo agrega a `hooks.internal.load.extraDirs`)
- `--pin`: Registra las instalaciones de npm como `name@version` resueltas exactas en `hooks.internal.installs`

**Archivos admitidos:** `.zip`, `.tgz`, `.tar.gz`, `.tar`

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

Los paquetes de hooks enlazados se tratan como hooks administrados desde un directorio configurado por el operador,
no como hooks del espacio de trabajo.

## Actualizar Paquetes de Hooks

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

Actualice los paquetes de hooks rastreados basados en npm a través del actualizador unificado de complementos.

`openclaw hooks update` todavía funciona como un alias de compatibilidad, pero imprime una
advertencia de obsolescencia y reenvía a `openclaw plugins update`.

**Opciones:**

- `--all`: Actualizar todos los paquetes de hooks rastreados
- `--dry-run`: Mostrar qué cambiaría sin escribir

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia,
OpenClaw imprime una advertencia y pide confirmación antes de continuar. Use
el `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

## Hooks incluidos

### session-memory

Guarda el contexto de la sesión en la memoria cuando emite `/new` o `/reset`.

**Activar:**

```bash
openclaw hooks enable session-memory
```

**Salida:** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Consulte:** [documentación de session-memory](/es/automation/hooks#session-memory)

### bootstrap-extra-files

Inyecta archivos de arranque adicionales (por ejemplo, monorepo-local `AGENTS.md` / `TOOLS.md`) durante `agent:bootstrap`.

**Activar:**

```bash
openclaw hooks enable bootstrap-extra-files
```

**Consulte:** [documentación de bootstrap-extra-files](/es/automation/hooks#bootstrap-extra-files)

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

**Consulte:** [documentación de command-logger](/es/automation/hooks#command-logger)

### boot-md

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que se inician los canales).

**Eventos**: `gateway:startup`

**Activar**:

```bash
openclaw hooks enable boot-md
```

**Consulte:** [documentación de boot-md](/es/automation/hooks#boot-md)
