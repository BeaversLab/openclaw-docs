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
  aún no está presente el complemento.
- Canal de desarrollo + git checkout: predeterminado a la ruta local del complemento.
- Estable/Beta: instala el complemento oficial `@openclaw/whatsapp` de ClawHub
  primero, con npm como alternativa.
- El tiempo de ejecución de WhatsApp se distribuye fuera del paquete npm principal de OpenClaw para que
  las dependencias de tiempo de ejecución específicas de WhatsApp se mantengan con el complemento externo.

La instalación manual sigue disponible:

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

Use el paquete npm simple (`@openclaw/whatsapp`) solo cuando necesite la alternativa
del registro. Fije una versión exacta solo cuando necesite una instalación reproducible.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    La política de MD predeterminada es el emparejamiento para remitentes desconocidos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
  <Card title="Configuración de la pasarela" icon="settings" href="/es/gateway/configuration">
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

    Para adjuntar un directorio de autenticación existente/personalizado de WhatsApp Web antes del inicio de sesión:

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Iniciar la pasarela">

```bash
openclaw gateway
```

  </Step>

  <Step title="Aprobar la primera solicitud de vinculación (si se usa el modo de vinculación)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Las solicitudes de vinculación caducan después de 1 hora. Las solicitudes pendientes están limitadas a 3 por canal.

  </Step>
</Steps>

<Note>OpenClaw recomienda ejecutar WhatsApp en un número separado cuando sea posible. (Los metadatos del canal y el flujo de configuración están optimizados para esa configuración, pero las configuraciones con número personal también son compatibles.)</Note>

## Patrones de despliegue

<AccordionGroup>
  <Accordion title="Número dedicado (recomendado)">
    Este es el modo operativo más limpio:

    - identidad de WhatsApp separada para OpenClaw
    - listas de permitidos de DM y límites de enrutamiento más claros
    - menor probabilidad de confusión con el autchat

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
    El onboarding admite el modo de número personal y escribe una línea base amigable con el autchat:

    - `dmPolicy: "allowlist"`
    - `allowFrom` incluye tu número personal
    - `selfChatMode: true`

    En tiempo de ejecución, las protecciones de autchat se basan en el número propio vinculado y en `allowFrom`.

  </Accordion>

  <Accordion title="Alcance del canal solo para WhatsApp Web">
    El canal de la plataforma de mensajería se basa en WhatsApp Web (`Baileys`) en la arquitectura actual de canales de OpenClaw.

    No hay un canal de mensajería Twilio WhatsApp separado en el registro de canales de chat incorporado.

  </Accordion>
</AccordionGroup>

## Modelo de tiempo de ejecución

- El Gateway posee el socket de WhatsApp y el bucle de reconexión.
- El perro guardián de reconexión utiliza la actividad de transporte de WhatsApp Web, no solo el volumen de mensajes de aplicación entrantes, por lo que una sesión de dispositivo vinculado silenciosa no se reinicia únicamente porque nadie haya enviado un mensaje recientemente. Un límite más largo de silencio de la aplicación aún fuerza una reconexión si siguen llegando tramas de transporte pero no se manejan mensajes de aplicación durante la ventana del perro guardián; después de una reconexión transitoria para una sesión activa recientemente, esa verificación de silencio de la aplicación utiliza el tiempo de espera normal del mensaje para la primera ventana de recuperación.
- Los tiempos del socket de Baileys son explícitos bajo `web.whatsapp.*`: `keepAliveIntervalMs` controla los pings de la aplicación de WhatsApp Web, `connectTimeoutMs` controla el tiempo de espera del handshake de apertura y `defaultQueryTimeoutMs` controla los tiempos de espera de las consultas de Baileys.
- Los envíos salientes requieren un escucha de WhatsApp activo para la cuenta de destino.
- Los envíos a grupos adjuntan metadatos de mención nativos para los tokens `@+<digits>` y `@<digits>` en el texto y los pies de foto de medios cuando el token coincide con los metadatos actuales del participante de WhatsApp, incluyendo grupos respaldados por LID.
- Los chats de estado y de difusión se ignoran (`@status`, `@broadcast`).
- El perro guardián de reconexión sigue la actividad del transporte de WhatsApp Web, no solo el volumen de mensajes entrantes de la aplicación: las sesiones de dispositivo vinculado silenciosas se mantienen activas mientras continúan los marcos de transporte, pero un estancamiento del transporte fuerza la reconexión mucho antes de la ruta posterior de desconexión remota.
- Los chats directos usan reglas de sesión de DM (`session.dmScope`; el valor predeterminado `main` colapsa los DMs en la sesión principal del agente).
- Las sesiones de grupo están aisladas (`agent:<agentId>:whatsapp:group:<jid>`).
- Los Canales/Boletines de WhatsApp pueden ser objetivos salientes explícitos con su JID nativo `@newsletter`. Los envíos de boletines salientes usan metadatos de sesión de canal (`agent:<agentId>:whatsapp:channel:<jid>`) en lugar de la semántica de sesión de DM.
- El transporte de WhatsApp Web respeta las variables de entorno de proxy estándar en el host de la puerta de enlace (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minúsculas). Se prefiere la configuración de proxy a nivel de host sobre la configuración de proxy específica del canal de WhatsApp.
- Cuando `messages.removeAckAfterReply` está habilitado, OpenClaw borra la reacción de reconocimiento de WhatsApp después de que se entrega una respuesta visible.

## Ganchos del plugin y privacidad

Los mensajes entrantes de WhatsApp pueden contener contenido de mensajes personal, números de teléfono,
identificadores de grupo, nombres de remitentes y campos de correlación de sesión. Por esa razón,
WhatsApp no difunde cargas útiles de gancho `message_received` entrantes a los plugins
a menos que explícitamente opte por participar:

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

Habilite esto solo para complementos en los que confíe para recibir contenido e identificadores de mensajes entrantes de WhatsApp.

## Control de acceso y activación

<Tabs>
  <Tab title="Política de MD">
    `channels.whatsapp.dmPolicy` controla el acceso al chat directo:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    `allowFrom` acepta números con estilo E.164 (normalizados internamente).

    `allowFrom` es una lista de control de acceso de remitentes de MD. No limita los envíos salientes explícitos a JIDs de grupos de WhatsApp o JIDs de canal `@newsletter`.

    Invalidación multicuenta: `channels.whatsapp.accounts.<id>.dmPolicy` (y `allowFrom`) tienen prioridad sobre los valores predeterminados de nivel de canal para esa cuenta.

    Detalles del comportamiento en tiempo de ejecución:

    - los emparejamientos se guardan en el almacén de permitidos del canal y se combinan con `allowFrom` configurado
    - la automatización programada y el destinatario de reserva de los latidos utilizan objetivos de entrega explícitos o `allowFrom` configurado; las aprobaciones de emparejamiento de MD no son destinatarios implícitos de cron o de latidos
    - si no se configura una lista de permitidos, el propio número vinculado se permite de forma predeterminada
    - OpenClaw nunca empareja automáticamente los MD `fromMe` salientes (mensajes que te envías a ti mismo desde el dispositivo vinculado)

  </Tab>

  <Tab title="Política de grupo + listas de permitidos">
    El acceso al grupo tiene dos capas:

    1. **Lista de permitidos de membresía del grupo** (`channels.whatsapp.groups`)
       - si se omite `groups`, todos los grupos son elegibles
       - si `groups` está presente, actúa como una lista de permitidos del grupo (`"*"` permitidos)

    2. **Política de remitente del grupo** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open`: lista de permitidos de remitentes omitida
       - `allowlist`: el remitente debe coincidir con `groupAllowFrom` (o `*`)
       - `disabled`: bloquear todo el entrante del grupo

    Respaldo de la lista de permitidos de remitentes:

    - si `groupAllowFrom` no está establecido, el tiempo de ejecución recurre a `allowFrom` cuando está disponible
    - las listas de permitidos de remitentes se evalúan antes de la activación de mención/respuesta

    Nota: si no existe ningún bloque `channels.whatsapp` en absoluto, el respaldo de la política de grupo en tiempo de ejecución es `allowlist` (con un registro de advertencia), incluso si `channels.defaults.groupPolicy` está establecido.

  </Tab>

  <Tab title="Menciones + /activación">
    Las respuestas del grupo requieren mención de forma predeterminada.

    La detección de mención incluye:

    - menciones explícitas de WhatsApp de la identidad del bot
    - patrones de regex de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - transcripciones de notas de voz entrantes para mensajes de grupo autorizados
    - detección implícita de respuesta al bot (el remitente de la respuesta coincide con la identidad del bot)

    Nota de seguridad:

    - citar/responder solo satisface el filtrado de mención; **no** otorga autorización al remitente
    - con `groupPolicy: "allowlist"`, los remitentes no incluidos en la lista de permitidos todavía se bloquean incluso si responden al mensaje de un usuario incluido en la lista de permitidos

    Comando de activación a nivel de sesión:

    - `/activation mention`
    - `/activation always`

    `activation` actualiza el estado de la sesión (no la configuración global). Está restringido al propietario.

  </Tab>
</Tabs>

## Comportamiento del número personal y del chat propio

Cuando el número propio vinculado también está presente en `allowFrom`, se activan las salvaguardas de chat propio de WhatsApp:

- omitir confirmaciones de lectura para los turnos de chat propio
- ignorar el comportamiento de activación automática de mention-JID que de otro modo te notificaría a ti mismo
- si `messages.responsePrefix` no está establecido, las respuestas de autollamada (self-chat) predeterminan a `[{identity.name}]` o `[openclaw]`

## Normalización de mensajes y contexto

<AccordionGroup>
  <Accordion title="Sobre de entrada + contexto de respuesta">
    Los mensajes entrantes de WhatsApp se envuelven en el sobre de entrada compartido.

    Si existe una respuesta citada, el contexto se anexa de esta forma:

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Los campos de metadatos de respuesta también se completan cuando están disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID/E.164 del remitente).
    Cuando el objetivo de la respuesta citada es multimedia descargable, OpenClaw lo guarda a través del
    almacén de medios de entrada normal y lo expone como `MediaPath`/`MediaType` para que
    el agente pueda inspeccionar la imagen referenciada en lugar de ver solo
    `<media:image>`.

  </Accordion>

  <Accordion title="Marcadores de posición de medios y extracción de ubicación/contacto">
    Los mensajes entrantes solo multimedia se normalizan con marcadores de posición tales como:

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Las notas de voz de grupos autorizadas se transcriben antes de la filtración de menciones cuando el
    cuerpo es solo `<media:audio>`, por lo que decir la mención del bot en la nota de voz puede
    desencadenar la respuesta. Si la transcripción aún no menciona al bot,
    la transcripción se mantiene en el historial pendiente del grupo en lugar del marcador de posición sin formato.

    Los cuerpos de ubicación usan texto de coordenadas breve. Las etiquetas/comentarios de ubicación y los detalles de contacto/vCard se representan como metadatos no confinados, no como texto de solicitud en línea.

  </Accordion>

  <Accordion title="Inyección de historial de grupos pendiente">
    Para los grupos, los mensajes no procesados pueden almacenarse en el búfer e inyectarse como contexto cuando el bot finalmente se active.

    - límite predeterminado: `50`
    - configuración: `channels.whatsapp.historyLimit`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` deshabilita

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

    Los turnos de autochat omiten las confirmaciones de lectura incluso cuando están habilitadas globalmente.

  </Accordion>
</AccordionGroup>

## Entrega, fragmentación y medios

<AccordionGroup>
  <Accordion title="Fragmentación de texto">
    - límite de fragmentación predeterminado: `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - el modo `newline` prefiere los límites de los párrafos (líneas en blanco), y luego recurre a una fragmentación segura según la longitud

  </Accordion>

  <Accordion title="Comportamiento de los medios salientes">
    - admite cargas útiles de imagen, video, audio (nota de voz PTT) y documentos
    - los medios de audio se envían a través de la carga útil de Baileys `audio` con `ptt: true`, por lo que los clientes de WhatsApp lo representan como una nota de voz de pulsar para hablar
    - las cargas útiles de respuesta preservan `audioAsVoice`; la salida de nota de voz TTS para WhatsApp se mantiene en esta ruta PTT incluso cuando el proveedor devuelve MP3 o WebM
    - el audio nativo Ogg/Opus se envía como `audio/ogg; codecs=opus` para la compatibilidad con notas de voz
    - el audio no Ogg, incluida la salida MP3/WebM de TTS de Microsoft Edge, se transcodifica con `ffmpeg` a Ogg/Opus mono de 48 kHz antes de la entrega PTT
    - `/tts latest` envía la última respuesta del asistente como una nota de voz y suprime los envíos repetidos para la misma respuesta; `/tts chat on|off|default` controla el TTS automático para el chat actual de WhatsApp
    - la reproducción de GIF animados es compatible a través de `gifPlayback: true` en el envío de videos
    - los subtítulos se aplican al primer elemento multimedia al enviar cargas útiles de respuesta multimedia, excepto que las notas de voz PTT envían el audio primero y el texto visible por separado porque los clientes de WhatsApp no representan los subtítulos de las notas de voz de manera consistente
    - la fuente multimedia puede ser HTTP(S), `file://` o rutas locales

  </Accordion>

  <Accordion title="Límites de tamaño de medios y comportamiento de reserva">
    - límite de guardado de medios entrantes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - límite de envío de medios salientes: `channels.whatsapp.mediaMaxMb` (predeterminado `50`)
    - las anulaciones por cuenta usan `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - las imágenes se optimizan automáticamente (redimensionamiento/barrido de calidad) para ajustarse a los límites
    - ante un fallo en el envío de medios, la reserva del primer elemento envía una advertencia de texto en lugar de descartar la respuesta silenciosamente

  </Accordion>
</AccordionGroup>

## Citar respuesta

WhatsApp admite las citas de respuesta nativas, donde las respuestas salientes citan visiblemente el mensaje entrante. Controle esto con `channels.whatsapp.replyToMode`.

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

`channels.whatsapp.reactionLevel` controla la amplitud con la que el agente usa reacciones de emoji en WhatsApp:

| Nivel         | Reacciones de acuse de recibo | Reacciones iniciadas por el agente | Descripción                                                                |
| ------------- | ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `"off"`       | No                            | No                                 | Sin reacciones en absoluto                                                 |
| `"ack"`       | Sí                            | No                                 | Solo reacciones de acuse de recibo (acuse de recibo previo a la respuesta) |
| `"minimal"`   | Sí                            | Sí (conservador)                   | Reacciones de acuse de recibo + del agente con orientación conservadora    |
| `"extensive"` | Sí                            | Sí (animado)                       | Reacciones de acuse de recibo + del agente con orientación animada         |

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

WhatsApp admite reacciones de acuse de recibo inmediatas en la recepción entrante a través de `channels.whatsapp.ackReaction`.
Las reacciones de acuse de recibo están limitadas por `reactionLevel` — se suprimen cuando `reactionLevel` es `"off"`.

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

- enviadas inmediatamente después de que se acepta el mensaje entrante (previo a la respuesta)
- los fallos se registran pero no bloquean la entrega de respuestas normales
- el modo de grupo `mentions` reacciona en turnos activados por mención; la activación de grupo `always` actúa como derivación para esta comprobación
- WhatsApp usa `channels.whatsapp.ackReaction` (el `messages.ackReaction` heredado no se usa aquí)

## Multicuenta y credenciales

<AccordionGroup>
  <Accordion title="Selección de cuenta y valores predeterminados">
    - los ids de cuenta provienen de `channels.whatsapp.accounts`
    - selección de cuenta predeterminada: `default` si está presente, de lo contrario el primer id de cuenta configurado (ordenado)
    - los ids de cuenta se normalizan internamente para su búsqueda

  </Accordion>

  <Accordion title="Rutas de credenciales y compatibilidad heredada">
    - ruta de autenticación actual: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - archivo de respaldo: `creds.json.bak`
    - la autenticación predeterminada heredada en `~/.openclaw/credentials/` todavía se reconecta/migra para los flujos de cuenta predeterminada

  </Accordion>

  <Accordion title="Comportamiento de cierre de sesión">
    `openclaw channels logout --channel whatsapp [--account <id>]` borra el estado de autenticación de WhatsApp para esa cuenta.

    Cuando un Gateway es accesible, el cierre de sesión primero detiene el escucha en vivo de WhatsApp para la cuenta seleccionada para que la sesión vinculada no siga recibiendo mensajes hasta el próximo reinicio. `openclaw channels remove --channel whatsapp` también detiene el escucha en vivo antes de deshabilitar o eliminar la configuración de la cuenta.

    En los directorios de autenticación heredados, `oauth.json` se conserva mientras se eliminan los archivos de autenticación de Baileys.

  </Accordion>
</AccordionGroup>

## Herramientas, acciones y escrituras de configuración

- El soporte de herramientas del agente incluye la acción de reacción de WhatsApp (`react`).
- Compuertas de acción:
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

  <Accordion title="Vinculada pero desconectada / bucle de reconexión">
    Síntoma: cuenta vinculada con desconexiones repetidas o intentos de reconexión.

    Las cuentas inactivas pueden mantenerse conectadas más allá del tiempo de espera normal del mensaje; el perro guardián
    se reinicia cuando se detiene la actividad de transporte de WhatsApp Web, se cierra el socket o
    la actividad a nivel de aplicación permanece en silencio más allá de la ventana de seguridad más larga.

    Si los registros muestran `status=408 Request Time-out Connection was lost` repetidos, ajuste
    los tiempos del socket de Baileys en `web.whatsapp`. Comience acortando
    `keepAliveIntervalMs` por debajo del tiempo de espera de inactividad de su red y aumentando
    `connectTimeoutMs` en enlaces lentos o con pérdidas:

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
    openclaw doctor
    openclaw logs --follow
    ```

    Si `~/.openclaw/logs/whatsapp-health.log` indica `Gateway inactive` pero
    `openclaw gateway status` y `openclaw channels status --probe` muestran que
    la pasarela y WhatsApp están sanos, ejecute `openclaw doctor`. En Linux, el doctor
    advierte sobre entradas de crontab heredadas que aún invocan
    `~/.openclaw/bin/ensure-whatsapp.sh`; elimine esas entradas obsoletas con
    `crontab -e` porque cron puede carecer del entorno de bus de usuario de systemd y
    hacer que ese script antiguo informe incorrectamente el estado de la pasarela.

    Si es necesario, vuelva a vincular con `channels login`.

  </Accordion>

  <Accordion title="El inicio de sesión con QR se agota detrás de un proxy">
    Síntoma: `openclaw channels login --channel whatsapp` falla antes de mostrar un código QR utilizable con `status=408 Request Time-out` o una desconexión del socket TLS.

    El inicio de sesión de WhatsApp Web utiliza el entorno proxy estándar del host de la pasarela (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minúsculas y `NO_PROXY`). Verifique que el proceso de la pasarela herede el entorno proxy y que `NO_PROXY` no coincida con `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="Sin escucha activa al enviar">
    Los envíos salientes fallan rápidamente cuando no existe ningún escucha activo de la pasarela para la cuenta de destino.

    Asegúrese de que la pasarela se esté ejecutando y de que la cuenta esté vinculada.

  </Accordion>

  <Accordion title="La respuesta aparece en la transcripción pero no en WhatsApp">
    Las filas de la transcripción registran lo que generó el agente. La entrega en WhatsApp se verifica por separado: OpenClaw solo trata una respuesta automática como enviada después de que Baileys devuelve un ID de mensaje saliente para al menos un envío de texto o medio visible.

    Las reacciones de confirmación son recibos independientes previos a la respuesta. Una reacción exitosa no prueba que la respuesta de texto o medio posterior fue aceptada por WhatsApp.

    Verifique los registros de la puerta de enlace para `auto-reply delivery failed` o `auto-reply was not accepted by WhatsApp provider`.

  </Accordion>

  <Accordion title="Mensajes de grupo ignorados inesperadamente">
    Verifique en este orden:

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entradas de lista de permitidos `groups`
    - filtrado de menciones (`requireMention` + patrones de mención)
    - claves duplicadas en `openclaw.json` (JSON5): las entradas posteriores anulan las anteriores, así que mantenga un solo `groupPolicy` por ámbito

  </Accordion>

  <Accordion title="Advertencia del runtime Bun">
    El runtime de la puerta de enlace de WhatsApp debería usar Node. Bun está marcado como incompatible para una operación estable de la puerta de enlace de WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts del sistema

WhatsApp admite prompts del sistema estilo Telegram para grupos y chats directos a través de los mapas `groups` y `direct`.

Jerarquía de resolución para mensajes de grupo:

El mapa `groups` efectivo se determina primero: si la cuenta define su propio `groups`, reemplaza completamente al mapa raíz `groups` (sin fusión profunda). La búsqueda del prompt se ejecuta luego en el mapa único resultante:

1. **Prompt del sistema específico del grupo** (`groups["<groupId>"].systemPrompt`): se usa cuando existe la entrada específica del grupo en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ningún prompt del sistema.
2. **System prompt comodín de grupo** (`groups["*"].systemPrompt`): se usa cuando la entrada específica del grupo está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

Jerarquía de resolución para mensajes directos:

Primero se determina el mapa `direct` efectivo: si la cuenta define su propio `direct`, este reemplaza completamente al mapa `direct` raíz (sin fusión profunda). Luego, la búsqueda de prompts se ejecuta en el mapa único resultante:

1. **System prompt específico para directos** (`direct["<peerId>"].systemPrompt`): se usa cuando la entrada específica del par existe en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), se suprime el comodín y no se aplica ningún system prompt.
2. **System prompt comodín para directos** (`direct["*"].systemPrompt`): se usa cuando la entrada específica del par está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

<Note>
`dms` sigue siendo el contenedor de sustitución ligero del historial por mensaje directo (`dms.<id>.historyLimit`). Las sustituciones de prompt se encuentran bajo `direct`.
</Note>

**Diferencia con el comportamiento multicuenta de Telegram:** En Telegram, el `groups` raíz se suprime intencionalmente para todas las cuentas en una configuración multicuenta, incluso para las cuentas que no definen su propio `groups`, para evitar que un bot reciba mensajes de grupo de grupos a los que no pertenece. WhatsApp no aplica esta protección: el `groups` raíz y el `direct` raíz siempre se heredan en las cuentas que no definen una sustitución a nivel de cuenta, independientemente de cuántas cuentas estén configuradas. En una configuración multicuenta de WhatsApp, si desea prompts de grupo o directos por cuenta, defina el mapa completo en cada cuenta explícitamente en lugar de confiar en los valores predeterminados de nivel raíz.

Comportamiento importante:

- `channels.whatsapp.groups` es tanto un mapa de configuración por grupo como la lista de permitidos de grupos a nivel de chat. Tanto en el ámbito raíz como en el de la cuenta, `groups["*"]` significa "se admiten todos los grupos" para ese ámbito.
- Solo agregue un grupo comodín `systemPrompt` cuando ya desee que ese ámbito admita todos los grupos. Si aún desea que solo un conjunto fijo de ID de grupos sean elegibles, no use `groups["*"]` para el valor predeterminado del mensaje. En su lugar, repita el mensaje en cada entrada de grupo explícitamente permitida.
- La admisión de grupos y la autorización del remitente son verificaciones separadas. `groups["*"]` amplía el conjunto de grupos que pueden alcanzar el manejo de grupos, pero por sí solo no autoriza a todos los remitentes en esos grupos. El acceso del remitente todavía se controla por separado mediante `channels.whatsapp.groupPolicy` y `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` no tiene el mismo efecto secundario para los MD. `direct["*"]` solo proporciona una configuración predeterminada de chat directo después de que un MD ya ha sido admitido por `dmPolicy` más `allowFrom` o reglas de emparejamiento.

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

Campos de WhatsApp de alta prioridad:

- acceso: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multicuenta: `accounts.<id>.enabled`, `accounts.<id>.authDir`, anulaciones a nivel de cuenta
- operaciones: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- comportamiento de la sesión: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- mensajes: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Seguridad](/es/gateway/security)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Enrutamiento multiagente](/es/concepts/multi-agent)
- [Solución de problemas](/es/channels/troubleshooting)
