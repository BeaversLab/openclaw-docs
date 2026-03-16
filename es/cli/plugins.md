---
summary: "Referencia de CLI para `openclaw plugins` (list, install, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Administre los complementos y extensiones de Gateway y los paquetes compatibles.

Relacionado:

- Sistema de complementos: [Complementos](/es/tools/plugin)
- Compatibilidad de paquetes: [Paquetes de complementos](/es/plugins/bundles)
- Manifiesto de complemento + esquema: [Manifiesto de complemento](/es/plugins/manifest)
- Endurecimiento de seguridad: [Seguridad](/es/gateway/security)

## Comandos

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
```

Los complementos incluidos se envían con OpenClaw pero comienzan deshabilitados. Use `plugins enable` para
activarlos.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles utilizan sus propios
manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. El resultado detallado de lista/info
muestra también el subtipo de paquete (`codex`, `claude` o `cursor`) además de las capacidades
detectadas del paquete.

### Instalar

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

Nota de seguridad: trate las instalaciones de complementos como la ejecución de código. Prefiera versiones fijadas.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos semver. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
eiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento incluido (por ejemplo `diffs`), OpenClaw
instala el complemento incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- Bundles compatibles con Claude (`.claude-plugin/plugin.json` o el diseño predeterminado de
  componentes de Claude)
- Bundles compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los bundles compatibles se instalan en la raíz de extensiones normal y participan en
el mismo flujo de lista/info/activar/desactivar. Hoy en día, se admiten las habilidades de bundle,
habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`,
habilidades de comandos de Cursor y directorios de hook de Codex compatibles; otras capacidades de bundle
detectadas se muestran en diagnóstico/info pero aún no están conectadas a la ejecución en tiempo de ejecución.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` mientras mantiene el comportamiento predeterminado sin fijar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos de complementos y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De forma predeterminada, la desinstalación también elimina el directorio de instalación del complemento bajo la raíz de
extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias en desuso para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Las actualizaciones solo se aplican a los complementos instalados desde npm (rastreados en `plugins.installs`).

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia,
OpenClaw imprime una advertencia y pide confirmación antes de continuar. Use
`--yes` global para omitir las preguntas en ejecuciones de CI/no interactivas.

import es from "/components/footer/es.mdx";

<es />
