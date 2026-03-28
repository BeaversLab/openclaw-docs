---
summary: "Referencia de CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Administra los complementos/extensions del Gateway, los paquetes de hooks y los paquetes compatibles.

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

Los complementos integrados se distribuyen con OpenClaw pero inician deshabilitados. Usa `plugins enable` para
activarlos.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios
manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. La salida de lista/información
detallada también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) más las capacidades de paquete
detectadas.

### Instalar

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

Los nombres de paquetes simples se verifican primero contra ClawHub y luego contra npm. Nota de seguridad:
trate las instalaciones de complementos como ejecutar código. Prefiera versiones ancladas.

`plugins install` también es la superficie de instalación para paquetes de hooks que exponen
`openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad de hooks filtrada
y la habilitación por hook, no para la instalación del paquete.

Las especificaciones de npm son **solo de registro** (nombre de paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos semver se rechazan. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` para mayor seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento incluido (por ejemplo, `diffs`), OpenClaw
instala el complemento incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo, `@scope/diffs`).

Archivos admitidos: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del mercado de Claude también son compatibles.

Las instalaciones de ClawHub usan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Ahora OpenClaw también prefiere ClawHub para especificaciones de complementos simples compatibles con npm. Solo recurre
a npm si ClawHub no tiene ese paquete o versión:

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw descarga el archivo del paquete desde ClawHub, verifica la API de complemento anunciada / la compatibilidad mínima de gateway y luego lo instala a través de la ruta
normal de archivo. Las instalaciones registradas mantienen sus metadatos de origen de ClawHub para actualizaciones
posteriores.

Use la abreviatura `plugin@marketplace` cuando el nombre del mercado existe en la caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

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
- una ruta raíz del mercado local o una ruta `marketplace.json`
- una abreviatura de repositorio de GitHub como `owner/repo`
- una URL de git

Para mercados remotos cargados desde GitHub o git, las entradas de complementos deben permanecer
dentro del repositorio del mercado clonado. OpenClaw acepta fuentes de ruta relativas de
ese repositorio y rechaza fuentes externas de git, GitHub, URL/archivo y rutas absolutas
de complementos desde manifiestos remotos.

Para rutas y archivos locales, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componente predeterminado de
  Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en
el mismo flujo de lista/información/habilitar/deshabilitar. Hoy, las habilidades de paquetes, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, habilidades de comandos de Cursor y directorios de enlace de Codex compatibles son compatibles; otras capacidades de paquetes detectadas se muestran en diagnósticos/información pero aún no están conectadas a la ejecución en tiempo de ejecución.

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

`uninstall` elimina los registros del complemento de `plugins.entries`, `plugins.installs`,
la lista de permitidos del complemento y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De manera predeterminada, la desinstalación también elimina el directorio de instalación del complemento en la raíz de extensiones del directorio de estado activo (`$OPENCLAW_STATE_DIR/extensions/<id>`). Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias obsoleto para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs` y a las instalaciones de paquetes de enlace rastreadas en `hooks.internal.installs`.

Cuando pasa un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese
complemento. Eso significa que las etiquetas de distribución previamente almacenadas, como `@beta` y las versiones ancladas exactas,
continúan usándose en ejecuciones posteriores de `update <id>`.

Para las instalaciones de npm, también puede pasar una especificación explícita de paquete npm con una etiqueta de distribución
o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado,
actualiza ese complemento instalado y registra la nueva especificación de npm para futuras
actualizaciones basadas en id.

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia,
OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use el
`--yes` global para evitar las solicitudes en ejecuciones de CI/no interactivas.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda para un solo complemento. Muestra identidad, estado de carga, origen,
capacidades registradas, enlaces, herramientas, comandos, servicios, métodos de puerta de enlace,
rutas HTTP, indicadores de política, diagnósticos y metadatos de instalación.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **capacidad-simple** — un tipo de capacidad (por ejemplo, un complemento solo de proveedor)
- **capacidad-híbrida** — múltiples tipos de capacidades (por ejemplo, texto + voz + imágenes)
- **solo-enlace** — solo enlaces, sin capacidades o superficies
- **no-capacidad** — herramientas/comandos/servicios pero sin capacidades

Consulte [Plugin shapes](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

El indicador `--json` genera un informe legible por máquina adecuado para secuencias de comandos y
auditoría.

`info` es un alias de `inspect`.
