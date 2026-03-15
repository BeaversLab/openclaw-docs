---
summary: "Referencia de CLI para `openclaw hooks` (ganchos del agente)"
read_when:
  - You want to manage agent hooks
  - You want to install or update hooks
title: "ganchos"
---

# `openclaw hooks`

Administrar los ganchos del agente (automatizaciones controladas por eventos para comandos como `/new`, `/reset` y el inicio de la puerta de enlace).

Relacionado:

- Ganchos: [Ganchos](/es/automation/hooks)
- Ganchos de complementos: [Complementos](/es/tools/plugin#plugin-hooks)

## Listar todos los ganchos

```bash
openclaw hooks list
```

Listar todos los ganchos descubiertos de los directorios del espacio de trabajo, gestionados y empaquetados.

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
  💾 session-memory ✓ - Save session context to memory when /new command is issued
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

**Nota:** Los ganchos gestionados por complementos muestran `plugin:<id>` en `openclaw hooks list` y
no se pueden habilitar/deshabilitar aquí. Habilite/deshabilite el complemento en su lugar.

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

**Después de habilitar:**

- Reinicie la puerta de enlace para que los ganchos se recarguen (reinicio de la aplicación de la barra de menú en macOS o reinicie su proceso de puerta de enlace en desarrollo).

## Deshabilitar un gancho

```bash
openclaw hooks disable <name>
```

Deshabilitar un gancho específico actualizando su configuración.

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

## Instalar Hooks

```bash
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin
```

Instale un paquete de hooks desde una carpeta local/un archivo o npm.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver. Las
instalaciones de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de
esas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
tiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta.

**Lo que hace:**

- Copia el paquete de hooks en `~/.openclaw/hooks/<id>`
- Habilita los hooks instalados en `hooks.internal.entries.*`
- Registra la instalación en `hooks.internal.installs`

**Opciones:**

- `-l, --link`: Enlaza un directorio local en lugar de copiarlo (lo añade a `hooks.internal.load.extraDirs`)
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

Actualizar los paquetes de hooks instalados (solo instalaciones de npm).

**Opciones:**

- `--all`: Actualizar todos los paquetes de hooks rastreados
- `--dry-run`: Mostrar qué cambiaría sin escribir

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia,
OpenClaw imprime una advertencia y pide confirmación antes de continuar. Use
`--yes` global para omitir las preguntas en entornos de CI/ejecuciones no interactivas.

## Hooks Incluidos

### session-memory

Guarda el contexto de la sesión en la memoria cuando emite `/new`.

**Habilitar:**

```bash
openclaw hooks enable session-memory
```

**Salida:** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**Vea:** [documentación de session-memory](/es/automation/hooks#session-memory)

### bootstrap-extra-files

Inyecta archivos de arranque adicionales (por ejemplo, `AGENTS.md` / `TOOLS.md` locales de monorepo) durante `agent:bootstrap`.

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

Ejecuta `BOOT.md` cuando se inicia la puerta de enlace (después de que se inicien los canales).

**Eventos**: `gateway:startup`

**Activar**:

```bash
openclaw hooks enable boot-md
```

**Consulte:** [documentación de boot-md](/es/automation/hooks#boot-md)

import es from "/components/footer/es.mdx";

<es />
