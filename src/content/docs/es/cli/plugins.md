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
- Endurecimiento de seguridad: [Seguridad](/en/gateway/security)

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
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
```

Los nombres de paquetes simples se verifican primero contra ClawHub y luego contra npm. Nota de seguridad:
trate las instalaciones de complementos como ejecutar código. Prefiera versiones ancladas.

`--dangerously-force-unsafe-install` es una opción de emergencia para falsos positivos
en el escáner de código peligroso integrado. Permite que la instalación continúe incluso
cuando el escáner integrado informa hallazgos `critical`, pero **no**
omite los bloqueos de política de gancho `before_install` del complemento y **no** omite los fallos
de escaneo.

Este indicador de CLI se aplica a `openclaw plugins install`. Las instalaciones de dependencias de habilidades
respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente,
mientras que `openclaw skills install` sigue siendo un flujo separado de descarga/instalación
de habilidades de ClawHub.

`plugins install` es también la superficie de instalación para paquetes de ganchos que exponen
`openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad
filtrada de ganchos y la habilitación por gancho, no para la instalación de paquetes.

Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o
**dist-tag**). Las especificaciones de Git/URL/archivo y los rangos semver se rechazan. Las instalaciones
de dependencias se ejecutan con `--ignore-scripts` por seguridad.

Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de
ellas a una versión preliminar, OpenClaw se detiene y le pide que opte explícitamente con una
etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como
`@1.2.3-beta.4`.

Si una especificación de instalación simple coincide con un ID de complemento empaquetado (por ejemplo `diffs`), OpenClaw
instala el complemento empaquetado directamente. Para instalar un paquete npm con el mismo
nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`.

Las instalaciones del mercado de Claude también son compatibles.

Las instalaciones de ClawHub usan un localizador explícito `clawhub:<package>`:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw ahora también prefiere ClawHub para las especificaciones de plugins seguras para npm simples. Solo recurre a npm si ClawHub no tiene ese paquete o versión:

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw descarga el archivo del paquete desde ClawHub, verifica la compatibilidad anunciada de la API del plugin / la puerta de enlace mínima, y luego lo instala a través de la ruta normal de archivo. Las instalaciones registradas mantienen sus metadatos de origen de ClawHub para actualizaciones posteriores.

Use el atajo `plugin@marketplace` cuando el nombre del mercado exista en el caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando quiera pasar explícitamente la fuente del mercado:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Las fuentes del mercado pueden ser:

- un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
- una raíz de mercado local o ruta `marketplace.json`
- un atajo de repositorio de GitHub como `owner/repo`
- una URL de git

Para mercados remotos cargados desde GitHub o git, las entradas de plugins deben permanecer dentro del repositorio del mercado clonado. OpenClaw acepta fuentes de ruta relativas de ese repositorio y rechaza fuentes de plugin externas de git, GitHub, URL/archivo y ruta absoluta de manifiestos remotos.

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- plugins nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componentes predeterminado de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

Los paquetes compatibles se instalan en la raíz de extensiones normal y participan en el mismo flujo de lista/info/habilitar/deshabilitar. Hoy en día, se admiten las habilidades de paquete, habilidades de comando de Claude, valores predeterminados de Claude `settings.json`, habilidades de comando de Cursor y directorios de gancho compatibles con Codex; otras capacidades de paquete detectadas se muestran en diagnósticos/info pero aún no están conectadas a la ejecución en tiempo de ejecución.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en `plugins.installs` mientras se mantiene el comportamiento predeterminado sin anclar.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, `plugins.installs`,
la lista de permitidos (allowlist) del complemento y las entradas vinculadas de `plugins.load.paths` cuando corresponda.
Para los complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

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
```

Las actualizaciones se aplican a las instalaciones rastreadas en `plugins.installs` y a las instalaciones de
paquetes de enlace (hook-packs) rastreadas en `hooks.internal.installs`.

Cuando pasa un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese
complemento. Eso significa que las dist-tags almacenadas previamente, como `@beta` y las versiones fijas exactas,
continúan usándose en ejecuciones posteriores de `update <id>`.

Para las instalaciones de npm, también puede pasar una especificación de paquete npm explícita con una dist-tag
o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado,
actualiza ese complemento instalado y registra la nueva especificación de npm para futuras
actualizaciones basadas en id.

Cuando existe un hash de integridad almacenado y el hash del artefacto recuperado cambia,
OpenClaw imprime una advertencia y solicita confirmación antes de continuar. Use
el `--yes` global para omitir las solicitudes en ejecuciones de CI/no interactivas.

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda de un solo complemento. Muestra identidad, estado de carga, fuente,
capacidades registradas, enlaces, herramientas, comandos, servicios, métodos de puerta de enlace,
rutas HTTP, indicadores de política, diagnósticos y metadatos de instalación.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo enlaces, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Formas de complementos (Plugin shapes)](/en/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

La opción `--json` genera un informe legible por máquina adecuado para secuencias de comandos y
auditorías.

`info` es un alias de `inspect`.
