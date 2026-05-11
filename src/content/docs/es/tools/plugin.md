---
summary: "Instalar, configurar y gestionar los complementos de OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Complementos"
sidebarTitle: "Instalación y configuración"
---

Los complementos extienden OpenClaw con nuevas capacidades: canales, proveedores de modelos, arneses de agentes, herramientas, habilidades, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de video, obtención web, búsqueda web y más. Algunos complementos son **centrales** (incluidos con OpenClaw), otros son **externos** (publicados en npm por la comunidad).

## Inicio rápido

<Steps>
  <Step title="Ver qué hay cargado">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="Instalar un complemento">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

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
</Steps>

Si prefiere el control nativo del chat, habilite `commands.plugins: true` y use:

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

La ruta de instalación utiliza el mismo resolutor que la CLI: ruta/archivo local, `clawhub:<pkg>` explícito, `npm:<pkg>` explícito o especificación de paquete simple (primero ClawHub, luego respaldo npm).

Si la configuración no es válida, la instalación normalmente falla de forma segura y le remite a `openclaw doctor --fix`. La única excepción de recuperación es una ruta estrecha de reinstalación de complementos agrupados para complementos que optan por `openclaw.install.allowInvalidConfigRecovery`.
Durante el inicio de Gateway, la configuración no válida de un complemento se aísla en ese complemento: el inicio registra el problema `plugins.entries.<id>.config`, omite ese complemento durante la carga y mantiene otros complementos y canales en línea. Ejecute `openclaw doctor --fix` para poner en cuarentena la configuración del complemento defectuoso deshabilitando esa entrada de complemento y eliminando su carga de configuración no válida; la copia de seguridad de configuración normal mantiene los valores anteriores.
Cuando una configuración de canal hace referencia a un complemento que ya no es detectable pero el mismo ID de complemento obsoleto permanece en la configuración del complemento o en los registros de instalación, el inicio de Gateway registra advertencias y omite ese canal en lugar de bloquear todos los demás canales.
Ejecute `openclaw doctor --fix` para eliminar las entradas de canal/complemento obsoletas; las claves de canal desconocidas sin evidencia de complemento obsoleto aún fallan la validación para que los errores tipográficos permanezcan visibles.

Las instalaciones empaquetadas de OpenClaw no instalan ansiosamente el árbol de dependencias de tiempo de ejecución de cada complemento agrupado. Cuando un complemento agrupado propiedad de OpenClaw está activo desde la configuración del complemento, la configuración heredada del canal o un manifiesto habilitado por defecto, el inicio repara solo las dependencias de tiempo de ejecución declaradas de ese complemento antes de importarlo. El estado de autenticación del canal persistente por sí solo no activa un canal agrupado para la reparación de dependencias de tiempo de ejecución al inicio de Gateway.
La deshabilitación explícita aún gana: `plugins.entries.<id>.enabled: false`, `plugins.deny`, `plugins.enabled: false` y `channels.<id>.enabled: false` evitan la reparación automática de dependencias de tiempo de ejecución agrupadas para ese complemento/canal.
Un `plugins.allow` no vacío también limita la reparación de dependencias de tiempo de ejecución agrupadas habilitadas por defecto; la habilitación explícita del canal agrupado (`channels.<id>.enabled: true`) aún puede reparar las dependencias del complemento de ese canal.
Los complementos externos y las rutas de carga personalizadas aún deben instalarse a través de `openclaw plugins install`.

## Tipos de complementos

OpenClaw reconoce dos formatos de complementos:

| Formato              | Cómo funciona                                                                 | Ejemplos                                               |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Nativo**           | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en proceso | Complementos oficiales, paquetes npm de la comunidad   |
| **Paquete (Bundle)** | Diseño compatible con Codex/Claude/Cursor; asignado a funciones de OpenClaw   | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Ambos aparecen bajo `openclaw plugins list`. Consulte [Plugin Bundles](/es/plugins/bundles) para obtener detalles sobre los paquetes.

Si está escribiendo un complemento nativo, comience con [Building Plugins](/es/plugins/building-plugins)
y la [Plugin SDK Overview](/es/plugins/sdk-overview).

## Puntos de entrada del paquete

Los paquetes npm de complementos nativos deben declarar `openclaw.extensions` en `package.json`.
Cada entrada debe permanecer dentro del directorio del paquete y resolver a un archivo
de tiempo de ejecución legible, o a un archivo fuente de TypeScript con un par JavaScript
construido inferido, tal como `src/index.ts` a `dist/index.js`.

Use `openclaw.runtimeExtensions` cuando los archivos de tiempo de ejecución publicados no se encuentren en las
mismas rutas que las entradas de origen. Cuando está presente, `runtimeExtensions` debe contener
exactamente una entrada para cada entrada de `extensions`. Las listas desiguales fallan la instalación y
el descubrimiento de complementos en lugar de volver silenciosamente a las rutas de origen.

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

### Instalables (npm)

| Complemento     | Paquete                | Documentación                            |
| --------------- | ---------------------- | ---------------------------------------- |
| Matriz          | `@openclaw/matrix`     | [Matrix](/es/channels/matrix)            |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/es/channels/msteams)  |
| Nostr           | `@openclaw/nostr`      | [Nostr](/es/channels/nostr)              |
| Llamada de voz  | `@openclaw/voice-call` | [Llamada de voz](/es/plugins/voice-call) |
| Zalo            | `@openclaw/zalo`       | [Zalo](/es/channels/zalo)                |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/es/plugins/zalouser)    |

### Núcleo (incluido con OpenClaw)

<AccordionGroup>
  <Accordion title="Proveedores de modelos (habilitados por defecto)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de memoria">- `memory-core` — búsqueda de memoria incluida (por defecto vía `plugins.slots.memory`) - `memory-lancedb` — memoria a largo plazo bajo demanda con recuperación/captura automática (establecer `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Proveedores de voz (habilitados por defecto)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Otros">
    - `browser` — plugin de navegador incluido para la herramienta de navegador, CLI `openclaw browser`, método de puerta de enlace `browser.request`, tiempo de ejecución del navegador y servicio de control de navegador predeterminado (habilitado por defecto; deshabilitar antes de reemplazarlo)
    - `copilot-proxy` — puente de proxy de VS Code Copilot (deshabilitado por defecto)
  </Accordion>
</AccordionGroup>

¿Buscas plugins de terceros? Consulta [Plugins de la comunidad](/es/plugins/community).

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

| Campo            | Descripción                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `enabled`        | Interruptor maestro (por defecto: `true`)                                 |
| `allow`          | Lista blanca de complementos (opcional)                                   |
| `deny`           | Lista negra de complementos (opcional; la denegación tiene prioridad)     |
| `load.paths`     | Archivos/directorios de complementos adicionales                          |
| `slots`          | Selectores de ranuras exclusivas (por ejemplo, `memory`, `contextEngine`) |
| `entries.\<id\>` | Interruptores y configuración por complemento                             |

Los cambios de configuración **requieren un reinicio de la puerta de enlace**. Si la puerta de enlace se está ejecutando con la vigilancia de configuración + el reinicio en proceso habilitado (la ruta predeterminada `openclaw gateway`), ese reinicio generalmente se realiza automáticamente un momento después de que se escribe la configuración.
No hay una ruta de recarga en caliente admitida para el código de tiempo de ejecución del complemento nativo o los ganchos de ciclo de vida; reinicie el proceso de la puerta de enlace que está sirviendo el canal en vivo antes de esperar que se ejecute el código `register(api)` actualizado, los ganchos `api.on(...)`, las herramientas, los servicios o los ganchos de proveedor/tiempo de ejecución.

`openclaw plugins list` es una instantánea local del registro/configuración de complementos. Un complemento `enabled` allí significa que el registro persistente y la configuración actual permiten que el complemento participe. No prueba que un hijo remoto de la puerta de enlace que ya se está ejecutando se haya reiniciado con el mismo código de complemento. En configuraciones de VPS/contenedores con procesos de envoltura, envíe reinicios al proceso real `openclaw gateway run`, o use `openclaw gateway restart` contra la puerta de enlace en ejecución.

<Accordion title="Estados de los complementos: deshabilitado vs. faltante vs. inválido">
  - **Deshabilitado**: el complemento existe pero las reglas de habilitación lo desactivaron. La configuración se conserva. - **Faltante**: la configuración hace referencia a un ID de complemento que el descubrimiento no encontró. - **Inválido**: el complemento existe pero su configuración no coincide con el esquema declarado. El inicio de la puerta de enlace omite solo ese complemento; `openclaw
  doctor --fix` puede poner en cuarentena la entrada inválida deshabilitándola y eliminando su carga útil de configuración.
</Accordion>

## Descubrimiento y precedencia

OpenClaw escanea los complementos en este orden (gana la primera coincidencia):

<Steps>
  <Step title="Rutas de configuración">
    `plugins.load.paths` — rutas explícitas de archivo o directorio. Las rutas que apunten
    hacia los propios directorios de complementos empaquetados de OpenClaw se ignoran;
    ejecute `openclaw doctor --fix` para eliminar esos alias obsoletos.
  </Step>

  <Step title="Complementos del espacio de trabajo">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` y `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Complementos globales">
    `~/.openclaw/<plugin-root>/*.ts` y `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Complementos empaquetados">
    Enviados con OpenClaw. Muchos están habilitados por defecto (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

Las instalaciones empaquetadas y las imágenes de Docker normalmente resuelven los complementos empaquetados desde el
árbol compilado `dist/extensions`. Si un directorio fuente de un complemento empaquetado se
monta mediante bind sobre la ruta fuente empaquetada correspondiente, por ejemplo
`/app/extensions/synology-chat`, OpenClaw trata ese directorio fuente montado
como una superposición de fuente empaquetada y lo descubre antes que el paquete
empaquetado `/app/dist/extensions/synology-chat`. Esto mantiene los bucles del contenedor
de mantenimiento funcionando sin tener que volver a cambiar cada complemento empaquetado a código fuente TypeScript.
Establezca `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` para forzar los paquetes dist empaquetados
e incluso cuando están presentes montajes de superposición de fuente.

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana sobre allow
- `plugins.entries.\<id\>.enabled: false` deshabilita ese complemento
- Los complementos originados en el espacio de trabajo están **deshabilitados por defecto** (deben ser habilitados explícitamente)
- Los complementos empaquetados siguen el conjunto predeterminado integrado a menos que se anule
- Las ranuras exclusivas pueden forzar la habilitación del complemento seleccionado para esa ranura
- Algunos complementos opcionales empaquetados se habilitan automáticamente cuando la configuración nombra una
  superficie propiedad del complemento, como una referencia de modelo de proveedor, configuración de canal o tiempo de ejecución
  de arnés
- Las rutas de Codex de la familia OpenAI mantienen límites de complementos separados:
  `openai-codex/*` pertenece al complemento de OpenAI, mientras que el complemento del servidor de aplicaciones Codex incluido se selecciona mediante `agentRuntime.id: "codex"` o referencias de modelos heredadas `codex/*`

## Solución de problemas de ganchos de tiempo de ejecución

Si un complemento aparece en `plugins list` pero los efectos secundarios de `register(api)` o los ganchos no se ejecutan en el tráfico de chat en vivo, compruebe primero esto:

- Ejecute `openclaw gateway status --deep --require-rpc` y confirme que la URL de Gateway activa, el perfil, la ruta de configuración y el proceso son los que está editando.
- Reinicie el Gateway en vivo después de instalar, configurar o cambiar el código del complemento. En contenedores de envoltura, el PID 1 puede ser solo un supervisor; reinicie o envíe una señal al proceso secundario `openclaw gateway run`.
- Use `openclaw plugins inspect <id> --json` para confirmar los registros de ganchos y el diagnóstico. Los ganchos de conversación no incluidos, como `llm_input`, `llm_output`, `before_agent_finalize` y `agent_end`, necesitan `plugins.entries.<id>.hooks.allowConversationAccess=true`.
- Para el cambio de modelo, prefiera `before_model_resolve`. Se ejecuta antes de la resolución del modelo para los turnos del agente; `llm_output` solo se ejecuta después de que un intento de modelo produce la salida del asistente.
- Para una prueba del modelo de sesión efectivo, use `openclaw sessions` o las superficies de sesión/estado del Gateway y, al depurar las cargas útiles del proveedor, inicie el Gateway con `--raw-stream --raw-stream-path <path>`.

### Propiedad duplicada de canal o herramienta

Síntomas:

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

Esto significa que más de un complemento habilitado está intentando poseer el mismo canal, flujo de configuración o nombre de herramienta. La causa más común es un complemento de canal externo instalado junto a un complemento incluido que ahora proporciona el mismo ID de canal.

Pasos de depuración:

- Ejecute `openclaw plugins list --enabled --verbose` para ver todos los complementos habilitados y su origen.
- Ejecute `openclaw plugins inspect <id> --json` para cada complemento sospechoso y compare `channels`, `channelConfigs`, `tools` y los diagnósticos.
- Ejecute `openclaw plugins registry --refresh` después de instalar o eliminar
  paquetes de complementos para que los metadatos persistentes reflejen la instalación actual.
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
  propiedad del complemento para que la superficie de tiempo de ejecución sea inequívoca.

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
| `memory`        | Complemento de memoria activa | `memory-core`        |
| `contextEngine` | Motor de contexto activo      | `legacy` (integrado) |

## Referencia de CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only enabled plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics
openclaw plugins registry                  # inspect persisted registry state
openclaw plugins registry --refresh        # rebuild persisted registry
openclaw doctor --fix                      # repair plugin registry state

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install npm:<pkg>         # install from npm only
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

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Los complementos integrados se envían con OpenClaw. Muchos están habilitados por defecto (por ejemplo,
proveedores de modelos integrados, proveedores de voz integrados y el complemento del navegador
integrado). Otros complementos integrados aún necesitan `openclaw plugins enable <id>`.

`--force` sobrescribe un complemento o paquete de hooks instalado existente en su lugar. Use
`openclaw plugins update <id-or-npm-spec>` para actualizaciones de rutina de complementos
npm rastreados. No es compatible con `--link`, que reutiliza la ruta de origen en lugar
de copiar sobre un objetivo de instalación administrado.

Cuando `plugins.allow` ya está establecido, `openclaw plugins install` añade el
id del complemento instalado a esa lista de permitidos antes de habilitarlo. Si el mismo id de
complemento está presente en `plugins.deny`, la instalación elimina esa entrada de denegación obsoleta para que la
instalación explícita se pueda cargar inmediatamente después del reinicio.

OpenClaw mantiene un registro local persistente de complementos como modelo de lectura en frío para el inventario de complementos, la propiedad de las contribuciones y la planificación del inicio. Los flujos de instalación, actualización, desinstalación, habilitación y deshabilitación actualizan ese registro después de cambiar el estado del complemento. El mismo archivo `plugins/installs.json` conserva metadatos de instalación duraderos en `installRecords` de nivel superior y metadatos de manifiesto reconstruibles en `plugins`. Si el registro falta, está obsoleto o no es válido, `openclaw plugins registry --refresh` reconstruye su vista de manifiesto a partir de los registros de instalación, la política de configuración y los metadatos de manifiesto/paquete sin cargar los módulos de tiempo de ejecución del complemento. `openclaw plugins update <id-or-npm-spec>` se aplica a las instalaciones rastreadas. Pasar una especificación de paquete npm con una etiqueta de distribución o una versión exacta resuelve el nombre del paquete de vuelta al registro del complemento rastreado y registra la nueva especificación para futuras actualizaciones. Pasar el nombre del paquete sin una versión mueve una instalación fijada exacta de vuelta a la línea de lanzamiento predeterminada del registro. Si el complemento npm instalado ya coincide con la versión resuelta y la identidad del artefacto registrado, OpenClaw omite la actualización sin descargar, reinstalar o reescribir la configuración.

`--pin` es solo para npm. No es compatible con `--marketplace`, porque las instalaciones del marketplace persisten metadatos de origen del marketplace en lugar de una especificación npm.

`--dangerously-force-unsafe-install` es una anulación de emergencia para los falsos positivos del escáner de código peligroso integrado. Permite que las instalaciones y actualizaciones de complementos continúen más allá de los hallazgos integrados de `critical`, pero aún así no evita los bloqueos de política de `before_install` del complemento ni el bloqueo por fallas en el escaneo. Los escaneos de instalación ignoran los archivos y directorios de prueba comunes, como `tests/`, `__tests__/`, `*.test.*` y `*.spec.*`, para evitar bloquear simulacros de prueba empaquetados; los puntos de entrada de tiempo de ejecución del complemento declarados aún se escanean incluso si usan uno de esos nombres.

Este indicador de CLI se aplica solo a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway utilizan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación de habilidades de ClawHub.

Los paquetes compatibles participan en el mismo flujo de lista/inspección/habilitación/deshabilitación de complementos. El soporte de tiempo de ejecución actual incluye habilidades de paquete, habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`, Claude `.lsp.json` y valores predeterminados `lspServers` declarados en el manifiesto, habilidades de comandos de Cursor y directorios de enlace de Codex compatibles.

`openclaw plugins inspect <id>` también informa las capacidades del paquete detectadas, además de las entradas de servidor MCP y LSP admitidas o no admitidas para complementos respaldados por paquetes.

Las fuentes de Marketplace pueden ser un nombre de mercado conocido de Claude de `~/.claude/plugins/known_marketplaces.json`, una ruta raíz de marketplace local o `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio de GitHub o una URL de git. Para marketplaces remotos, las entradas de complementos deben permanecer dentro del repositorio del marketplace clonado y usar solo fuentes de ruta relativa.

Consulte la [referencia de la CLI de `openclaw plugins`](/es/cli/plugins) para obtener detalles completos.

## Resumen de la API de complementos

Los complementos nativos exportan un objeto de entrada que expone `register(api)`. Los complementos más antiguos aún pueden usar `activate(api)` como alias heredado, pero los nuevos complementos deben usar `register`.

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

OpenClaw carga el objeto de entrada y llama a `register(api)` durante la activación del complemento. El cargador todavía recurre a `activate(api)` para complementos más antiguos, pero los complementos empaquetados y los nuevos complementos externos deben tratar `register` como el contrato público.

`api.registrationMode` indica a un complemento por qué se está cargando su entrada:

| Modo            | Significado                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`          | Activación en tiempo de ejecución. Registre herramientas, enlaces, servicios, comandos, rutas y otros efectos secundarios en vivo.                                                       |
| `discovery`     | Descubrimiento de capacidades de solo lectura. Registre proveedores y metadatos; el código de entrada de complemento de confianza puede cargar, pero omitir efectos secundarios en vivo. |
| `setup-only`    | Carga de metadatos de configuración del canal a través de una entrada de configuración ligera.                                                                                           |
| `setup-runtime` | Carga de configuración del canal que también necesita la entrada de tiempo de ejecución.                                                                                                 |
| `cli-metadata`  | Solo recopilación de metadatos de comandos de CLI.                                                                                                                                       |

Las entradas de complemento que abren sockets, bases de datos, trabajadores en segundo plano o clientes de larga duración deben proteger esos efectos secundarios con `api.registrationMode === "full"`. Las cargas de descubrimiento se almacenan en caché por separado de las cargas de activación y no reemplazan el registro de Gateway en ejecución. El descubrimiento no es activador, no está libre de importaciones: OpenClaw puede evaluar la entrada de complemento de confianza o el módulo de complemento de canal para construir la instantánea. Mantenga los niveles superiores del módulo ligeros y sin efectos secundarios, y mueva los clientes de red, subprocesos, oyentes, lecturas de credenciales y el inicio de servicios detrás de rutas de tiempo de ejecución completo.

Métodos de registro comunes:

| Método                                  | Lo que registra                          |
| --------------------------------------- | ---------------------------------------- |
| `registerProvider`                      | Proveedor de modelos (LLM)               |
| `registerChannel`                       | Canal de chat                            |
| `registerTool`                          | Herramienta de agente                    |
| `registerHook` / `on(...)`              | Ganchos de ciclo de vida                 |
| `registerSpeechProvider`                | Conversión de texto a voz / STT          |
| `registerRealtimeTranscriptionProvider` | STT en flujo continuo                    |
| `registerRealtimeVoiceProvider`         | Voz en tiempo real dúplex                |
| `registerMediaUnderstandingProvider`    | Análisis de imagen/audio                 |
| `registerImageGenerationProvider`       | Generación de imágenes                   |
| `registerMusicGenerationProvider`       | Generación de música                     |
| `registerVideoGenerationProvider`       | Generación de video                      |
| `registerWebFetchProvider`              | Proveedor de recuperación/extracción web |
| `registerWebSearchProvider`             | Búsqueda web                             |
| `registerHttpRoute`                     | Punto final HTTP                         |
| `registerCommand` / `registerCli`       | Comandos de CLI                          |
| `registerContextEngine`                 | Motor de contexto                        |
| `registerService`                       | Servicio en segundo plano                |

Comportamiento de protección de gancho para ganchos de ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no operación y no borra un bloque anterior.
- `before_install`: `{ block: true }` es terminal; los controladores de menor prioridad se omiten.
- `before_install`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal; los controladores de menor prioridad se omiten.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación anterior.

El servidor de aplicaciones nativo de Codex ejecuta un puente que devuelve los eventos de herramientas nativas de Codex a esta superficie de enlace. Los complementos pueden bloquear herramientas nativas de Codex a través de `before_tool_call`, observar los resultados a través de `after_tool_call` y participar en las aprobaciones `PermissionRequest` de Codex. El puente aún no reescribe los argumentos de las herramientas nativas de Codex. El límite exacto de soporte del tiempo de ejecución de Codex se encuentra en el [contrato de soporte de Codex harness v1](/es/plugins/codex-harness#v1-support-contract).

Para obtener el comportamiento completo del enlace tipado, consulte [Descripción general del SDK](/es/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Crear complementos](/es/plugins/building-plugins) — crear su propio complemento
- [Paquetes de complementos](/es/plugins/bundles) — compatibilidad de paquetes Codex/Claude/Cursor
- [Manifiesto del complemento](/es/plugins/manifest) — esquema de manifiesto
- [Registrar herramientas](/es/plugins/building-plugins#registering-agent-tools) — agregar herramientas de agente en un complemento
- [Aspectos internos del complemento](/es/plugins/architecture) — modelo de capacidades y canalización de carga
- [Complementos comunitarios](/es/plugins/community) — listados de terceros
