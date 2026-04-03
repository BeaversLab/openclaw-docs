---
summary: "Soporte del canal de WhatsApp, controles de acceso, comportamiento de entrega y operaciones"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Canal web)

Estado: listo para producción a través de WhatsApp Web (Baileys). Gateway es propietario de la(s) sesión(es) vinculada(s).

## Instalación (bajo demanda)

- Onboarding (`openclaw onboard`) y `openclaw channels add --channel whatsapp`
  solicitan instalar el complemento de WhatsApp la primera vez que lo seleccionas.
- `openclaw channels login --channel whatsapp` también ofrece el flujo de instalación cuando
  el complemento aún no está presente.
- Canal de desarrollo + git checkout: predeterminado a la ruta local del complemento.
- Estable/Beta: predeterminado al paquete npm `@openclaw/whatsapp`.

La instalación manual sigue disponible:

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    La política de MD predeterminada es el emparejamiento para remitentes desconocidos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card title="Configuración de la puerta de enlace" icon="settings" href="/en/gateway/configuration">
    Patrones y ejemplos completos de configuración del canal.
  </Card>
</CardGroup>

## Configuración rápida

<Steps>
  <Step title="Configure WhatsApp access policy">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="Vincular WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    Para una cuenta específica:

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Iniciar la puerta de enlace">

```bash
openclaw gateway
```

  </Step>

  <Step title="Aprobar la primera solicitud de emparejamiento (si se usa el modo de emparejamiento)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Las solicitudes de emparejamiento caducan después de 1 hora. Las solicitudes pendientes están limitadas a 3 por canal.

  </Step>
</Steps>

<Note>OpenClaw recomienda ejecutar WhatsApp en un número separado cuando sea posible. (Los metadatos del canal y el flujo de configuración están optimizados para esa configuración, pero las configuraciones con número personal también son compatibles.)</Note>

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Número dedicado (recomendado)">
    Este es el modo operativo más limpio:

    - identidad de WhatsApp separada para OpenClaw
    - listas de permitidos de DM y límites de enrutamiento más claros
    - menor probabilidad de confusión de autochat

    Patrón de política mínima:

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Alternativa de número personal">
    La incorporación admite el modo de número personal y escribe una línea base amigable para el autochat:

    - `dmPolicy: "allowlist"`
    - `allowFrom` incluye tu número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autochat se basan en el número propio vinculado y `allowFrom`.

  </Accordion>

  <Accordion title="Alcance del canal solo para WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual del canal de OpenClaw.

    No hay un canal de mensajería Twilio WhatsApp separado en el registro de canales de chat integrado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- El Gateway posee el socket de WhatsApp y el bucle de reconexión.
- Los envíos salientes requieren un escucha de WhatsApp activo para la cuenta de destino.
- Los chats de estado y transmisión se ignoran (`@status`, `@broadcast`).
- Los chats directos usan reglas de sesión de DM (`session.dmScope`; por defecto `main` colapsa los DM en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).

## Control de acceso y activación

<Tabs>
  <Tab title="Política de MD">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números estilo E.164 (normalizados internamente).

    Invalidación multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados a nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se persisten en el allow-store del canal y se fusionan con `allowFrom` configurado
    - si no se configura una lista de permitidos, el número propio vinculado se permite de manera predeterminada
    - los MD `fromMe` salientes nunca se emparejan automáticamente

  </Tab>

  <Tab title="Política de grupo + listas de permitidos">
    El acceso al grupo tiene dos capas:

    1. **Lista de permitidos de membresía de grupo** (`channels.whatsapp.groups`)
       - si `groups` se omite, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos de grupo (`"*"` permitidos)

    2. **Política de remitente de grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: se omite la lista de permitidos de remitentes
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear todo el entrante del grupo

    Respaldo de la lista de permitidos de remitentes:

    - si `groupAllowFrom` no está establecido, el tiempo de ejecución recurre a `allowFrom` cuando esté disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación por mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, el respaldo de la política de grupo en tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está establecido.

  </Tab>

  <Tab title="Menciones + /activación">
    Las respuestas en grupo requieren una mención por defecto.

    La detección de menciones incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de expresiones regulares de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - la cita/respuesta solo satisface el control de mención; no otorga autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista de permitidos siguen bloqueados incluso si responden al mensaje de un usuario incluido en la lista de permitidos

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está limitado al propietario.

  </Tab>
</Tabs>

## Comportamiento del número personal y del chat propio

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de autoprogramación de WhatsApp:

- omitir confirmaciones de lectura para los turnos de chat propio
- ignorar el comportamiento de activación automática de mención-JID que de otro modo te haría ping a ti mismo
- si `messages.responsePrefix` no está establecido, las respuestas de autoprogramación por defecto son `[{identity.name}]` o `[openclaw]`

## Normalización de mensajes y contexto

<AccordionGroup>
  <Accordion title="Sobre de entrada + contexto de respuesta">
    Los mensajes entrantes de WhatsApp se envuelven en el sobre de entrada compartido.

    Si existe una respuesta citada, el contexto se anexa en este formulario:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID/E.164 del remitente).

  </Accordion>

  <Accordion title="Marcadores de posición de medios y extracción de ubicación/contacto">
    Los mensajes entrantes solo de medios se normalizan con marcadores de posición como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las cargas útiles de ubicación y contacto se normalizan en contexto textual antes del enrutamiento.

  </Accordion>

  <Accordion title="Inyección de historial de grupo pendiente">
    Para los grupos, los mensajes sin procesar pueden almacenarse en el búfer e inyectarse como contexto cuando el bot finalmente se activa.

    - límite predeterminado: `50`
    - configuración: `channels.whatsapp.historyLimit`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` deshabilita

    Marcadores de inyección:

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Confirmaciones de lectura">
    Las confirmaciones de lectura están habilitadas por defecto para los mensajes entrantes de WhatsApp aceptados.

    Deshabilitar globalmente:

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Anulación por cuenta:

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    Los turnos de chat propio omiten las confirmaciones de lectura incluso cuando están habilitadas globalmente.

  </Accordion>
</AccordionGroup>

## Entrega, fragmentación y medios

<AccordionGroup>
  <Accordion title="Fragmentación de texto">
    - límite de fragmentación predeterminado: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - el modo `newline` prefiere los límites de párrafo (líneas en blanco), y luego recurre a una fragmentación segura por longitud
  </Accordion>

<Accordion title="Comportamiento de medios salientes">
  - admite cargas de imagen, video, audio (nota de voz PTT) y documentos - `audio/ogg` se reescribe a `audio/ogg; codecs=opus` para compatibilidad con notas de voz - la reproducción de GIF animados es compatible a través de `gifPlayback: true` en envíos de video - los subtítulos se aplican al primer elemento multimedia al enviar cargas de respuesta multimedia - la fuente multimedia puede ser
  HTTP(S), `file://` o rutas locales
</Accordion>

  <Accordion title="Media size limits and fallback behavior">
    - inbound media save cap: `channels.whatsapp.mediaMaxMb` (default `50`)
    - outbound media send cap: `channels.whatsapp.mediaMaxMb` (default `50`)
    - per-account overrides use `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - images are auto-optimized (resize/quality sweep) to fit limits
    - on media send failure, first-item fallback sends text warning instead of dropping the response silently
  </Accordion>
</AccordionGroup>

## Nivel de reacción

`channels.whatsapp.reactionLevel` controla la frecuencia con la que el agente utiliza reacciones con emojis en WhatsApp:

| Nivel         | Reacciones de ack | Reacciones iniciadas por el agente | Descripción                                                    |
| ------------- | ----------------- | ---------------------------------- | -------------------------------------------------------------- |
| `"off"`       | No                | No                                 | Sin reacciones en absoluto                                     |
| `"ack"`       | Sí                | No                                 | Solo reacciones de ack (acuse de recibo previo a la respuesta) |
| `"minimal"`   | Sí                | Sí (conservador)                   | Ack + reacciones del agente con guía conservadora              |
| `"extensive"` | Sí                | Sí (fomentado)                     | Ack + reacciones del agente con guía de fomento                |

Predeterminado: `"minimal"`.

Las anulaciones por cuenta usan `channels.whatsapp.accounts.<id>.reactionLevel`.

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## Reacciones de acuse de recibo

WhatsApp admite reacciones de ack inmediatas en la recepción de entradas a través de `channels.whatsapp.ackReaction`.
Las reacciones de ack están controladas por `reactionLevel`: se suprimen cuando `reactionLevel` es `"off"`.

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

Notas sobre el comportamiento:

- enviadas inmediatamente después de que se acepta la entrada (antes de la respuesta)
- los fallos se registran pero no bloquean la entrega normal de la respuesta
- el modo de grupo `mentions` reacciona en los turnos activados por mención; la activación de grupo `always` actúa como omisión para esta verificación
- WhatsApp usa `channels.whatsapp.ackReaction` (el antiguo `messages.ackReaction` no se usa aquí)

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los ids de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente, de lo contrario el primer id de cuenta configurado (ordenado)
    - los ids de cuenta se normalizan internamente para la búsqueda
  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad heredada">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de copia de seguridad: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` todavía se reconoce/migra para flujos de cuenta predeterminada
  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- El soporte de herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Acciones de puerta (Action gates):
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada (desactívelas mediante `channels.whatsapp.configWrites=false`).

## Solución de problemas

<AccordionGroup>
  <Accordion title="No vinculado (se requiere QR)">
    Síntoma: el estado del canal informa que no está vinculado.

    Solución:

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Vinculado pero desconectado / bucle de reconexión">
    Síntoma: cuenta vinculada con desconexiones repetidas o intentos de reconexión.

    Solución:

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    Si es necesario, vuelva a vincular con `channels login`.

  </Accordion>

  <Accordion title="Sin escucha activo al enviar">
    Los envíos salientes fallan rápidamente cuando no existe un escucha activo de la puerta de enlace para la cuenta de destino.

    Asegúrese de que la puerta de enlace se esté ejecutando y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Comprueba en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista blanca de `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores sobrescriben las anteriores, por lo que debes mantener un único `groupPolicy` por ámbito

  </Accordion>

  <Accordion title="Advertencia de runtime de Bun">
    El runtime de la puerta de enlace de WhatsApp debería usar Node. Bun está marcado como incompatible para una operación estable de la puerta de enlace de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - WhatsApp](/en/gateway/configuration-reference#whatsapp)

Campos de alta señal de WhatsApp:

- acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-cuenta: `accounts.<id>.enabled`, `accounts.<id>.authDir`, anulaciones a nivel de cuenta
- operaciones: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportamiento de sesión: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Grupos](/en/channels/groups)
- [Seguridad](/en/gateway/security)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Enrutamiento multiagente](/en/concepts/multi-agent)
- [Solución de problemas](/en/channels/troubleshooting)
