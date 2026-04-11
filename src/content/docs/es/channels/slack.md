---
summary: "Configuración y comportamiento en tiempo de ejecución de Slack (Modo Socket + URLs de solicitud HTTP)"
read_when:
  - Setting up Slack or debugging Slack socket/HTTP mode
title: "Slack"
---

# Slack

Estado: listo para producción para MDs + canales mediante integraciones de aplicaciones de Slack. El modo predeterminado es el modo Socket; las URLs de solicitudes HTTP también son compatibles.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    Los MDs de Slack usan el modo de emparejamiento de forma predeterminada.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/en/tools/slash-commands">
    Comportamiento de comandos nativos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Modo Socket (predeterminado)">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        En la configuración de la aplicación de Slack, presione el botón **[Create New App](https://api.slack.com/apps/new)**:

        - elija **from a manifest** y seleccione un espacio de trabajo para su aplicación
        - pegue el [example manifest](#manifest-and-scope-checklist) de abajo y continúe para crear
        - genere un **App-Level Token** (`xapp-...`) con `connections:write`
        - instale la aplicación y copie el **Bot Token** (`xoxb-...`) que se muestra
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

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="URLs de solicitud HTTP">
    <Steps>
      <Step title="Crear una nueva aplicación de Slack">
        En la configuración de la aplicación de Slack, presione el botón **[Create New App](https://api.slack.com/apps/new)**:

        - elija **from a manifest** (desde un manifiesto) y seleccione un espacio de trabajo para su aplicación
        - pegue el [example manifest](#manifest-and-scope-checklist) (manifiesto de ejemplo) y actualice las URL antes de crear
        - guarde el **Signing Secret** (secreto de firma) para la verificación de solicitudes
        - instale la aplicación y copie el **Bot Token** (`xoxb-...`) que se muestra

      </Step>

      <Step title="Configurar OpenClaw">

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

        <Note>
        Use rutas de webhook únicas para HTTP multi-cuenta

        Asigne a cada cuenta un `webhookPath` distinto (por defecto `/slack/events`) para que los registros no colisionen.
        </Note>

      </Step>

      <Step title="Iniciar puerta de enlace">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Lista de verificación de manifiesto y ámbito

<Tabs>
  <Tab title="Socket Mode (default)">

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

  </Tab>

  <Tab title="URLs de solicitud HTTP">

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
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": ["app_mentions:read", "assistant:write", "channels:history", "channels:read", "chat:write", "commands", "emoji:read", "files:read", "files:write", "groups:history", "groups:read", "im:history", "im:read", "im:write", "mpim:history", "mpim:read", "mpim:write", "pins:read", "pins:write", "reactions:read", "reactions:write", "users:read"]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": ["app_mention", "channel_rename", "member_joined_channel", "member_left_channel", "message.channels", "message.groups", "message.im", "message.mpim", "pin_added", "pin_removed", "reaction_added", "reaction_removed"]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="Ámbitos de autoría opcionales (operaciones de escritura)">
    Añada el ámbito de bot `chat:write.customize` si desea que los mensajes salientes utilicen la identidad del agente activo (nombre de usuario e icono personalizados) en lugar de la identidad predeterminada de la aplicación de Slack.

    Si utiliza un icono emoji, Slack espera la sintaxis `:emoji_name:`.

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
  de texto sin formato u objetos SecretRef.
- Los tokens de configuración anulan la alternativa de entorno.
- La alternativa de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` solo se aplica a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin alternativa de entorno) y el comportamiento predeterminado es de solo lectura (`userTokenReadOnly: true`).

Comportamiento de la instantánea de estado:

- La inspección de la cuenta de Slack realiza un seguimiento de los campos `*Source` y `*Status`
  por credencial (`botToken`, `appToken`, `signingSecret`, `userToken`).
- El estado es `available`, `configured_unavailable` o `missing`.
- `configured_unavailable` significa que la cuenta está configurada a través de SecretRef
  u otro origen de secreto que no esté en línea, pero que la ruta de comando/tiempo de ejecución actual
  no pudo resolver el valor real.
- En modo HTTP, se incluye `signingSecretStatus`; en modo Socket, el
  par obligatorio es `botTokenStatus` + `appTokenStatus`.

<Tip>Para acciones/lecturas de directorio, el token de usuario puede preferirse cuando está configurado. Para escrituras, el token de bot sigue siendo el preferido; las escrituras con token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está disponible.</Tip>

## Acciones y puertas

Las acciones de Slack se controlan mediante `channels.slack.actions.*`.

Grupos de acciones disponibles en las herramientas actuales de Slack:

| Grupo              | Predeterminado |
| ------------------ | -------------- |
| mensajes           | habilitado     |
| reacciones         | habilitado     |
| fijados            | habilitado     |
| informaciónMiembro | habilitado     |
| listaEmojis        | habilitado     |

Las acciones de mensaje de Slack actuales incluyen `send`, `upload-file`, `download-file`, `read`, `edit`, `delete`, `pin`, `unpin`, `list-pins`, `member-info` y `emoji-list`.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.slack.dmPolicy` controla el acceso a MD (heredado: `channels.slack.dm.policy`):

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.slack.allowFrom` incluya `"*"`; heredado: `channels.slack.dm.allowFrom`)
    - `disabled`

    Marcadores de MD:

    - `dm.enabled` (verdadero predeterminado)
    - `channels.slack.allowFrom` (preferido)
    - `dm.allowFrom` (heredado)
    - `dm.groupEnabled` (falso predeterminado para MD de grupo)
    - `dm.groupChannels` (lista de permitidos MPIM opcional)

    Precedencia de multicuenta:

    - `channels.slack.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.slack.allowFrom` cuando su propio `allowFrom` no está establecido.
    - Las cuentas con nombre no heredan `channels.slack.accounts.default.allowFrom`.

    El emparejamiento en MD usa `openclaw pairing approve slack <code>`.

  </Tab>

  <Tab title="Política de canal">
    `channels.slack.groupPolicy` controla el manejo del canal:

    - `open`
    - `allowlist`
    - `disabled`

    La lista de permitidos del canal vive bajo `channels.slack.channels` y debe usar IDs de canal estables.

    Nota de ejecución: si `channels.slack` falta completamente (configuración solo de entorno), la ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está configurado).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos del canal y de la lista de permitidos de MD se resuelven al inicio cuando el acceso al token lo permite
    - las entradas de nombres de canal no resueltas se mantienen tal como están configuradas pero se ignoran para el enrutamiento por defecto
    - la autorización entrante y el enrutamiento del canal priorizan el ID por defecto; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están restringidos por menciones por defecto.

    Fuentes de menciones:

    - mención explícita de la aplicación (`<@botId>`)
    - patrones de regex de menciones (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en hilos (deshabilitado cuando `thread.requireExplicitMention` es `true`)

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

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Con `session.dmScope=main` predeterminado, los MD de Slack colapsan a la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas de hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando sea aplicable.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se recuperan cuando comienza una nueva sesión de hilo (predeterminado `20`; establezca `0` para desactivar).
- `channels.slack.thread.requireExplicitMention` (predeterminado `false`): cuando es `true`, suprime las menciones implícitas de hilos para que el bot solo responda a menciones `@bot` explícitas dentro de los hilos, incluso cuando el bot ya haya participado en el hilo. Sin esto, las respuestas en un hilo en el que participa el bot omiten el filtrado `requireMention`.

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all|batched` (predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- alternativa heredada para chats directos: `channels.slack.dm.replyToMode`

Las etiquetas de respuesta manual son compatibles:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Nota: `replyToMode="off"` desactiva **todos** los hilos de respuesta en Slack, incluidas las etiquetas `[[reply_to_*]]` explícitas. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. La diferencia refleja los modelos de hilos de la plataforma: los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram permanecen visibles en el flujo de chat principal.

## Reacciones de reconocimiento

`ackReaction` envía un emoji de reconocimiento mientras OpenClaw procesa un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- alternativa de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para desactivar la reacción para la cuenta de Slack o globalmente.

## Transmisión de texto

`channels.slack.streaming` controla el comportamiento de la vista previa en vivo:

- `off`: desactiva la transmisión de vista previa en vivo.
- `partial` (predeterminado): reemplaza el texto de vista previa con la última salida parcial.
- `block`: añade actualizaciones de vista previa fragmentadas.
- `progress`: muestra el texto de estado de progreso mientras se genera, y luego envía el texto final.

`channels.slack.streaming.nativeTransport` controla la transmisión de texto nativa de Slack cuando `channels.slack.streaming.mode` es `partial` (predeterminado: `true`).

- Debe haber un hilo de respuesta disponible para que aparezca la transmisión de texto nativa y el estado del hilo del asistente de Slack. La selección del hilo aún sigue `replyToMode`.
- Las raíces de canales y chats grupales aún pueden usar la vista previa de borrador normal cuando la transmisión nativa no está disponible.
- Los MD de Slack de nivel superior se mantienen fuera del hilo de forma predeterminada, por lo que no muestran la vista previa de estilo de hilo; use respuestas de hilo o `typingReaction` si desea un progreso visible allí.
- Las cargas útiles multimedia y de no texto vuelven a la entrega normal.
- Si la transmisión falla a mitad de la respuesta, OpenClaw vuelve a la entrega normal para las cargas útiles restantes.

Usar la vista previa de borrador en lugar de la transmisión de texto nativa de Slack:

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "partial",
        nativeTransport: false,
      },
    },
  },
}
```

Claves heredadas:

- `channels.slack.streamMode` (`replace | status_final | append`) se migra automáticamente a `channels.slack.streaming.mode`.
- el valor booleano `channels.slack.streaming` se migra automáticamente a `channels.slack.streaming.mode` y `channels.slack.streaming.nativeTransport`.
- el valor heredado `channels.slack.nativeStreaming` se migra automáticamente a `channels.slack.streaming.nativeTransport`.

## Respaldo de reacción de escritura

`typingReaction` añade una reacción temporal al mensaje entrante de Slack mientras OpenClaw procesa una respuesta, y luego la elimina cuando finaliza la ejecución. Esto es más útil fuera de las respuestas de hilo, que usan un indicador de estado "escribiendo..." predeterminado.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera códigos cortos (por ejemplo `"hourglass_flowing_sand"`).
- La reacción se realiza de forma de mejor esfuerzo y se intenta la limpieza automáticamente después de que se completa la respuesta o la ruta de error.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan desde URL privadas alojadas en Slack (flujo de solicitud autenticada por token) y se escriben en el almacén de medios cuando la recuperación tiene éxito y los límites de tamaño lo permiten.

    El límite de tamaño de entrada en tiempo de ejecución es `20MB` de forma predeterminada, a menos que sea anulado por `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texto y archivos salientes">
  - los fragmentos de texto usan `channels.slack.textChunkLimit` (predeterminado 4000) - `channels.slack.chunkMode="newline"` habilita la división prioritaria de párrafos - el envío de archivos usa las APIs de carga de Slack y puede incluir respuestas de hilos (`thread_ts`) - el límite de medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los envíos del
  canal usan los valores predeterminados de tipo MIME de la canalización de medios
</Accordion>

  <Accordion title="Objetivos de entrega">
    Objetivos explícitos preferidos:

    - `user:<id>` para MDs
    - `channel:<id>` para canales

    Los MDs de Slack se abren a través de las APIs de conversación de Slack al enviar a objetivos de usuario.

  </Accordion>
</AccordionGroup>

## Comandos y comportamiento de barra diagonal

- El modo automático de comandos nativos está **desactivado** para Slack (`commands.native: "auto"` no habilita los comandos nativos de Slack).
- Habilite los controladores de comandos nativos de Slack con `channels.slack.commands.native: true` (o global `commands.native: true`).
- Cuando los comandos nativos están habilitados, registre los comandos de barra diagonal coincidentes en Slack (nombres `/<command>`), con una excepción:
  - registre `/agentstatus` para el comando de estado (Slack reserva `/status`)
- Si los comandos nativos no están habilitados, puede ejecutar un solo comando de barra diagonal configurado a través de `channels.slack.slashCommand`.
- Los menús de argumentos nativos ahora adaptan su estrategia de representación:
  - hasta 5 opciones: bloques de botones
  - 6-100 opciones: menú de selección estática
  - más de 100 opciones: selección externa con filtrado de opciones asíncrono cuando hay controladores de opciones de interactividad disponibles
  - si los valores de las opciones codificadas exceden los límites de Slack, el flujo recurre a los botones
- Para payloads de opciones largos, los menús de argumentos de comandos de barra diagonal usan un diálogo de confirmación antes de enviar un valor seleccionado.

Configuraciones predeterminadas de comandos de barra diagonal:

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

Las sesiones de barra diagonal usan claves aisladas:

- `agent:<agentId>:slack:slash:<userId>`

y aún enrutan la ejecución del comando contra la sesión de conversación de destino (`CommandTargetSessionKey`).

## Respuestas interactivas

Slack puede renderizar controles de respuesta interactivos creados por el agente, pero esta función está deshabilitada de forma predeterminada.

Actívelo globalmente:

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

O actívelo solo para una cuenta de Slack:

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

Estas directivas se compilan en Slack Block Kit y enrutan clics o selecciones de vuelta a través de la ruta de eventos de interacción existente de Slack.

Notas:

- Esta es una interfaz de usuario específica de Slack. Otros canales no traducen las directivas de Slack Block Kit a sus propios sistemas de botones.
- Los valores de devolución de llamada interactivos son tokens opacos generados por OpenClaw, no valores brutos creados por el agente.
- Si los bloques interactivos generados excedieran los límites de Slack Block Kit, OpenClaw recurre a la respuesta de texto original en lugar de enviar un payload de bloques no válido.

## Aprobaciones de Exec en Slack

Slack puede actuar como un cliente de aprobación nativo con botones e interacciones interactivos, en lugar de recurrir a la interfaz de usuario web o terminal.

- Las aprobaciones de Exec usan `channels.slack.execApprovals.*` para el enrutamiento nativo de DM/canal.
- Las aprobaciones de complemento aún pueden resolverse a través de la misma superficie de botón nativa de Slack cuando la solicitud ya llega a Slack y el tipo de id de aprobación es `plugin:`.
- La autorización del aprobador aún se aplica: solo los usuarios identificados como aprobadores pueden aprobar o denegar solicitudes a través de Slack.

Esto utiliza la misma superficie de botón de aprobación compartida que otros canales. Cuando `interactivity` está habilitado en la configuración de tu aplicación de Slack, las solicitudes de aprobación se renderizan como botones de Block Kit directamente en la conversación.
Cuando esos botones están presentes, son la experiencia de usuario (UX) de aprobación principal; OpenClaw
solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones por chat no están disponibles o la aprobación manual es la única vía.

Ruta de configuración:

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers` (opcional; por defecto a `commands.ownerAllowFrom` cuando sea posible)
- `channels.slack.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
- `agentFilter`, `sessionFilter`

Slack habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y al menos un
aprobador resuelve. Establece `enabled: false` para deshabilitar explícitamente Slack como cliente de aprobación nativo.
Establece `enabled: true` para forzar las aprobaciones nativas cuando los aprobadores resuelvan.

Comportamiento por defecto sin configuración explícita de aprobación de ejecución de Slack:

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

Solo se necesita una configuración nativa explícita de Slack cuando deseas anular los aprobadores, añadir filtros o
optar por la entrega en el chat de origen:

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

El reenvío compartido de `approvals.exec` es separado. Úsalo solo cuando las solicitudes de aprobación de ejecución también deban
enrutarse a otros chats o objetivos explícitos fuera de banda. El reenvío compartido de `approvals.plugin` también es
separado; los botones nativos de Slack aún pueden resolver aprobaciones de complementos cuando esas solicitudes ya llegan
a Slack.

El `/approve` en el mismo chat también funciona en canales y MDs de Slack que ya soportan comandos. Consulte [Exec approvals](/en/tools/exec-approvals) para el modelo completo de reenvío de aprobaciones.

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes y las transmisiones de hilos se asignan a eventos del sistema.
- Los eventos de añadir/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/abandonar miembro, canal creado/renombrado y añadir/eliminar fijado se asignan a eventos del sistema.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- El iniciador del hilo y la inicialización del contexto del historial del hilo se filtran mediante las listas de permitidos del remitente configuradas, cuando corresponda.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema `Slack interaction: ...` estructurados con campos de payload enriquecidos:
  - acciones de bloque: valores seleccionados, etiquetas, valores del selector y metadatos `workflow_*`
  - eventos modal `view_submission` y `view_closed` con metadatos del canal enrutado y entradas de formulario

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Slack](/en/gateway/configuration-reference#slack)

  Campos de Slack de alta señal:
  - modo/autenticación: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - acceso a DM: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompevidrios; mantener desactivado a menos que sea necesario)
  - acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `streaming.nativeTransport`
  - ops/features: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Verificar, en orden:

    - `groupPolicy`
    - lista de canales permitidos (`channels.slack.channels`)
    - `requireMention`
    - lista de canales permitidos `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes de MD ignorados">
    Verificar:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o el heredado `channels.slack.dm.policy`)
    - aprobaciones de emparejamiento / entradas de lista de permitidos

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Modo socket no conecta">
    Valide los tokens de bot + aplicación y la activación del Modo Socket en la configuración de la aplicación de Slack.

    Si `openclaw channels status --probe --json` muestra `botTokenStatus` o
    `appTokenStatus: "configured_unavailable"`, la cuenta de Slack está
    configurada pero el tiempo de ejecución actual no pudo resolver el valor respaldado por SecretRef.

  </Accordion>

  <Accordion title="El modo HTTP no recibe eventos">
    Validar:

    - secreto de firma
    - ruta del webhook
    - URL de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

    Si `signingSecretStatus: "configured_unavailable"` aparece en las instantáneas
    de cuenta, la cuenta HTTP está configurada pero el tiempo de ejecución actual no pudo
    resolver el secreto de firma respaldado por SecretRef.

  </Accordion>

  <Accordion title="Los comandos nativos/de barra no se ejecutan">
    Verifique si pretendía:

    - modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o modo de comando de barra único (`channels.slack.slashCommand.enabled: true`)

    También verifique `commands.useAccessGroups` y las listas de permitidos de canal/usuario.

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
