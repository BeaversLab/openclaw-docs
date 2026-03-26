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

Los complementos incluidos se envían con OpenClaw pero inician deshabilitados. Use `plugins enable` para
activarlos.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios manifiestos
de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. La salida de lista/información detallada
también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) más las capacidades de paquete
detectadas.

### Instalar

```bash
openclaw plugins install <path-or-spec>
openclaw plugins install <npm-spec> --pin
openclaw plugins install <plugin>@<marketplace>
openclaw plugins install <plugin> --marketplace <marketplace>
```

Nota de seguridad: trate las instalaciones de complementos como la ejecución de código. Prefiera versiones fijadas.

Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**etiqueta de distribución**). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver. Las
instalaciones de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento incluido (por ejemplo, `diffs`), OpenClaw
instala el complemento incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo, `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del marketplace de Claude también son compatibles.

Use la abreviatura `plugin@marketplace` cuando el nombre del marketplace exista en el
caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

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

Las fuentes del mercado pueden ser:

- un nombre de marketplace conocido por Claude desde `~/.claude/plugins/known_marketplaces.json`
- una raíz de marketplace local o una ruta `marketplace.json`
- una abreviatura de repositorio de GitHub como `owner/repo`
- una URL de git

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño predeterminado de
  componentes de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en
el mismo flujo de lista/información/habilitar/deshabilitar. Hoy, se admiten habilidades de paquete, habilidades de
comandos de Claude, valores predeterminados de comandos de Claude `settings.json`, habilidades de comandos de Cursor y directorios de enlaces compatibles con Codex;
otras capacidades de paquete detectadas se muestran en
diagnósticos/información pero aún no están conectadas a la ejecución en tiempo de ejecución.

Use `--link` para evitar copiar un directorio local (añade a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` manteniendo el comportamiento predeterminado sin anclar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista blanca de complementos y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para los complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De manera predeterminada, la desinstalación también elimina el directorio de instalación del complemento en la raíz de
extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias en desuso para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs`, actualmente npm e
instalaciones del marketplace.

Cuando pasas un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Eso significa que las dist-tags almacenadas previamente, como `@beta` y las versiones fijas exactas, siguen utilizándose en ejecuciones posteriores de `update <id>`.

Para las instalaciones de npm, también puedes pasar una especificación de paquete npm explícita con una dist-tag o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación npm para futuras actualizaciones basadas en id.

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia, OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Utiliza el `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda de un solo complemento. Muestra identidad, estado de carga, fuente, capacidades registradas, hooks, herramientas, comandos, servicios, métodos de puerta de enlace, rutas HTTP, indicadores de política, diagnósticos y metadatos de instalación.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (por ejemplo, un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (por ejemplo, texto + voz + imágenes)
- **hook-only** — solo hooks, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulta [Plugin shapes](/es/plugins/architecture#plugin-shapes) para más información sobre el modelo de capacidades.

El indicador `--json` genera un informe legible por máquina adecuado para scripts y auditorías.

`info` es un alias de `inspect`.

import es from "/components/footer/es.mdx";

<es />
