---
summary: "Referencia de CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to debug plugin load failures
title: "Complementos"
sidebarTitle: "Complementos"
---

Administre los complementos de Gateway, paquetes de hooks y bundles compatibles.

<CardGroup cols={2}>
  <Card title="Sistema de complementos" href="/es/tools/plugin">
    Guía de usuario final para instalar, habilitar y solucionar problemas de complementos.
  </Card>
  <Card title="Gestionar plugins" href="/es/plugins/manage-plugins">
    Ejemplos rápidos para instalar, listar, actualizar, desinstalar y publicar.
  </Card>
  <Card title="Paquetes de plugins" href="/es/plugins/bundles">
    Modelo de compatibilidad de paquetes.
  </Card>
  <Card title="Manifiesto del plugin" href="/es/plugins/manifest">
    Campos del manifiesto y esquema de configuración.
  </Card>
  <Card title="Seguridad" href="/es/gateway/security">
    Endurecimiento de seguridad para la instalación de plugins.
  </Card>
</CardGroup>

## Comandos

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

Para una investigación de instalación lenta, inspección, desinstalación o actualización del registro, ejecute el
comando con `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`. El rastro escribe los tiempos de fase
en stderr y mantiene la salida JSON analizable. Vea [Debugging](/es/help/debugging#plugin-lifecycle-trace).

<Note>En modo Nix (`OPENCLAW_NIX_MODE=1`), los mutadores del ciclo de vida del plugin están deshabilitados. Use la fuente Nix para esta instalación en lugar de `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable`, o `plugins disable`; para nix-openclaw, use el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad de agente.</Note>

<Note>
Los plugins empaquetados se envían con OpenClaw. Algunos están habilitados de forma predeterminada (por ejemplo, proveedores de modelos empaquetados, proveedores de voz empaquetados y el plugin de navegador empaquetado); otros requieren `plugins enable`.

Los plugins nativos de OpenClaw deben enviar `openclaw.plugin.json` con un esquema JSON en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles usan sus propios manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. La salida detallada de lista/info también muestra el subtipo de paquete (`codex`, `claude`, o `cursor`) además de las capacidades del paquete detectadas.

</Note>

### Instalar

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # npm by default
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install npm-pack:<path.tgz>            # local npm pack through npm install semantics
openclaw plugins install git:github.com/<owner>/<repo>  # git repo
openclaw plugins install git:github.com/<owner>/<repo>@<ref>
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

Los mantenedores que prueben instalaciones en el momento de la configuración pueden invalidar las fuentes de instalación automáticas de complementos con variables de entorno protegidas. Consulte [Invalidaciones de instalación de complementos](/es/plugins/install-overrides).

<Warning>
Los nombres de paquetes simples se instalan desde npm por defecto durante el transitorio de lanzamiento. Use `clawhub:<package>` para ClawHub. Trate las instalaciones de complementos como si estuviera ejecutando código. Prefiera versiones ancladas.
</Warning>

`plugins search` consulta a ClawHub paquetes de complementos instalables e imprime
nombres de paquetes listos para instalar. Busca paquetes code-plugin y bundle-plugin,
no habilidades. Use `openclaw skills search` para las habilidades de ClawHub.

<Note>
  ClawHub es la superficie principal de distribución y descubrimiento para la mayoría de los complementos. Npm sigue siendo una ruta de instalación directa y alternativa compatible. Los paquetes de complementos `@openclaw/*` de OpenClaw se publican nuevamente en npm; consulte la lista actual en [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) o en el [inventario de
  complementos](/es/plugins/plugin-inventory). Las instalaciones estables usan `latest`. Las instalaciones y actualizaciones del canal beta prefieren la dist-tag `beta` de npm cuando esa etiqueta está disponible, y luego recurren a `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    Si su sección `plugins` está respaldada por un archivo único `$include`, `plugins install/update/enable/disable/uninstall` escribirá directamente en ese archivo incluido y dejará `openclaw.json` sin modificar. Las inclusiones raíz, las matrices de inclusión y las inclusiones con anulaciones hermanas fallan cerradas en lugar de aplanarse. Consulte [Config includes](/es/gateway/configuration) para conocer las formas admitidas.

    Si la configuración no es válida durante la instalación, `plugins install` normalmente falla cerrada y le indica que ejecute `openclaw doctor --fix` primero. Durante el inicio y la recarga en caliente de Gateway, la configuración no válida del complemento falla cerrada como cualquier otra configuración no válida; `openclaw doctor --fix` puede poner en cuarentena la entrada del complemento no válida. La única excepción documentada en el momento de la instalación es una ruta de recuperación estrecha para complementos empaquetados que explícitamente optan por `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento o paquete de hooks ya instalado en su lugar. Úselo cuando intencionalmente esté reinstalando el mismo id desde una nueva ruta local, archivo, paquete ClawHub o artefacto npm. Para actualizaciones de rutina de un complemento npm ya rastreado, prefiera `openclaw plugins update <id-or-npm-spec>`.

    Si ejecuta `plugins install` para un id de complemento que ya está instalado, OpenClaw se detiene y le señala `plugins update <id-or-npm-spec>` para una actualización normal, o `plugins install <package> --force` cuando genuinamente desea sobrescribir la instalación actual desde una fuente diferente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` se aplica solo a instalaciones npm. No es compatible con instalaciones `git:`; use una referencia git explícita como `git:github.com/acme/plugin@v1.2.3` cuando desee una fuente anclada. No es compatible con `--marketplace`, porque las instalaciones del marketplace persisten los metadatos de origen del marketplace en lugar de una especificación npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` es una opción de emergencia para los falsos positivos en el escáner de código peligroso integrado. Permite que la instalación continúe incluso cuando el escáner integrado informa `critical` hallazgos, pero **no** evita los bloqueos de política de enganches de `before_install` del complemento y **no** evita los fallos de escaneo.

    Este indicador de CLI se aplica a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo un flujo de descarga/instalación de habilidades de ClawHub separado.

    Si un complemento que publicaste en ClawHub está bloqueado por un escaneo de registro, usa los pasos para editores en [ClawHub](/es/clawhub/security).

  </Accordion>
  <Accordion title="Hook packs y especificaciones npm">
    `plugins install` también es la superficie de instalación para hook packs que exponen `openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad filtrada de hooks y la habilitación por hook, no para la instalación de paquetes.

    Las especificaciones npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o **dist-tag**). Se rechazan las especificaciones de Git/URL/archivo y los rangos de semver. Las instalaciones de dependencias se ejecutan localmente en el proyecto con `--ignore-scripts` por seguridad, incluso cuando su shell tiene configuraciones de instalación global de npm. Las raíces npm de complementos administrados heredan las `overrides` npm a nivel de paquete de OpenClaw, por lo que los pines de seguridad del host también se aplican a las dependencias de complementos elevadas.

    Use `npm:<package>` cuando desee hacer explícita la resolución de npm. Las especificaciones de paquetes simples también se instalan directamente desde npm durante el transitorio de lanzamiento.

    Las especificaciones simples y `@latest` se mantienen en la vía estable. Las versiones de corrección con fecha de OpenClaw, como `2026.5.3-1`, son versiones estables para esta verificación. Si npm resuelve cualquiera de esas a una versión preliminar, OpenClaw se detiene y le pide que se suscriba explícitamente con una etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta como `@1.2.3-beta.4`.

    Si una especificación de instalación simple coincide con un ID de complemento oficial (por ejemplo `diffs`), OpenClaw instala la entrada del catálogo directamente. Para instalar un paquete npm con el mismo nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

  </Accordion>
  <Accordion title="Repositorios Git">
    Use `git:<repo>` para instalar directamente desde un repositorio git. Los formularios admitidos incluyen `git:github.com/owner/repo`, `git:owner/repo`, `https://` completo, `ssh://`, `git://`, `file://` y `git@host:owner/repo.git` URLs de clonación. Agregue `@<ref>` o `#<ref>` para verificar una rama, etiqueta o confirmación antes de la instalación.

    Las instalaciones de Git se clonan en un directorio temporal, verifican la referencia solicitada cuando está presente y luego usan el instalador normal del directorio de complementos. Eso significa que la validación del manifiesto, el escaneo de código peligroso, el trabajo de instalación del administrador de paquetes y los registros de instalación se comportan como las instalaciones de npm. Las instalaciones de git registradas incluyen la URL/referencia de origen más la confirmación resuelta, por lo que `openclaw plugins update` puede resolver el origen nuevamente más tarde.

    Después de instalar desde git, use `openclaw plugins inspect <id> --runtime --json` para verificar los registros de tiempo de ejecución, como los métodos de gateway y los comandos de CLI. Si el complemento registró una raíz de CLI con `api.registerCli`, ejecute ese comando directamente a través de la CLI raíz de OpenClaw, por ejemplo `openclaw demo-plugin ping`.

  </Accordion>
  <Accordion title="Archivos">
    Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Los archivos de complementos nativos de OpenClaw deben contener un `openclaw.plugin.json` válido en la raíz del complemento extraído; los archivos que solo contienen `package.json` se rechazan antes de que OpenClaw escriba los registros de instalación.

    Use `npm-pack:<path.tgz>` cuando el archivo sea un archivo tar de npm-pack y desee
    probar la misma ruta de instalación administrada de raíz npm utilizada por las instalaciones del registro,
    incluida la verificación de `package-lock.json`, el escaneo de dependencias elevadas y
    los registros de instalación de npm. Las rutas de archivos planas aún se instalan como archivos locales
    en la raíz de extensiones del complemento.

    Las instalaciones del mercado de Claude también son compatibles.

  </Accordion>
</AccordionGroup>

Las instalaciones de ClawHub utilizan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Las especificaciones de complementos compatibles con npm simples se instalan desde npm por defecto durante el cambio de lanzamiento:

```bash
openclaw plugins install openclaw-codex-app-server
```

Use `npm:` para hacer que la resolución solo de npm sea explícita:

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw verifica la API de complemento anunciada / compatibilidad mínima de la puerta de enlace antes de la instalación. Cuando la versión seleccionada de ClawHub publica un artefacto ClawPack, OpenClaw descarga el paquete npm versionado `.tgz`, verifica el encabezado de resumen de ClawHub y el resumen del artefacto, y luego lo instala a través de la ruta de archivo normal. Las versiones anteriores de ClawHub sin metadatos ClawPack aún se instalan a través de la ruta de verificación de archivo de paquete heredada. Las instalaciones registradas mantienen sus metadatos de origen ClawHub, tipo de artefacto, integridad npm, shasum npm, nombre del tarball y hechos de resumen ClawPack para actualizaciones posteriores.
Las instalaciones de ClawHub sin versión mantienen una especificación registrada sin versión para que `openclaw plugins update` pueda seguir los lanzamientos más nuevos de ClawHub; los selectores de versión o etiqueta explícitos como `clawhub:pkg@1.2.3` y `clawhub:pkg@beta` permanecen fijos a ese selector.

#### Abreviatura de Marketplace

Use la abreviatura `plugin@marketplace` cuando el nombre del mercado exista en el caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar la fuente del mercado explícitamente:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Fuentes de Marketplace">
    - un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
    - una ruta raíz de mercado local o `marketplace.json`
    - una abreviatura de repositorio de GitHub como `owner/repo`
    - una URL de repositorio de GitHub como `https://github.com/owner/repo`
    - una URL git

  </Tab>
  <Tab title="Reglas de mercados remotos">
    Para los mercados remotos cargados desde GitHub o git, las entradas de complementos deben permanecer dentro del repositorio de mercado clonado. OpenClaw acepta fuentes de ruta relativa de ese repositorio y rechaza HTTP(S), ruta absoluta, git, GitHub y otras fuentes de complementos que no son de ruta de manifiestos remotos.
  </Tab>
</Tabs>

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- Paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componente Claude predeterminado)
- Paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Los paquetes compatibles se instalan en la raíz de complementos normal y participan en el mismo flujo de lista/información/activación/desactivación. Hoy en día, se admiten las habilidades de paquete, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, valores predeterminados de Claude `.lsp.json` / `lspServers` declarados en el manifiesto, habilidades de
  comandos de Cursor y directorios de enlaces de Codex compatibles; otras capacidades de paquete detectadas se muestran en el diagnóstico/información pero aún no están conectadas a la ejecución en tiempo de ejecución.
</Note>

### Lista

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins search <query>
openclaw plugins search <query> --limit 20
openclaw plugins search <query> --json
```

<ParamField path="--enabled" type="boolean">
  Mostrar solo los complementos habilitados.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Cambiar de la vista de tabla a líneas de detalles por complemento con metadatos de origen/origen/versión/activación.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventario legible por máquina más diagnósticos de registro y estado de instalación de dependencias de paquetes.
</ParamField>

<Note>
`plugins list` lee primero el registro local persistido de complementos, con un respaldo derivado solo de manifiesto cuando el registro falta o no es válido. Es útil para verificar si un complemento está instalado, habilitado y visible para la planificación de inicio en frío, pero no es una sonda de tiempo de ejecución en vivo de un proceso Gateway ya en ejecución. Después de cambiar el código del complemento, la habilitación, la política de enlace o `plugins.load.paths`, reinicie el Gateway que sirve el canal antes de esperar que se ejecute el nuevo código `register(api)` o los enlaces. Para implementaciones remotas/en contenedores, verifique que está reiniciando el proceso hijo `openclaw gateway run` real, no solo un proceso contenedor.

`plugins list --json` incluye las `dependencyStatus` de cada complemento de `package.json`
`dependencies` y `optionalDependencies`. OpenClaw verifica si esos nombres de paquete
están presentes a lo largo de la ruta de búsqueda `node_modules` de Node normal del complemento; no
importa el código de tiempo de ejecución del complemento, ejecuta un administrador de paquetes ni repara
dependencias faltantes.

</Note>

`plugins search` es una búsqueda remota del catálogo ClawHub. No inspecciona el estado
local, muta la configuración, instala paquetes ni carga el código de tiempo de ejecución del complemento. Los resultados de
búsqueda incluyen el nombre del paquete ClawHub, la familia, el canal, la versión, el resumen y
una sugerencia de instalación como `openclaw plugins install clawhub:<package>`.

Para trabajar con complementos empaquetados dentro de una imagen Docker empaquetada, monte el directorio de
código fuente del complemento sobre la ruta de código fuente empaquetada correspondiente, como
`/app/extensions/synology-chat`. OpenClaw descubrirá esa superposición de código fuente
montada antes que `/app/dist/extensions/synology-chat`; un directorio de código fuente copiado
permanece inactivo, por lo que las instalaciones empaquetadas normales aún usan dist compilado.

Para la depuración de enlaces en tiempo de ejecución:

- `openclaw plugins inspect <id> --runtime --json` muestra los enlaces registrados y el diagnóstico de un pase de inspección de módulos cargados. La inspección en tiempo de ejecución nunca instala dependencias; use `openclaw doctor --fix` para limpiar el estado de dependencias heredado o recuperar complementos descargables faltantes a los que se hace referencia en la configuración.
- `openclaw gateway status --deep --require-rpc` confirma el Gateway accesible, las sugerencias de servicio/proceso, la ruta de configuración y el estado de RPC.
- Los ganchos de conversación no incluidos (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) requieren `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Use `--link` para evitar copiar un directorio local (añade a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la ruta de origen en lugar de copiar sobre un objetivo de instalación administrado.

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en el índice de plugins administrados mientras se mantiene el comportamiento predeterminado sin fijar.

</Note>

### Índice de plugins

Los metadatos de instalación del plugin son un estado administrado por la máquina, no una configuración de usuario. Las instalaciones y actualizaciones lo escriben en `plugins/installs.json` bajo el directorio de estado activo de OpenClaw. Su mapa `installRecords` de nivel superior es la fuente duradera de los metadatos de instalación, incluidos los registros de manifiestos de plugin rotos o faltantes. La matriz `plugins` es la caché del registro frío derivada del manifiesto. El archivo incluye una advertencia de no editar y es utilizado por `openclaw plugins update`, desinstalación, diagnósticos y el registro de plugins frío.

Cuando OpenClaw ve registros heredados enviados de `plugins.installs` en la configuración, las lecturas en tiempo de ejecución los tratan como entrada de compatibilidad sin reescribir `openclaw.json`. Las escrituras explícitas de plugins y `openclaw doctor --fix` mueven esos registros al índice de plugins y eliminan la clave de configuración cuando se permiten escrituras de configuración; si alguna escritura falla, los registros de configuración se mantienen para que no se pierdan los metadatos de instalación.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, el índice de complementos persistente, las entradas de la lista de permitidos/denegados de complementos y las entradas vinculadas de `plugins.load.paths` cuando sea aplicable. A menos que se establezca `--keep-files`, la desinstalación también elimina el directorio de instalación administrada rastreado cuando se encuentra dentro de la raíz de extensiones de complementos de OpenClaw. Para los complementos de memoria activa, la ranura de memoria se restablece a `memory-core`.

<Note>`--keep-config` es compatible como alias obsoleto de `--keep-files`.</Note>

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones de complementos rastreadas en el índice de complementos administrado y a las instalaciones de hook-packs rastreadas en `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Resolución de ID de complemento frente a especificación de npm">
    Cuando pasa un ID de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Esto significa que las dist-tags almacenadas previamente, como `@beta` y las versiones fijas exactas, continúan usándose en ejecuciones posteriores de `update <id>`.

    Para las instalaciones de npm, también puede pasar una especificación de paquete npm explícita con una dist-tag o una versión exacta. OpenClaw resuelve ese nombre de paquete nuevamente al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación de npm para futuras actualizaciones basadas en ID.

    Pasar el nombre del paquete npm sin una versión o etiqueta también se resuelve nuevamente al registro del complemento rastreado. Use esto cuando un complemento estaba fijado a una versión exacta y desea volver a la línea de lanzamiento predeterminada del registro.

  </Accordion>
  <Accordion title="Actualizaciones del canal beta">
    `openclaw plugins update` reutiliza la especificación del complemento rastreado a menos que pase una nueva especificación. `openclaw update` además conoce el canal de actualización activo de OpenClaw: en el canal beta, los registros de complementos npm y ClawHub de la línea predeterminada intentan primero `@beta` y luego vuelven a la especificación predeterminada/más reciente registrada si no existe una versión beta del complemento. Las versiones exactas y las etiquetas explícitas permanecen fijas a ese selector.

  </Accordion>
  <Accordion title="Version checks and integrity drift">
    Antes de una actualización en vivo de npm, OpenClaw verifica la versión del paquete instalado frente a los metadatos del registro de npm. Si la versión instalada y la identidad del artefacto registrado ya coinciden con el objetivo resuelto, la actualización se omite sin descargar, reinstalar ni reescribir `openclaw.json`.

    Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia, OpenClaw lo trata como una deriva del artefacto de npm. El comando interactivo `openclaw plugins update` imprime los hashes esperados y reales y solicita confirmación antes de continuar. Los asistentes de actualización no interactivos fallan de forma cerrada a menos que la persona que llama proporcione una política de continuación explícita.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install on update">
    `--dangerously-force-unsafe-install` también está disponible en `plugins update` como una anulación de emergencia para falsos positivos de escaneo de código peligroso integrado durante las actualizaciones de complementos. Todavía no omite los bloqueos de política de `before_install` del complemento ni el bloqueo por fallo de escaneo, y solo se aplica a actualizaciones de complementos, no a actualizaciones de hook-packs.
  </Accordion>
</AccordionGroup>

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect muestra la identidad, el estado de carga, la fuente, las capacidades del manifiesto, las marcas de política, el diagnóstico, los metadatos de instalación, las capacidades del paquete y cualquier compatibilidad detectada con servidores MCP o LSP sin importar el tiempo de ejecución del complemento de forma predeterminada. Agregue `--runtime` para cargar el módulo del complemento e incluir los hooks, herramientas, comandos, servicios, métodos de gateway y rutas HTTP registrados. La inspección del tiempo de ejecución informa directamente las dependencias faltantes del complemento; las instalaciones y reparaciones permanecen en `openclaw plugins install`, `openclaw plugins update` y `openclaw doctor --fix`.

Los comandos de CLI propiedad de plugins generalmente se instalan como grupos de comandos raíz `openclaw`, pero los plugins también pueden registrar comandos anidados bajo un elemento principal central como `openclaw nodes`. Después de que `inspect --runtime` muestre un comando bajo `cliCommands`, ejecútelo en la ruta listada; por ejemplo, un plugin que registra `demo-git` se puede verificar con `openclaw demo-git ping`.

Cada plugin se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un plugin solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo hooks, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Formas de plugins](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

<Note>La opción `--json` genera un informe legible por máquina, adecuado para secuencias de comandos y auditorías. `inspect --all` presenta una tabla para toda la flota con columnas de forma, tipos de capacidades, avisos de compatibilidad, capacidades del paquete y resumen de hooks. `info` es un alias de `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de plugins, diagnósticos de manifiesto/descubrimiento y avisos de compatibilidad. Cuando todo está limpio, imprime `No plugin issues detected.`

Si un plugin configurado está presente en el disco pero está bloqueado por las comprobaciones de seguridad de ruta del cargador, la validación de la configuración mantiene la entrada del plugin y lo informa como `present but blocked`. Solucione el diagnóstico anterior de plugin bloqueado, como la propiedad de la ruta o los permisos de escritura universal, en lugar de eliminar la configuración `plugins.entries.<id>``plugins.allow` o %%PH:INLINE_CODE:245:b591d8c%%.

Para fallos de forma de módulo, como exportaciones `register`/`activate` faltantes, vuelva a ejecutar con `OPENCLAW_PLUGIN_LOAD_DEBUG=1` para incluir un resumen compacto de la forma de exportación en la salida de diagnóstico.

### Registry

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

El registro local de plugins es el modelo de lectura en frío persistente de OpenClaw para la identidad del plugin instalado, la habilitación, los metadatos de origen y la propiedad de la contribución. El inicio normal, la búsqueda del propietario del proveedor, la clasificación de la configuración del canal y el inventario de plugins pueden leerlo sin importar los módulos de tiempo de ejecución del plugin.

Use `plugins registry` para inspeccionar si el registro persistente está presente, actualizado o obsoleto. Use `--refresh` para reconstruirlo a partir del índice persistente del plugin, la política de configuración y los metadatos del manifiesto/paquete. Esta es una ruta de reparación, no una ruta de activación en tiempo de ejecución.

`openclaw doctor --fix` también repara la deriva administrada de npm adyacente al registro: si un paquete `@openclaw/*` huérfano o recuperado bajo la raíz npm del plugin administrado eclipsa un plugin empaquetado, doctor elimina ese paquete obsoleto y reconstruye el registro para que el inicio se valide contra el manifiesto empaquetado.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` es un interruptor de compatibilidad de emergencia (break-glass) en desuso para fallos de lectura del registro. Prefiera `plugins registry --refresh` o `openclaw doctor --fix`; la alternativa de entorno (env) es solo para la recuperación de emergencia del inicio mientras se implementa la migración.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista de Marketplace acepta una ruta de marketplace local, una ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json` imprime la etiqueta de origen resuelta más el manifiesto del marketplace analizado y las entradas de plugins.

## Relacionado

- [Construcción de plugins](/es/plugins/building-plugins)
- [Referencia de la CLI](/es/cli)
- [ClawHub](/es/clawhub)
