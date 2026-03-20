---
summary: "Referencia de la CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - Desea instalar o gestionar complementos de Gateway o paquetes compatibles
  - Desea depurar fallos de carga de complementos
title: "plugins"
---

# `openclaw plugins`

Gestione complementos/extensión de Gateway y paquetes compatibles.

Relacionado:

- Sistema de complementos: [Complementos](/es/tools/plugin)
- Compatibilidad de paquetes: [Paquetes de complementos](/es/plugins/bundles)
- Manifiesto de complemento + esquema: [Manifiesto de complemento](/es/plugins/manifest)
- Endurecimiento de seguridad: [Seguridad](/es/gateway/security)

## Comandos

```bash
openclaw plugins list
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
```

Los complementos incluidos se envían con OpenClaw pero comienzan deshabilitados. Use `plugins enable` para
activarlos.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios
manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. El resultado detallado de lista/información
también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) más las capacidades de paquete
detectadas.

### Instalar

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

Nota de seguridad: trate las instalaciones de complementos como la ejecución de código. Prefiera versiones fijas.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos semver. Las instalaciones de dependencias
se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento incluido (por ejemplo `diffs`), OpenClaw
instala el complemento incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con alcance explícito (por ejemplo `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del marketplace de Claude también son compatibles.

Use el atajo `plugin@marketplace` cuando el nombre del marketplace exista en la caché del
registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar la fuente del marketplace explícitamente:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Las fuentes del marketplace pueden ser:

- un nombre de marketplace conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
- una ruta raíz de marketplace local o una ruta `marketplace.json`
- un atajo de repositorio de GitHub como `owner/repo`
- una URL de git

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componente
  predeterminado de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en
el mismo flujo de lista/información/activación/desactivación. Hoy en día, se admiten las habilidades de paquete, habilidades de comandos de Claude,
predeterminados de Claude `settings.json`, habilidades de comandos de Cursor y directorios de enlace (hook) de Codex compatibles; otras capacidades de paquete detectadas se muestran en
diagnósticos/información pero aún no están conectadas a la ejecución en tiempo de ejecución.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en las instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` manteniendo el comportamiento predeterminado sin anclar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos de complementos y las entradas vinculadas `plugins.load.paths` cuando corresponda.
Para los complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De manera predeterminada, la desinstalación también elimina el directorio de instalación del complemento en la raíz de extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use `--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como alias obsoleto para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs`; actualmente, las instalaciones de npm y marketplace.

Cuando existe un hash de integridad almacenado y cambia el hash del artefacto obtenido, OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda para un solo complemento. Muestra identidad, estado de carga, fuente, capacidades registradas, ganchos, herramientas, comandos, servicios, métodos de puerta de enlace, rutas HTTP, indicadores de política, diagnósticos y metadatos de instalación.

Cada complemento se clasifica según lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo ganchos, sin capacidades o superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Complementos](/es/tools/plugin#plugin-shapes) para obtener más información sobre el modelo de capacidades.

El indicador `--json` genera un informe legible por máquina adecuado para secuencias de comandos y auditorías.

`info` es un alias para `inspect`.

import es from "/components/footer/es.mdx";

<es />
