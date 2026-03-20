---
summary: "Plugins/extensibles de OpenClaw: descubrimiento, configuración y seguridad"
read_when:
  - Agregar o modificar plugins/extensibles
  - Documentar las reglas de instalación o carga de plugins
title: "Plugins"
---

# Plugins (Extensiones)

## Inicio rápido (¿nuevo en los plugins?)

Un plugin es simplemente un **módulo de código pequeño** que amplía OpenClaw con funciones adicionales (comandos, herramientas y RPC de Gateway).

La mayoría de las veces, usarás plugins cuando desees una función que aún no esté integrada en OpenClaw principal (o cuando quieras mantener las funciones opcionales fuera de tu instalación principal).

Ruta rápida:

1. Ver lo que ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Voice Call):

```bash
openclaw plugins install @openclaw/voice-call
```

3. Reinicie el Gateway y luego configure bajo `plugins.entries.<id>.config`.

Consulte [Voice Call](/es/plugins/voice-call) para ver un ejemplo concreto de plugin.

## Plugins disponibles (oficiales)

- Microsoft Teams solo está disponible como plugin a partir del 15.01.2026; instale `@openclaw/msteams` si usa Teams.
- Memoria (Core): plugin de búsqueda de memoria incluido (habilitado de forma predeterminada a través de `plugins.slots.memory`)
- Memoria (LanceDB): plugin de memoria a largo plazo incluido (recordatorio/captura automática; establecer `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/es/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/es/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/es/channels/matrix) — `@openclaw/matrix`
- [Nostr](/es/channels/nostr) — `@openclaw/nostr`
- [Zalo](/es/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/es/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (autenticación del proveedor): incluido como `google-antigravity-auth` (deshabilitado de forma predeterminada)
- Gemini CLI OAuth (autenticación del proveedor): incluido como `google-gemini-cli-auth` (deshabilitado de forma predeterminada)
- Qwen OAuth (autenticación del proveedor): incluido como `qwen-portal-auth` (deshabilitado de forma predeterminada)
- Copilot Proxy (autenticación del proveedor): puente local para VS Code Copilot Proxy; distinto del inicio de sesión de dispositivo integrado `github-copilot` (incluido, deshabilitado de forma predeterminada)

Los complementos de OpenClaw son **módulos de TypeScript** cargados en tiempo de ejecución mediante jiti. **La validación de la configuración no ejecuta el código del complemento**; en su lugar, utiliza el manifiesto del complemento y el esquema JSON. Consulte [Plugin manifest](/es/plugins/manifest).

Los complementos pueden registrar:

- Métodos RPC de Gateway
- Controladores HTTP de Gateway
- Herramientas de agente
- Comandos de CLI
- Servicios en segundo plano
- Validación opcional de configuración
- **Habilidades** (enumerando los directorios `skills` en el manifiesto del complemento)
- **Comandos de respuesta automática** (se ejecutan sin invocar al agente de IA)

Los complementos se ejecutan **en proceso** con el Gateway, así que trátelos como código de confianza. Guía de creación de herramientas: [Plugin agent tools](/es/plugins/agent-tools).

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a ciertos asistentes centrales a través de `api.runtime`. Para TTS de telefonía:

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notas:

- Utiliza la configuración central `messages.tts` (OpenAI o ElevenLabs).
- Devuelve un búfer de audio PCM + frecuencia de muestreo. Los complementos deben volver a muestrear/codificar para los proveedores.
- Edge TTS no es compatible con telefonía.

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

4. Extensiones incluidas (enviadas con OpenClaw, **deshabilitadas de forma predeterminada**)

- `<openclaw>/extensions/*`

Los complementos incluidos deben habilitarse explícitamente a través de `plugins.entries.<id>.enabled`
o `openclaw plugins enable <id>`. Los complementos instalados están habilitados de forma predeterminada,
pero se pueden deshabilitar de la misma manera.

Cada complemento debe incluir un archivo `openclaw.plugin.json` en su raíz. Si una ruta
apunta a un archivo, la raíz del complemento es el directorio del archivo y debe contener el
manifiesto.

Si varios complementos se resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

### Paquetes de paquetes

Un directorio de complementos puede incluir un `package.json` con `openclaw.extensions`:

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

Cada entrada se convierte en un complemento. Si el paquete enumera varias extensiones, el id del complemento
se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

### Metadatos del catálogo de canales

Los complementos de canal pueden anunciar metadatos de integración a través de `openclaw.channel` y
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

Ejemplo:

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación
de registro MPM). Coloque un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## IDs de complementos

IDs de complementos predeterminados:

- Paquetes de paquetes: `package.json` `name`
- Archivo independiente: nombre base del archivo (`~/.../voice-call.ts` → `voice-call`)

Si un complemento exporta `id`, OpenClaw lo usa pero advierte cuando no coincide con el
id configurado.

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
- `entries.<id>`: interruptores por complemento + configuración

Los cambios en la configuración **requieren un reinicio de la puerta de enlace**.

Reglas de validación (estrictas):

- Los IDs de complementos desconocidos en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto de complemento declare
  el ID del canal.
- La configuración del complemento se valida mediante el esquema JSON incrustado en
  `openclaw.plugin.json` (`configSchema`).
- Si un complemento está deshabilitado, su configuración se conserva y se emite una **advertencia**.

## Ranuras de complementos (categorías exclusivas)

Algunas categorías de complementos son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué complemento es dueño del ranuro:

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
    },
  },
}
```

Si varios complementos declaran `kind: "memory"`, solo se carga el seleccionado. Los demás
se deshabilitan con diagnósticos.

## Interfaz de usuario de control (esquema + etiquetas)

La interfaz de usuario de control usa `config.schema` (JSON Schema + `uiHints`) para renderizar mejores formularios.

OpenClaw aumenta `uiHints` en tiempo de ejecución basándose en complementos descubiertos:

- Agrega etiquetas por complemento para `plugins.entries.<id>` / `.enabled` / `.config`
- Fusiona sugerencias opcionales de campos de configuración proporcionadas por el complemento bajo:
  `plugins.entries.<id>.config.<field>`

Si desea que los campos de configuración de su complemento muestren buenas etiquetas/marcadores de posición (y marcar los secretos como sensibles),
proporcione `uiHints` junto con su JSON Schema en el manifiesto del complemento.

Ejemplo:

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call # install from npm
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` solo funciona para instalaciones de npm rastreadas bajo `plugins.installs`.

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo: `openclaw voicecall`).

## API de complementos (resumen)

Los complementos exportan ya sea:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

## Ganchos de complemento

Los complementos pueden enviar ganchos y registrarlos en tiempo de ejecución. Esto permite que un complemento agrupe
automatización basada en eventos sin una instalación separada de un paquete de ganchos.

### Ejemplo

```
import { registerPluginHooksFromDir } from "openclaw/plugin-sdk";

export default function register(api) {
  registerPluginHooksFromDir(api, "./hooks");
}
```

Notas:

- Los directorios de ganchos siguen la estructura normal de ganchos (`HOOK.md` + `handler.ts`).
- Las reglas de elegibilidad de los ganchos todavía se aplican (requisitos de OS/bins/env/config).
- Los ganchos administrados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`.
- No puede habilitar/deshabilitar los ganchos administrados por complementos a través de `openclaw hooks`; en su lugar, habilite/deshabilite el complemento.

## Complementos de proveedor (autenticación de modelo)

Los complementos pueden registrar flujos de **autenticación de proveedor de modelos** para que los usuarios puedan ejecutar OAuth o
configuración de clave de API dentro de OpenClaw (no se necesitan scripts externos).

Registre un proveedor a través de `api.registerProvider(...)`. Cada proveedor expone uno
o más métodos de autenticación (OAuth, clave de API, código de dispositivo, etc.). Estos métodos potencian:

- `openclaw models auth login --provider <id> [--method <id>]`

Ejemplo:

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
});
```

Notas:

- `run` recibe un `ProviderAuthContext` con los auxiliares `prompter`, `runtime`,
  `openUrl` y `oauth.createVpsAwareHandlers`.
- Devuelva `configPatch` cuando necesite agregar modelos predeterminados o configuración del proveedor.
- Devuelva `defaultModel` para que `--set-default` pueda actualizar los valores predeterminados del agente.

### Registrar un canal de mensajería

Los complementos pueden registrar **complementos de canal** que se comportan como los canales integrados
(WhatsApp, Telegram, etc.). La configuración del canal reside en `channels.<id>` y es
validada por el código de su complemento de canal.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notas:

- Coloque la configuración en `channels.<id>` (no en `plugins.entries`).
- `meta.label` se usa para las etiquetas en las listas de CLI/interfaz de usuario.
- `meta.aliases` agrega identificadores alternativos para la normalización y las entradas de la CLI.
- `meta.preferOver` enumera los identificadores de canal para omitir la habilitación automática cuando ambos están configurados.
- `meta.detailLabel` y `meta.systemImage` permiten que las interfaces de usuario muestren etiquetas/iconos de canal más enriquecidos.

### Escribir un nuevo canal de mensajería (paso a paso)

Use esto cuando desee una **nueva superficie de chat** (un "canal de mensajería"), no un proveedor de modelos.
La documentación del proveedor de modelos se encuentra en `/providers/*`.

1. Elija un identificador + forma de configuración

- Toda la configuración del canal reside en `channels.<id>`.
- Prefiera `channels.<id>.accounts.<accountId>` para configuraciones de varias cuentas.

2. Definir los metadatos del canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlan las listas de CLI/interfaz de usuario.
- `meta.docsPath` debe apuntar a una página de documentación como `/channels/<id>`.
- `meta.preferOver` permite que un complemento reemplace otro canal (la habilitación automática lo prefiere).
- `meta.detailLabel` y `meta.systemImage` son utilizados por las interfaces de usuario para texto/iconos de detalles.

3. Implementar los adaptadores requeridos

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (tipos de chat, medios, hilos, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (para envío básico)

4. Añada adaptadores opcionales según sea necesario

- `setup` (asistente), `security` (política de MD), `status` (salud/diagnóstico)
- `gateway` (iniciar/detener/iniciar sesión), `mentions`, `threading`, `streaming`
- `actions` (acciones de mensaje), `commands` (comportamiento de comando nativo)

5. Registre el canal en su complemento

- `api.registerChannel({ plugin })`

Ejemplo de configuración mínima:

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Complemento de canal mínimo (solo saliente):

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Cargue el complemento (directorio de extensiones o `plugins.load.paths`), reinicie la puerta de enlace,
luego configure `channels.<id>` en su configuración.

### Herramientas de agente

Consulte la guía dedicada: [Herramientas de agente de complemento](/es/plugins/agent-tools).

### Registrar un método RPC de puerta de enlace

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Registrar comandos de CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Registrar comandos de respuesta automática

Los complementos pueden registrar comandos de barra personalizados que se ejecuten **sin invocar al
agente de IA**. Esto es útil para comandos de alternancia, verificaciones de estado o acciones rápidas
que no necesitan procesamiento LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexto del controlador de comandos:

- `senderId`: El ID del remitente (si está disponible)
- `channel`: El canal donde se envió el comando
- `isAuthorizedSender`: Si el remitente es un usuario autorizado
- `args`: Argumentos pasados después del comando (si `acceptsArgs: true`)
- `commandBody`: El texto completo del comando
- `config`: La configuración actual de OpenClaw

Opciones de comando:

- `name`: Nombre del comando (sin el `/` inicial)
- `description`: Texto de ayuda que se muestra en las listas de comandos
- `acceptsArgs`: Si el comando acepta argumentos (predeterminado: false). Si es false y se proporcionan argumentos, el comando no coincidirá y el mensaje pasará a otros controladores
- `requireAuth`: Si se requiere un remitente autorizado (predeterminado: true)
- `handler`: Función que devuelve `{ text: string }` (puede ser asíncrona)

Ejemplo con autorización y argumentos:

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Notas:

- Los comandos del complemento se procesan **antes** que los comandos integrados y el agente de IA
- Los comandos se registran globalmente y funcionan en todos los canales
- Los nombres de los comandos no distinguen entre mayúsculas y minúsculas (`/MyStatus` coincide con `/mystatus`)
- Los nombres de los comandos deben comenzar con una letra y contener solo letras, números, guiones y guiones bajos
- Los nombres de comandos reservados (como `help`, `status`, `reset`, etc.) no pueden ser anulados por los complementos
- El registro de comandos duplicados en varios complementos fallará con un error de diagnóstico

### Registrar servicios en segundo plano

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Convenciones de nomenclatura

- Métodos de puerta de enlace: `pluginId.action` (ejemplo: `voicecall.status`)
- Herramientas: `snake_case` (ejemplo: `voice_call`)
- Comandos de CLI: kebab o camel, pero evite entrar en conflicto con los comandos principales

## Habilidades

Los complementos pueden incluir una habilidad en el repositorio (`skills/<name>/SKILL.md`).
Actívela con `plugins.entries.<id>.enabled` (u otras puertas de configuración) y asegúrese
que esté presente en sus ubicaciones de habilidades administradas/espacio de trabajo.

## Distribución (npm)

Empaquetado recomendado:

- Paquete principal: `openclaw` (este repositorio)
- Complementos: paquetes npm separados bajo `@openclaw/*` (ejemplo: `@openclaw/voice-call`)

Contrato de publicación:

- El complemento `package.json` debe incluir `openclaw.extensions` con uno o más archivos de entrada.
- Los archivos de entrada pueden ser `.js` o `.ts` (jiti carga TS en tiempo de ejecución).
- `openclaw plugins install <npm-spec>` usa `npm pack`, extrae en `~/.openclaw/extensions/<id>/` y lo habilita en la configuración.
- Estabilidad de la clave de configuración: los paquetes con alcance se normalizan al id **sin alcance** para `plugins.entries.*`.

## Complemento de ejemplo: Llamada de voz

Este repositorio incluye un complemento de llamada de voz (Twilio o respaldo de registro):

- Fuente: `extensions/voice-call`
- Habilidad: `skills/voice-call`
- CLI: `openclaw voicecall start|status`
- Herramienta: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Config (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (opcional `statusCallbackUrl`, `twimlUrl`)
- Config (desarrollo): `provider: "log"` (sin red)

Consulte [Voice Call](/es/plugins/voice-call) y `extensions/voice-call/README.md` para la configuración y el uso.

## Notas de seguridad

Los complementos se ejecutan en proceso con la Gateway. Trátelos como código de confianza:

- Solo instale complementos en los que confíe.
- Prefiera listas de permitidos `plugins.allow`.
- Reinicie la Gateway después de realizar cambios.

## Prueba de complementos

Los complementos pueden (y deben) incluir pruebas:

- Los complementos en el repositorio pueden mantener las pruebas de Vitest bajo `src/**` (ejemplo: `src/plugins/voice-call.plugin.test.ts`).
- Los complementos publicados por separado deben ejecutar su propio CI (lint/build/test) y validar que `openclaw.extensions` apunte al punto de entrada compilado (`dist/index.js`).

import en from "/components/footer/en.mdx";

<en />
