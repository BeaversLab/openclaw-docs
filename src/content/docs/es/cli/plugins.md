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

Para investigar instalaciones lentas, inspecciones, desinstalaciones o actualizaciones del registro, ejecute el
comando con `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`. El rastro escribe los tiempos de las fases
en stderr y mantiene la salida JSON analizable. Consulte [Depuración](/es/help/debugging#plugin-lifecycle-trace).

<Note>En modo Nix (`OPENCLAW_NIX_MODE=1`), los mutadores del ciclo de vida del complemento están deshabilitados. Use la fuente Nix para esta instalación en lugar de `plugins install`, `plugins update`, `plugins uninstall`, `plugins enable` o `plugins disable`; para nix-openclaw, use el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad de agente.</Note>

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
`defineToolPlugin`. `plugins build` importa esa entrada, lee sus metadatos de herramienta
estática, escribe `openclaw.plugin.json` y mantiene `package.json`
`openclaw.extensions` alineados. `plugins validate` verifica que el manifiesto
generado, los metadatos del paquete y la exportación de entrada actual todavía coincidan. Consulte
[Complementos de herramientas](/es/plugins/tool-plugins) para el flujo de trabajo completo de creación.

El andamiaje escribe código fuente TypeScript pero genera metadatos a partir de la entrada
`./dist/index.js` construida, por lo que el flujo de trabajo también funciona con la CLI publicada. Use
`--entry <path>` cuando la entrada no sea la entrada predeterminada del paquete. Use
`plugins build --check` en CI para fallar cuando los metadatos generados estén obsoletos sin
reescribir archivos.

### Instalar

```bash
openclaw plugins search "calendar"                   # search ClawHub plugins
openclaw plugins install <package>                      # source auto-detection
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

Los mantenedores que prueben instalaciones en el momento de la configuración pueden anular las fuentes de instalación
automáticas de complementos con variables de entorno protegidas. Consulte
[Anulaciones de instalación de complementos](/es/plugins/install-overrides).

<Warning>
Los nombres de paquetes simples se instalan desde npm por defecto durante el cambio de lanzamiento, a menos que coincidan con un id de complemento oficial. Las especificaciones de paquetes `@openclaw/*` sin procesar que coinciden con complementos empaquetados usan la copia empaquetada que se envió con la compilación actual de OpenClaw. Use `npm:<package>` cuando deliberadamente desee un paquete npm externo en su lugar. Use `clawhub:<package>` para ClawHub. Trate las instalaciones de complementos como ejecutar código. Prefiera versiones fijas.
</Warning>

`plugins search` consulta ClawHub para buscar paquetes de complementos instalables e imprime
nombres de paquetes listos para instalar. Busca paquetes de complemento de código y complemento de paquete,
no habilidades. Use `openclaw skills search` para habilidades de ClawHub.

<Note>
  ClawHub es la superficie principal de distribución y descubrimiento para la mayoría de los complementos. Npm sigue siendo una alternativa compatible y una ruta de instalación directa. Los paquetes de complementos `@openclaw/*` propiedad de OpenClaw se publican nuevamente en npm; consulte la lista actual en [npmjs.com/org/openclaw](https://www.npmjs.com/org/openclaw) o en el [inventario de
  complementos](/es/plugins/plugin-inventory). Las instalaciones estables usan `latest`. Las instalaciones y actualizaciones del canal Beta prefieren la dist-tag npm `beta` cuando esa etiqueta está disponible y luego recurren a `latest`.
</Note>

<AccordionGroup>
  <Accordion title="Config includes and invalid-config repair">
    Si su sección `plugins` está respaldada por un `$include` de un solo archivo, `plugins install/update/enable/disable/uninstall` escribirá directamente en ese archivo incluido y dejará `openclaw.json` sin modificar. Las inclusiones raíz, las matrices de inclusión y las inclusiones con anulaciones de hermanos fallan cerradas en lugar de aplanarse. Consulte [Config includes](/es/gateway/configuration) para ver las formas compatibles.

    Si la configuración no es válida durante la instalación, `plugins install` normalmente falla cerrada y le indica que ejecute `openclaw doctor --fix` primero. Durante el inicio y la recarga en caliente de Gateway, la configuración no válida del complemento falla cerrada como cualquier otra configuración no válida; `openclaw doctor --fix` puede poner en cuarentena la entrada del complemento no válida. La única excepción documentada en el momento de la instalación es una ruta de recuperación estrecha para complementos agrupados que optan explícitamente por `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force and reinstall vs update">
    `--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento o paquete de hook ya instalado en su lugar. Úselo cuando esté reinstalando intencionalmente el mismo id desde una nueva ruta local, archivo, paquete ClawHub o artefacto npm. Para actualizaciones de rutina de un complemento npm ya rastreado, prefiera `openclaw plugins update <id-or-npm-spec>`.

    Si ejecuta `plugins install` para un id de complemento que ya está instalado, OpenClaw se detiene y le señala `plugins update <id-or-npm-spec>` para una actualización normal, o `plugins install <package> --force` cuando realmente desea sobrescribir la instalación actual desde una fuente diferente.

  </Accordion>
  <Accordion title="--pin scope">
    `--pin` se aplica solo a instalaciones de npm. No es compatible con instalaciones `git:`; use una referencia git explícita como `git:github.com/acme/plugin@v1.2.3` cuando desee una fuente fija. No es compatible con `--marketplace`, porque las instalaciones del mercado persisten los metadatos de la fuente del mercado en lugar de una especificación npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` es una opción de emergencia para falsos positivos en el escáner de código peligroso integrado. Permite que la instalación continúe incluso cuando el escáner integrado reporta hallazgos `critical`, pero **no** evita los bloqueos de política de hook de plugin `before_install` y **no** evita los fallos de escaneo.

    Los escaneos de instalación ignoran los archivos y directorios de prueba comunes, como `tests/`, `__tests__/`, `*.test.*` y `*.spec.*`, para evitar bloquear simulacros de prueba empaquetados; los puntos de entrada de tiempo de ejecución del plugin declarados todavía se escanean incluso si usan uno de esos nombres.

    Esta bandera de CLI se aplica a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo un flujo de descarga/instalación de habilidades de ClawHub separado.

    Si un complemento que publicaste en ClawHub está oculto o bloqueado por un escaneo de registro, usa los pasos del editor en [Publicación en ClawHub](/es/clawhub/publishing). `--dangerously-force-unsafe-install` solo afecta las instalaciones en tu propia máquina; no le pide a ClawHub que vuelva a escanear el complemento ni que haga pública una versión bloqueada.

  </Accordion>
  <Accordion title="Hook packs y especificaciones npm">
    `plugins install` también es la superficie de instalación para hook packs que exponen `openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad filtrada de hooks y la habilitación por hook, no para la instalación de paquetes.

    Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o **dist-tag**). Las especificaciones de Git/URL/archivo y los rangos semver se rechazan. Las instalaciones de dependencias se ejecutan en un proyecto npm administrado por complemento con `--ignore-scripts` por seguridad, incluso cuando su shell tiene configuraciones globales de instalación de npm. Los proyectos npm de complementos administrados heredan el `overrides` npm a nivel de paquete de OpenClaw, por lo que los anclajes de seguridad del host también se aplican a las dependencias de complementos elevadas.

    Use `npm:<package>` cuando desee hacer explícita la resolución de npm. Las especificaciones de paquetes simples también se instalan directamente desde npm durante el transitorio de lanzamiento, a menos que coincidan con una identificación de complemento oficial.

    Las especificaciones de paquetes `@openclaw/*` sin procesar que coinciden con complementos agrupados se resuelven en la copia agrupada propiedad de la imagen antes de volver a npm. Por ejemplo, `openclaw plugins install @openclaw/discord@2026.5.20 --pin` usa el complemento de Discord agrupado de la compilación actual de OpenClaw en lugar de crear una invalidación administrada de npm. Para forzar el paquete npm externo, use `openclaw plugins install npm:@openclaw/discord@2026.5.20 --pin`.

    Las especificaciones simples y `@latest` se mantienen en la pista estable. Las versiones de corrección con marca de fecha de OpenClaw, como `2026.5.3-1`, son versiones estables para esta verificación. Si npm resuelve cualquiera de estas a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una etiqueta de versión preliminar, como `@beta`/`@rc` o una versión preliminar exacta, como `@1.2.3-beta.4`.

    Para las instalaciones de npm sin una versión exacta (`npm:<package>` o `npm:<package>@latest`), OpenClaw verifica los metadatos del paquete resuelto antes de la instalación. Si el paquete estable más reciente requiere una API de complemento de OpenClaw más nueva o una versión mínima de host, OpenClaw inspecciona las versiones estables anteriores e instala la versión compatible más reciente en su lugar. Las versiones exactas y las dist-tags explícitas, como `@beta`, permanecen estrictas: si el paquete seleccionado es incompatible, el comando falla y le pide que actualice OpenClaw o elija una versión compatible.

    Si una especificación de instalación simple coincide con una identificación de complemento oficial (por ejemplo, `diffs`), OpenClaw instala la entrada del catálogo directamente. Para instalar un paquete npm con el mismo nombre, use una especificación con ámbito explícito (por ejemplo, `@scope/diffs`).

  </Accordion>
  <Accordion title="Repositorios Git">
    Use `git:<repo>` para instalar directamente desde un repositorio git. Las formas admitidas incluyen `git:github.com/owner/repo`, `git:owner/repo`, `https://` completo, `ssh://`, `git://`, `file://` y `git@host:owner/repo.git` URLs de clonación. Agregue `@<ref>` o `#<ref>` para verificar una rama, etiqueta o commit antes de la instalación.

    Las instalaciones de Git clonan en un directorio temporal, verifican la referencia solicitada cuando está presente y luego usan el instalador normal del directorio de plugins. Eso significa que la validación del manifiesto, el escaneo de código peligroso, el trabajo de instalación del administrador de paquetes y los registros de instalación se comportan como las instalaciones de npm. Las instalaciones de git registradas incluyen la URL/ref de origen más el commit resuelto para que `openclaw plugins update` pueda resolver el origen nuevamente más tarde.

    Después de instalar desde git, use `openclaw plugins inspect <id> --runtime --json` para verificar los registros en tiempo de ejecución, como los métodos de gateway y los comandos de CLI. Si el complemento registró una raíz de CLI con `api.registerCli`, ejecute ese comando directamente a través de la CLI raíz de OpenClaw, por ejemplo `openclaw demo-plugin ping`.

  </Accordion>
  <Accordion title="Archivos">
    Archivos admitidos: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Los archivos de complementos nativos de OpenClaw deben contener un `openclaw.plugin.json` válido en la raíz del complemento extraído; los archivos que solo contienen `package.json` se rechazan antes de que OpenClaw escriba los registros de instalación.

    Use `npm-pack:<path.tgz>` cuando el archivo es un tarball de npm-pack y desea
    probar la misma ruta de proyecto npm administrada por complemento utilizada por las instalaciones
    de registro, incluyendo `package-lock.json` verificación, escaneo de dependencias
    elevadas y registros de instalación de npm. Las rutas de archivo plano todavía se instalan como archivos
    locales bajo la raíz de extensiones del complemento.

    Las instalaciones del mercado de Claude también son compatibles.

  </Accordion>
</AccordionGroup>

Las instalaciones de ClawHub usan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

Las especificaciones de plugin npm-seguras desnudas se instalan desde npm por defecto durante el corte de lanzamiento a menos que coincidan con un id de plugin oficial:

```bash
openclaw plugins install openclaw-codex-app-server
```

Use `npm:` para hacer explícita la resolución solo de npm:

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@openclaw/discord@2026.5.20
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw verifica la API del plugin anunciada / la compatibilidad mínima de la pasarela antes de la instalación. Cuando la versión seleccionada de ClawHub publica un artefacto ClawPack, OpenClaw descarga el paquete npm versionado `.tgz`, verifica el encabezado de resumen de ClawHub y el resumen del artefacto, y luego lo instala a través de la ruta de archivo normal. Las versiones anteriores de ClawHub sin metadatos ClawPack aún se instalan a través de la ruta de verificación de archivo de paquete heredada. Las instalaciones registradas mantienen sus metadatos de origen ClawHub, tipo de artefacto, integridad npm, shasum npm, nombre del tarball y datos de resumen ClawPack para actualizaciones posteriores.
Las instalaciones de ClawHub sin versión mantienen una especificación registrada sin versión para que `openclaw plugins update` pueda seguir los lanzamientos más nuevos de ClawHub; los selectores explícitos de versión o etiqueta como `clawhub:pkg@1.2.3` y `clawhub:pkg@beta` permanecen fijos a ese selector.

#### Abreviatura del Marketplace

Use el atajo `plugin@marketplace` cuando el nombre del mercado exista en la caché del registro local de Claude en `~/.claude/plugins/known_marketplaces.json`:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

Use `--marketplace` cuando quiera pasar la fuente del mercado explícitamente:

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

<Tabs>
  <Tab title="Fuentes del mercado">
    - un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json`
    - una ruta raíz de mercado local o `marketplace.json`
    - un atajo de repositorio de GitHub como `owner/repo`
    - una URL de repositorio de GitHub como `https://github.com/owner/repo`
    - una URL de git

  </Tab>
  <Tab title="Reglas para marketplaces remotos">
    Para los marketplaces remotos cargados desde GitHub o git, las entradas de plugins deben permanecer dentro del repositorio del marketplace clonado. OpenClaw acepta fuentes de ruta relativa de ese repositorio y rechaza fuentes de plugins HTTP(S), de ruta absoluta, git, GitHub y otras fuentes que no sean rutas de manifiestos remotos.
  </Tab>
</Tabs>

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- plugins nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño predeterminado de componentes de Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Los paquetes compatibles se instalan en la raíz de plugins normal y participan en el mismo flujo de lista/info/activar/desactivar. Hoy en día, se admiten las habilidades de paquete, command-skills de Claude, valores predeterminados de Claude `settings.json``.lsp.json` / valores predeterminados declarados en el manifiesto `lspServers`, command-skills de Cursor y directorios de hook de Codex
  compatibles; otras capacidades de paquete detectadas se muestran en diagnósticos/información, pero aún no están conectadas a la ejecución en tiempo de ejecución.
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
`plugins list` lee primero el registro local persistido de plugins, con un respaldo derivado solo del manifiesto cuando el registro falta o no es válido. Es útil para verificar si un plugin está instalado, activado y visible para la planificación de inicio en frío, pero no es una sonda en tiempo de ejecución en vivo de un proceso Gateway que ya se está ejecutando. Después de cambiar el código del plugin, la activación, la política de hook o `plugins.load.paths`, reinicie el Gateway que sirve el canal antes de esperar que se ejecute el nuevo código o hooks `register(api)`. Para implementaciones remotas/en contenedores, verifique que está reiniciando el hijo `openclaw gateway run` real, no solo un proceso contenedor.

`plugins list --json` incluye el `dependencyStatus` de cada plugin de `package.json`
`dependencies` y `optionalDependencies`. OpenClaw verifica si esos nombres de
paquete están presentes a lo largo de la ruta de búsqueda normal de Node `node_modules` del plugin; no
importa el código de tiempo de ejecución del plugin, ejecuta un administrador de paquetes ni repara dependencias
faltantes.

</Note>

`plugins search` es una búsqueda remota del catálogo ClawHub. No inspecciona el estado
local, muta la configuración, instala paquetes ni carga el código de tiempo de ejecución del plugin. Los resultados
de la búsqueda incluyen el nombre del paquete ClawHub, familia, canal, versión, resumen y
una sugerencia de instalación como `openclaw plugins install clawhub:<package>`.

Para trabajar con complementos agrupados dentro de una imagen Docker empaquetada, monte el directorio de fuentes del complemento sobre la ruta de fuente empaquetada coincidente, como `/app/extensions/synology-chat`. OpenClaw descubrirá esa superposición de fuente montada antes que `/app/dist/extensions/synology-chat`; un directorio de fuente copiado de forma simple permanece inactivo, por lo que las instalaciones empaquetadas normales aún usan la distribución compilada.

Para la depuración de enlaces en tiempo de ejecución:

- `openclaw plugins inspect <id> --runtime --json` muestra los hooks registrados y los diagnósticos de un pase de inspección cargado por módulo. La inspección en tiempo de ejecución nunca instala dependencias; use `openclaw doctor --fix` para limpiar el estado de dependencias heredado o recuperar complementos descargables faltantes a los que se hace referencia en la configuración.
- `openclaw gateway status --deep --require-rpc` confirma la URL/perfil accesible del Gateway, las pistas de servicio/proceso, la ruta de configuración y el estado de RPC.
- Los hooks de conversación no agrupados (`llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize`, `agent_end`) requieren `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

Los archivos de complemento independientes deben listarse en `plugins.load.paths` en lugar de colocarse directamente en `~/.openclaw/extensions` o `<workspace>/.openclaw/extensions`. Esas raíces de autodescubrimiento cargan directorios de paquetes o paquetes de complementos, mientras que los archivos de script de nivel superior se tratan como ayudantes locales y se omiten.

<Note>
Los complementos de origen del espacio de trabajo descubiertos desde una raíz de extensiones del espacio de trabajo no se
importan ni ejecutan hasta que se habilitan explícitamente. Para el desarrollo local,
ejecute `openclaw plugins enable <plugin-id>` o configure
`plugins.entries.<plugin-id>.enabled: true`; si su configuración usa
`plugins.allow`, incluya también el mismo id de complemento allí. Esta regla de fallo cerrado
se aplica también cuando la configuración del canal apunta explícitamente a un complemento de origen del espacio de trabajo para
la carga solo de configuración, por lo que el código de configuración del complemento del canal local no se ejecutará mientras ese
complemento del espacio de trabajo permanezca deshabilitado o excluido de la lista de permitidos. Las instalaciones vinculadas
y las entradas explícitas `plugins.load.paths` siguen la política normal para su
origen de complemento resuelto. Consulte
[Configurar la política de complementos](/es/tools/plugin#configure-plugin-policy)
y [Referencia de configuración](/es/gateway/configuration-reference#plugins).

`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la ruta de origen en lugar de copiar sobre un objetivo de instalación administrado.

Use `--pin` en instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en el índice de complementos administrados mientras mantiene el comportamiento predeterminado sin anclar.

</Note>

### Índice de complementos

Los metadatos de instalación del complemento son un estado administrado por la máquina, no una configuración de usuario. Las instalaciones y actualizaciones los escriben en la base de datos de estado SQLite compartida bajo el directorio de estado activo de OpenClaw. La fila `installed_plugin_index` almacena metadatos `installRecords` duraderos, incluidos los registros de manifiestos de complementos rotos o faltantes, además de un caché de registro en frío derivado del manifiesto que utilizan `openclaw plugins update`, desinstalación, diagnósticos y el registro de complementos en frío.

Cuando OpenClaw ve registros heredados enviados `plugins.installs` en la configuración, las lecturas en tiempo de ejecución los tratan como entrada de compatibilidad sin reescribir `openclaw.json`. Las escrituras explícitas de complementos y `openclaw doctor --fix` mueven esos registros al índice de complementos y eliminan la clave de configuración cuando se permiten las escrituras de configuración; si alguna escritura falla, se mantienen los registros de configuración para que no se pierdan los metadatos de instalación.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, el índice de complementos persistido, las entradas de la lista de permitidos/denegados de complementos y las entradas vinculadas de `plugins.load.paths` cuando sea aplicable. A menos que se establezca `--keep-files`, la desinstalación también elimina el directorio de instalación administrada rastreado cuando está dentro de la raíz de extensiones de complementos de OpenClaw. Para los complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

<Note>`--keep-config` es compatible como un alias obsoleto para `--keep-files`.</Note>

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones de complementos rastreadas en el índice de complementos administrados y a las instalaciones de paquetes de enganches rastreadas en `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Resolución de id de complemento frente a especificación npm">
    Cuando pasa un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Eso significa que las dist-tags almacenadas previamente, como `@beta` y las versiones fijas exactas, siguen usándose en ejecuciones posteriores de `update <id>`.

    Para las instalaciones de npm, también puede pasar una especificación explícita de paquete npm con una dist-tag o una versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación npm para futuras actualizaciones basadas en id.

    Pasar el nombre del paquete npm sin una versión o etiqueta también se resuelve de vuelta al registro del complemento rastreado. Use esto cuando un complemento se fijó a una versión exacta y desea volver a la línea de lanzamiento predeterminada del registro.

  </Accordion>
  <Accordion title="Actualizaciones del canal beta">
    `openclaw plugins update` reutiliza la especificación del complemento rastreado a menos que pase una nueva especificación. `openclaw update` también conoce el canal de actualización activo de OpenClaw: en el canal beta, los registros de complementos npm de línea predeterminada y ClawHub intentan `@beta` primero. Recurren a la especificación predeterminada/más reciente registrada si no existe una versión beta del complemento; los complementos npm también recurren cuando el paquete beta existe pero falla la validación de la instalación. Esa recuperación se informa como una advertencia y no hace que falle la actualización principal. Las versiones exactas y las etiquetas explícitas siguen fijas a ese selector.

  </Accordion>
  <Accordion title="Comprobaciones de versión y desviación de integridad">
    Antes de una actualización en vivo de npm, OpenClaw verifica la versión del paquete instalado frente a los metadatos del registro de npm. Si la versión instalada y la identidad del artefacto registrado ya coinciden con el objetivo resuelto, la actualización se omite sin descargar, reinstalar ni reescribir `openclaw.json`.

    Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia, OpenClaw lo trata como una desviación del artefacto npm. El comando interactivo `openclaw plugins update` imprime los hashes esperados y reales y solicita confirmación antes de continuar. Los asistentes de actualización no interactivos fallan de forma segura (fail closed) a menos que la persona que llama proporcione una política de continuación explícita.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install en la actualización">
    `--dangerously-force-unsafe-install` también está disponible en `plugins update` como una opción de emergencia (break-glass) para los falsos positivos del escaneo de código peligroso integrado durante las actualizaciones de complementos. Aún así, no evita los bloqueos de política de complemento `before_install` ni el bloqueo por fallo de escaneo, y solo se aplica a actualizaciones de complementos, no a actualizaciones de paquetes de gancho (hook-packs).
  </Accordion>
</AccordionGroup>

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --runtime
openclaw plugins inspect <id> --json
```

Inspect muestra la identidad, el estado de carga, la fuente, las capacidades del manifiesto, las marcas de política, el diagnóstico, los metadatos de instalación, las capacidades del paquete y cualquier compatibilidad detectada con el servidor MCP o LSP sin importar el tiempo de ejecución del complemento de forma predeterminada. Agregue `--runtime` para cargar el módulo del complemento e incluir los ganchos, herramientas, comandos, servicios, métodos de puerta de enlace y rutas HTTP registrados. La inspección del tiempo de ejecución informa directamente sobre las dependencias faltantes del complemento; las instalaciones y reparaciones permanecen en `openclaw plugins install`, `openclaw plugins update` y `openclaw doctor --fix`.

Los comandos de la CLI propiedad de los complementos generalmente se instalan como grupos de comandos raíz `openclaw`, pero los complementos también pueden registrar comandos anidados bajo un elemento principal central como `openclaw nodes`. Después de que `inspect --runtime` muestre un comando bajo `cliCommands`, ejecútelo en la ruta listada; por ejemplo, un complemento que registre `demo-git` se puede verificar con `openclaw demo-git ping`.

Cada plugin se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un plugin solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo hooks, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Plugin shapes](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

<Note>El indicador `--json` genera un informe legible por máquina adecuado para secuencias de comandos y auditorías. `inspect --all` presenta una tabla de toda la flota con columnas de forma, tipos de capacidades, avisos de compatibilidad, capacidades de paquete y resumen de enlaces. `info` es un alias para `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de complementos, diagnósticos de manifiesto/detección, avisos de compatibilidad y referencias de configuración de complementos obsoletas, como slots de complementos faltantes. Cuando el árbol de instalación y la configuración del complemento están limpios, imprime `No plugin issues detected.` Si la configuración obsoleta persiste pero el árbol de instalación está sano por lo demás, el resumen lo indica en lugar de implicar una salud completa del complemento.

Si un complemento configurado está presente en el disco pero está bloqueado por las comprobaciones de seguridad de ruta del cargador, la validación de la configuración mantiene la entrada del complemento y la informa como `present but blocked`. Solucione el diagnóstico previo de complemento bloqueado, como la propiedad de la ruta o los permisos de escritura mundial, en lugar de eliminar la configuración `plugins.entries.<id>``plugins.allow` o %%PH:INLINE_CODE:275:b591d8c%%.

Para fallos de forma de módulo, como exportaciones `register`/`activate` faltantes, vuelva a ejecutar con `OPENCLAW_PLUGIN_LOAD_DEBUG=1` para incluir un resumen compacto de la forma de exportación en la salida de diagnóstico.

### Registro

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

El registro local de complementos es el modelo de lectura en frío persistente de OpenClaw para la identidad del complemento instalado, su habilitación, metadatos de origen y propiedad de la contribución. El inicio normal, la búsqueda del propietario del proveedor, la clasificación de configuración del canal y el inventario de complementos pueden leerlo sin importar módulos de tiempo de ejecución del complemento.

Use `plugins registry` para inspeccionar si el registro persistente está presente, actualizado u obsoleto. Use `--refresh` para reconstruirlo a partir del índice de complementos persistente, la política de configuración y los metadatos de manifiesto/paquete. Esta es una ruta de reparación, no una ruta de activación en tiempo de ejecución.

`openclaw doctor --fix` también repara la deriva administrada de npm adyacente al registro: si un paquete `@openclaw/*` huérfano o recuperado bajo un proyecto npm de complemento administrado o la raíz administrada plana heredada ensombrece un complemento empaquetado, doctor elimina ese paquete obsoleto y reconstruye el registro para que el inicio se valide contra el manifiesto empaquetado. Doctor también vuelve a vincular el paquete host `openclaw` en los complementos npm administrados que declaran `peerDependencies.openclaw`, por lo que las importaciones de tiempo de ejecución locales del paquete como `openclaw/plugin-sdk/*` se resuelven después de las actualizaciones o reparaciones de npm.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` es un interruptor de compatibilidad de emergencia en caso de fallos de lectura del registro. Prefiera `plugins registry --refresh` o `openclaw doctor --fix`; la alternativa de variables de entorno es solo para la recuperación de emergencia durante el inicio mientras se despliega la migración.</Warning>

### Mercado

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista del mercado acepta una ruta de mercado local, una ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json` imprime la etiqueta de fuente resuelta más el manifiesto del mercado analizado y las entradas de complementos.

## Relacionado

- [Construcción de complementos](/es/plugins/building-plugins)
- [Referencia de la CLI](/es/cli)
- [ClawHub](/es/clawhub)
