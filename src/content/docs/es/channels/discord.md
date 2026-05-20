---
summary: "Discord bot support status, capabilities, and configuration"
read_when:
  - Working on Discord channel features
title: "Discord"
---

Listo para mensajes directos y canales de gremio a través de la puerta de enlace oficial de Discord.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de Discord se configuran en modo de emparejamiento por defecto.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento nativo de comandos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Diagnósticos y flujo de reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Deberás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Crear el mío > Para mí y mis amigos**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal para desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **Nueva aplicación**. Ponle un nombre como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Nombre de usuario** a como llames a tu agente OpenClaw.

  </Step>

  <Step title="Activar intents privilegiados">
    Aún en la página **Bot**, desplázate hacia abajo hasta **Intents de la puerta de enlace privilegiados** y activa:

    - **Intent de contenido de mensaje** (requerido)
    - **Intent de miembros del servidor** (recomendado; requerido para listas de permitidos basadas en roles y coincidencia de nombre a ID)
    - **Intent de presencia** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copiar tu token de bot">
    Vuelve a desplazarte hacia arriba en la página **Bot** y haz clic en **Restablecer token**.

    <Note>
    A pesar del nombre, esto genera tu primer token — no se está "restableciendo" nada.
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Token de Bot** y lo necesitarás en breve.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos correctos para añadir el bot a tu servidor.

    Deslízate hacia abajo hasta **OAuth2 URL Generator** y habilita:

    - `bot`
    - `applications.commands`

    Aparecerá una sección de **Bot Permissions** a continuación. Habilita al menos:

    **General Permissions**
      - Ver canales
    **Text Permissions**
      - Enviar mensajes
      - Leer el historial de mensajes
      - Incrustar enlaces
      - Adjuntar archivos
      - Añadir reacciones (opcional)

    Este es el conjunto base para canales de texto normales. Si planeas publicar en hilos de Discord, incluidos los flujos de trabajo de canales de foro o medios que crean o continúan un hilo, también habilita **Send Messages in Threads**.
    Copia la URL generada en la parte inferior, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De vuelta en la aplicación de Discord, necesitas habilitar el Modo de Desarrollador para poder copiar los IDs internos.

    1. Haz clic en **User Settings** (icono de engranaje junto a tu avatar) → **Advanced** → activa **Developer Mode**
    2. Haz clic derecho en el **icono del servidor** en la barra lateral → **Copy Server ID**
    3. Haz clic derecho en **tu propio avatar** → **Copy User ID**

    Guarda tu **Server ID** y tu **User ID** junto con tu Bot Token — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Allow DMs from server members">
    Para que el emparejamiento funcione, Discord necesita permitir que tu bot te envíe mensajes directos. Haz clic derecho en el **icono del servidor** → **Privacy Settings** → activa **Direct Messages**.

    Esto permite que los miembros del servidor (incluidos los bots) te envíen mensajes directos. Mantén esto habilitado si deseas usar los mensajes directos de Discord con OpenClaw. Si solo planeas usar canales de gremio, puedes desactivar los mensajes directos después del emparejamiento.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    El token de tu bot de Discord es un secreto (como una contraseña). Establécelo en la máquina donde se ejecuta OpenClaw antes de enviar un mensaje a tu agente.

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

    Si OpenClaw ya se está ejecutando como un servicio en segundo plano, reinícialo a través de la aplicación de Mac de OpenClaw o deteniendo y reiniciando el proceso `openclaw gateway run`.
    Para instalaciones de servicio administrado, ejecuta `openclaw gateway install` desde un shell donde esté presente `DISCORD_BOT_TOKEN`, o almacena la variable en `~/.openclaw/.env`, para que el servicio pueda resolver el SecretRef del entorno después del reinicio.
    Si tu host está bloqueado o limitado por la búsqueda de aplicación de inicio de Discord, establece el ID de aplicación/cliente de Discord desde el Portal de desarrolladores para que el inicio pueda omitir esa llamada REST. Usa `channels.discord.applicationId` para la cuenta predeterminada, o `channels.discord.accounts.<accountId>.applicationId` cuando ejecutes múltiples bots de Discord.

  </Step>

  <Step title="Configurar OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile. Si Discord es tu primer canal, usa la pestaña CLI / config en su lugar.

        > "Ya configuré el token de mi bot de Discord en la configuración. Por favor, termina la configuración de Discord con el User ID `<user_id>` y el Server ID `<server_id>`."
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

        Env de respaldo para la cuenta predeterminada:

```bash
DISCORD_BOT_TOKEN=...
```

        Para una configuración programada o remota, escribe el mismo bloque JSON5 con `openclaw config patch --file ./discord.patch.json5 --dry-run` y luego vuelve a ejecutar sin `--dry-run`. Se admiten valores de texto plano `token`. También se admiten valores SecretRef para `channels.discord.token` a través de proveedores env/file/exec. Consulte [Secrets Management](/es/gateway/secrets).

        Para varios bots de Discord, mantén cada token de bot y ID de aplicación bajo su cuenta. Un `channels.discord.applicationId` de nivel superior es heredado por las cuentas, así que establécelo allí solo cuando cada cuenta deba usar el mismo ID de aplicación.

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

  <Step title="Aprobar el primer emparejamiento DM">
    Espera hasta que la puerta de enlace se esté ejecutando, luego envía un mensaje privado a tu bot en Discord. Responderá con un código de emparejamiento.

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

    Ahora deberías poder chatear con tu agente en Discord mediante mensaje privado.

  </Step>
</Steps>

<Note>
  La resolución de tokens es consciente de la cuenta. Los valores de token de configuración tienen prioridad sobre el respaldo de variables de entorno. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Si dos cuentas de Discord habilitadas se resuelven al mismo token de bot, OpenClaw inicia solo un monitor de puerta de enlace para ese token. Un token obtenido de la configuración tiene
  prioridad sobre el respaldo de entorno predeterminado; de lo contrario, la primera cuenta habilitada gana y la cuenta duplicada se reporta como deshabilitada. Para llamadas salientes avanzadas (herramienta de mensajes/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto aplica a acciones de envío y lectura/sondeo (por ejemplo,
  lectura/búsqueda/obtención/hilo/fijaciones/permisos). La configuración de política/reintentos de la cuenta proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor

Una vez que los MDs funcionen, puedes configurar tu servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo estás tú y tu bot.

<Steps>
  <Step title="Añade tu servidor a la lista de permitidos del gremio">
    Esto habilita a tu agente para responder en cualquier canal de tu servidor, no solo en mensajes directos.

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        > "Añade mi ID de Servidor de Discord `<server_id>` a la lista de permitidos del gremio"
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
    De manera predeterminada, tu agente solo responde en los canales del gremio cuando es @mencionado. Para un servidor privado, probablemente desees que responda a cada mensaje.

    En los canales del gremio, las respuestas normales se publican automáticamente de manera predeterminada. Para salas compartidas siempre activas, opta por `messages.groupChat.visibleReplies: "message_tool"` para que el agente pueda estar al acecho y solo publicue cuando decida que una respuesta en el canal es útil. Esto funciona mejor con modelos de última generación y confiables en herramientas, como GPT 5.5. Los eventos ambientales de la sala permanecen silenciosos a menos que la herramienta los envíe. Consulta [Ambient room events](/es/channels/ambient-room-events) para ver la configuración completa del modo al acecho.

    Si Discord muestra que está escribiendo y los registros muestran uso de tokens pero no hay ningún mensaje publicado, verifica si el turno se configuró como un evento ambiental de la sala o si se optó por respuestas visibles de herramientas de mensaje.

    <Tabs>
      <Tab title="Ask your agent">
        > "Allow my agent to respond on this server without having to be @mentioned"
      </Tab>
      <Tab title="Config">
        Establece `requireMention: false` en la configuración de tu gremio:

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

        Para requerir envíos de herramientas de mensaje para respuestas visibles de grupo/canal, establece `messages.groupChat.visibleReplies: "message_tool"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    De forma predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de mensajes directos (DM). Los canales del gremio no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesita un contexto compartido en cada canal, coloque las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan para cada sesión). Mantenga las notas a largo plazo en `MEMORY.md` y acceda a ellas bajo demanda con herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y comienza a chatear. Tu agente puede ver el nombre del canal, y cada canal obtiene su propia sesión aislada, así que puedes configurar `#coding`, `#home`, `#research`, o lo que se adapte a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway posee la conexión de Discord.
- El enrutamiento de respuestas es determinista: las entradas de Discord responden de vuelta a Discord.
- Los metadatos del gremio/canal de Discord se agregan al mensaje del modelo como contexto
  no confiable, no como un prefijo de respuesta visible para el usuario. Si un modelo copia ese
  sobre de vuelta, OpenClaw elimina los metadatos copiados de las respuestas salientes y de
  el contexto de repetición futuro.
- De forma predeterminada (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales de gremio son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los MD de grupo se ignoran de forma predeterminada (`channels.discord.dm.groupEnabled=false`).
- Los comandos de barra diagonal nativos se ejecutan en sesiones de comandos aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras que aún transportan `CommandTargetSessionKey` a la sesión de conversación enrutada.
- La entrega de anuncios de solo texto de cron/latido a Discord utiliza la respuesta
  final visible para el asistente una sola vez. Las cargas útiles de componentes multimedia y estructurados permanecen
  en varios mensajes cuando el agente emite múltiples cargas entregables.

## Canales de foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al padre del foro (`channel:<forumId>`) para crear automáticamente un hilo. El título del hilo utiliza la primera línea no vacía de tu mensaje.
- Usa `openclaw message thread create` para crear un hilo directamente. No pases `--message-id` para canales de foro.

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

Los padres del foro no aceptan componentes de Discord. Si necesitas componentes, envíalos al hilo en sí (`channel:<threadId>`).

## Componentes interactivos

OpenClaw admite contenedores de componentes de Discord v2 para mensajes de agente. Usa la herramienta de mensaje con una carga útil `components`. Los resultados de la interacción se enrutan de vuelta al agente como mensajes entrantes normales y siguen la configuración de `replyToMode` de Discord existente.

Bloques compatibles:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un único menú de selección
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

De forma predeterminada, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, selecciones y formularios se usen varias veces hasta que caduquen.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (ID de usuario de Discord, etiquetas o `*`). Cuando se configura, los usuarios no coincidentes reciben una denegación efímera.

Los comandos de barra `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor, modelo y tiempo de ejecución compatible, además de un paso de envío. `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat. La respuesta del selector es efímera y solo el usuario que la invoca puede utilizarla. Los menús de selección de Discord están limitados a 25 opciones, por lo que debes añadir entradas `provider/*` a `agents.defaults.models` cuando quieras que el selector muestre modelos descubiertos dinámicamente solo para proveedores seleccionados como `openai-codex` o `vllm`.

Archivos adjuntos:

- Los bloques `file` deben apuntar a una referencia de archivo adjunto (`attachment://<filename>`)
- Proporcione el archivo adjunto a través de `media`/`path`/`filePath` (archivo único); use `media-gallery` para varios archivos
- Use `filename` para anular el nombre de carga cuando deba coincidir con la referencia del archivo adjunto

Formularios modales:

- Añada `components.modal` con hasta 5 campos
- Tipos de campo: `text`, `checkbox`, `radio`, `select`, `role-select`, `user-select`
- OpenClaw añade un botón de activación automáticamente

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
  <Tab title="DM policy">
    `channels.discord.dmPolicy` controla el acceso a MD. `channels.discord.allowFrom` es la lista de permitidos de MD canónica.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.discord.allowFrom` incluya `"*"`)
    - `disabled`

    Si la política de MD no está abierta, los usuarios desconocidos se bloquean (o se les solicita emparejamiento en el modo `pairing`).

    Precedencia multicuenta:

    - `channels.discord.accounts.default.allowFrom` solo se aplica a la cuenta `default`.
    - Para una cuenta, `allowFrom` tiene prioridad sobre el `dm.allowFrom` heredado.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propia `allowFrom` y el `dm.allowFrom` heredado no están establecidos.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    Los `channels.discord.dm.policy` y `channels.discord.dm.allowFrom` heredados todavía se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    Formato de destino de MD para envío:

    - `user:<id>`
    - mención `<@id>`

    Normalmente, los IDs numéricos simples se resuelven como IDs de canal cuando hay un canal predeterminado activo, pero los IDs enumerados en la `allowFrom` de MD efectiva de la cuenta se tratan como destinos de MD de usuario por compatibilidad.

  </Tab>

  <Tab title="Grupos de acceso">
    La autorización de MD y comandos de texto de Discord puede usar entradas `accessGroup:<name>` dinámicas en `channels.discord.allowFrom`.

    Los nombres de los grupos de acceso se comparten en los canales de mensajes. Use `type: "message.senders"` para un grupo estático cuyos miembros se expresan en la sintaxis `allowFrom` normal de cada canal, o `type: "discord.channelAudience"` cuando la audiencia `ViewChannel` actual de un canal de Discord debe definir la pertenencia dinámicamente. El comportamiento del grupo de acceso compartido se documenta aquí: [Grupos de acceso](/es/channels/access-groups).

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

    Un canal de texto de Discord no tiene una lista de miembros separada. `type: "discord.channelAudience"` modela la pertenencia como: el remitente del MD es miembro del gremio configurado y actualmente tiene el permiso `ViewChannel` efectivo en el canal configurado después de que se aplican las anulaciones de roles y canales.

    Ejemplo: permitir que cualquier persona que pueda ver `#maintainers` envíe MD al bot, mientras se mantienen los MD cerrados para todos los demás.

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

    Las búsquedas fallan de forma cerrada. Si Discord devuelve `Missing Access`, la búsqueda de miembros falla o el canal pertenece a un gremio diferente, el remitente del MD se trata como no autorizado.

    Habilite el **Server Members Intent** (Intención de miembros del servidor) del Portal para desarrolladores de Discord para el bot cuando use grupos de acceso de audiencia de canal. Los MD no incluyen el estado de miembros del gremio, por lo que OpenClaw resuelve el miembro a través de Discord REST en el momento de la autorización.

  </Tab>

  <Tab title="Guild policy">
    El manejo de gremios está controlado por `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La línea base segura cuando existe `channels.discord` es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta slug)
    - listas de permitidos de remitentes opcionales: `users` (se recomiendan IDs estables) y `roles` (solo IDs de roles); si se configura cualquiera de los dos, los remitentes están permitidos cuando coinciden con `users` O `roles`
    - la coincidencia directa de nombre/etiqueta está deshabilitada de forma predeterminada; habilite `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia
    - se admiten nombres/etiquetas para `users`, pero los IDs son más seguros; `openclaw security audit` advierte cuando se usan entradas de nombre/etiqueta
    - si un gremio tiene `channels` configurado, se deniegan los canales no listados
    - si un gremio no tiene bloque `channels`, se permiten todos los canales en ese gremio en la lista de permitidos

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

    Si solo configura `DISCORD_BOT_TOKEN` y no crea un bloque `channels.discord`, el respaldo en tiempo de ejecución es `groupPolicy="allowlist"` (con una advertencia en los registros), incluso si `channels.defaults.groupPolicy` es `open`.

  </Tab>

  <Tab title="Menciones y MD grupales">
    Los mensajes del gremio están restringidos por mención de forma predeterminada.

    La detección de menciones incluye:

    - mención explícita al bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, alternativo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    Al escribir mensajes salientes de Discord, utilice la sintaxis de mención canónica: `<@USER_ID>` para usuarios, `<#CHANNEL_ID>` para canales y `<@&ROLE_ID>` para roles. No utilice el formato de mención por apodo heredado `<@!USER_ID>`.

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` opcionalmente descarta mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    MD grupales:

    - predeterminado: ignorados (`dm.groupEnabled=false`)
    - lista de permitidos opcional mediante `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Use `bindings[].match.roles` para enrutar a los miembros del gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles solo aceptan IDs de rol y se evalúan después de los enlaces de pares o pares principales y antes de los enlaces exclusivos del gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

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

- `commands.native` es por defecto `"auto"` y está habilitado para Discord.
- Anulación por canal: `channels.discord.commands.native`.
- `commands.native=false` omite el registro y la limpieza de comandos de barra de Discord durante el inicio. Los comandos registrados previamente pueden permanecer visibles en Discord hasta que los elimine de la aplicación de Discord.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan siendo visibles en la interfaz de usuario de Discord para los usuarios que no están autorizados; la ejecución todavía hace cumplir la autenticación de OpenClaw y devuelve "no autorizado".

Consulte [Comandos de barra](/es/tools/slash-commands) para ver el catálogo y el comportamiento de los comandos.

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

    Nota: `off` desactiva el hilado implícito de respuestas. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.
    `first` siempre adjunta la referencia de respuesta nativa implícita al primer mensaje saliente de Discord para el turno.
    `batched` solo adjunta la referencia de respuesta nativa implícita de Discord cuando el
    evento entrante fue un lote debounced de múltiples mensajes. Esto es útil
    cuando desea respuestas nativas principalmente para chats ambiguos y erráticos, no para cada
    turno de mensaje único.

    Los ID de mensaje se muestran en el contexto/historial para que los agentes puedan apuntar a mensajes específicos.

  </Accordion>

  <Accordion title="Vistas previas de enlaces">
    Discord genera incrustaciones de enlaces ricos para las URL de forma predeterminada. OpenClaw suprime esas incrustaciones generadas en los mensajes salientes de Discord de forma predeterminada, por lo que las URL enviadas por el agente se mantienen como enlaces simples a menos que usted opte por participar:

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Establezca `channels.discord.accounts.<id>.suppressEmbeds` para anular una cuenta. Los envíos de herramienta de mensajes del agente también pueden pasar `suppressEmbeds: false` para un solo mensaje. Las cargas útiles explícitas de `embeds` de Discord no se suprimen mediante la configuración de vista previa de enlaces predeterminada.

  </Accordion>

  <Accordion title="Vista previa de transmisión en vivo">
    OpenClaw puede transmitir borradores de respuestas enviando un mensaje temporal y editándolo a medida que llega el texto. `channels.discord.streaming` acepta `off` | `partial` | `block` | `progress` (predeterminado). `progress` mantiene un borrador de estado editable y lo actualiza con el progreso de la herramienta hasta la entrega final; la etiqueta inicial compartida es una línea en movimiento, por lo que se desplaza como el resto una vez que aparece suficiente trabajo. `streamMode` es un alias de ejecución heredado. Ejecute `openclaw doctor --fix` para reescribir la configuración persistente a la clave canónica.

    Establezca `channels.discord.streaming.mode` en `off` para desactivar las ediciones de vista previa de Discord. Si la transmisión en bloque de Discord está explícitamente habilitada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

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
        },
      },
    },
  },
}
```

    - `partial` edita un único mensaje de vista previa a medida que llegan los tokens.
    - `block` emite fragmentos del tamaño de un borrador (use `draftChunk` para ajustar el tamaño y los puntos de ruptura, limitado a `textChunkLimit`).
    - Los elementos finales de medios, errores y respuestas explícitas cancelan las ediciones de vista previa pendientes.
    - `streaming.preview.toolProgress` (predeterminado `true`) controla si las actualizaciones de herramienta/progreso reutilizan el mensaje de vista previa.
    - Las filas de herramienta/progreso se representan como emoji + título + detalle compactos cuando están disponibles, por ejemplo `🛠️ Bash: run tests` o `🔎 Web Search: for "query"`.
    - `streaming.progress.maxLineChars` controla el presupuesto de vista previa de progreso por línea. La prosa se acorta en los límites de las palabras; los detalles de comandos y rutas mantienen sufijos útiles.
    - `streaming.preview.commandText` / `streaming.progress.commandText` controla los detalles de comando/exec en las líneas de progreso compactas: `raw` (predeterminado) o `status` (solo etiqueta de herramienta).

    Ocultar el texto sin procesar de comando/exec manteniendo las líneas de progreso compactas:

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

    - Los hilos de Discord se enrutan como sesiones de canal y heredan la configuración del canal principal, a menos que se anule.
    - Las sesiones de hilo heredan la selección de `/model` a nivel de sesión del canal principal como alternativa solo para el modelo; las selecciones de `/model` locales del hilo todavía tienen prioridad y el historial de transcripciones del padre no se copia a menos que la herencia de transcripciones esté habilitada.
    - `channels.discord.thread.inheritParent` (predeterminado `false`) opta por que los nuevos hilos automáticos se inicien con la transcripción principal. Las anulaciones por cuenta se encuentran en `channels.discord.accounts.<id>.thread.inheritParent`.
    - Las reacciones de herramientas de mensajes pueden resolver `user:<id>` objetivos de MD.
    - `guilds.<guild>.channels.<channel>.requireMention: false` se conserva durante la activación de la alternativa de etapa de respuesta.

    Los temas del canal se inyectan como contexto **no confiable**. Las listas de permitidos controlan quién puede activar el agente, no un límite completo de redacción de contexto suplementario.

  </Accordion>

  <Accordion title="Sesiones vinculadas a hilos para subagentes">
    Discord puede vincular un hilo a un objetivo de sesión para que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagente).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un objetivo de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la auto-desactivación por inactividad para vinculaciones enfocadas
    - `/session max-age <duration|off>` inspeccionar/actualizar la antigüedad máxima máxima para vinculaciones enfocadas

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
    - `spawnSessions` controla la creación/vinculación automática de hilos para `sessions_spawn({ thread: true })` y las creaciones de hilos ACP. Predeterminado: `true`.
    - `defaultSpawnContext` controla el contexto nativo del subagente para las creaciones vinculadas a hilos. Predeterminado: `"fork"`.
    - Las claves obsoletas `spawnSubagentSessions`/`spawnAcpSessions` son migradas por `openclaw doctor --fix`.
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas de vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/es/tools/subagents), [Agentes ACP](/es/tools/acp-agents) y [Referencia de configuración](/es/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Enlaces persistentes de canales ACP">
    Para espacios de trabajo ACP estables "siempre activos", configure enlaces ACP escritos de nivel superior que apunten a conversaciones de Discord.

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

    - `/acp spawn codex --bind here` vincula el canal o hilo actual en su lugar y mantiene los mensajes futuros en la misma sesión de ACP. Los mensajes de los hilos heredan el vínculo del canal principal.
    - En un canal o hilo vinculado, `/new` y `/reset` restablecen la misma sesión de ACP en su lugar. Los vínculos temporales de hilos pueden anular la resolución del objetivo mientras estén activos.
    - `spawnSessions` limita la creación/vinculación de hilos secundarios a través de `--thread auto|here`.

    Consulte [ACP Agents](/es/tools/acp-agents) para obtener detalles sobre el comportamiento de vinculación.

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
    `ackReaction` envía un emoji de acuse de recibo mientras OpenClaw está procesando un mensaje entrante.

    Orden de resolución:

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - recurso de emoji de identidad del agente (`agents.list[].identity.emoji`, de lo contrario "👀")

    Notas:

    - Discord acepta emojis unicode o nombres de emojis personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes">
    Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada.

    Esto afecta a los flujos de `/config set|unset` (cuando las funciones de comando están habilitadas).

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
    Habilite la resolución de PluralKit para asignar mensajes con proxy a la identidad del miembro del sistema:

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
    - los nombres para mostrar de los miembros se coinciden por nombre/solo slug cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están limitadas por ventana de tiempo
    - si la búsqueda falla, los mensajes con proxy se tratan como mensajes de bot y se descartan a menos que `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    Use `mentionAliases` cuando los agentes necesiten menciones de salida deterministas para usuarios de Discord conocidos. Las claves son identificadores sin el `@` inicial; los valores son ID de usuario de Discord. Los identificadores desconocidos, `@everyone`, `@here`, y las menciones dentro de intervalos de código Markdown se dejan sin cambios.

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

  <Accordion title="Configuración de presencia">
    Las actualizaciones de presencia se aplican cuando estableces un campo de estado o actividad, o cuando habilitas la presencia automática.

    Ejemplo solo de estado:

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

    Ejemplo de transmisión (streaming):

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

    Ejemplo de presencia automática (señal de salud en tiempo de ejecución):

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

    La presencia automática asigna la disponibilidad en tiempo de ejecución al estado de Discord: saludable => en línea, degradado o desconocido => ausente, agotado o no disponible => no molestar. Opciones de anulación de texto:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (admite el marcador de posición `{reason}`)

  </Accordion>

  <Accordion title="Aprobaciones en Discord">
    Discord admite el manejo de aprobaciones basado en botones en mensajes directos (DM) y, opcionalmente, puede publicar avisos de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (opcional; vuelve a `commands.ownerAllowFrom` cuando sea posible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y al menos un aprobador se puede resolver, ya sea desde `execApprovals.approvers` o desde `commands.ownerAllowFrom`. Discord no infiere aprobadores de ejecución desde el `allowFrom` del canal, el `dm.allowFrom` heredado o el `defaultTo` de mensaje directo. Establezca `enabled: false` para deshabilitar explícitamente Discord como cliente de aprobación nativo.

    Para comandos grupales sensibles solo para propietarios, como `/diagnostics` y `/export-trajectory`, OpenClaw envía avisos de aprobación y resultados finales de forma privada. Primero intenta el mensaje directo de Discord cuando el propietario invocante tiene una ruta de propietario de Discord; si no está disponible, vuelve a la primera ruta de propietario disponible desde `commands.ownerAllowFrom`, como Telegram.

    Cuando `target` es `channel` o `both`, el aviso de aprobación es visible en el canal. Solo los aprobadores resueltos pueden usar los botones; otros usuarios reciben una denegación efímera. Los avisos de aprobación incluyen el texto del comando, así que habilite la entrega en el canal solo en canales de confianza. Si no se puede derivar el ID del canal desde la clave de sesión, OpenClaw vuelve a la entrega por mensaje directo.

    Discord también renderiza los botones de aprobación compartidos utilizados por otros canales de chat. El adaptador nativo de Discord principalmente añade enrutamiento de mensajes directos para aprobadores y distribución en canales.
    Cuando esos botones están presentes, son la experiencia de usuario de aprobación principal; OpenClaw
    solo debe incluir un comando `/approve` manual cuando el resultado de la herramienta indica
    que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    Si el tiempo de ejecución de aprobación nativo de Discord no está activo, OpenClaw mantiene visible
    el aviso `/approve <id> <decision>` determinista local. Si el
    tiempo de ejecución está activo pero no se puede entregar una tarjeta nativa a ningún objetivo,
    OpenClaw envía un aviso de reserva en el mismo chat con el comando `/approve`
    exacto de la aprobación pendiente.

    La autenticación y resolución de aprobaciones de Gateway siguen el contrato compartido del cliente Gateway (los IDs `plugin:` se resuelven a través de `plugin.approval.resolve`; otros IDs a través de `exec.approval.resolve`). Las aprobaciones expiran después de 30 minutos de forma predeterminada.

    Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Herramientas y puertas de acción

Las acciones de mensajes de Discord incluyen mensajería, administración de canales, moderación, presencia y acciones de metadatos.

Ejemplos principales:

- mensajería: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reacciones: `react`, `reactions`, `emojiList`
- moderación: `timeout`, `kick`, `ban`
- presencia: `setPresence`

La acción `event-create` acepta un parámetro `image` opcional (URL o ruta de archivo local) para establecer la imagen de portada del evento programado.

Las puertas de acción se encuentran en `channels.discord.actions.*`.

Comportamiento predeterminado de la puerta:

| Grupo de acción                                                                                                                                                               | Predeterminado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| reacciones, mensajes, hilos, fijados, encuestas, búsqueda, memberInfo, roleInfo, channelInfo, canales, voiceStatus, eventos, stickers, emojiUploads, stickerUploads, permisos | habilitado     |
| roles                                                                                                                                                                         | deshabilitado  |
| moderación                                                                                                                                                                    | deshabilitado  |
| presencia                                                                                                                                                                     | deshabilitado  |

## IU de componentes v2

OpenClaw utiliza componentes de Discord v2 para aprobaciones de ejecución y marcadores de contexto cruzado. Las acciones de mensajes de Discord también pueden aceptar `components` para IU personalizada (avanzado; requiere construir una carga útil de componente a través de la herramienta discord), mientras que los `embeds` heredados siguen disponibles pero no se recomiendan.

- `channels.discord.ui.components.accentColor` establece el color de acento utilizado por los contenedores de componentes de Discord (hex).
- Establecer por cuenta con `channels.discord.accounts.<id>.ui.components.accentColor`.
- Se ignoran `embeds` cuando están presentes los componentes v2.
- Las vistas previas de URL simples se suprimen de forma predeterminada. Establezca `suppressEmbeds: false` en una acción de mensaje cuando un único enlace saliente deba expandirse.

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

Discord tiene dos superficies de voz distintas: **canales de voz** en tiempo real (conversaciones continuas) y **archivos adjuntos de mensajes de voz** (el formato de vista previa de forma de onda). La puerta de enlace admite ambos.

### Canales de voz

Lista de verificación de configuración:

1. Habilitar el Intent de contenido de mensajes en el Portal para desarrolladores de Discord.
2. Habilitar el Intent de miembros del servidor cuando se usan listas permitidas de roles/usuarios.
3. Invita al bot con los alcances `bot` y `applications.commands`.
4. Concede Conectar, Hablar, Enviar mensajes y Ver historial de mensajes en el canal de voz de destino.
5. Habilita los comandos nativos (`commands.native` o `channels.discord.commands.native`).
6. Configura `channels.discord.voice`.

Usa `/vc join|leave|status` para controlar las sesiones. El comando usa el agente predeterminado de la cuenta y sigue las mismas reglas de lista de permitidos y políticas de grupo que otros comandos de Discord.

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

Para inspeccionar los permisos efectivos del bot antes de unirse, ejecuta:

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
          voice: "cedar",
        },
      },
    },
  },
}
```

Notas:

- `voice.tts` anula `messages.tts` solo para la reproducción de voz `stt-tts`. Los modos en tiempo real usan `voice.realtime.voice`.
- `voice.mode` controla la ruta de la conversación. El valor predeterminado es `agent-proxy`: un front-end de voz en tiempo real maneja el tiempo de turno, la interrupción y la reproducción, delega el trabajo sustantivo al agente OpenClaw enrutado a través de `openclaw_agent_consult` y trata el resultado como un mensaje escrito de Discord de ese hablante. `stt-tts` mantiene el flujo anterior de STT por lotes más TTS. `bidi` permite que el modelo en tiempo real converse directamente mientras expone `openclaw_agent_consult` para el cerebro de OpenClaw.
- `voice.agentSession` controla qué conversación de OpenClaw recibe los turnos de voz. Déjalo sin establecer para la propia sesión del canal de voz, o establece `{ mode: "target", target: "channel:<text-channel-id>" }` para hacer que el canal de voz actúe como la extensión de micrófono/altavoz de una sesión existente de un canal de texto de Discord, como `#maintainers`.
- `voice.model` anula el cerebro del agente OpenClaw para las respuestas de voz de Discord y consultas en tiempo real. Déjalo sin establecer para heredar el modelo de agente enrutado. Es independiente de `voice.realtime.model`.
- `agent-proxy` enruta el habla a través de `discord-voice`, lo que conserva la autorización normal de propietario/herramienta para el hablante y la sesión de destino, pero oculta la herramienta `tts` del agente porque la voz de Discord es la propietaria de la reproducción. De forma predeterminada, `agent-proxy` otorga a la consulta acceso total a herramientas equivalente al propietario para los hablantes propietarios (`voice.realtime.toolPolicy: "owner"`) y prefiere encarecidamente consultar al agente OpenClaw antes de las respuestas sustantivas (`voice.realtime.consultPolicy: "always"`). En ese modo predeterminado `always`, la capa en tiempo real no habla automáticamente rellenos antes de la respuesta de la consulta; captura y transcribe el habla, y luego pronuncia la respuesta enrutada de OpenClaw. Si finalizan múltiples respuestas de consulta forzadas mientras Discord todavía está reproduciendo la primera respuesta, las respuestas posteriores de habla exacta se ponen en cola hasta que la reproducción quede inactiva en lugar de reemplazar el habla a media frase.
- En modo `stt-tts`, STT usa `tools.media.audio`; `voice.model` no afecta la transcripción.
- En modos en tiempo real, `voice.realtime.provider`, `voice.realtime.model` y `voice.realtime.voice` configuran la sesión de audio en tiempo real. Para OpenAI Realtime 2 más el cerebro Codex, use `voice.realtime.model: "gpt-realtime-2"` y `voice.model: "openai-codex/gpt-5.5"`.
- El proveedor en tiempo real de OpenAI acepta los nombres de eventos actuales de Realtime 2 y los alias heredados compatibles con Codex para eventos de audio y transcripción de salida, por lo que las instantáneas del proveedor compatibles pueden derivarse sin perder el audio del asistente.
- `voice.realtime.bargeIn` controla si los eventos de inicio de habla de Discord interrumpen la reproducción activa en tiempo real. Si no está configurado, sigue la configuración de interrupción de audio de entrada del proveedor en tiempo real.
- `voice.realtime.minBargeInAudioEndMs` controla la duración mínima de reproducción del asistente antes de que una interrupción en tiempo real de OpenAI trunque el audio. Predeterminado: `250`. Establezca `0` para una interrupción inmediata en salas con poco eco, o ajústelo más alto para configuraciones de altavoces con mucho eco.
- Para una voz de OpenAI en la reproducción de Discord, establezca `voice.tts.provider: "openai"` y elija una voz de conversión de texto a voz en `voice.tts.openai.voice` o `voice.tts.providers.openai.voice`. `cedar` es una buena opción con sonido masculino en el modelo TTS actual de OpenAI.
- Las anulaciones de Discord `systemPrompt` por canal se aplican a los turnos de transcripción de voz de ese canal de voz.
- Los turnos de transcripción de voz derivan el estado de propietario de Discord `allowFrom` (o `dm.allowFrom`); los hablantes que no son propietarios no pueden acceder a herramientas exclusivas para propietarios (por ejemplo `gateway` y `cron`).
- La voz de Discord es opcional para configuraciones de solo texto; establezca `channels.discord.voice.enabled=true` (o mantenga un bloque `channels.discord.voice` existente) para habilitar los comandos `/vc`, el tiempo de ejecución de voz y la intención de la puerta de enlace `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` puede anular explícitamente la suscripción de intención de estado de voz. Déjelo sin establecer para que la intención siga la habilitación efectiva de voz.
- Si `voice.autoJoin` tiene múltiples entradas para el mismo gremio, OpenClaw se une al último canal configurado para ese gremio.
- `voice.allowedChannels` es una lista de permitidos de residencia opcional. Déjelo sin establecer para permitir `/vc join` en cualquier canal de voz de Discord autorizado. Cuando se establece, `/vc join`, la unión automática al inicio y los movimientos de estado de voz del bot se restringen a las entradas `{ guildId, channelId }` listadas. Establézcalo en una matriz vacía para denegar todas las uniones de voz de Discord. Si Discord mueve el bot fuera de la lista de permitidos, OpenClaw sale de ese canal y se une al objetivo de unión automática configurado cuando hay uno disponible.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión de `@discordjs/voice`.
- Los valores predeterminados de `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no se establecen.
- OpenClaw utiliza por defecto el decodificador `opusscript` puramente en JS para la recepción de voz de Discord. El paquete nativo opcional `@discordjs/opus` es ignorado por la política de instalación de pnpm del repositorio, por lo que las instalaciones normales, los carriles de Docker y las pruebas no relacionadas no compilan un complemento nativo. Los hosts dedicados al rendimiento de voz pueden optar por participar con `OPENCLAW_DISCORD_OPUS_DECODER=native` después de instalar el complemento nativo.
- `voice.connectTimeoutMs` controla la espera inicial `@discordjs/voice` Ready para `/vc join` y los intentos de unión automática. Predeterminado: `30000`.
- `voice.reconnectGraceMs` controla cuánto tiempo espera OpenClaw a que una sesión de voz desconectada comience a reconectarse antes de destruirla. Predeterminado: `15000`.
- En el modo `stt-tts`, la reproducción de voz no se detiene solo porque otro usuario empieza a hablar. Para evitar bucles de retroalimentación, OpenClaw ignora la nueva captura de voz mientras se reproduce el TTS; hable después de que finalice la reproducción para el siguiente turno. Los modos en tiempo real reenvían los inicios de altavoz como señales de interrupción (barge-in) al proveedor en tiempo real.
- En modos en tiempo real, el eco de los altavoces hacia un micrófono abierto puede parecer una interrupción (barge-in) e interrumpir la reproducción. Para salas de Discord con mucho eco, configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` para evitar que OpenAI se interrumpa automáticamente con el audio de entrada. Agregue `voice.realtime.bargeIn: true` si aún desea que los eventos de inicio de altavoz de Discord interrumpan la reproducción activa. El puente en tiempo real de OpenAI ignora las truncaciones de reproducción más cortas que `voice.realtime.minBargeInAudioEndMs` como probable eco/ruido y las registra como omitidas en lugar de borrar la reproducción de Discord.
- `voice.captureSilenceGraceMs` controla cuánto tiempo espera OpenClaw después de que Discord informa que un altavoz ha dejado de hablar antes de finalizar ese segmento de audio para STT. Predeterminado: `2500`; aumente esto si Discord divide las pausas normales en transcripciones parciales entrecortadas.
- Cuando ElevenLabs es el proveedor de TTS seleccionado, la reproducción de voz de Discord utiliza TTS en streaming y comienza desde el flujo de respuesta del proveedor. Los proveedores sin soporte de streaming recurren a la ruta del archivo temporal sintetizado.
- OpenClaw también monitorea los fallos de desencriptado de recepción y se recupera automáticamente saliendo/volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta de tiempo.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` después de actualizar, recopile un informe de dependencias y registros. La línea `@discordjs/voice` empaquetada incluye la solución de corrección de relleno (padding) aguas arriba del PR #11449 de discord.js, que cerró el issue #11419 de discord.js.
- Se esperan eventos de recepción `The operation was aborted` cuando OpenClaw finaliza un segmento de hablante capturado; son diagnósticos detallados, no advertencias.
- Los registros detallados de voz de Discord incluyen una vista previa delimitada de una línea de la transcripción STT para cada segmento de hablante aceptado, por lo que la depuración muestra tanto el lado del usuario como el lado de respuesta del agente sin volcar texto de transcripción ilimitado.
- En el modo `agent-proxy`, el respaldo de consulta forzada omite fragmentos de transcripción probablemente incompletos, como texto que termina en `...` o un conector final como `and`, además de cierres evidentemente no accionables como “vuelvo enseguida” o “adiós”. Los registros muestran `forced agent consult skipped reason=...` cuando esto evita una respuesta en cola obsoleta.

Configuración nativa de opus para descargas de código fuente:

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

Use Node 22 para la puerta de enlace (gateway) cuando desee el complemento nativo preconstruido de macOS arm64 aguas arriba. Si usa otro tiempo de ejecución de Node, el instalador de participación opcional puede necesitar una cadena de herramientas de compilación de fuente `node-gyp` local.

Después de instalar el complemento nativo, inicie la Gateway con:

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

Los registros detallados de voz deben mostrar `discord voice: opus decoder: @discordjs/opus`. Sin la opción de participación del entorno, o si falta el complemento nativo o no se puede cargar en el host, OpenClaw registra `discord voice: opus decoder: opusscript` y sigue recibiendo voz a través del respaldo de JavaScript puro.

Canalización de STT más TTS:

- La captura PCM de Discord se convierte en un archivo temporal WAV.
- `tools.media.audio` maneja el STT, por ejemplo `openai/gpt-4o-mini-transcribe`.
- La transcripción se envía a través del ingreso y enrutamiento de Discord mientras el LLM de respuesta se ejecuta con una política de salida de voz que oculta la herramienta `tts` del agente y solicita texto devuelto, porque la voz de Discord es propietaria de la reproducción final de TTS.
- `voice.model`, cuando se establece, solo anula el LLM de respuesta para este turno de canal de voz.
- `voice.tts` se mezcla sobre `messages.tts`; los proveedores con capacidad de transmisión alimentan el reproductor directamente; de lo contrario, el archivo de audio resultante se reproduce en el canal unido.

Ejemplo de sesión predeterminada de canal de voz de agente-proxy:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

Sin ningún bloque `voice.agentSession`, cada canal de voz obtiene su propia sesión enrutada de OpenClaw. Por ejemplo, `/vc join channel:234567890123456789` habla con la sesión de ese canal de voz de Discord. El modelo en tiempo real es solo el front-end de voz; las solicitudes sustantivas se pasan al agente OpenClaw configurado. Si el modelo en tiempo real produce una transcripción final sin llamar a la herramienta de consulta, OpenClaw fuerza la consulta como respaldo para que el comportamiento predeterminado siga siendo como hablar con el agente.

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
          openai: {
            model: "gpt-4o-mini-tts",
            voice: "cedar",
          },
        },
      },
    },
  },
}
```

Ejemplo bidireccional en tiempo real:

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
          voice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

Voz como extensión de una sesión de canal de Discord existente:

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
          voice: "cedar",
        },
      },
    },
  },
}
```

En el modo `agent-proxy`, el bot se une al canal de voz configurado, pero los turnos del agente OpenClaw utilizan la sesión y el agente enrutados normales del canal de destino. La sesión de voz en tiempo real reproduce el resultado devuelto en el canal de voz. El agente supervisor aún puede utilizar herramientas de mensajes normales según su política de herramientas, incluido el envío de un mensaje de Discord separado si esa es la acción correcta.

Formas de destino útiles:

- `target: "channel:123456789012345678"` se enruta a través de una sesión de canal de texto de Discord.
- `target: "123456789012345678"` se trata como un objetivo de canal.
- `target: "dm:123456789012345678"` o `target: "user:123456789012345678"` se enrutan a través de esa sesión de mensaje directo.

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
          voice: "cedar",
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

Use esto cuando el modelo escuche su propia reproducción de Discord a través de un micrófono abierto, pero aún así desee interrumpirlo hablando. OpenClaw evita que OpenAI se auto-interrumpa con el audio de entrada sin procesar, mientras que `bargeIn: true` permite que los eventos de inicio de altavoz de Discord y el audio del altavoz ya activo cancelen las respuestas en tiempo real activas antes de que el siguiente turno capturado llegue a OpenAI. Las señales de interrupción muy tempranas con `audioEndMs` por debajo de `minBargeInAudioEndMs` se tratan como probable eco/ruido y se ignoran para que el modelo no se corte en el primer cuadro de reproducción.

Registros de voz esperados:

- Al unirse: `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Al iniciar en tiempo real: `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- En el audio del altavoz: `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` y `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- En el salto de voz obsoleta: `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` o `reason=non-actionable-closing ...`
- En la finalización de la respuesta en tiempo real: `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- En la detención/restablecimiento de la reproducción: `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- En la consulta en tiempo real: `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- En la respuesta del agente: `discord voice: agent turn answer ...`
- En la voz exacta en cola: `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, seguido de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- En la detección de interrupción: `discord voice: realtime barge-in detected source=speaker-start ...` o `discord voice: realtime barge-in detected source=active-speaker-audio ...`, seguido de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- En la interrupción en tiempo real: `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, seguido de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` o `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- En el eco/ruido ignorado: `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- En la interrupción desactivada: `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- En la reproducción inactiva: `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Para depurar el audio cortado, lea los registros de voz en tiempo real como una línea de tiempo:

1. `realtime audio playback started` significa que Discord ha comenzado a reproducir el audio del asistente. El puente comienza a contar los fragmentos de salida del asistente, los bytes PCM de Discord, los bytes en tiempo real del proveedor y la duración del audio sintetizado desde este punto.
2. `realtime speaker turn opened` marca que un altavoz de Discord se vuelve activo. Si la reproducción ya está activa y `bargeIn` está habilitado, esto puede ir seguido de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marca el primer marco de audio real recibido para ese turno del altavoz. `outputActive=true` o un `outputAudioMs` distinto de cero aquí significa que el micrófono está enviando entrada mientras la reproducción del asistente aún está activa.
4. `barge-in detected source=active-speaker-audio` significa que OpenClaw vio audio del altavoz en vivo mientras la reproducción del asistente estaba activa. Esto es útil para distinguir una interrupción real de un evento de inicio de altavoz de Discord sin audio útil.
5. `barge-in requested reason=...` significa que OpenClaw solicitó al proveedor en tiempo real cancelar o truncar la respuesta activa. Incluye `outputAudioMs`, `outputActive` y `playbackChunks` para que pueda ver cuánto audio del asistente se había reproducido realmente antes de la interrupción.
6. `realtime audio playback stopped reason=...` es el punto de reinicio de la reproducción local de Discord. El motivo indica quién detuvo la reproducción: `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` o `session-close`.
7. `realtime speaker turn closed` resume el turno de entrada capturado. `chunks=0` o `hasAudio=false` significa que el turno del hablante se abrió pero ningún audio útil llegó al puente en tiempo real. `interruptedPlayback=true` significa que el turno de entrada se superpuso a la salida del asistente y activó la lógica de interrupción.

Campos útiles:

- `outputAudioMs`: duración del audio del asistente generada por el proveedor en tiempo real antes de la línea de registro.
- `audioMs`: duración del audio del asistente que OpenClaw contó antes de que se detuviera la reproducción.
- `elapsedMs`: tiempo de reloj entre la apertura y el cierre del flujo de reproducción o el turno del hablante.
- `discordBytes`: bytes PCM estéreo a 48 kHz enviados o recibidos de la voz de Discord.
- `realtimeBytes`: bytes PCM en formato de proveedor enviados o recibidos del proveedor en tiempo real.
- `playbackChunks`: fragmentos de audio del asistente reenviados a Discord para la respuesta activa.
- `sinceLastAudioMs`: brecha entre el último cuadro de audio del hablante capturado y el cierre del turno del hablante.

Patrones comunes:

- Un corte inmediato con `source=active-speaker-audio`, un `outputAudioMs` pequeño y el mismo usuario cerca generalmente indica que el eco del altavoz está entrando en el micrófono. Aumente `voice.realtime.minBargeInAudioEndMs`, baje el volumen del altavoz, use auriculares o configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` seguido de `speaker turn closed ... hasAudio=false` significa que Discord informó el inicio de un hablante pero ningún audio llegó a OpenClaw. Eso puede ser un evento de voz transitorio de Discord, el comportamiento de la puerta de ruido o que un cliente activara brevemente el micrófono.
- `audio playback stopped reason=stream-close` sin una interrupción cercana o `provider-clear-audio` significa que el flujo de reproducción local de Discord finalizó inesperadamente. Verifique los registros del proveedor anterior y del reproductor de Discord.
- `capture ignored during playback (barge-in disabled)` significa que OpenClaw descartó intencionalmente la entrada mientras el audio del asistente estaba activo. Habilite `voice.realtime.bargeIn` si desea que el habla interrumpa la reproducción.
- `barge-in ignored ... outputActive=false` significa que Discord o el proveedor VAD informaron habla, pero OpenClaw no tenía reproducción activa que interrumpir. Esto no debería cortar el audio.

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
  <Accordion title="Usó intents no permitidos o el bot no ve mensajes del gremio">

    - habilite el Intent de contenido de mensajes (Message Content Intent)
    - habilite el Intent de miembros del servidor (Server Members Intent) cuando dependa de la resolución de usuario/miembro
    - reinicie la puerta de enlace después de cambiar los intents

  </Accordion>

  <Accordion title="Mensajes de gremio bloqueados inesperadamente">

    - verificar `groupPolicy`
    - verificar la lista blanca del gremio bajo `channels.discord.guilds`
    - si existe el mapa `channels` del gremio, solo se permiten los canales listados
    - verificar el comportamiento `requireMention` y los patrones de mención

    Verificaciones útiles:

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Requerir mención falso pero aún bloqueado">
    Causas comunes:

    - `groupPolicy="allowlist"` sin una lista blanca de gremio/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o la entrada del canal)
    - remitente bloqueado por la lista blanca `users` de gremio/canal

  </Accordion>

  <Accordion title="Turnos de Discord de larga duración o respuestas duplicadas">

    Registros típicos:

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Controles de la cola de la puerta de enlace de Discord:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - cuenta múltiple: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - esto solo controla el trabajo del oyente de la puerta de enlace de Discord, no la vida útil del turno del agente

    Discord no aplica un tiempo de espera propiedad del canal a los turnos del agente en cola. Los oyentes de mensajes transfieren el control inmediatamente, y las ejecuciones en cola de Discord preservan el orden por sesión hasta que el ciclo de vida de la sesión/herramienta/tiempo de ejecución completa o aborta el trabajo.

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

  <Accordion title="Advertencias de tiempo de espera de búsqueda de metadatos de la puerta de enlace">
    OpenClaw obtiene los metadatos `/gateway/bot` de Discord antes de conectarse. Los fallos transitorios recurren a la URL predeterminada de la puerta de enlace de Discord y están limitados en la tasa en los registros.

    Controles de tiempo de espera de metadatos:

    - cuenta única: `channels.discord.gatewayInfoTimeoutMs`
    - cuenta múltiple: `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - alternativa de entorno cuando la configuración no está establecida: `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - predeterminado: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Reinicios por tiempo de espera de READY de Gateway">
    OpenClaw espera el evento `READY` de la puerta de enlace de Discord durante el inicio y después de las reconexiones en tiempo de ejecución. Las configuraciones de varias cuentas con escalonamiento de inicio pueden necesitar una ventana READY de inicio más larga que la predeterminada.

    Controles de tiempo de espera READY:

    - inicio de cuenta única: `channels.discord.gatewayReadyTimeoutMs`
    - inicio de varias cuentas: `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - respaldo de entorno al inicio cuando la configuración no está establecida: `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - predeterminado al inicio: `15000` (15 segundos), máximo: `120000`
    - cuenta única en tiempo de ejecución: `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - varias cuentas en tiempo de ejecución: `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - respaldo de entorno en tiempo de ejecución cuando la configuración no está establecida: `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - predeterminado en tiempo de ejecución: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Discrepancias en la auditoría de permisos">
    Las comprobaciones de permisos `channels status --probe` solo funcionan para ID de canal numéricos.

    Si utiliza claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero el sondeo no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD desactivado: `channels.discord.dm.enabled=false`
    - política de MD desactivada: `channels.discord.dmPolicy="disabled"` (heredado: `channels.discord.dm.policy`)
    - esperando la aprobación de emparejamiento en el modo `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    De forma predeterminada, se ignoran los mensajes creados por bots.

    Si configura `channels.discord.allowBots=true`, use reglas estrictas de mención y listas permitidas para evitar comportamientos de bucle.
    Prefiera `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bots que mencionen al bot.

    OpenClaw también incluye una [protección contra bucles de bots](/es/channels/bot-loop-protection) compartida. Siempre que `allowBots` permite que los mensajes creados por bots lleguen al despacho, Discord asigna el evento entrante a hechos `(account, channel, bot pair)` y el guardián de pares genérico suprime el par después de que exceda el presupuesto de eventos configurado. El guardián evita bucles incontrolados de dos bots que anteriormente tenían que ser detenidos por los límites de velocidad de Discord; no afecta los despliegues de un solo bot ni las respuestas únicas de bots que se mantienen por debajo del presupuesto.

    Configuración predeterminada (activa cuando se establece `allowBots`):

    - `maxEventsPerWindow: 20` -- el par de bots puede intercambiar 20 mensajes dentro de la ventana deslizante
    - `windowSeconds: 60` -- duración de la ventana deslizante
    - `cooldownSeconds: 60` -- una vez que se agota el presupuesto, cada mensaje adicional de bot a bot en cualquier dirección se descarta durante un minuto

    Configure el valor predeterminado compartido una vez bajo `channels.defaults.botLoopProtection`, luego anule Discord cuando un flujo de trabajo legítimo necesite más espacio. La precedencia es:

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

    - mantén OpenClaw actualizado (`openclaw update`) para que la lógica de recuperación de recepción de voz de Discord esté presente
    - confirma `channels.discord.voice.daveEncryption=true` (predeterminado)
    - comienza desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado ascendente) y ajusta solo si es necesario
    - observa los registros para:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si los fallos continúan después de la reincorporación automática, recopila los registros y compáralos con el historial de recepción DAVE ascendente en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) y [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Referencia de configuración

Referencia principal: [Referencia de configuración - Discord](/es/gateway/config-channels#discord).

<Accordion title="Campos de Discord de alta señal">

- inicio de sesión/autorización: `enabled`, `token`, `accounts.*`, `allowBots`
- política: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- comando: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- cola de eventos: `eventQueue.listenerTimeout` (presupuesto de escucha), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- puerta de enlace: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- respuesta/historial: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- transmisión: `streaming` (alias heredado: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- medios/reintentos: `mediaMaxMb` (limita las subidas a Discord, por defecto `100MB`), `retry`
- acciones: `actions.*`
- presencia: `activity`, `status`, `activityType`, `activityUrl`
- interfaz de usuario: `ui.components.accentColor`
- características: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## Seguridad y operaciones

- Trate los tokens de bot como secretos (`DISCORD_BOT_TOKEN` es preferible en entornos supervisados).
- Conceda permisos de Discord con el privilegio mínimo.
- Si el estado o despliegue de comandos está obsoleto, reinicie el gateway y verifique nuevamente con `openclaw channels status --probe`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Discord con el gateway.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento del chat grupal y de la lista de permitidos.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Enrutamiento multiagente" icon="sitemap" href="/es/concepts/multi-agent">
    Asignar gremios y canales a agentes.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos.
  </Card>
</CardGroup>
