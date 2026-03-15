---
summary: "Plugins/extensions de OpenClaw: detección, configuración y seguridad"
read_when:
  - Adding or modifying plugins/extensions
  - Documenting plugin install or load rules
title: "Plugins"
---

# Plugins (Extensiones)

## Inicio rápido (¿nuevo en los plugins?)

Un plugin es simplemente un **pequeño módulo de código** que extiende OpenClaw con funciones adicionales (comandos, herramientas y RPC de Gateway).

La mayor parte del tiempo, usarás plugins cuando quieras una función que aún no esté integrada en el núcleo de OpenClaw (o quieras mantener las funciones opcionales fuera de tu instalación principal).

Ruta rápida:

1. Ver qué ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Llamada de voz):

```bash
openclaw plugins install @openclaw/voice-call
```

Las especificaciones de Npm son **solo de registro** (nombre del paquete + **versión exacta** opcional o **dist-tag**). Las especificaciones de Git/URL/archivo y los rangos de semver se rechazan.

Las especificaciones simples y `@latest` se mantienen en la vía estable. Si npm resuelve cualquiera de ellas a una versión preliminar, OpenClaw se detiene y te pide que aceptes explícitamente con una etiqueta preliminar como `@beta`/`@rc` o una versión preliminar exacta.

3. Reinicia el Gateway y luego configura en `plugins.entries.<id>.config`.

Consulta [Llamada de voz](/es/plugins/voice-call) para ver un ejemplo concreto de plugin.
¿Buscas listados de terceros? Consulta [Plugins de la comunidad](/es/plugins/community).

## Arquitectura

El sistema de plugins de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra plugins candidatos desde las rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones incluidas. El descubrimiento lee
   `openclaw.plugin.json` más los metadatos del paquete primero.
2. **Habilitación + validación**
   El núcleo decide si un plugin descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los plugins habilitados se cargan en proceso mediante jiti y registran capacidades en
   un registro central.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.

El límite de diseño importante:

- el descubrimiento + validación de configuración debe funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código de plugin
- el comportamiento en tiempo de ejecución proviene de la ruta `register(api)` del módulo del plugin

Esa división permite a OpenClaw validar la configuración, explicar los complementos faltantes/deshabilitados y construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

## Modelo de ejecución

Los complementos se ejecutan **en proceso** con el Gateway. No están en sandbox. Un complemento cargado tiene el mismo límite de confianza a nivel de proceso que el código principal.

Implicaciones:

- un complemento puede registrar herramientas, controladores de red, ganchos y servicios
- un error en un complemento puede bloquear o desestabilizar el gateway
- un complemento malicioso es equivalente a la ejecución de código arbitrario dentro del proceso de OpenClaw

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no incluidos. Trate los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de los complementos**, no en el origen de procedencia.
- Un complemento del espacio de trabajo con el mismo id que un complemento incluido intencionalmente oculta la copia incluida cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones urgentes.

## Complementos disponibles (oficiales)

- Microsoft Teams es exclusivamente un complemento a partir del 15/01/2026; instale `@openclaw/msteams` si usa Teams.
- Memory (Core) — complemento de búsqueda de memoria incluido (habilitado por defecto mediante `plugins.slots.memory`)
- Memory (LanceDB) — complemento de memoria a largo plazo incluido (recuperación/captura automática; configure `plugins.slots.memory = "memory-lancedb"`)
- [Voice Call](/es/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/es/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/es/channels/matrix) — `@openclaw/matrix`
- [Nostr](/es/channels/nostr) — `@openclaw/nostr`
- [Zalo](/es/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/es/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth (autenticación del proveedor) — incluido como `google-antigravity-auth` (deshabilitado por defecto)
- Gemini CLI OAuth (autenticación del proveedor) — incluido como `google-gemini-cli-auth` (deshabilitado por defecto)
- Qwen OAuth (autenticación del proveedor) — incluido como `qwen-portal-auth` (deshabilitado por defecto)
- Copilot Proxy (provider auth) — puente local del Copilot Proxy de VS Code; distinto del inicio de sesión de dispositivo `github-copilot` integrado (incluido, deshabilitado de forma predeterminada)

Los complementos de OpenClaw son **módulos de TypeScript** cargados en tiempo de ejecución a través de jiti. **La validación de la configuración no ejecuta el código del complemento**; en su lugar, utiliza el manifiesto del complemento y el esquema JSON. Consulte [Manifiesto del complemento](/es/plugins/manifest).

Los complementos pueden registrar:

- Métodos RPC de Gateway
- Rutas HTTP de Gateway
- Herramientas de agente
- Comandos de CLI
- Servicios en segundo plano
- Motores de contexto
- Validación de configuración opcional
- **Habilidades** (enumerando los directorios `skills` en el manifiesto del complemento)
- **Comandos de respuesta automática** (se ejecutan sin invocar al agente de IA)

Los complementos se ejecutan **en proceso** con el Gateway, así que trátelos como código de confianza. Guía de creación de herramientas: [Herramientas de agente de complementos](/es/plugins/agent-tools).

## Canal de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir raíces de complementos candidatas
2. leer `openclaw.plugin.json` y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación de cada candidato
6. cargar los módulos habilitados a través de jiti
7. llamar a `register(api)` y recopilar los registros en el registro del complemento
8. exponer el registro a los comandos/superficies de tiempo de ejecución

Las puertas de seguridad suceden **antes** de la ejecución en tiempo de ejecución. Los candidatos se bloquean cuando la entrada sale de la raíz del complemento, la ruta es escribible por todos, o la propiedad de la ruta parece sospechosa para complementos no incluidos.

### Comportamiento primero del manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la Interfaz de usuario de control
- mostrar metadatos de instalación/catálogo

El módulo de tiempo de ejecución es la parte del plano de datos. Registra el comportamiento real, como enlaces, herramientas, comandos o flujos de proveedores.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen el inicio por ráfagas y la sobrecarga de comandos repetidos. Es seguro considerarlas como cachés de rendimiento a corto plazo, no como persistencia.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a asistentes principales seleccionados a través de `api.runtime`. Para TTS de telefonía:

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

Notas:

- Utiliza la configuración principal `messages.tts` (OpenAI o ElevenLabs).
- Devuelve un búfer de audio PCM + frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- Edge TTS no es compatible con telefonía.

Para STT/transcripción, los complementos pueden llamar:

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- Utiliza la configuración de audio de comprensión de medios principal (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).

## Rutas HTTP de Gateway

Los complementos pueden exponer puntos finales HTTP con `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Campos de ruta:

- `path`: ruta de acceso bajo el servidor HTTP de la puerta de enlace.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación administrada por el complemento/verificación de webhook.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelva `true` cuando la ruta maneje la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de complementos

Utilice subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear complementos:

- `openclaw/plugin-sdk/core` para APIs de plugins genéricos, tipos de autenticación de proveedores y asistentes compartidos.
- `openclaw/plugin-sdk/compat` para código de plugin incluido/interno que necesita asistentes de tiempo de ejecución compartidos más amplios que `core`.
- `openclaw/plugin-sdk/telegram` para plugins de canal de Telegram.
- `openclaw/plugin-sdk/discord` para plugins de canal de Discord.
- `openclaw/plugin-sdk/slack` para plugins de canal de Slack.
- `openclaw/plugin-sdk/signal` para plugins de canal de Signal.
- `openclaw/plugin-sdk/imessage` para plugins de canal de iMessage.
- `openclaw/plugin-sdk/whatsapp` para plugins de canal de WhatsApp.
- `openclaw/plugin-sdk/line` para plugins de canal de LINE.
- `openclaw/plugin-sdk/msteams` para la superficie del plugin de Microsoft Teams incluido.
- También están disponibles las subrutas específicas de extensiones incluidas:
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/copilot-proxy`, `openclaw/plugin-sdk/device-pair`,
  `openclaw/plugin-sdk/diagnostics-otel`, `openclaw/plugin-sdk/diffs`,
  `openclaw/plugin-sdk/feishu`,
  `openclaw/plugin-sdk/google-gemini-cli-auth`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/llm-task`,
  `openclaw/plugin-sdk/lobster`, `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/memory-lancedb`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/open-prose`, `openclaw/plugin-sdk/phone-control`,
  `openclaw/plugin-sdk/qwen-portal-auth`, `openclaw/plugin-sdk/synology-chat`,
  `openclaw/plugin-sdk/talk-voice`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/thread-ownership`, `openclaw/plugin-sdk/tlon`,
  `openclaw/plugin-sdk/twitch`, `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo` y `openclaw/plugin-sdk/zalouser`.

Nota de compatibilidad:

- `openclaw/plugin-sdk` sigue siendo compatible con plugins externos existentes.
- Los nuevos complementos agrupados y los migrados deben utilizar subrutas específicas del canal o de la extensión; use `core` para superficies genéricas y `compat` solo cuando se necesiten asistentes compartidos más amplios.

## Inspección de solo lectura del canal

Si su complemento registra un canal, se prefiere implementar `plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales están completamente materializadas y puede fallar rápidamente cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura, como `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve` y los flujos de reparación de doctor/config, no deberían necesitar materializar las credenciales de ejecución solo para describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devolver solo el estado descriptivo de la cuenta.
- Conservar `enabled` y `configured`.
- Incluir campos de origen/estado de las credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver los valores brutos de los tokens solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen coincidente) es suficiente para los comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial está configurada a través de SecretRef pero no está disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de bloquearse o informar erróneamente que la cuenta no está configurada.

Nota de rendimiento:

- El descubrimiento de complementos y los metadatos del manifiesto utilizan cachés cortos en proceso para reducir el trabajo de inicio/recarga repentino.
- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

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

4. Extensiones incluidas (enviadas con OpenClaw, principalmente deshabilitadas por defecto)

- `<openclaw>/extensions/*`

La mayoría de los complementos incluidos deben habilitarse explícitamente a través de
`plugins.entries.<id>.enabled` o `openclaw plugins enable <id>`.

Excepciones de complementos incluidos activados por defecto:

- `device-pair`
- `phone-control`
- `talk-voice`
- complemento de ranura de memoria activa (ranura predeterminada: `memory-core`)

Los complementos instalados están habilitados por defecto, pero se pueden deshabilitar de la misma manera.

Los complementos del espacio de trabajo están **deshabilitados por defecto** a menos que los habilite explícitamente
o los agregue a una lista de permitidos. Esto es intencional: un repositorio descargado no debería convertirse silenciosamente
en código de puerta de enlace de producción.

Notas de endurecimiento:

- Si `plugins.allow` está vacío y los complementos no incluidos son descubribles, OpenClaw registra una advertencia de inicio con los ids y fuentes de los complementos.
- Las rutas candidatas se verifican por seguridad antes de la admisión del descubrimiento. OpenClaw bloquea a los candidatos cuando:
  - la entrada de la extensión se resuelve fuera de la raíz del complemento (incluyendo escapes de enlace simbólico/recorrido de ruta),
  - la ruta raíz/fuente del complemento es escribible por todos,
  - la propiedad de la ruta es sospechosa para complementos no incluidos (el propietario POSIX no es ni el uid actual ni root).
- Los complementos no incluidos cargados sin procedencia de instalación/ruta de carga emiten una advertencia para que pueda anclar la confianza (`plugins.allow`) o el seguimiento de instalación (`plugins.installs`).

Cada complemento debe incluir un archivo `openclaw.plugin.json` en su raíz. Si una ruta
apunta a un archivo, la raíz del complemento es el directorio del archivo y debe contener el
manifiesto.

Si varios complementos se resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

Esto significa:

- los complementos del espacio de trabajo ensombrecen intencionalmente a los complementos incluidos con el mismo id
- `plugins.allow: ["foo"]` autoriza el complemento activo `foo` por id, incluso cuando
  la copia activa proviene del espacio de trabajo en lugar de la raíz de extensión incluida
- si necesita un control de procedencia más estricto, use rutas de instalación/carga explícitas e
  inspeccione el código fuente del complemento resuelto antes de habilitarlo

### Reglas de habilitación

La habilitación se resuelve después del descubrimiento:

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana
- `plugins.entries.<id>.enabled: false` deshabilita ese complemento
- los complementos de origen del espacio de trabajo están deshabilitados de manera predeterminada
- las listas de permitidos restringen el conjunto activo cuando `plugins.allow` no está vacío
- las listas de permitidos son **basadas en ID**, no basadas en fuente
- los complementos empaquetados están deshabilitados de manera predeterminada a menos que:
  - el ID empaquetado esté en el conjunto predeterminado activado integrado, o
  - lo habilite explícitamente, o
  - la configuración del canal habilita implícitamente el complemento del canal empaquetado
- las ranuras exclusivas pueden forzar la habilitación del complemento seleccionado para esa ranura

En el núcleo actual, los IDs predeterminados activados empaquetados incluyen ayudantes locales/de proveedores como
`ollama`, `sglang`, `vllm`, además de `device-pair`, `phone-control` y
`talk-voice`.

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

Cada entrada se convierte en un complemento. Si el paquete enumera múltiples extensiones, el ID del complemento
se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del
complemento después de la resolución de enlaces simbólicos. Las entradas que escapan del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del complemento
"JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

### Metadatos del catálogo de canales

Los complementos del canal pueden anunciar metadatos de incorporación a través de `openclaw.channel` y
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo central libre de datos.

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

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación del registro de MPM). Suelte un archivo JSON en uno de:

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

## Modelo de registro

Los complementos cargados no mutan directamente las globales centrales aleatorias. Se registran en un
registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- hooks heredados y hooks tipados
- canales
- proveedores
- controladores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las funciones centrales luego leen de ese registro en lugar de hablar con los módulos de complementos
directamente. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución central -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies centrales solo
necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de complemento".

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
- `deny`: lista de denegados (opcional; denegación gana)
- `load.paths`: archivos/dirs de complementos adicionales
- `slots`: selectores de ranuras exclusivas como `memory` y `contextEngine`
- `entries.<id>`: interruptores por complemento + configuración

Los cambios de configuración **requieren un reinicio de la puerta de enlace**.

Reglas de validación (estrictas):

- Los IDs de complemento desconocidos en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto de complemento declare
  el ID del canal.
- La configuración del complemento se valida mediante el esquema JSON incrustado en
  `openclaw.plugin.json` (`configSchema`).
- Si un complemento está deshabilitado, su configuración se conserva y se emite una **advertencia**.

### Deshabilitado vs. faltante vs. no válido

Estos estados son intencionalmente diferentes:

- **deshabilitado**: el complemento existe, pero las reglas de habilitación lo desactivaron
- **faltante**: la configuración hace referencia a un ID de complemento que el descubrimiento no encontró
- **no válido**: el complemento existe, pero su configuración no coincide con el esquema declarado

OpenClaw conserva la configuración de los complementos deshabilitados para que volver a activarlos no sea
destructivo.

## Slots de complementos (categorías exclusivas)

Algunas categorías de complementos son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué complemento posee el slot:

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

Slots exclusivos compatibles:

- `memory`: complemento de memoria activo (`"none"` deshabilita los complementos de memoria)
- `contextEngine`: complemento de motor de contexto activo (`"legacy"` es el predeterminado integrado)

Si varios complementos declaran `kind: "memory"` o `kind: "context-engine"`, solo
el complemento seleccionado se carga para ese slot. Los demás se deshabilitan con diagnósticos.

### Complementos del motor de contexto

Los complementos del motor de contexto poseen la orquestación del contexto de sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o enlaces.

## Interfaz de usuario de control (esquema + etiquetas)

La interfaz de usuario de control usa `config.schema` (JSON Schema + `uiHints`) para renderizar mejores formularios.

OpenClaw aumenta `uiHints` en tiempo de ejecución basándose en los complementos descubiertos:

- Añade etiquetas por complemento para `plugins.entries.<id>` / `.enabled` / `.config`
- Combina las sugerencias opcionales de campos de configuración proporcionadas por el complemento bajo:
  `plugins.entries.<id>.config.<field>`

Si desea que los campos de configuración de su complemento muestren buenas etiquetas/marcadores de posición (y marque los secretos como confidenciales),
proporcione `uiHints` junto con su esquema JSON en el manifiesto del complemento.

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
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` solo funciona para instalaciones de npm rastreadas bajo `plugins.installs`.
Si los metadatos de integridad almacenados cambian entre actualizaciones, OpenClaw advierte y solicita confirmación (use el global `--yes` para omitir los mensajes).

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo: `openclaw voicecall`).

## API de complementos (descripción general)

Los complementos exportan:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

`register(api)` es donde los complementos adjuntan comportamientos. Los registros comunes incluyen:

- `registerTool`
- `registerHook`
- `on(...)` para ganchos del ciclo de vida tipados
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

Los complementos del motor de contexto también pueden registrar un administrador de contexto propiedad del tiempo de ejecución:

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Luego habilítelo en la configuración:

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Ganchos de complementos

Los complementos pueden registrar ganchos en tiempo de ejecución. Esto permite que un complemento incluya automatización basada en eventos
sin una instalación separada de un paquete de ganchos.

### Ejemplo

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Notas:

- Registre ganchos explícitamente a través de `api.registerHook(...)`.
- Las reglas de elegibilidad de ganchos todavía se aplican (requisitos de SO/bins/env/config).
- Los ganchos administrados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`.
- No puede habilitar/deshabilitar los ganchos administrados por complementos a través de `openclaw hooks`; en su lugar, habilite/deshabilite el complemento.

### Ganchos del ciclo de vida del agente (`api.on`)

Para los ganchos del ciclo de vida en tiempo de ejecución tipados, use `api.on(...)`:

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Ganchos importantes para la construcción de indicaciones (prompts):

- `before_model_resolve`: se ejecuta antes de la carga de la sesión (`messages` no están disponibles). Úselo para anular de manera determinista `modelOverride` o `providerOverride`.
- `before_prompt_build`: se ejecuta después de la carga de la sesión (`messages` están disponibles). Úselo para dar forma a la entrada del prompt.
- `before_agent_start`: gancho de compatibilidad heredado. Se prefieren los dos ganchos explícitos anteriores.

Política de ganchos aplicada por el núcleo:

- Los operadores pueden desactivar los ganchos de mutación de prompts por complemento a través de `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Cuando se desactiva, OpenClaw bloquea `before_prompt_build` e ignora los campos de mutación de prompts devueltos por el `before_agent_start` heredado, preservando al mismo tiempo el `modelOverride` heredado y el `providerOverride`.

Campos de resultado de `before_prompt_build`:

- `prependContext`: antepone texto al prompt del usuario para esta ejecución. Es mejor para contenido específico del turno o dinámico.
- `systemPrompt`: anulación completa del prompt del sistema.
- `prependSystemContext`: antepone texto al prompt del sistema actual.
- `appendSystemContext`: añade texto al prompt del sistema actual.

Orden de construcción del prompt en el tiempo de ejecución integrado:

1. Aplicar `prependContext` al prompt del usuario.
2. Aplicar la anulación `systemPrompt` cuando se proporcione.
3. Aplicar `prependSystemContext + current system prompt + appendSystemContext`.

Notas sobre la fusión y precedencia:

- Los manejadores de ganchos se ejecutan por prioridad (primero los más altos).
- Para los campos de contexto fusionados, los valores se concatenan en orden de ejecución.
- Los valores de `before_prompt_build` se aplican antes que los valores de reserva del `before_agent_start` heredado.

Guía de migración:

- Mueva la guía estática de `prependContext` a `prependSystemContext` (o `appendSystemContext`) para que los proveedores puedan almacenar en caché el contenido estable del prefijo del sistema.
- Mantenga `prependContext` para el contexto dinámico por turno que debe permanecer vinculado al mensaje del usuario.

## Complementos de proveedores (autenticación de modelo)

Los complementos pueden registrar **proveedores de modelos** para que los usuarios puedan ejecutar la configuración de OAuth o clave de API
dentro de OpenClaw, mostrar la configuración del proveedor en la incorporación/selectores de modelo y
contribuir al descubrimiento implícito de proveedores.

Los complementos de proveedor son la costura de extensión modular para la configuración de proveedores de modelos. Ya
no son solo "ayudantes de OAuth".

### Ciclo de vida del complemento de proveedor

Un complemento de proveedor puede participar en cinco fases distintas:

1. **Auth**
   `auth[].run(ctx)` realiza OAuth, captura de clave de API, código de dispositivo o configuración
   personalizada y devuelve perfiles de autenticación más parches de configuración opcionales.
2. **Configuración no interactiva**
   `auth[].runNonInteractive(ctx)` maneja `openclaw onboard --non-interactive`
   sin indicaciones. Use esto cuando el proveedor necesita una configuración sin cabeza personalizada
   más allá de las rutas simples de clave de API integradas.
3. **Integración con el asistente**
   `wizard.onboarding` agrega una entrada a `openclaw onboard`.
   `wizard.modelPicker` agrega una entrada de configuración al selector de modelos.
4. **Descubrimiento implícito**
   `discovery.run(ctx)` puede contribuir con la configuración del proveedor automáticamente durante
   la resolución/listado de modelos.
5. **Seguimiento posterior a la selección**
   `onModelSelected(ctx)` se ejecuta después de que se elige un modelo. Use esto para trabajos
   específicos del proveedor, como descargar un modelo local.

Esta es la división recomendada porque estas fases tienen diferentes requisitos
del ciclo de vida:

- la autenticación es interactiva y escribe credenciales/configuración
- la configuración no interactiva se basa en indicadores/entorno y no debe solicitar indicaciones
- los metadatos del asistente son estáticos y orientados a la interfaz de usuario
- el descubrimiento debe ser seguro, rápido y tolerante a fallos
- los enlaces posteriores a la selección son efectos secundarios vinculados al modelo elegido

### Contrato de autenticación del proveedor

`auth[].run(ctx)` devuelve:

- `profiles`: perfiles de autenticación para escribir
- `configPatch`: cambios opcionales de `openclaw.json`
- `defaultModel`: referencia opcional de `provider/model`
- `notes`: notas opcionales para el usuario

El núcleo entonces:

1. escribe los perfiles de autenticación devueltos
2. aplica el cableado de configuración del perfil de autenticación
3. fusiona el parche de configuración
4. aplica opcionalmente el modelo predeterminado
5. ejecuta el enlace `onModelSelected` del proveedor cuando sea apropiado

Esto significa que un complemento de proveedor es propietario de la lógica de configuración específica del proveedor, mientras que el núcleo es propietario de la ruta genérica de persistencia y combinación de configuraciones.

### Contrato no interactivo del proveedor

`auth[].runNonInteractive(ctx)` es opcional. Implementarlo cuando el proveedor necesite una configuración sin cabeza que no pueda expresarse a través de los flujos genéricos integrados de claves de API.

El contexto no interactivo incluye:

- la configuración actual y base
- opciones de CLI de incorporación analizadas
- asistentes de registro/errores en tiempo de ejecución
- directorios de agente/espacio de trabajo
- `resolveApiKey(...)` para leer claves de proveedor desde flags, variables de entorno o perfiles de autenticación existentes, respetando `--secret-input-mode`
- `toApiKeyCredential(...)` para convertir una clave resuelta en una credencial de perfil de autenticación con el almacenamiento correcto de texto plano vs referencia secreta

Utilice esta superficie para proveedores tales como:

- tiempos de ejecución compatibles con OpenAI autohospedados que necesitan `--custom-base-url` +
  `--custom-model-id`
- verificación no interactiva específica del proveedor o síntesis de configuración

No solicite desde `runNonInteractive`. Rechace las entradas faltantes con errores accionables en su lugar.

### Metadatos del asistente del proveedor

`wizard.onboarding` controla cómo aparece el proveedor en la incorporación agrupada:

- `choiceId`: valor de elección de autenticación
- `choiceLabel`: etiqueta de opción
- `choiceHint`: pista corta
- `groupId`: id de cubo de grupo
- `groupLabel`: etiqueta de grupo
- `groupHint`: pista de grupo
- `methodId`: método de autenticación a ejecutar

`wizard.modelPicker` controla cómo aparece un proveedor como una entrada "configúrelo ahora" en la selección del modelo:

- `label`
- `hint`
- `methodId`

Cuando un proveedor tiene múltiples métodos de autenticación, el asistente puede apuntar a un método explícito o permitir que OpenClaw sintetice elecciones por método.

OpenClaw valida los metadatos del asistente del proveedor cuando se registra el complemento:

- se rechazan los IDs de método de autenticación duplicados o en blanco
- los metadatos del asistente se ignoran cuando el proveedor no tiene métodos de autenticación
- los enlaces `methodId` no válidos se degradan a advertencias y se recurre a los
  métodos de autenticación restantes del proveedor

### Contrato de descubrimiento de proveedores

`discovery.run(ctx)` devuelve uno de:

- `{ provider }`
- `{ providers }`
- `null`

Use `{ provider }` para el caso común en el que el complemento posee un id de proveedor.
Use `{ providers }` cuando un complemento descubre múltiples entradas de proveedor.

El contexto de descubrimiento incluye:

- la configuración actual
- directorios de agente/espacio de trabajo
- entorno de proceso
- un asistente para resolver la clave de API del proveedor y un valor de clave de API seguro para el descubrimiento

El descubrimiento debe ser:

- rápido
- mejor esfuerzo posible
- seguro de omitir en caso de fallo
- cuidadoso con los efectos secundarios

No debe depender de solicitudes ni configuraciones de larga duración.

### Orden de descubrimiento

El descubrimiento de proveedores se ejecuta en fases ordenadas:

- `simple`
- `profile`
- `paired`
- `late`

Use:

- `simple` para el descubrimiento económico solo de entorno
- `profile` cuando el descubrimiento depende de perfiles de autenticación
- `paired` para proveedores que necesitan coordinarse con otro paso de descubrimiento
- `late` para sondeos costosos o de red local

La mayoría de los proveedores autohospedados deberían usar `late`.

### Buenos límites de complementos de proveedores

Adecuado para complementos de proveedores:

- proveedores locales/autohospedados con flujos de configuración personalizados
- inicio de sesión de OAuth/código de dispositivo específico del proveedor
- descubrimiento implícito de servidores de modelos locales
- efectos secundarios posteriores a la selección, como la extracción de modelos

Ajuste menos convincente:

- proveedores triviales de solo clave de API que difieren solo por la variable de entorno, la URL base y un
  modelo predeterminado

Esos aún pueden convertirse en complementos, pero la principal recompensa de modularidad proviene de
extraer primero proveedores ricos en comportamiento.

Registre un proveedor a través de `api.registerProvider(...)`. Cada proveedor expone uno
o más métodos de autenticación (OAuth, clave de API, código de dispositivo, etc.). Esos métodos pueden
proporcionar:

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entradas de configuración de "proveedor personalizado" del selector de modelos
- descubrimiento implícito de proveedores durante la resolución/listado de modelos

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
  wizard: {
    onboarding: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notas:

- `run` recibe un `ProviderAuthContext` con `prompter`, `runtime`,
  `openUrl` y `oauth.createVpsAwareHandlers` auxiliares.
- `runNonInteractive` recibe un `ProviderAuthMethodNonInteractiveContext`
  con `opts`, `resolveApiKey` y `toApiKeyCredential` auxiliares para
  el onboarding headless.
- Devuelve `configPatch` cuando necesites añadir modelos predeterminados o configuración del proveedor.
- Devuelve `defaultModel` para que `--set-default` pueda actualizar los valores predeterminados del agente.
- `wizard.onboarding` añade una opción de proveedor a `openclaw onboard`.
- `wizard.modelPicker` añade una entrada de "configurar este proveedor" al selector de modelos.
- `discovery.run` devuelve `{ provider }` para el id de proveedor propio del complemento
  o `{ providers }` para el descubrimiento multi-proveedor.
- `discovery.order` controla cuándo se ejecuta el proveedor en relación con las fases de
  descubrimiento integradas: `simple`, `profile`, `paired` o `late`.
- `onModelSelected` es el gancho posterior a la selección para el trabajo de seguimiento
  específico del proveedor, como extraer un modelo local.

### Registrar un canal de mensajería

Los complementos pueden registrar **channel plugins** que se comportan como canales integrados
(WhatsApp, Telegram, etc.). La configuración del canal se encuentra en `channels.<id>` y es
validada por el código de tu complemento de canal.

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

- Pon la configuración bajo `channels.<id>` (no `plugins.entries`).
- `meta.label` se usa para las etiquetas en las listas de la CLI/interfaz de usuario.
- `meta.aliases` añade ids alternativos para la normalización y las entradas de la CLI.
- `meta.preferOver` enumera los ids de canal para omitir la activación automática cuando ambos están configurados.
- `meta.detailLabel` y `meta.systemImage` permiten que las interfaces de usuario muestren etiquetas/iconos de canal más enriquecidos.

### Ganchos de incorporación de canales

Los complementos de canal pueden definir ganchos de integración opcionales en `plugin.onboarding`:

- `configure(ctx)` es el flujo de configuración base.
- `configureInteractive(ctx)` puede asumir completamente la configuración interactiva tanto para estados configurados como no configurados.
- `configureWhenConfigured(ctx)` puede anular el comportamiento solo para los canales ya configurados.

Precedencia de ganchos en el asistente:

1. `configureInteractive` (si está presente)
2. `configureWhenConfigured` (solo cuando el estado del canal ya está configurado)
3. recurrir a `configure`

Detalles del contexto:

- `configureInteractive` y `configureWhenConfigured` reciben:
  - `configured` (`true` o `false`)
  - `label` (nombre del canal orientado al usuario utilizado por los promts)
  - además de los campos compartidos config/runtime/prompter/options
- Devolver `"skip"` deja la selección y el seguimiento de la cuenta sin cambios.
- Devolver `{ cfg, accountId? }` aplica las actualizaciones de configuración y registra la selección de la cuenta.

### Escribir un nuevo canal de mensajería (paso a paso)

Use esto cuando desee una **nueva superficie de chat** (un "canal de mensajería"), no un proveedor de modelos.
La documentación del proveedor de modelos se encuentra en `/providers/*`.

1. Elija un id + forma de configuración

- Toda la configuración del canal se encuentra en `channels.<id>`.
- Prefiera `channels.<id>.accounts.<accountId>` para configuraciones multicuenta.

2. Defina los metadatos del canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlan las listas de CLI/UI.
- `meta.docsPath` debe apuntar a una página de documentación como `/channels/<id>`.
- `meta.preferOver` permite que un complemento reemplace otro canal (la activación automática lo prefiere).
- `meta.detailLabel` y `meta.systemImage` son utilizados por las interfaces de usuario para texto de detalles/iconos.

3. Implemente los adaptadores requeridos

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

Complemento de canal mínimo (solo salida):

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

### Herramientas del agente

Consulte la guía dedicada: [Herramientas de agente de complementos](/es/plugins/agent-tools).

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

Los complementos pueden registrar comandos de barra personalizados que se ejecutan **sin invocar al
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
- `nativeNames`: Alias de comando nativo opcionales para superficies de barra/menú. Use `default` para todos los proveedores nativos, o claves específicas del proveedor como `discord`
- `description`: Texto de ayuda mostrado en las listas de comandos
- `acceptsArgs`: Si el comando acepta argumentos (por defecto: false). Si es false y se proporcionan argumentos, el comando no coincidirá y el mensaje pasará a otros controladores
- `requireAuth`: Si se requiere un remitente autorizado (por defecto: true)
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

- Los comandos de los complementos se procesan **antes** que los comandos integrados y el agente de IA
- Los comandos se registran globalmente y funcionan en todos los canales
- Los nombres de los comandos no distinguen entre mayúsculas y minúsculas (`/MyStatus` coincide con `/mystatus`)
- Los nombres de los comandos deben comenzar con una letra y contener solo letras, números, guiones y guiones bajos
- Los nombres de comandos reservados (como `help`, `status`, `reset`, etc.) no pueden ser sobrescritos por los complementos
- El registro de comandos duplicados en diferentes complementos fallará con un error de diagnóstico

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

- Métodos de Gateway: `pluginId.action` (ejemplo: `voicecall.status`)
- Herramientas: `snake_case` (ejemplo: `voice_call`)
- Comandos de CLI: kebab o camel, pero evita conflictos con los comandos principales

## Habilidades (Skills)

Los complementos pueden incluir una habilidad en el repositorio (`skills/<name>/SKILL.md`).
Actívala con `plugins.entries.<id>.enabled` (u otros puertas de configuración) y asegúrate
de que esté presente en tus ubicaciones de habilidades gestionadas/espacio de trabajo.

## Distribución (npm)

Empaquetado recomendado:

- Paquete principal: `openclaw` (este repositorio)
- Complementos: paquetes npm separados bajo `@openclaw/*` (ejemplo: `@openclaw/voice-call`)

Contrato de publicación:

- El complemento `package.json` debe incluir `openclaw.extensions` con uno o más archivos de entrada.
- Los archivos de entrada pueden ser `.js` o `.ts` (jiti carga TS en tiempo de ejecución).
- `openclaw plugins install <npm-spec>` usa `npm pack`, extrae en `~/.openclaw/extensions/<id>/` y lo activa en la configuración.
- Estabilidad de la clave de configuración: los paquetes con ámbito se normalizan al id **sin ámbito** para `plugins.entries.*`.

## Plugin de ejemplo: Llamada de voz

Este repositorio incluye un plugin de llamada de voz (Twilio o registro alternativo):

- Fuente: `extensions/voice-call`
- Habilidad: `skills/voice-call`
- CLI: `openclaw voicecall start|status`
- Herramienta: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Configuración (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (opcional `statusCallbackUrl`, `twimlUrl`)
- Configuración (dev): `provider: "log"` (sin red)

Consulte [Llamada de voz](/es/plugins/voice-call) y `extensions/voice-call/README.md` para la configuración y el uso.

## Notas de seguridad

Los complementos se ejecutan en proceso con la puerta de enlace. Trátelos como código confiable:

- Instale solo complementos en los que confíe.
- Prefiera listas de permitidos de `plugins.allow`.
- Recuerde que `plugins.allow` se basa en id, por lo que un complemento de espacio de trabajo habilitado puede
  intencionalmente sombrear un complemento incluido con el mismo id.
- Reinicie la puerta de enlace después de realizar cambios.

## Prueba de complementos

Los complementos pueden (y deben) incluir pruebas:

- Los complementos en el repositorio pueden mantener pruebas de Vitest en `src/**` (ejemplo: `src/plugins/voice-call.plugin.test.ts`).
- Los complementos publicados por separado deben ejecutar su propia CI (lint/compilación/prueba) y validar que `openclaw.extensions` apunte al punto de entrada compilado (`dist/index.js`).

import es from "/components/footer/es.mdx";

<es />
