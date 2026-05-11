---
summary: "Referencia de la CLI para `openclaw plugins` (list, install, marketplace, uninstall, enable/disable, doctor)"
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
  <Card title="Paquetes de complementos" href="/es/plugins/bundles">
    Modelo de compatibilidad de paquetes.
  </Card>
  <Card title="Manifiesto del complemento" href="/es/plugins/manifest">
    Campos del manifiesto y esquema de configuración.
  </Card>
  <Card title="Seguridad" href="/es/gateway/security">
    Endurecimiento de seguridad para instalaciones de complementos.
  </Card>
</CardGroup>

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
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

<Note>
Los complementos incluidos se distribuyen con OpenClaw. Algunos están habilitados de forma predeterminada (por ejemplo, proveedores de modelos incluidos, proveedores de voz incluidos y el complemento de navegador incluido); otros requieren `plugins enable`.

Los complementos nativos de OpenClaw deben distribuir `openclaw.plugin.json` con un esquema JSON en línea (`configSchema`, incluso si está vacío). Los paquetes compatibles utilizan sus propios manifiestos de paquete en su lugar.

`plugins list` muestra `Format: openclaw` o `Format: bundle`. La salida de lista/información detallada también muestra el subtipo de paquete (`codex`, `claude` o `cursor`) además de las capacidades de paquete detectadas.

</Note>

### Instalar

```bash
openclaw plugins install <package>                      # ClawHub first, then npm
openclaw plugins install clawhub:<package>              # ClawHub only
openclaw plugins install npm:<package>                  # npm only
openclaw plugins install <package> --force              # overwrite existing install
openclaw plugins install <package> --pin                # pin version
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # local path
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace (explicit)
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

<Warning>Los nombres de paquetes simples se verifican primero en ClawHub y luego en npm. Trate las instalaciones de complementos como ejecutar código. Prefiera versiones fijas.</Warning>

<AccordionGroup>
  <Accordion title="Inclusiones de configuración y recuperación de configuración no válida">
    Si su sección `plugins` está respaldada por un archivo único `$include`, `plugins install/update/enable/disable/uninstall` se escribirá directamente en ese archivo incluido y dejará `openclaw.json` sin modificar. Las inclusiones raíz, las matrices de inclusión y las inclusiones con anulaciones hermanas fallan cerradas en lugar de aplanarse. Consulte [Config includes](/es/gateway/configuration) para conocer las formas admitidas.

    Si la configuración no es válida durante la instalación, `plugins install` normalmente falla cerrada y le indica que ejecute `openclaw doctor --fix` primero. Durante el inicio de Gateway, la configuración no válida de un complemento se aísla en ese complemento para que otros canales y complementos puedan seguir ejecutándose; `openclaw doctor --fix` puede poner en cuarentena la entrada del complemento no válida. La única excepción documentada en el momento de la instalación es una ruta de recuperación estrecha para complementos agrupados que explícitamente optan por `openclaw.install.allowInvalidConfigRecovery`.

  </Accordion>
  <Accordion title="--force y reinstalación frente a actualización">
    `--force` reutiliza el objetivo de instalación existente y sobrescribe un complemento o paquete de enganches ya instalado en su lugar. Úselo cuando esté reinstalando intencionalmente el mismo id desde una nueva ruta local, archivo, paquete ClawHub o artefacto npm. Para actualizaciones de rutina de un complemento npm ya rastreado, prefiera `openclaw plugins update <id-or-npm-spec>`.

    Si ejecuta `plugins install` para un id de complemento que ya está instalado, OpenClaw se detiene y le dirige a `plugins update <id-or-npm-spec>` para una actualización normal, o a `plugins install <package> --force` cuando realmente desea sobrescribir la instalación actual desde una fuente diferente.

  </Accordion>
  <Accordion title="alcance de --pin">
    `--pin` se aplica solo a las instalaciones de npm. No es compatible con `--marketplace`, porque las instalaciones del marketplace persisten los metadatos de origen del marketplace en lugar de una especificación npm.
  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install">
    `--dangerously-force-unsafe-install` es una opción de emergencia para falsos positivos en el escáner de código peligroso integrado. Permite que la instalación continúe incluso cuando el escáner integrado reporta hallazgos `critical`, pero **no** evita los bloqueos de política de hook `before_install` del complemento y **no** evita los fallos de escaneo.

    Este indicador de la CLI se aplica a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo un flujo de descarga/instalación de habilidades de ClawHub separado.

  </Accordion>
  <Accordion title="Hook packs y especificaciones de npm">
    `plugins install` también es la superficie de instalación para hook packs que exponen `openclaw.hooks` en `package.json`. Use `openclaw hooks` para la visibilidad filtrada de hooks y la habilitación por hook, no para la instalación de paquetes.

    Las especificaciones de npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o **dist-tag**). Las especificaciones de Git/URL/archivo y los rangos de semver se rechazan. Las instalaciones de dependencias se ejecutan localmente en el proyecto con `--ignore-scripts` por seguridad, incluso cuando su shell tiene configuraciones de instalación global de npm.

    Use `npm:<package>` cuando desee omitir la búsqueda en ClawHub e instalar directamente desde npm. Las especificaciones de paquetes simples aún prefieren ClawHub y solo recurren a npm cuando ClawHub no tiene ese paquete o versión.

    Las especificaciones simples y `@latest` se mantienen en la pista estable. Si npm resuelve cualquiera de ellos a una versión preliminar, OpenClaw se detiene y le pide que acepte explícitamente con una etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta como `@1.2.3-beta.4`.

    Si una especificación de instalación simple coincide con un id de complemento incluido (por ejemplo `diffs`), OpenClaw instala el complemento incluido directamente. Para instalar un paquete npm con el mismo nombre, use una especificación con ámbito explícito (por ejemplo `@scope/diffs`).

  </Accordion>
  <Accordion title="Archivos">
    Archivos compatibles: `.zip`, `.tgz`, `.tar.gz`, `.tar`. Los archivos de complementos nativos de OpenClaw deben contener un `openclaw.plugin.json` válido en la raíz del complemento extraído; los archivos que solo contienen `package.json` se rechazan antes de que OpenClaw escriba los registros de instalación.

    Las instalaciones del mercado de Claude también son compatibles.

  </Accordion>
</AccordionGroup>

Las instalaciones de ClawHub utilizan un localizador `clawhub:<package>` explícito:

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw ahora también prefiere ClawHub para las especificaciones de complementos compatibles con npm simples. Solo recurre a npm si ClawHub no tiene ese paquete o versión:

```bash
openclaw plugins install openclaw-codex-app-server
```

Use `npm:` para forzar la resolución solo de npm, por ejemplo, cuando ClawHub es inalcanzable o sabe que el paquete solo existe en npm:

```bash
openclaw plugins install npm:openclaw-codex-app-server
openclaw plugins install npm:@scope/plugin-name@1.0.1
```

OpenClaw descarga el archivo del paquete desde ClawHub, verifica la API del complemento anunciada / la compatibilidad mínima con la puerta de enlace y luego lo instala a través de la ruta de archivo normal. Las instalaciones registradas mantienen sus metadatos de origen de ClawHub para actualizaciones posteriores.
Las instalaciones de ClawHub sin versión mantienen una especificación registrada sin versión para que `openclaw plugins update` pueda seguir los lanzamientos más nuevos de ClawHub; los selectores explícitos de versión o etiqueta, como `clawhub:pkg@1.2.3` y `clawhub:pkg@beta`, permanecen fijos a ese selector.

#### Abreviatura del mercado

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
  <Tab title="Fuentes del mercado">- un nombre de mercado conocido por Claude de `~/.claude/plugins/known_marketplaces.json` - una ruta raíz de mercado local o `marketplace.json` - una abreviatura de repositorio de GitHub como `owner/repo` - una URL de repositorio de GitHub como `https://github.com/owner/repo` - una URL de git</Tab>
  <Tab title="Reglas del mercado remoto">Para los mercados remotos cargados desde GitHub o git, las entradas de los complementos deben permanecer dentro del repositorio del mercado clonado. OpenClaw acepta fuentes de ruta relativa de ese repositorio y rechaza HTTP(S), rutas absolutas, git, GitHub y otras fuentes de complementos que no sean rutas de los manifiestos remotos.</Tab>
</Tabs>

Para rutas locales y archivos, OpenClaw detecta automáticamente:

- complementos nativos de OpenClaw (`openclaw.plugin.json`)
- paquetes compatibles con Codex (`.codex-plugin/plugin.json`)
- paquetes compatibles con Claude (`.claude-plugin/plugin.json` o el diseño predeterminado del componente Claude)
- paquetes compatibles con Cursor (`.cursor-plugin/plugin.json`)

<Note>
  Los paquetes compatibles se instalan en la raíz de complementos normal y participan en el mismo flujo de lista/información/activación/desactivación. Hoy, se admiten las habilidades de paquetes, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, valores predeterminados de Claude `.lsp.json` / declarados en el manifiesto `lspServers`, habilidades de comandos de
  Cursor y directorios de enlace compatibles con Codex; otras capacidades de paquete detectadas se muestran en el diagnóstico/información pero aún no están conectadas a la ejecución en tiempo de ejecución.
</Note>

### Lista

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

<ParamField path="--enabled" type="boolean">
  Mostrar solo los complementos habilitados.
</ParamField>
<ParamField path="--verbose" type="boolean">
  Cambiar de la vista de tabla a líneas de detalle por complemento con metadatos de fuente/origen/versión/activación.
</ParamField>
<ParamField path="--json" type="boolean">
  Inventario legible por máquina más diagnósticos del registro.
</ParamField>

<Note>
  `plugins list` lee primero el registro local de plugins persistido, con un respaldo derivado solo de manifiesto cuando el registro falta o no es válido. Es útil para verificar si un plugin está instalado, habilitado y visible para la planificación de inicio en frío, pero no es una sonda de tiempo de ejecución en vivo de un proceso Gateway que ya se está ejecutando. Después de cambiar el código
  del plugin, la habilitación, la política de hook o `plugins.load.paths`, reinicie el Gateway que sirve al canal antes de esperar que se ejecute el nuevo código o hooks `register(api)`. Para implementaciones remotas/en contenedores, verifique que está reiniciando el proceso hijo `openclaw gateway run` real, no solo un proceso contenedor.
</Note>

Para el trabajo de plugins agrupados dentro de una imagen Docker empaquetada, monte el directorio de origen del plugin sobre la ruta de origen empaquetada correspondiente, como `/app/extensions/synology-chat`. OpenClaw descubrirá esa superposición de origen montada antes que `/app/dist/extensions/synology-chat`; un directorio de origen copiado permanece inerte, por lo que las instalaciones empaquetadas normales aún usan el dist compilado.

Para la depuración de hooks en tiempo de ejecución:

- `openclaw plugins inspect <id> --json` muestra los hooks registrados y los diagnósticos de un pase de inspección de módulos cargados.
- `openclaw gateway status --deep --require-rpc` confirma el Gateway alcanzable, las sugerencias de servicio/proceso, la ruta de configuración y el estado de RPC.
- Los hooks de conversación no agrupados (`llm_input`, `llm_output`, `before_agent_finalize`, `agent_end`) requieren `plugins.entries.<id>.hooks.allowConversationAccess=true`.

Use `--link` para evitar copiar un directorio local (agrega a `plugins.load.paths`):

```bash
openclaw plugins install -l ./my-plugin
```

<Note>
`--force` no es compatible con `--link` porque las instalaciones vinculadas reutilizan la ruta de origen en lugar de copiarla sobre un objetivo de instalación administrada.

Use `--pin` en las instalaciones de npm para guardar la especificación exacta resuelta (`name@version`) en el índice de plugins administrado manteniendo el comportamiento predeterminado sin anclar.

</Note>

### Índice de plugins

Los metadatos de instalación del complemento son un estado gestionado por la máquina, no una configuración de usuario. Las instalaciones y actualizaciones lo escriben en `plugins/installs.json` bajo el directorio de estado activo de OpenClaw. Su mapa `installRecords` de nivel superior es la fuente duradera de los metadatos de instalación, incluidos los registros de manifiestos de complementos rotos o faltantes. La matriz `plugins` es el caché del registro frío derivado del manifiesto. El archivo incluye una advertencia de no editar y es utilizado por `openclaw plugins update`, desinstalación, diagnósticos y el registro frío de complementos.

Cuando OpenClaw ve registros heredados enviados de `plugins.installs` en la configuración, los mueve al índice de complementos y elimina la clave de configuración; si alguna escritura falla, los registros de configuración se mantienen para que no se pierdan los metadatos de instalación.

### Desinstalar

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` elimina los registros de complementos de `plugins.entries`, el índice de complementos persistido, las entradas de la lista de permitidos/denegados de complementos y las entradas de `plugins.load.paths` vinculadas cuando corresponda. A menos que se establezca `--keep-files`, la desinstalación también elimina el directorio de instalación administrada rastreado cuando está dentro de la raíz de extensiones de complementos de OpenClaw. Para complementos de memoria activos, la ranura de memoria se restablece a `memory-core`.

<Note>`--keep-config` es compatible como un alias en desuso para `--keep-files`.</Note>

### Actualizar

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

Las actualizaciones se aplican a las instalaciones de complementos rastreadas en el índice de complementos administrado y a las instalaciones de paquetes de enlace (hook-pack) rastreadas en `hooks.internal.installs`.

<AccordionGroup>
  <Accordion title="Resolución de id de complemento vs especificación npm">
    Cuando pasa un id de complemento, OpenClaw reutiliza la especificación de instalación registrada para ese complemento. Eso significa que las dist-tags previamente almacenadas, como `@beta` y las versiones fijas exactas, siguen utilizándose en ejecuciones posteriores de `update <id>`.

    Para instalaciones npm, también puede pasar una especificación explícita de paquete npm con una dist-tag o versión exacta. OpenClaw resuelve ese nombre de paquete de vuelta al registro del complemento rastreado, actualiza ese complemento instalado y registra la nueva especificación npm para futuras actualizaciones basadas en id.

    Pasar el nombre del paquete npm sin versión o etiqueta también se resuelve de nuevo al registro del complemento rastreado. Use esto cuando un complemento estaba fijado a una versión exacta y desea volver a la línea de lanzamiento predeterminada del registro.

  </Accordion>
  <Accordion title="Verificaciones de versión y desviación de integridad">
    Antes de una actualización npm en vivo, OpenClaw verifica la versión del paquete instalado contra los metadatos del registro npm. Si la versión instalada y la identidad del artefacto registrado ya coinciden con el objetivo resuelto, la actualización se omite sin descargar, reinstalar o reescribir `openclaw.json`.

    Cuando existe un hash de integridad almacenado y el hash del artefacto obtenido cambia, OpenClaw trata eso como una desviación de artefacto npm. El comando interactivo `openclaw plugins update` imprime los hashes esperados y reales y solicita confirmación antes de continuar. Los asistentes de actualización no interactivos fallan de forma cerrada a menos que la persona que llama proporcione una política de continuación explícita.

  </Accordion>
  <Accordion title="--dangerously-force-unsafe-install al actualizar">
    `--dangerously-force-unsafe-install` también está disponible en `plugins update` como una anulación de emergencia para falsos positivos del escaneo de código peligroso integrado durante las actualizaciones de complementos. Aún así no omite los bloqueos de política de `before_install` del complemento ni el bloqueo por fallas de escaneo, y solo se aplica a actualizaciones de complementos, no a actualizaciones de hook-pack.
  </Accordion>
</AccordionGroup>

### Inspeccionar

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

Introspección profunda de un solo complemento. Muestra la identidad, el estado de carga, la fuente, las capacidades registradas, los ganchos, las herramientas, los comandos, los servicios, los métodos de la puerta de enlace, las rutas HTTP, las banderas de política, los diagnósticos, los metadatos de instalación, las capacidades del paquete y cualquier soporte detectado para servidores MCP o LSP.

Cada complemento se clasifica por lo que realmente registra en tiempo de ejecución:

- **plain-capability** — un tipo de capacidad (p. ej., un complemento solo de proveedor)
- **hybrid-capability** — múltiples tipos de capacidades (p. ej., texto + voz + imágenes)
- **hook-only** — solo ganchos, sin capacidades ni superficies
- **non-capability** — herramientas/comandos/servicios pero sin capacidades

Consulte [Plugin shapes](/es/plugins/architecture#plugin-shapes) para obtener más información sobre el modelo de capacidades.

<Note>La bandera `--json` genera un informe legible por máquina adecuado para secuencias de comandos y auditorías. `inspect --all` representa una tabla de toda la flota con columnas de forma, tipos de capacidades, avisos de compatibilidad, capacidades del paquete y resumen de ganchos. `info` es un alias de `inspect`.</Note>

### Doctor

```bash
openclaw plugins doctor
```

`doctor` informa errores de carga de complementos, diagnósticos de manifiesto/descubrimiento y avisos de compatibilidad. Cuando todo está limpio, imprime `No plugin issues detected.`

Para fallos de forma de módulo, como exportaciones `register`/`activate` faltantes, vuelva a ejecutar con `OPENCLAW_PLUGIN_LOAD_DEBUG=1` para incluir un resumen compacto de la forma de exportación en la salida de diagnóstico.

### Registro

```bash
openclaw plugins registry
openclaw plugins registry --refresh
openclaw plugins registry --json
```

El registro de complementos locales es el modelo de lectura en frío persistente de OpenClaw para la identidad del complemento instalado, la habilitación, los metadatos de origen y la propiedad de la contribución. El inicio normal, la búsqueda del propietario del proveedor, la clasificación de configuración del canal y el inventario de complementos pueden leerlo sin importar módulos de tiempo de ejecución del complemento.

Use `plugins registry` para inspeccionar si el registro persistente está presente, actualizado o obsoleto. Use `--refresh` para reconstruirlo a partir del índice de complementos persistente, la política de configuración y los metadatos de manifiesto/paquete. Esta es una ruta de reparación, no una ruta de activación en tiempo de ejecución.

<Warning>`OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1` es un conmutador de compatibilidad de emergencia (break-glass) en desuso para fallos de lectura del registro. Se prefiere `plugins registry --refresh` o `openclaw doctor --fix`; el respaldo de entorno (env fallback) es solo para la recuperación de emergencia al inicio mientras se implementa la migración.</Warning>

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

La lista de Marketplace acepta una ruta de marketplace local, una ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. `--json` imprime la etiqueta de fuente resuelta más el manifiesto de marketplace analizado y las entradas de complementos.

## Relacionado

- [Construcción de complementos](/es/plugins/building-plugins)
- [Referencia de CLI](/es/cli)
- [Complementos de la comunidad](/es/plugins/community)
