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

Las instalaciones empaquetadas de OpenClaw no instalan ansiosamente el árbol de dependencias de tiempo de ejecución de cada complemento incluido. Cuando un complemento incluido de propiedad de OpenClaw está activo desde la configuración del complemento, la configuración heredada del canal o un manifiesto habilitado de forma predeterminada, el inicio repara solo las dependencias de tiempo de ejecución declaradas de ese complemento antes de importarlo. Los complementos externos y las rutas de carga personalizadas aún deben instalarse a través de `openclaw plugins install`.

## Tipos de complementos

OpenClaw reconoce dos formatos de complementos:

| Formato     | Cómo funciona                                                                    | Ejemplos                                               |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Nativo**  | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en el proceso | Complementos oficiales, paquetes npm de la comunidad   |
| **Paquete** | Diseño compatible con Codex/Claude/Cursor; asignado a funciones de OpenClaw      | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Ambos aparecen bajo `openclaw plugins list`. Consulte [Plugin Bundles](/es/plugins/bundles) para obtener detalles sobre los paquetes.

Si está escribiendo un complemento nativo, comience con [Building Plugins](/es/plugins/building-plugins)
y la [Plugin SDK Overview](/es/plugins/sdk-overview).

## Complementos oficiales

### Instalable (npm)

| Complemento     | Paquete                | Documentos                              |
| --------------- | ---------------------- | --------------------------------------- |
| Matriz          | `@openclaw/matrix`     | [Matrix](/es/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/es/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/es/channels/nostr)             |
| Llamada de voz  | `@openclaw/voice-call` | [Voice Call](/es/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/es/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/es/plugins/zalouser)   |

### Core (enviado con OpenClaw)

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
    - `browser` — plugin de navegador incluido para la herramienta de navegador, CLI `openclaw browser`, método de puerta de enlace `browser.request`, tiempo de ejecución del navegador y servicio de control de navegador predeterminado (habilitado por defecto; desactívelo antes de reemplazarlo)
    - `copilot-proxy` — puente VS Code Copilot Proxy (desactivado por defecto)
  </Accordion>
</AccordionGroup>

¿Buscas plugins de terceros? Consulte [Plugins de la comunidad](/es/plugins/community).

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

| Campo            | Descripción                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `enabled`        | Interruptor maestro (predeterminado: `true`)                     |
| `allow`          | Lista blanca de plugins (opcional)                               |
| `deny`           | Lista negra de plugins (opcional; denegar gana)                  |
| `load.paths`     | Archivos/directorios de plugins adicionales                      |
| `slots`          | Selectores de ranuras exclusivas (ej. `memory`, `contextEngine`) |
| `entries.\<id\>` | Interruptores + config por plugin                                |

Los cambios en la configuración **requieren un reinicio de la puerta de enlace**. Si la Puerta de enlace se está ejecutando con vigilancia de configuración + reinicio en proceso habilitado (la ruta predeterminada `openclaw gateway`), ese reinicio generalmente se realiza automáticamente un momento después de que se escribe la configuración.

<Accordion title="Estados de los plugins: deshabilitado vs. faltante vs. no válido">
  - **Deshabilitado**: el plugin existe pero las reglas de habilitación lo desactivaron. La configuración se conserva. - **Faltante**: la configuración hace referencia a un id de plugin que el descubrimiento no encontró. - **No válido**: el plugin existe pero su configuración no coincide con el esquema declarado.
</Accordion>

## Descubrimiento y precedencia

OpenClaw escanea los plugins en este orden (gana la primera coincidencia):

<Steps>
  <Step title="Rutas de configuración">
    `plugins.load.paths` — rutas de archivos explícitas o directorios.
  </Step>

  <Step title="Extensiones del espacio de trabajo">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` y `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Extensiones globales">
    `~/.openclaw/<plugin-root>/*.ts` y `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Plugins incluidos">
    Enviados con OpenClaw. Muchos están habilitados de forma predeterminada (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los plugins
- `plugins.deny` siempre gana sobre permitir
- `plugins.entries.\<id\>.enabled: false` deshabilita ese plugin
- Los plugins originados en el espacio de trabajo están **deshabilitados de forma predeterminada** (deben estar habilitados explícitamente)
- Los plugins incluidos siguen el conjunto de activación predeterminado integrado a menos que se anulen
- Las ranuras exclusivas pueden forzar la habilitación del plugin seleccionado para esa ranura

## Ranuras de plugins (categorías exclusivas)

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

| Ranura          | Lo que controla          | Predeterminado       |
| --------------- | ------------------------ | -------------------- |
| `memory`        | Plugin de memoria activa | `memory-core`        |
| `contextEngine` | Motor de contexto activo | `legacy` (integrado) |

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

Los plugins empaquetados se envían con OpenClaw. Muchos están habilitados de manera predeterminada (por ejemplo,
los proveedores de modelos empaquetados, los proveedores de voz empaquetados y el plugin de navegador
empaquetado). Otros plugins empaquetados aún necesitan `openclaw plugins enable <id>`.

`--force` sobrescribe un plugin instalado o un paquete de hooks existente en su lugar.
No es compatible con `--link`, que reutiliza la ruta de origen en lugar de
copiar sobre un destino de instalación administrado.

`--pin` es solo para npm. No es compatible con `--marketplace`, porque
las instalaciones del mercado persisten en los metadatos de origen del mercado en lugar de una especificación npm.

`--dangerously-force-unsafe-install` es una anulación de emergencia para falsos
positivos del escáner de código peligroso integrado. Permite que las instalaciones y
actualizaciones de plugins continúen más allá de los hallazgos de `critical` integrados, pero aun así
no evita los bloqueos de política de plugin `before_install` ni el bloqueo por fallas de escaneo.

Esta bandera de CLI se aplica solo a los flujos de instalación/actualización de plugins. Las instalaciones de
dependencias de habilidades respaldadas por Gateway usan la anulación de solicitud `dangerouslyForceUnsafeInstall` correspondiente,
mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación de habilidades de ClawHub.

Los paquetes compatibles participan en el mismo flujo de lista/inspección/habilitación/deshabilitación de plugins.
El soporte de tiempo de ejecución actual incluye habilidades de paquetes, habilidades de comandos de Claude,
valores predeterminados de `settings.json` de Claude, `.lsp.json` de Claude y valores predeterminados
`lspServers` declarados en el manifiesto, habilidades de comandos de Cursor y directorios de hooks de Codex compatibles.

`openclaw plugins inspect <id>` también informa las capacidades de paquete detectadas, además
de las entradas de servidor MCP y LSP compatibles o no compatibles para los plugins respaldados por paquetes.

Las fuentes del marketplace pueden ser un nombre de marketplace conocido por Claude de
`~/.claude/plugins/known_marketplaces.json`, una ruta raíz de un marketplace local o
`marketplace.json`, una abreviatura de GitHub como `owner/repo`, una URL de
repositorio de GitHub o una URL de git. Para marketplaces remotos, las entradas de plugins deben permanecer dentro del
repositorio del marketplace clonado y usar solo fuentes de ruta relativa.

Consulte la [referencia de la CLI de `openclaw plugins`](/es/cli/plugins) para obtener detalles completos.

## Resumen de la API de Plugins

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
activación del plugin. El cargador todavía recurre a `activate(api)` para los plugins antiguos,
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
| `registerRealtimeTranscriptionProvider` | STT en tiempo real (streaming)        |
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

Comportamiento de guardia de enlace para ganchos de ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una operación nula y no borra un bloque anterior.
- `before_install`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una operación nula y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal; se omiten los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una operación nula y no borra una cancelación anterior.

Para obtener el comportamiento completo del hook tipado, consulte [Resumen del SDK](/es/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Crear Plugins](/es/plugins/building-plugins) — crear tu propio plugin
- [Paquetes de Plugins](/es/plugins/bundles) — compatibilidad de paquetes Codex/Claude/Cursor
- [Manifiesto del Plugin](/es/plugins/manifest) — esquema del manifiesto
- [Registrar Herramientas](/es/plugins/building-plugins#registering-agent-tools) — agregar herramientas de agente en un plugin
- [Aspectos Internos del Plugin](/es/plugins/architecture) — modelo de capacidad y canalización de carga
- [Plugins de la Comunidad](/es/plugins/community) — listados de terceros
