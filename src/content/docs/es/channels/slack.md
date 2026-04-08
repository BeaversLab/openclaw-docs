---
summary: "Configuración y comportamiento de ejecución de Slack (Modo Socket + API de Eventos HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

Estado: listo para producción para MDs + canales a través de integraciones de aplicaciones de Slack. El modo predeterminado es el Modo Socket; el modo de API de eventos HTTP también es compatible.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    Los MD de Slack usan el modo de emparejamiento por defecto.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/en/tools/slash-commands">
    Comportamiento de comando nativo y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Modo Socket (predeterminado)">
    <Steps>
      <Step title="Crear aplicación Slack y tokens">
        En la configuración de la aplicación Slack:

        - activar **Socket Mode** (Modo Socket)
        - crear **App Token** (Token de Aplicación) (`xapp-...`) con `connections:write`
        - instalar la aplicación y copiar el **Bot Token** (Token de Bot) (`xoxb-...`)
      </Step>

      <Step title="Configurar OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        Fallback de entorno (solo cuenta predeterminada):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Suscribir a eventos de la aplicación">
        Suscribir a eventos de bot para:

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        También activar la pestaña **Messages Tab** (Pestaña de Mensajes) de App Home para MDs.
      </Step>

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="Modo de API de eventos HTTP">
    <Steps>
      <Step title="Configurar la aplicación de Slack para HTTP">

        - establezca el modo en HTTP (`channels.slack.mode="http"`)
        - copie el **Signing Secret** de Slack
        - configure las URL de solicitud de Suscripciones de eventos + Interactividad + Comandos de barra en la misma ruta de webhook (por defecto `/slack/events`)

      </Step>

      <Step title="Configurar el modo HTTP de OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

      </Step>

      <Step title="Usar rutas de webhook únicas para HTTP multicuenta">
        El modo HTTP por cuenta es compatible.

        Asigne a cada cuenta un `webhookPath` distinto para que los registros no colisionen.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Lista de verificación de manifiesto y ámbito

<AccordionGroup>
  <Accordion title="Slack app manifest example" defaultOpen>

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="Ámbitos de token de usuario opcionales (operaciones de lectura)">
    Si configura `channels.slack.userToken`, los ámbitos de lectura típicos son:

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si depende de lecturas de búsqueda de Slack)

  </Accordion>
</AccordionGroup>

## Modelo de token

- `botToken` + `appToken` son obligatorios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- `botToken`, `appToken`, `signingSecret` y `userToken` aceptan cadenas
  de texto plano u objetos SecretRef.
- Los tokens de configuración anulan la alternativa de entorno.
- La alternativa de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo configuración (sin respaldo de entorno) y de forma predeterminada tiene un comportamiento de solo lectura (`userTokenReadOnly: true`).
- Opcional: agregue `chat:write.customize` si desea que los mensajes salientes utilicen la identidad del agente activo (`username` personalizado e icono). `icon_emoji` usa la sintaxis `:emoji_name:`.

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack rastrea los campos `*Source` y `*Status` por credencial
  (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef
  u otro origen secreto que no esté en línea, pero que la ruta de comando/tiempo de ejecución actual
  no pudo resolver el valor real.
- En modo HTTP, se incluye `signingSecretStatus`; en modo Socket, el
  par requerido es `botTokenStatus` + `appTokenStatus`.

<Tip>Para acciones/lecturas de directorio, se puede preferir el token de usuario cuando está configurado. Para escrituras, el token de bot sigue siendo el preferido; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y puertas

Las acciones de Slack se controlan mediante `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo      | Predeterminado |
| ---------- | -------------- |
| mensajes   | habilitado     |
| reacciones | habilitado     |
| fijaciones | habilitado     |
| memberInfo | habilitado     |
| emojiList  | habilitado     |

Las acciones actuales de mensajes de Slack incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="DM policy">
    `channels.slack.dmPolicy` controla el acceso a los MD (legado: `channels.slack.dm.policy`):

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`; legado: `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicadores de MD:

    - `dm.enabled` (verdadero predeterminado)
    - `channels.slack.allowFrom` (preferido)
    - `dm.allowFrom` (legado)
    - `dm.groupEnabled` (grupo de MDs predeterminado falso)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está establecido.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    El emparejamiento en MDs utiliza `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Channel policy">
    `channels.slack.groupPolicy` controla el manejo de canales:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos de canales vive bajo `channels.slack.channels` y debe usar IDs de canal estables.

    Nota de tiempo de ejecución: si `channels.slack` falta por completo (configuración solo de entorno), el tiempo de ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está establecido).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos de canales y de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombre de canal no resueltas se mantienen como están configuradas pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento de canales son por ID de forma predeterminada; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están restringidos por menciones de forma predeterminada.

    Fuentes de menciones:

    - mención explícita de la aplicación (`<@botId>`)
    - patrones de regex de menciones (`agents.list[].groupChat.mentionPatterns`, alternativa `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en hilos

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución al inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` formato de clave: `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía asignan solo a `id:`)

  </Tab>
</Tabs>

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Con el valor predeterminado `session.dmScope=main`, los MD de Slack colapsan en la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas en hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando corresponda.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se obtienen cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).

Controles de respuesta en hilos:

- `channels.slack.replyToMode`: `off|first|all|batched` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- alternativa heredada para chats directos: `channels.slack.dm.replyToMode`

Se admiten etiquetas de respuesta manuales:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Nota: `replyToMode="off"` deshabilita **todos** los hilos de respuesta en Slack, incluyendo las etiquetas `[[reply_to_*]]` explícitas. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. La diferencia refleja los modelos de hilos de la plataforma: los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en el flujo principal del chat.

## Reacciones de acuse de recibo

`ackReaction` envía un emoji de acuse de recibo mientras OpenClaw está procesando un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de identidad del agente de respaldo (`agents.list[].identity.emoji`, si no, "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para deshabilitar la reacción para la cuenta de Slack o globalmente.

## Transmisión de texto

`channels.slack.streaming` controla el comportamiento de vista previa en vivo:

- `off`: deshabilitar la transmisión de vista previa en vivo.
- `partial` (predeterminado): reemplazar el texto de vista previa con la última salida parcial.
- `block`: añadir actualizaciones de vista previa fragmentadas.
- `progress`: mostrar el texto de estado de progreso mientras se genera, luego enviar el texto final.

`channels.slack.nativeStreaming` controla la transmisión de texto nativa de Slack cuando `streaming` es `partial` (predeterminado: `true`).

- Debe estar disponible un hilo de respuesta para que aparezca la transmisión de texto nativa. La selección del hilo todavía sigue `replyToMode`. Sin uno, se usa la vista previa de borrador normal.
- Las cargas útiles multimedia y de no texto vuelven a la entrega normal.
- Si la transmisión falla a mitad de respuesta, OpenClaw vuelve a la entrega normal para las cargas útiles restantes.

Usar la vista previa de borrador en lugar de la transmisión de texto nativa de Slack:

```json5
{
  channels: {
    slack: {
      streaming: "partial",
      nativeStreaming: false,
    },
  },
}
```

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) se migra automáticamente a `channels.slack.streaming`.
- El valor booleano `channels.slack.streaming` se migra automáticamente a `channels.slack.nativeStreaming`.

## Respaldo de reacción de escritura

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta, y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas de hilos, que utilizan un indicador de estado predeterminado de "escribiendo...".

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera códigos cortos (por ejemplo `"hourglass_flowing_sand"`).
- La reacción se realiza de forma voluntaria y se intenta limpiar automáticamente después de que se complete la respuesta o la ruta de fallo.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URLs privadas alojadas en Slack (flujo de solicitud autenticada por token) y se escriben en el almacén de medios cuando la recuperación tiene éxito y los límites de tamaño lo permiten.

    El límite de tamaño entrante en tiempo de ejecución es de `20MB` de forma predeterminada, a menos que se anule con `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texto y archivos salientes">
  - los fragmentos de texto utilizan `channels.slack.textChunkLimit` (predeterminado 4000) - `channels.slack.chunkMode="newline"` habilita la división prioritaria de párrafos - los envíos de archivos utilizan las APIs de carga de Slack y pueden incluir respuestas de hilos (`thread_ts`) - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los
  envíos del canal utilizan los valores predeterminados de tipo MIME de la canalización de medios
</Accordion>

  <Accordion title="Destinos de entrega">
    Destinos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack se abren a través de las APIs de conversación de Slack al enviar a objetivos de usuario.

  </Accordion>
</AccordionGroup>

## Comandos y comportamiento de barra

- El modo automático de comandos nativos está **desactivado** para Slack (`commands.native: "auto"` no habilita los comandos nativos de Slack).
- Habilite los controladores de comandos nativos de Slack con `channels.slack.commands.native: true` (o el global `commands.native: true`).
- Cuando los comandos nativos están habilitados, registre los comandos de barra coincidentes en Slack (nombres `/<command>`), con una excepción:
  - registra `/agentstatus` para el comando de estado (Slack reserva `/status`)
- Si los comandos nativos no están habilitados, puedes ejecutar un solo comando de barra configurado a través de `channels.slack.slashCommand`.
- Los menús de argumentos nativos ahora adaptan su estrategia de renderizado:
  - hasta 5 opciones: bloques de botones
  - 6-100 opciones: menú de selección estático
  - más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando hay disponibles manejadores de opciones de interactividad
  - si los valores de opción codificados exceden los límites de Slack, el flujo retrocede a botones
- Para cargas útiles de opción largas, los menús de argumentos de comandos de barra usan un diálogo de confirmación antes de enviar un valor seleccionado.

Configuración predeterminada de comandos de barra:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Las sesiones de barra usan claves aisladas:

- `agent:<agentId>:slack:slash:<userId>`

y aún enrutan la ejecución del comando contra la sesión de conversación objetivo (`CommandTargetSessionKey`).

## Respuestas interactivas

Slack puede renderizar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

Habilítalo globalmente:

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

O habilítalo solo para una cuenta de Slack:

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

Cuando se habilita, los agentes pueden emitir directivas de respuesta exclusivas de Slack:

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Estas directivas se compilan en Slack Block Kit y enrutan clics o selecciones de vuelta a través de la ruta de eventos de interacción de Slack existente.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit a sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores en bruto creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw retrocede a la respuesta de texto original en lugar de enviar una carga útil de bloques no válida.

## Aprobaciones de ejecución en Slack

Slack puede actuar como un cliente de aprobación nativo con botones e interactivas, en lugar de retroceder a la interfaz de usuario web o terminal.

- Las aprobaciones de ejecución usan `channels.slack.execApprovals.*` para el enrutamiento nativo de DM/canal.
- Las aprobaciones de complementos aún pueden resolverse a través de la misma superficie de botones nativa de Slack cuando la solicitud ya llega a Slack y el tipo de ID de aprobación es `plugin:`.
- La autorización del aprobador aún se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las solicitudes de aprobación se representan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la UX de aprobación principal; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones
por chat no están disponibles o la aprobación manual es la única ruta.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; retrocede a `commands.ownerAllowFrom` cuando sea posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y al menos un
aprobador resuelve. Establezca `enabled: false` para deshabilitar explícitamente Slack como cliente de aprobación nativo.
Establezca `enabled: true` para forzar las aprobaciones nativas cuando los aprobadores resuelvan.

Comportamiento predeterminado sin configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Solo se necesita una configuración nativa explícita de Slack cuando deseas anular aprobadores, agregar filtros u
optar por la entrega al chat de origen:

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

El reenvío compartido de `approvals.exec` es separado. Úselo solo cuando las solicitudes de aprobación de ejecución también deban
enrutarse a otros chats o objetivos explícitos fuera de banda. El reenvío compartido de `approvals.plugin` también es
separado; los botones nativos de Slack aún pueden resolver las aprobaciones de complementos cuando esas solicitudes ya llegan
a Slack.

El `/approve` en el mismo chat también funciona en canales de Slack y MD que ya admiten comandos. Consulte [Aprobaciones de ejecución](/en/tools/exec-approvals) para ver el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes y las transmisiones de hilos se asignan a eventos del sistema.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/salir de miembros, creación/cambio de nombre de canal y agregar/eliminar fijados se asignan a eventos del sistema.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador del hilo y la siembra inicial del contexto del historial del hilo se filtran mediante las listas de permitidos del remitente configuradas, cuando corresponda.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema estructurados `Slack interaction: ...` con campos de carga útil enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores del selector y metadatos `workflow_*`
  - eventos modal `view_submission` y `view_closed` con metadatos del canal enrutado y entradas de formulario

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Slack](/en/gateway/configuration-reference#slack)

  Campos de Slack de alta señal:
  - modo/autenticación: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - acceso a MD: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompevidrios; manténgalo apagado a menos que sea necesario)
  - acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/funcionalidades: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Compruebe, en orden:

    - `groupPolicy`
    - lista de canales permitidos (`channels.slack.channels`)
    - `requireMention`
    - lista de permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes DM ignorados">
    Compruebe:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el `channels.slack.dm.policy` heredado)
    - aprobaciones de emparejamiento / entradas de lista de permitidos

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Modo socket sin conexión">
    Valide los tokens de bot y de aplicación, y la activación del Modo Socket en la configuración de la aplicación de Slack.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada, pero el tiempo de ejecución actual no pudo resolver el valor respaldado por SecretRef.

  </Accordion>

  <Accordion title="Modo HTTP no recibe eventos">
    Valide:

    - secreto de firma
    - ruta del webhook
    - URL de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

    Si `signingSecretStatus: "configured_unavailable"` aparece en las
    instantáneas de la cuenta, la cuenta HTTP está configurada pero el tiempo de ejecución actual no pudo resolver el secreto de firma respaldado por SecretRef.

  </Accordion>

  <Accordion title="Native/slash commands not firing">
    Verifique si tenía la intención de:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra único (`channels.slack.slashCommand.enabled: true`)

    También revise `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Grupos](/en/channels/groups)
- [Seguridad](/en/gateway/security)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Solución de problemas](/en/channels/troubleshooting)
- [Configuración](/en/gateway/configuration)
- [Comandos de barra](/en/tools/slash-commands)
