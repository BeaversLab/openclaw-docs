---
summary: "Estado de soporte del bot de Discord, capacidades y configuración"
read_when:
  - Working on Discord channel features
title: "Discord"
---

Listo para mensajes directos y canales de gremio a través de la puerta de enlace oficial de Discord.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Discord por defecto están en modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comando nativo y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Flujo de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Necesitarás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Crear el mío > Para mí y mis amigos**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal para Desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **Nueva Aplicación**. Ponle un nombre como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Nombre de usuario** como llames a tu agente OpenClaw.

  </Step>

  <Step title="Habilitar intents privilegiados">
    Aún en la página **Bot**, desplázate hacia abajo hasta **Intents de Gateway Privilegiados** y habilita:

    - **Intent de Contenido de Mensajes** (requerido)
    - **Intent de Miembros del Servidor** (recomendado; requerido para listas de permitidos de roles y coincidencia de nombre con ID)
    - **Intent de Presencia** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copiar el token de tu bot">
    Vuelve a subir en la página **Bot** y haz clic en **Restablecer Token**.

    <Note>
    A pesar del nombre, esto genera tu primer token; no se está "restableciendo" nada.
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Token de Bot** y lo necesitarás en breve.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos adecuados para agregar el bot a tu servidor.

    Deslízate hacia abajo hasta **OAuth2 URL Generator** y habilita:

    - `bot`
    - `applications.commands`

    Aparecerá debajo una sección **Bot Permissions**. Habilita al menos:

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions (opcional)

    Este es el conjunto base para canales de texto normales. Si planeas publicar en hilos de Discord, incluidos los flujos de trabajo de canales de foro o medios que crean o continúan un hilo, también habilita **Send Messages in Threads**.
    Copia la URL generada al final, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De vuelta en la aplicación de Discord, necesitas habilitar el Modo de Desarrollador para poder copiar los IDs internos.

    1. Haz clic en **User Settings** (icono de engranaje junto a tu avatar) → **Advanced** → activa **Developer Mode**
    2. Haz clic derecho en tu **server icon** en la barra lateral → **Copy Server ID**
    3. Haz clic derecho en tu **own avatar** → **Copy User ID**

    Guarda tu **Server ID** y tu **User ID** junto con tu Bot Token — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Allow DMs from server members">
    Para que el emparejamiento funcione, Discord necesita permitir que tu bot te envíe MD. Haz clic derecho en tu **server icon** → **Privacy Settings** → activa **Direct Messages**.

    Esto permite que los miembros del servidor (incluidos los bots) te envíen MD. Mantén esto habilitado si deseas usar los MD de Discord con OpenClaw. Si solo planeas usar canales de gremio, puedes desactivar los MD después del emparejamiento.

  </Step>

  <Step title="Establezca su token de bot de forma segura (no lo envíe en el chat)">
    Su token de bot de Discord es un secreto (como una contraseña). Establézcalo en la máquina que ejecuta OpenClaw antes de enviar mensajes a su agente.

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    Si OpenClaw ya se está ejecutando como un servicio en segundo plano, reinícielo a través de la aplicación Mac de OpenClaw o deteniendo y reiniciando el proceso `openclaw gateway run`.
    Para instalaciones de servicio administrado, ejecute `openclaw gateway install` desde un shell donde `DISCORD_BOT_TOKEN` esté presente, o almacene la variable en `~/.openclaw/.env`, para que el servicio pueda resolver el env SecretRef después del reinicio.
    Si su host está bloqueado o tiene una tasa limitada por la búsqueda de aplicaciones de inicio de Discord, establezca el ID de aplicación/cliente de Discord desde el Portal de Desarrolladores para que el inicio pueda omitir esa llamada REST. Use `channels.discord.applicationId` para la cuenta predeterminada, o `channels.discord.accounts.<accountId>.applicationId` cuando ejecute varios bots de Discord.

  </Step>

  <Step title="Configurar OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile que lo haga. Si Discord es tu primer canal, utiliza la pestaña CLI / config en su lugar.

        > "Ya configuré mi token de bot de Discord en la configuración. Por favor, termina la configuración de Discord con el ID de usuario `<user_id>` y el ID de servidor `<server_id>`."
      </Tab>
      <Tab title="CLI / config">
        Si prefieres la configuración basada en archivos, establece:

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        Respaldo de entorno para la cuenta predeterminada:

```bash
DISCORD_BOT_TOKEN=...
```

        Para una configuración programada o remota, escribe el mismo bloque JSON5 con `openclaw config patch --file ./discord.patch.json5 --dry-run` y luego vuelve a ejecutarlo sin `--dry-run`. Se admiten valores `token` de texto plano. También se admiten valores SecretRef para `channels.discord.token` a través de proveedores env/file/exec. Consulte [Gestión de secretos](/es/gateway/secrets).

        Para varios bots de Discord, mantén cada token de bot e ID de aplicación bajo su cuenta. Un `channels.discord.applicationId` de nivel superior es heredado por las cuentas, así que establécelo allí solo cuando cada cuenta deba usar el mismo ID de aplicación.

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Aprobar primer emparejamiento DM">
    Espera a que se esté ejecutando el gateway, luego envía un mensaje privado (DM) a tu bot en Discord. Responderá con un código de emparejamiento.

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Envía el código de emparejamiento a tu agente en tu canal existente:

        > "Aprobar este código de emparejamiento de Discord: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Los códigos de emparejamiento caducan después de 1 hora.

    Ahora deberías poder chatear con tu agente en Discord mediante DM.

  </Step>
</Steps>

<Note>
  La resolución de tokens es consciente de la cuenta. Los valores de tokens de configuración tienen prioridad sobre el respaldo de variables de entorno. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Si dos cuentas de Discord habilitadas se resuelven al mismo token de bot, OpenClaw inicia solo un monitor de puerta de enlace para ese token. Un token obtenido de la configuración
  tiene prioridad sobre el respaldo de entorno predeterminado; de lo contrario, gana la primera cuenta habilitada y se reporta que la cuenta duplicada está deshabilitada. Para llamadas salientes avanzadas (herramienta de mensajes/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto se aplica a acciones de envío y lectura/sondeo (por ejemplo,
  leer/buscar/obtener/hilo/fijados/permisos). La configuración de política/reintentos de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor

Una vez que los MDs funcionen, puedes configurar tu servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo estás tú y tu bot.

<Steps>
  <Step title="Agrega tu servidor a la lista de permitidos del gremio">
    Esto habilita a tu agente para responder en cualquier canal de tu servidor, no solo en MDs.

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        > "Agrega mi ID de Servidor de Discord `<server_id>` a la lista de permitidos del gremio"
      </Tab>
      <Tab title="Config">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Allow responses without @mention">
    De manera predeterminada, tu agente solo responde en los canales del gremio cuando es @mencionado. Para un servidor privado, probablemente quieras que responda a cada mensaje.

    En los canales del gremio, las respuestas normales se publican automáticamente de manera predeterminada. Para salas compartidas que siempre están activas, opta por `messages.groupChat.visibleReplies: "message_tool"` para que el agente pueda mantenerse al acecho y solo publicar cuando decida que una respuesta en el canal es útil. Esto funciona mejor con modelos de última generación confiables en herramientas como GPT 5.5. Los eventos de sala ambiental se mantienen silenciosos a menos que la herramienta los envíe. Consulta [Ambient room events](/es/channels/ambient-room-events) para ver la configuración completa del modo de acecho.

    Si Discord muestra que está escribiendo y los registros muestran uso de tokens pero no hay ningún mensaje publicado, verifica si el turno se configuró como un evento de sala ambiental o si se optó por respuestas visibles de herramientas de mensaje.

    <Tabs>
      <Tab title="Ask your agent">
        > "Allow my agent to respond on this server without having to be @mentioned"
      </Tab>
      <Tab title="Config">
        Establece `requireMention: false` en tu configuración de gremio:

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

        Para requerir envíos de herramientas de mensaje para respuestas visibles de grupos/canales, establece `messages.groupChat.visibleReplies: "message_tool"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    De manera predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de DM. Los canales del gremio no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesitas un contexto compartido en cada canal, coloca las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan para cada sesión). Mantén las notas a largo plazo en `MEMORY.md` y accede a ellas bajo demanda con herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y empieza a chatear. Tu agente puede ver el nombre del canal, y cada canal obtiene su propia sesión aislada, por lo que puedes configurar `#coding`, `#home`, `#research` o lo que se adapte a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway posee la conexión de Discord.
- El enrutamiento de respuestas es determinista: las entradas de Discord responden de vuelta a Discord.
- Los metadatos del gremio/canal de Discord se agregan al mensaje del modelo como contexto
  no confiable, no como un prefijo de respuesta visible para el usuario. Si un modelo copia ese
  sobre de vuelta, OpenClaw elimina los metadatos copiados de las respuestas salientes y de
  el contexto de repetición futuro.
- De forma predeterminada (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales de guild (servidor) son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los mensajes directos grupales se ignoran de forma predeterminada (`channels.discord.dm.groupEnabled=false`).
- Los comandos nativos de barra diagonal se ejecutan en sesiones de comandos aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras que todavía transportan `CommandTargetSessionKey` a la sesión de conversación enrutada.
- La entrega de anuncios de solo texto de cron/latido a Discord utiliza la respuesta
  final visible para el asistente una sola vez. Las cargas útiles de componentes multimedia y estructurados permanecen
  en varios mensajes cuando el agente emite múltiples cargas entregables.

## Canales de foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al foro principal (`channel:<forumId>`) para crear un hilo automáticamente. El título del hilo utiliza la primera línea no vacía de tu mensaje.
- Usa `openclaw message thread create` para crear un hilo directamente. No pases `--message-id` para los canales de foro.

Ejemplo: enviar al foro principal para crear un hilo

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Ejemplo: crear explícitamente un hilo de foro

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Los foros principales no aceptan componentes de Discord. Si necesitas componentes, envíalos al hilo en sí (`channel:<threadId>`).

## Componentes interactivos

OpenClaw admite contenedores de componentes de Discord v2 para mensajes de agente. Utiliza la herramienta de mensaje con una carga útil `components`. Los resultados de las interacciones se redirigen de vuelta al agente como mensajes entrantes normales y siguen la configuración existente de `replyToMode` de Discord.

Bloques compatibles:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un único menú de selección
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

De forma predeterminada, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, las selecciones y los formularios se usen varias veces hasta que caduquen.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (ID de usuario de Discord, etiquetas o `*`). Cuando está configurado, los usuarios no coincidentes reciben una denegación efímera.

Las devoluciones de llamada de componentes caducan después de 30 minutos de manera predeterminada. Establezca `channels.discord.agentComponents.ttlMs` para cambiar la vida útil del registro de devoluciones de llamada para la cuenta de Discord predeterminada, o `channels.discord.accounts.<accountId>.agentComponents.ttlMs` para anular una cuenta en una configuración de varias cuentas. El valor está en milisegundos, debe ser un entero positivo y está limitado a `86400000` (24 horas). Los TTL más largos son útiles para flujos de trabajo de revisión o aprobación que necesitan que los botones sigan siendo utilizables, pero también extienden la ventana donde un mensaje antiguo de Discord aún puede activar una acción. Prefiera el TTL más corto que se ajuste al flujo de trabajo y mantenga el valor predeterminado cuando las devoluciones de llamada obsoletas serían sorprendentes.

Los comandos de barra `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor, modelo y tiempo de ejecución compatible, además de un paso Enviar. `/models add` está en desuso y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat. La respuesta del selector es efímera y solo el usuario que la invoca puede usarla. Los menús de selección de Discord están limitados a 25 opciones, por lo que debe agregar entradas `provider/*` a `agents.defaults.models` cuando desee que el selector muestre modelos descubiertos dinámicamente solo para proveedores seleccionados como `openai-codex` o `vllm`.

Archivos adjuntos:

- Los bloques `file` deben apuntar a una referencia de adjunto (`attachment://<filename>`)
- Proporcione el adjunto a través de `media`/`path`/`filePath` (archivo único); use `media-gallery` para múltiples archivos
- Use `filename` para anular el nombre de carga cuando debería coincidir con la referencia del adjunto

Formularios modales:

- Agregue `components.modal` con hasta 5 campos
- Tipos de campo: `text`, `checkbox`, `radio`, `select`, `role-select`, `user-select`
- OpenClaw agrega automáticamente un botón de activación

Ejemplo:

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.discord.dmPolicy` controla el acceso a MD. `channels.discord.allowFrom` es la lista de permitidos de MD canónica.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.discord.allowFrom` incluya `"*"`)
    - `disabled`

    Si la política de MD no está abierta, los usuarios desconocidos están bloqueados (o se les solicita emparejamiento en el modo `pairing`).

    Precedencia multicuenta:

    - `channels.discord.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Para una cuenta, `allowFrom` tiene prioridad sobre `dm.allowFrom` heredado.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propio `allowFrom` y el `dm.allowFrom` heredado no están configurados.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    El `channels.discord.dm.policy` heredado y `channels.discord.dm.allowFrom` todavía se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    Formato de destino de MD para entrega:

    - `user:<id>`
    - Mención `<@id>`

    Normalmente, los IDs numéricos simples se resuelven como IDs de canal cuando hay un canal predeterminado activo, pero los IDs enumerados en el `allowFrom` de MD efectivo de la cuenta se tratan como destinos de MD de usuario por compatibilidad.

  </Tab>

  <Tab title="Grupos de acceso">
    La autorización de MD de Discord y comandos de texto puede usar entradas `accessGroup:<name>` dinámicas en `channels.discord.allowFrom`.

    Los nombres de los grupos de acceso se comparten en los canales de mensajes. Use `type: "message.senders"` para un grupo estático cuyos miembros se expresan en la sintaxis normal `allowFrom` de cada canal, o `type: "discord.channelAudience"` cuando la audiencia `ViewChannel` actual de un canal de Discord debe definir la pertenencia de forma dinámica. El comportamiento del grupo de acceso compartido se documenta aquí: [Grupos de acceso](/es/channels/access-groups).

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

    Un canal de texto de Discord no tiene una lista de miembros separada. `type: "discord.channelAudience"` modela la pertenencia como: el remitente del MD es miembro del gremio configurado y actualmente tiene permiso `ViewChannel` efectivo en el canal configurado después de que se aplican las anulaciones de rol y de canal.

    Ejemplo: permitir que cualquier persona que pueda ver `#maintainers` envíe MD al bot, manteniendo los MD cerrados para todos los demás.

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

    Puede mezclar entradas dinámicas y estáticas:

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    Las búsquedas fallan cerradas. Si Discord devuelve `Missing Access`, falla la búsqueda de miembros o el canal pertenece a un gremio diferente, el remitente del MD se trata como no autorizado.

    Habilite el **Server Members Intent** (Intención de miembros del servidor) del portal para desarrolladores de Discord para el bot cuando use grupos de acceso de audiencia de canal. Los MD no incluyen el estado de miembro del gremio, por lo que OpenClaw resuelve el miembro a través de Discord REST en el momento de la autorización.

  </Tab>

  <Tab title="Guild policy">
    El manejo del gremio está controlado por `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La base segura cuando `channels.discord` existe es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta el slug)
    - listas de permitidos de remitentes opcionales: `users` (se recomiendan IDs estables) y `roles` (solo IDs de roles); si se configura cualquiera de los dos, los remitentes están permitidos cuando coinciden con `users` OR `roles`
    - la coincidencia directa de nombre/etiqueta está desactivada por defecto; active `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia
    - se admiten nombres/etiquetas para `users`, pero los IDs son más seguros; `openclaw security audit` advierte cuando se usan entradas de nombre/etiqueta
    - si un gremio tiene `channels` configurado, se deniegan los canales no listados
    - si un gremio no tiene bloque `channels`, se permiten todos los canales en ese gremio permitido

    Ejemplo:

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    Si solo establece `DISCORD_BOT_TOKEN` y no crea un bloque `channels.discord`, el respaldo en tiempo de ejecución es `groupPolicy="allowlist"` (con una advertencia en los registros), incluso si `channels.defaults.groupPolicy` es `open`.

  </Tab>

  <Tab title="Menciones y mensajes directos de grupo">
    Los mensajes del gremio están restringidos por mención de forma predeterminada.

    La detección de menciones incluye:

    - mención explícita al bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    Al escribir mensajes salientes de Discord, use la sintaxis de mención canónica: `<@USER_ID>` para usuarios, `<#CHANNEL_ID>` para canales y `<@&ROLE_ID>` para roles. No use el formulario de mención de apodo heredado `<@!USER_ID>`.

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` opcionalmente descarta mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    Mensajes directos de grupo:

    - predeterminado: ignorado (`dm.groupEnabled=false`)
    - lista de permitidos opcional vía `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Use `bindings[].match.roles` para enrutar a los miembros del gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles aceptan solo IDs de rol y se evalúan después de los enlaces de pares o pares principales y antes de los enlaces solo de gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo, `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## Comandos nativos y autenticación de comandos

- `commands.native` por defecto es `"auto"` y está habilitado para Discord.
- Anulación por canal: `channels.discord.commands.native`.
- `commands.native=false` omite el registro y la limpieza de comandos de barra diagonal de Discord durante el inicio. Los comandos registrados previamente pueden permanecer visibles en Discord hasta que los elimine de la aplicación de Discord.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan visibles en la interfaz de usuario de Discord para los usuarios que no estén autorizados; la ejecución aún impone la autenticación de OpenClaw y devuelve "no autorizado".

Vea [Slash commands](/es/tools/slash-commands) para el catálogo y comportamiento de comandos.

Configuración predeterminada de comandos de barra:

- `ephemeral: true`

## Detalles de la función

<AccordionGroup>
  <Accordion title="Etiquetas de respuesta y respuestas nativas">
    Discord admite etiquetas de respuesta en la salida del agente:

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Controlado por `channels.discord.replyToMode`:

    - `off` (predeterminado)
    - `first`
    - `all`
    - `batched`

    Nota: `off` deshabilita el hilado de respuesta implícito. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.
    `first` siempre adjunta la referencia de respuesta nativa implícita al primer mensaje saliente de Discord para el turno.
    `batched` solo adjunta la referencia de respuesta nativa implícita de Discord cuando el
    evento entrante fue un lote con rebote de múltiples mensajes. Esto es útil
    cuando desea respuestas nativas principalmente para chats ambiguos y rápidos, no para cada
    turno de mensaje único.

    Los IDs de mensaje se muestran en el contexto/historial para que los agentes puedan apuntar a mensajes específicos.

  </Accordion>

  <Accordion title="Vistas previas de enlaces">
    Discord genera embeds de enlaces enriquecidos para las URLs de forma predeterminada. OpenClaw suprime esos embeds generados en los mensajes salientes de Discord de forma predeterminada, por lo que las URL enviadas por el agente se mantienen como enlaces simples a menos que opte por participar:

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Establezca `channels.discord.accounts.<id>.suppressEmbeds` para anular una cuenta. Los envíos de herramienta de mensaje del agente también pueden pasar `suppressEmbeds: false` para un solo mensaje. Las cargas útiles explícitas de `embeds` de Discord no se suprimen con la configuración de vista previa de enlace predeterminada.

  </Accordion>

  <Accordion title="Vista previa de transmisión en vivo">
    OpenClaw puede transmitir borradores de respuesta enviando un mensaje temporal y editándolo a medida que llega el texto. `channels.discord.streaming` acepta `off` | `partial` | `block` | `progress` (predeterminado). `progress` mantiene un borrador de estado editable y lo actualiza con el progreso de la herramienta hasta la entrega final; la etiqueta inicial compartida es una línea continua, por lo que se desplaza como el resto una vez que aparece suficiente trabajo. `streamMode` es un alias de tiempo de ejecución heredado. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida a la clave canónica.

    Establezca `channels.discord.streaming.mode` en `off` para desactivar las ediciones de vista previa de Discord. Si la transmisión por bloques de Discord está explícitamente habilitada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
          commentary: false,
        },
      },
    },
  },
}
```

    - `partial` edita un único mensaje de vista previa a medida que llegan los tokens.
    - `block` emite fragmentos de tamaño de borrador (use `draftChunk` para ajustar el tamaño y los puntos de ruptura, limitado a `textChunkLimit`).
    - Los finales de medios, errores y respuestas explícitas cancelan las ediciones de vista previa pendientes.
    - `streaming.preview.toolProgress` (predeterminado `true`) controla si las actualizaciones de herramienta/progreso reutilizan el mensaje de vista previa.
    - Las filas de herramienta/progreso se muestran como emoji compacto + título + detalle cuando están disponibles, por ejemplo `🛠️ Bash: run tests` o `🔎 Web Search: for "query"`.
    - `streaming.progress.commentary` (predeterminado `false`) activa el texto de comentario/prefacio del asistente en el borrador de progreso temporal. El comentario se limpia antes de mostrarse, permanece transitorio y no cambia la entrega de la respuesta final.
    - `streaming.progress.maxLineChars` controla el presupuesto de vista previa de progreso por línea. La prosa se acorta en los límites de las palabras; los detalles de comandos y rutas mantienen sufijos útiles.
    - `streaming.preview.commandText` / `streaming.progress.commandText` controla el detalle de comando/ejecución en líneas de progreso compactas: `raw` (predeterminado) o `status` (solo etiqueta de herramienta).

    Ocultar el texto sin procesar de comando/ejecución manteniendo líneas de progreso compactas:

    ```json
    {
      "channels": {
        "discord": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    La transmisión de vista previa es solo de texto; las respuestas de medios vuelven a la entrega normal. Cuando la transmisión `block` está explícitamente habilitada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

  </Accordion>

  <Accordion title="Historial, contexto y comportamiento de los hilos">
    Contexto del historial del gremio:

    - `channels.discord.historyLimit` predeterminado `20`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` deshabilita

    Controles del historial de MD:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportamiento de los hilos:

    - Los hilos de Discord se enrutan como sesiones de canal y heredan la configuración del canal principal a menos que se anule.
    - Las sesiones de hilo heredan la selección `/model` a nivel de sesión del canal principal como alternativa solo para el modelo; las selecciones `/model` locales del hilo todavía tienen prioridad y el historial de transcripciones del padre no se copia a menos que se habilite la herencia de transcripciones.
    - `channels.discord.thread.inheritParent` (predeterminado `false`) opta por que los nuevos hilos automáticos se inicialicen desde la transcripción principal. Las anulaciones por cuenta se encuentran en `channels.discord.accounts.<id>.thread.inheritParent`.
    - Las reacciones de herramientas de mensaje pueden resolver objetivos de MD `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` se conserva durante la activación por alternativa en la etapa de respuesta.

    Los temas del canal se inyectan como contexto **no confiable**. Las listas de permitidos controlan quién puede activar el agente, no un límite completo de redacción de contexto suplementario.

  </Accordion>

  <Accordion title="Sesiones vinculadas a hilos para subagentes">
    Discord puede vincular un hilo a un objetivo de sesión para que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagente).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un objetivo de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la auto-desactivación por inactividad para vinculaciones enfocadas
    - `/session max-age <duration|off>` inspeccionar/actualizar la antigüedad máxima fija para vinculaciones enfocadas

    Configuración:

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    Notas:

    - `session.threadBindings.*` establece los valores predeterminados globales.
    - `channels.discord.threadBindings.*` anula el comportamiento de Discord.
    - `spawnSessions` controla la creación/automática de hilos para `sessions_spawn({ thread: true })` y las apariciones de hilos de ACP. Predeterminado: `true`.
    - `defaultSpawnContext` controla el contexto nativo del subagente para las apariciones vinculadas a hilos. Predeterminado: `"fork"`.
    - Las claves obsoletas `spawnSubagentSessions`/`spawnAcpSessions` son migradas por `openclaw doctor --fix`.
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas de vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/es/tools/subagents), [Agentes ACP](/es/tools/acp-agents) y [Referencia de configuración](/es/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Enlaces persistentes de canales ACP">
    Para espacios de trabajo ACP estables "siempre activos", configure enlaces ACP tipados de nivel superior que apunten a conversaciones de Discord.

    Ruta de configuración:

    - `bindings[]` con `type: "acp"` y `match.channel: "discord"`

    Ejemplo:

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    Notas:

    - `/acp spawn codex --bind here` vincula el canal o hilo actual en su lugar y mantiene los mensajes futuros en la misma sesión de ACP. Los mensajes de los hilos heredan el enlace del canal principal.
    - En un canal o hilo vinculado, `/new` y `/reset` restablecen la misma sesión de ACP en su lugar. Los enlaces temporales de hilos pueden anular la resolución del objetivo mientras estén activos.
    - `spawnSessions` restringe la creación/vinculación de hilos secundarios mediante `--thread auto|here`.

    Consulte [ACP Agents](/es/tools/acp-agents) para obtener detalles sobre el comportamiento de los enlaces.

  </Accordion>

  <Accordion title="Notificaciones de reacción">
    Modo de notificación de reacción por servidor:

    - `off`
    - `own` (predeterminado)
    - `all`
    - `allowlist` (usa `guilds.<id>.users`)

    Los eventos de reacción se convierten en eventos del sistema y se adjuntan a la sesión de Discord enrutada.

  </Accordion>

  <Accordion title="Reacciones de acuse">
    `ackReaction` envía un emoji de acuse mientras OpenClaw procesa un mensaje entrante.

    Orden de resolución:

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - emoji de identidad del agente alternativo (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Discord acepta emoji unicode o nombres de emoji personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes">
    Las escrituras de configuración iniciadas por el canal están habilitadas por defecto.

    Esto afecta los flujos de `/config set|unset` (cuando las características de comandos están habilitadas).

    Para deshabilitar:

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway proxy">
    Enruta el tráfico WebSocket de la puerta de enlace de Discord y las búsquedas REST de inicio (ID de aplicación + resolución de lista de permitidos) a través de un proxy HTTP(S) con `channels.discord.proxy`.

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    Anulación por cuenta:

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit support">
    Habilite la resolución de PluralKit para mapear los mensajes con proxy a la identidad del miembro del sistema:

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    Notas:

    - las listas de permitidos pueden usar `pk:<memberId>`
    - los nombres para mostrar de los miembros se coinciden por nombre/solo cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están restringidas por ventana de tiempo
    - si la búsqueda falla, los mensajes con proxy se tratan como mensajes de bot y se descartan a menos que `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    Use `mentionAliases` cuando los agentes necesiten menciones de salida deterministas para usuarios de Discord conocidos. Las claves son identificadores sin el `@` inicial; los valores son IDs de usuario de Discord. Los identificadores desconocidos, `@everyone`, `@here`, y las menciones dentro de intervalos de código Markdown se dejan sin cambios.

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Presence configuration">
    Las actualizaciones de presencia se aplican cuando estableces un campo de estado o actividad, o cuando habilitas la presencia automática.

    Ejemplo de solo estado:

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Ejemplo de actividad (el estado personalizado es el tipo de actividad predeterminado):

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Ejemplo de transmisión:

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    Mapa de tipos de actividad:

    - 0: Jugando
    - 1: Transmitiendo (requiere `activityUrl`)
    - 2: Escuchando
    - 3: Viendo
    - 4: Personalizado (usa el texto de la actividad como el estado del estado; el emoji es opcional)
    - 5: Compitiendo

    Ejemplo de presencia automática (señal de estado de salud en tiempo de ejecución):

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    La presencia automática asigna la disponibilidad en tiempo de ejecución al estado de Discord: saludable => en línea, degradado o desconocido => inactivo, agotado o no disponible => no molestar. Opciones de anulación de texto:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (admite el marcador de posición `{reason}`)

  </Accordion>

  <Accordion title="Aprobaciones en Discord">
    Discord admite el manejo de aprobaciones basado en botones en mensajes directos y opcionalmente puede publicar solicitudes de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (opcional; recurre a `commands.ownerAllowFrom` cuando sea posible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está configurado o es `"auto"` y se puede resolver al menos un aprobador, ya sea desde `execApprovals.approvers` o desde `commands.ownerAllowFrom`. Discord no infiere aprobadores de ejecución desde el `allowFrom` del canal, el `dm.allowFrom` heredado, o el `defaultTo` de mensaje directo. Configure `enabled: false` para deshabilitar Discord explícitamente como cliente de aprobación nativo.

    Para comandos de grupo sensibles solo para el propietario, como `/diagnostics` y `/export-trajectory`, OpenClaw envía solicitudes de aprobación y resultados finales de forma privada. Primero intenta el mensaje directo de Discord cuando el propietario que invoca tiene una ruta de propietario de Discord; si eso no está disponible, recurre a la primera ruta de propietario disponible desde `commands.ownerAllowFrom`, como Telegram.

    Cuando `target` es `channel` o `both`, la solicitud de aprobación es visible en el canal. Solo los aprobadores resueltos pueden usar los botones; otros usuarios reciben una denegación efímera. Las solicitudes de aprobación incluyen el texto del comando, por lo que debe habilitar la entrega en el canal solo en canales de confianza. Si no se puede derivar el ID del canal desde la clave de sesión, OpenClaw recurre a la entrega por mensaje directo.

    Discord también renderiza los botones de aprobación compartidos utilizados por otros canales de chat. El adaptador nativo de Discord principalmente agrega el enrutamiento por mensaje directo del aprobador y la difusión en el canal.
    Cuando esos botones están presentes, son la experiencia de usuario de aprobación principal; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indica
    que las aprobaciones por chat no están disponibles o la aprobación manual es la única opción.
    Si el tiempo de ejecución de aprobación nativo de Discord no está activo, OpenClaw mantiene visible
    el mensaje determinista local `/approve <id> <decision>`. Si el
    tiempo de ejecución está activo pero no se puede entregar una tarjeta nativa a ningún objetivo,
    OpenClaw envía un aviso de reserva en el mismo chat con el comando `/approve` exacto
    de la aprobación pendiente.

    La autenticación de Gateway y la resolución de aprobaciones siguen el contrato compartido del cliente de Gateway (los IDs de `plugin:` se resuelven a través de `plugin.approval.resolve`; otros IDs a través de `exec.approval.resolve`). Las aprobaciones caducan después de 30 minutos por defecto.

    Véase [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Herramientas y compuertas de acción

Las acciones de mensajes de Discord incluyen mensajería, administración de canales, moderación, presencia y acciones de metadatos.

Ejemplos principales:

- mensajería: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reacciones: `react`, `reactions`, `emojiList`
- moderación: `timeout`, `kick`, `ban`
- presencia: `setPresence`

La acción `event-create` acepta un parámetro opcional `image` (URL o ruta de archivo local) para establecer la imagen de portada del evento programado.

Las compuertas de acción residen bajo `channels.discord.actions.*`.

Comportamiento de la compuerta predeterminada:

| Grupo de acciones                                                                                                                                                                | Predeterminado |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| reacciones, mensajes, hilos, fijaciones, encuestas, búsqueda, memberInfo, roleInfo, channelInfo, canales, voiceStatus, eventos, stickers, emojiUploads, stickerUploads, permisos | habilitado     |
| roles                                                                                                                                                                            | deshabilitado  |
| moderación                                                                                                                                                                       | deshabilitado  |
| presencia                                                                                                                                                                        | deshabilitado  |

## Interfaz de usuario de Components v2

OpenClaw utiliza los componentes v2 de Discord para las aprobaciones de ejecución y los marcadores de contexto cruzado. Las acciones de mensajes de Discord también pueden aceptar `components` para una interfaz de usuario personalizada (avanzado; requiere construir una carga útil de componente a través de la herramienta de discord), mientras que los `embeds` heredados siguen disponibles pero no se recomiendan.

- `channels.discord.ui.components.accentColor` establece el color de acento utilizado por los contenedores de componentes de Discord (hex).
- Establézcalo por cuenta con `channels.discord.accounts.<id>.ui.components.accentColor`.
- `channels.discord.agentComponents.ttlMs` controla cuánto tiempo permanecen registradas las devoluciones de llamada de componentes de Discord enviadas (por defecto `1800000`, máximo `86400000`). Establézcalo por cuenta con `channels.discord.accounts.<id>.agentComponents.ttlMs`.
- Se ignoran los `embeds` cuando están presentes los componentes v2.
- Las vistas previas de URL simples se suprimen de forma predeterminada. Establezca `suppressEmbeds: false` en una acción de mensaje cuando un único enlace saliente debe expandirse.

Ejemplo:

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## Voz

Discord tiene dos superficies de voz distintas: **canales de voz** en tiempo real (conversaciones continuas) y **archivos adjuntos de mensajes de voz** (el formato de vista previa de forma de onda). La puerta de enlace admite ambas.

### Canales de voz

Lista de verificación de configuración:

1. Habilite el Intents de contenido de mensajes (Message Content Intent) en el portal para desarrolladores de Discord.
2. Habilite el Intents de miembros del servidor (Server Members Intent) cuando se usen listas de permitidos (allowlists) de roles/usuarios.
3. Invite al bot con los alcances `bot` y `applications.commands`.
4. Conceda Connect, Speak, Send Messages y Read Message History en el canal de voz de destino.
5. Habilite los comandos nativos (`commands.native` o `channels.discord.commands.native`).
6. Configure `channels.discord.voice`.

Use `/vc join|leave|status` para controlar las sesiones. El comando usa el agente predeterminado de la cuenta y sigue las mismas reglas de listas de permitidos y políticas de grupo que otros comandos de Discord.

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

Para inspeccionar los permisos efectivos del bot antes de unirse, ejecute:

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

Ejemplo de unión automática:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

Notas:

- `voice.tts` anula `messages.tts` solo para la reproducción de voz de `stt-tts`. Los modos en tiempo real usan `voice.realtime.speakerVoice`.
- `voice.mode` controla la ruta de la conversación. El valor predeterminado es `agent-proxy`: un front-end de voz en tiempo real maneja el tiempo de turno, la interrupción y la reproducción, delega el trabajo sustancial al agente OpenClaw enrutado a través de `openclaw_agent_consult` y trata el resultado como un mensaje de Discord escrito de ese hablante. `stt-tts` mantiene el flujo anterior de STT por lotes más TTS. `bidi` permite que el modelo en tiempo real converse directamente mientras expone `openclaw_agent_consult` para el cerebro de OpenClaw.
- `voice.agentSession` controla qué conversación de OpenClaw recibe los turnos de voz. Déjelo sin establecer para la propia sesión del canal de voz, o establezca `{ mode: "target", target: "channel:<text-channel-id>" }` para hacer que el canal de voz actúe como la extensión de micrófono/altavoz de una sesión de canal de texto de Discord existente, como `#maintainers`.
- `voice.model` anula el cerebro del agente OpenClaw para las respuestas de voz de Discord y consultas en tiempo real. Déjelo sin establecer para heredar el modelo de agente enrutado. Es independiente de `voice.realtime.model`.
- `voice.followUsers` permite que el bot se una, mueva y salga de la voz de Discord con usuarios seleccionados. Consulte [Follow users in voice](#follow-users-in-voice) para ver las reglas de comportamiento y los ejemplos.
- `agent-proxy` enruta el habla a través de `discord-voice`, lo que preserva la autorización normal de propietario/herramienta para el hablante y la sesión de destino, pero oculta la herramienta `tts` del agente porque la voz de Discord es propietaria de la reproducción. De forma predeterminada, `agent-proxy` otorga a la consulta acceso total a herramientas equivalentes al propietario para los hablantes propietarios (`voice.realtime.toolPolicy: "owner"`) y prefiere encarecidamente consultar al agente OpenClaw antes de las respuestas sustantivas (`voice.realtime.consultPolicy: "always"`). En ese modo `always` predeterminado, la capa en tiempo real no habla automáticamente el relleno antes de la respuesta de la consulta; captura y transcribe el habla, y luego pronuncia la respuesta enrutada de OpenClaw. Si terminan varias respuestas de consultas forzadas mientras Discord sigue reproduciendo la primera respuesta, las respuestas posteriores de voz exacta se ponen en cola hasta que la reproducción se detenga en lugar de reemplazar el habla a mitad de una oración.
- En el modo `stt-tts`, STT utiliza `tools.media.audio`; `voice.model` no afecta la transcripción.
- En modos en tiempo real, `voice.realtime.provider`, `voice.realtime.model` y `voice.realtime.speakerVoice` configuran la sesión de audio en tiempo real. Para OpenAI Realtime 2 más el cerebro Codex, use `voice.realtime.model: "gpt-realtime-2"` y `voice.model: "openai-codex/gpt-5.5"`.
- Los modos de voz en tiempo real incluyen archivos de perfil pequeños de `IDENTITY.md`, `USER.md` y `SOUL.md` en las instrucciones del proveedor en tiempo real de forma predeterminada, para que los turnos directos rápidos mantengan la misma identidad, referencia del usuario y persona que el agente OpenClau enrutado. Establezca `voice.realtime.bootstrapContextFiles` en un subconjunto para personalizar esto, o `[]` para desactivarlo. Los archivos de arranque en tiempo real compatibles se limitan a esos archivos de perfil; `AGENTS.md` permanece en el contexto normal del agente. El contexto del perfil inyectado no reemplaza `openclaw_agent_consult` para el trabajo del espacio de trabajo, datos actuales, búsqueda de memoria o acciones respaldadas por herramientas.
- En el modo en tiempo real de OpenAI `agent-proxy`, configure `voice.realtime.requireWakeName: true` para mantener la voz en tiempo real de Discord en silencio hasta que una transcripción comience o termine con un nombre de activación. Los nombres de activación configurados deben ser de una o dos palabras. Si `voice.realtime.wakeNames` no está configurado, OpenClaw usa el agente enrutado `name` más `OpenClaw`, recurriendo al id del agente más `OpenClaw`. El control por nombre de activación deshabilita la respuesta automática del proveedor en tiempo real, enruta los turnos aceptados a través de la ruta de consulta del agente OpenClaw y da un breve reconocimiento hablado cuando se reconoce un nombre de activación principal a partir de una transcripción parcial antes de que llegue la transcripción final.
- El proveedor en tiempo real de OpenAI acepta los nombres de eventos actuales de Realtime 2 y los alias compatibles con Codex heredados para eventos de audio y transcripción de salida, por lo que las instantáneas del proveedor compatibles pueden desviarse sin perder el audio del asistente.
- `voice.realtime.bargeIn` controla si los eventos de inicio de hablante de Discord interrumpen la reproducción en tiempo real activa. Si no está configurado, sigue la configuración de interrupción de audio de entrada del proveedor en tiempo real.
- `voice.realtime.minBargeInAudioEndMs` controla la duración mínima de reproducción del asistente antes de que una interrupción en tiempo real de OpenAI trunque el audio. Predeterminado: `250`. Establezca `0` para una interrupción inmediata en habitaciones con poco eco, o aumente el valor para configuraciones de altavoces con mucho eco.
- Para una reproducción de voz de OpenAI en Discord, configure `voice.tts.provider: "openai"` y elija una voz de conversión de texto a voz en `voice.tts.providers.openai.speakerVoice`. `cedar` es una buena opción con sonido masculino en el modelo TTS actual de OpenAI.
- Las anulaciones de `systemPrompt` de Discord por canal se aplican a los turnos de transcripción de voz de ese canal de voz.
- Los turnos de transcripción de voz derivan el estado de propietario de `allowFrom` (o `dm.allowFrom`) de Discord para comandos y acciones de canal con control de propietario. La visibilidad de herramientas del agente sigue la política de herramientas configurada para la sesión enrutada.
- El uso de voz en Discord es opcional para las configuraciones de solo texto; establezca `channels.discord.voice.enabled=true` (o mantenga un bloque `channels.discord.voice` existente) para habilitar los comandos `/vc`, el tiempo de ejecución de voz y la intención de puerta de enlace `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` puede anular explícitamente la suscripción a la intención de estado de voz. Déjelo sin establecer para que la intención siga la habilitación efectiva de voz.
- Si `voice.autoJoin` tiene múltiples entradas para el mismo gremio, OpenClaw se une al último canal configurado para ese gremio.
- `voice.allowedChannels` es una lista blanca de residencia opcional. Déjelo sin establecer para permitir `/vc join` en cualquier canal de voz de Discord autorizado. Cuando se establece, `/vc join`, la unión automática al inicio y los movimientos de estado de voz del bot se restringen a las entradas `{ guildId, channelId }` listadas. Establézcalo en una matriz vacía para denegar todas las uniones de voz de Discord. Si Discord mueve el bot fuera de la lista blanca, OpenClaw sale de ese canal y se vuelve a unir al objetivo de unión automática configurado cuando hay uno disponible.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión `@discordjs/voice`.
- Los valores predeterminados `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no se establecen.
- OpenClaw utiliza el códec `libopus-wasm` incluido para la recepción de voz de Discord y la reproducción raw PCM en tiempo real. Incluye una compilación WebAssembly libopus anclada y no requiere complementos opus nativos.
- `voice.connectTimeoutMs` controla la espera inicial `@discordjs/voice` Ready para `/vc join` y los intentos de unión automática. Predeterminado: `30000`.
- `voice.reconnectGraceMs` controla cuánto tiempo espera OpenClaw a que una sesión de voz desconectada comience a reconectarse antes de destruirla. Predeterminado: `15000`.
- En el modo `stt-tts`, la reproducción de voz no se detiene solo porque otro usuario empieza a hablar. Para evitar bucles de retroalimentación, OpenClaw ignora la nueva captura de voz mientras se reproduce el TTS; hable después de que finalice la reproducción para el siguiente turno. Los modos en tiempo real envían los inicios de habla del altavoz como señales de interrupción (barge-in) al proveedor en tiempo real.
- En los modos en tiempo real, el eco de los altavoces hacia un micrófono abierto puede parecer una interrupción e interrumpir la reproducción. Para salas de Discord con mucho eco, establezca `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` para evitar que OpenAI se interrumpa automáticamente con el audio de entrada. Añada `voice.realtime.bargeIn: true` si aún desea que los eventos de inicio de habla de Discord interrumpan la reproducción activa. El puente en tiempo real de OpenAI ignora los truncamientos de reproducción más cortos que `voice.realtime.minBargeInAudioEndMs` como probable eco/ruido y los registra como omitidos en lugar de borrar la reproducción de Discord.
- `voice.captureSilenceGraceMs` controla cuánto tiempo espera OpenClaw después de que Discord informa que un altavoz ha dejado de hablar antes de finalizar ese segmento de audio para el STT. Predeterminado: `2000`; aumente esto si Discord divide las pausas normales en transcripciones parciales entrecortadas.
- Cuando ElevenLabs es el proveedor de TTS seleccionado, la reproducción de voz de Discord utiliza TTS continuo (streaming) y comienza desde el flujo de respuesta del proveedor. Los proveedores sin soporte de streaming vuelven a la ruta del archivo temporal sintetizado.
- OpenClaw también monitorea los fallos de desencriptación de recepción y se recupera automáticamente saliendo/volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` después de actualizar, recopile un informe de dependencias y registros. La línea `@discordjs/voice` incluida incluye la solución de relleno (padding) de upstream del PR #11449 de discord.js, que cerró el issue #11419 de discord.js.
- Se esperan eventos de recepción `The operation was aborted` cuando OpenClaw finaliza un segmento de altavoz capturado; son diagnósticos detallados, no advertencias.
- Los registros detallados de voz de Discord incluyen una vista previa delimitada de una línea de la transcripción STT para cada segmento de hablante aceptado, por lo que la depuración muestra tanto el lado del usuario como la respuesta del agente sin volcar texto de transcripción ilimitado.
- En el modo `agent-proxy`, la alternativa de consulta forzada omite fragmentos de transcripción probablemente incompletos, como texto que termina en `...` o un conector final como `and`, además de cierres obviamente no accionables como "vuelvo enseguida" o "adiós". Los registros muestran `forced agent consult skipped reason=...` cuando esto evita una respuesta en cola obsoleta.

### Seguir a usuarios en voz

Use `voice.followUsers` cuando desee que el bot de voz de Discord se quede con uno o más usuarios de Discord conocidos en lugar de unirse a un canal fijo al iniciar o esperar `/vc join`.

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

Comportamiento:

- `followUsers` acepta IDs de usuario de Discord sin formato y valores de `discord:<id>`. OpenClaw normaliza ambas formas antes de hacer coincidir los eventos de estado de voz.
- `followUsersEnabled` es `true` de forma predeterminada cuando `followUsers` está configurado. Establézcalo en `false` para mantener la lista guardada pero detener el seguimiento automático de voz.
- Cuando un usuario seguido se une a un canal de voz permitido, OpenClaw se une a ese canal. Cuando el usuario se mueve, OpenClaw se mueve con él. Cuando el usuario seguido activo se desconecta, OpenClaw se va.
- Si hay varios usuarios seguidos en el mismo gremio y el usuario seguido activo se va, OpenClaw se mueve al canal de otro usuario seguido rastreado antes de abandonar el gremio. Si varios usuarios seguidos se mueven a la vez, gana el último evento de estado de voz observado.
- `allowedChannels` todavía se aplica. Un usuario seguido en un canal no permitido se ignora, y una sesión propiedad de seguimiento se mueve a otro usuario seguido o se va.
- OpenClaw reconcilia los eventos de estado de voz perdidos al inicio y en un intervalo limitado. La reconciliación muestrea los gremios configurados y limita las búsquedas REST por ejecución, por lo que las listas muy grandes de `followUsers` pueden tardar más de un intervalo en converger.
- Si Discord o un administrador mueven el bot mientras está siguiendo a un usuario, OpenClaw reconstruye la sesión de voz y conserva la propiedad de seguimiento cuando el destino está permitido. Si el bot se mueve fuera de `allowedChannels`, OpenClaw sale y se une al objetivo configurado cuando existe uno.
- La recuperación de recepción de DAVE puede salir y volver a unirse al mismo canal después de fallos de descifrado repetidos. Las sesiones propiedad de seguimiento mantienen su propiedad de seguimiento a través de esa ruta de recuperación, por lo que una desconexión posterior del usuario seguido todavía deja el canal.

Elija entre los modos de unión:

- Use `followUsers` para configuraciones personales o de operador donde el bot debería estar automáticamente en voz cuando usted lo está.
- Use `autoJoin` para bots de sala fija que deberían estar presentes incluso cuando ningún usuario rastreado está en voz.
- Use `/vc join` para uniones únicas o salas donde la presencia automática de voz sería sorprendente.

Códec de voz de Discord:

- Los registros de recepción de voz muestran `discord voice: opus decoder: libopus-wasm`.
- La reproducción en tiempo real codifica PCM estéreo crudo de 48 kHz a Opus con el mismo paquete `libopus-wasm` incluido antes de entregar los paquetes a `@discordjs/voice`.
- La reproducción de archivos y flujos de proveedores transcodifica a PCM estéreo crudo de 48 kHz con ffmpeg, luego usa `libopus-wasm` para el flujo de paquetes Opus enviado a Discord.

Canalización STT más TTS:

- La captura de PCM de Discord se convierte en un archivo temporal WAV.
- `tools.media.audio` maneja STT, por ejemplo `openai/gpt-4o-mini-transcribe`.
- La transcripción se envía a través del ingreso y enrutamiento de Discord mientras el LLM de respuesta se ejecuta con una política de salida de voz que oculta la herramienta de `tts` del agente y pide texto devuelto, porque la voz de Discord posee la reproducción final de TTS.
- `voice.model`, si se establece, anula solo el LLM de respuesta para este turno de canal de voz.
- `voice.tts` se fusiona sobre `messages.tts`; los proveedores con capacidad de streaming alimentan al reproductor directamente; de lo contrario, el archivo de audio resultante se reproduce en el canal unido.

Ejemplo de sesión de canal de voz de proxy de agente predeterminado:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

Sin un bloque `voice.agentSession`, cada canal de voz obtiene su propia sesión OpenClaw enrutada. Por ejemplo, `/vc join channel:234567890123456789` habla con la sesión de ese canal de voz de Discord. El modelo en tiempo real es solo el front-end de voz; las solicitudes sustantivas se pasan al agente OpenClaw configurado. Si el modelo en tiempo real produce una transcripción final sin llamar a la herramienta de consulta, OpenClaw fuerza la consulta como respaldo para que el comportamiento predeterminado siga siendo como hablar con el agente.

Ejemplo de STT heredado más TTS:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
          },
        },
      },
    },
  },
}
```

Ejemplo bidi en tiempo real:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

Voz como una extensión de una sesión de canal de Discord existente:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai-codex/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

En el modo `agent-proxy`, el bot se une al canal de voz configurado, pero los turnos del agente OpenClaw usan la sesión y el agente enrutados normales del canal objetivo. La sesión de voz en tiempo real devuelve el resultado hablado de nuevo al canal de voz. El agente supervisor aún puede usar herramientas de mensaje normales según su política de herramientas, incluyendo enviar un mensaje separado de Discord si esa es la acción correcta.

Mientras una ejecución delegada de OpenClaw está activa, las nuevas transcripciones de voz de Discord se tratan como control de ejecución en vivo antes de comenzar otro turno de agente. Frases como "estado", "cancelar eso", "usar la solución más pequeña" o "cuando termines también verifica las pruebas" se clasifican como entrada de estado, cancelación, dirección o seguimiento para la sesión activa. Los resultados de estado, cancelación, dirección aceptada y seguimiento se devuelven hablados al canal de voz para que la persona que llama sepa si OpenClaw manejó la solicitud.

Formas de destino útiles:

- `target: "channel:123456789012345678"` se enruta a través de una sesión de canal de texto de Discord.
- `target: "123456789012345678"` se trata como un objetivo de canal.
- `target: "dm:123456789012345678"` o `target: "user:123456789012345678"` se enruta a través de esa sesión de mensaje directo.

Ejemplo de OpenAI Realtime con mucho eco:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

Use esto cuando el modelo escuche su propia reproducción de Discord a través de un micrófono abierto, pero aún desee interrumpirlo hablando. OpenClaw evita que OpenAI se auto-interrumpa con el audio de entrada sin procesar, mientras que `bargeIn: true` permite que los eventos de inicio de altavoz de Discord y el audio de altavoz ya activo cancelen las respuestas en tiempo real activas antes de que el siguiente turno capturado llegue a OpenAI. Las señales de interrupción muy tempranas con `audioEndMs` por debajo de `minBargeInAudioEndMs` se tratan como probable eco/ruido y se ignoran para que el modelo no se corte en el primer cuadro de reproducción.

Registros de voz esperados:

- Al unirse: `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Al iniciar en tiempo real: `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- En el audio del altavoz: `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` y `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Al omitir voz obsoleta: `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` o `reason=non-actionable-closing ...`
- Al completar la respuesta en tiempo real: `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Al detener/restablecer la reproducción: `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- Al consultar en tiempo real: `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Al responder el agente: `discord voice: agent turn answer ...`
- Al poner en cola voz exacta: `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, seguido de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- Al detectar interrupción: `discord voice: realtime barge-in detected source=speaker-start ...` o `discord voice: realtime barge-in detected source=active-speaker-audio ...`, seguido de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- Al interrumpir en tiempo real: `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, seguido de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` o `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- Al ignorar eco/ruido: `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Al desactivar la interrupción: `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- Al reproducir inactivo: `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Para depurar el audio cortado, lea los registros de voz en tiempo real como una línea de tiempo:

1. `realtime audio playback started` significa que Discord ha comenzado a reproducir el audio del asistente. El puente comienza a contar los fragmentos de salida del asistente, los bytes PCM de Discord, los bytes en tiempo real del proveedor y la duración del audio sintetizado desde este punto.
2. `realtime speaker turn opened` marca que un altavoz de Discord se ha activado. Si la reproducción ya está activa y `bargeIn` está habilitado, esto puede ir seguido de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marca el primer frame de audio real recibido para ese turno de habla. `outputActive=true` o un `outputAudioMs` distinto de cero aquí significa que el micrófono está enviando entrada mientras la reproducción del asistente todavía está activa.
4. `barge-in detected source=active-speaker-audio` significa que OpenClaw vio audio del altavoz en vivo mientras la reproducción del asistente estaba activa. Esto es útil para distinguir una interrupción real de un evento de inicio de altavoz de Discord sin audio útil.
5. `barge-in requested reason=...` significa que OpenClaw pidió al proveedor en tiempo real que cancelara o truncara la respuesta activa. Incluye `outputAudioMs`, `outputActive` y `playbackChunks` para que pueda ver cuánto audio del asistente se había reproducido realmente antes de la interrupción.
6. `realtime audio playback stopped reason=...` es el punto de restablecimiento local de la reproducción de Discord. La razón indica quién detuvo la reproducción: `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` o `session-close`.
7. `realtime speaker turn closed` resume el turno de entrada capturado. `chunks=0` o `hasAudio=false` significa que el turno del hablante se abrió pero ningún audio útil llegó al puente en tiempo real. `interruptedPlayback=true` significa que el turno de entrada se superpuso a la salida del asistente y activó la lógica de interrupción (barge-in).

Campos útiles:

- `outputAudioMs`: duración del audio del asistente generada por el proveedor en tiempo real antes de la línea de registro.
- `audioMs`: duración del audio del asistente que OpenClaw contó antes de que se detuviera la reproducción.
- `elapsedMs`: tiempo de reloj entre la apertura y el cierre del flujo de reproducción o el turno del hablante.
- `discordBytes`: bytes PCM estéreo de 48 kHz enviados a o recibidos de la voz de Discord.
- `realtimeBytes`: bytes PCM en formato de proveedor enviados a o recibidos del proveedor en tiempo real.
- `playbackChunks`: fragmentos de audio del asistente reenviados a Discord para la respuesta activa.
- `sinceLastAudioMs`: brecha entre el último cuadro de audio del hablante capturado y el cierre del turno del hablante.

Patrones comunes:

- Un corte inmediato con `source=active-speaker-audio`, un `outputAudioMs` pequeño y el mismo usuario cerca suele indicar que el eco del altavoz está entrando en el micrófono. Aumente `voice.realtime.minBargeInAudioEndMs`, baje el volumen del altavoz, use auriculares o configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` seguido de `speaker turn closed ... hasAudio=false` significa que Discord informó un inicio de hablante pero ningún audio llegó a OpenClaw. Eso puede ser un evento de voz de Discord transitorio, el comportamiento de la puerta de ruido o un cliente activando brevemente el micrófono.
- `audio playback stopped reason=stream-close` sin una interrupción cercana o `provider-clear-audio` significa que el flujo de reproducción local de Discord terminó inesperadamente. Verifique los registros precedentes del proveedor y del reproductor de Discord.
- `capture ignored during playback (barge-in disabled)` significa que OpenClaw descartó intencionalmente la entrada mientras el audio del asistente estaba activo. Habilite `voice.realtime.bargeIn` si desea que el habla interrumpa la reproducción.
- `barge-in ignored ... outputActive=false` significa que Discord o el proveedor VAD detectaron habla, pero OpenClaw no tenía una reproducción activa que interrumpir. Esto no debería cortar el audio.

Las credenciales se resuelven por componente: autenticación de ruta LLM para `voice.model`, autenticación STT para `tools.media.audio`, autenticación TTS para `messages.tts`/`voice.tts`, y autenticación del proveedor en tiempo real para `voice.realtime.providers` o la configuración de autenticación normal del proveedor.

### Mensajes de voz

Los mensajes de voz de Discord muestran una vista previa de la forma de onda y requieren audio OGG/Opus. OpenClaw genera la forma de onda automáticamente, pero necesita `ffmpeg` y `ffprobe` en el host de la puerta de enlace para inspeccionar y convertir.

- Proporcione una **ruta de archivo local** (se rechazan las URL).
- Omita el contenido de texto (Discord rechaza texto + mensaje de voz en la misma carga útil).
- Se acepta cualquier formato de audio; OpenClaw convierte a OGG/Opus según sea necesario.

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="Usó intentos no permitidos o el bot no ve mensajes del gremio">

    - habilite el Intento de Contenido de Mensajes (Message Content Intent)
    - habilite el Intento de Miembros del Servidor (Server Members Intent) cuando dependa de la resolución de usuario/miembro
    - reinicie la puerta de enlace después de cambiar los intentos

  </Accordion>

  <Accordion title="Mensajes del gremio bloqueados inesperadamente">

    - verifique `groupPolicy`
    - verifique la lista de permitidos del gremio bajo `channels.discord.guilds`
    - si existe el mapa `channels` del gremio, solo se permiten los canales listados
    - verifique el comportamiento `requireMention` y los patrones de mención

    Verificaciones útiles:

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Requerir mención falso pero aún bloqueado">
    Causas comunes:

    - `groupPolicy="allowlist"` sin una lista de permitidos de gremio/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o la entrada del canal)
    - remitente bloqueado por la lista de permitidos `users` del gremio/canal

  </Accordion>

  <Accordion title="Turnos de Discord de larga duración o respuestas duplicadas">

    Registros típicos:

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Controles de la cola de la puerta de enlace de Discord:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - multicuenta: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - esto solo controla el trabajo del oyente de la puerta de enlace de Discord, no la vida útil del turno del agente

    Discord no aplica un tiempo de espera propiedad del canal a los turnos del agente en cola. Los oyentes de mensajes transfieren el control inmediatamente y las ejecuciones de Discord en cola preservan el orden por sesión hasta que el ciclo de vida de la sesión/herramienta/ejecución completa o aborta el trabajo.

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Advertencias de tiempo de espera de búsqueda de metadatos de puerta de enlace">
    OpenClaw obtiene los metadatos de la puerta de enlace de `/gateway/bot` de Discord antes de conectarse. Las fallas transitorias vuelven a la URL de puerta de enlace predeterminada de Discord y tienen limitación de velocidad en los registros.

    Controles de tiempo de espera de metadatos:

    - cuenta única: `channels.discord.gatewayInfoTimeoutMs`
    - multicuenta: `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - respaldo de variable de entorno cuando la configuración no está establecida: `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - predeterminado: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Reinicios por tiempo de espera de READY de Gateway">
    OpenClaw espera el evento `READY` de la puerta de enlace de Discord durante el inicio y después de las reconexiones en tiempo de ejecución. Las configuraciones de múltiples cuentas con escalonamiento de inicio pueden necesitar una ventana de inicio READY más larga que la predeterminada.

    Controles de tiempo de espera READY:

    - inicio de cuenta única: `channels.discord.gatewayReadyTimeoutMs`
    - inicio de múltiples cuentas: `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - respaldo de env de inicio cuando la configuración no está establecida: `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - inicio predeterminado: `15000` (15 segundos), max: `120000`
    - tiempo de ejecución de cuenta única: `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - tiempo de ejecución de múltiples cuentas: `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - respaldo de env de tiempo de ejecución cuando la configuración no está establecida: `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - tiempo de ejecución predeterminado: `30000` (30 segundos), max: `120000`

  </Accordion>

  <Accordion title="Discrepancias en la auditoría de permisos">
    Las comprobaciones de permisos `channels status --probe` solo funcionan para IDs de canal numéricos.

    Si usa claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero la sonda no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD deshabilitado: `channels.discord.dm.enabled=false`
    - política de MD deshabilitada: `channels.discord.dmPolicy="disabled"` (legado: `channels.discord.dm.policy`)
    - esperando la aprobación de emparejamiento en modo `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    De forma predeterminada, se ignoran los mensajes creados por bots.

    Si establece `channels.discord.allowBots=true`, use reglas estrictas de mención y lista blanca para evitar el comportamiento de bucle.
    Prefiera `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bots que mencionan al bot.

    OpenClaw también incluye una [protección de bucle de bot compartida](/es/channels/bot-loop-protection). Cada vez que `allowBots` permite que los mensajes creados por bots lleguen al despacho, Discord asigna el evento entrante a `(account, channel, bot pair)` hechos y el guardia de pares genérico suprime el par después de que exceda el presupuesto de eventos configurado. El guardia evita bucles de dos bots descontrolados que anteriormente tenían que ser detenidos por los límites de velocidad de Discord; no afecta a las implementaciones de un solo bot ni a las respuestas de bots únicas que se mantienen por debajo del presupuesto.

    Configuración predeterminada (activa cuando se establece `allowBots`):

    - `maxEventsPerWindow: 20` -- el par de bots puede intercambiar 20 mensajes dentro de la ventana deslizante
    - `windowSeconds: 60` -- longitud de la ventana deslizante
    - `cooldownSeconds: 60` -- una vez que se agota el presupuesto, cada mensaje adicional de bot a bot en cualquier dirección se descarta durante un minuto

    Configure el valor predeterminado compartido una vez en `channels.defaults.botLoopProtection`, luego anule Discord cuando un flujo de trabajo legítimo necesite más espacio. La precedencia es:

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - valores predeterminados integrados

    Discord usa las claves genéricas `maxEventsPerWindow`, `windowSeconds` y `cooldownSeconds`.

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // Optional Discord-wide override. Account blocks override individual
      // fields and inherit omitted fields from here.
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write a Mantis Discord mention with the configured user id.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // Allow up to five messages per minute before suppressing the pair.
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - mantenga OpenClaw actualizado (`openclaw update`) para que la lógica de recuperación de recepción de voz de Discord esté presente
    - confirme `channels.discord.voice.daveEncryption=true` (predeterminado)
    - comience desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado de upstream) y ajuste solo si es necesario
    - observe los registros para:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si los fallos continúan después de la reincorporación automática, recopile los registros y compárelos con el historial de recepción de DAVE de upstream en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) y [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Referencia de configuración

Referencia principal: [Configuration reference - Discord](/es/gateway/config-channels#discord).

<Accordion title="Campos importantes de Discord">

- inicio de sesión/autorización: `enabled`, `token`, `accounts.*`, `allowBots`
- política: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- comando: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- cola de eventos: `eventQueue.listenerTimeout` (presupuesto de escucha), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- puerta de enlace: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- respuesta/historial: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- transmisión: `streaming` (alias heredado: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- medio/reintento: `mediaMaxMb` (limita las subidas a Discord, por defecto `100MB`), `retry`
- acciones: `actions.*`
- presencia: `activity`, `status`, `activityType`, `activityUrl`
- interfaz de usuario: `ui.components.accentColor`
- características: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## Seguridad y operaciones

- Trate los tokens de bot como secretos (`DISCORD_BOT_TOKEN` preferido en entornos supervisados).
- Conceda permisos de Discord con el privilegio mínimo.
- Si el despliegue/estado del comando está obsoleto, reinicie la puerta de enlace y vuelva a comprobar con `openclaw channels status --probe`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Discord con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento del chat grupal y la lista blanca.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutear mensajes entrantes a los agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Enrutamiento multiagente" icon="sitemap" href="/es/concepts/multi-agent">
    Mapear gremios y canales a agentes.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos.
  </Card>
</CardGroup>
