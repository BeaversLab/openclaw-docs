---
summary: "Soporte del canal de WhatsApp, controles de acceso, comportamiento de entrega y operaciones"
read_when:
  - Trabajando en el comportamiento del canal de WhatsApp/web o en el enrutamiento de la bandeja de entrada
title: "WhatsApp"
---

# WhatsApp (Canal web)

Estado: listo para producción a través de WhatsApp Web (Baileys). Gateway es propietario de la(s) sesión(es) vinculada(s).

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política predeterminada de MD es el emparejamiento para remitentes desconocidos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card
    title="Configuración de la puerta de enlace"
    icon="settings"
    href="/es/gateway/configuration"
  >
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

  <Step title="Vincular WhatsApp (código QR)">

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

<Note>
  OpenClaw recomienda ejecutar WhatsApp en un número separado cuando sea posible. (Los metadatos del
  canal y el flujo de configuración están optimizados para esa configuración, pero las
  configuraciones con número personal también son compatibles.)
</Note>

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Número dedicado (recomendado)">
    Este es el modo operativo más limpio:

    - identidad de WhatsApp separada para OpenClaw
    - listas de permitidos de MD y límites de enrutamiento más claros
    - menor probabilidad de confusión con el autochat

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
    - `allowFrom` incluye su número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autochat se basan en el número propio vinculado y `allowFrom`.

  </Accordion>

  <Accordion title="Ámbito del canal solo de WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual de canales de OpenClaw.

    No hay un canal de mensajería de Twilio WhatsApp separado en el registro de canales de chat integrado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- La pasarela es propietaria del socket de WhatsApp y del bucle de reconexión.
- Los envíos de salida requieren un oyente de WhatsApp activo para la cuenta de destino.
- Los chats de estado y transmisión se ignoran (`@status`, `@broadcast`).
- Los chats directos usan reglas de sesión de DM (`session.dmScope`; el valor predeterminado `main` colapsa los DM en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).

## Control de acceso y activación

<Tabs>
  <Tab title="Política de DM">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números con estilo E.164 (normalizados internamente).

    Invalidación de multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados de nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se conservan en el almacén de allow del canal y se fusionan con `allowFrom` configurado
    - si no se configura una lista de permitidos, el número propio vinculado se permite de forma predeterminada
    - los DM `fromMe` salientes nunca se emparejan automáticamente

  </Tab>

  <Tab title="Group policy + allowlists">
    El acceso al grupo tiene dos capas:

    1. **Lista de permitidos de membresía del grupo** (`channels.whatsapp.groups`)
       - si se omite `groups`, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos de grupos (`"*"` permitidos)

    2. **Política de remitente del grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: lista de permitidos de remitentes omitida
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear toda la entrada del grupo

    Respaldo de lista de permitidos de remitentes:

    - si `groupAllowFrom` no está configurado, el tiempo de ejecución recurre a `allowFrom` cuando esté disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación por mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, el respaldo de la política de grupo del tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está configurado.

  </Tab>

  <Tab title="Mentions + /activation">
    Las respuestas del grupo requieren mención de forma predeterminada.

    La detección de menciones incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de expresiones regulares de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - la cita/respuesta solo satisface el filtrado de mención; no **otorga** autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista de permitidos aún se bloquean incluso si responden al mensaje de un usuario incluido en la lista de permitidos

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está limitado al propietario.

  </Tab>
</Tabs>

## Comportamiento de número personal y autocomunicación

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de autoprocesamiento de WhatsApp:

- omitir confirmaciones de lectura para turnos de autocomunicación
- ignore mention-JID auto-trigger behavior that would otherwise ping yourself
- si `messages.responsePrefix` no está configurado, las respuestas de autoprocesamiento tienen como valor predeterminado `[{identity.name}]` o `[openclaw]`

## Normalización de mensajes y contexto

<AccordionGroup>
  <Accordion title="Sobre entrante y contexto de respuesta">
    Los mensajes entrantes de WhatsApp se envuelven en el sobre entrante compartido.

    Si existe una respuesta citada, el contexto se adjunta de esta forma:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, remitente JID/E.164).

  </Accordion>

  <Accordion title="Marcadores de posición multimedia y extracción de ubicación/contacto">
    Los mensajes entrantes de solo contenido multimedia se normalizan con marcadores de posición como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las cargas útiles de ubicación y contacto se normalizan en un contexto de texto antes del enrutamiento.

  </Accordion>

  <Accordion title="Inyección de historial de grupos pendiente">
    Para los grupos, los mensajes no procesados pueden almacenarse en búfer e inyectarse como contexto cuando finalmente se activa el bot.

    - límite predeterminado: `50`
    - configuración: `channels.whatsapp.historyLimit`
    - alternativa (fallback): `messages.groupChat.historyLimit`
    - `0` desactiva

    Marcadores de inyección:

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Confirmaciones de lectura">
    Las confirmaciones de lectura están habilitadas de forma predeterminada para los mensajes entrantes de WhatsApp aceptados.

    Desactivar globalmente:

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
    - límite de fragmentos predeterminado: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - el modo `newline` prefiere los límites de párrafo (líneas en blanco), y luego recurre a una fragmentación segura en longitud
  </Accordion>

<Accordion title="Comportamiento de los medios salientes">
  - admite cargas útiles de imagen, video, audio (nota de voz PTT) y documentos - `audio/ogg` se
  reescribe como `audio/ogg; codecs=opus` para la compatibilidad con notas de voz - la reproducción
  de GIF animados se admite mediante `gifPlayback: true` en el envío de videos - los subtítulos se
  aplican al primer elemento multimedia al enviar cargas útiles de respuesta multimedia - la fuente
  multimedia puede ser HTTP(S), `file://` o rutas locales
</Accordion>

  <Accordion title="Límites de tamaño de medios y comportamiento de respaldo">
    - límite de guardado de medios entrantes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - límite de envío de medios salientes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - las anulaciones por cuenta usan `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - las imágenes se optimizan automáticamente (cambio de tamaño/g barrido de calidad) para ajustarse a los límites
    - ante el fallo del envío de medios, la reserva del primer elemento envía una advertencia de texto en lugar de omitir la respuesta silenciosamente
  </Accordion>
</AccordionGroup>

## Reacciones de reconocimiento

WhatsApp admite reacciones de reconocimiento inmediatas en la recepción entrante a través de `channels.whatsapp.ackReaction`.

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

Notas de comportamiento:

- enviadas inmediatamente después de aceptar el mensaje entrante (pre-respuesta)
- los fallos se registran pero no bloquean la entrega de la respuesta normal
- el modo de grupo `mentions` reacciona en turnos desencadenados por mención; la activación del grupo `always` actúa como derivación para esta verificación
- WhatsApp usa `channels.whatsapp.ackReaction` (el `messages.ackReaction` heredado no se usa aquí)

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los identificadores de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente; de lo contrario, el primer id de cuenta configurado (ordenado)
    - los identificadores de cuenta se normalizan internamente para la búsqueda
  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad heredada">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de copia de seguridad: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` aún se reconoce/migra para flujos de cuenta predeterminada
  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- La compatibilidad con las herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Compuertas de acción:
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada (desactívelas mediante `channels.whatsapp.configWrites=false`).

## Solución de problemas

<AccordionGroup>
  <Accordion title="No vinculado (se requiere QR)">
    Síntoma: los informes de estado del canal indican que no están vinculados.

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

  <Accordion title="Sin escucha activa al enviar">
    Los envíos salientes fallan rápidamente cuando no existe un escucha de puerta de enlace activo para la cuenta de destino.

    Asegúrese de que la puerta de enlace se esté ejecutando y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Compruebe en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista de permitidos de `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores anulan las anteriores, así que mantenga un solo `groupPolicy` por ámbito

  </Accordion>

  <Accordion title="Advertencia del tiempo de ejecución de Bun">
    El tiempo de ejecución de la puerta de enlace de WhatsApp debe usar Node. Bun se marca como incompatible para el funcionamiento estable de la puerta de enlace de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - WhatsApp](/es/gateway/configuration-reference#whatsapp)

Campos de alta señal de WhatsApp:

- acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multicuenta: `accounts.<id>.enabled`, `accounts.<id>.authDir`, invalidaciones a nivel de cuenta
- operaciones: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportamiento de la sesión: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)

import es from "/components/footer/es.mdx";

<es />
