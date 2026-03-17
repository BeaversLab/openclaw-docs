---
summary: "Referencia de la CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
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
openclaw plugins marketplace list <marketplace>
```

Los complementos incluidos se envían con OpenClaw pero inician deshabilitados. Use `plugins enable` para
activarlos.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios
manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. La salida detallada de lista/info
también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) además de las
capacidades del paquete detectadas.

### Instalar

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

Nota de seguridad: trate las instalaciones de complementos como la ejecución de código. Prefiera versiones fijadas.

Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones Git/URL/archivo y los rangos semver. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` para mayor seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un id de complemento incluido (por ejemplo `diffs`), OpenClaw
instala el complemento incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

Archivos admitidos: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del marketplace de Claude también son compatibles.

Use la abreviatura `plugin@marketplace` cuando el nombre del mercado exista en el
caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar la fuente del mercado explícitamente:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Las fuentes del mercado pueden ser:

- un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
- una ruta raíz de mercado local o una ruta `marketplace.json`
- una abreviatura de repositorio de GitHub como `owner/repo`
- una URL de git

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componentes
  predeterminado de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en
el mismo flujo de lista/info/habilitar/deshabilitar. Hoy, se admiten las habilidades de paquete,
habilidades de comandos de Claude, valores predeterminados de `settings.json` de Claude,
habilidades de comandos de Cursor y directorios de enlaces de Codex compatibles;
otras capacidades de paquete detectadas se muestran en diagnósticos/info pero aún no están
integradas en la ejecución en tiempo de ejecución.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` manteniendo el comportamiento predeterminado sin fijar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos de complementos y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para complementos de memoria activos, el espacio de memoria se restablece a `memory-core`.

De forma predeterminada, la desinstalación también elimina el directorio de instalación del complemento
en la raíz de extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` se admite como un alias obsoleto para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins update <id> --dry-run
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs`, actualmente instalaciones de npm y
marketplace.

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia,
OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use
`--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

import es from "/components/footer/es.mdx";

<es />
