---
summary: "Soporte del canal WhatsApp, controles de acceso, comportamiento de entrega y operaciones"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (Canal web)

Estado: listo para producción a través de WhatsApp Web (Baileys). Gateway es propietario de la(s) sesión(es) vinculada(s).

## Instalación (bajo demanda)

- Incorporación (`openclaw onboard`) y `openclaw channels add --channel whatsapp`
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
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política de MD predeterminada es el emparejamiento para remitentes desconocidos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card title="Configuración de la puerta de enlace" icon="settings" href="/es/gateway/configuration">
    Patrones y ejemplos completos de configuración de canales.
  </Card>
</CardGroup>

## Configuración rápida

<Steps>
  <Step title="Configurar la política de acceso de WhatsApp">

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

## Patrones de despliegue

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

  <Accordion title="Respaldo con número personal">
    La incorporación admite el modo de número personal y escribe una línea base amigable para el autochat:

    - `dmPolicy: "allowlist"`
    - `allowFrom` incluye tu número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autochat se basan en el número propio vinculado y `allowFrom`.

  </Accordion>

  <Accordion title="Ámbito del canal solo de WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual del canal de OpenClaw.

    No hay un canal de mensajería Twilio WhatsApp separado en el registro de canales de chat integrado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- La puerta de enlace posee el socket de WhatsApp y el bucle de reconexión.
- Los envíos salientes requieren un oyente de WhatsApp activo para la cuenta de destino.
- Los chats de estado y de difusión se ignoran (`@status`, `@broadcast`).
- Los chats directos utilizan reglas de sesión de DM (`session.dmScope`; el valor predeterminado `main` colapsa los DM en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).
- El transporte de WhatsApp Web respeta las variables de entorno de proxy estándar en el host de la puerta de enlace (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minúsculas). Se prefiere la configuración de proxy a nivel de host sobre la configuración de proxy específica del canal de WhatsApp.

## Control de acceso y activación

<Tabs>
  <Tab title="Política de DM">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números en estilo E.164 (normalizados internamente).

    Invalidación multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados a nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se guardan en el almacén de permitidos del canal y se fusionan con el `allowFrom` configurado
    - si no se configura una lista de permitidos, el propio número vinculado se permite de forma predeterminada
    - los DM `fromMe` salientes nunca se emparejan automáticamente

  </Tab>

  <Tab title="Política de grupo + listas de permitidos">
    El acceso al grupo tiene dos capas:

    1. **Lista de permitidos de membresía de grupo** (`channels.whatsapp.groups`)
       - si `groups` se omite, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos de grupo (`"*"` permitidos)

    2. **Política de remitente de grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: lista de permitidos de remitentes omitida
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear todo el tráfico entrante del grupo

    Alternativa de lista de permitidos de remitentes:

    - si `groupAllowFrom` no está establecido, el tiempo de ejecución recurre a `allowFrom` cuando esté disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación por mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, la alternativa de política de grupo en tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está establecido.

  </Tab>

  <Tab title="Menciones + /activación">
    Las respuestas grupales requieren mención por defecto.

    La detección de menciones incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de expresiones regulares de mención configurados (`agents.list[].groupChat.mentionPatterns`, por defecto `messages.groupChat.mentionPatterns`)
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - citar/responder solo satisface el filtrado de menciones; **no** otorga autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista blanca siguen bloqueados incluso si responden al mensaje de un usuario incluido en la lista blanca

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está restringido al propietario.

  </Tab>
</Tabs>

## Comportamiento del número personal y del autchat

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de autoproyección de WhatsApp:

- omitir confirmaciones de lectura para los turnos de autchat
- ignore mention-JID auto-trigger behavior that would otherwise ping yourself
- si `messages.responsePrefix` no está establecido, las respuestas de autoproyección por defecto son `[{identity.name}]` o `[openclaw]`

## Normalización de mensajes y contexto

<AccordionGroup>
  <Accordion title="Sobre de entrada + contexto de respuesta">
    Los mensajes entrantes de WhatsApp se envuelven en el sobre de entrada compartido.

    Si existe una respuesta citada, el contexto se añade de esta forma:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID/E.164 del remitente).

  </Accordion>

  <Accordion title="Marcadores de posición de medios y extracción de ubicación/contacto">
    Los mensajes entrantes solo de medios se normalizan con marcadores de posición tales como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las cargas útiles de ubicación y contacto se normalizan en un contexto textual antes del enrutamiento.

  </Accordion>

  <Accordion title="Inyección de historial de grupos pendiente">
    Para los grupos, los mensajes sin procesar pueden almacenarse en búfer e inyectarse como contexto cuando el bot finalmente se active.

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

    Los turnos de autochat omiten las confirmaciones de lectura incluso cuando están habilitadas globalmente.

  </Accordion>
</AccordionGroup>

## Entrega, fragmentación y medios

<AccordionGroup>
  <Accordion title="Fragmentación de texto">
    - límite de fragmentación predeterminado: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - el modo `newline` prefiere los límites de párrafo (líneas en blanco), y luego recurre a la fragmentación segura de longitud
  </Accordion>

<Accordion title="Comportamiento de medios salientes">
  - admite cargas de imagen, video, audio (nota de voz PTT) y documentos - `audio/ogg` se reescribe a `audio/ogg; codecs=opus` para la compatibilidad con notas de voz - la reproducción de GIF animados es compatible a través de `gifPlayback: true` en envíos de video - los subtítulos se aplican al primer elemento multimedia al enviar cargas de respuesta multimedia - la fuente multimedia puede ser
  HTTP(S), `file://` o rutas locales
</Accordion>

  <Accordion title="Límites de tamaño de medios y comportamiento de reserva">
    - límite de guardado de medios entrantes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - límite de envío de medios salientes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - las anulaciones por cuenta usan `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - las imágenes se optimizan automáticamente (redimensionamiento/barrido de calidad) para ajustarse a los límites
    - ante el fallo de envío de medios, la reserva del primer elemento envía una advertencia de texto en lugar de descartar la respuesta silenciosamente
  </Accordion>
</AccordionGroup>

## Citar respuesta

WhatsApp admite la cita nativa de respuestas, donde las respuestas salientes citan visiblemente el mensaje entrante. Controle esto con `channels.whatsapp.replyToMode`.

| Valor    | Comportamiento                                                                          |
| -------- | --------------------------------------------------------------------------------------- |
| `"auto"` | Cita el mensaje entrante cuando el proveedor lo admite; omite la cita en caso contrario |
| `"on"`   | Cita siempre el mensaje entrante; recurre a un envío normal si se rechaza la cita       |
| `"off"`  | Nunca citar; enviar como mensaje normal                                                 |

El valor predeterminado es `"auto"`. Las anulaciones por cuenta usan `channels.whatsapp.accounts.<id>.replyToMode`.

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "on",
    },
  },
}
```

## Nivel de reacción

`channels.whatsapp.reactionLevel` controla la amplitud con la que el agente usa las reacciones de emoji en WhatsApp:

| Nivel         | Reacciones de ack | Reacciones iniciadas por el agente | Descripción                                                    |
| ------------- | ----------------- | ---------------------------------- | -------------------------------------------------------------- |
| `"off"`       | No                | No                                 | Sin reacciones en absoluto                                     |
| `"ack"`       | Sí                | No                                 | Solo reacciones de ack (acuse de recibo previo a la respuesta) |
| `"minimal"`   | Sí                | Sí (conservador)                   | Ack + reacciones del agente con orientación conservadora       |
| `"extensive"` | Sí                | Sí (fomentado)                     | Ack + reacciones del agente con orientación fomentada          |

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

## Reacciones de reconocimiento

WhatsApp admite reacciones de ack inmediatas al recibo entrante a través de `channels.whatsapp.ackReaction`.
Las reacciones de ack están controladas por `reactionLevel` — se suprimen cuando `reactionLevel` es `"off"`.

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

- se envían inmediatamente después de que se acepta el mensaje entrante (previo a la respuesta)
- los fallos se registran pero no bloquean la entrega normal de respuestas
- el modo de grupo `mentions` reacciona a los turnos activados por mención; la activación del grupo `always` actúa como omisión para esta verificación
- WhatsApp utiliza `channels.whatsapp.ackReaction` (el `messages.ackReaction` heredado no se usa aquí)

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los IDs de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente, de lo contrario el primer ID de cuenta configurado (ordenado)
    - los IDs de cuenta se normalizan internamente para la búsqueda
  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad con versiones anteriores">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de copia de seguridad: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` todavía se reconoce/migra para los flujos de cuenta predeterminada
  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- El soporte de herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Puertas de acción:
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada (desactivar mediante `channels.whatsapp.configWrites=false`).

## Solución de problemas

<AccordionGroup>
  <Accordion title="No vinculado (se requiere QR)">
    Síntoma: el estado del canal informa no vinculado.

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

    Si es necesario, volver a vincular con `channels login`.

  </Accordion>

  <Accordion title="No hay ningún escucha activo al enviar">
    Los envíos salientes fallan rápidamente cuando no existe ningún escucha de gateway activo para la cuenta de destino.

    Asegúrese de que el gateway esté ejecutándose y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Verifique en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista blanca `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores sobrescriben a las anteriores, por lo que debe mantener un solo `groupPolicy` por ámbito

  </Accordion>

  <Accordion title="Advertencia de tiempo de ejecución de Bun">
    El tiempo de ejecución del gateway de WhatsApp debe usar Node. Bun se marca como incompatible para la operación estable del gateway de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts del sistema

WhatsApp admite prompts del sistema estilo Telegram para grupos y chats directos a través de los mapas `groups` y `direct`.

Jerarquía de resolución para mensajes de grupo:

Primero se determina el mapa `groups` efectivo: si la cuenta define su propio `groups`, reemplaza completamente el mapa raíz `groups` (sin fusión profunda). La búsqueda del prompt luego se ejecuta en el mapa único resultante:

1. **Prompt del sistema específico del grupo** (`groups["<groupId>"].systemPrompt`): se usa si la entrada del grupo específico define un `systemPrompt`.
2. **Prompt del sistema con comodín de grupo** (`groups["*"].systemPrompt`): se usa cuando la entrada del grupo específico está ausente o no define ningún `systemPrompt`.

Jerarquía de resolución para mensajes directos:

Primero se determina el mapa `direct` efectivo: si la cuenta define su propio `direct`, reemplaza completamente el mapa raíz `direct` (sin fusión profunda). La búsqueda del prompt luego se ejecuta en el mapa único resultante:

1. **Prompt del sistema específico directo** (`direct["<peerId>"].systemPrompt`): se usa si la entrada del par específico define un `systemPrompt`.
2. **Prompt del sistema comodín directo** (`direct["*"].systemPrompt`): se usa cuando la entrada del par específico está ausente o no define ningún `systemPrompt`.

Nota: `dms` sigue siendo el depósito de anulación de historial por MD ligero (`dms.<id>.historyLimit`); las anulaciones de prompt residen en `direct`.

**Diferencia con el comportamiento multicuenta de Telegram:** En Telegram, el `groups` raíz se suprime intencionalmente para todas las cuentas en una configuración multicuenta, incluso para las cuentas que no definen su propio `groups`, para evitar que un bot reciba mensajes de grupo de grupos a los que no pertenece. WhatsApp no aplica esta protección: el `groups` raíz y el `direct` raíz siempre se heredan en las cuentas que no definen una anulación a nivel de cuenta, independientemente de cuántas cuentas estén configuradas. En una configuración multicuenta de WhatsApp, si desea avisos de grupo o directos por cuenta, defina el mapa completo en cada cuenta explícitamente en lugar de confiar en los valores predeterminados de nivel raíz.

Comportamiento importante:

- `channels.whatsapp.groups` es tanto un mapa de configuración por grupo como la lista de permitidos de grupos a nivel de chat. Ya sea en el ámbito raíz o de cuenta, `groups["*"]` significa "se admiten todos los grupos" para ese ámbito.
- Solo agregue un `systemPrompt` de grupo comodín cuando ya desee que ese ámbito admita todos los grupos. Si aún desea que solo un conjunto fijo de ID de grupo sean elegibles, no use `groups["*"]` para el valor predeterminado del prompt. En su lugar, repita el prompt en cada entrada de grupo explícitamente permitida.
- La admisión de grupo y la autorización del remitente son verificaciones separadas. `groups["*"]` amplía el conjunto de grupos que pueden alcanzar el manejo de grupo, pero por sí solo no autoriza a todos los remitentes en esos grupos. El acceso del remitente todavía se controla por separado mediante `channels.whatsapp.groupPolicy` y `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` no tiene el mismo efecto secundario para los MD. `direct["*"]` solo proporciona una configuración de chat directo predeterminada después de que un MD ya haya sido admitido por `dmPolicy` más `allowFrom` o las reglas del almacén de emparejamiento.

Ejemplo:

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // Use only if all groups should be admitted at the root scope.
        // Applies to all accounts that do not define their own groups map.
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // Applies to all accounts that do not define their own direct map.
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // This account defines its own groups, so root groups are fully
            // replaced. To keep a wildcard, define "*" explicitly here too.
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // Use only if all groups should be admitted in this account.
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // This account defines its own direct map, so root direct entries are
            // fully replaced. To keep a wildcard, define "*" explicitly here too.
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - WhatsApp](/es/gateway/configuration-reference#whatsapp)

Campos de alta señal de WhatsApp:

- acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multicuenta: `accounts.<id>.enabled`, `accounts.<id>.authDir`, anulaciones a nivel de cuenta
- operaciones: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportamiento de la sesión: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- indicaciones: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Seguridad](/es/gateway/security)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)
