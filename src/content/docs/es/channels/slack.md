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
    Los MDs de Slack se establecen en modo de emparejamiento por defecto.
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
      <Step title="Crear aplicación de Slack y tokens">
        En la configuración de la aplicación de Slack:

        - habilitar **Socket Mode**
        - crear **App Token** (`xapp-...`) con `connections:write`
        - instalar la aplicación y copiar **Bot Token** (`xoxb-...`)
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

        Env fallback (cuenta predeterminada solamente):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Suscribir eventos de aplicación">
        Suscribir eventos de bot para:

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        También habilitar App Home **Messages Tab** para MDs.
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

        - establecer el modo en HTTP (`channels.slack.mode="http"`)
        - copiar el **Signing Secret** de Slack
        - establecer las URL de solicitud de Suscripciones de eventos + Interactividad + Comandos de barra en la misma ruta de webhook (por defecto `/slack/events`)

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

## Modelo de token

- `botToken` + `appToken` son necesarios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- Los tokens de configuración anulan la alternativa de entorno.
- El respaldo de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin respaldo de entorno) y por defecto tiene un comportamiento de solo lectura (`userTokenReadOnly: true`).
- Opcional: agregue `chat:write.customize` si desea que los mensajes salientes usen la identidad del agente activo (`username` e icono personalizados). `icon_emoji` usa la sintaxis `:emoji_name:`.

<Tip>Para las lecturas de acciones/directorios, el token de usuario puede preferirse cuando está configurado. Para las escrituras, el token de bot sigue siendo el preferido; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a MD (legado: `channels.slack.dm.policy`):

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`; legado: `channels.slack.dm.allowFrom`)
    - `disabled`

    Indicadores de MD:

    - `dm.enabled` (verdadero de forma predeterminada)
    - `channels.slack.allowFrom` (preferido)
    - `dm.allowFrom` (legado)
    - `dm.groupEnabled` (falso de forma predeterminada para MD de grupo)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está establecido.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    El emparejamiento en MD utiliza `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Política de canal">
    `channels.slack.groupPolicy` controla el manejo de canales:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos de canales se encuentra en `channels.slack.channels` y debe usar ID de canal estables.

    Nota de ejecución: si `channels.slack` falta por completo (configuración solo de entorno), la ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos de canales y las entradas de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombres de canal no resueltas se mantienen como están configuradas pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento de canales priorizan el ID de forma predeterminada; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están restringidos por mención por defecto.

    Fuentes de mención:

    - mención explícita de la aplicación (`<@botId>`)
    - patrones de regex de mención (`agents.list[].groupChat.mentionPatterns`, alternativa `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en hilos

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución al inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista de permitidos)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - formato de clave `toolsBySender`: `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía se asignan solo a `id:`)

  </Tab>
</Tabs>

## Comandos y comportamiento de barra

- El modo automático de comandos nativos está **desactivado** para Slack (`commands.native: "auto"` no habilita los comandos nativos de Slack).
- Habilite los controladores de comandos nativos de Slack con `channels.slack.commands.native: true` (o global `commands.native: true`).
- Cuando los comandos nativos están habilitados, registre los comandos de barra coincidentes en Slack (nombres `/<command>`), con una excepción:
  - registre `/agentstatus` para el comando de estado (Slack reserva `/status`)
- Si los comandos nativos no están habilitados, puede ejecutar un solo comando de barra configurado a través de `channels.slack.slashCommand`.
- Los menús de argumentos nativos ahora adaptan su estrategia de renderizado:
  - hasta 5 opciones: bloques de botones
  - 6-100 opciones: menú de selección estática
  - más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando los controladores de opciones de interactividad están disponibles
  - si los valores de opción codificados exceden los límites de Slack, el flujo recurre a los botones
- Para cargas útiles de opción largas, los menús de argumentos de comandos de barra usan un diálogo de confirmación antes de enviar un valor seleccionado.

## Respuestas interactivas

Slack puede renderizar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

Habilítelo globalmente:

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

O habilítelo solo para una cuenta de Slack:

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

Cuando está habilitado, los agentes pueden emitir directivas de respuesta exclusivas de Slack:

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

Estas directivas se compilan en Slack Block Kit y enrutan clics o selecciones a través de la ruta de eventos de interacción de Slack existente.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit a sus propios sistemas de botones.
- Los valores de retorno de llamada interactivos son tokens opacos generados por OpenClaw, no valores brutos creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw recurre a la respuesta de texto original en lugar de enviar una carga útil de bloques no válida.

Configuración predeterminada de comandos de barra:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Las sesiones de barra usan claves aisladas:

- `agent:<agentId>:slack:slash:<userId>`

y aún enrutar la ejecución del comando contra la sesión de conversación objetivo (`CommandTargetSessionKey`).

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Con `session.dmScope=main` predeterminado, los MD de Slack se colapsan en la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas de hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando corresponda.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se recuperan cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- respaldo heredado para chats directos: `channels.slack.dm.replyToMode`

Se admiten etiquetas de respuesta manuales:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Nota: `replyToMode="off"` desactiva **todos** los hilos de respuesta en Slack, incluyendo las etiquetas explícitas `[[reply_to_*]]`. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. La diferencia refleja los modelos de hilos de la plataforma: los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram siguen siendo visibles en el flujo de chat principal.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan desde URLs privadas alojadas en Slack (flujo de solicitud autenticada por token) y se escriben en el almacén de medios cuando la recuperación tiene éxito y los límites de tamaño lo permiten.

    El límite de tamaño entrante en tiempo de ejecución es `20MB` de forma predeterminada, a menos que sea anulado por `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texto y archivos salientes">
  - los fragmentos de texto usan `channels.slack.textChunkLimit` (por defecto 4000) - `channels.slack.chunkMode="newline"` habilita la división prioritaria por párrafos - el envío de archivos utiliza las APIs de carga de Slack y puede incluir respuestas de hilos (`thread_ts`) - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los envíos de
  canal usan los valores predeterminados de tipo MIME de la tubería de medios
</Accordion>

  <Accordion title="Objetivos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack se abren a través de las APIs de conversación de Slack al enviar a objetivos de usuario.

  </Accordion>
</AccordionGroup>

## Acciones y compuertas

Las acciones de Slack se controlan mediante `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo              | Predeterminado |
| ------------------ | -------------- |
| mensajes           | activado       |
| reacciones         | activado       |
| fijaciones         | activado       |
| informaciónMiembro | activado       |
| listaEmoji         | activado       |

Las acciones de mensaje de Slack actuales incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones/transmisiones de hilos de mensajes se asignan a eventos del sistema.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/salir miembros, canal creado/renombrado y agregar/eliminar fijados se asignan a eventos del sistema.
- Las actualizaciones de estado de hilo del asistente (para indicadores "escribiendo..." en hilos) usan `assistant.threads.setStatus` y requieren el alcance de bot `assistant:write`.
- `channel_id_changed` puede migrar claves de configuración de canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- Las acciones de bloque y las interacciones modales emiten eventos de sistema estructurados `Slack interaction: ...` con campos de carga útiles ricos:
  - acciones de bloque: valores seleccionados, etiquetas, valores de selector y metadatos `workflow_*`
  - eventos de modal `view_submission` y `view_closed` con metadatos de canal enrutados e entradas de formulario

## Reacciones de acuse de recibo

`ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de identidad del agente de reserva (`agents.list[].identity.emoji`, si no, "👀")

Notas:

- Slack espera shortcodes (por ejemplo `"eyes"`).
- Use `""` para desactivar la reacción para la cuenta de Slack o globalmente.

## Respaldo de reacción de escritura

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta y luego la elimina cuando finaliza la ejecución. Es un respaldo útil cuando la escritura nativa del asistente de Slack no está disponible, especialmente en MD.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera shortcodes (por ejemplo `"hourglass_flowing_sand"`).
- La reacción es de mejor esfuerzo y se intenta la limpieza automáticamente después de que se completa la ruta de respuesta o falla.

## Lista de verificación de manifiesto y alcance

<AccordionGroup>
  <Accordion title="Slack app manifest example">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": false
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
      "bot": ["chat:write", "channels:history", "channels:read", "groups:history", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "users:read", "app_mentions:read", "assistant:write", "reactions:read", "reactions:write", "pins:read", "pins:write", "emoji:read", "commands", "files:read", "files:write"]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": ["app_mention", "message.channels", "message.groups", "message.im", "message.mpim", "reaction_added", "reaction_removed", "member_joined_channel", "member_left_channel", "channel_rename", "pin_added", "pin_removed"]
    }
  }
}
```

  </Accordion>

  <Accordion title="Álmbitos opcionales de token de usuario (operaciones de lectura)">
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

## Aprobaciones de Exec en Slack

Las solicitudes de aprobación de Exec pueden enrutarse de forma nativa a través de Slack utilizando botones e interactivos, en lugar de recurrir a la interfaz de usuario web o a la terminal. La autorización del aprobador se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las solicitudes de aprobación se representan como botones de Block Kit directamente en la conversación.

La configuración utiliza la configuración compartida `approvals.exec` con objetivos de Slack:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      targets: [{ channel: "slack", to: "U12345678" }],
    },
  },
}
```

La `/approve` en el mismo chat también funciona en canales y MD de Slack que ya admiten comandos. Consulte [Exec approvals](/en/tools/exec-approvals) para ver el modelo completo de reenvío de aprobaciones.

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Verifique, en orden:

    - `groupPolicy`
    - lista de permitidos del canal (`channels.slack.channels`)
    - `requireMention`
    - lista de permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes MD ignorados">
    Verifique:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el heredado `channels.slack.dm.policy`)
    - aprobaciones de emparejamiento / entradas de lista de permitidos

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Modo Socket no se conecta">Valide los tokens de bot y de aplicación y la habilitación del modo Socket en la configuración de la aplicación de Slack.</Accordion>

  <Accordion title="Modo HTTP no recibe eventos">
    Valide:

    - secreto de firma
    - ruta del webhook
    - URL de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

  </Accordion>

  <Accordion title="Comandos nativos/de barra no se ejecutan">
    Verifique si tenía la intención de:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra única (`channels.slack.slashCommand.enabled: true`)

    También verifique `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Transmisión de texto

OpenClaw admite la transmisión de texto nativa de Slack a través de la API de Agents y AI Apps.

`channels.slack.streaming` controla el comportamiento de vista previa en vivo:

- `off`: desactiva la transmisión de vista previa en vivo.
- `partial` (predeterminado): reemplaza el texto de vista previa con la última salida parcial.
- `block`: anexa actualizaciones de vista previa fragmentadas.
- `progress`: muestra texto de estado de progreso mientras se genera, luego envía el texto final.

`channels.slack.nativeStreaming` controla la API de transmisión nativa de Slack (`chat.startStream` / `chat.appendStream` / `chat.stopStream`) cuando `streaming` es `partial` (predeterminado: `true`).

Desactivar la transmisión nativa de Slack (mantener el comportamiento de vista previa de borrador):

```yaml
channels:
  slack:
    streaming: partial
    nativeStreaming: false
```

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) se migra automáticamente a `channels.slack.streaming`.
- el booleano `channels.slack.streaming` se migra automáticamente a `channels.slack.nativeStreaming`.

### Requisitos

1. Habilita **Agents and AI Apps** en la configuración de tu aplicación de Slack.
2. Asegúrate de que la aplicación tenga el ámbito `assistant:write`.
3. Debe estar disponible un hilo de respuesta para ese mensaje. La selección del hilo todavía sigue `replyToMode`.

### Comportamiento

- El primer fragmento de texto inicia una transmisión (`chat.startStream`).
- Los fragmentos de texto posteriores se anexan a la misma transmisión (`chat.appendStream`).
- El final de la respuesta finaliza la transmisión (`chat.stopStream`).
- Los medios y las cargas útiles que no son de texto vuelven al envío normal.
- Si la transmisión falla a mitad de la respuesta, OpenClaw vuelve al envío normal para las cargas útiles restantes.

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Slack](/en/gateway/configuration-reference#slack)

  Campos de Slack de alta señal:
  - modo/autenticación: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - acceso DM: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompevidrio; mantener desactivado a menos que sea necesario)
  - acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - ops/características: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Grupos](/en/channels/groups)
- [Seguridad](/en/gateway/security)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Solución de problemas](/en/channels/troubleshooting)
- [Configuración](/en/gateway/configuration)
- [Comandos de barra](/en/tools/slash-commands)
