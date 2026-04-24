---
summary: "Referencia de CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "plugins"
---

# `openclaw plugins`

Administre los complementos de Gateway, paquetes de hooks y bundles compatibles.

Relacionado:

- Sistema de complementos: [Complementos](/es/tools/plugin)
- Compatibilidad de bundles: [Bundles de complementos](/es/plugins/bundles)
- Manifiesto de complemento + esquema: [Manifiesto de complemento](/es/plugins/manifest)
- Endurecimiento de seguridad: [Seguridad](/es/gateway/security)

## Comandos

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

Los complementos incluidos se distribuyen con OpenClaw. Algunos están habilitados de forma predeterminada (por ejemplo,
proveedores de modelos incluidos, proveedores de voz incluidos y el complemento
del navegador incluido); otros requieren `plugins enable`.

Los complementos nativos de OpenClaw deben distribuir `openclaw.plugin.json` con un esquema JSON
en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios
manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. El resultado de lista/información
detallado también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) además de las capacidades
del paquete detectadas.

### Instalar

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

Los nombres de paquetes simples se verifican primero contra ClawHub y luego contra npm. Nota de seguridad:
trate las instalaciones de complementos como ejecutar código. Prefiera versiones ancladas.

Si su sección `plugins` está respaldada por un `$include` de un solo archivo, `plugins install`,
`plugins update`, `plugins enable`, `plugins disable` y `plugins uninstall`
escriben en ese archivo incluido y dejan `openclaw.json` intacto. Las inclusiones
raíz, las matrices de inclusión y las inclusiones con anulaciones hermanas fallan de forma segura
en lugar de aplanarse. Consulte [Inclusiones de configuración](/es/gateway/configuration) para conocer las
formas admitidas.

Si la configuración no es válida, `plugins install` normalmente falla de forma segura y le indica que
ejecute `openclaw doctor --fix` primero. La única excepción documentada es una ruta
estrecha de recuperación de complementos empaquetados para complementos que explícitamente aceptan
`openclaw.install.allowInvalidConfigRecovery`.

`--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento
o paquete de hooks ya instalado en su lugar. Úselo cuando esté reinstalando intencionalmente
el mismo id desde una nueva ruta local, archivo, paquete ClawHub o artefacto npm.
Para actualizaciones de rutina de un complemento npm ya rastreado, prefiera
`openclaw plugins update <id-or-npm-spec>`.

Si ejecuta `plugins install` para un id de complemento que ya está instalado, OpenClaw
detiene y le señala `plugins update <id-or-npm-spec>` para una actualización normal,
o `plugins install <package> --force` cuando realmente desea sobrescribir
la instalación actual desde una fuente diferente.

`--pin` se aplica solo a instalaciones de npm. No es compatible con `--marketplace`,
porque las instalaciones del mercado persisten los metadatos de origen del mercado en lugar de una
especificación npm.

`--dangerously-force-unsafe-install` es una opción de emergencia para los falsos positivos
en el escáner de código peligroso integrado. Permite que la instalación continúe incluso
cuando el escáner integrado reporta hallazgos de `critical`, pero **no**
omite los bloqueos de política de hook de plugin `before_install` y **no** omite los fallos
de escaneo.

Este indicador de CLI se aplica a los flujos de instalación/actualización de plugins. Las instalaciones
de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall`
coincidente, mientras que `openclaw skills install` sigue siendo un flujo separado de descarga/instalación
de habilidades de ClawHub.

`plugins install` es también la superficie de instalación para los paquetes de hooks que exponen
`openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad
filtrada de hooks y la habilitación por hook, no para la instalación de paquetes.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
eiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un id de plugin incluido (por ejemplo `diffs`), OpenClaw
instala el plugin incluido directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícita (por ejemplo `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del mercado de Claude también son compatibles.

Las instalaciones de ClawHub usan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw ahora también prefiere ClawHub para las especificaciones de plugin compatibles con npm simples. Solo recurre
a npm si ClawHub no tiene ese paquete o versión:

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw descarga el archivo del paquete desde ClawHub, verifica la compatibilidad
anunciada de la API del complemento / la versión mínima de la puerta de enlace y
luego lo instala a través de la ruta de archivo normal. Las instalaciones
registradas mantienen sus metadatos de origen de ClawHub para actualizaciones
posteriores.

Use la abreviatura `plugin@marketplace` cuando el nombre del mercado exista en el
caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar explícitamente el origen del mercado:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Los orígenes del mercado pueden ser:

- un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
- una raíz de mercado local o una ruta `marketplace.json`
- una abreviatura de repositorio de GitHub como `owner/repo`
- una URL de repositorio de GitHub como `https://github.com/owner/repo`
- una URL de git

Para mercados remotos cargados desde GitHub o git, las entradas de complementos
deben permanecer dentro del repositorio del mercado clonado. OpenClaw acepta
orígenes de ruta relativa desde ese repositorio y rechaza HTTP(S), rutas
absolutas, git, GitHub y otros orígenes de complementos que no sean rutas de
manifiestos remotos.

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componente
  predeterminado de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de complementos normal y participan
en el mismo flujo de lista/información/activación/desactivación. Hoy en día, se
admiten las habilidades de los paquetes, command-skills de Claude, valores
predeterminados de Claude `settings.json`, valores predeterminados de
Claude `.lsp.json` / `lspServers` declarados en el manifiesto,
command-skills de Cursor y directorios de hook de Codex compatibles; otras
capacidades de paquetes detectadas se muestran en el diagnóstico/información
pero aún no están conectadas a la ejecución en tiempo de ejecución.

### Listar

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

Use `--enabled` para mostrar solo los complementos cargados. Use
`--verbose` para cambiar de la vista de tabla a líneas de detalle
por complemento con metadatos de origen/origen/versión/activación. Use
`--json` para el inventario legible por máquina más diagnósticos
del registro.

Use `--link` para evitar copiar un directorio local (añade a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la
ruta de origen en lugar de copiar sobre un objetivo de instalación administrado.

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
Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De forma predeterminada, la desinstalación también elimina el directorio de instalación del complemento en la raíz de
complementos del state-dir activo. Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias obsoleto para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs` y a las instalaciones
de hook-packs rastreadas en `hooks.internal.installs`.

Cuando pasa un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese
complemento. Eso significa que las dist-tags previamente almacenadas como `@beta` y las versiones fijas
exactas continúan usándose en ejecuciones posteriores de `update <id>`.

Para instalaciones de npm, también puede pasar una especificación explícita de paquete npm con una dist-tag
o versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro de complemento
rastreado, actualiza ese complemento instalado y registra la nueva especificación npm para futuras
actualizaciones basadas en id.

Pasar el nombre del paquete npm sin una versión o etiqueta también se resuelve de vuelta al
registro de complemento rastreado. Use esto cuando un complemento se fijó a una versión exacta y
desea volver a la línea de lanzamiento predeterminada del registro.

Antes de una actualización en vivo de npm, OpenClaw verifica la versión del paquete instalado contra
los metadatos del registro de npm. Si la versión instalada y la identidad del artefacto
registrado ya coinciden con el objetivo resuelto, la actualización se omite sin
descargar, reinstalar o reescribir `openclaw.json`.

Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia,
OpenClaw lo trata como una deriva del artefacto npm. El comando interactivo
`openclaw plugins update` imprime los hashes esperados y reales y pide
confirmación antes de continuar. Los asistentes de actualización no interactivos fallan de forma cerrada
a menos que la persona que llama proporcione una política de continuación explícita.

`--dangerously-force-unsafe-install` también está disponible en `plugins update` como una
anulación de emergencia para falsos positivos del escaneo de código peligroso integrado durante
las actualizaciones de complementos. Aún así, no omite los bloques de política `before_install` del complemento
ni el bloqueo por fallo de escaneo, y solo se aplica a las actualizaciones de complementos, no a las actualizaciones
de hook-packs.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda para un solo complemento. Muestra la identidad, el estado de carga, la fuente,
las capacidades registradas, los hooks, las herramientas, los comandos, los servicios, los métodos de gateway,
rutas HTTP, indicadores de política, diagnósticos, metadatos de instalación, capacidades de paquete
y cualquier soporte detectado para servidores MCP o LSP.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo hooks, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Formas de complementos](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

El indicador `--json` genera un informe legible por máquina adecuado para secuencias de comandos y
auditoría.

`inspect --all` renderiza una tabla de toda la flota con columnas de forma, tipos de capacidades,
avisos de compatibilidad, capacidades de paquete y resumen de hooks.

`info` es un alias para `inspect`.

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de complementos, diagnósticos de manifiesto/descubrimiento y
avisos de compatibilidad. Cuando todo está limpio, imprime `No plugin issues
detected.`

Para fallos de forma de módulo, como exportaciones `register`/`activate` faltantes, vuelva a ejecutar
con `OPENCLAW_PLUGIN_LOAD_DEBUG=1` para incluir un resumen compacto de la forma de exportación en
la salida de diagnóstico.

### Mercado

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista del mercado acepta una ruta de mercado local, una ruta `marketplace.json`, una
abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json`
imprime la etiqueta de fuente resuelta más el manifiesto del mercado analizado y las
entradas del complemento.
