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
  <Step title="See what is loaded">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="Instala un complemento">
    ```bash
    # From npm
    openclaw plugins install @openclaw/voice-call

    # From a local directory or archive
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="Reinicia el Gateway">
    ```bash
    openclaw gateway restart
    ```

    Luego configura bajo `plugins.entries.\<id\>.config` en tu archivo de configuración.

  </Step>
</Steps>

Si prefieres un control nativo del chat, habilita `commands.plugins: true` y usa:

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

La ruta de instalación utiliza el mismo resolutor que la CLI: ruta/archivo local, `clawhub:<pkg>` explícito,
o especificación de paquete simple (ClawHub primero, luego respaldo a npm).

Si la configuración no es válida, la instalación normalmente falla de forma segura y le indica
`openclaw doctor --fix`. La única excepción de recuperación es una ruta estrecha de reinstalación
de complemento agrupado para complementos que optan por
`openclaw.install.allowInvalidConfigRecovery`.

## Tipos de complementos

OpenClaw reconoce dos formatos de complementos:

| Formato              | Cómo funciona                                                                     | Ejemplos                                               |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Nativo**           | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en proceso     | Complementos oficiales, paquetes npm de la comunidad   |
| **Paquete (Bundle)** | Diseño compatible con Codex/Claude/Cursor; asignado a características de OpenClaw | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Ambos aparecen en `openclaw plugins list`. Consulte [Plugin Bundles](/en/plugins/bundles) para obtener detalles sobre los paquetes.

Si está escribiendo un complemento nativo, comience con [Building Plugins](/en/plugins/building-plugins)
y [Plugin SDK Overview](/en/plugins/sdk-overview).

## Complementos oficiales

### Instalable (npm)

| Complemento     | Paquete                | Documentos                              |
| --------------- | ---------------------- | --------------------------------------- |
| Matriz          | `@openclaw/matrix`     | [Matrix](/en/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/en/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/en/channels/nostr)             |
| Llamada de voz  | `@openclaw/voice-call` | [Voice Call](/en/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/en/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/en/plugins/zalouser)   |

### Principal (incluido con OpenClaw)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de memoria">- `memory-core` — búsqueda de memoria incluida (predeterminado a través de `plugins.slots.memory`) - `memory-lancedb` — memoria a largo plazo instalable bajo demanda con recuperación/captura automática (establecer `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Proveedores de voz (habilitados de forma predeterminada)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Otros">
    - `browser` — complemento de navegador incluido para la herramienta del navegador, CLI `openclaw browser`, método de puerta de enlace `browser.request`, tiempo de ejecución del navegador y servicio de control del navegador predeterminado (habilitado de forma predeterminada; desactívelo antes de reemplazarlo)
    - `copilot-proxy` — puente de proxy de VS Code Copilot (desactivado de forma predeterminada)
  </Accordion>
</AccordionGroup>

¿Buscas complementos de terceros? Consulta [Complementos de la comunidad](/en/plugins/community).

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

| Campo            | Descripción                                                    |
| ---------------- | -------------------------------------------------------------- |
| `enabled`        | Interruptor maestro (predeterminado: `true`)                   |
| `allow`          | Lista de permitidos de complementos (opcional)                 |
| `deny`           | Lista de bloqueados de complementos (opcional; denegar gana)   |
| `load.paths`     | Archivos/directorios de complementos adicionales               |
| `slots`          | Selectores de ranura exclusiva (ej. `memory`, `contextEngine`) |
| `entries.\<id\>` | Interruptores por complemento + configuración                  |

Los cambios en la configuración **requieren un reinicio de la puerta de enlace**. Si la puerta de enlace se está ejecutando con vigilancia de configuración + reinicio en proceso habilitado (la ruta predeterminada `openclaw gateway`), ese reinicio generalmente se realiza automáticamente un momento después de que se escribe la configuración.

<Accordion title="Estados de los complementos: desactivado vs. faltante vs. no válido">
  - **Desactivado**: el complemento existe pero las reglas de habilitación lo desactivaron. La configuración se conserva. - **Faltante**: la configuración hace referencia a un id de complemento que el descubrimiento no encontró. - **No válido**: el complemento existe pero su configuración no coincide con el esquema declarado.
</Accordion>

## Descubrimiento y precedencia

OpenClaw escanea los complementos en este orden (gana la primera coincidencia):

<Steps>
  <Step title="Rutas de configuración">
    `plugins.load.paths` — rutas explícitas de archivo o directorio.
  </Step>

  <Step title="Extensiones del espacio de trabajo">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` y `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Extensiones globales">
    `~/.openclaw/<plugin-root>/*.ts` y `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Complementos incluidos">
    Enviados con OpenClaw. Muchos están habilitados de forma predeterminada (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana a permitir
- `plugins.entries.\<id\>.enabled: false` deshabilita ese complemento
- Los complementos originados en el espacio de trabajo están **deshabilitados de forma predeterminada** (deben habilitarse explícitamente)
- Los complementos incluidos siguen el conjunto predeterminado incorporado a menos que se anulen
- Las ranuras exclusivas pueden forzar la habilitación del complemento seleccionado para esa ranura

## Ranuras de complementos (categorías exclusivas)

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

| Ranura          | Lo que controla               | Predeterminado         |
| --------------- | ----------------------------- | ---------------------- |
| `memory`        | Complemento de memoria activa | `memory-core`          |
| `contextEngine` | Motor de contexto activo      | `legacy` (incorporado) |

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

Los complementos incluidos se envían con OpenClaw. Muchos están habilitados de forma predeterminada (por ejemplo,
proveedores de modelos incluidos, proveedores de voz incluidos y el complemento del navegador
incluido). Otros complementos incluidos aún necesitan `openclaw plugins enable <id>`.

`--force` sobrescribe un complemento o paquete de gancho instalado existente en su lugar.
No es compatible con `--link`, que reutiliza la ruta de origen en lugar de
copiar sobre un objetivo de instalación administrado.

`--pin` es solo para npm. No es compatible con `--marketplace`, porque
las instalaciones del mercado mantienen los metadatos de origen del mercado en lugar de una especificación de npm.

`--dangerously-force-unsafe-install` es una anulación de emergencia para los falsos
positivos del escáner de código peligroso integrado. Permite que las instalaciones
y actualizaciones de complementos continúen a pesar de los hallazgos de
`critical` integrados, pero todavía
no evita los bloqueos de política de `before_install` del complemento o el bloqueo por fallo de escaneo.

Este indicador de CLI se aplica solo a los flujos de instalación/actualización de complementos. Las instalaciones de dependencias de habilidades respaldadas por Gateway utilizan la anulación de solicitud `dangerouslyForceUnsafeInstall` coincidente,
mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación
de habilidades de ClawHub.

Los paquetes compatibles participan en el mismo flujo de lista/inspección/habilitación/deshabilitación
de complementos. El soporte de tiempo de ejecución actual incluye habilidades de paquete,
habilidades de comandos de Claude, valores predeterminados de Claude `settings.json`,
Claude `.lsp.json` y valores predeterminados `lspServers`
declarados en el manifiesto, habilidades de comandos de Cursor y directorios de gancho de Codex compatibles.

`openclaw plugins inspect <id>` también informa las capacidades del paquete detectadas, además
de las entradas de servidor MCP y LSP compatibles o no compatibles para complementos respaldados por paquetes.

Las fuentes del mercado pueden ser un nombre de mercado conocido de Claude desde
`~/.claude/plugins/known_marketplaces.json`, una ruta raíz de mercado local o
`marketplace.json`, una abreviatura de GitHub como `owner/repo`,
una URL de repositorio de GitHub o una URL de git. Para los mercados remotos, las entradas de complementos deben permanecer dentro del
repositorio de mercado clonado y usar solo fuentes de ruta relativa.

Consulte la [Referencia de CLI de `openclaw plugins`](/en/cli/plugins) para obtener detalles completos.

## Resumen de la API de complementos

Los complementos nativos exportan un objeto de entrada que expone `register(api)`. Los
complementos antiguos aún pueden usar `activate(api)` como un alias heredado, pero los nuevos complementos deben
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
activación del complemento. El cargador todavía recurre a `activate(api)` para complementos antiguos,
pero los complementos empaquetados y los nuevos complementos externos deben tratar `register` como el
contrato público.

Métodos de registro comunes:

| Método                                  | Lo que registra                          |
| --------------------------------------- | ---------------------------------------- |
| `registerProvider`                      | Proveedor de modelos (LLM)               |
| `registerChannel`                       | Canal de chat                            |
| `registerTool`                          | Herramienta de agente                    |
| `registerHook` / `on(...)`              | Ganchos del ciclo de vida                |
| `registerSpeechProvider`                | Texto a voz / STT                        |
| `registerRealtimeTranscriptionProvider` | STT en streaming                         |
| `registerRealtimeVoiceProvider`         | Voz en tiempo real dúplex                |
| `registerMediaUnderstandingProvider`    | Análisis de imagen/audio                 |
| `registerImageGenerationProvider`       | Generación de imágenes                   |
| `registerMusicGenerationProvider`       | Generación de música                     |
| `registerVideoGenerationProvider`       | Generación de video                      |
| `registerWebFetchProvider`              | Proveedor de recuperación/extracción web |
| `registerWebSearchProvider`             | Búsqueda web                             |
| `registerHttpRoute`                     | Endpoint HTTP                            |
| `registerCommand` / `registerCli`       | Comandos de CLI                          |
| `registerContextEngine`                 | Motor de contexto                        |
| `registerService`                       | Servicio en segundo plano                |

Comportamiento de protección de gancho para ganchos del ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `before_install`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal; se omiten los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación anterior.

Para obtener el comportamiento completo de los ganchos tipados, consulte [SDK Overview](/en/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Building Plugins](/en/plugins/building-plugins) — crear tu propio complemento
- [Plugin Bundles](/en/plugins/bundles) — compatibilidad de paquetes Codex/Claude/Cursor
- [Plugin Manifest](/en/plugins/manifest) — esquema de manifiesto
- [Registering Tools](/en/plugins/building-plugins#registering-agent-tools) — agregar herramientas de agente en un complemento
- [Internos del complemento](/en/plugins/architecture) — modelo de capacidades y canalización de carga
- [Complementos de la comunidad](/en/plugins/community) — listados de terceros
