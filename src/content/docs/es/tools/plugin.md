---
summary: "Instalar, configurar y gestionar complementos de OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Complementos"
sidebarTitle: "Instalación y configuración"
---

Los complementos extienden OpenClaw con nuevas capacidades: canales, proveedores de modelos,
arneses de agentes, herramientas, habilidades, voz, transcripción en tiempo real,
voz en tiempo real, comprensión de medios, generación de imágenes, generación de videos,
recuperación web, búsqueda web y más. Algunos complementos son **core** (incluidos con OpenClaw),
otros son **externos**. La mayoría de los complementos externos se publican y descubren a través de
[ClawHub](/es/clawhub). Npm sigue siendo compatible para instalaciones directas y para un
conjunto temporal de paquetes de complementos propiedad de OpenClaw mientras finaliza esa migración.

## Inicio rápido

Para ejemplos de instalación, listado, desinstalación, actualización y publicación de copiar y pegar,
consulte [Administrar complementos](/es/plugins/manage-plugins).

<Steps>
  <Step title="Ver lo que está cargado">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="Instalar un complemento">
    ```bash
    # Search ClawHub plugins
    openclaw plugins search "calendar"

    # From ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # From npm
    openclaw plugins install npm:@acme/openclaw-plugin
    openclaw plugins install npm-pack:./openclaw-plugin-1.2.3.tgz

    # From git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="Reiniciar el Gateway">
    ```bash
    openclaw gateway restart
    ```

    Luego configure bajo `plugins.entries.\<id\>.config` en su archivo de configuración.

  </Step>

  <Step title="Gestión nativa del chat">
    En un Gateway en ejecución, `/plugins enable` y `/plugins disable` exclusivos del propietario
    activan el recargador de configuración del Gateway. El Gateway recarga las superficies de ejecución
    de los complementos en proceso, y los nuevos turnos del agente reconstruyen su lista de herramientas a partir del
    registro actualizado. `/plugins install` cambia el código fuente del complemento, por lo que
    el Gateway solicita un reinicio en lugar de fingir que el proceso actual puede
    recargar de manera segura los módulos ya importados.

  </Step>

  <Step title="Verificar el plugin">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # If the plugin registered a CLI root, run one command from that root.
    openclaw <plugin-command> --help
    ```

    Use `--runtime` cuando necesite comprobar las herramientas registradas, servicios, métodos de
    puerta de enlace, ganchos o comandos de CLI propiedad del plugin. El `inspect` plano es una
    verificación de manifiesto/registro en frío e intencionalmente evita importar el tiempo de ejecución del plugin.

  </Step>
</Steps>

Si prefiere el control nativo del chat, habilite `commands.plugins: true` y use:

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

La ruta de instalación utiliza el mismo resolutor que la CLI: ruta/archivo local, `clawhub:<pkg>` explícito,
`npm:<pkg>` explícito, `npm-pack:<path.tgz>` explícito,
`git:<repo>` explícito, o especificación de paquete simple a través de npm.

Si la configuración no es válida, la instalación normalmente falla de forma cerrada y le dirige a
`openclaw doctor --fix`. La única excepción de recuperación es una ruta estrecha de reinstalación
de plugins agrupados para plugins que optan por
`openclaw.install.allowInvalidConfigRecovery`.
Durante el inicio de la Gateway, la configuración no válida del plugin falla de forma cerrada como cualquier otra configuración
no válida. Ejecute `openclaw doctor --fix` para poner en cuarentena la configuración del plugin defectuoso
deshabilitando esa entrada de plugin y eliminando su carga de configuración no válida; la copia de seguridad
normal de la configuración mantiene los valores anteriores.
Cuando una configuración de canal hace referencia a un plugin que ya no es detectable pero el
mismo identificador de plugin obsoleto permanece en la configuración del plugin o en los registros de instalación, el inicio de la Gateway
registra advertencias y omite ese canal en lugar de bloquear todos los demás canales.
Ejecute `openclaw doctor --fix` para eliminar las entradas de canal/plugin obsoletas; las claves de canal
desconocidas sin evidencia de plugin obsoleto aún fallan la validación, por lo que los errores tipográficos permanecen
visibles.
Si `plugins.enabled: false` está establecido, las referencias a plugins obsoletos se tratan como inertes:
el inicio de la Gateway omite el trabajo de descubrimiento/carga del plugin y `openclaw doctor` preserva
la configuración del plugin deshabilitado en lugar de eliminarla automáticamente. Reactive los plugins antes de
ejecutar la limpieza del médico si desea que se eliminen los identificadores de plugins obsoletos.

La instalación de dependencias de complementos ocurre solo durante flujos explícitos de instalación/actualización o
reparación del doctor. El inicio de Gateway, la recarga de configuración y la inspección en tiempo de ejecución no
ejecutan administradores de paquetes ni reparan árboles de dependencias. Los complementos locales ya deben
tener sus dependencias instaladas, mientras que los complementos npm, git y ClawHub se
instalan bajo las raíces administradas de complementos de OpenClaw. Las dependencias de npm pueden ser elevadas
dentro de la raíz administrada de npm de OpenClaw; la instalación/actualización escanea esa raíz administrada antes de
confianza y desinstala los paquetes administrados por npm a través de npm. Los complementos externos
y las rutas de carga personalizadas aún deben instalarse a través de `openclaw plugins install`.
Use `openclaw plugins list --json` para ver el `dependencyStatus` estático para cada
complemento visible sin importar código de tiempo de ejecución ni reparar dependencias.
Consulte [Resolución de dependencias de complementos](/es/plugins/dependency-resolution) para el
ciclo de vida de tiempo de instalación.

### Propiedad de ruta de complemento bloqueada

Si los diagnósticos del complemento indican
`blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
y la validación de la configuración continúa con `plugin present but blocked`, OpenClaw encontró
archivos de complemento propiedad de un usuario de Unix diferente al proceso que los está cargando.
Mantenga la configuración del complemento en su lugar; repare la propiedad del sistema de archivos o ejecute
OpenClaw como el mismo usuario que es propietario del directorio de estado.

Para las instalaciones de Docker, la imagen oficial se ejecuta como `node` (uid `1000`), por lo que los
directorios de configuración y espacio de trabajo de OpenClaw montados con bind en el host normalmente deben ser
propiedad del uid `1000`:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

Si ejecuta intencionalmente OpenClaw como root, repare la raíz del complemento administrado para
que tenga la propiedad de root en su lugar:

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

Después de corregir la propiedad, vuelva a ejecutar `openclaw doctor --fix` o
`openclaw plugins registry --refresh` para que el registro de complementos persistente coincida
con los archivos reparados.

Para las instalaciones de npm, los selectores mutables como `latest` o una dist-tag se resuelven antes de la instalación y luego se fijan a la versión verificada exacta en la raíz administrada de npm de OpenClaw. Después de que npm termina, OpenClaw verifica que la entrada `package-lock.json` instalada aún coincida con la versión y la integridad resueltas. Si npm escribe metadatos de paquete diferentes, la instalación falla y el paquete administrado se revierte en lugar de aceptar un artefacto de complemento diferente. Las raíces administradas de npm también heredan `overrides` de npm a nivel de paquete de OpenClaw, por lo que los anclajes de seguridad que protegen al host empaquetado también se aplican a las dependencias de complementos externos elevadas.

Las descargas de código fuente son espacios de trabajo de pnpm. Si clonas OpenClaw para modificar complementos incluidos, ejecuta `pnpm install`; OpenClaw luego carga los complementos incluidos desde `extensions/<id>` para que las ediciones y las dependencias locales del paquete se usen directamente. Las instalaciones de raíz de npm normales son para OpenClaw empaquetado, no para el desarrollo de descargas de código fuente.

## Tipos de complementos

OpenClaw reconoce dos formatos de complemento:

| Formato              | Cómo funciona                                                                   | Ejemplos                                                |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Nativo**           | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en proceso   | Complementos oficiales, paquetes de npm de la comunidad |
| **Paquete (Bundle)** | Diseño compatible con Codex/Claude/Cursor; asignado a las funciones de OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`  |

Ambos aparecen en `openclaw plugins list`. Consulte [Paquetes de complementos](/es/plugins/bundles) para obtener detalles del paquete.

Si está escribiendo un complemento nativo, comience con [Construcción de complementos](/es/plugins/building-plugins)
y la [Descripción general del SDK de complementos](/es/plugins/sdk-overview).

## Puntos de entrada del paquete

Los paquetes npm de complementos nativos deben declarar `openclaw.extensions` en `package.json`.
Cada entrada debe permanecer dentro del directorio del paquete y resolver a un archivo
de tiempo de ejecución legible, o a un archivo fuente de TypeScript con un par
JavaScript compilado inferido, tal como `src/index.ts` a `dist/index.js`.
Las instalaciones empaquetadas deben incluir esa salida de tiempo de ejecución de JavaScript.
La alternativa de fuente de TypeScript es para checkouts de código y rutas de desarrollo local,
no para paquetes npm instalados en la raíz de complementos administrada de OpenClaw.

Los directorios no rastreados colocados en la raíz de extensiones global se tratan como
checkouts de código fuente local y pueden cargar entradas de TypeScript directamente. Los directorios
que aún conservan el nombre de un registro de instalación, incluyendo `installPath` o `sourcePath`, se mantienen
gestionados y conservan el requisito de salida compilada incluso cuando el escaneo global los
detecta. Si convierte intencionalmente una instalación gestionada en un checkout local
no rastreado, elimine primero el registro de instalación obsoleto con uninstall o doctor cleanup.

Si una advertencia de paquete gestionado indica que `requires compiled runtime output for
TypeScript entry ...`, el paquete se publicó sin los archivos JavaScript
que OpenClaw necesita en tiempo de ejecución. Ese es un problema de empaquetado del complemento, no un problema de configuración
local. Actualice o reinstale el complemento después de que el editor rep publique los archivos
JavaScript compilados, o deshabilite/desinstale ese complemento hasta que esté disponible un paquete corregido.

Use `openclaw.runtimeExtensions` cuando los archivos de tiempo de ejecución publicados no se encuentren en las
mismas rutas que las entradas de origen. Cuando está presente, `runtimeExtensions` debe contener
exactamente una entrada para cada entrada `extensions`. Las listas desajustadas hacen que la instalación y
el descubrimiento de complementos fallen en lugar de volver silenciosamente a las rutas de origen. Si también
publica `openclaw.setupEntry`, use `openclaw.runtimeSetupEntry` para su par
JavaScript construido; ese archivo es obligatorio cuando se declara.

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## Complementos oficiales

### Paquetes npm propiedad de OpenClaw durante la migración

ClawHub es la ruta de distribución principal para la mayoría de los complementos. Las versiones empaquetadas
de OpenClaw actuales ya incluyen muchos complementos oficiales, por lo que esos no necesitan
instalaciones de npm separadas en configuraciones normales. Hasta que cada complemento propiedad de OpenClaw haya
migrado a ClawHub, OpenClaw aún envía algunos paquetes de complementos `@openclaw/*` en
npm para instalaciones antiguas/personalizadas y flujos de trabajo directos de npm.

Si npm informa un paquete de complemento `@openclaw/*` como obsoleto, esa versión
del paquete proviene de un tren de paquetes externo anterior. Use el complemento incluido en
OpenClaw actual o un checkout local hasta que se publique un paquete npm más reciente.

| Complemento     | Paquete                    | Documentación                                 |
| --------------- | -------------------------- | --------------------------------------------- |
| Discord         | `@openclaw/discord`        | [Discord](/es/channels/discord)               |
| Feishu          | `@openclaw/feishu`         | [Feishu](/es/channels/feishu)                 |
| Matrix          | `@openclaw/matrix`         | [Matrix](/es/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/es/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/es/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/es/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/es/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/es/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/es/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/es/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/es/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/es/plugins/zalouser)         |

### Core (incluido con OpenClaw)

<AccordionGroup>
  <Accordion title="Proveedores de modelos (habilitados de forma predeterminada)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="Plugins de memoria">
    - `memory-core` - búsqueda de memoria incluida (por defecto a través de `plugins.slots.memory`)
    - `memory-lancedb` - memoria a largo plazo respaldada por LanceDB con recuperación/captura automática (establezca `plugins.slots.memory = "memory-lancedb"`)

    Consulte [Memory LanceDB](/es/plugins/memory-lancedb) para obtener configuraciones de incrustación compatibles con OpenAI,
    ejemplos de Ollama, límites de recuperación y solución de problemas.

  </Accordion>

<Accordion title="Proveedores de voz (habilitados por defecto)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Otros">
    - `browser` - plugin de navegador incluido para la herramienta de navegador, CLI de `openclaw browser`, método de puerta de enlace `browser.request`, tiempo de ejecución del navegador y servicio de control de navegador predeterminado (habilitado por defecto; desactívelo antes de reemplazarlo)
    - `copilot-proxy` - puente proxy de VS Code Copilot (desactivado por defecto)

  </Accordion>
</AccordionGroup>

¿Busca plugins de terceros? Consulte [ClawHub](/es/clawhub).

## Configuración

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| Campo              | Descripción                                                           |
| ------------------ | --------------------------------------------------------------------- |
| `enabled`          | Interruptor maestro (predeterminado: `true`)                          |
| `allow`            | Lista de permitidos de plugins (opcional)                             |
| `bundledDiscovery` | Modo de descubrimiento de plugins incluidos (`allowlist` por defecto) |
| `deny`             | Lista de bloqueados de plugins (opcional; denegar gana)               |
| `load.paths`       | Archivos/directorios de plugins adicionales                           |
| `slots`            | Selectores de ranura exclusiva (ej. `memory`, `contextEngine`)        |
| `entries.\<id\>`   | Interruptores + configuración por plugin                              |

`plugins.allow` es exclusivo. Cuando no está vacío, solo los complementos listados pueden cargar
o exponer herramientas, incluso si `tools.allow` contiene `"*"` o un nombre de
herramienta propiedad de un complemento específico. Si una lista de permitidos de herramientas referencia herramientas de complemento, añada los ids de los complementos propietarios
a `plugins.allow` o elimine `plugins.allow`; `openclaw doctor` advierte sobre esta
configuración.

`plugins.bundledDiscovery` por defecto es `"allowlist"` para nuevas configuraciones, por lo que un
inventario `plugins.allow` restrictivo también bloquea complementos de proveedor empaquetados omitidos,
incluyendo el descubrimiento de proveedores de búsqueda web en tiempo de ejecución. Doctor marca configuraciones
antiguas de lista de permitidos restrictiva con `"compat"` durante la migración para que las actualizaciones mantengan
el comportamiento de proveedor empaquetado heredado hasta que el operador opte por el modo más estricto.
Un `plugins.allow` vacío todavía se trata como sin establecer/abierto.

Los cambios de configuración realizados a través de `/plugins enable` o `/plugins disable` activan una
recarga del complemento de Gateway en proceso. Los nuevos turnos de agente reconstruyen su lista de herramientas a partir
del registro de complementos actualizado. Las operaciones que cambian el código fuente como instalar,
actualizar y desinstalar aún reinician el proceso de Gateway porque los módulos de complemento
ya importados no pueden reemplazarse de manera segura en su lugar.

`openclaw plugins list` es una instantánea local del registro/configuración de complementos. Un
complemento `enabled` allí significa que el registro persistido y la configuración actual permiten que el
complemento participe. No prueba que un Gateway remoto ya en ejecución
haya recargado o reiniciado con el mismo código de complemento. En configuraciones de VPS/contenedor
con procesos de envoltura, envíe reinicios o escrituras que activen recargas al proceso `openclaw gateway run` real, o use `openclaw gateway restart` contra el
Gateway en ejecución cuando la recarga reporte un fallo.

<Accordion title="Plugin states: disabled vs missing vs invalid">
  - **Disabled**: el complemento existe pero las reglas de habilitación lo desactivaron. La configuración se conserva.
  - **Missing**: la configuración hace referencia a un id de complemento que el descubrimiento no encontró.
  - **Invalid**: el complemento existe pero su configuración no coincide con el esquema declarado. El inicio de Gateway omite solo ese complemento; `openclaw doctor --fix` puede poner en cuarentena la entrada inválida deshabilitándola y eliminando su carga de configuración.

</Accordion>

## Descubrimiento y precedencia

OpenClaw busca complementos en este orden (gana la primera coincidencia):

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` - rutas de archivo o directorio explícitas. Las rutas que apuntan
    hacia atrás a los propios directorios de complementos empaquetados de OpenClaw se ignoran;
    ejecute `openclaw doctor --fix` para eliminar esos alias obsoletos.
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` y `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` y `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Bundled plugins">
    Enviados con OpenClaw. Muchos están habilitados de forma predeterminada (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

Las instalaciones empaquetadas y las imágenes de Docker normalmente resuelven los complementos empaquetados desde el
árbol `dist/extensions` compilado. Si un directorio fuente de un complemento empaquetado está
montado con bind sobre la ruta fuente empaquetada correspondiente, por ejemplo
`/app/extensions/synology-chat`, OpenClaw trata ese directorio fuente montado
como una superposición de fuente empaquetada y lo descubre antes que el paquete
`/app/dist/extensions/synology-chat` empaquetado. Esto mantiene los bucles del contenedor
del mantenedor funcionando sin tener que volver a cambiar cada complemento empaquetado a fuente TypeScript.
Establezca `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` para forzar paquetes dist empaquetados
incluso cuando hay montajes de superposición de fuente presentes.

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los complementos y omite el trabajo de descubrimiento/carga de complementos
- `plugins.deny` siempre gana sobre allow
- `plugins.entries.\<id\>.enabled: false` deshabilita ese complemento
- Los complementos de origen del espacio de trabajo están **deshabilitados de manera predeterminada** (deben habilitarse explícitamente)
- Los complementos agrupados siguen el conjunto predeterminado de activación integrado a menos que se anulen
- Las ranuras exclusivas pueden forzar la activación del complemento seleccionado para esa ranura
- Algunos complementos agrupados opcionales se habilitan automáticamente cuando la configuración nombra
  una superficie propiedad del complemento, como una referencia de modelo de proveedor,
  configuración de canal o tiempo de ejecución del arnés
- La configuración obsoleta del complemento se conserva mientras `plugins.enabled: false` está activo;
  vuelva a habilitar los complementos antes de ejecutar la limpieza del doctor si desea que se eliminen los identificadores obsoletos
- Las rutas de Codex de la familia OpenAI mantienen límites de complementos separados:
  `openai-codex/*` pertenece al complemento OpenAI, mientras que el complemento del servidor
  de aplicaciones Codex agrupado se selecciona mediante referencias canónicas de agente `openai/*`,
  `agentRuntime.id: "codex"` proveedor/modelo explícitos, o referencias de modelo `codex/*` heredadas

## Solución de problemas de enlaces de tiempo de ejecución

Si un complemento aparece en `plugins list` pero los efectos secundarios o enlaces `register(api)`
no se ejecutan en el tráfico del chat en vivo, verifique esto primero:

- Ejecute `openclaw gateway status --deep --require-rpc` y confirme que la URL de Gateway activa,
  el perfil, la ruta de configuración y el proceso son los que está editando.
- Reinicie el Gateway en vivo después de instalar, configurar o cambiar el código del complemento.
  En contenedores envolventes, PID 1 solo puede ser un supervisor; reinicie o envíe una señal
  al proceso secundario `openclaw gateway run`.
- Use `openclaw plugins inspect <id> --runtime --json` para confirmar los registros de enlace y
  los diagnósticos. Los enlaces de conversación no agrupados, como `before_model_resolve`,
  `before_agent_reply`, `before_agent_run`, `llm_input`, `llm_output`,
  `before_agent_finalize` y `agent_end` necesitan
  `plugins.entries.<id>.hooks.allowConversationAccess=true`.
- Para el cambio de modelo, prefiera `before_model_resolve`. Se ejecuta antes de la resolución
  del modelo para los turnos del agente; `llm_output` solo se ejecuta después de que un intento de modelo
  produce la salida del asistente.
- Para probar el modelo de sesión efectivo, use `openclaw sessions` o las superficies de sesión/estado del Gateway y, al depurar cargas útiles del proveedor, inicie el Gateway con `--raw-stream --raw-stream-path <path>`.

### Configuración lenta de herramientas de complementos

Si los turnos del agente parecen detenerse mientras se preparan las herramientas, habilite el registro de seguimiento y verifique las líneas de tiempo de la fábrica de herramientas de complementos:

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

Busque:

```text
[trace:plugin-tools] factory timings ...
```

El resumen enumera el tiempo total de la fábrica y las fábricas de herramientas de complementos más lentas, incluido el id del complemento, los nombres de las herramientas declaradas, la forma del resultado y si la herramienta es opcional. Las líneas lentas se promueven a advertencias cuando una sola fábrica tarda al menos 1s o la preparación total de la fábrica de herramientas del complemento tarda al menos 5s.

OpenClaw almacena en caché los resultados exitosos de la fábrica de herramientas de complementos para resoluciones repetidas con el mismo contexto de solicitud efectivo. La clave de caché incluye la configuración efectiva de tiempo de ejecución, el espacio de trabajo, los ids de agente/sesión, la política de sandbox, la configuración del navegador, el contexto de entrega, la identidad del solicitante y el estado de propiedad, por lo que las fábricas que dependen de esos campos de confianza se vuelven a ejecutar cuando cambia el contexto.

Si un complemento domina el tiempo, inspeccione sus registros de tiempo de ejecución:

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

Luego actualice, reinstale o deshabilite ese complemento. Los autores de complementos deben mover la carga de dependencias costosas detrás de la ruta de ejecución de la herramienta en lugar de hacerlo dentro de la fábrica de herramientas.

### Propiedad duplicada de canal o herramienta

Síntomas:

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

Esto significa que más de un complemento habilitado está intentando ser propietario del mismo canal, flujo de configuración o nombre de herramienta. La causa más común es un complemento de canal externo instalado junto a un complemento empaquetado que ahora proporciona el mismo id de canal.

Pasos de depuración:

- Ejecute `openclaw plugins list --enabled --verbose` para ver todos los complementos habilitados y su origen.
- Ejecute `openclaw plugins inspect <id> --runtime --json` para cada complemento sospechoso y compare `channels`, `channelConfigs`, `tools` y los diagnósticos.
- Ejecute `openclaw plugins registry --refresh` después de instalar o eliminar paquetes de complementos para que los metadatos persistentes reflejen la instalación actual.
- Reinicie el Gateway después de cambios de instalación, registro o configuración.

Opciones de solución:

- Si un complemento reemplaza intencionalmente a otro para el mismo id de canal, el
  complemento preferido debe declarar `channelConfigs.<channel-id>.preferOver` con
  el id del complemento de menor prioridad. Consulte [/plugins/manifest#replacing-another-channel-plugin](/es/plugins/manifest#replacing-another-channel-plugin).
- Si el duplicado es accidental, deshabilite un lado con
  `plugins.entries.<plugin-id>.enabled: false` o elimine la instalación del
  complemento obsoleto.
- Si habilitó explícitamente ambos complementos, OpenClaw mantiene esa solicitud y
  reporta el conflicto. Elija un propietario para el canal o cambie el nombre de las herramientas
  propiedad del complemento para que la superficie de ejecución sea inequívoca.

## Slots de complementos (categorías exclusivas)

Algunas categorías son exclusivas (solo una activa a la vez):

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable
      contextEngine: "legacy", // or a plugin id
    },
  },
}
```

| Slot            | Qué controla                  | Predeterminado       |
| --------------- | ----------------------------- | -------------------- |
| `memory`        | Complemento de memoria activo | `memory-core`        |
| `contextEngine` | Motor de contexto activo      | `legacy` (integrado) |

## Referencia de CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins search <query>            # search ClawHub plugin catalog
openclaw plugins inspect <id>              # static detail
openclaw plugins inspect <id> --runtime    # registered hooks/tools/CLI/gateway methods
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install from npm by default
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
openclaw plugins install git:<repo>        # install from git
openclaw plugins install git:<repo>@<ref>  # install from git ref
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # update one plugin
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config and plugin index records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

# Verify runtime registrations after install.
openclaw plugins inspect <id> --runtime --json

# Run plugin-owned CLI commands directly from the OpenClaw root CLI.
openclaw <plugin-command> --help

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Los complementos agrupados se distribuyen con OpenClaw. Muchos están habilitados de forma predeterminada (por ejemplo,
los proveedores de modelos agrupados, los proveedores de voz agrupados y el complemento del
navegador agrupado). Otros complementos agrupados aún necesitan `openclaw plugins enable <id>`.

`--force` sobrescribe un complemento o paquete de hook instalado existente en su lugar. Use
`openclaw plugins update <id-or-npm-spec>` para actualizaciones de rutina de complementos
npm rastreados. No es compatible con `--link`, que reutiliza la ruta de origen en lugar
de copiar sobre un objetivo de instalación administrado.

Cuando `plugins.allow` ya está configurado, `openclaw plugins install` añade el
id del complemento instalado a esa lista de permitidos antes de habilitarlo. Si el mismo id de
complemento está presente en `plugins.deny`, la instalación elimina esa entrada de denegación obsoleta para que
la instalación explícita se pueda cargar inmediatamente después de reiniciar.

OpenClaw mantiene un registro local persistente de complementos como el modelo de lectura en frío para el inventario de complementos, la propiedad de las contribuciones y la planificación del inicio. Los flujos de instalación, actualización, desinstalación, habilitación y deshabilitación actualizan ese registro después de cambiar el estado del complemento. El mismo archivo `plugins/installs.json` mantiene los metadatos de instalación duraderos en `installRecords` de nivel superior y los metadatos de manifiesto reconstruibles en `plugins`. Si falta el registro, está obsoleto o no es válido, `openclaw plugins registry --refresh` reconstruye su vista de manifiesto a partir de los registros de instalación, la política de configuración y los metadatos de manifiesto/paquete sin cargar los módulos de tiempo de ejecución del complemento.

En modo Nix (`OPENCLAW_NIX_MODE=1`), los mutadores del ciclo de vida del complemento están deshabilitados. Administre la selección y configuración de paquetes de complementos a través de la fuente de Nix para la instalación en su lugar; para nix-openclaw, comience con el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) centrado en agentes. `openclaw plugins update <id-or-npm-spec>` se aplica a las instalaciones rastreadas. Al pasar una especificación de paquete npm con una etiqueta de distribución o una versión exacta, se resuelve el nombre del paquete de vuelta al registro del complemento rastreado y se registra la nueva especificación para futuras actualizaciones. Al pasar el nombre del paquete sin una versión, se mueve una instalación fijada exacta de vuelta a la línea de lanzamiento predeterminada del registro. Si el complemento npm instalado ya coincide con la versión resuelta y la identidad del artefacto registrado, OpenClaw omite la actualización sin descargar, reinstalar o reescribir la configuración. Cuando `openclaw update` se ejecuta en el canal beta, los registros de complementos npm y ClawHub de la línea predeterminada intentan `@beta` primero y recurren a default/latest cuando no existe una versión beta del complemento. Las versiones exactas y las etiquetas explícitas permanecen fijas.

`--pin` es solo para npm. No es compatible con `--marketplace`, porque las instalaciones del mercado persisten los metadatos de origen del mercado en lugar de una especificación npm.

`--dangerously-force-unsafe-install` es una invalidación de emergencia para los falsos positivos del escáner de código peligroso integrado. Permite que las instalaciones y actualizaciones de complementos continúen más allá de los hallazgos integrados de `critical`, pero aun así no evita los bloqueos de política de complementos `before_install` ni el bloqueo por fallas en el escaneo. Los escaneos de instalación ignoran los archivos y directorios de prueba comunes como `tests/`, `__tests__/`, `*.test.*` y `*.spec.*` para evitar bloquear simulacros de prueba empaquetados; los puntos de entrada de tiempo de ejecución del complemento declarados todavía se escanean incluso si usan uno de esos nombres.

Este indicador de CLI se aplica únicamente a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la invalidación de solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación de habilidades de ClawHub.

Si un complemento que publicaste en ClawHub está oculto o bloqueado por un escaneo, abre el panel de ClawHub o ejecuta `clawhub package rescan <name>` para pedirle a ClawHub que lo verifique nuevamente. `--dangerously-force-unsafe-install` solo afecta las instalaciones en tu propia máquina; no le pide a ClawHub que vuelva a escanear el complemento ni hace pública una versión bloqueada.

Los paquetes compatibles participan en el mismo flujo de lista/inspección/habilitación/deshabilitación de complementos. El soporte de tiempo de ejecución actual incluye habilidades de paquete, habilidades de comando de Claude, valores predeterminados `settings.json` de Claude, `.lsp.json` de Claude y valores predeterminados `lspServers` declarados en el manifiesto, habilidades de comando de Cursor y directorios de enlace de Codex compatibles.

`openclaw plugins inspect <id>` también informa las capacidades del paquete detectadas además de las entradas de servidor MCP y LSP compatibles o no compatibles para complementos respaldados por paquetes.

Las fuentes del mercado pueden ser un nombre de mercado conocido de Claude de `~/.claude/plugins/known_marketplaces.json`, una ruta raíz de mercado local o ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. Para los mercados remotos, las entradas de complementos deben permanecer dentro del repositorio del mercado clonado y usar solo fuentes de ruta relativa.

Consulte [referencia de la CLI de `openclaw plugins`](/es/cli/plugins) para obtener detalles completos.

## Resumen de la API de complementos

Los complementos nativos exportan un objeto de entrada que expone `register(api)`. Los complementos
antiguos aún pueden usar `activate(api)` como un alias heredado, pero los nuevos complementos deben
usar `register`.

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw carga el objeto de entrada y llama a `register(api)` durante la
activación del complemento. El cargador todavía recurre a `activate(api)` para complementos
antiguos, pero los complementos empaquetados y los nuevos complementos externos deben tratar `register` como el
contrato público.

`api.registrationMode` le indica a un complemento por qué se está cargando su entrada:

| Modo            | Significado                                                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`          | Activación en tiempo de ejecución. Registra herramientas, ganchos, servicios, comandos, rutas y otros efectos secundarios en vivo.                                                        |
| `discovery`     | Descubrimiento de capacidades de solo lectura. Registra proveedores y metadatos; el código de entrada del complemento de confianza puede cargar, pero omitir efectos secundarios en vivo. |
| `setup-only`    | Carga de metadatos de configuración del canal a través de una entrada de configuración ligera.                                                                                            |
| `setup-runtime` | Carga de configuración del canal que también necesita la entrada de tiempo de ejecución.                                                                                                  |
| `cli-metadata`  | Solo recopilación de metadatos de comandos de CLI.                                                                                                                                        |

Las entradas de complementos que abren sockets, bases de datos, trabajadores en segundo plano o clientes
de larga duración deben proteger esos efectos secundarios con `api.registrationMode === "full"`.
Las cargas de descubrimiento se almacenan en caché por separado de las cargas de activación y no reemplazan
el registro Gateway en ejecución. El descubrimiento no es activador, no libre de importaciones:
OpenClaw puede evaluar la entrada del complemento de confianza o el módulo del complemento del canal para construir
la instantánea. Mantenga los niveles superiores del módulo ligeros y sin efectos secundarios, y mueva
los clientes de red, subprocesos, escuchas, lecturas de credenciales y el inicio de servicios
detrás de rutas de tiempo de ejecución completo.

Métodos de registro comunes:

| Método                                  | Lo que registra                       |
| --------------------------------------- | ------------------------------------- |
| `registerProvider`                      | Proveedor de modelos (LLM)            |
| `registerChannel`                       | Canal de chat                         |
| `registerTool`                          | Herramienta de agente                 |
| `registerHook` / `on(...)`              | Ganchos del ciclo de vida             |
| `registerSpeechProvider`                | Texto a voz / STT                     |
| `registerRealtimeTranscriptionProvider` | STT en streaming                      |
| `registerRealtimeVoiceProvider`         | Voz en tiempo real dúplex             |
| `registerMediaUnderstandingProvider`    | Análisis de imagen/audio              |
| `registerImageGenerationProvider`       | Generación de imágenes                |
| `registerMusicGenerationProvider`       | Generación de música                  |
| `registerVideoGenerationProvider`       | Generación de video                   |
| `registerWebFetchProvider`              | Proveedor de obtención/extracción web |
| `registerWebSearchProvider`             | Búsqueda web                          |
| `registerHttpRoute`                     | Endpoint HTTP                         |
| `registerCommand` / `registerCli`       | Comandos CLI                          |
| `registerContextEngine`                 | Motor de contexto                     |
| `registerService`                       | Servicio en segundo plano             |

Comportamiento de guarda de enlace para enlaces del ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una operación nula y no borra un bloqueo anterior.
- `before_install`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una operación nula y no borra un bloqueo anterior.
- `message_sending`: `{ cancel: true }` es terminal; se omiten los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una operación nula y no borra una cancelación anterior.

El servidor de aplicaciones nativo de Codex devuelve los eventos de herramientas nativas de Codex a esta superficie de enlace. Los complementos pueden bloquear las herramientas nativas de Codex a través de `before_tool_call`, observar los resultados a través de `after_tool_call` y participar en las aprobaciones de `PermissionRequest` de Codex. El puente aún no reescribe los argumentos de las herramientas nativas de Codex. El límite exacto de soporte del tiempo de ejecución de Codex se encuentra en el [contrato de soporte del arnés Codex v1](/es/plugins/codex-harness-runtime#v1-support-contract).

Para obtener el comportamiento completo de los enlaces tipados, consulte [Descripción general del SDK](/es/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Creación de complementos](/es/plugins/building-plugins) - crea tu propio complemento
- [Paquetes de complementos](/es/plugins/bundles) - compatibilidad de paquetes Codex/Claude/Cursor
- [Manifiesto de complementos](/es/plugins/manifest) - esquema del manifiesto
- [Registro de herramientas](/es/plugins/building-plugins#registering-agent-tools) - agregar herramientas de agente en un complemento
- [Funcionamiento interno de complementos](/es/plugins/architecture) - modelo de capacidades y canalización de carga
- [ClawHub](/es/clawhub) - descubrimiento de complementos de terceros
