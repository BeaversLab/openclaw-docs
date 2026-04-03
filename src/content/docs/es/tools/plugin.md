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

Los complementos amplían OpenClaw con nuevas capacidades: canales, proveedores de modelos, herramientas,
habilidades, voz, generación de imágenes y más. Algunos complementos son **core** (incluidos
con OpenClaw), otros son **externos** (publicados en npm por la comunidad).

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

## Tipos de complementos

OpenClaw reconoce dos formatos de complementos:

| Formato              | Cómo funciona                                                                 | Ejemplos                                               |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Nativo**           | `openclaw.plugin.json` + módulo de tiempo de ejecución; se ejecuta en proceso | Complementos oficiales, paquetes npm de la comunidad   |
| **Paquete (Bundle)** | Diseño compatible con Codex/Claude/Cursor; asignado a funciones de OpenClaw   | `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/` |

Ambos aparecen bajo `openclaw plugins list`. Consulte [Plugin Bundles](/en/plugins/bundles) para obtener detalles sobre los paquetes.

Si está escribiendo un complemento nativo, comience con [Building Plugins](/en/plugins/building-plugins)
y la [Plugin SDK Overview](/en/plugins/sdk-overview).

## Complementos oficiales

### Instalable (npm)

| Complemento     | Paquete                | Documentación                           |
| --------------- | ---------------------- | --------------------------------------- |
| Matriz          | `@openclaw/matrix`     | [Matrix](/en/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/en/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/en/channels/nostr)             |
| Llamada de voz  | `@openclaw/voice-call` | [Voice Call](/en/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/en/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/en/plugins/zalouser)   |

### Core (incluido con OpenClaw)

<AccordionGroup>
  <Accordion title="Model providers (enabled by default)">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

<Accordion title="Plugins de memoria">- `memory-core` — búsqueda de memoria incluida (predeterminado vía `plugins.slots.memory`) - `memory-lancedb` — memoria a largo plazo bajo demanda con recuperación/captura automática (establezca `plugins.slots.memory = "memory-lancedb"`)</Accordion>

<Accordion title="Proveedores de voz (habilitados de forma predeterminada)">`elevenlabs`, `microsoft`</Accordion>

  <Accordion title="Otros">
    - `browser` — complemento de navegador incluido para la herramienta de navegador, CLI `openclaw browser`, método de gateway `browser.request`, tiempo de ejecución del navegador y servicio de control de navegador predeterminado (habilitado de forma predeterminada; desactívelo antes de reemplazarlo)
    - `copilot-proxy` — puente VS Code Copilot Proxy (desactivado de forma predeterminada)
  </Accordion>
</AccordionGroup>

¿Busca complementos de terceros? Consulte [Community Plugins](/en/plugins/community).

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
| `allow`          | Lista blanca de plugins (opcional)                              |
| `deny`           | Lista negra de plugins (opcional; denegar gana)                 |
| `load.paths`     | Archivos/directorios de plugins adicionales                     |
| `slots`          | Selectores de ranura exclusivos (ej. `memory`, `contextEngine`) |
| `entries.\<id\>` | Interruptores + configuración por plugin                        |

Los cambios de configuración **requieren un reinicio de la puerta de enlace**. Si la puerta de enlace se está ejecutando con la vigilancia de configuración + el reinicio en proceso habilitados (la ruta predeterminada `openclaw gateway`), ese reinicio generalmente se realiza automáticamente un momento después de que se escribe la configuración.

<Accordion title="Estados de los complementos: deshabilitado vs. faltante vs. no válido">
  - **Deshabilitado**: el complemento existe pero las reglas de habilitación lo desactivaron. La configuración se conserva. - **Faltante**: la configuración hace referencia a un id de complemento que el descubrimiento no encontró. - **No válido**: el complemento existe pero su configuración no coincide con el esquema declarado.
</Accordion>

## Descubrimiento y precedencia

OpenClaw busca plugins en este orden (gana la primera coincidencia):

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

  <Step title="Bundled plugins">
    Incluidos con OpenClaw. Muchos están habilitados por defecto (proveedores de modelos, voz).
    Otros requieren habilitación explícita.
  </Step>
</Steps>

### Reglas de habilitación

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana sobre permitir
- `plugins.entries.\<id\>.enabled: false` deshabilita ese complemento
- Los complementos originados en el espacio de trabajo están **deshabilitados por defecto** (deben ser habilitados explícitamente)
- Los complementos incluidos siguen el conjunto predeterminado de activación incorporado a menos que se anule
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

| Ranura          | Lo que controla               | Predeterminado       |
| --------------- | ----------------------------- | -------------------- |
| `memory`        | Complemento de memoria activa | `memory-core`        |
| `contextEngine` | Motor de contexto activo      | `legacy` (integrado) |

## Referencia de CLI

```bash
openclaw plugins list                    # compact inventory
openclaw plugins inspect <id>            # deep detail
openclaw plugins inspect <id> --json     # machine-readable
openclaw plugins status                  # operational summary
openclaw plugins doctor                  # diagnostics

openclaw plugins install <package>        # install (ClawHub first, then npm)
openclaw plugins install clawhub:<pkg>   # install from ClawHub only
openclaw plugins install <path>          # install from local path
openclaw plugins install -l <path>       # link (no copy) for dev
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id>             # update one plugin
openclaw plugins update --all            # update all

openclaw plugins enable <id>
openclaw plugins disable <id>
```

`--dangerously-force-unsafe-install` es una anulación de emergencia para falsos
positivos del escáner de código peligroso integrado. Permite que las instalaciones
continúen más allá de los hallazgos `critical` integrados, pero aún no omite los bloques
de política `before_install` del complemento ni el bloqueo por fallo de escaneo.

Este indicador de CLI se aplica solo a las instalaciones de complementos. Las instalaciones
de dependencias de habilidades respaldadas por la puerta de enlace usan la anulación de
solicitud `dangerouslyForceUnsafeInstall` coincidente, mientras que `openclaw skills install` sigue siendo el flujo separado de descarga/instalación
de habilidades de ClawHub.

Consulte la [referencia de la CLI `openclaw plugins`](/en/cli/plugins) para obtener detalles completos.

## Resumen de la API de complementos

Los complementos exportan una función o un objeto con `register(api)`:

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

Métodos de registro comunes:

| Método                               | Lo que registra            |
| ------------------------------------ | -------------------------- |
| `registerProvider`                   | Proveedor de modelos (LLM) |
| `registerChannel`                    | Canal de chat              |
| `registerTool`                       | Herramienta de agente      |
| `registerHook` / `on(...)`           | Ganchos del ciclo de vida  |
| `registerSpeechProvider`             | Texto a voz / STT          |
| `registerMediaUnderstandingProvider` | Análisis de imagen/audio   |
| `registerImageGenerationProvider`    | Generación de imágenes     |
| `registerWebSearchProvider`          | Búsqueda web               |
| `registerHttpRoute`                  | Endpoint HTTP              |
| `registerCommand` / `registerCli`    | Comandos CLI               |
| `registerContextEngine`              | Motor de contexto          |
| `registerService`                    | Servicio en segundo plano  |

Comportamiento del guarda de gancho para ganchos del ciclo de vida tipados:

- `before_tool_call`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_tool_call`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `before_install`: `{ block: true }` es terminal; se omiten los controladores de menor prioridad.
- `before_install`: `{ block: false }` es una no-op y no borra un bloque anterior.
- `message_sending`: `{ cancel: true }` es terminal; se omiten los controladores de menor prioridad.
- `message_sending`: `{ cancel: false }` es una no-op y no borra una cancelación anterior.

Para obtener el comportamiento completo de los ganchos tipados, consulte [Información general del SDK](/en/plugins/sdk-overview#hook-decision-semantics).

## Relacionado

- [Creación de complementos](/en/plugins/building-plugins) — crea tu propio complemento
- [Paquetes de complementos](/en/plugins/bundles) — compatibilidad con paquetes Codex/Claude/Cursor
- [Manifiesto del complemento](/en/plugins/manifest) — esquema de manifiesto
- [Registro de herramientas](/en/plugins/building-plugins#registering-agent-tools) — agregar herramientas de agente en un complemento
- [Aspectos internos del complemento](/en/plugins/architecture) — modelo de capacidad y canalización de carga
- [Complementos comunitarios](/en/plugins/community) — listados de terceros
