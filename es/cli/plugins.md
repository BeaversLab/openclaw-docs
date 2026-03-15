---
summary: "Referencia de CLI para `openclaw plugins` (list, install, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage in-process Gateway plugins
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Administrar complementos extensiones de Gateway (cargados en proceso).

Relacionado:

- Sistema de complementos: [Complementos](/es/tools/plugin)
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

Los complementos integrados se envían con OpenClaw pero comienzan deshabilitados. Use `plugins enable` para
activarlos.

Todos los complementos deben incluir un archivo `openclaw.plugin.json` con un JSON Schema en línea
(`configSchema`, incluso si está vacío). Los manifiestos o esquemas faltantes o no válidos impiden
que el complemento se cargue y hacen que la validación de la configuración falle.

### Instalar

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
```

Nota de seguridad: trate las instalaciones de complementos como ejecutar código. Prefiera versiones fijas.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones Git/URL/archivo y los rangos semver se rechazan. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento integrado (por ejemplo `diffs`), OpenClaw
instala el complemento integrado directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` mientras se mantiene el comportamiento predeterminado sin fijar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos de complementos y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para complementos de memoria activos, el espacio de memoria se restablece a `memory-core`.

De forma predeterminada, la desinstalación también elimina el directorio de instalación del complemento bajo la raíz
de extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias obsoleto para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Las actualizaciones solo se aplican a los complementos instalados desde npm (rastreados en `plugins.installs`).

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia,
OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use
el `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

import es from "/components/footer/es.mdx";

<es />
