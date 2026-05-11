---
summary: "Soporte del canal de WhatsApp, controles de acceso, comportamiento de entrega y operaciones"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

Estado: listo para producción a través de WhatsApp Web (Baileys). La puerta de enlace es propietaria de la(s) sesión(es) vinculada(s).

## Instalación (bajo demanda)

- La incorporación (`openclaw onboard`) y `openclaw channels add --channel whatsapp`
  solicitan instalar el complemento de WhatsApp la primera vez que lo seleccionas.
- `openclaw channels login --channel whatsapp` también ofrece el flujo de instalación cuando
  el complemento aún no está presente.
- Canal de desarrollo + git checkout: predeterminado a la ruta local del complemento.
- Estable/Beta: predeterminado al paquete npm `@openclaw/whatsapp`.

La instalación manual permanece disponible:

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
    Patrones y ejemplos completos de configuración del canal.
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

    Para adjuntar un directorio de autenticación de WhatsApp Web existente/personalizado antes del inicio de sesión:

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Iniciar la puerta de enlace">

```bash
openclaw gateway
```

  </Step>

  <Step title="Aprobar la primera solicitud de emparejamiento (si usa el modo de emparejamiento)">

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
    La incorporación admite el modo de número personal y escribe una línea base amigable con el autochat:

    - `dmPolicy: "allowlist"`
    - `allowFrom` incluye tu número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autochat se basan en el número propio vinculado y `allowFrom`.

  </Accordion>

  <Accordion title="Ámbito de canal solo de WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual de canales de OpenClaw.

    No hay un canal de mensajería de WhatsApp de Twilio separado en el registro de canales de chat integrado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- El Gateway posee el socket de WhatsApp y el bucle de reconexión.
- El perro guardián de reconexión utiliza la actividad de transporte de WhatsApp Web, no solo el volumen de mensajes entrantes de la aplicación, por lo que una sesión de dispositivo vinculado silenciosa no se reinicia únicamente porque nadie haya enviado un mensaje recientemente. Un límite de silencio de aplicación más largo aún fuerza una reconexión si los marcos de transporte siguen llegando pero no se manejan mensajes de aplicación durante la ventana del perro guardián.
- Los envíos salientes requieren un oyente de WhatsApp activo para la cuenta de destino.
- Los chats de estado y de difusión se ignoran (`@status`, `@broadcast`).
- Los chats directos utilizan reglas de sesión de MD (`session.dmScope`; el valor predeterminado `main` colapsa los MD en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).
- El transporte de WhatsApp Web respeta las variables de entorno de proxy estándar en el host de la puerta de enlace (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minúsculas). Se prefiere la configuración de proxy a nivel de host sobre la configuración de proxy de WhatsApp específica del canal.
- Cuando `messages.removeAckAfterReply` está habilitado, OpenClaw borra la reacción de confirmación de ack de WhatsApp después de que se entrega una respuesta visible.

## Ganchos de complemento y privacidad

Los mensajes entrantes de WhatsApp pueden contener contenido de mensajes personales, números de teléfono,
identificadores de grupo, nombres de remitentes y campos de correlación de sesión. Por esa razón,
WhatsApp no transmite cargas útiles de enlace `message_received` entrantes a los complementos
a menos que usted opte explícitamente por ello:

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

Puede limitar la aceptación a una sola cuenta:

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

Solo habilite esto para complementos en los que confíe para recibir contenido de mensajes entrantes
de WhatsApp e identificadores.

## Control de acceso y activación

<Tabs>
  <Tab title="Política de MD">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números de estilo E.164 (normalizados internamente).

    Excepción multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados de nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se persisten en el almacenamiento de permitidos del canal y se fusionan con los `allowFrom` configurados
    - si no se configura una lista blanca, el número propio vinculado se permite por defecto
    - OpenClaw nunca empareja automáticamente los MD `fromMe` salientes (mensajes que usted se envía a sí mismo desde el dispositivo vinculado)

  </Tab>

  <Tab title="Política de grupo + listas de permitidos">
    El acceso al grupo tiene dos capas:

    1. **Lista de permitidos de miembros del grupo** (`channels.whatsapp.groups`)
       - si se omite `groups`, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos de grupos (`"*"` permitidos)

    2. **Política de remitentes del grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: se omite la lista de permitidos de remitentes
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear todo el entrante del grupo

    Respaldo de la lista de permitidos de remitentes:

    - si `groupAllowFrom` no está configurado, el tiempo de ejecución recurre a `allowFrom` cuando esté disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación de mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, el respaldo de la política de grupo del tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está configurado.

  </Tab>

  <Tab title="Menciones + /activación">
    Por defecto, las respuestas de grupo requieren mención.

    La detección de menciones incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de regex de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - transcripciones de notas de voz entrantes para mensajes de grupo autorizados
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - cita/responder solo satisface el filtrado de mención; no **no** otorga autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista de permitidos siguen bloqueados incluso si responden al mensaje de un usuario permitido

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está restringido al propietario.

  </Tab>
</Tabs>

## Comportamiento del número personal y del chat consigo mismo

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de chat consigo mismo de WhatsApp:

- omitir confirmaciones de lectura para los turnos de chat consigo mismo
- ignorar el comportamiento de activación automática de mención-JID que de otro modo te notificaría a ti mismo
- si `messages.responsePrefix` no está configurado, las respuestas de chat propio usan por defecto `[{identity.name}]` o `[openclaw]`

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

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, remitente JID/E.164).

  </Accordion>

  <Accordion title="Marcadores de posición de medios y extracción de ubicación/contacto">
    Los mensajes entrantes de solo medios se normalizan con marcadores de posición como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las notas de voz de grupos autorizadas se transcriben antes del filtrado de menciones cuando el
    cuerpo es solo `<media:audio>`, por lo que decir la mención del bot en la nota de voz puede
    activar la respuesta. Si la transcripción aún no menciona al bot,
    la transcripción se mantiene en el historial de grupos pendientes en lugar del marcador de posición original.

    Los cuerpos de ubicación usan texto de coordenadas abreviado. Las etiquetas/comentarios de ubicación y los detalles de contacto/vCard se representan como metadatos no confinados cercados, no como texto de indicador en línea.

  </Accordion>

  <Accordion title="Inyección de historial de grupos pendientes">
    Para grupos, los mensajes no procesados pueden almacenarse en el búfer e inyectarse como contexto cuando finalmente se activa el bot.

    - límite predeterminado: `50`
    - configuración: `channels.whatsapp.historyLimit`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` desactiva

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

    Los chats propios omiten las confirmaciones de lectura incluso cuando están habilitadas globalmente.

  </Accordion>
</AccordionGroup>

## Entrega, fragmentación y medios

<AccordionGroup>
  <Accordion title="Fragmentación de texto">
    - límite de fragmentación predeterminado: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - el modo `newline` prefiere los límites de párrafo (líneas en blanco), y luego recurre a una fragmentación segura en longitud
  </Accordion>

<Accordion title="Comportamiento de los medios salientes">
  - admite cargas de imagen, video, audio (nota de voz PTT) y documentos - los medios de audio se envían a través de la carga `audio` de Baileys con `ptt: true`, por lo que los clientes de WhatsApp lo renderizan como una nota de voz de pulsar para hablar - las cargas de respuesta preservan `audioAsVoice`; la salida de nota de voz TTS para WhatsApp se mantiene en esta ruta PTT incluso cuando el
  proveedor devuelve MP3 o WebM - el audio Ogg/Opus nativo se envía como `audio/ogg; codecs=opus` para la compatibilidad con notas de voz - el audio no Ogg, incluyendo la salida MP3/WebM de TTS de Microsoft Edge, se transcodifica con `ffmpeg` a Ogg/Opus mono de 48 kHz antes de la entrega PTT - `/tts latest` envía la última respuesta del asistente como una sola nota de voz y suprime los envíos
  repetidos para la misma respuesta; `/tts chat on|off|default` controla el TTS automático para el chat actual de WhatsApp - la reproducción de GIF animados es compatible a través de `gifPlayback: true` en el envío de videos - los subtítulos se aplican al primer elemento multimedia al enviar cargas de respuesta multimedia, excepto que las notas de voz PTT envían el audio primero y el texto visible
  por separado porque los clientes de WhatsApp no renderizan los subtítulos de las notas de voz de manera consistente - la fuente multimedia puede ser HTTP(S), `file://` o rutas locales
</Accordion>

  <Accordion title="Límites de tamaño de multimedia y comportamiento de reserva">
    - límite de guardado de multimedia entrante: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - límite de envío de multimedia saliente: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - las anulaciones por cuenta utilizan `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - las imágenes se optimizan automáticamente (redimensión/ajuste de calidad) para ajustarse a los límites
    - ante el fallo de envío de multimedia, la reserva del primer elemento envía una advertencia de texto en lugar de descartar la respuesta silenciosamente
  </Accordion>
</AccordionGroup>

## Cita de respuesta

WhatsApp admite las citas de respuesta nativas, donde las respuestas salientes citan visiblemente el mensaje entrante. Controle esto con `channels.whatsapp.replyToMode`.

| Valor       | Comportamiento                                                                     |
| ----------- | ---------------------------------------------------------------------------------- |
| `"off"`     | Nunca citar; enviar como un mensaje simple                                         |
| `"first"`   | Citar solo el primer fragmento de respuesta saliente                               |
| `"all"`     | Citar cada fragmento de respuesta saliente                                         |
| `"batched"` | Citar las respuestas por lotes en cola dejando las respuestas inmediatas sin citar |

El valor predeterminado es `"off"`. Las anulaciones por cuenta utilizan `channels.whatsapp.accounts.<id>.replyToMode`.

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## Nivel de reacción

`channels.whatsapp.reactionLevel` controla con qué amplitud utiliza el agente las reacciones de emojis en WhatsApp:

| Nivel         | Reacciones de reconocimiento | Reacciones iniciadas por el agente | Descripción                                                            |
| ------------- | ---------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `"off"`       | No                           | No                                 | Sin reacciones en absoluto                                             |
| `"ack"`       | Sí                           | No                                 | Solo reacciones de reconocimiento (confirmación previa a la respuesta) |
| `"minimal"`   | Sí                           | Sí (conservador)                   | Reacciones de reconocimiento + del agente con orientación conservadora |
| `"extensive"` | Sí                           | Sí (fomentado)                     | Reacciones de reconocimiento + del agente con orientación de fomento   |

Predeterminado: `"minimal"`.

Las anulaciones por cuenta utilizan `channels.whatsapp.accounts.<id>.reactionLevel`.

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

WhatsApp admite reacciones de reconocimiento inmediatas al recibir mensajes entrantes a través de `channels.whatsapp.ackReaction`.
Las reacciones de reconocimiento están controladas por `reactionLevel`; se suprimen cuando `reactionLevel` es `"off"`.

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

- enviadas inmediatamente después de que se acepta el mensaje entrante (antes de la respuesta)
- los fallos se registran pero no bloquean la entrega de respuestas normales
- el modo de grupo `mentions` reacciona en turnos desencadenados por mención; la activación de grupo `always` actúa como bypass para esta verificación
- WhatsApp utiliza `channels.whatsapp.ackReaction` (el `messages.ackReaction` heredado no se usa aquí)

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los IDs de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente, de lo contrario el primer ID de cuenta configurado (ordenado)
    - los IDs de cuenta se normalizan internamente para la búsqueda
  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad con versiones heredadas">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de respaldo: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` todavía se reconoce/migra para flujos de cuenta predeterminada
  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- El soporte de herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Puertas de acción (Action gates):
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada (desactívelas mediante `channels.whatsapp.configWrites=false`).

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

    Las cuentas inactivas pueden permanecer conectadas más allá del tiempo de espera normal del mensaje; el perro guardián
    se reinicia cuando la actividad de transporte de WhatsApp Web se detiene, el socket se cierra o
    la actividad a nivel de aplicación permanece en silencio más allá de la ventana de seguridad más larga.

    Solución:

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    Si es necesario, vuelva a vincular con `channels login`.

  </Accordion>

  <Accordion title="El inicio de sesión con QR agota el tiempo de espera detrás de un proxy">
    Síntoma: `openclaw channels login --channel whatsapp` falla antes de mostrar un código QR utilizable con `status=408 Request Time-out` o una desconexión del socket TLS.

    El inicio de sesión de WhatsApp Web utiliza el entorno proxy estándar del host de la pasarela (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minúsculas y `NO_PROXY`). Verifique que el proceso de la pasarela herede el entorno proxy y que `NO_PROXY` no coincida con `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="Sin escucha activa al enviar">
    Los envíos salientes fallan rápidamente cuando no existe ningún escucha activo de la pasarela para la cuenta de destino.

    Asegúrese de que la pasarela se esté ejecutando y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Compruebe en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista blanca de `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores anulan las anteriores, por lo que debe mantener un solo `groupPolicy` por ámbito

  </Accordion>

  <Accordion title="Advertencia del tiempo de ejecución de Bun">
    El tiempo de ejecución de la pasarela de WhatsApp debe usar Node. Bun está marcado como incompatible para el funcionamiento estable de la pasarela de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts del sistema

WhatsApp admite instrucciones del sistema al estilo de Telegram para grupos y chats directos a través de los mapas `groups` y `direct`.

Jerarquía de resolución para mensajes de grupo:

Primero se determina el mapa `groups` efectivo: si la cuenta define su propio `groups`, reemplaza completamente el mapa raíz `groups` (sin fusión profunda). La búsqueda de instrucciones (prompt) luego se ejecuta en el mapa único resultante:

1. **Instrucción del sistema específica del grupo** (`groups["<groupId>"].systemPrompt`): se utiliza cuando la entrada específica del grupo existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ninguna instrucción del sistema.
2. **Instrucción del sistema con comodín de grupo** (`groups["*"].systemPrompt`): se utiliza cuando la entrada específica del grupo está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

Jerarquía de resolución para mensajes directos:

Primero se determina el mapa `direct` efectivo: si la cuenta define su propio `direct`, reemplaza completamente el mapa raíz `direct` (sin fusión profunda). La búsqueda de instrucciones luego se ejecuta en el mapa único resultante:

1. **Instrucción del sistema específica directa** (`direct["<peerId>"].systemPrompt`): se utiliza cuando la entrada específica del par existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ninguna instrucción del sistema.
2. **Instrucción del sistema con comodín directo** (`direct["*"].systemPrompt`): se utiliza cuando la entrada específica del par está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

<Note>
`dms` sigue siendo el depósito de invalidación de historial ligero por mensaje directo (`dms.<id>.historyLimit`). Las invalidaciones de instrucciones residen en `direct`.
</Note>

**Diferencia con el comportamiento multi-cuenta de Telegram:** En Telegram, el `groups` raíz se suprime intencionalmente para todas las cuentas en una configuración multi-cuenta, incluso para las cuentas que no definen su propio `groups`, para evitar que un bot reciba mensajes de grupos a los que no pertenece. WhatsApp no aplica esta protección: el `groups` raíz y el `direct` raíz siempre se heredan en las cuentas que no definen una invalidación a nivel de cuenta, independientemente de cuántas cuentas estén configuradas. En una configuración multi-cuenta de WhatsApp, si desea indicaciones (prompts) de grupo o directas por cuenta, defina el mapa completo en cada cuenta explícitamente en lugar de confiar en los valores predeterminados de nivel raíz.

Comportamiento importante:

- `channels.whatsapp.groups` es tanto un mapa de configuración por grupo como la lista de permitidos de grupos a nivel de chat. Ya sea en el ámbito raíz o de cuenta, `groups["*"]` significa "todos los grupos son admitidos" para ese ámbito.
- Solo añada un grupo comodín `systemPrompt` cuando ya desee que ese ámbito admita todos los grupos. Si todavía desea que solo un conjunto fijo de ID de grupo sean elegibles, no use `groups["*"]` para el valor predeterminado del prompt. En su lugar, repita el prompt en cada entrada de grupo explícitamente permitida.
- La admisión de grupo y la autorización del remitente son verificaciones separadas. `groups["*"]` amplía el conjunto de grupos que pueden alcanzar el manejo de grupos, pero por sí solo no autoriza a todos los remitentes en esos grupos. El acceso del remitente aún se controla por separado mediante `channels.whatsapp.groupPolicy` y `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` no tiene el mismo efecto secundario para los MD (mensajes directos). `direct["*"]` solo proporciona una configuración de chat directo predeterminada después de que un MD ya ha sido admitido por `dmPolicy` más `allowFrom` o reglas del almacén de emparejamiento (pairing-store).

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

- [Referencia de configuración - WhatsApp](/es/gateway/config-channels#whatsapp)

Campos de WhatsApp de alta señal:

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
