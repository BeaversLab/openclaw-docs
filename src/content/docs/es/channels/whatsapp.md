---
summary: "Soporte del canal de WhatsApp, controles de acceso, comportamiento de entrega y operaciones"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

Estado: listo para producción a través de WhatsApp Web (Baileys). La puerta de enlace es propietaria de la(s) sesión(es) vinculada(s).

## Instalación (bajo demanda)

- Incorporación (`openclaw onboard`) y `openclaw channels add --channel whatsapp`
  solicitan instalar el complemento de WhatsApp la primera vez que lo seleccione.
- `openclaw channels login --channel whatsapp` también ofrece el flujo de instalación cuando
  el complemento aún no está presente.
- Canal de desarrollo + git checkout: predeterminado a la ruta local del complemento.
- Estable/Beta: instala primero el complemento oficial `@openclaw/whatsapp` desde ClawHub
  con npm como alternativa.
- El tiempo de ejecución de WhatsApp se distribuye fuera del paquete npm principal de OpenClaw para que
  las dependencias de tiempo de ejecución específicas de WhatsApp se mantengan con el complemento externo.

La instalación manual sigue disponible:

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

Use el paquete npm básico (`@openclaw/whatsapp`) solo cuando necesite la alternativa
del registro. Fije una versión exacta solo cuando necesite una instalación reproducible.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política predeterminada de MD es emparejamiento para remitentes desconocidos.
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

    El inicio de sesión actual se basa en QR. En entornos remotos o sin interfaz gráfica, asegúrese de
    tener una ruta confiable para entregar el código QR en vivo al teléfono que lo
    escaneará antes de iniciar el sesión.

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

  <Step title="Aprobar la primera solicitud de emparejamiento (si se usa el modo de emparejamiento)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Las solicitudes de emparejamiento caducan después de 1 hora. Las solicitudes pendientes están limitadas a 3 por canal.

  </Step>
</Steps>

<Note>OpenClaw recomienda ejecutar WhatsApp en un número separado cuando sea posible. (Los metadatos del canal y el flujo de configuración están optimizados para esa configuración, pero las configuraciones con número personal también son compatibles.)</Note>

<Warning>
  El flujo de configuración actual de WhatsApp es solo mediante QR. Los códigos QR renderizados en la terminal, capturas de pantalla, PDFs o archivos adjuntos de chat pueden caducar o volverse ilegibles mientras se retransmiten desde una máquina remota. Para hosts remotos/sin cabeza (headless), prefiera una ruta de entrega directa de imagen QR en lugar de la captura manual de terminal.
</Warning>

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Número dedicado (recomendado)">
    Este es el modo operativo más limpio:

    - identidad de WhatsApp separada para OpenClaw
    - listas de permitidos de MD y límites de enrutamiento más claros
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
    El embarque (onboarding) admite el modo de número personal y escribe una línea base amigable para el autochat:

    - `dmPolicy: "allowlist"`
    - `allowFrom` incluye su número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autochat se basan en el número propio vinculado y `allowFrom`.

  </Accordion>

  <Accordion title="Ámbito de canal solo para WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual de canales de OpenClaw.

    No hay un canal de mensajería Twilio WhatsApp separado en el registro de canales de chat incorporado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- La puerta de enlace (Gateway) posee el socket de WhatsApp y el bucle de reconexión.
- El perro guardián de reconexión utiliza la actividad de transporte de WhatsApp Web, no solo el volumen de mensajes de entrada de la aplicación, por lo que una sesión de dispositivo vinculado silenciosa no se reinicia únicamente porque nadie ha enviado un mensaje recientemente. Un límite de silencio de la aplicación más largo aún fuerza una reconexión si siguen llegando tramas de transporte pero no se manejan mensajes de la aplicación para la ventana del perro guardián; después de una reconexión transitoria para una sesión activa recientemente, esa verificación de silencio de la aplicación utiliza el tiempo de espera normal del mensaje para la primera ventana de recuperación.
- Los tiempos del socket de Baileys son explícitos bajo `web.whatsapp.*`: `keepAliveIntervalMs` controla los pings de la aplicación de WhatsApp Web, `connectTimeoutMs` controla el tiempo de espera del handshake de apertura y `defaultQueryTimeoutMs` controla los tiempos de espera de las consultas de Baileys.
- Los envíos salientes requieren un escucha de WhatsApp activo para la cuenta de destino.
- Los envíos a grupos adjuntan metadatos de mención nativos para los tokens `@+<digits>` y `@<digits>` en el texto y los pies de foto de medios cuando el token coincide con los metadatos del participante actual de WhatsApp, incluidos los grupos respaldados por LID.
- Los chats de estado y difusión se ignoran (`@status`, `@broadcast`).
- El perro guardián de reconexión sigue la actividad del transporte de WhatsApp Web, no solo el volumen de mensajes entrantes de la aplicación: las sesiones de dispositivos vinculados silenciosos se mantienen activas mientras continúan los marcos de transporte, pero una detención del transporte fuerza la reconexión mucho antes que la ruta posterior de desconexión remota.
- Los chats directos usan reglas de sesión de DM (`session.dmScope`; por defecto `main` colapsa los DMs en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).
- Los Canales/Boletines de WhatsApp pueden ser objetivos salientes explícitos con su JID nativo `@newsletter`. Los envíos de boletines salientes utilizan metadatos de sesión de canal (`agent:<agentId>:whatsapp:channel:<jid>`) en lugar de la semántica de sesión de DM.
- El transporte de WhatsApp Web respeta las variables de entorno de proxy estándar en el host de la puerta de enlace (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minúsculas). Se prefiere la configuración de proxy a nivel de host sobre la configuración de proxy específica de WhatsApp del canal.
- Cuando `messages.removeAckAfterReply` está habilitado, OpenClaw borra la reacción de acuse de recibo de WhatsApp después de que se entrega una respuesta visible.

## Prompts de aprobación

WhatsApp puede representar los prompts de aprobación de ejecución y complementos con reacciones `👍` / `👎`. La entrega está
controlada por la configuración de reenvío de aprobaciones de nivel superior:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session",
    },
    plugin: {
      enabled: true,
      mode: "targets",
      targets: [{ channel: "whatsapp", to: "+15551234567" }],
    },
  },
}
```

`approvals.exec` y `approvals.plugin` son independientes. Habilitar WhatsApp como canal solo vincula
el transporte; no envía solicitudes de aprobación a menos que la familia de aprobación coincidente esté habilitada
y se enrute a WhatsApp. El modo de sesión entrega aprobaciones nativas de emoji solo para aprobaciones que
se originan de WhatsApp. El modo de destino utiliza la canalización de reenvío compartida para objetivos de WhatsApp
explícitos y no crea una distribución de DM separada para aprobadores.

Las reacciones de aprobación de WhatsApp requieren aprobadores explícitos de WhatsApp de `allowFrom` o `"*"`.
`defaultTo` controla los objetivos de mensaje predeterminados ordinarios; no es un aprobador de aprobación. Las órdenes manuales
`/approve` aún pasan por la ruta de autorización del remitente normal de WhatsApp antes
de la resolución de la aprobación.

## Ganchos de complementos y privacidad

Los mensajes entrantes de WhatsApp pueden contenido contenido de mensajes personales, números de teléfono,
identificadores de grupo, nombres de remitentes y campos de correlación de sesión. Por esa razón,
WhatsApp no difunde las cargas útiles del gancho `message_received` entrantes a los complementos
a menos que acepte explícitamente:

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

Puede limitar la participación a una sola cuenta:

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

Solo habilite esto para complementos en los que confía para recibir contenido
e identificadores de mensajes entrantes de WhatsApp.

## Control de acceso y activación

<Tabs>
  <Tab title="Política de MD">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números en formato E.164 (normalizados internamente).

    `allowFrom` es una lista de control de acceso de remitentes de MD. No limita los envíos de salida explícitos a JIDs de grupos de WhatsApp o JIDs de canales `@newsletter`.

    Anulación multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados de nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se guardan en el almacén de permisos del canal y se fusionan con los `allowFrom` configurados
    - la automatización programada y el destinatario de reserva de los latidos usan objetivos de entrega explícitos o `allowFrom` configurados; las aprobaciones de emparejamiento de MD no son destinatarios implícitos de cron ni de latidos
    - si no se configura una lista de permitidos, el propio número vinculado se permite de forma predeterminada
    - OpenClaw nunca empareja automáticamente los MD `fromMe` salientes (mensajes que te envías a ti mismo desde el dispositivo vinculado)

  </Tab>

  <Tab title="Group policy + allowlists">
    El acceso a grupos tiene dos capas:

    1. **Lista de permitidos de pertenencia al grupo** (`channels.whatsapp.groups`)
       - si se omite `groups`, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos de grupos (`"*"` permitidos)

    2. **Política de remitente de grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: se omite la lista de permitidos de remitentes
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear todo el entrante del grupo

    Respaldo de la lista de permitidos de remitentes:

    - si `groupAllowFrom` no está configurado, el tiempo de ejecución recurre a `allowFrom` cuando esté disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación de mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, el respaldo de la política de grupo en tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está configurado.

  </Tab>

  <Tab title="Mentions + /activation">
    De forma predeterminada, las respuestas de grupo requieren mención.

    La detección de menciones incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de regex de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - transcripciones de notas de voz entrantes para mensajes de grupos autorizados
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - citar/responder solo satisface el filtrado de mención; **no** otorga autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista de permitidos aún se bloquean incluso si responden al mensaje de un usuario incluido en la lista de permitidos

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está restringido al propietario.

  </Tab>
</Tabs>

## Comportamiento del número personal y del autchat

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de autchat de WhatsApp:

- omitir confirmaciones de lectura para los turnos de autchat
- ignorar el comportamiento de activación automática por mencionar JID que de otro modo te haría ping a ti mismo
- si `messages.responsePrefix` no está configurado, las respuestas de autochat predeterminan a `[{identity.name}]` o `[openclaw]`

## Normalización de mensajes y contexto

<AccordionGroup>
  <Accordion title="Sobre entrante + contexto de respuesta">
    Los mensajes entrantes de WhatsApp se envuelven en el sobre entrante compartido.

    Si existe una respuesta citada, el contexto se anexa de esta forma:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID del remitente/E.164).
    Cuando el objetivo de la respuesta citada es multimedia descargable, OpenClaw lo guarda a través del
    almacén multimedia entrante normal y lo expone como `MediaPath`/`MediaType` para que
    el agente pueda inspeccionar la imagen referenciada en lugar de solo ver
    `<media:image>`.

  </Accordion>

  <Accordion title="Marcadores de posición multimedia y extracción de ubicación/contacto">
    Los mensajes entrantes solo multimedia se normalizan con marcadores de posición como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las notas de voz de grupos autorizadas se transcriben antes del filtrado de menciones cuando el
    cuerpo es solo `<media:audio>`, por lo que decir la mención del bot en la nota de voz puede
    activar la respuesta. Si la transcripción aún no menciona al bot, la
    transcripción se mantiene en el historial pendiente del grupo en lugar del marcador de posición sin procesar.

    Los cuerpos de ubicación usan texto de coordenadas conciso. Las etiquetas/comentarios de ubicación y los detalles de contacto/vCard se representan como metadatos no confinados de seguridad, no como texto de solicitud en línea.

  </Accordion>

  <Accordion title="Inyección de historial de grupos pendiente">
    Para los grupos, los mensajes no procesados pueden ser almacenados en búfer e inyectados como contexto cuando el bot finalmente se active.

    - límite predeterminado: `50`
    - configuración: `channels.whatsapp.historyLimit`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` desactiva

    Marcadores de inyección:

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Confirmaciones de lectura">
    Las confirmaciones de lectura están habilitadas de forma predeterminada para los mensajes entrantes de WhatsApp aceptados.

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
    - el modo `newline` prefiere los límites de párrafo (líneas en blanco), luego recurre a una fragmentación segura por longitud

  </Accordion>

  <Accordion title="Comportamiento de los medios salientes">
    - admite cargas útiles de imagen, video, audio (nota de voz PTT) y documento
    - los medios de audio se envían a través de la carga útil `audio` de Baileys con `ptt: true`, por lo que los clientes de WhatsApp lo representan como una nota de voz de pulsar para hablar
    - las cargas útiles de respuesta preservan `audioAsVoice`; la salida de notas de voz de TTS para WhatsApp se mantiene en esta ruta PTT incluso cuando el proveedor devuelve MP3 o WebM
    - el audio nativo Ogg/Opus se envía como `audio/ogg; codecs=opus` para la compatibilidad de notas de voz
    - el audio no Ogg, incluida la salida MP3/WebM de TTS de Microsoft Edge, se transcodifica con `ffmpeg` a Ogg/Opus mono de 48 kHz antes de la entrega PTT
    - `/tts latest` envía la última respuesta del asistente como una nota de voz y suprime los envíos repetidos de la misma respuesta; `/tts chat on|off|default` controla el TTS automático para el chat actual de WhatsApp
    - la reproducción de GIF animados es compatible a través de `gifPlayback: true` en el envío de videos
    - `forceDocument` / `asDocument` envía imágenes, GIF y videos salientes a través de la carga útil de documento de Baileys para evitar la compresión de medios de WhatsApp y preservar el nombre de archivo resuelto y el tipo MIME
    - los subtítulos se aplican al primer elemento multimedia al enviar cargas útiles de respuesta multimedia, excepto que las notas de voz PTT envían el audio primero y el texto visible por separado porque los clientes de WhatsApp no representan los subtítulos de las notas de voz de manera consistente
    - la fuente multimedia puede ser HTTP(S), `file://` o rutas locales

  </Accordion>

  <Accordion title="Límites de tamaño de medios y comportamiento de respaldo">
    - límite de guardado de medios entrantes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - límite de envío de medios salientes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - las anulaciones por cuenta usan `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - las imágenes se optimizan automáticamente (redimensionamiento/barrido de calidad) para ajustarse a los límites, a menos que `forceDocument` / `asDocument` solicite la entrega como documento
    - ante el fallo de envío de medios, la reserva del primer elemento envía una advertencia de texto en lugar de descartar la respuesta silenciosamente

  </Accordion>
</AccordionGroup>

## Cita de respuesta

WhatsApp admite citas de respuesta nativas, donde las respuestas salientes citan visiblemente el mensaje entrante. Controle esto con `channels.whatsapp.replyToMode`.

| Valor       | Comportamiento                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| `"off"`     | Nunca citar; enviar como un mensaje simple                                     |
| `"first"`   | Citar solo el primer fragmento de respuesta saliente                           |
| `"all"`     | Citar cada fragmento de respuesta saliente                                     |
| `"batched"` | Citar respuestas por lotes en cola dejando las respuestas inmediatas sin citar |

El valor predeterminado es `"off"`. Las anulaciones por cuenta usan `channels.whatsapp.accounts.<id>.replyToMode`.

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

`channels.whatsapp.reactionLevel` controla con qué amplitud usa el agente reacciones de emoji en WhatsApp:

| Nivel         | Reacciones de ack | Reacciones iniciadas por el agente | Descripción                                                 |
| ------------- | ----------------- | ---------------------------------- | ----------------------------------------------------------- |
| `"off"`       | No                | No                                 | Sin reacciones en absoluto                                  |
| `"ack"`       | Sí                | No                                 | Solo reacciones de ack (confirmación previa a la respuesta) |
| `"minimal"`   | Sí                | Sí (conservador)                   | Reacciones de ack + agente con orientación conservadora     |
| `"extensive"` | Sí                | Sí (animado)                       | Reacciones de ack + agente con orientación animada          |

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

WhatsApp admite reacciones de ack inmediatas en la recepción entrante a través de `channels.whatsapp.ackReaction`.
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

- enviado inmediatamente después de que se acepte el mensaje entrante (previo a la respuesta)
- si `ackReaction` está presente sin `emoji`, WhatsApp usa el emoji de identidad del agente enrutado, usando "👀" por defecto; omite `ackReaction` o establece `emoji: ""` para no enviar ninguna reacción de ack
- los fallos se registran pero no bloquean la entrega normal de respuestas
- el modo de grupo `mentions` reacciona en turnos activados por mención; la activación de grupo `always` actúa como bypass para esta verificación
- WhatsApp usa `channels.whatsapp.ackReaction` (el `messages.ackReaction` heredado no se usa aquí)

## Reacciones de estado del ciclo de vida

Establezca `messages.statusReactions.enabled: true` para permitir que WhatsApp reemplace la reacción de ack durante un turno en lugar de dejar un emoji de recibo estático. Cuando está habilitado, OpenClaw usa el mismo espacio de reacción de mensaje entrante para estados del ciclo de vida como en cola, pensando, actividad de herramienta, compactación, hecho y error.

```json5
{
  messages: {
    statusReactions: {
      enabled: true,
      emojis: {
        deploy: "🛫",
        build: "🏗️",
        concierge: "💁",
      },
    },
  },
}
```

Notas de comportamiento:

- `channels.whatsapp.ackReaction` todavía controla si las reacciones de estado son elegibles para mensajes directos y grupos.
- La reacción de estado en cola usa el mismo emoji ack efectivo que las reacciones ack simples.
- WhatsApp tiene un espacio de reacción de bot por mensaje, por lo que las actualizaciones del ciclo de vida reemplazan la reacción actual en su lugar.
- `messages.removeAckAfterReply: true` borra la reacción de estado final después de la retención configurada de hecho/error.
- Las categorías de emoji de herramienta incluyen `tool`, `coding`, `web`, `deploy`, `build` y `concierge`.

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los ids de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente, de lo contrario el primer id de cuenta configurado (ordenado)
    - los ids de cuenta se normalizan internamente para la búsqueda

  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad con versiones anteriores">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de respaldo: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` todavía se reconoce/migra para flujos de cuenta predeterminada

  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    Cuando un Gateway es accesible, el cierre de sesión primero detiene el escucha de WhatsApp en vivo para la cuenta seleccionada para que la sesión vinculada no siga recibiendo mensajes hasta el siguiente reinicio. `openclaw channels remove --channel whatsapp` también detiene el escucha en vivo antes de desactivar o eliminar la configuración de la cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- El soporte de herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Cerraduras de acción:
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada (desactívelas mediante `channels.whatsapp.configWrites=false`).

## Solución de problemas

<AccordionGroup>
  <Accordion title="No vinculado (se requiere código QR)">
    Síntoma: el estado del canal informa que no está vinculado.

    Solución:

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Vinculada pero desconectada / bucle de reconexión">
    Síntoma: cuenta vinculada con desconexiones repetidas o intentos de reconexión.

    Las cuentas inactivas pueden permanecer conectadas más allá del tiempo de espera normal del mensaje; el perro guardián
    se reinicia cuando se detiene la actividad de transporte de WhatsApp Web, se cierra el socket o
    la actividad a nivel de aplicación permanece en silencio más allá de la ventana de seguridad más larga.

    Si los registros muestran `status=408 Request Time-out Connection was lost` repetidos, ajuste
    los tiempos del socket Baileys en `web.whatsapp`. Comience acortando
    `keepAliveIntervalMs` por debajo del tiempo de espera de inactividad de su red y aumentando
    `connectTimeoutMs` en enlaces lentos o con pérdida de paquetes:

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    Solución:

    ```bash
    openclaw channels status --probe
    openclaw doctor
    openclaw logs --follow
    openclaw gateway status
    ```

    Si el bucle persiste después de corregir la conectividad del host y los tiempos, haga una copia de seguridad
    del directorio de autenticación de la cuenta y vuelva a vincular esa cuenta:

    ```bash
    cp -a ~/.openclaw/credentials/whatsapp/<accountId> \
      ~/.openclaw/credentials/whatsapp/<accountId>.bak
    openclaw channels logout --channel whatsapp --account <accountId>
    openclaw channels login --channel whatsapp --account <accountId>
    ```

    Si `~/.openclaw/logs/whatsapp-health.log` indica `Gateway inactive` pero
    `openclaw gateway status` y `openclaw channels status --probe` muestran que
    la puerta de enlace y WhatsApp están sanos, ejecute `openclaw doctor`. En Linux, doctor
    advierte sobre entradas de crontab heredadas que aún invocan
    `~/.openclaw/bin/ensure-whatsapp.sh`; elimine esas entradas obsoletas con
    `crontab -e` porque cron puede carecer del entorno de bus de usuario de systemd y
    hacer que ese script antiguo informe incorrectamente el estado de la puerta de enlace.

    Si es necesario, vuelva a vincular con `channels login`.

  </Accordion>

  <Accordion title="El inicio de sesión con QR se agota detrás de un proxy">
    Síntoma: `openclaw channels login --channel whatsapp` falla antes de mostrar un código QR utilizable con `status=408 Request Time-out` o una desconexión del socket TLS.

    El inicio de sesión de WhatsApp Web utiliza el entorno proxy estándar del host de la puerta de enlace (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minúsculas y `NO_PROXY`). Verifique que el proceso de la puerta de enlace herede el entorno proxy y que `NO_PROXY` no coincida con `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="Sin escucha activa al enviar">
    Los envíos salientes fallan rápidamente cuando no existe ningún escucha de puerta de enlace activo para la cuenta de destino.

    Asegúrese de que la puerta de enlace esté ejecutándose y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="La respuesta aparece en la transcripción pero no en WhatsApp">
    Las filas de la transcripción registran lo que generó el agente. La entrega en WhatsApp se verifica por separado: OpenClaw solo trata una respuesta automática como enviada después de que Baileys devuelve un ID de mensaje saliente para al menos un envío de texto o medio visible.

    Las reacciones de reconocimiento (ack) son recibos previos independientes a la respuesta. Una reacción exitosa no prueba que la respuesta de texto o medio posterior haya sido aceptada por WhatsApp.

    Verifique los registros de la puerta de enlace buscando `auto-reply delivery failed` o `auto-reply was not accepted by WhatsApp provider`.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Verifique en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista blanca `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores anulan las anteriores, por lo que debe mantener un solo `groupPolicy` por ámbito

    Si `channels.whatsapp.groups` está presente, WhatsApp aún puede observar mensajes de otros grupos, pero OpenClaw los descarta antes del enrutamiento de la sesión. Agregue el JID del grupo a `channels.whatsapp.groups` o agregue `groups["*"]` para admitir todos los grupos mientras mantiene la autorización del remitente bajo `groupPolicy` y `groupAllowFrom`.

  </Accordion>

  <Accordion title="Advertencia del tiempo de ejecución Bun">
    El tiempo de ejecución de la puerta de enlace de WhatsApp debe usar Node. Bun está marcado como incompatible para la operación estable de la puerta de enlace de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts del sistema

WhatsApp admite prompts del sistema estilo Telegram para grupos y chats directos a través de los mapas `groups` y `direct`.

Jerarquía de resolución para mensajes de grupo:

Primero se determina el mapa `groups` efectivo: si la cuenta define su propio `groups`, reemplaza completamente el mapa raíz `groups` (sin fusión profunda). Luego, la búsqueda de prompts se ejecuta en el mapa único resultante:

1. **System prompt específico del grupo** (`groups["<groupId>"].systemPrompt`): se utiliza cuando la entrada específica del grupo existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ningún system prompt.
2. **System prompt comodín de grupo** (`groups["*"].systemPrompt`): se utiliza cuando la entrada específica del grupo está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

Jerarquía de resolución para mensajes directos:

Primero se determina el mapa `direct` efectivo: si la cuenta define su propio `direct`, reemplaza completamente el mapa raíz `direct` (sin fusión profunda). Luego, la búsqueda de prompts se ejecuta en el mapa único resultante:

1. **System prompt específico directo** (`direct["<peerId>"].systemPrompt`): se utiliza cuando la entrada específica del par existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ningún system prompt.
2. **System prompt comodín directo** (`direct["*"].systemPrompt`): se utiliza cuando la entrada específica del par está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

<Note>
`dms` sigue siendo el depósito de anulación de historial por DM ligero (`dms.<id>.historyLimit`). Las anulaciones de prompts residen bajo `direct`.
</Note>

**Diferencia con el comportamiento de múltiples cuentas de Telegram:** En Telegram, el `groups` raíz se suprime intencionalmente para todas las cuentas en una configuración de múltiples cuentas, incluso para las cuentas que no definen su propio `groups`, para evitar que un bot reciba mensajes de grupos a los que no pertenece. WhatsApp no aplica esta protección: el `groups` raíz y el `direct` raíz siempre se heredan en las cuentas que no definen una invalidación a nivel de cuenta, independientemente de cuántas cuentas estén configuradas. En una configuración de WhatsApp con múltiples cuentas, si desea indicaciones grupales o directas por cuenta, defina el mapa completo en cada cuenta explícitamente en lugar de confiar en los valores predeterminados de nivel raíz.

Comportamiento importante:

- `channels.whatsapp.groups` es tanto un mapa de configuración por grupo como la lista de permitidos de grupos a nivel de chat. Ya sea en el ámbito raíz o de cuenta, `groups["*"]` significa "todos los grupos son admitidos" para ese ámbito.
- Solo agregue un grupo comodín `systemPrompt` cuando ya desee que ese ámbito admita todos los grupos. Si aún desea que solo un conjunto fijo de ID de grupo sean elegibles, no use `groups["*"]` para el valor predeterminado del indicador. En su lugar, repita el indicador en cada entrada de grupo permitido explícitamente.
- La admisión de grupos y la autorización del remitente son comprobaciones separadas. `groups["*"]` amplía el conjunto de grupos que pueden llegar al manejo de grupos, pero por sí solo no autoriza a todos los remitentes en esos grupos. El acceso del remitente todavía se controla por separado mediante `channels.whatsapp.groupPolicy` y `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` no tiene el mismo efecto secundario para los MD. `direct["*"]` solo proporciona una configuración predeterminada de chat directo después de que un MD ya haya sido admitido por `dmPolicy` más `allowFrom` o reglas de almacenamiento de emparejamiento.

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
- operaciones: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- comportamiento de la sesión: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- indicaciones: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Seguridad](/es/gateway/security)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)
