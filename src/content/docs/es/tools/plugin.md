---
summary: "Instala, configura y gestiona los complementos de OpenClaw"
read_when:
  - Installing or configuring plugins
  - Understanding plugin discovery and load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
sidebarTitle: "Instalar y configurar"
---

# Complementos

Los complementos amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos,
herramientas, habilidades, voz, transcripción en tiempo real, voz en tiempo real,
comprensión de medios, generación de imágenes, generación de video, obtención web, búsqueda
web y más. Algunos complementos son **principales** (incluidos con OpenClaw), otros
son **externos** (publicados en npm por la comunidad).

## Inicio rápido

<Steps>
  <Step title="Ver lo que está cargado">
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

La ruta de instalación utiliza el mismo resolutor que la CLI: ruta/archivo local, `clawhub:<pkg>` explícito, o especificación de paquete simple (primero ClawHub, luego respaldo npm).

Si la configuración no es válida, la instalación normalmente falla de forma segura y le señala `openclaw doctor --fix`. La única excepción de recuperación es una ruta estrecha de reinstalación de complementos agrupados para complementos que optan por `openclaw.install.allowInvalidConfigRecovery`.

## Tipos de complementos

OpenClaw reconoce dos formatos de complementos:

| Formato              | Cómo funciona                                                                 | Ejemplos                                               |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Nativo**           | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en proceso | Complementos oficiales, paquetes npm de la comunidad   |
| **Paquete (Bundle)** | Diseño compatible con Codex/Claude/Cursor; asignado a funciones de OpenClaw   | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Ambos aparecen bajo `openclaw plugins list`. Consulte [Plugin Bundles](/es/plugins/bundles) para obtener detalles sobre los paquetes.

Si está escribiendo un complemento nativo, comience con [Building Plugins](/es/plugins/building-plugins)
y la [Plugin SDK Overview](/es/plugins/sdk-overview).

## Complementos oficiales

### Instalables (npm)

| Complemento     | Paquete                | Documentos                              |
| --------------- | ---------------------- | --------------------------------------- |
| Matriz          | `@openclaw/matrix`     | [Matrix](/es/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/es/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/es/channels/nostr)             |
| Llamada de voz  | `@openclaw/voice-call` | [Voice Call](/es/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/es/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/es/plugins/zalouser)   |

### Core (incluido con OpenClaw)

<AccordionGroup>
  <Accordion title="Proveedores de modelos (habilitados por defecto)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de memoria">- `memory-core` — búsqueda de memoria incluida (por defecto a través de `plugins.slots.memory`) - `memory-lancedb` — memoria a largo plazo bajo demanda con recuperación/captura automática (establecer `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Proveedores de voz (habilitados por defecto)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Otros">
    - `browser` — plugin de navegador incluido para la herramienta de navegador, `openclaw browser` CLI, método de puerta de enlace `browser.request`, tiempo de ejecución del navegador y servicio de control de navegador predeterminado (habilitado por defecto; desactivar antes de reemplazarlo)
    - `copilot-proxy` — puente VS Code Copilot Proxy (desactivado por defecto)
  </Accordion>
</AccordionGroup>

¿Buscas plugins de terceros? Consulta [Community Plugins](/es/plugins/community).

## Configuración

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| Campo            | Descripción                                                     |
| ---------------- | --------------------------------------------------------------- |
| `enabled`        | Interruptor maestro (predeterminado: `true`)                    |
| `allow`          | Lista de permitidos de plugins (opcional)                       |
| `deny`           | Lista de bloqueados de plugins (opcional; denegar gana)         |
| `load.paths`     | Archivos/directorios de plugins adicionales                     |
| `slots`          | Selectores de ranura exclusivos (ej. `memory`, `contextEngine`) |
| `entries.\<id\>` | Interruptores y configuración por plugin                        |

Los cambios en la configuración **requieren un reinicio del gateway**. Si el Gateway se está ejecutando con vigilancia de configuración + reinicio en proceso habilitado (la ruta predeterminada `openclaw gateway`), ese reinicio generalmente se realiza automáticamente un momento después de que se escribe la configuración.

<Accordion title="Plugin states: disabled vs missing vs invalid">- **Disabled**: el plugin existe pero las reglas de habilitación lo desactivaron. La configuración se conserva. - **Missing**: la configuración hace referencia a un id de plugin que el descubrimiento no encontró. - **Invalid**: el plugin existe pero su configuración no coincide con el esquema declarado.</Accordion>

## Descubrimiento y precedencia

OpenClaw busca plugins en este orden (gana la primera coincidencia):

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` — rutas explícitas de archivo o directorio.
  </Step>

  <Step title="Workspace extensions">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` y `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global extensions">
    `~/.openclaw/<plugin-root>/*.ts` y `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Bundled plugins">
    Incluidos con OpenClaw. Muchos están habilitados de forma predeterminada (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los plugins
- `plugins.deny` siempre gana sobre permitir
- `plugins.entries.\<id\>.enabled: false` deshabilita ese plugin
- Los plugins de origen del espacio de trabajo están **deshabilitados de forma predeterminada** (deben habilitarse explícitamente)
- Los plugins empaquetados siguen el conjunto de activación predeterminado integrado a menos que se anulen
- Los slots exclusivos pueden forzar la activación del complemento seleccionado para ese slot

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

| Slot            | Lo que controla               | Predeterminado       |
| --------------- | ----------------------------- | -------------------- |
| `memory`        | Complemento de memoria activa | `memory-core`        |
| `contextEngine` | Motor de contexto activo      | `legacy` (integrado) |

## Referencia de CLI

```bash
openclaw plugins list                       # compact inventory
openclaw plugins list --enabled            # only loaded plugins
openclaw plugins list --verbose            # per-plugin detail lines
openclaw plugins list --json               # machine-readable inventory
openclaw plugins inspect <id>              # deep detail
openclaw plugins inspect <id> --json       # machine-readable
openclaw plugins inspect --all             # fleet-wide table
openclaw plugins info <id>                 # inspect alias
openclaw plugins doctor                    # diagnostics

openclaw plugins install <package>         # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>     # install from ClawHub only
openclaw plugins install <spec> --force    # overwrite existing install
openclaw plugins install <path>            # install from local path
openclaw plugins install -l <path>         # link (no copy) for dev
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # record exact resolved npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update <id> --dangerously-force-unsafe-install
openclaw plugins update --all            # update all
openclaw plugins uninstall <id>          # remove config/install records
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

Los complementos incluidos se distribuyen con OpenClaw. Muchos están activados por defecto (por ejemplo,
los proveedores de modelos incluidos, los proveedores de voz incluidos y el complemento del
navegador incluido). Otros complementos incluidos todavía necesitan `openclaw plugins enable <id>`.

`--force` sobrescribe un complemento o paquete de hook instalado existente en su lugar.
No es compatible con `--link`, que reutiliza la ruta de origen en lugar de
copiar sobre un destino de instalación gestionado.

`--pin` es solo para npm. No es compatible con `--marketplace`, porque
las instalaciones del marketplace persisten los metadatos de origen del marketplace en lugar de una especificación npm.

`--dangerously-force-unsafe-install` es una anulación de emergencia para los falsos
positivos del escáner de código peligroso integrado. Permite que las instalaciones y
actualizaciones de complementos continúen más allá de los hallazgos integrados de `critical`, pero aún
no evita los bloqueos de política de `before_install` del complemento ni el bloqueo por fallo de escaneo.

Este indicador de CLI se aplica solo a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` correspondiente
en su lugar, mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación de habilidades de ClawHub.

Los paquetes compatibles participan en el mismo flujo de lista/inspección/activación/desactivación
de complementos. El soporte de tiempo de ejecución actual incluye habilidades de paquete, habilidades de comandos de Claude,
predeterminados de `settings.json` de Claude, `.lsp.json` de Claude y
predeterminados `lspServers` declarados en el manifiesto, habilidades de comandos de Cursor y directorios de hook de Codex compatibles.

`openclaw plugins inspect <id>` también informa las capacidades del paquete detectadas además de
las entradas de servidor MCP y LSP compatibles o no compatibles para complementos respaldados por paquetes.

Las fuentes del marketplace pueden ser un nombre de marketplace conocido por Claude de
`~/.claude/plugins/known_marketplaces.json`, una raíz de marketplace local o una ruta `marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de repositorio
de GitHub, o una URL de git. Para marketplaces remotos, las entradas de plugins deben permanecer dentro del
repositorio del marketplace clonado y usar solo fuentes de ruta relativa.

Consulte la [referencia de la CLI de `openclaw plugins`](/es/cli/plugins) para obtener detalles completos.

## Resumen de la API de plugins

Los plugins nativos exportan un objeto de entrada que expone `register(api)`. Los plugins
antiguos aún pueden usar `activate(api)` como un alias heredado, pero los nuevos plugins deben
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
activación del plugin. El cargador aún recurre a `activate(api)` para plugins antiguos,
pero los plugins empaquetados y los nuevos plugins externos deben tratar `register` como el
contrato público.

Métodos de registro comunes:

| Método                                  | Lo que registra                       |
| --------------------------------------- | ------------------------------------- |
| `registerProvider`                      | Proveedor de modelo (LLM)             |
| `registerChannel`                       | Canal de chat                         |
| `registerTool`                          | Herramienta de agente                 |
| `registerHook` / `on(...)`              | Ganchos del ciclo de vida             |
| `registerSpeechProvider`                | Conversión de texto a voz / STT       |
| `registerRealtimeTranscriptionProvider` | STT en streaming                      |
| `registerRealtimeVoiceProvider`         | Voz en tiempo real dúplex             |
| `registerMediaUnderstandingProvider`    | Análisis de imagen/audio              |
| `registerImageGenerationProvider`       | Generación de imágenes                |
| `registerMusicGenerationProvider`       | Generación de música                  |
| `registerVideoGenerationProvider`       | Generación de video                   |
| `registerWebFetchProvider`              | Proveedor de obtención/extracción web |
| `registerWebSearchProvider`             | Búsqueda web                          |
| `registerHttpRoute`                     | Endpoint HTTP                         |
| `registerCommand` / `registerCli`       | Comandos de CLI                       |
| `registerContextEngine`                 | Motor de contexto                     |
| `registerService`                       | Servicio en segundo plano             |

Comportamiento de guarda de enlace para ganchos de ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; los controladores de menor prioridad se omiten.
- `before_tool_call`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `before_install`: `{ block: true }` es terminal; los controladores de menor prioridad se omiten.
- `before_install`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal; los controladores de menor prioridad se omiten.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación anterior.

Para conocer el comportamiento completo de los hooks con tipos, consulte [SDK Overview](/es/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Building Plugins](/es/plugins/building-plugins) — crea tu propio complemento
- [Plugin Bundles](/es/plugins/bundles) — compatibilidad de paquetes Codex/Claude/Cursor
- [Plugin Manifest](/es/plugins/manifest) — esquema de manifiesto
- [Registering Tools](/es/plugins/building-plugins#registering-agent-tools) — añadir herramientas de agente en un complemento
- [Plugin Internals](/es/plugins/architecture) — modelo de capacidades y canalización de carga
- [Community Plugins](/es/plugins/community) — listados de terceros
