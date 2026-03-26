---
summary: "Configuración del bot de Mattermost y configuración de OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (plugin)

Estado: compatible a través del complemento (token de bot + eventos de WebSocket). Se admiten canales, grupos y MD.
Mattermost es una plataforma de mensajería para equipos que puede alojarla uno mismo; consulte el sitio oficial en
[mattermost.com](https://mattermost.com) para obtener detalles del producto y descargas.

## Plugin requerido

Mattermost se distribuye como un plugin y no se incluye con la instalación base.

Instalar a través de la CLI (registro npm):

```bash
openclaw plugins install @openclaw/mattermost
```

Descarga local (al ejecutar desde un repositorio git):

```bash
openclaw plugins install ./extensions/mattermost
```

Si eliges Mattermost durante la configuración y se detecta una comprobación de git,
OpenClaw ofrecerá la ruta de instalación local automáticamente.

Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida

1. Instale el plugin de Mattermost.
2. Cree una cuenta de bot de Mattermost y copie el **token de bot**.
3. Copie la **URL base** de Mattermost (por ejemplo, `https://chat.example.com`).
4. Configure OpenClaw e inicie la puerta de enlace.

Configuración mínima:

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
    },
  },
}
```

## Comandos de barra nativos

Los comandos de barra nativos son opcionales. Cuando se habilitan, OpenClaw registra comandos de barra `oc_*` a través de
la API de Mattermost y recibe devoluciones de llamada POST en el servidor HTTP de la puerta de enlace.

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Use when Mattermost cannot reach the gateway directly (reverse proxy/public URL).
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

Notas:

- `native: "auto"` está deshabilitado de forma predeterminada para Mattermost. Establezca `native: true` para habilitar.
- Si se omite `callbackUrl`, OpenClaw deriva uno del host/puerto de la puerta de enlace + `callbackPath`.
- Para configuraciones de varias cuentas, `commands` se puede establecer en el nivel superior o debajo de
  `channels.mattermost.accounts.<id>.commands` (los valores de la cuenta anulan los campos de nivel superior).
- Las devoluciones de llamada de comandos se validan con tokens por comando y fallan de forma segura cuando fallan las comprobaciones de tokens.
- Requisito de accesibilidad: el endpoint de devolución de llamada debe ser accesible desde el servidor de Mattermost.
  - No establezca `callbackUrl` en `localhost` a menos que Mattermost se ejecute en el mismo host/espacio de nombres de red que OpenClaw.
  - No establezca `callbackUrl` en su URL base de Mattermost a menos que esa URL actúe como proxy inverso de `/api/channels/mattermost/command` hacia OpenClaw.
  - Una comprobación rápida es `curl https://<gateway-host>/api/channels/mattermost/command`; un GET debería devolver `405 Method Not Allowed` de OpenClaw, no `404`.
- Requisito de lista de permitidos de salida de Mattermost:
  - Si sus devoluciones de llamada se dirigen a direcciones privadas/tailnet/internas, configure Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` para incluir el host/dominio de la devolución de llamada.
  - Use entradas de host/dominio, no URL completas.
    - Bueno: `gateway.tailnet-name.ts.net`
    - Malo: `https://gateway.tailnet-name.ts.net`

## Variables de entorno (cuenta predeterminada)

Establézcalas en el host de la puerta de enlace si prefiere variables de entorno:

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

Las variables de entorno se aplican solo a la cuenta **predeterminada** (`default`). Otras cuentas deben usar valores de configuración.

## Modos de chat

Mattermost responde a los MD automáticamente. El comportamiento del canal se controla mediante `chatmode`:

- `oncall` (predeterminado): responder solo cuando se le @mencione en los canales.
- `onmessage`: responder a cada mensaje del canal.
- `onchar`: responder cuando un mensaje comience con un prefijo de activación.

Ejemplo de configuración:

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

Notas:

- `onchar` todavía responde a las @menciones explícitas.
- `channels.mattermost.requireMention` se respeta para configuraciones heredadas, pero se prefiere `chatmode`.

## Hilos y sesiones

Use `channels.mattermost.replyToMode` para controlar si las respuestas de canales y grupos se mantienen en el canal principal o inician un hilo bajo la publicación desencadenante.

- `off` (predeterminado): responder en un hilo solo cuando la publicación entrante ya esté en uno.
- `first`: para publicaciones de nivel superior en canales/grupos, inicie un hilo debajo de esa publicación y enrute la conversación a una sesión con alcance de hilo.
- `all`: mismo comportamiento que `first` para Mattermost hoy.
- Los mensajes directos ignoran esta configuración y se mantienen sin hilos.

Ejemplo de configuración:

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

Notas:

- Las sesiones con ámbito de hilo usan el id de la publicación desencadenante como la raíz del hilo.
- `first` y `all` son actualmente equivalentes porque una vez que Mattermost tiene una raíz de hilo, los fragmentos y los medios de seguimiento continúan en ese mismo hilo.

## Control de acceso (MDs)

- Predeterminado: `channels.mattermost.dmPolicy = "pairing"` (los remitentes desconocidos reciben un código de vinculación).
- Aprobar a través de:
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- MD públicos: `channels.mattermost.dmPolicy="open"` más `channels.mattermost.allowFrom=["*"]`.

## Canales (grupos)

- Predeterminado: `channels.mattermost.groupPolicy = "allowlist"` (restringido por mención).
- Permitir remitentes con `channels.mattermost.groupAllowFrom` (se recomiendan los ID de usuario).
- La coincidencia de `@username` es mutable y solo se habilita cuando `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Canales abiertos: `channels.mattermost.groupPolicy="open"` (restringido por mención).
- Nota de ejecución: si `channels.mattermost` falta por completo, la ejecución vuelve a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está configurado).

## Objetivos para entrega saliente

Use estos formatos de destino con `openclaw message send` o cron/webhooks:

- `channel:<id>` para un canal
- `user:<id>` para un MD
- `@username` para un MD (resuelto a través de la API de Mattermost)

Los ID opacos simples (como `64ifufp...`) son **ambiguos** en Mattermost (ID de usuario vs ID de canal).

OpenClaw los resuelve **priorizando el usuario**:

- Si el ID existe como usuario (`GET /api/v4/users/<id>` tiene éxito), OpenClaw envía un **MD** resolviendo el canal directo mediante `/api/v4/channels/direct`.
- De lo contrario, el ID se trata como un **ID de canal**.

Si necesitas un comportamiento determinista, utiliza siempre los prefijos explícitos (`user:<id>` / `channel:<id>`).

## Reintento de canal MD

Cuando OpenClaw envía a un destino MD de Mattermost y necesita resolver primero el canal directo,
de forma predeterminada reintenta los fallos transitorios de creación de canal directo.

Usa `channels.mattermost.dmChannelRetry` para ajustar ese comportamiento globalmente para el complemento de Mattermost,
o `channels.mattermost.accounts.<id>.dmChannelRetry` para una cuenta.

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

Notas:

- Esto se aplica solo a la creación de canales MD (`/api/v4/channels/direct`), no a cada llamada a la API de Mattermost.
- Los reintentos se aplican a fallos transitorios como límites de velocidad, respuestas 5xx y errores de red o de tiempo de espera.
- Los errores de cliente 4xx distintos de `429` se tratan como permanentes y no se reintentan.

## Reacciones (herramienta de mensaje)

- Usa `message action=react` con `channel=mattermost`.
- `messageId` es el ID de publicación de Mattermost.
- `emoji` acepta nombres como `thumbsup` o `:+1:` (los dos puntos son opcionales).
- Establece `remove=true` (booleano) para eliminar una reacción.
- Los eventos de agregar/eliminar reacciones se reenvían como eventos del sistema a la sesión del agente enrutado.

Ejemplos:

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

Configuración:

- `channels.mattermost.actions.reactions`: habilitar/deshabilitar acciones de reacción (por defecto verdadero).
- Anulación por cuenta: `channels.mattermost.accounts.<id>.actions.reactions`.

## Botones interactivos (herramienta de mensaje)

Envía mensajes con botones en los que se puede hacer clic. Cuando un usuario hace clic en un botón, el agente recibe la
selección y puede responder.

Habilita los botones añadiendo `inlineButtons` a las capacidades del canal:

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

Usa `message action=send` con un parámetro `buttons`. Los botones son una matriz 2D (filas de botones):

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

Campos de botón:

- `text` (obligatorio): etiqueta de visualización.
- `callback_data` (obligatorio): valor devuelto al hacer clic (se utiliza como ID de acción).
- `style` (opcional): `"default"`, `"primary"` o `"danger"`.

Cuando un usuario hace clic en un botón:

1. Todos los botones son reemplazados por una línea de confirmación (por ejemplo, "✓ **Sí** seleccionado por @usuario").
2. El agente recibe la selección como un mensaje entrante y responde.

Notas:

- Las devoluciones de llamada de los botones usan verificación HMAC-SHA256 (automática, no se requiere configuración).
- Mattermost elimina los datos de devolución de llamada de sus respuestas de API (característica de seguridad), por lo que todos los botones
  se eliminan al hacer clic — no es posible una eliminación parcial.
- Los ID de acción que contienen guiones o guiones bajos se sanitizan automáticamente
  (limitación de enrutamiento de Mattermost).

Configuración:

- `channels.mattermost.capabilities`: matriz de cadenas de capacidades. Añada `"inlineButtons"` para
  activar la descripción de la herramienta de botones en el mensaje del sistema del agente.
- `channels.mattermost.interactions.callbackBaseUrl`: URL base externa opcional para las devoluciones de llamada
  de los botones (por ejemplo `https://gateway.example.com`). Use esto cuando Mattermost no pueda
  alcanzar el gateway en su host de enlace directamente.
- En configuraciones multicuenta, también puede establecer el mismo campo en
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
- Si se omite `interactions.callbackBaseUrl`, OpenClaw deriva la URL de devolución de llamada de
  `gateway.customBindHost` + `gateway.port`, y luego recurre a `http://localhost:<port>`.
- Regla de accesibilidad: la URL de devolución de llamada del botón debe ser accesible desde el servidor de Mattermost.
  `localhost` solo funciona cuando Mattermost y OpenClaw se ejecutan en el mismo host/espacio de nombres de red.
- Si su objetivo de devolución de llamada es privado/tailnet/interno, añada su host/dominio a Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`.

### Integración directa de API (scripts externos)

Los scripts externos y los webhooks pueden publicar botones directamente a través de la API REST de Mattermost
en lugar de pasar por la herramienta `message` del agente. Use `buildButtonAttachments()` de
la extensión cuando sea posible; si publica JSON sin procesar, siga estas reglas:

**Estructura del payload:**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // alphanumeric only — see below
            type: "button", // required, or clicks are silently ignored
            name: "Approve", // display label
            style: "primary", // optional: "default", "primary", "danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id (for name lookup)
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // see HMAC section below
              },
            },
          },
        ],
      },
    ],
  },
}
```

**Reglas críticas:**

1. Los adjuntos van en `props.attachments`, no en `attachments` de nivel superior (se ignoran silenciosamente).
2. Cada acción necesita `type: "button"` — sin ella, los clics se ignoran silenciosamente.
3. Cada acción necesita un campo `id` — Mattermost ignora las acciones sin ID.
4. La acción `id` debe ser **solo alfanumérica** (`[a-zA-Z0-9]`). Los guiones y guiones bajos rompen
   el enrutamiento de acciones del lado del servidor de Mattermost (devuelve 404). Elimínelos antes de usarlos.
5. `context.action_id` debe coincidir con el `id` del botón para que el mensaje de confirmación muestre el
   nombre del botón (por ejemplo, "Approve") en lugar de una ID sin procesar.
6. `context.action_id` es obligatorio: el manejador de interacciones devuelve 400 sin él.

**Generación de token HMAC:**

La puerta de enlace verifica los clics en los botones con HMAC-SHA256. Los scripts externos deben generar tokens
que coincidan con la lógica de verificación de la puerta de enlace:

1. Derive el secreto del token del bot:
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. Construya el objeto de contexto con todos los campos **excepto** `_token`.
3. Serialice con **claves ordenadas** y **sin espacios** (la puerta de enlace usa `JSON.stringify`
   con claves ordenadas, lo que produce una salida compacta).
4. Firmar: `HMAC-SHA256(key=secret, data=serializedContext)`
5. Agregue el resumen hexadecimal resultante como `_token` en el contexto.

Ejemplo en Python:

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

Problemas comunes de HMAC:

- `json.dumps` de Python añade espacios por defecto (`{"key": "val"}`). Use
  `separators=(",", ":")` para coincidir con la salida compacta de JavaScript (`{"key":"val"}`).
- Firme siempre **todos** los campos de contexto (excepto `_token`). La puerta de enlace elimina `_token` y luego
  firma todo lo que queda. Firmar un subconjunto provoca un fallo silencioso de verificación.
- Use `sort_keys=True` — la puerta de enlace ordena las claves antes de firmar y Mattermost puede
  reordenar los campos de contexto al almacenar el payload.
- Derive el secreto del token del bot (determinista), no de bytes aleatorios. El secreto
  debe ser el mismo tanto en el proceso que crea los botones como en la puerta de enlace que verifica.

## Adaptador de directorio

El complemento de Mattermost incluye un adaptador de directorio que resuelve los nombres de canal y usuario
a través de la API de Mattermost. Esto habilita los destinos `#channel-name` y `@username` en
`openclaw message send` y entregas cron/webhook.

No se necesita configuración: el adaptador usa el token del bot de la configuración de la cuenta.

## Multicuenta

Mattermost admite múltiples cuentas bajo `channels.mattermost.accounts`:

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## Solución de problemas

- Sin respuestas en los canales: asegúrese de que el bot esté en el canal y de mencionarlo (oncall), use un prefijo de activación (onchar) o configure `chatmode: "onmessage"`.
- Errores de autenticación: verifique el token del bot, la URL base y si la cuenta está habilitada.
- Problemas de múltiples cuentas: las variables de entorno solo se aplican a la cuenta `default`.
- Los botones aparecen como cuadros blancos: es posible que el agente esté enviando datos de botones con formato incorrecto. Verifique que cada botón tenga los campos `text` y `callback_data`.
- Los botones se renderizan pero los clics no hacen nada: verifique que `AllowedUntrustedInternalConnections` en la configuración del servidor de Mattermost incluya `127.0.0.1 localhost`, y que `EnablePostActionIntegration` sea `true` en ServiceSettings.
- Los botones devuelven 404 al hacer clic: es probable que el `id` del botón contenga guiones o guiones bajos. El enrutador de acciones de Mattermost falla con IDs no alfanuméricos. Use solo `[a-zA-Z0-9]`.
- El registro de la puerta de enlace `invalid _token`: discrepancia de HMAC. Compruebe que firme todos los campos de contexto (no un subconjunto), use claves ordenadas y use JSON compacto (sin espacios). Consulte la sección HMAC anterior.
- El registro de la puerta de enlace `missing _token in context`: el campo `_token` no está en el contexto del botón. Asegúrese de que se incluya al crear la carga útil de integración.
- La confirmación muestra el ID sin procesar en lugar del nombre del botón: `context.action_id` no coincide con el `id` del botón. Establezca ambos al mismo valor saneado.
- El agente no conoce los botones: agregue `capabilities: ["inlineButtons"]` a la configuración del canal de Mattermost.

import es from "/components/footer/es.mdx";

<es />
