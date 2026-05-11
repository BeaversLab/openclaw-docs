---
summary: "Configuración del bot de Mattermost y configuración de OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

Estado: complemento incluido (token de bot + eventos de WebSocket). Se admiten canales, grupos y MD. Mattermost es una plataforma de mensajería para equipos que se puede alojar por uno mismo; consulte el sitio oficial en [mattermost.com](https://mattermost.com) para obtener detalles del producto y descargas.

## Complemento incluido

<Note>Mattermost se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación separada.</Note>

Si está en una compilación anterior o en una instalación personalizada que excluye Mattermost, instálelo manualmente:

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Local checkout">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida

<Steps>
  <Step title="Asegurarse de que el complemento esté disponible">
    Las versiones empaquetadas actuales de OpenClaw ya lo incluyen. Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
  </Step>
  <Step title="Crear un bot de Mattermost">
    Cree una cuenta de bot de Mattermost y copie el **token del bot**.
  </Step>
  <Step title="Copiar la URL base">
    Copie la **URL base** de Mattermost (por ejemplo, `https://chat.example.com`).
  </Step>
  <Step title="Configurar OpenClaw e iniciar la pasarela">
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

  </Step>
</Steps>

## Comandos de barra nativos

Los comandos de barra nativos son opcionales. Cuando están habilitados, OpenClaw registra comandos de barra `oc_*` a través de la API de Mattermost y recibe devoluciones de llamada POST en el servidor HTTP de la pasarela.

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

<AccordionGroup>
  <Accordion title="Notas de comportamiento">
    - `native: "auto"` está deshabilitado de forma predeterminada para Mattermost. Establezca `native: true` para habilitar.
    - Si se omite `callbackUrl`, OpenClaw deriva uno del host/puerto de la puerta de enlace + `callbackPath`.
    - Para configuraciones de múltiples cuentas, `commands` se puede establecer en el nivel superior o bajo `channels.mattermost.accounts.<id>.commands` (los valores de la cuenta anulan los campos de nivel superior).
    - Las devoluciones de llamada de comandos se validan con los tokens por comando devueltos por Mattermost cuando OpenClaw registra `oc_*` comandos.
    - Las devoluciones de llamada de barra fallan de forma cerrada cuando el registro falló, el inicio fue parcial o el token de devolución de llamada no coincide con ninguno de los comandos registrados.
  </Accordion>
  <Accordion title="Requisito de accesibilidad">
    El punto final de devolución de llamada debe ser accesible desde el servidor de Mattermost.

    - No establezca `callbackUrl` en `localhost` a menos que Mattermost se ejecute en el mismo host/espacio de nombres de red que OpenClaw.
    - No establezca `callbackUrl` en su URL base de Mattermost a menos que esa URL actúe como proxy inverso de `/api/channels/mattermost/command` hacia OpenClaw.
    - Una verificación rápida es `curl https://<gateway-host>/api/channels/mattermost/command`; un GET debería devolver `405 Method Not Allowed` de OpenClaw, no `404`.

  </Accordion>
  <Accordion title="Lista de permitidos de salida de Mattermost">
    Si sus objetivos de devolución de llamada son direcciones privadas/tailnet/internas, configure `ServiceSettings.AllowedUntrustedInternalConnections` de Mattermost para incluir el host/dominio de devolución de llamada.

    Use entradas de host/dominio, no URL completas.

    - Bueno: `gateway.tailnet-name.ts.net`
    - Malo: `https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## Variables de entorno (cuenta predeterminada)

Establezca estas en el host de la puerta de enlace si prefiere variables de entorno:

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
Las variables de entorno se aplican solo a la cuenta **predeterminada** (`default`). Otras cuentas deben usar valores de configuración.

`MATTERMOST_URL` no se puede establecer desde un archivo `.env` del espacio de trabajo; consulte [Archivos `.env` del espacio de trabajo](/es/gateway/security).

</Note>

## Modos de chat

Mattermost responde a los MD automáticamente. El comportamiento del canal se controla mediante `chatmode`:

<Tabs>
  <Tab title="oncall (default)">Responder solo cuando se le haga una @mención en los canales.</Tab>
  <Tab title="onmessage">Responder a cada mensaje del canal.</Tab>
  <Tab title="onchar">Responder cuando un mensaje comience con un prefijo de activación.</Tab>
</Tabs>

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

- `onchar` todavía responde a @menciones explícitas.
- Se respeta `channels.mattermost.requireMention` para configuraciones heredadas, pero se prefiere `chatmode`.

## Hilos y sesiones

Use `channels.mattermost.replyToMode` para controlar si las respuestas de canales y grupos se quedan en el canal principal o inician un hilo debajo de la publicación desencadenante.

- `off` (predeterminado): solo responder en un hilo cuando la publicación entrante ya está en uno.
- `first`: para publicaciones de nivel superior en canales/grupos, iniciar un hilo debajo de esa publicación y enrutar la conversación a una sesión con alcance de hilo.
- `all`: mismo comportamiento que `first` para Mattermost hoy.
- Los mensajes directos ignoran esta configuración y permanecen sin hilos.

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

- Las sesiones con alcance de hilo usan el id de la publicación desencadenante como la raíz del hilo.
- `first` y `all` son actualmente equivalentes porque una vez que Mattermost tiene una raíz de hilo, los fragmentos de seguimiento y los medios continúan en ese mismo hilo.

## Control de acceso (MDs)

- Predeterminado: `channels.mattermost.dmPolicy = "pairing"` (los remitentes desconocidos reciben un código de emparejamiento).
- Aprobar vía:
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- MDs públicos: `channels.mattermost.dmPolicy="open"` más `channels.mattermost.allowFrom=["*"]`.

## Canales (grupos)

- Predeterminado: `channels.mattermost.groupPolicy = "allowlist"` (limitado a menciones).
- Lista de permitidos para remitentes con `channels.mattermost.groupAllowFrom` (se recomiendan los ID de usuario).
- Las anulaciones de mención por canal se encuentran en `channels.mattermost.groups.<channelId>.requireMention` o `channels.mattermost.groups["*"].requireMention` para un valor predeterminado.
- La coincidencia de `@username` es mutable y solo se habilita cuando `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Canales abiertos: `channels.mattermost.groupPolicy="open"` (limitado a menciones).
- Nota de ejecución: si `channels.mattermost` falta completamente, la ejecución vuelve a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está configurado).

Ejemplo:

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## Objetivos para la entrega saliente

Use estos formatos de objetivo con `openclaw message send` o cron/webhooks:

- `channel:<id>` para un canal
- `user:<id>` para un MD
- `@username` para un MD (resuelto a través de la API de Mattermost)

<Warning>
Los ID opacos simples (como `64ifufp...`) son **ambiguos** en Mattermost (ID de usuario frente a ID de canal).

OpenClaw los resuelve **primero el usuario**:

- Si el ID existe como usuario (`GET /api/v4/users/<id>` tiene éxito), OpenClaw envía un **MD** resolviendo el canal directo a través de `/api/v4/channels/direct`.
- De lo contrario, el ID se trata como un **ID de canal**.

Si necesita un comportamiento determinista, use siempre los prefijos explícitos (`user:<id>` / `channel:<id>`).

</Warning>

## Reintento de canal MD

Cuando OpenClaw envía a un objetivo MD de Mattermost y necesita resolver primero el canal directo, reintentará los fallos transitorios de creación de canal directo de manera predeterminada.

Use `channels.mattermost.dmChannelRetry` para ajustar ese comportamiento globalmente para el complemento Mattermost, o `channels.mattermost.accounts.<id>.dmChannelRetry` para una cuenta.

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

## Vista previa de transmisión

Mattermost transmite el pensamiento, la actividad de las herramientas y el texto de respuesta parcial en un único **borrador de publicación de vista previa** que se finaliza en su lugar cuando la respuesta final es segura de enviar. La vista previa se actualiza en el mismo id de publicación en lugar de saturar el canal con mensajes por fragmento. Los finales de medios/errores cancelan las ediciones de vista previa pendientes y utilizan la entrega normal en lugar de vaciar una publicación de vista previa desechable.

Activar mediante `channels.mattermost.streaming`:

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Modos de transmisión">
    - `partial` es la opción habitual: una publicación de vista previa que se edita a medida que crece la respuesta y luego se finaliza con la respuesta completa.
    - `block` usa fragmentos de borrador de estilo anexar dentro de la publicación de vista previa.
    - `progress` muestra una vista previa de estado mientras se genera y solo publica la respuesta final al completarse.
    - `off` desactiva la transmisión de vista previa.
  </Accordion>
  <Accordion title="Notas sobre el comportamiento de la transmisión">
    - Si la transmisión no puede finalizarse en su lugar (por ejemplo, la publicación se eliminó a mitad de la transmisión), OpenClaw recurre a enviar una publicación final nueva para que la respuesta nunca se pierda.
    - Las cargas útiles solo de razonamiento se suprimen de las publicaciones del canal, incluyendo el texto que llega como un blockquote `> Reasoning:`. Establezca `/reasoning on` para ver el pensamiento en otras superficies; la publicación final de Mattermost mantiene solo la respuesta.
    - Consulte [Streaming](/es/concepts/streaming#preview-streaming-modes) para ver la matriz de mapeo de canales.
  </Accordion>
</AccordionGroup>

## Reacciones (herramienta de mensaje)

- Use `message action=react` con `channel=mattermost`.
- `messageId` es el id de publicación de Mattermost.
- `emoji` acepta nombres como `thumbsup` o `:+1:` (los dos puntos son opcionales).
- Establezca `remove=true` (booleano) para eliminar una reacción.
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

Envíe mensajes con botones en los que se puede hacer clic. Cuando un usuario hace clic en un botón, el agente recibe la selección y puede responder.

Habilite los botones añadiendo `inlineButtons` a las capacidades del canal:

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

Use `message action=send` con un parámetro `buttons`. Los botones son un array bidimensional (filas de botones):

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

Campos de los botones:

<ParamField path="text" type="string" required>
  Etiqueta de visualización.
</ParamField>
<ParamField path="callback_data" type="string" required>
  Valor devuelto al hacer clic (se usa como ID de acción).
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  Estilo del botón.
</ParamField>

Cuando un usuario hace clic en un botón:

<Steps>
  <Step title="Botones reemplazados con confirmación">Todos los botones se reemplazan con una línea de confirmación (por ejemplo, "✓ **Sí** seleccionado por @usuario").</Step>
  <Step title="El agente recibe la selección">El agente recibe la selección como un mensaje entrante y responde.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notas de implementación">
    - Las devoluciones de llamada de los botones usan verificación HMAC-SHA256 (automática, no se necesita configuración).
    - Mattermost elimina los datos de devolución de llamada de sus respuestas de API (característica de seguridad), por lo que todos los botones se eliminan al hacer clic — no es posible una eliminación parcial.
    - Los IDs de acción que contienen guiones o guiones bajos se sanitizan automáticamente (limitación de enrutamiento de Mattermost).
  </Accordion>
  <Accordion title="Configuración y accesibilidad">
    - `channels.mattermost.capabilities`: matriz de cadenas de capacidades. Añada `"inlineButtons"` para habilitar la descripción de la herramienta de botones en el mensaje del sistema del agente.
    - `channels.mattermost.interactions.callbackBaseUrl`: URL base externa opcional para las devoluciones de llamada de los botones (por ejemplo `https://gateway.example.com`). Úsela cuando Mattermost no pueda alcanzar la puerta de enlace en su host de enlace directamente.
    - En configuraciones de múltiples cuentas, también puede establecer el mismo campo en `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
    - Si se omite `interactions.callbackBaseUrl`, OpenClaw deriva la URL de devolución de llamada de `gateway.customBindHost` + `gateway.port` y luego recurre a `http://localhost:<port>`.
    - Regla de accesibilidad: la URL de devolución de llamada de los botones debe ser accesible desde el servidor de Mattermost. `localhost` solo funciona cuando Mattermost y OpenClaw se ejecutan en el mismo host/espacio de nombres de red.
    - Si su objetivo de devolución de llamada es privado/tailnet/interno, añada su host/dominio a la configuración de Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`.
  </Accordion>
</AccordionGroup>

### Integración directa de la API (scripts externos)

Los scripts externos y los webhooks pueden publicar botones directamente a través de la API REST de Mattermost en lugar de pasar por la herramienta `message` del agente. Use `buildButtonAttachments()` del complemento cuando sea posible; si publica JSON sin procesar, siga estas reglas:

**Estructura de la carga útil:**

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

<Warning>
**Reglas críticas**

1. Los adjuntos van en `props.attachments`, no en el nivel superior `attachments` (se ignoran silenciosamente).
2. Cada acción necesita `type: "button"` — sin él, los clics se tragan silenciosamente.
3. Cada acción necesita un campo `id` — Mattermost ignora las acciones sin ID.
4. La acción `id` debe ser **solo alfanumérica** (`[a-zA-Z0-9]`). Los guiones y guiones bajos rompen el enrutamiento de acciones del lado del servidor de Mattermost (devuelve 404). Elimínelos antes de usarlos.
5. `context.action_id` debe coincidir con el `id` del botón para que el mensaje de confirmación muestre el nombre del botón (por ejemplo, "Aprobar") en lugar de una ID sin procesar.
6. `context.action_id` es obligatorio — el controlador de interacción devuelve 400 sin él.
   </Warning>

**Generación de tokens HMAC**

La puerta de enlace verifica los clics en los botones con HMAC-SHA256. Los scripts externos deben generar tokens que coincidan con la lógica de verificación de la puerta de enlace:

<Steps>
  <Step title="Derivar el secreto del token del bot">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="Construir el objeto de contexto">Construya el objeto de contexto con todos los campos **excepto** `_token`.</Step>
  <Step title="Serializar con claves ordenadas">Serialice con **claves ordenadas** y **sin espacios** (la puerta de enlace usa `JSON.stringify` con claves ordenadas, lo que produce una salida compacta).</Step>
  <Step title="Firmar la carga útil">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="Añadir el token">Añada el resumen hexadecimal resultante como `_token` en el contexto.</Step>
</Steps>

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

<AccordionGroup>
  <Accordion title="Problemas comunes de HMAC">
    - El `json.dumps` de Python añade espacios por defecto (`{"key": "val"}`). Use `separators=(",", ":")` para coincidir con la salida compacta de JavaScript (`{"key":"val"}`).
    - Firma siempre **todos** los campos de contexto (excepto `_token`). La puerta de enlace elimina `_token` y luego firma todo lo restante. Firmar un subconjunto causa un fallo silencioso de verificación.
    - Use `sort_keys=True` — la puerta de enlace ordena las claves antes de firmar, y Mattermost puede reordenar los campos de contexto al almacenar el payload.
    - Derive el secreto del token del bot (determinista), no de bytes aleatorios. El secreto debe ser el mismo en el proceso que crea los botones y en la puerta de enlace que verifica.
  </Accordion>
</AccordionGroup>

## Adaptador de directorio

El complemento de Mattermost incluye un adaptador de directorio que resuelve los nombres de canales y usuarios a través de la API de Mattermost. Esto permite los destinos `#channel-name` y `@username` en `openclaw message send` y entregas de cron/webhook.

No se necesita configuración — el adaptador usa el token del bot de la configuración de la cuenta.

## Multicuenta

Mattermost soporta múltiples cuentas bajo `channels.mattermost.accounts`:

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

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">Asegúrese de que el bot esté en el canal y se le mencione (oncall), use un prefijo de activador (onchar) o configure `chatmode: "onmessage"`.</Accordion>
  <Accordion title="Errores de autenticación o multicuenta">- Verifique el token del bot, la URL base y si la cuenta está habilitada. - Problemas de multicuenta: las variables de entorno solo se aplican a la cuenta `default`.</Accordion>
  <Accordion title="Error en los comandos de barra nativos">
    - `Unauthorized: invalid command token.`: OpenClaw no aceptó el token de devolución de llamada (callback). Causas típicas: - el registro del comando de barra falló o solo se completó parcialmente al iniciar - la devolución de llamada está llegando a la puerta de enlace/cuenta incorrecta - Mattermost todavía tiene comandos antiguos apuntando a un objetivo de devolución de llamada anterior - la
    puerta de enlace se reinició sin reactivar los comandos de barra - Si los comandos de barra nativos dejan de funcionar, revise los registros en busca de `mattermost: failed to register slash commands` o `mattermost: native slash commands enabled but no commands could be registered`. - Si se omite `callbackUrl` y los registros advierten que la devolución de llamada se resolvió a
    `http://127.0.0.1:18789/...`, es probable que esa URL solo sea accesible cuando Mattermost se ejecuta en el mismo host/espacio de nombres de red que OpenClaw. Establezca un `commands.callbackUrl` explícito y accesible externamente en su lugar.
  </Accordion>
  <Accordion title="Problemas con botones">
    - Los botones aparecen como cuadros blancos: el agente puede estar enviando datos de botón con formato incorrecto. Compruebe que cada botón tiene tanto los campos `text` como `callback_data`. - Los botones se muestran pero los clics no hacen nada: verifique que `AllowedUntrustedInternalConnections` en la configuración del servidor de Mattermost incluye `127.0.0.1 localhost`, y que
    `EnablePostActionIntegration` es `true` en ServiceSettings. - Los botones devuelven 404 al hacer clic: el `id` del botón probablemente contiene guiones o guiones bajos. El enrutador de acciones de Mattermost falla con IDs no alfanuméricos. Use solo `[a-zA-Z0-9]`. - Los registros de Gateway muestran `invalid _token`: discordancia de HMAC. Compruebe que firma todos los campos de contexto (no un
    subconjunto), usa claves ordenadas y usa JSON compacto (sin espacios). Vea la sección HMAC anterior. - Los registros de Gateway muestran `missing _token in context`: el campo `_token` no está en el contexto del botón. Asegúrese de que se incluya al construir la carga útil de la integración. - La confirmación muestra el ID sin procesar en lugar del nombre del botón: `context.action_id` no
    coincide con el `id` del botón. Establezca ambos con el mismo valor saneado. - El agente no conoce los botones: agregue `capabilities: ["inlineButtons"]` a la configuración del canal de Mattermost.
  </Accordion>
</AccordionGroup>

## Relacionado

- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y control de menciones
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
