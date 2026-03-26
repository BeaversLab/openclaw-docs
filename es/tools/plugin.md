---
summary: "Plugins/extensions de OpenClaw: descubrimiento, configuración y seguridad"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
  - Working with Codex/Claude-compatible plugin bundles
title: "Plugins"
---

# Plugins (Extensiones)

## Inicio rápido

Un plugin es:

- un **plugin nativo de OpenClaw** (`openclaw.plugin.json` + módulo de tiempo de ejecución), o
- un **paquete** compatible (`.codex-plugin/plugin.json` o `.claude-plugin/plugin.json`)

Ambos aparecen en `openclaw plugins`, pero solo los plugins nativos de OpenClaw ejecutan
código de tiempo de ejecución en proceso.

1. Ver lo que ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Voice Call):

```bash
openclaw plugins install @openclaw/voice-call
```

Las especificaciones de Npm son solo de registro. Consulte las [reglas de instalación](/es/cli/plugins#install) para
obtener detalles sobre el anclaje, el bloqueo de versión preliminar y los formatos de especificación admitidos.

3. Reinicie el Gateway y luego configure en `plugins.entries.<id>.config`.

Consulte [Voice Call](/es/plugins/voice-call) para ver un ejemplo concreto de plugin.
¿Busca listados de terceros? Consulte [Complementos de la comunidad](/es/plugins/community).
¿Necesita los detalles de compatibilidad de los paquetes? Consulte [Paquetes de complementos](/es/plugins/bundles).

Para paquetes compatibles, instale desde un directorio local o un archivo:

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Para las instalaciones del mercado de Claude, enumere primero el mercado y luego instale por
nombre de entrada del mercado:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw resuelve los nombres conocidos del mercado de Claude desde
`~/.claude/plugins/known_marketplaces.json`. También puede pasar una fuente
explícita del mercado con `--marketplace`.

## Plugins disponibles (oficiales)

### Plugins instalables

Estos se publican en npm y se instalan con `openclaw plugins install`:

| Plugin          | Paquete                | Documentos                              |
| --------------- | ---------------------- | --------------------------------------- |
| Matrix          | `@openclaw/matrix`     | [Matrix](/es/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/es/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/es/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/es/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/es/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/es/plugins/zalouser)   |

Microsoft Teams es solo un plugin a partir del 15.1.2026.

Las instalaciones empaquetadas también incluyen metadatos de instalación bajo demanda para complementos oficiales pesados. Actualmente, esto incluye WhatsApp y `memory-lancedb`: incorporación, `openclaw channels add`, `openclaw channels login --channel whatsapp`, y otros flujos de configuración de canales que solicitan instalarlos cuando se usan por primera vez en lugar de enviar sus árboles de tiempo de ejecución completos dentro del archivo tar principal de npm.

### Complementos incluidos

Estos se envían con OpenClaw y están habilitados de forma predeterminada a menos que se indique lo contrario.

**Memoria:**

- `memory-core` -- búsqueda de memoria incluida (predeterminado a través de `plugins.slots.memory`)
- `memory-lancedb` -- memoria a largo plazo instalable bajo demanda con recuperación/captura automática (establecer `plugins.slots.memory = "memory-lancedb"`)

**Proveedores de modelos** (todos habilitados de forma predeterminada):

`anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`, `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `modelstudio`, `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`, `qianfan`, `qwen-portal-auth`, `synthetic`, `together`, `venice`, `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`

**Proveedores de voz** (habilitados de forma predeterminada):

`elevenlabs`, `microsoft`

**Otros incluidos:**

- `copilot-proxy` -- puente proxy de VS Code Copilot (deshabilitado de forma predeterminada)

## Paquetes compatibles

OpenClaw también reconoce diseños de paquetes externos compatibles:

- Paquetes estilo Codex: `.codex-plugin/plugin.json`
- Paquetes estilo Claude: `.claude-plugin/plugin.json` o el diseño de componentes predeterminado de Claude
  sin manifiesto
- Paquetes estilo Cursor: `.cursor-plugin/plugin.json`

Se muestran en la lista de complementos como `format=bundle`, con un subtipo de
`codex`, `claude` o `cursor` en la salida detallada/de inspección.

Consulte [Plugin bundles](/es/plugins/bundles) para conocer las reglas exactas de detección, el comportamiento
del mapeo y la matriz de compatibilidad actual.

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

Campos:

- `enabled`: interruptor maestro (predeterminado: true)
- `allow`: lista de permitidos (opcional)
- `deny`: lista de bloqueados (opcional; denegar gana)
- `load.paths`: archivos/directorios de complementos adicionales
- `slots`: selectores de ranuras exclusivas como `memory` y `contextEngine`
- `entries.<id>`: interruptores por complemento + configuración

Los cambios de configuración **requieren un reinicio de la puerta de enlace**. Consulte
[Configuration reference](/es/configuration) para obtener el esquema de configuración completo.

Reglas de validación (estrictas):

- Los identificadores de complementos desconocidos en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto de complemento declare
  el identificador del canal.
- La configuración del complemento nativo se valida mediante el esquema JSON incrustado en
  `openclaw.plugin.json` (`configSchema`).
- Los paquetes compatibles actualmente no exponen esquemas de configuración nativos de OpenClaw.
- Si un complemento está deshabilitado, su configuración se conserva y se emite una **advertencia**.

### Deshabilitado vs. faltante vs. no válido

Estos estados son intencionalmente diferentes:

- **deshabilitado**: el complemento existe, pero las reglas de habilitación lo desactivaron
- **faltante**: la configuración hace referencia a un identificador de complemento que el descubrimiento no encontró
- **no válido**: el complemento existe, pero su configuración no coincide con el esquema declarado

OpenClaw conserva la configuración de los complementos deshabilitados para que volver a activarlos no sea
destructivo.

## Descubrimiento y precedencia

OpenClaw escanea, en orden:

1. Rutas de configuración

- `plugins.load.paths` (archivo o directorio)

2. Extensiones del espacio de trabajo

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensiones globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensiones incluidas (enviadas con OpenClaw; mixto activado por defecto/desactivado por defecto)

- `<openclaw>/dist/extensions/*` en instalaciones empaquetadas
- `<workspace>/dist-runtime/extensions/*` en checkouts locales construidos
- `<workspace>/extensions/*` en flujos de trabajo de fuente/Vitest

Muchos plugins de proveedor incluidos están habilitados por defecto para que los catálogos de modelos/hooks de tiempo de ejecución
se mantengan disponibles sin configuración adicional. Otros aún requieren habilitación
explícita a través de `plugins.entries.<id>.enabled` o
`openclaw plugins enable <id>`.

Las dependencias de tiempo de ejecución de los plugins incluidos son propiedad de cada paquete de plugin. Las compilaciones
empaquetadas preparan las dependencias incluidas aceptadas bajo
`dist/extensions/<id>/node_modules` en lugar de requerir copias reflejadas en el
paquete raíz. Los plugins oficiales muy grandes pueden enviarse como entradas incluidas solo con metadatos
e instalar su paquete de tiempo de ejecución bajo demanda. Los artefactos npm envían el
árbol `dist/extensions/*` construido; los directorios fuente `extensions/*` permanecen solo en checkouts
de fuente.

Los plugins instalados están habilitados por defecto, pero se pueden deshabilitar de la misma manera.

Los plugins del espacio de trabajo están **deshabilitados por defecto** a menos que los habilite explícitamente
o los agregue a una lista de permitidos. Esto es intencional: un repositorio verificado no debería convertirse silenciosamente
en código de puerta de enlace de producción.

Si varios plugins resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

### Reglas de habilitación

La habilitación se resuelve después del descubrimiento:

- `plugins.enabled: false` deshabilita todos los plugins
- `plugins.deny` siempre gana
- `plugins.entries.<id>.enabled: false` deshabilita ese plugin
- los plugins de origen del espacio de trabajo están deshabilitados por defecto
- las listas de permitidos restringen el conjunto activo cuando `plugins.allow` no está vacío
- las listas de permitidos se basan en el **id**, no en la fuente
- los plugins incluidos están deshabilitados por defecto a menos que:
  - el id incluido esté en el conjunto activado por defecto integrado, o
  - lo habilite explícitamente, o
  - la configuración del canal habilita implícitamente el plugin del canal incluido
- las ranuras exclusivas pueden forzar la habilitación del plugin seleccionado para esa ranura

## Ranuras de plugin (categorías exclusivas)

Algunas categorías de plugins son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué plugin posee la ranura:

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Ranuras exclusivas admitidas:

- `memory`: complemento de memoria activo (`"none"` deshabilita los complementos de memoria)
- `contextEngine`: complemento del motor de contexto activo (`"legacy"` es el predeterminado integrado)

Si varios complementos declaran `kind: "memory"` o `kind: "context-engine"`, solo
se carga el complemento seleccionado para esa ranura. Los demás se deshabilitan con diagnósticos.
Declare `kind` en su [manifiesto del complemento](/es/plugins/manifest).

## IDs de complementos

IDs de complementos predeterminados:

- Paquetes de paquetes: `package.json` `name`
- Archivo independiente: nombre base del archivo (`~/.../voice-call.ts` -> `voice-call`)

Si un complemento exporta `id`, OpenClaw lo usa pero advierte cuando no coincide con el
id configurado.

## Inspección

```bash
openclaw plugins inspect openai        # deep detail on one plugin
openclaw plugins inspect openai --json # machine-readable
openclaw plugins list                  # compact inventory
openclaw plugins status                # operational summary
openclaw plugins doctor                # issue-focused diagnostics
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

Consulte la [referencia de la CLI de `openclaw plugins`](/es/cli/plugins) para obtener detalles completos sobre cada
comando (reglas de instalación, salida de inspección, instalaciones del mercado, desinstalación).

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo:
`openclaw voicecall`).

## API de complementos (descripción general)

Los complementos exportan:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

`register(api)` es donde los complementos adjuntan comportamiento. Los registros comunes incluyen:

- `registerTool`
- `registerHook`
- `on(...)` para enlaces del ciclo de vida tipados
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Consulte [Manifiesto del complemento](/es/plugins/manifest) para el formato del archivo de manifiesto.

## Lecturas adicionales

- [Arquitectura de complementos e internos](/es/plugins/architecture) -- modelo de capacidades,
  modelo de propiedad, contratos, canalización de carga, asistentes de tiempo de ejecución y referencia de la API
  para desarrolladores
- [Construcción de extensiones](/es/plugins/building-extensions)
- [Paquetes de plugins](/es/plugins/bundles)
- [Manifiesto del plugin](/es/plugins/manifest)
- [Herramientas de agente de plugin](/es/plugins/agent-tools)
- [Libro de recetas de capacidades](/es/tools/capability-cookbook)
- [Complementos comunitarios](/es/plugins/community)

import es from "/components/footer/es.mdx";

<es />
