---
summary: "Referencia de CLI para `openclaw plugins` (init, build, validate, list, install, marketplace, uninstall, enable/disable, doctor)"
read_when:
  - You want to install or manage Gateway plugins or compatible bundles
  - You want to scaffold or validate a simple tool plugin
  - You want to debug plugin load failures
title: "Plugins"
sidebarTitle: "Plugins"
---

Administre los complementos de Gateway, paquetes de hooks y bundles compatibles.

<CardGroup cols={2}>
  <Card title="Plugin system" href="/es/tools/plugin">
    Guía de usuario final para instalar, activar y solucionar problemas de plugins.
  </Card>
  <Card title="Manage plugins" href="/es/plugins/manage-plugins">
    Ejemplos rápidos para instalar, listar, actualizar, desinstalar y publicar.
  </Card>
  <Card title="Plugin bundles" href="/es/plugins/bundles">
    Modelo de compatibilidad de paquetes.
  </Card>
  <Card title="Plugin manifest" href="/es/plugins/manifest">
    Campos del manifiesto y esquema de configuración.
  </Card>
  <Card title="Security" href="/es/gateway/security">
    Endurecimiento de seguridad para instalaciones de plugins.
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
openclaw plugins init <id>
openclaw plugins init <id> --directory ./my-plugin --name "My Plugin"
openclaw plugins build --entry ./dist/index.js
openclaw plugins build --entry ./dist/index.js --check
openclaw plugins validate --entry ./dist/index.js
```

Para investigar una instalación, inspección, desinstalación o actualización de registro lentas, ejecute el
comando con `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`. El rastro escribe los tiempos de las fases
en stderr y mantiene la salida JSON analizable. Consulte [Debugging](/es/help/debugging#plugin-lifecycle-trace).

<Note>En modo Nix (`OPENCLAW_NIX_MODE=1`), los mutadores del ciclo de vida de los plugins están deshabilitados. Utilice la fuente Nix para esta instalación en lugar de `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable` o `plugins disable`; para nix-openclaw, use el [Quick Start] centrado en el agente(https://github.com/openclaw/nix-openclaw#quick-start).</Note>

<Note>
Los complementos agrupados se envían con OpenClaw. Algunos están habilitados de forma predeterminada (por ejemplo, proveedores de modelos agrupados, proveedores de voz agrupados y el complemento de navegador agrupado); otros requieren `plugins enable`.

Los complementos nativos de OpenClaw deben incluir `openclaw.plugin.json` con un esquema JSON en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles utilizan sus propios manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. El resultado detallado de lista/información también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) además de las capacidades del paquete detectadas.

</Note>

### Autor

```bash
openclaw plugins init stock-quotes --name "Stock Quotes"
cd stock-quotes
npm run plugin:build
npm run plugin:validate
```

`plugins init` crea un complemento de herramienta TypeScript mínimo que usa
`defineToolPlugin`. `plugins build` importa esa entrada, lee sus metadatos estáticos de
herramienta, escribe `openclaw.plugin.json` y mantiene `package.json`
`openclaw.extensions` alineados. `plugins validate` comprueba que el manifiesto
generado, los metadatos del paquete y la exportación de entrada actual sigan coincidiendo. Consulte
[Tool Plugins](/es/plugins/tool-plugins) para el flujo de trabajo completo de creación.

El andamiaje escribe código fuente TypeScript pero genera metadatos a partir de la entrada
`./dist/index.js` construida, por lo que el flujo de trabajo también funciona con la CLI publicada. Use
`--entry <path>` cuando la entrada no sea la entrada predeterminada del paquete. Use
`plugins build --check` en CI para fallar cuando los metadatos generados estén obsoletos sin
reescribir archivos.

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

Los mantenedores que prueben instalaciones en el momento de la configuración pueden anular las fuentes de instalación automática de complementos con variables de entorno protegidas. Consulte
[Plugin install overrides](/es/plugins/install-overrides).

<Warning>
Los nombres de paquetes simples se instalan desde npm de forma predeterminada durante la transición de lanzamiento. Use `clawhub:<package>` para ClawHub. Trate las instalaciones de complementos como si ejecutara código. Prefiera versiones fijas.
</Warning>

`plugins search` consulta ClawHub para paquetes de complementos instalables e imprime
nombres de paquetes listos para instalar. Busca paquetes de complementos de código y complementos de paquetes,
no habilidades. Use `openclaw skills search` para habilidades de ClawHub.

<Note>
  ClawHub es la superficie principal de distribución y descubrimiento para la mayoría de los complementos. Npm sigue siendo una ruta alternativa compatible y de instalación directa. Los paquetes de complementos `@openclaw/*` de OpenClaw se publican de nuevo en npm; vea la lista actual en [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) o en el [inventario de
  complementos](/es/plugins/plugin-inventory). Las instalaciones estables usan `latest`. Las instalaciones y actualizaciones del canal Beta prefieren la etiqueta de distribución npm `beta` cuando esa etiqueta está disponible y luego recurren a `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Inclusiones de configuración y reparación de configuración no válida">
    Si su sección `plugins` está respaldada por un solo archivo `$include`, `plugins install/update/enable/disable/uninstall` escribirá directamente en ese archivo incluido y dejará `openclaw.json` sin tocar. Las inclusiones raíz, las matrices de inclusión y las inclusiones con anulaciones de hermanos fallan cerradas en lugar de aplanarse. Consulte [Inclusiones de configuración](/es/gateway/configuration) para conocer las formas admitidas.

    Si la configuración no es válida durante la instalación, `plugins install` normalmente falla cerrada y le indica que ejecute `openclaw doctor --fix` primero. Durante el inicio y la recarga en caliente de Gateway, la configuración de complementos no válida falla cerrada como cualquier otra configuración no válida; `openclaw doctor --fix` puede poner en cuarentena la entrada del complemento no válida. La única excepción documentada en el momento de la instalación es una ruta de recuperación de complementos empaquetados limitada para complementos que optan explícitamente por `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento o paquete de hook ya instalado en su lugar. Úselo cuando esté reinstalando intencionalmente el mismo id desde una nueva ruta local, archivo, paquete ClawHub o artefacto npm. Para actualizaciones de rutina de un complemento npm ya rastreado, prefiera `openclaw plugins update <id-or-npm-spec>`.

    Si ejecuta `plugins install` para un id de complemento que ya está instalado, OpenClaw se detiene y le señala `plugins update <id-or-npm-spec>` para una actualización normal, o a `plugins install <package> --force` cuando realmente desea sobrescribir la instalación actual desde una fuente diferente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` se aplica solo a instalaciones npm. No es compatible con instalaciones `git:`; use una referencia git explícita como `git:github.com/acme/plugin@v1.2.3` cuando desee una fuente anclada. No es compatible con `--marketplace`, porque las instalaciones del mercado persisten los metadatos de origen del mercado en lugar de una especificación npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` es una opción de emergencia para los falsos positivos en el escáner de código peligroso integrado. Permite que la instalación continúe incluso cuando el escáner integrado reporte hallazgos de `critical`, pero **no** evita los bloqueos de política de hook de `before_install` del complemento y **no** evita los fallos de escaneo.

    Los escaneos de instalación ignoran los archivos y directorios de prueba comunes, como `tests/`, `__tests__/`, `*.test.*` y `*.spec.*` para evitar bloquear los simulacros de prueba empaquetados; los puntos de entrada de tiempo de ejecución del complemento declarados todavía se escanean incluso si usan uno de esos nombres.

    Esta bandera de CLI se aplica a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud coincidente `dangerouslyForceUnsafeInstall`, mientras que `openclaw skills install` sigue siendo un flujo de descarga/instalación de habilidad de ClawHub separado.

    Si un complemento que publicaste en ClawHub está oculto o bloqueado por un escaneo de registro, usa los pasos del editor en [publicación en ClawHub](/es/clawhub/publishing). `--dangerously-force-unsafe-install` solo afecta las instalaciones en tu propia máquina; no le pide a ClawHub que vuelva a escanear el complemento ni que haga pública una versión bloqueada.

  </Accordion>
  <Accordion title="Hook packs y especificaciones npm">
    `plugins install` es también la superficie de instalación para hook packs que exponen `openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad filtrada de hooks y la activación por hook, no para la instalación de paquetes.

    Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o **dist-tag**). Las especificaciones de Git/URL/archivo y los rangos semver se rechazan. Las instalaciones de dependencias se ejecutan localmente en el proyecto con `--ignore-scripts` por seguridad, incluso cuando su shell tiene configuraciones globales de instalación de npm. Las raíces npm de plugins administrados heredan el npm a nivel de paquete de OpenClaw `overrides`, por lo que los pines de seguridad del host también se aplican a las dependencias de plugins elevadas.

    Use `npm:<package>` cuando desee hacer explícita la resolución de npm. Las especificaciones de paquetes simples también se instalan directamente desde npm durante el cambio de lanzamiento.

    Las especificaciones simples y `@latest` se mantienen en la pista estable. Las versiones de corrección con fecha de OpenClaw, como `2026.5.3-1`, son versiones estables para esta verificación. Si npm resuelve cualquiera de estas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una etiqueta de versión preliminar como `@beta`/`@rc` o una versión preliminar exacta como `@1.2.3-beta.4`.

    Si una especificación de instalación simple coincide con un ID de plugin oficial (por ejemplo, `diffs`), OpenClaw instala la entrada del catálogo directamente. Para instalar un paquete npm con el mismo nombre, use una especificación con ámbito explícito (por ejemplo, `@scope/diffs`).

  </Accordion>
  <Accordion title="Repositorios Git">
    Use `git:<repo>` para instalar directamente desde un repositorio git. Los formatos compatibles incluyen `git:github.com/owner/repo`, `git:owner/repo`, `https://` completo, `ssh://`, `git://`, `file://` y `git@host:owner/repo.git` URL de clonación. Añada `@<ref>` o `#<ref>` para extraer una rama, etiqueta o confirmación antes de la instalación.

    Las instalaciones de Git clonan en un directorio temporal, extraen la referencia solicitada cuando está presente y luego utilizan el instalador normal del directorio de complementos. Esto significa que la validación del manifiesto, el escaneo de código peligroso, el trabajo de instalación del administrador de paquetes y los registros de instalación se comportan como las instalaciones de npm. Las instalaciones de git registradas incluyen la URL/referencia de origen más la confirmación resuelta, por lo que `openclaw plugins update` puede resolver el origen nuevamente más tarde.

    Después de instalar desde git, use `openclaw plugins inspect <id> --runtime --json` para verificar los registros en tiempo de ejecución, como los métodos de puerta de enlace y los comandos de la CLI. Si el complemento registró una raíz de CLI con `api.registerCli`, ejecute ese comando directamente a través de la CLI raíz de OpenClaw, por ejemplo `openclaw demo-plugin ping`.

  </Accordion>
  <Accordion title="Archivos">
    Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Los archivos de complementos nativos de OpenClaw deben contener un `openclaw.plugin.json` válido en la raíz del complemento extraído; los archivos que solo contienen `package.json` se rechazan antes de que OpenClaw escriba los registros de instalación.

    Use `npm-pack:<path.tgz>` cuando el archivo es un archivo tar de npm-pack y desea
    probar la misma ruta de instalación administrada de raíz npm utilizada por las instalaciones del registro,
    incluida la verificación `package-lock.json`, el escaneo de dependencias elevadas y los
    registros de instalación de npm. Las rutas de archivos planas aún se instalan como archivos locales
    en la raíz de extensiones del complemento.

    Las instalaciones del mercado de Claude también son compatibles.

  </Accordion>
</AccordionGroup>

Las instalaciones de ClawHub usan un `clawhub:<package>` localizador explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Las especificaciones de plugins seguras para npm simples se instalan desde npm por defecto durante el corte de lanzamiento:

```bash
openclaw plugins install openclaw-codex-app-server
```

Use `npm:` para hacer explícita la resolución solo de npm:

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw verifica la API del plugin anunciada / la compatibilidad mínima de la pasarela antes de la instalación. Cuando la versión de ClawHub seleccionada publica un artefacto ClawPack, OpenClaw descarga el paquete npm versionado `.tgz`, verifica el encabezado de resumen de ClawHub y el resumen del artefacto, y luego lo instala a través de la ruta normal de archivo. Las versiones antiguas de ClawHub sin metadatos ClawPack aún se instalan a través de la ruta de verificación de archivo de paquete heredada. Las instalaciones registradas mantienen sus metadatos de origen de ClawHub, tipo de artefacto, integridad de npm, shasum de npm, nombre del tarball y datos de resumen de ClawPack para actualizaciones posteriores.
Las instalaciones de ClawHub sin versión mantienen una especificación registrada sin versión para que `openclaw plugins update` pueda seguir los lanzamientos más nuevos de ClawHub; los selectores explícitos de versión o etiqueta, como `clawhub:pkg@1.2.3` y `clawhub:pkg@beta`, permanecen fijos a ese selector.

#### Abreviatura del Marketplace

Use la abreviatura `plugin@marketplace` cuando el nombre del marketplace exista en la caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando desee pasar la fuente del marketplace explícitamente:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Fuentes del marketplace">
    - un nombre de marketplace conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
    - una ruta raíz del marketplace local o `marketplace.json`
    - una abreviatura de repositorio de GitHub como `owner/repo`
    - una URL de repositorio de GitHub como `https://github.com/owner/repo`
    - una URL de git

  </Tab>
  <Tab title="Reglas para marketplaces remotos">
    Para los marketplaces remotos cargados desde GitHub o git, las entradas de plugins deben permanecer dentro del repositorio del marketplace clonado. OpenClaw acepta fuentes de ruta relativa de ese repositorio y rechaza fuentes de plugins HTTP(S), de ruta absoluta, git, GitHub y otras fuentes que no sean rutas de manifiestos remotos.
  </Tab>
</Tabs>

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- plugins nativos de OpenClaw (`openclaw.plugin.json`)
- Paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- Paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño de componentes de Claude predeterminado)
- Paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Los paquetes compatibles se instalan en la raíz de plugins normal y participan en el mismo flujo de lista/información/habilitar/deshabilitar. Hoy, se admiten habilidades de paquetes, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, valores predeterminados de Claude `.lsp.json` / declarados en manifiesto `lspServers`, habilidades de comandos de Cursor y
  directorios de hooks de Codex compatibles; otras capacidades de paquetes detectadas se muestran en diagnósticos/información pero aún no están conectadas a la ejecución en tiempo de ejecución.
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
  Mostrar solo los plugins habilitados.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Cambiar de la vista de tabla a líneas de detalle por plugin con metadatos de fuente/origen/versión/activación.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventario legible por máquina más diagnósticos del registro y estado de instalación de dependencias de paquetes.
</ParamField>

<Note>
`plugins list` lee primero el registro local persistido del complemento, con un respaldo derivado solo de manifiesto cuando el registro falta o no es válido. Es útil para verificar si un complemento está instalado, habilitado y visible para la planificación de inicio en frío, pero no es una sonda de tiempo de ejecución en vivo de un proceso Gateway ya en ejecución. Después de cambiar el código del complemento, la habilitación, la política de enlace o `plugins.load.paths`, reinicie el Gateway que sirve el canal antes de esperar que se ejecute el nuevo código o los nuevos enlaces de `register(api)`. Para implementaciones remotas/en contenedores, verifique que está reiniciando el proceso hijo real de `openclaw gateway run`, no solo un proceso contenedor.

`plugins list --json` incluye `dependencyStatus` de cada complemento de `package.json`
`dependencies` y `optionalDependencies`. OpenClaw verifica si esos nombres de paquete están presentes a lo largo de la ruta de búsqueda normal de Node `node_modules` del complemento; no importa el código de tiempo de ejecución del complemento, ejecuta un administrador de paquetes ni repara dependencias faltantes.

</Note>

`plugins search` es una búsqueda remota del catálogo ClawHub. No inspecciona el estado local, muta la configuración, instala paquetes ni carga el código de tiempo de ejecución del complemento. Los resultados de la búsqueda incluyen el nombre del paquete ClawHub, la familia, el canal, la versión, el resumen y una sugerencia de instalación como `openclaw plugins install clawhub:<package>`.

Para el trabajo de complementos agrupados dentro de una imagen Docker empaquetada, monte el directorio de origen del complemento sobre la ruta de origen empaquetada correspondiente, como `/app/extensions/synology-chat`. OpenClaw descubrirá esa superposición de origen montada antes que `/app/dist/extensions/synology-chat`; un directorio de origen copiado permanece inerte, por lo que las instalaciones empaquetadas normales seguirán utilizando la dist compilada.

Para la depuración de enlaces en tiempo de ejecución:

- `openclaw plugins inspect <id> --runtime --json` muestra los enlaces registrados y los diagnósticos de un pase de inspección de carga de módulos. La inspección en tiempo de ejecución nunca instala dependencias; use `openclaw doctor --fix` para limpiar el estado de dependencias heredadas o recuperar complementos descargables faltantes a los que se hace referencia en la configuración.
- `openclaw gateway status --deep --require-rpc` confirma la URL/perfil del Gateway accesible, las sugerencias de servicio/proceso, la ruta de configuración y el estado de RPC.
- Los hooks de conversación no agrupados (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) requieren `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Use `--link` para evitar copiar un directorio local (añade a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la ruta de origen en lugar de copiar sobre un objetivo de instalación gestionado.

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en el índice de plugins gestionado mientras se mantiene el comportamiento predeterminado sin anclar.

</Note>

### Índice de plugins

Los metadatos de instalación de plugins son estado gestionado por máquina, no configuración de usuario. Las instalaciones y actualizaciones los escriben en `plugins/installs.json` bajo el directorio de estado activo de OpenClaw. Su mapa `installRecords` de nivel superior es la fuente duradera de metadatos de instalación, incluidos los registros para manifiestos de plugins rotos o faltantes. La matriz `plugins` es la caché del registro en frío derivada del manifiesto. El archivo incluye una advertencia de no editar y es utilizado por `openclaw plugins update`, desinstalación, diagnósticos y el registro de plugins en frío.

Cuando OpenClaw ve registros `plugins.installs` heredados enviados en la configuración, las lecturas en tiempo de ejecución los tratan como entrada de compatibilidad sin reescribir `openclaw.json`. Las escrituras explícitas de plugins y `openclaw doctor --fix` mueven esos registros al índice de plugins y eliminan la clave de configuración cuando se permiten escrituras de configuración; si alguna escritura falla, los registros de configuración se mantienen para que no se pierdan los metadatos de instalación.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, el índice de complementos persistido, las entradas de la lista de permitir/denegar de complementos y las entradas vinculadas de `plugins.load.paths` cuando sea aplicable. A menos que se establezca `--keep-files`, la desinstalación también elimina el directorio de instalación administrada rastreado cuando se encuentra dentro de la raíz de extensiones de complementos de OpenClaw. Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

<Note>`--keep-config` es compatible como alias obsoleto para `--keep-files`.</Note>

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones de complementos rastreadas en el índice de complementos administrados y a las instalaciones de paquetes de enlace (hook-pack) rastreadas en `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Resolución de ID de complemento frente a especificación npm">
    Cuando pasa un ID de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Esto significa que las dist-tags almacenadas previamente, como `@beta` y las versiones exactas fijadas, continúan usándose en ejecuciones posteriores de `update <id>`.

    Para las instalaciones de npm, también puede pasar una especificación explícita de paquete npm con una dist-tag o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación npm para futuras actualizaciones basadas en ID.

    Pasar el nombre del paquete npm sin una versión o etiqueta también se resuelve de vuelta al registro del complemento rastreado. Use esto cuando un complemento se haya fijado a una versión exacta y desee devolverlo a la línea de lanzamiento predeterminada del registro.

  </Accordion>
  <Accordion title="Actualizaciones del canal beta">
    `openclaw plugins update` reutiliza la especificación del complemento rastreado a menos que pase una nueva especificación. `openclaw update` además conoce el canal de actualización activo de OpenClaw: en el canal beta, los registros de complementos npm y ClawHub de la línea predeterminada intentan `@beta` primero. Recurren a la especificación predeterminada/más reciente registrada si no existe una versión beta del complemento; los complementos npm también recurren cuando el paquete beta existe pero falla la validación de instalación. Esa alternativa se informa como una advertencia y no hace que la actualización principal falle. Las versiones exactas y las etiquetas explícitas permanecen fijas a ese selector.

  </Accordion>
  <Accordion title="Verificaciones de versión y desviación de integridad">
    Antes de una actualización en vivo de npm, OpenClaw verifica la versión del paquete instalado frente a los metadatos del registro de npm. Si la versión instalada y la identidad del artefacto registrado ya coinciden con el objetivo resuelto, la actualización se omite sin descargar, reinstalar ni reescribir `openclaw.json`.

    Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia, OpenClaw lo trata como una desviación de artefacto de npm. El comando `openclaw plugins update` interactivo imprime los hashes esperados y reales y solicita confirmación antes de continuar. Los asistentes de actualización no interactivos fallan de forma cerrada a menos que quien realiza la llamada suministre una política de continuación explícita.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install en la actualización">
    `--dangerously-force-unsafe-install` también está disponible en `plugins update` como una anulación de emergencia para los falsos positivos del escaneo de código peligroso integrado durante las actualizaciones de complementos. Aún así, no evita los bloqueos de política del complemento `before_install` ni el bloqueo por fallas de escaneo, y solo se aplica a las actualizaciones de complementos, no a las actualizaciones de hook-packs.
  </Accordion>
</AccordionGroup>

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspeccionar muestra la identidad, el estado de carga, la fuente, las capacidades del manifiesto, los indicadores de política, los diagnósticos, los metadatos de instalación, las capacidades del paquete y cualquier soporte detectado para servidores MCP o LSP sin importar el tiempo de ejecución del complemento de forma predeterminada. Agregue `--runtime` para cargar el módulo del complemento e incluir los hooks, herramientas, comandos, servicios, métodos de gateway y rutas HTTP registrados. La inspección en tiempo de ejecución informa directamente las dependencias faltantes del complemento; las instalaciones y reparaciones permanecen en `openclaw plugins install`, `openclaw plugins update` y `openclaw doctor --fix`.

Los comandos de CLI propiedad de complementos suelen instalarse como grupos de comandos raíz `openclaw`, pero los complementos también pueden registrar comandos anidados bajo un padre principal como `openclaw nodes`. Después de que `inspect --runtime` muestra un comando bajo `cliCommands`, ejecútelo en la ruta listada; por ejemplo, un complemento que registra `demo-git` se puede verificar con `openclaw demo-git ping`.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo ganchos, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Plugin shapes](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

<Note>El indicador `--json` genera un informe legible por máquina adecuado para secuencias de comandos y auditorías. `inspect --all` representa una tabla de toda la flota con columnas de forma, tipos de capacidades, avisos de compatibilidad, capacidades del paquete y resumen de ganchos. `info` es un alias de `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de complementos, diagnósticos de manifiesto/descubrimiento, avisos de compatibilidad y referencias de configuración de complementos obsoletas, como slots de complementos faltantes. Cuando el árbol de instalación y la configuración del complemento están limpios, imprime `No plugin issues detected.` Si la configuración obsoleta persiste pero el árbol de instalación está sano por lo demás, el resumen lo indica en lugar de implicar una salud completa del complemento.

Si un complemento configurado está presente en el disco pero está bloqueado por las comprobaciones de seguridad de ruta del cargador, la validación de la configuración mantiene la entrada del complemento y la informa como `present but blocked`. Corrija el diagnóstico de complemento bloqueado precedente, como la propiedad de la ruta o los permisos de escritura universal, en lugar de eliminar la configuración `plugins.entries.<id>``plugins.allow` o %%PH:INLINE_CODE:261:b591d8c%%.

Para fallos de forma de módulo, como exportaciones `register`/`activate` faltantes, vuelva a ejecutar con `OPENCLAW_PLUGIN_LOAD_DEBUG=1` para incluir un resumen compacto de la forma de exportación en la salida de diagnóstico.

### Registro

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

El registro de complementos local es el modelo de lectura en frío persistente de OpenClaw para la identidad del complemento instalado, su habilitación, metadatos de origen y propiedad de la contribución. El inicio normal, la búsqueda del propietario del proveedor, la clasificación de configuración del canal y el inventario de complementos pueden leerlo sin importar módulos de tiempo de ejecución del complemento.

Use `plugins registry` para inspeccionar si el registro persistente está presente, actualizado o obsoleto. Use `--refresh` para reconstruirlo a partir del índice persistente de complementos, la política de configuración y los metadatos de manifiesto/paquete. Esta es una ruta de reparación, no una ruta de activación en tiempo de ejecución.

`openclaw doctor --fix` también repara la deriva administrada de npm adyacente al registro: si un paquete `@openclaw/*` huérfano o recuperado bajo la raíz npm administrada del complemento ensombrece un complemento agrupado, doctor elimina ese paquete obsoleto y reconstruye el registro para que el inicio valide contra el manifiesto agrupado. Doctor también vuelve a vincular el paquete anfitrión `openclaw` en los complementos npm administrados que declaran `peerDependencies.openclaw`, de modo que las importaciones de tiempo de ejecución locales del paquete como `openclaw/plugin-sdk/*` se resuelvan después de actualizaciones o reparaciones de npm.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` es un interruptor de compatibilidad de emergencia (break-glass) en desuso para fallos de lectura del registro. Se prefieren `plugins registry --refresh` o `openclaw doctor --fix`; la alternativa de entorno (env fallback) es solo para la recuperación de inicio de emergencia mientras se implementa la migración.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista de Marketplace acepta una ruta local de marketplace, una ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json` imprime la etiqueta de origen resuelta más el manifiesto de marketplace analizado y las entradas de complementos.

## Relacionado

- [Construcción de complementos](/es/plugins/building-plugins)
- [Referencia de CLI](/es/cli)
- [ClawHub](/es/clawhub)
