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

- Sistema de complementos: [Complementos](/en/tools/plugin)
- Compatibilidad de paquetes: [Paquetes de complementos](/en/plugins/bundles)
- Manifiesto de complemento + esquema: [Manifiesto de complemento](/en/plugins/manifest)
- Refuerzo de seguridad: [Seguridad](/en/gateway/security)

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
openclaw plugins update <id>
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

Si la configuración no es válida, `plugins install` normalmente falla de forma segura y le indica que
primero ejecute `openclaw doctor --fix`. La única excepción documentada es una ruta
estrecha de recuperación de complementos incluidos para complementos que aceptan explícitamente
`openclaw.install.allowInvalidConfigRecovery`.

`--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento
o paquete de enlaces ya instalado en su lugar. Úselo cuando esté reinstalando
intencionalmente el mismo id desde una nueva ruta local, archivo, paquete de ClawHub o artefacto npm.

`--pin` se aplica solo a instalaciones de npm. No es compatible con `--marketplace`,
porque las instalaciones del marketplace persisten en los metadatos de origen del marketplace en lugar de una
especificación npm.

`--dangerously-force-unsafe-install` es una opción de emergencia para falsos positivos
en el escáner de código peligroso integrado. Permite que la instalación continúe incluso
cuando el escáner integrado reporta hallazgos `critical`, pero **no**
elude los bloques de política de gancho `before_install` del complemento **y no** elude
los fallos del escaneo.

Esta bandera de CLI se aplica a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la invalidación de solicitud `dangerouslyForceUnsafeInstall` correspondiente,
mientras que `openclaw skills install` sigue siendo un flujo de descarga/instalación
de habilidades de ClawHub separado.

`plugins install` también es la superficie de instalación para paquetes de ganchos que exponen
`openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad de ganchos filtrada
y la habilitación por gancho, no para la instalación de paquetes.

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos semver se rechazan. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una
etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un id de complemento empaquetado (por ejemplo `diffs`), OpenClaw
instala el complemento empaquetado directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con alcance explícita (por ejemplo `@scope/diffs`).

Archivos admitidos: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del mercado de Claude también son compatibles.

Las instalaciones de ClawHub usan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Ahora OpenClaw también prefiere ClawHub para las especificaciones de complementos seguros de npm simples. Solo recurre
a npm si ClawHub no tiene ese paquete o versión:

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw descarga el archivo del paquete desde ClawHub, verifica la API del complemento anunciada / la compatibilidad mínima con la puerta de enlace y luego lo instala a través de la ruta de archivo normal. Las instalaciones registradas mantienen sus metadatos de origen de ClawHub para actualizaciones posteriores.

Use la abreviatura `plugin@marketplace` cuando el nombre del mercado exista en la caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar el origen del mercado explícitamente:

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

Para mercados remotos cargados desde GitHub o git, las entradas de complementos deben permanecer dentro del repositorio del mercado clonado. OpenClaw acepta orígenes de ruta relativa de ese repositorio y rechaza HTTP(S), rutas absolutas, git, GitHub y otros orígenes de complementos que no sean rutas de manifiestos remotos.

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componentes de Claude predeterminado)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en el mismo flujo de lista/información/activación/desactivación. Hoy, se admiten las habilidades de paquete, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, valores predeterminados de Claude `.lsp.json` / `lspServers` declarados en el manifiesto, habilidades de comandos de Cursor y directorios de hooks de Codex compatibles; otras capacidades de paquete detectadas se muestran en diagnósticos/información, pero aún no están conectadas a la ejecución en tiempo de ejecución.

### Lista

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

Use `--enabled` para mostrar solo los complementos cargados. Use `--verbose` para cambiar de la vista de tabla a líneas de detalle por complemento con metadatos de origen/origen/versión/activación. Use `--json` para el inventario legible por máquina más diagnósticos del registro.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la ruta de origen en lugar de copiar sobre un objetivo de instalación administrado.

Use `--pin` en las instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en
`plugins.installs` mientras se mantiene el comportamiento predeterminado sin fijar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos de complementos y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

De forma predeterminada, la desinstalación también elimina el directorio de instalación del complemento bajo la raíz de complementos del state-dir activo. Use
`--keep-files` para mantener los archivos en el disco.

`--keep-config` es compatible como un alias en desuso para `--keep-files`.

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs` y a las instalaciones de hook-packs rastreadas en `hooks.internal.installs`.

Cuando pasa una identificación de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Eso significa que las dist-tags almacenadas previamente, como `@beta` y las versiones fijas exactas, siguen usándose en ejecuciones posteriores de `update <id>`.

Para las instalaciones de npm, también puede pasar una especificación explícita de paquete npm con una dist-tag o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación de npm para futuras actualizaciones basadas en id.

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia, OpenClaw imprime una advertencia y pide confirmación antes de continuar. Use el `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

`--dangerously-force-unsafe-install` también está disponible en `plugins update` como una
anulación de emergencia para los falsos positivos del escaneo de código peligroso
incorporado durante las actualizaciones de complementos. Aún así, no evita los bloqueos
de política del complemento `before_install` ni el bloqueo por fallos de escaneo,
y solo se aplica a las actualizaciones de complementos, no a las actualizaciones
de paquetes de hooks.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda para un solo complemento. Muestra identidad, estado de carga, fuente,
capacidades registradas, hooks, herramientas, comandos, servicios, métodos de puerta de enlace,
rutas HTTP, indicadores de política, diagnósticos, metadatos de instalación, capacidades del paquete
y cualquier soporte de servidor MCP o LSP detectado.

Cada complemento se clasifica según lo que realmente registra en tiempo de ejecución:

- **plain-capability** (capacidad simple): un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** (capacidad híbrida): múltiples tipos de capacidad (p. ej., texto + voz + imágenes)
- **hook-only** (solo hook): solo hooks, sin capacidades ni superficies
- **non-capability** (sin capacidad): herramientas/comandos/servicios pero sin capacidades

Consulte [Plugin shapes](/en/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

La opción `--json` genera un informe legible por máquina, adecuado para secuencias de comandos
y auditorías.

`inspect --all` genera una tabla de toda la flota con columnas de forma, tipos de capacidad,
avisos de compatibilidad, capacidades del paquete y resumen de hooks.

`info` es un alias de `inspect`.

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de complementos, diagnósticos de manifiesto/descubrimiento y
avisos de compatibilidad. Cuando todo está limpio, imprime `No plugin issues
detected.`

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista del Marketplace acepta una ruta de marketplace local, una ruta `marketplace.json`, una
abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json`
imprime la etiqueta de fuente resuelta más el manifiesto del marketplace analizado y
las entradas de complementos.
