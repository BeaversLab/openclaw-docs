---
summary: "Configuración y comportamiento en tiempo de ejecución de Slack (Socket Mode + HTTP Events API)"
read_when:
  - Configuración de Slack o depuración del modo socket/HTTP de Slack
title: "Slack"
---

# Slack

Estado: listo para producción para MDs + canales a través de integraciones de aplicaciones de Slack. El modo predeterminado es el Modo Socket; el modo de API de eventos HTTP también es compatible.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Slack de forma predeterminada están en modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Manuales de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Modo Socket (predeterminado)">
    <Steps>
      <Step title="Crear la aplicación de Slack y los tokens">
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

        Env fallback (solo cuenta predeterminada):

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="Suscribir a eventos de la aplicación">
        Suscribir eventos de bot para:

        - `app_mention`
        - `message.channels`, `message.groups`, `message.im`, `message.mpim`
        - `reaction_added`, `reaction_removed`
        - `member_joined_channel`, `member_left_channel`
        - `channel_rename`
        - `pin_added`, `pin_removed`

        También habilite la pestaña **Messages Tab** de App Home para MD.
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
        Se admite el modo HTTP por cuenta.

        Asigne un `webhookPath` distinto a cada cuenta para que los registros no colisionen.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Modelo de token

- `botToken` + `appToken` son obligatorios para el modo Socket.
- El modo HTTP requiere `botToken` + `signingSecret`.
- Los tokens de configuración anulan la alternativa de entorno.
- La reserva de entorno `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` se aplica solo a la cuenta predeterminada.
- `userToken` (`xoxp-...`) es solo de configuración (sin reserva de entorno) y el valor predeterminado es el comportamiento de solo lectura (`userTokenReadOnly: true`).
- Opcional: añada `chat:write.customize` si desea que los mensajes salientes utilicen la identidad del agente activo (`username` personalizado e icono). `icon_emoji` usa la sintaxis `:emoji_name:`.

<Tip>
  Para las acciones/lecturas de directorio, el token de usuario puede ser preferido cuando se
  configura. Para las escrituras, el token de bot sigue siendo el preferido; las escrituras con
  token de usuario solo se permiten cuando `userTokenReadOnly: false` y el token de bot no está
  disponible.
</Tip>

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

    Precedencia multicuenta:

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

    La lista de permitidos del canal vive bajo `channels.slack.channels` y debe usar ID de canal estables.

    Nota de ejecución: si `channels.slack` falta por completo (configuración solo de entorno), la ejecución vuelve a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está establecido).

    Resolución de nombre/ID:

    - las entradas de la lista de permitidos del canal y de la lista de permitidos de MD se resuelven al inicio cuando el acceso del token lo permite
    - las entradas de nombre de canal no resueltas se mantienen como están configuradas pero se ignoran para el enrutamiento de forma predeterminada
    - la autorización entrante y el enrutamiento del canal son prioridad de ID de forma predeterminada; la coincidencia directa de nombre de usuario/slug requiere `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="Menciones y usuarios del canal">
    Los mensajes del canal están restringidos por menciones de forma predeterminada.

    Fuentes de mención:

    - mención explícita de la aplicación (`<@botId>`)
    - patrones de regex de mención (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en un hilo

    Controles por canal (`channels.slack.channels.<id>`; solo nombres mediante resolución de inicio o `dangerouslyAllowNameMatching`):

    - `requireMention`
    - `users` (lista blanca)
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`, `toolsBySender`
    - `toolsBySender` formato de clave: `id:`, `e164:`, `username:`, `name:`, o comodín `"*"`
      (las claves heredadas sin prefijo todavía asignan solo a `id:`)

  </Tab>
</Tabs>

## Comandos y comportamiento de barra

- El modo automático de comandos nativos está **desactivado** para Slack (`commands.native: "auto"` no habilita los comandos nativos de Slack).
- Habilite los controladores de comandos nativos de Slack con `channels.slack.commands.native: true` (o `commands.native: true` global).
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

y todavía enrutar la ejecución del comando contra la sesión de conversación objetivo (`CommandTargetSessionKey`).

## Hilos, sesiones y etiquetas de respuesta

- Los MD se enrutan como `direct`; los canales como `channel`; los MPIM como `group`.
- Con el valor predeterminado `session.dmScope=main`, los MD de Slack colapsan en la sesión principal del agente.
- Sesiones de canal: `agent:<agentId>:slack:channel:<channelId>`.
- Las respuestas de hilos pueden crear sufijos de sesión de hilo (`:thread:<threadTs>`) cuando corresponda.
- El valor predeterminado de `channels.slack.thread.historyScope` es `thread`; el valor predeterminado de `thread.inheritParent` es `false`.
- `channels.slack.thread.initialHistoryLimit` controla cuántos mensajes de hilo existentes se obtienen cuando comienza una nueva sesión de hilo (valor predeterminado `20`; establezca `0` para desactivar).

Controles de hilos de respuesta:

- `channels.slack.replyToMode`: `off|first|all` (valor predeterminado `off`)
- `channels.slack.replyToModeByChatType`: por `direct|group|channel`
- alternativa heredada para chats directos: `channels.slack.dm.replyToMode`

Se admiten etiquetas de respuesta manuales:

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

Nota: `replyToMode="off"` desactiva **todas** las respuestas de hilos en Slack, incluidas las etiquetas explícitas `[[reply_to_*]]`. Esto difiere de Telegram, donde las etiquetas explícitas todavía se respetan en el modo `"off"`. La diferencia refleja los modelos de hilos de las plataformas: los hilos de Slack ocultan los mensajes del canal, mientras que las respuestas de Telegram siguen siendo visibles en el flujo de chat principal.

## Medios, fragmentación y entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos entrantes">
    Los archivos adjuntos de Slack se descargan de URLs privadas alojadas en Slack (flujo de solicitud autenticada por token) y se escriben en el almacén de medios cuando la descarga tiene éxito y los límites de tamaño lo permiten.

    El límite de tamaño entrante en tiempo de ejecución tiene como valor predeterminado `20MB` a menos que se anule por `channels.slack.mediaMaxMb`.

  </Accordion>

<Accordion title="Texto y archivos salientes">
  - los fragmentos de texto usan `channels.slack.textChunkLimit` (por defecto 4000) -
  `channels.slack.chunkMode="newline"` habilita la división优先 párrafo - los envíos de archivos
  usan las APIs de carga de Slack y pueden incluir respuestas de hilos (`thread_ts`) - el límite de
  medios salientes sigue `channels.slack.mediaMaxMb` cuando está configurado; de lo contrario, los
  envíos de canal usan los valores predeterminados de tipo MIME de la canalización de medios
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

## Eventos y comportamiento operativo

- Las ediciones/eliminaciones de mensajes y las transmisiones de hilos se asignan a eventos del sistema.
- Los eventos de agregar/eliminar reacciones se asignan a eventos del sistema.
- Los eventos de unirse/salir miembro, canal creado/renombrado y agregar/eliminar fijaciones se asignan a eventos del sistema.
- Las actualizaciones de estado del hilo del asistente (para los indicadores "escribiendo..." en los hilos) usan `assistant.threads.setStatus` y requieren el ámbito de bot `assistant:write`.
- `channel_id_changed` puede migrar las claves de configuración del canal cuando `configWrites` está habilitado.
- Los metadatos del tema/propósito del canal se tratan como contexto no confiable y se pueden inyectar en el contexto de enrutamiento.
- Las acciones de bloque y las interacciones modales emiten eventos del sistema estructurados `Slack interaction: ...` con campos de carga útiles ricos:
  - acciones de bloque: valores seleccionados, etiquetas, valores de selector y metadatos `workflow_*`
  - eventos `view_submission` y `view_closed` de modales con metadatos de canal enrutados y entradas de formulario

## Reacciones de confirmación

`ackReaction` envía un emoji de reconocimiento mientras OpenClaw está procesando un mensaje entrante.

Orden de resolución:

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- emoji de respaldo de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

Notas:

- Slack espera códigos cortos (por ejemplo `"eyes"`).
- Use `""` para deshabilitar la reacción para la cuenta de Slack o globalmente.

## Respaldo de reacción de escritura

`typingReaction` agrega una reacción temporal al mensaje entrante de Slack mientras OpenClaw está procesando una respuesta, y luego la elimina cuando finaliza la ejecución. Este es un respaldo útil cuando la escritura nativa del asistente de Slack no está disponible, especialmente en MDs.

Orden de resolución:

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

Notas:

- Slack espera shortcodes (por ejemplo `"hourglass_flowing_sand"`).
- La reacción se realiza con el mejor esfuerzo y se intenta la limpieza automáticamente después de que se complete la ruta de respuesta o fallo.

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
      "bot": [
        "chat:write",
        "channels:history",
        "channels:read",
        "groups:history",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "users:read",
        "app_mentions:read",
        "assistant:write",
        "reactions:read",
        "reactions:write",
        "pins:read",
        "pins:write",
        "emoji:read",
        "commands",
        "files:read",
        "files:write"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "reaction_added",
        "reaction_removed",
        "member_joined_channel",
        "member_left_channel",
        "channel_rename",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

  </Accordion>

  <Accordion title="Ámbitos de token de usuario opcionales (operaciones de lectura)">
    Si configuras `channels.slack.userToken`, los ámbitos de lectura típicos son:

    - `channels:history`, `groups:history`, `im:history`, `mpim:history`
    - `channels:read`, `groups:read`, `im:read`, `mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read` (si dependes de lecturas de búsqueda de Slack)

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Sin respuestas en los canales">
    Comprueba, en orden:

    - `groupPolicy`
    - lista de permitidos del canal (`channels.slack.channels`)
    - `requireMention`
    - lista de permitidos de `users` por canal

    Comandos útiles:

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="Mensajes MD ignorados">
    Comprueba:

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy` (o `channels.slack.dm.policy` heredado)
    - aprobaciones de emparejamiento / entradas de lista de permitidos

```bash
openclaw pairing list slack
```

  </Accordion>

<Accordion title="Modo Socket no se conecta">
  Valida los tokens de bot y de aplicación y la habilitación del modo Socket en la configuración de
  la aplicación de Slack.
</Accordion>

  <Accordion title="El modo HTTP no recibe eventos">
    Valida:

    - secreto de firma
    - ruta del webhook
    - URLs de solicitud de Slack (Eventos + Interactividad + Comandos de barra)
    - `webhookPath` único por cuenta HTTP

  </Accordion>

  <Accordion title="Los comandos nativos/de barra no se ejecutan">
    Verifique si tenía la intención de:

    - el modo de comando nativo (`channels.slack.commands.native: true`) con comandos de barra coincidentes registrados en Slack
    - o el modo de comando de barra única (`channels.slack.slashCommand.enabled: true`)

    También compruebe `commands.useAccessGroups` y las listas de permitidos de canales/usuarios.

  </Accordion>
</AccordionGroup>

## Transmisión de texto

OpenClaw admite la transmisión de texto nativa de Slack a través de la API de Agents y AI Apps.

`channels.slack.streaming` controla el comportamiento de la vista previa en vivo:

- `off`: desactiva la transmisión de la vista previa en vivo.
- `partial` (predeterminado): reemplaza el texto de vista previa con la última salida parcial.
- `block`: añade las actualizaciones de vista previa fragmentadas.
- `progress`: muestra el texto de estado de progreso mientras se genera, y luego envía el texto final.

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

1. Habilite **Agents and AI Apps** en la configuración de su aplicación de Slack.
2. Asegúrese de que la aplicación tenga el alcance `assistant:write`.
3. Debe haber un hilo de respuesta disponible para ese mensaje. La selección del hilo sigue `replyToMode`.

### Comportamiento

- El primer fragmento de texto inicia una transmisión (`chat.startStream`).
- Los fragmentos de texto posteriores se añaden a la misma transmisión (`chat.appendStream`).
- El final de la respuesta finaliza la transmisión (`chat.stopStream`).
- Las cargas útiles multimedia y que no son de texto vuelven a la entrega normal.
- Si la transmisión falla a mitad de una respuesta, OpenClaw vuelve a la entrega normal para las cargas útiles restantes.

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Slack](/es/gateway/configuration-reference#slack)

  Campos de alta señal de Slack:
  - modo/auth: `mode`, `botToken`, `appToken`, `signingSecret`, `webhookPath`, `accounts.*`
  - acceso a MD: `dm.enabled`, `dmPolicy`, `allowFrom` (heredado: `dm.policy`, `dm.allowFrom`), `dm.groupEnabled`, `dm.groupChannels`
  - interruptor de compatibilidad: `dangerouslyAllowNameMatching` (rompecristales; manténgalo apagado a menos que sea necesario)
  - acceso al canal: `groupPolicy`, `channels.*`, `channels.*.users`, `channels.*.requireMention`
  - hilos/historial: `replyToMode`, `replyToModeByChatType`, `thread.*`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
  - entrega: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `streaming`, `nativeStreaming`
  - operaciones/características: `configWrites`, `commands.native`, `slashCommand.*`, `actions.*`, `userToken`, `userTokenReadOnly`

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Enrutamiento de canales](/es/channels/channel-routing)
- [Solución de problemas](/es/channels/troubleshooting)
- [Configuración](/es/gateway/configuration)
- [Comandos de barra](/es/tools/slash-commands)

import es from "/components/footer/es.mdx";

<es />
