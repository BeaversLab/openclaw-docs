---
summary: "Estado de soporte del bot de Discord, capacidades y configuración"
read_when:
  - Working on Discord channel features
title: "Discord"
---

Listo para mensajes directos y canales de gremio a través de la puerta de enlace oficial de Discord.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MDs de Discord por defecto están en modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Diagnósticos y flujo de reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Necesitarás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Crear el mío > Para mí y mis amigos**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal para Desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **Nueva Aplicación**. Nómbrala algo como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Nombre de usuario** a como llames a tu agente de OpenClaw.

  </Step>

  <Step title="Habilitar intents privilegiados">
    Aún en la página **Bot**, desplázate hacia abajo a **Intents de Gateway Privilegiados** y habilita:

    - **Intent de Contenido de Mensaje** (requerido)
    - **Intent de Miembros del Servidor** (recomendado; requerido para listas de permitidos de roles y coincidencia de nombre a ID)
    - **Intent de Presencia** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copiar tu token de bot">
    Vuelve a subir en la página **Bot** y haz clic en **Restablecer Token**.

    <Note>
    A pesar del nombre, esto genera tu primer token — nada se está "restableciendo".
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Token de Bot** y lo necesitarás en breve.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos correctos para agregar el bot a tu servidor.

    Desplázate hacia abajo hasta **OAuth2 URL Generator** y habilita:

    - `bot`
    - `applications.commands`

    Aparecerá a continuación una sección **Bot Permissions**. Habilita al menos:

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions (opcional)

    Este es el conjunto base para canales de texto normales. Si planeas publicar en hilos de Discord, incluidos los flujos de trabajo de canales de foro o medios que crean o continúan un hilo, también habilita **Send Messages in Threads**.
    Copia la URL generada en la parte inferior, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De vuelta en la aplicación de Discord, debes habilitar el Modo de Desarrollador para poder copiar los IDs internos.

    1. Haz clic en **User Settings** (icono de engranaje junto a tu avatar) → **Advanced** → activa **Developer Mode**
    2. Haz clic derecho en tu **server icon** en la barra lateral → **Copy Server ID**
    3. Haz clic derecho en **own avatar** → **Copy User ID**

    Guarda tu **Server ID** y **User ID** junto con tu Bot Token — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Allow DMs from server members">
    Para que el emparejamiento funcione, Discord debe permitir que tu bot te envíe MD. Haz clic derecho en tu **server icon** → **Privacy Settings** → activa **Direct Messages**.

    Esto permite que los miembros del servidor (incluidos los bots) te envíen MD. Mantén esto habilitado si deseas usar MD de Discord con OpenClaw. Si solo planeas usar canales de gremio, puedes deshabilitar los MD después del emparejamiento.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    El token de tu bot de Discord es un secreto (como una contraseña). Establécelo en la máquina que ejecuta OpenClaw antes de enviar mensajes a tu agente.

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

    Si OpenClaw ya se está ejecutando como un servicio en segundo plano, reinícialo a través de la aplicación Mac de OpenClaw o deteniendo y reiniciando el proceso `openclaw gateway run`.
    Para instalaciones de servicios administrados, ejecuta `openclaw gateway install` desde un shell donde `DISCORD_BOT_TOKEN` esté presente, o almacena la variable en `~/.openclaw/.env`, para que el servicio pueda resolver el env SecretRef después del reinicio.
    Si tu host está bloqueado o tiene límites de velocidad en la búsqueda de aplicaciones de inicio de Discord, establece el ID de aplicación/cliente de Discord desde el Portal para desarrolladores para que el inicio pueda omitir esa llamada REST. Usa `channels.discord.applicationId` para la cuenta predeterminada, o `channels.discord.accounts.<accountId>.applicationId` cuando ejecutes múltiples bots de Discord.

  </Step>

  <Step title="Configurar OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile. Si Discord es tu primer canal, usa la pestaña CLI / config en su lugar.

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

        Para una configuración programada o remota, escribe el mismo bloque JSON5 con `openclaw config patch --file ./discord.patch.json5 --dry-run` y luego vuelve a ejecutarlo sin `--dry-run`. Se admiten valores de texto plano `token`. Los valores SecretRef también son compatibles para `channels.discord.token` a través de proveedores env/file/exec. Consulta [Gestión de secretos](/es/gateway/secrets).

        Para múltiples bots de Discord, mantén cada token de bot e ID de aplicación bajo su cuenta. Un `channels.discord.applicationId` de nivel superior es heredado por las cuentas, así que establécelo allí solo cuando cada cuenta deba usar el mismo ID de aplicación.

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
    Espera hasta que la puerta de enlace se esté ejecutando, luego envía un mensaje privado (DM) a tu bot en Discord. Responderá con un código de emparejamiento.

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
  La resolución de tokens es consciente de la cuenta. Los valores de token de configuración tienen prioridad sobre el respaldo de variables de entorno. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Si dos cuentas de Discord habilitadas se resuelven al mismo token de bot, OpenClaw inicia solo un monitor de puerta de enlace para ese token. Un token originado en la configuración gana
  sobre el respaldo de variables de entorno predeterminado; de lo contrario, gana la primera cuenta habilitada y la cuenta duplicada se reporta como deshabilitada. Para llamadas salientes avanzadas (herramientas de mensaje/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto aplica a acciones de envío y de estilo lectura/sondeo (por ejemplo,
  read/search/fetch/thread/pins/permissions). La configuración de política/reintentos de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor

Una vez que los MDs funcionen, puedes configurar tu servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo estás tú y tu bot.

<Steps>
  <Step title="Agregue su servidor a la lista de permitidos del gremio">
    Esto habilita a su agente para responder en cualquier canal de su servidor, no solo en mensajes directos.

    <Tabs>
      <Tab title="Pregúntele a su agente">
        > "Agregue mi ID de servidor de Discord `<server_id>` a la lista de permitidos del gremio"
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
    De forma predeterminada, su agente solo responde en los canales del gremio cuando es @mencionado. Para un servidor privado, probablemente desee que responda a todos los mensajes.

    En los canales del gremio, las respuestas finales normales del asistente permanecen privadas de forma predeterminada. La salida visible de Discord debe enviarse explícitamente con la herramienta `message`, por lo que el agente puede acechar de forma predeterminada y solo publicar cuando decida que una respuesta en el canal es útil.

    Esto significa que el modelo seleccionado debe llamar a las herramientas de manera confiable. Si Discord muestra que está escribiendo y los registros muestran el uso de tokens pero no hay ningún mensaje publicado, verifique el registro de la sesión para ver el texto del asistente con `didSendViaMessagingTool: false`. Eso significa que el modelo produjo una respuesta final privada en lugar de llamar a `message(action=send)`. Cambie a un modelo de llamada de herramientas más fuerte o use la configuración a continuación para restaurar las respuestas finales automáticas heredadas.

    <Tabs>
      <Tab title="Ask your agent">
        > "Permitir que mi agente responda en este servidor sin tener que ser @mencionado"
      </Tab>
      <Tab title="Config">
        Establezca `requireMention: false` en la configuración de su gremio:

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

        Para restaurar las respuestas finales automáticas heredadas para salas de grupos/canales, establezca `messages.groupChat.visibleReplies: "automatic"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    De forma predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de DM. Los canales del gremio no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > "Cuando haga preguntas en los canales de Discord, use memory_search o memory_get si necesita contexto a largo plazo de MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesita un contexto compartido en cada canal, ponga las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan para cada sesión). Mantenga las notas a largo plazo en `MEMORY.md` y acceda a ellas bajo demanda con herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y comienza a chatear. Tu agente puede ver el nombre del canal y cada canal obtiene su propia sesión aislada, por lo que puedes configurar `#coding`, `#home`, `#research` o lo que se adapte a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway posee la conexión de Discord.
- El enrutamiento de respuestas es determinista: las entradas de Discord responden de vuelta a Discord.
- Los metadatos del gremio/canal de Discord se agregan al mensaje del modelo como contexto
  no confiable, no como un prefijo de respuesta visible para el usuario. Si un modelo copia ese
  sobre de vuelta, OpenClaw elimina los metadatos copiados de las respuestas salientes y de
  el contexto de repetición futuro.
- De forma predeterminada (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales del gremio son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los mensajes directos grupales se ignoran de forma predeterminada (`channels.discord.dm.groupEnabled=false`).
- Los comandos nativos de barra diagonal se ejecutan en sesiones de comandos aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras que todavía llevan `CommandTargetSessionKey` a la sesión de conversación enrutada.
- La entrega de anuncios de solo texto de cron/latido a Discord utiliza la respuesta
  final visible para el asistente una sola vez. Las cargas útiles de componentes multimedia y estructurados permanecen
  en varios mensajes cuando el agente emite múltiples cargas entregables.

## Canales de foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al padre del foro (`channel:<forumId>`) para crear un hilo automáticamente. El título del hilo usa la primera línea no vacía de tu mensaje.
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

Los padres del foro no aceptan componentes de Discord. Si necesitas componentes, envía al hilo en sí mismo (`channel:<threadId>`).

## Componentes interactivos

OpenClaw soporta contenedores de componentes v2 de Discord para mensajes de agente. Usa la herramienta de mensaje con una carga útil `components`. Los resultados de la interacción se enrutan de vuelta al agente como mensajes entrantes normales y siguen la configuración `replyToMode` existente de Discord.

Bloques compatibles:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un único menú de selección
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

De forma predeterminada, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, las selecciones y los formularios se usen varias veces hasta que caduquen.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (ID de usuario de Discord, etiquetas o `*`). Cuando se configura, los usuarios no coincidentes reciben una denegación efímera.

Los comandos de barra `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor, modelo y tiempo de ejecución compatible, además de un paso Enviar. `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat. La respuesta del selector es efímera y solo el usuario que la invoca puede utilizarla. Los menús de selección de Discord están limitados a 25 opciones, por lo que debes añadir entradas `provider/*` a `agents.defaults.models` cuando quieras que el selector muestre modelos descubiertos dinámicamente solo para proveedores seleccionados como `openai-codex` o `vllm`.

Archivos adjuntos:

- Los bloques `file` deben apuntar a una referencia de adjunto (`attachment://<filename>`)
- Proporcione el adjunto a través de `media`/`path`/`filePath` (archivo único); use `media-gallery` para varios archivos
- Use `filename` para anular el nombre de carga cuando debería coincidir con la referencia del adjunto

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
    `channels.discord.dmPolicy` controla el acceso a DM. `channels.discord.allowFrom` es la lista de permitidos de DM canónica.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.discord.allowFrom` incluya `"*"`)
    - `disabled`

    Si la política de DM no está abierta, los usuarios desconocidos están bloqueados (o se les solicita emparejamiento en modo `pairing`).

    Precedencia multicuenta:

    - `channels.discord.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Para una cuenta, `allowFrom` tiene prioridad sobre `dm.allowFrom` heredado.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propio `allowFrom` y `dm.allowFrom` heredado no están configurados.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    El `channels.discord.dm.policy` heredado y `channels.discord.dm.allowFrom` todavía se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    Formato de destino de DM para entrega:

    - `user:<id>`
    - Mención de `<@id>`

    Los IDs numéricos simples normalmente se resuelven como IDs de canal cuando hay un canal predeterminado activo, pero los IDs enumerados en `allowFrom` de DM efectiva de la cuenta se tratan como objetivos de DM de usuario por compatibilidad.

  </Tab>

  <Tab title="Grupos de acceso">
    La autorización de DMs de Discord y comandos de texto puede usar entradas dinámicas de `accessGroup:<name>` en `channels.discord.allowFrom`.

    Los nombres de los grupos de acceso se comparten entre los canales de mensajes. Use `type: "message.senders"` para un grupo estático cuyos miembros se expresan en la sintaxis normal de `allowFrom` de cada canal, o `type: "discord.channelAudience"` cuando la audiencia actual de `ViewChannel` de un canal de Discord debe definir la pertenencia de forma dinámica. El comportamiento de los grupos de acceso compartidos se documenta aquí: [Grupos de acceso](/es/channels/access-groups).

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

    Un canal de texto de Discord no tiene una lista de miembros separada. `type: "discord.channelAudience"` modela la pertenencia como: el remitente del DM es miembro del gremio configurado y actualmente tiene el permiso `ViewChannel` efectivo en el canal configurado después de que se aplican las anulaciones de roles y canales.

    Ejemplo: permitir que cualquiera que pueda ver `#maintainers` envíe DMs al bot, manteniendo los DMs cerrados para todos los demás.

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

    Las búsquedas fallan de forma cerrada. Si Discord devuelve `Missing Access`, falla la búsqueda del miembro o el canal pertenece a un gremio diferente, el remitente del DM se trata como no autorizado.

    Habilite el **Server Members Intent** del Portal para desarrolladores de Discord para el bot cuando use grupos de acceso de audiencia de canal. Los DMs no incluyen el estado de miembro del gremio, por lo que OpenClaw resuelve el miembro a través de Discord REST en el momento de la autorización.

  </Tab>

  <Tab title="Guild policy">
    El manejo de gremios está controlado por `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La línea base segura cuando existe `channels.discord` es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta el slug)
    - listas de permitidos de remitentes opcionales: `users` (se recomiendan IDs estables) y `roles` (solo IDs de roles); si se configura cualquiera de los dos, los remitentes están permitidos cuando coinciden con `users` O `roles`
    - la coincidencia directa de nombre/etiqueta está deshabilitada por defecto; habilite `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia
    - se admiten nombres/etiquetas para `users`, pero los IDs son más seguros; `openclaw security audit` advierte cuando se usan entradas de nombre/etiqueta
    - si un gremio tiene `channels` configurado, se deniegan los canales no listados
    - si un gremio no tiene bloque `channels`, se permiten todos los canales en ese gremio incluido en la lista de permitidos

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

  <Tab title="Menciones y MD de grupo">
    Los mensajes de gremio están restringidos por menciones de forma predeterminada.

    La detección de menciones incluye:

    - mención explícita del bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, reserva `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    Al escribir mensajes salientes de Discord, use la sintaxis de mención canónica: `<@USER_ID>` para usuarios, `<#CHANNEL_ID>` para canales y `<@&ROLE_ID>` para roles. No use el formato de mención de apodo heredado `<@!USER_ID>`.

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` opcionalmente descarta mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    MD de grupo:

    - predeterminado: ignorado (`dm.groupEnabled=false`)
    - lista de permitidos opcional mediante `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Use `bindings[].match.roles` para enrutar miembros de gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles solo aceptan IDs de roles y se evalúan después de los enlaces de par o par-padre y antes de los enlaces solo de gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

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
- `commands.native=false` omite el registro y la limpieza de comandos de barra de Discord durante el inicio. Los comandos registrados previamente pueden permanecer visibles en Discord hasta que los elimine de la aplicación de Discord.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan siendo visibles en la interfaz de usuario de Discord para los usuarios que no están autorizados; la ejecución todavía hace cumplir la autenticación de OpenClaw y devuelve "no autorizado".

Consulte [Slash commands](/es/tools/slash-commands) para ver el catálogo y el comportamiento de los comandos.

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
    turno entrante era un lote con debounce de múltiples mensajes. Esto es útil
    cuando quieres respuestas nativas principalmente para chats ambiguos y explosivos, no para cada
    turno de mensaje único.

    Los IDs de mensaje se muestran en el contexto/historial para que los agentes puedan apuntar a mensajes específicos.

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw puede transmitir respuestas en borrador enviando un mensaje temporal y editándolo a medida que llega el texto. `channels.discord.streaming` acepta `off` | `partial` | `block` | `progress` (predeterminado). `progress` mantiene un borrador de estado editable y lo actualiza con el progreso de la herramienta hasta la entrega final; la etiqueta inicial compartida es una línea continua, por lo que se desplaza como el resto una vez que aparece suficiente trabajo. `streamMode` es un alias de tiempo de ejecución heredado. Ejecute `openclaw doctor --fix` para reescribir la configuración persistida a la clave canónica.

    Establezca `channels.discord.streaming.mode` en `off` para desactivar las ediciones de vista previa de Discord. Si la transmisión por bloques de Discord está explícitamente activada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` edita un único mensaje de vista previa a medida que llegan los tokens.
    - `block` emite fragmentos de tamaño borrador (use `draftChunk` para ajustar el tamaño y los puntos de interrupción, limitado a `textChunkLimit`).
    - Los finales multimedia, de error y de respuesta explícita cancelan las ediciones de vista previa pendientes.
    - `streaming.preview.toolProgress` (predeterminado `true`) controla si las actualizaciones de herramienta/progreso reutilizan el mensaje de vista previa.
    - Las filas de herramienta/progreso se representan como emoji compacto + título + detalle cuando están disponibles, por ejemplo `🛠️ Bash: run tests` o `🔎 Web Search: for "query"`.
    - `streaming.preview.commandText` / `streaming.progress.commandText` controla el detalle de comando/exec en líneas de progreso compactas: `raw` (predeterminado) o `status` (solo etiqueta de herramienta).

    Ocultar el texto de comando/exec sin procesar manteniendo las líneas de progreso compactas:

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

    La transmisión de vista previa es solo de texto; las respuestas multimedia vuelven a la entrega normal. Cuando la transmisión `block` está explícitamente activada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

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
    - Las sesiones de hilo heredan la selección `/model` a nivel de sesión del canal principal como alternativa solo para el modelo; las selecciones `/model` locales del hilo aún tienen prioridad y el historial de transcripciones del padre no se copia a menos que se habilite la herencia de transcripciones.
    - `channels.discord.thread.inheritParent` (predeterminado `false`) opta por que los nuevos hilos automáticos se inicien con la transcripción del padre. Las anulaciones por cuenta se encuentran en `channels.discord.accounts.<id>.thread.inheritParent`.
    - Las reacciones de herramientas de mensajes pueden resolver objetivos de MD `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` se conserva durante la alternativa de activación de la etapa de respuesta.

    Los temas de los canales se inyectan como contexto **no confiable**. Las listas de permitidos controlan quién puede activar el agente, no un límite completo de redacción de contexto complementario.

  </Accordion>

  <Accordion title="Sesiones vinculadas a hilos para subagentes">
    Discord puede vincular un hilo a un objetivo de sesión para que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagente).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un objetivo de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la auto-desactivación por inactividad para las vinculaciones enfocadas
    - `/session max-age <duration|off>` inspeccionar/actualizar la antigüedad máxima estricta para las vinculaciones enfocadas

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
    - `spawnSessions` controla la creación/vinculación automática de hilos para `sessions_spawn({ thread: true })` y las apariciones de hilos de ACP. Predeterminado: `true`.
    - `defaultSpawnContext` controla el contexto nativo de subagente para las apariciones vinculadas a hilos. Predeterminado: `"fork"`.
    - Las claves obsoletas `spawnSubagentSessions`/`spawnAcpSessions` son migradas por `openclaw doctor --fix`.
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas de vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/es/tools/subagents), [Agentes ACP](/es/tools/acp-agents) y [Referencia de configuración](/es/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Vinculaciones de canales ACP persistentes">
    Para espacios de trabajo ACP estables "siempre activos", configure vinculaciones ACP escritas de nivel superior dirigidas a conversaciones de Discord.

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

    - `/acp spawn codex --bind here` vincula el canal o hilo actual en su lugar y mantiene los mensajes futuros en la misma sesión ACP. Los mensajes de hilo heredan la vinculación del canal principal.
    - En un canal o hilo vinculado, `/new` y `/reset` restablecen la misma sesión ACP en su lugar. Las vinculaciones de hilo temporales pueden anular la resolución del objetivo mientras están activas.
    - `spawnSessions` restringe la creación/vinculación de hilos secundarios a través de `--thread auto|here`.

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
    `ackReaction` envía un emoji de acuse de recibo mientras OpenClaw procesa un mensaje entrante.

    Orden de resolución:

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - alternativa de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Discord acepta emoji unicode o nombres de emoji personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes">
    Las escrituras de configuración iniciadas por el canal están habilitadas por defecto.

    Esto afecta a los flujos de `/config set|unset` (cuando las funciones de comando están habilitadas).

    Para desactivar:

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
    Habilite la resolución de PluralKit para asignar los mensajes con proxy a la identidad del miembro del sistema:

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
    - los nombres para mostrar de los miembros coinciden por nombre/solo cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están limitadas por una ventana de tiempo
    - si la búsqueda falla, los mensajes con proxy se tratan como mensajes de bot y se descartan a menos que `allowBots=true`

  </Accordion>

  <Accordion title="Outbound mention aliases">
    Use `mentionAliases` cuando los agentes necesiten menciones de salida deterministas para usuarios de Discord conocidos. Las claves son identificadores sin el `@` inicial; los valores son ID de usuario de Discord. Los identificadores desconocidos, `@everyone`, `@here` y las menciones dentro de los intervalos de código de Markdown se dejan sin cambios.

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

    La presencia automática asigna la disponibilidad en tiempo de ejecución al estado de Discord: saludable => en línea, degradado o desconocido => ausente, agotado o no disponible => no molestar. Anulaciones de texto opcionales:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (admite el marcador de posición `{reason}`)

  </Accordion>

  <Accordion title="Aprobaciones en Discord">
    Discord admite el manejo de aprobaciones basadas en botones en MDs y, opcionalmente, puede publicar mensajes de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (opcional; vuelve a `commands.ownerAllowFrom` cuando sea posible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador, ya sea desde `execApprovals.approvers` o desde `commands.ownerAllowFrom`. Discord no infiere aprobadores de ejecución desde el canal `allowFrom`, el `dm.allowFrom` heredado, o el `defaultTo` de mensaje directo. Establezca `enabled: false` para deshabilitar Discord explícitamente como un cliente de aprobación nativo.

    Para comandos de grupo sensibles solo para el propietario, como `/diagnostics` y `/export-trajectory`, OpenClaw envía mensajes de aprobación y resultados finales de forma privada. Primero intenta el MD de Discord cuando el propietario que invoca tiene una ruta de propietario de Discord; si eso no está disponible, recurre a la primera ruta de propietario disponible desde `commands.ownerAllowFrom`, como Telegram.

    Cuando `target` es `channel` o `both`, el mensaje de aprobación es visible en el canal. Solo los aprobadores resueltos pueden usar los botones; otros usuarios reciben una denegación efímera. Los mensajes de aprobación incluyen el texto del comando, por lo que solo habilite la entrega por canal en canales de confianza. Si no se puede derivar el ID del canal desde la clave de sesión, OpenClaw recurre a la entrega por MD.

    Discord también representa los botones de aprobación compartidos utilizados por otros canales de chat. El adaptador nativo de Discord principalmente agrega el enrutamiento de MD del aprobador y la difusión del canal.
    Cuando esos botones están presentes, son la UX de aprobación principal; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta dice
    que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    Si el tiempo de ejecución de aprobación nativo de Discord no está activo, OpenClaw mantiene
    visible el mensaje determinista local `/approve <id> <decision>`. Si el
    tiempo de ejecución está activo pero no se puede entregar una tarjeta nativa a ningún objetivo,
    OpenClaw envía un aviso de reserva en el mismo chat con el comando exacto `/approve`
    de la aprobación pendiente.

    La autenticación de puerta de enlace y la resolución de aprobaciones siguen el contrato compartido del cliente Gateway (los IDs de `plugin:` se resuelven a través de `plugin.approval.resolve`; otros IDs a través de `exec.approval.resolve`). Las aprobaciones expiran después de 30 minutos por defecto.

    Véase [Aprobaciones de ejecución](/es/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Herramientas y compuertas de acción

Las acciones de mensaje de Discord incluyen mensajería, administración de canales, moderación, presencia y acciones de metadatos.

Ejemplos básicos:

- mensajería: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reacciones: `react`, `reactions`, `emojiList`
- moderación: `timeout`, `kick`, `ban`
- presencia: `setPresence`

La acción `event-create` acepta un parámetro opcional `image` (URL o ruta de archivo local) para establecer la imagen de portada del evento programado.

Las compuertas de acción (action gates) se encuentran bajo `channels.discord.actions.*`.

Comportamiento predeterminado de la compuerta:

| Grupo de acción                                                                                                                                                                | Predeterminado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| reacciones, mensajes, hilos, fijados, encuestas, búsqueda, memberInfo, roleInfo, channelInfo, canales, voiceStatus, eventos, pegatinas, emojiUploads, stickerUploads, permisos | habilitado     |
| roles                                                                                                                                                                          | deshabilitado  |
| moderación                                                                                                                                                                     | deshabilitado  |
| presencia                                                                                                                                                                      | deshabilitado  |

## Interfaz de usuario de componentes v2

OpenClaw utiliza los componentes v2 de Discord para las aprobaciones de ejecución y los marcadores de contexto cruzada. Las acciones de mensaje de Discord también pueden aceptar `components` para una interfaz de usuario personalizada (avanzado; requiere construir una carga útil de componente a través de la herramienta de discord), mientras que los `embeds` heredados siguen disponibles pero no se recomiendan.

- `channels.discord.ui.components.accentColor` establece el color de acento utilizado por los contenedores de componentes de Discord (hex).
- Establecer por cuenta con `channels.discord.accounts.<id>.ui.components.accentColor`.
- Se ignoran los `embeds` cuando están presentes los componentes v2.

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

1. Habilitar el Intent de contenido de mensajes (Message Content Intent) en el Portal para desarrolladores de Discord.
2. Habilitar el Intent de miembros del servidor (Server Members Intent) cuando se utilizan listas de permitidos (allowlists) de roles/usuarios.
3. Invitar al bot con los alcances `bot` y `applications.commands`.
4. Conceder Connect, Speak, Send Messages y Read Message History en el canal de voz de destino.
5. Habilita los comandos nativos (`commands.native` o `channels.discord.commands.native`).
6. Configura `channels.discord.voice`.

Usa `/vc join|leave|status` para controlar las sesiones. El comando utiliza el agente predeterminado de la cuenta y sigue las mismas reglas de lista de permitidos y políticas de grupo que otros comandos de Discord.

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
- `voice.mode` controla la ruta de la conversación. El valor predeterminado es `agent-proxy`: un frente de voz en tiempo real maneja el tiempo de turno, la interrupción y la reproducción, delega el trabajo sustancial al agente OpenClaw enrutado a través de `openclaw_agent_consult`, y trata el resultado como un mensaje de Discord escrito de ese hablante. `stt-tts` mantiene el flujo anterior de STT por lotes más TTS. `bidi` permite que el modelo en tiempo real converse directamente mientras expone `openclaw_agent_consult` para el cerebro de OpenClaw.
- `voice.agentSession` controla qué conversación de OpenClaw recibe los turnos de voz. Déjalo sin configurar para la propia sesión del canal de voz, o establece `{ mode: "target", target: "channel:<text-channel-id>" }` para hacer que el canal de voz actúe como la extensión de micrófono/altavoz de una sesión existente del canal de texto de Discord, como `#maintainers`.
- `voice.model` anula el cerebro del agente OpenClaw para las respuestas de voz de Discord y las consultas en tiempo real. Déjalo sin establecer para heredar el modelo del agente enrutado. Es independiente de `voice.realtime.model`.
- `agent-proxy` enruta el discurso a través de `discord-voice`, lo cual preserva la autorización normal de propietario/herramienta para el hablante y la sesión de destino, pero oculta la herramienta `tts` del agente porque la voz de Discord posee la reproducción. De forma predeterminada, `agent-proxy` otorga a la consulta acceso completo a herramientas equivalente al propietario para los hablantes propietarios (`voice.realtime.toolPolicy: "owner"`) y prefiere encarecidamente consultar al agente OpenClaw antes de respuestas sustantivas (`voice.realtime.consultPolicy: "always"`). En ese modo `always` predeterminado, la capa en tiempo real no habla automáticamente relleno antes de la respuesta de la consulta; captura y transcribe el habla, y luego pronuncia la respuesta OpenClaw enrutada. Si finalizan múltiples respuestas de consulta forzadas mientras Discord sigue reproduciendo la primera respuesta, las respuestas de habla exacta posteriores se ponen en cola hasta que la reproducción esté inactiva en lugar de reemplazar el habla a media frase.
- En el modo `stt-tts`, STT utiliza `tools.media.audio`; `voice.model` no afecta la transcripción.
- En los modos en tiempo real, `voice.realtime.provider`, `voice.realtime.model` y `voice.realtime.voice` configuran la sesión de audio en tiempo real. Para OpenAI Realtime 2 más el cerebro Codex, use `voice.realtime.model: "gpt-realtime-2"` y `voice.model: "openai-codex/gpt-5.5"`.
- El proveedor en tiempo real de OpenAI acepta los nombres de eventos actuales de Realtime 2 y los alias heredados compatibles con Codex para eventos de audio y transcripción de salida, por lo que las instantáneas de proveedores compatibles pueden derivarse sin perder el audio del asistente.
- `voice.realtime.bargeIn` controla si los eventos de inicio de habla de Discord interrumpen la reproducción en tiempo real activa. Si no está establecido, sigue la configuración de interrupción de audio de entrada del proveedor en tiempo real.
- `voice.realtime.minBargeInAudioEndMs` controla la duración mínima de reproducción del asistente antes de que una interrupción en tiempo real de OpenAI trunque el audio. Predeterminado: `250`. Establezca `0` para una interrupción inmediata en salas con poco eco, o aumente el valor para configuraciones de hablante con mucho eco.
- Para una voz de OpenAI en la reproducción de Discord, establezca `voice.tts.provider: "openai"` y elija una voz de conversión de texto a voz en `voice.tts.openai.voice` o `voice.tts.providers.openai.voice`. `cedar` es una buena opción con sonido masculino en el modelo TTS actual de OpenAI.
- Las anulaciones de `systemPrompt` de Discord por canal se aplican a los turnos de transcripción de voz de ese canal de voz.
- Los turnos de transcripción de voz derivan el estado de propietario de `allowFrom` de Discord (o `dm.allowFrom`); los hablantes que no son propietarios no pueden acceder a herramientas exclusivas del propietario (por ejemplo, `gateway` y `cron`).
- La voz de Discord es opcional para las configuraciones de solo texto; establezca `channels.discord.voice.enabled=true` (o mantenga un bloque `channels.discord.voice` existente) para habilitar los comandos `/vc`, el tiempo de ejecución de voz y la intención de puerta de enlace `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` puede anular explícitamente la suscripción a la intención de estado de voz. Déjelo sin establecer para que la intención siga la habilitación efectiva de voz.
- Si `voice.autoJoin` tiene múltiples entradas para el mismo gremio, OpenClaw se une al último canal configurado para ese gremio.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión de `@discordjs/voice`.
- Los valores predeterminados de `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no están establecidos.
- OpenClaw utiliza de forma predeterminada el decodificador `opusscript` puramente JS para la recepción de voz de Discord. El paquete nativo opcional `@discordjs/opus` es ignorado por la política de instalación pnpm del repositorio, por lo que las instalaciones y pruebas normales no compilan un complemento nativo; solo se opta por una compilación opus nativa en un entorno dedicado de rendimiento de voz o canal en vivo.
- `voice.connectTimeoutMs` controla la espera inicial de `@discordjs/voice` Ready para `/vc join` y los intentos de unión automática. Predeterminado: `30000`.
- `voice.reconnectGraceMs` controla cuánto tiempo espera OpenClaw a que una sesión de voz desconectada comience a reconectarse antes de destruirla. Predeterminado: `15000`.
- En el modo `stt-tts`, la reproducción de voz no se detiene solo porque otro usuario empieza a hablar. Para evitar bucles de retroalimentación, OpenClaw ignora la nueva captura de voz mientras se reproduce el TTS; hable después de que finalice la reproducción para el siguiente turno. Los modos en tiempo real reenvían el inicio de los hablantes como señales de interrupción al proveedor en tiempo real.
- En modos en tiempo real, el eco de los altavoces hacia un micrófono abierto puede parecer una interrupción e interrumpir la reproducción. Para salas de Discord con mucho eco, configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` para evitar que OpenAI se interrumpa automáticamente con el audio de entrada. Agregue `voice.realtime.bargeIn: true` si aún desea que los eventos de inicio de altavoz de Discord interrumpan la reproducción activa. El puente en tiempo real de OpenAI ignora los truncamientos de reproducción más cortos que `voice.realtime.minBargeInAudioEndMs` como probable eco/ruido y los registra como omitidos en lugar de borrar la reproducción de Discord.
- `voice.captureSilenceGraceMs` controla cuánto tiempo espera OpenClaw después de que Discord informa que un altavoz se ha detenido antes de finalizar ese segmento de audio para STT. Predeterminado: `2500`; aumente esto si Discord divide las pausas normales en transcripciones parciales entrecortadas.
- Cuando ElevenLabs es el proveedor de TTS seleccionado, la reproducción de voz de Discord utiliza TTS continuo (streaming) y comienza desde el flujo de respuesta del proveedor. Los proveedores sin soporte de transmisión vuelven a la ruta del archivo temporal sintetizado.
- OpenClaw también monitorea los fallos de desencriptación de recepción y se recupera automáticamente saliendo/volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` después de actualizar, recopile un informe de dependencias y registros. La línea `@discordjs/voice` incluida incluye la corrección de relleno (padding) ascendente de discord.js PR #11449, que cerró el problema discord.js #11419.
- Los eventos de recepción `The operation was aborted` se esperan cuando OpenClaw finaliza un segmento de altavoz capturado; son diagnósticos detallados, no advertencias.
- Los registros de voz detallados de Discord incluyen una vista previa de transcripción STT de una sola línea delimitada para cada segmento de hablante aceptado, por lo que la depuración muestra tanto el lado del usuario como el lado de respuesta del agente sin volcar texto de transcripción ilimitado.

Canalización de STT más TTS:

- La captura de PCM de Discord se convierte en un archivo temporal WAV.
- `tools.media.audio` maneja el STT, por ejemplo `openai/gpt-4o-mini-transcribe`.
- La transcripción se envía a través del ingreso y enrutamiento de Discord mientras se ejecuta el LLM de respuesta con una política de salida de voz que oculta la herramienta `tts` del agente y solicita texto devuelto, porque la voz de Discord posee la reproducción final de TTS.
- `voice.model`, cuando se establece, anula solo el LLM de respuesta para este turno de canal de voz.
- `voice.tts` se fusiona sobre `messages.tts`; los proveedores con capacidad de transmisión alimentan al reproductor directamente; de lo contrario, el archivo de audio resultante se reproduce en el canal unido.

Ejemplo de sesión de canal de voz de proxy de agente predeterminado:

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

Sin ningún bloque `voice.agentSession`, cada canal de voz obtiene su propia sesión OpenClaw enrutada. Por ejemplo, `/vc join channel:234567890123456789` habla con la sesión para ese canal de voz de Discord. El modelo en tiempo real es solo el front-end de voz; las solicitudes sustantivas se entregan al agente OpenClaw configurado. Si el modelo en tiempo real produce una transcripción final sin llamar a la herramienta de consulta, OpenClaw fuerza la consulta como alternativa para que el comportamiento predeterminado siga pareciendo que se habla con el agente.

Ejemplo heredado de STT más TTS:

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

En el modo `agent-proxy`, el bot se une al canal de voz configurado, pero los turnos del agente OpenClaw usan la sesión y el agente enrutados normales del canal de destino. La sesión de voz en tiempo real habla el resultado devuelto en el canal de voz. El agente supervisor aún puede usar herramientas de mensaje normales según su política de herramientas, incluido el envío de un mensaje de Discord separado si esa es la acción correcta.

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

Úsalo cuando el modelo escuche su propia reproducción de Discord a través de un micrófono abierto, pero aún quieras interrumpirlo hablando. OpenClaw evita que OpenAI se auto-interrumpa con el audio de entrada sin procesar, mientras que `bargeIn: true` permite que los eventos de inicio de altavoz de Discord y el audio del altavoz ya activo cancelen las respuestas en tiempo real activas antes de que el siguiente turno capturado llegue a OpenAI. Las señales de interrupción muy tempranas con `audioEndMs` por debajo de `minBargeInAudioEndMs` se tratan como probable eco/ruido y se ignoran para que el modelo no se corte en el primer cuadro de reproducción.

Registros de voz esperados:

- Al unirse: `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Al iniciar en tiempo real: `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- En el audio del altavoz: `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` y `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Al completar la respuesta en tiempo real: `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Al detener/restablecer la reproducción: `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- En la consulta en tiempo real: `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- En la respuesta del agente: `discord voice: agent turn answer ...`
- En el discurso exacto en cola: `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, seguido de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- En la detección de interrupción: `discord voice: realtime barge-in detected source=speaker-start ...` o `discord voice: realtime barge-in detected source=active-speaker-audio ...`, seguido de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- En la interrupción en tiempo real: `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, seguido de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` o `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- En eco/ruido ignorado: `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- En interrupción deshabilitada: `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- En reproducción inactiva: `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Para depurar el audio cortado, lee los registros de voz en tiempo real como una línea de tiempo:

1. `realtime audio playback started` significa que Discord ha comenzado a reproducir el audio del asistente. El puente comienza a contar los fragmentos de salida del asistente, los bytes PCM de Discord, los bytes en tiempo real del proveedor y la duración del audio sintetizado desde este punto.
2. `realtime speaker turn opened` marca que un altavoz de Discord se ha vuelto activo. Si la reproducción ya está activa y `bargeIn` está habilitado, esto puede ir seguido de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marca el primer cuadro de audio real recibido para ese turno de hablante. `outputActive=true` o un `outputAudioMs` distinto de cero aquí significa que el micrófono está enviando entrada mientras la reproducción del asistente aún está activa.
4. `barge-in detected source=active-speaker-audio` significa que OpenClaw vio audio en vivo del hablante mientras la reproducción del asistente estaba activa. Esto es útil para distinguir una interrupción real de un evento de inicio de hablante de Discord sin audio útil.
5. `barge-in requested reason=...` significa que OpenClaw pidió al proveedor en tiempo real que cancelara o truncara la respuesta activa. Incluye `outputAudioMs`, `outputActive` y `playbackChunks` para que puedas ver cuánto audio del asistente se había reproducido realmente antes de la interrupción.
6. `realtime audio playback stopped reason=...` es el punto de restablecimiento de la reproducción local de Discord. La razón indica quién detuvo la reproducción: `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` o `session-close`.
7. `realtime speaker turn closed` resume el turno de entrada capturado. `chunks=0` o `hasAudio=false` significa que el turno del hablante se abrió pero no llegó audio útil al puente en tiempo real. `interruptedPlayback=true` significa que el turno de entrada se superpuso a la salida del asistente y activó la lógica de interrupción.

Campos útiles:

- `outputAudioMs`: duración del audio del asistente generada por el proveedor en tiempo real antes de la línea de registro.
- `audioMs`: duración del audio del asistente que OpenClaw contó antes de que se detuviera la reproducción.
- `elapsedMs`: tiempo de reloj entre la apertura y el cierre del flujo de reproducción o el turno del hablante.
- `discordBytes`: bytes de PCM estéreo a 48 kHz enviados o recibidos de la voz de Discord.
- `realtimeBytes`: bytes de PCM en formato de proveedor enviados o recibidos del proveedor en tiempo real.
- `playbackChunks`: fragmentos de audio del asistente reenviados a Discord para la respuesta activa.
- `sinceLastAudioMs`: brecha entre el último cuadro de audio del hablante capturado y el cierre del turno del hablante.

Patrones comunes:

- Una interrupción inmediata con `source=active-speaker-audio`, `outputAudioMs` pequeño y el mismo usuario cerca, generalmente indica que el eco del altavoz está entrando en el micrófono. Aumente `voice.realtime.minBargeInAudioEndMs`, baje el volumen del altavoz, use auriculares o configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` seguido de `speaker turn closed ... hasAudio=false` significa que Discord informó el inicio de un altavoz, pero ningún audio llegó a OpenClaw. Eso puede ser un evento de voz de Discord transitorio, el comportamiento de la puerta de ruido (noise gate) o un cliente activando brevemente el micrófono.
- `audio playback stopped reason=stream-close` sin una interrupción (barge-in) cercana o `provider-clear-audio` significa que el flujo de reproducción local de Discord terminó inesperadamente. Verifique el proveedor precedente y los registros del reproductor de Discord.
- `capture ignored during playback (barge-in disabled)` significa que OpenClaw descartó intencionalmente la entrada mientras el audio del asistente estaba activo. Habilite `voice.realtime.bargeIn` si desea que el habla interrumpa la reproducción.
- `barge-in ignored ... outputActive=false` significa que el VAD de Discord o del proveedor detectó voz, pero OpenClaw no tenía reproducción activa que interrumpir. Esto no debería cortar el audio.

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
  <Accordion title="Usó intents no permitidos o el bot no ve mensajes del servidor">

    - habilitar el Intent de contenido de mensajes (Message Content Intent)
    - habilitar el Intent de miembros del servidor (Server Members Intent) cuando dependa de la resolución de usuario/miembro
    - reiniciar la puerta de enlace después de cambiar los intents

  </Accordion>

  <Accordion title="Mensajes de gremio bloqueados inesperadamente">

    - verificar `groupPolicy`
    - verificar la lista blanca del gremio en `channels.discord.guilds`
    - si existe el mapa `channels` del gremio, solo se permiten los canales listados
    - verificar el comportamiento `requireMention` y los patrones de mención

    Verificaciones útiles:

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Requerir mención es falso pero sigue bloqueado">
    Causas comunes:

    - `groupPolicy="allowlist"` sin lista blanca de gremio/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o entrada de canal)
    - remitente bloqueado por la lista blanca de gremio/canal `users`

  </Accordion>

  <Accordion title="Turnos de Discord de larga duración o respuestas duplicadas">

    Registros típicos:

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Controles de cola de la puerta de enlace de Discord:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - multicuenta: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - esto solo controla el trabajo del oyente de la puerta de enlace de Discord, no la vida útil del turno del agente

    Discord no aplica un tiempo de espera propiedad del canal a los turnos del agente en cola. Los oyentes de mensajes transfieren inmediatamente y las ejecuciones de Discord en cola preservan el orden por sesión hasta que el ciclo de vida de la sesión/herramienta/ejecución completa o aborta el trabajo.

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
    OpenClaw recupera los metadatos `/gateway/bot` de Discord antes de conectarse. Las fallas transitorias vuelven a la URL de la puerta de enlace predeterminada de Discord y tienen límites de velocidad en los registros.

    Controles de tiempo de espera de metadatos:

    - cuenta única: `channels.discord.gatewayInfoTimeoutMs`
    - multicuenta: `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - respaldo de entorno cuando la configuración no está establecida: `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - predeterminado: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Reinicios por tiempo de espera de READY de Gateway">
    OpenClaw espera el evento `READY` del gateway de Discord durante el inicio y después de las reconexiones en tiempo de ejecución. Las configuraciones multicuenta con escalonamiento de inicio pueden necesitar una ventana de inicio READY más larga que la predeterminada.

    Controles de tiempo de espera READY:

    - inicio de cuenta única: `channels.discord.gatewayReadyTimeoutMs`
    - inicio multicuenta: `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - respaldo de entorno al inicio si la configuración no está establecida: `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - inicio predeterminado: `15000` (15 segundos), máx: `120000`
    - tiempo de ejecución de cuenta única: `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - tiempo de ejecución multicuenta: `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - respaldo de entorno en tiempo de ejecución si la configuración no está establecida: `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - tiempo de ejecución predeterminado: `30000` (30 segundos), máx: `120000`

  </Accordion>

  <Accordion title="Discrepancias en la auditoría de permisos">
    Las verificaciones de permisos `channels status --probe` solo funcionan para IDs de canal numéricos.

    Si usa claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero el sondeo no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD deshabilitado: `channels.discord.dm.enabled=false`
    - política de MD deshabilitada: `channels.discord.dmPolicy="disabled"` (heredado: `channels.discord.dm.policy`)
    - esperando la aprobación de emparejamiento en modo `pairing`

  </Accordion>

  <Accordion title="Bucles de bot a bot">
    De forma predeterminada, se ignoran los mensajes creados por bots.

    Si establece `channels.discord.allowBots=true`, use reglas estrictas de mención y lista de permitidos para evitar el comportamiento de bucle.
    Prefiera `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bots que mencionan al bot.

```json5
{
  channels: {
    discord: {
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write "@Mantis" and send a real Discord mention.
            Mantis: "MANTIS_DISCORD_USER_ID",
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
    - comience desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado upstream) y ajuste solo si es necesario
    - observe los registros para:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si los fallos continúan después de la reunión automática, recopile los registros y compárelos con el historial de recepción de DAVE upstream en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) y [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Referencia de configuración

Referencia principal: [Referencia de configuración - Discord](/es/gateway/config-channels#discord).

<Accordion title="Campos de Discord de alta señal">

- inicio de sesión/autenticación: `enabled`, `token`, `accounts.*`, `allowBots`
- política: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- comando: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- cola de eventos: `eventQueue.listenerTimeout` (presupuesto de escucha), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- puerta de enlace: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- respuesta/historial: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- transmisión: `streaming` (alias heredado: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- medios/reintentos: `mediaMaxMb` (limita las cargas de salida de Discord, valor predeterminado `100MB`), `retry`
- acciones: `actions.*`
- presencia: `activity`, `status`, `activityType`, `activityUrl`
- interfaz de usuario: `ui.components.accentColor`
- características: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## Seguridad y operaciones

- Trate los tokens de bot como secretos (`DISCORD_BOT_TOKEN` es preferido en entornos supervisados).
- Concede permisos de Discord con el privilegio mínimo.
- Si el despliegue/estado del comando está obsoleto, reinicie la puerta de enlace y vuelva a verificar con `openclaw channels status --probe`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Discord con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de chat grupal y lista de permitidos.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a los agentes.
  </Card>
  <Card title="Seguridad" icon="shield" href="/es/gateway/security">
    Modelo de amenazas y endurecimiento.
  </Card>
  <Card title="Enrutamiento multiagente" icon="sitemap" href="/es/concepts/multi-agent">
    Asignar gremios y canales a los agentes.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos.
  </Card>
</CardGroup>
