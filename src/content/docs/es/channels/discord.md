---
summary: "Estado de soporte del bot de Discord, capacidades y configuración"
read_when:
  - Working on Discord channel features
title: "Discord"
---

Listo para mensajes directos y canales de gremio a través de la puerta de enlace oficial de Discord.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MDs de Discord usan por defecto el modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/es/tools/slash-commands">
    Comportamiento de comandos nativos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/es/channels/troubleshooting">
    Diagnóstico y flujo de reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Necesitarás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Create My Own > For me and my friends**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **New Application**. Ponle un nombre como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Username** como llames a tu agente OpenClaw.

  </Step>

  <Step title="Habilitar intents privilegiados">
    Aún en la página **Bot**, desplázate hacia abajo hasta **Privileged Gateway Intents** y habilita:

    - **Message Content Intent** (obligatorio)
    - **Server Members Intent** (recomendado; necesario para listas de permitidos de roles y coincidencia de nombre con ID)
    - **Presence Intent** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copiar el token de tu bot">
    Vuelve a desplazarte hacia arriba en la página **Bot** y haz clic en **Reset Token**.

    <Note>
    A pesar del nombre, esto genera tu primer token — nada se está "reiniciando".
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Bot Token** y lo necesitarás en breve.

  </Step>

  <Step title="Genera una URL de invitación y añade el bot a tu servidor">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos adecuados para añadir el bot a tu servidor.

    Desplázate hacia abajo hasta **OAuth2 URL Generator** (Generador de URL de OAuth2) y activa:

    - `bot`
    - `applications.commands`

    Aparecerá abajo una sección de **Bot Permissions** (Permisos del bot). Activa al menos:

    **General Permissions** (Permisos generales)
      - View Channels (Ver canales)
    **Text Permissions** (Permisos de texto)
      - Send Messages (Enviar mensajes)
      - Read Message History (Ver historial de mensajes)
      - Embed Links (Insertar enlaces)
      - Attach Files (Adjuntar archivos)
      - Add Reactions (Añadir reacciones) (opcional)

    Este es el conjunto básico para canales de texto normales. Si planeas publicar en hilos de Discord, incluidos los flujos de trabajo de canales de foro o medios que crean o continúan un hilo, activa también **Send Messages in Threads** (Enviar mensajes en hilos).
    Copia la URL generada en la parte inferior, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** (Continuar) para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Activa el Modo Desarrollador y recopila tus ID">
    De vuelta en la aplicación de Discord, necesitas activar el Modo Desarrollador para poder copiar los ID internos.

    1. Haz clic en **User Settings** (Configuración de usuario) (icono de engranaje junto a tu avatar) → **Advanced** (Avanzado) → activa **Developer Mode** (Modo desarrollador)
    2. Haz clic derecho en tu **server icon** (icono del servidor) en la barra lateral → **Copy Server ID** (Copiar ID del servidor)
    3. Haz clic derecho en tu **own avatar** (propio avatar) → **Copy User ID** (Copiar ID de usuario)

    Guarda tu **Server ID** (ID del servidor) y **User ID** (ID de usuario) junto a tu Bot Token — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Permitir mensajes directos de miembros del servidor">
    Para que el emparejamiento funcione, Discord necesita permitir que tu bot te envíe mensajes directos. Haz clic derecho en tu **server icon** (icono del servidor) → **Privacy Settings** (Configuración de privacidad) → activa **Direct Messages** (Mensajes directos).

    Esto permite que los miembros del servidor (incluidos los bots) te envíen mensajes directos. Mantén esto activado si deseas usar los mensajes directos de Discord con OpenClaw. Si solo planeas usar canales de gremio, puedes desactivar los mensajes directos después del emparejamiento.

  </Step>

  <Step title="Establezca su token de bot de forma segura (no lo envíe en el chat)">
    El token de su bot de Discord es un secreto (como una contraseña). Establézcalo en la máquina que ejecuta OpenClaw antes de enviar mensajes a su agente.

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
    Para instalaciones de servicio administrado, ejecute `openclaw gateway install` desde un shell donde esté presente `DISCORD_BOT_TOKEN`, o almacene la variable en `~/.openclaw/.env`, para que el servicio pueda resolver el env SecretRef después del reinicio.
    Si su host está bloqueado o tiene límites de velocidad por la búsqueda de aplicaciones de inicio de Discord, establezca el ID de aplicación/cliente de Discord desde el Portal del desarrollador para que el inicio pueda omitir esa llamada REST. Use `channels.discord.applicationId` para la cuenta predeterminada, o `channels.discord.accounts.<accountId>.applicationId` cuando ejecute varios bots de Discord.

  </Step>

  <Step title="Configurar OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile lo siguiente. Si Discord es tu primer canal, usa la pestaña CLI / config en su lugar.

        > "Ya configuré el token de mi bot de Discord en la configuración. Por favor, termina la configuración de Discord con el ID de usuario `<user_id>` y el ID de servidor `<server_id>`."
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

        Para una configuración programada o remota, escribe el mismo bloque JSON5 con `openclaw config patch --file ./discord.patch.json5 --dry-run` y luego vuelve a ejecutar sin `--dry-run`. Se admiten valores de texto plano `token`. Los valores SecretRef también son compatibles con `channels.discord.token` en los proveedores env/file/exec. Consulte [Secrets Management](/es/gateway/secrets).

        Para múltiples bots de Discord, mantén cada token de bot y ID de aplicación bajo su cuenta. Un `channels.discord.applicationId` de nivel superior es heredado por las cuentas, así que establécelo allí solo cuando cada cuenta deba usar el mismo ID de aplicación.

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

  <Step title="Aprobar el primer emparejamiento por DM">
    Espere a que la puerta de enlace se esté ejecutando y luego envíe un mensaje privado a su bot en Discord. Responderá con un código de emparejamiento.

    <Tabs>
      <Tab title="Pregunte a su agente">
        Envíe el código de emparejamiento a su agente en su canal existente:

        > "Apruebe este código de emparejamiento de Discord: `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Los códigos de emparejamiento caducan después de 1 hora.

    Ahora debería poder chatear con su agente en Discord mediante mensaje privado.

  </Step>
</Steps>

<Note>
  La resolución de tokens es consciente de la cuenta. Los valores de token de configuración tienen prioridad sobre la alternativa de env. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Si dos cuentas de Discord habilitadas resuelven al mismo token de bot, OpenClaw inicia solo un monitor de puerta de enlace para ese token. Un token proveniente de la configuración tiene prioridad
  sobre la alternativa de env predeterminada; de lo contrario, gana la primera cuenta habilitada y la cuenta duplicada se reporta como deshabilitada. Para llamadas salientes avanzadas (herramienta de mensaje/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto aplica a acciones de envío y de lectura/sondeo (por ejemplo, read/search/fetch/thread/pins/permissions). La
  configuración de política/reintentos de la cuenta proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor

Una vez que los MDs funcionen, puedes configurar tu servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo estás tú y tu bot.

<Steps>
  <Step title="Añade tu servidor a la lista de permitidos del gremio">
    Esto habilita a tu agente para responder en cualquier canal de tu servidor, no solo en DMs.

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

  <Step title="Permitir respuestas sin @mención">
    De forma predeterminada, su agente solo responde en los canales del servidor cuando se lo @menciona. Para un servidor privado, probablemente desee que responda a cada mensaje.

    En los canales del servidor, las respuestas normales se publican automáticamente de forma predeterminada. Para salas compartidas que siempre están activas, opte por `messages.groupChat.visibleReplies: "message_tool"` para que el agente pueda estar al acecho y solo publicue cuando decida que una respuesta en el canal es útil. Esto funciona mejor con modelos de última generación y confiables en herramientas como GPT 5.5. Los eventos de sala ambiental permanecen silenciosos a menos que la herramienta los envíe. Consulte [Eventos de sala ambiental](/es/channels/ambient-room-events) para la configuración completa del modo de acecho.

    Si Discord muestra que está escribiendo y los registros muestran uso de tokens pero ningún mensaje publicado, verifique si el turno se configuró como un evento de sala ambiental o si se optó por respuestas visibles de herramienta de mensaje.

    <Tabs>
      <Tab title="Pregúntele a su agente">
        > "Permitir que mi agente responda en este servidor sin tener que ser @mencionado"
      </Tab>
      <Tab title="Config">
        Establezca `requireMention: false` en la configuración de su servidor:

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

        Para requerir envíos de herramienta de mensaje para respuestas visibles de grupo/canal, establezca `messages.groupChat.visibleReplies: "message_tool"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Planificar la memoria en los canales del servidor">
    De forma predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de MD. Los canales del servidor no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Pregúntele a su agente">
        > "Cuando hago preguntas en los canales de Discord, usa memory_search o memory_get si necesitas contexto a largo plazo de MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesita un contexto compartido en cada canal, coloque las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan en cada sesión). Mantenga las notas a largo plazo en `MEMORY.md` y acceda a ellas bajo demanda con herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y comienza a chatear. Tu agente puede ver el nombre del canal, y cada canal obtiene su propia sesión aislada, por lo que puedes configurar `#coding`, `#home`, `#research` o lo que se ajuste a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway posee la conexión de Discord.
- El enrutamiento de respuestas es determinista: las entradas de Discord responden de vuelta a Discord.
- Los metadatos del gremio/canal de Discord se agregan al mensaje del modelo como contexto
  no confiable, no como un prefijo de respuesta visible para el usuario. Si un modelo copia ese
  sobre de vuelta, OpenClaw elimina los metadatos copiados de las respuestas salientes y de
  el contexto de repetición futuro.
- De forma predeterminada (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales de gremio son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los mensajes directos grupales se ignoran de forma predeterminada (`channels.discord.dm.groupEnabled=false`).
- Los comandos de barra nativos se ejecutan en sesiones de comando aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras siguen transportando `CommandTargetSessionKey` a la sesión de conversación enrutada.
- La entrega de anuncios de solo texto de cron/latido a Discord utiliza la respuesta
  final visible para el asistente una sola vez. Las cargas útiles de componentes multimedia y estructurados permanecen
  en varios mensajes cuando el agente emite múltiples cargas entregables.

## Canales de foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al foro principal (`channel:<forumId>`) para crear un hilo automáticamente. El título del hilo usa la primera línea no vacía de tu mensaje.
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

OpenClaw admite contenedores de componentes de Discord v2 para mensajes de agente. Usa la herramienta de mensaje con una carga útil `components`. Los resultados de la interacción se enrutan de vuelta al agente como mensajes entrantes normales y siguen la configuración existente de Discord `replyToMode`.

Bloques compatibles:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un único menú de selección
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

De forma predeterminada, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, las selecciones y los formularios se usen varias veces hasta que caduquen.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (ID de usuario de Discord, etiquetas o `*`). Cuando se configura, los usuarios no coincidentes reciben una denegación efímera.

Las devoluciones de llamada de los componentes caducan después de 30 minutos de forma predeterminada. Establezca `channels.discord.agentComponents.ttlMs` para cambiar la vida útil del registro de devoluciones de llamada para la cuenta de Discord predeterminada, o `channels.discord.accounts.<accountId>.agentComponents.ttlMs` para anular una cuenta en una configuración multicuenta. El valor está en milisegundos, debe ser un entero positivo y tiene un límite de `86400000` (24 horas). Los TTL más largos son útiles para los flujos de trabajo de revisión o aprobación que necesitan que los botones sigan siendo utilizables, pero también extienden la ventana en la que un mensaje antiguo de Discord aún puede desencadenar una acción. Prefiera el TTL más corto que se ajuste al flujo de trabajo y mantenga el valor predeterminado cuando las devoluciones de llamada obsoletas serían sorprendentes.

Los comandos de barra `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor, modelo y tiempo de ejecución compatible, además de un paso de envío. `/models add` está obsoleto y ahora devuelve un mensaje de obsolescencia en lugar de registrar modelos desde el chat. La respuesta del selector es efímera y solo el usuario que la invoca puede usarla. Los menús de selección de Discord están limitados a 25 opciones, por lo que agregue entradas `provider/*` a `agents.defaults.models` cuando desee que el selector muestre modelos descubiertos dinámicamente solo para proveedores seleccionados como `openai-codex` o `vllm`.

Archivos adjuntos:

- Los bloques `file` deben apuntar a una referencia de adjunto (`attachment://<filename>`)
- Proporcione el archivo adjunto a través de `media`/`path`/`filePath` (archivo único); use `media-gallery` para varios archivos
- Use `filename` para anular el nombre de carga cuando debe coincidir con la referencia del adjunto

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
    `channels.discord.dmPolicy` controla el acceso a MD. `channels.discord.allowFrom` es la lista blanca canónica de MD.

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.discord.allowFrom` incluya `"*"`)
    - `disabled`

    Si la política de MD no está abierta, los usuarios desconocidos están bloqueados (o se les solicita emparejamiento en el modo `pairing`).

    Precedencia multicuenta:

    - `channels.discord.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Para una cuenta, `allowFrom` tiene prioridad sobre el legado `dm.allowFrom`.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propio `allowFrom` y el legado `dm.allowFrom` no están configurados.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    El legado `channels.discord.dm.policy` y `channels.discord.dm.allowFrom` aún se leen por compatibilidad. `openclaw doctor --fix` los migra a `dmPolicy` y `allowFrom` cuando puede hacerlo sin cambiar el acceso.

    Formato de destino de MD para entrega:

    - `user:<id>`
    - Mención `<@id>`

    Los IDs numéricos simples normalmente se resuelven como IDs de canal cuando hay un canal predeterminado activo, pero los IDs enumerados en el `allowFrom` de MD efectivo de la cuenta se tratan como objetivos de MD de usuario para compatibilidad.

  </Tab>

  <Tab title="Access groups">
    La autorización de MDs de Discord y comandos de texto puede usar entradas dinámicas de `accessGroup:<name>` en `channels.discord.allowFrom`.

    Los nombres de los grupos de acceso se comparten entre los canales de mensajes. Use `type: "message.senders"` para un grupo estático cuyos miembros se expresan en la sintaxis normal de `allowFrom` de cada canal, o `type: "discord.channelAudience"` cuando la audiencia actual de `ViewChannel` de un canal de Discord debe definir la pertenencia de forma dinámica. El comportamiento de los grupos de acceso compartidos está documentado aquí: [Access groups](/es/channels/access-groups).

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

    Un canal de texto de Discord no tiene una lista de miembros separada. `type: "discord.channelAudience"` modela la pertenencia de la siguiente manera: el remitente del MD es miembro del gremio configurado y actualmente tiene un permiso efectivo de `ViewChannel` en el canal configurado después de que se aplican las sobrescrituras de roles y canales.

    Ejemplo: permitir que cualquiera que pueda ver `#maintainers` envíe MDs al bot, manteniendo los MDs cerrados para todos los demás.

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

    Habilite el **Server Members Intent** del Portal para Desarrolladores de Discord para el bot cuando utilice grupos de acceso de audiencia de canal. Los MDs no incluyen el estado de miembro del gremio, por lo que OpenClaw resuelve el miembro a través de Discord REST en el momento de la autorización.

  </Tab>

  <Tab title="Guild policy">
    El manejo del gremio está controlado por `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La línea base segura cuando `channels.discord` existe es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta el slug)
    - listas de permitidos del remitente opcionales: `users` (se recomiendan IDs estables) y `roles` (solo IDs de roles); si se configura cualquiera de ellos, los remitentes están permitidos cuando coinciden con `users` O `roles`
    - la coincidencia directa de nombre/etiqueta está deshabilitada de forma predeterminada; habilite `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia (break-glass)
    - se admiten nombres/etiquetas para `users`, pero los IDs son más seguros; `openclaw security audit` advierte cuando se usan entradas de nombre/etiqueta
    - si un gremio tiene `channels` configurado, los canales no listados son denegados
    - si un gremio no tiene un bloque `channels`, se permiten todos los canales en ese gremio en la lista de permitidos

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

  <Tab title="Menciones y MDs de grupo">
    Los mensajes del gremio están restringidos por mención de forma predeterminada.

    La detección de menciones incluye:

    - mención explícita al bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    Al escribir mensajes salientes de Discord, utiliza la sintaxis de mención canónica: `<@USER_ID>` para usuarios, `<#CHANNEL_ID>` para canales y `<@&ROLE_ID>` para roles. No utilices el formato de mención de apodo heredado `<@!USER_ID>`.

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` descarta opcionalmente los mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    MDs de grupo:

    - predeterminado: ignorados (`dm.groupEnabled=false`)
    - lista de permitidos opcional vía `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Usa `bindings[].match.roles` para enrutar a los miembros del gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles aceptan solo IDs de roles y se evalúan después de los enlaces de pares o pares principales y antes de los enlaces solo de gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

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

- `commands.native` se establece de forma predeterminada en `"auto"` y está habilitado para Discord.
- Anulación por canal: `channels.discord.commands.native`.
- `commands.native=false` omite el registro y la limpieza de comandos de barra de Discord durante el inicio. Los comandos registrados previamente pueden permanecer visibles en Discord hasta que los elimines de la aplicación de Discord.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan visibles en la interfaz de usuario de Discord para los usuarios que no estén autorizados; la ejecución aún impone la autenticación de OpenClaw y devuelve "no autorizado".

Consulta [Slash commands](/es/tools/slash-commands) para el catálogo y comportamiento de comandos.

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

    Nota: `off` desactiva el hilado de respuesta implícito. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.
    `first` siempre adjunta la referencia de respuesta nativa implícita al primer mensaje saliente de Discord del turno.
    `batched` solo adjunta la referencia de respuesta nativa implícita de Discord cuando el
    evento entrante fue un lote con debouncing de múltiples mensajes. Esto es útil
    cuando desea respuestas nativas principalmente para chats ambiguos y rápidos, no para cada
    turno de mensaje único.

    Los IDs de mensaje se muestran en el contexto/historial para que los agentes puedan dirigirse a mensajes específicos.

  </Accordion>

  <Accordion title="Vistas previas de enlaces">
    Discord genera incrustaciones de enriquecidas de enlaces para las URL de forma predeterminada. OpenClaw suprime esas incrustaciones generadas en los mensajes salientes de Discord de forma predeterminada, por lo que las URL enviadas por el agente se mantienen como enlaces simples a menos que opte por participar:

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Establezca `channels.discord.accounts.<id>.suppressEmbeds` para anular una cuenta. Los envíos de herramientas de mensajes del agente también pueden pasar `suppressEmbeds: false` para un solo mensaje. Las cargas útiles explícitas de `embeds` de Discord no se suprimen con la configuración de vista previa de enlaces predeterminada.

  </Accordion>

  <Accordion title="Vista previa de transmisión en vivo">
    OpenClaw puede transmitir respuestas en borrador enviando un mensaje temporal y editándolo a medida que llega el texto. `channels.discord.streaming` toma `off` | `partial` | `block` | `progress` (predeterminado). `progress` mantiene un borrador de estado editable y lo actualiza con el progreso de la herramienta hasta la entrega final; la etiqueta inicial compartida es una línea continua, por lo que se desplaza como el resto una vez que aparece suficiente trabajo. `streamMode` es un alias de tiempo de ejecución heredado. Ejecute `openclaw doctor --fix` para reescribir la configuración persistente en la clave canónica.

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

    - `partial` edita un solo mensaje de vista previa a medida que llegan los tokens.
    - `block` emite fragmentos de tamaño de borrador (use `draftChunk` para ajustar el tamaño y los puntos de ruptura, limitado a `textChunkLimit`).
    - Los finales multimedia, de error y de respuesta explícita cancelan las ediciones de vista previa pendientes.
    - `streaming.preview.toolProgress` (predeterminado `true`) controla si las actualizaciones de herramienta/progreso reutilizan el mensaje de vista previa.
    - Las filas de herramienta/progreso se representan como emoji + título + detalle compacto cuando está disponible, por ejemplo `🛠️ Bash: run tests` o `🔎 Web Search: for "query"`.
    - `streaming.progress.maxLineChars` controla el presupuesto de vista previa de progreso por línea. La prosa se acorta en los límites de las palabras; los detalles de comando y ruta mantienen sufijos útiles.
    - `streaming.preview.commandText` / `streaming.progress.commandText` controla el detalle de comando/ejecución en líneas de progreso compactas: `raw` (predeterminado) o `status` (solo etiqueta de herramienta).

    Oculte el texto de comando/ejecución sin formato mientras mantiene líneas de progreso compactas:

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

    La transmisión de vista previa es solo de texto; las respuestas multimedia vuelven a la entrega normal. Cuando la transmisión `block` está explícitamente habilitada, OpenClaw omite la transmisión de vista previa para evitar la doble transmisión.

  </Accordion>

  <Accordion title="Historial, contexto y comportamiento de los hilos">
    Contexto del historial del gremio:

    - `channels.discord.historyLimit` predeterminado `20`
    - alternativa (fallback): `messages.groupChat.historyLimit`
    - `0` desactiva

    Controles del historial de MD:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportamiento de los hilos:

    - Los hilos de Discord se enrutan como sesiones de canal y heredan la configuración del canal principal a menos que se anule.
    - Las sesiones de hilo heredan la selección `/model` de nivel de sesión del canal principal como alternativa solo para el modelo; las selecciones `/model` locales del hilo siguen teniendo prioridad y el historial de transcripciones del padre no se copia a menos que la herencia de transcripciones esté habilitada.
    - `channels.discord.thread.inheritParent` (predeterminado `false`) opta por que los nuevos hilos automáticos se inicien con la semilla de la transcripción del padre. Las anulaciones por cuenta se encuentran en `channels.discord.accounts.<id>.thread.inheritParent`.
    - Las reacciones de herramientas de mensajes pueden resolver objetivos de MD `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` se conserva durante la activación alternativa de la etapa de respuesta.

    Los temas de los canales se inyectan como contexto **no confiable**. Las listas de permitidos (allowlists) controlan quién puede activar el agente, no un límite completo de redacción de contexto suplementario.

  </Accordion>

  <Accordion title="Sesiones vinculadas a hilos para subagentes">
    Discord puede vincular un hilo a un objetivo de sesión de modo que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagentes).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un objetivo de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la auto-desactivación por inactividad para vinculaciones enfocadas
    - `/session max-age <duration|off>` inspeccionar/actualizar la antigüedad máxima estricta para vinculaciones enfocadas

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
    - `defaultSpawnContext` controla el contexto nativo del subagente para las apariciones vinculadas a hilos. Predeterminado: `"fork"`.
    - Las claves obsoletas `spawnSubagentSessions`/`spawnAcpSessions` son migradas por `openclaw doctor --fix`.
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas de vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/es/tools/subagents), [Agentes ACP](/es/tools/acp-agents) y [Referencia de configuración](/es/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Vinculaciones de canal ACP persistentes">
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
    - En un canal o hilo vinculado, `/new` y `/reset` restablecen la misma sesión ACP en su lugar. Las vinculaciones temporales de hilos pueden anular la resolución del objetivo mientras estén activas.
    - `spawnSessions` restringe la creación/vinculación de hilos secundarios mediante `--thread auto|here`.

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
    - emoji alternativo de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Discord acepta emoji unicode o nombres de emoji personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Config writes">
    Las escrituras de configuración iniciadas por el canal están habilitadas por defecto.

    Esto afecta a los flujos de `/config set|unset` (cuando las características de comandos están habilitadas).

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
    - los nombres para mostrar de los miembros se comparan por nombre/solo slug cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están restringidas por ventana de tiempo
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
    Las actualizaciones de presencia se aplican cuando configuras un campo de estado o actividad, o cuando habilitas la presencia automática.

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
    - 4: Personalizado (usa el texto de la actividad como el estado; el emoji es opcional)
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
    Discord admite el manejo de aprobaciones basadas en botones en mensajes directos y, opcionalmente, puede publicar solicitudes de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (opcional; recurre a `commands.ownerAllowFrom` cuando sea posible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador, ya sea desde `execApprovals.approvers` o desde `commands.ownerAllowFrom`. Discord no infiere aprobadores de ejecución desde el `allowFrom` del canal, el `dm.allowFrom` heredado o el `defaultTo` de mensaje directo. Establezca `enabled: false` para deshabilitar Discord explícitamente como un cliente de aprobación nativo.

    Para comandos grupales confidenciales solo para propietarios, como `/diagnostics` y `/export-trajectory`, OpenClaw envía solicitudes de aprobación y resultados finales de forma privada. Primero intenta el mensaje directo de Discord cuando el propietario que invoca tiene una ruta de propietario de Discord; si eso no está disponible, recurre a la primera ruta de propietario disponible desde `commands.ownerAllowFrom`, como Telegram.

    Cuando `target` es `channel` o `both`, la solicitud de aprobación es visible en el canal. Solo los aprobadores resueltos pueden usar los botones; otros usuarios reciben una denegación efímera. Las solicitudes de aprobación incluyen el texto del comando, así que habilite la entrega en el canal solo en canales de confianza. Si no se puede derivar el ID del canal desde la clave de sesión, OpenClaw recurre a la entrega por mensaje directo.

    Discord también renderiza los botones de aprobación compartidos que usan otros canales de chat. El adaptador nativo de Discord principalmente añade el enrutamiento por mensaje directo del aprobador y la difusión en el canal.
    Cuando esos botones están presentes, son la experiencia de usuario de aprobación principal; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indica
    que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.
    Si el tiempo de ejecución de aprobación nativo de Discord no está activo, OpenClaw mantiene visible
    la solicitud determinista local `/approve <id> <decision>`. Si el
    tiempo de ejecución está activo pero no se puede entregar una tarjeta nativa a ningún objetivo,
    OpenClaw envía un aviso de reserva en el mismo chat con el comando `/approve` exacto
    de la aprobación pendiente.

    La autenticación de la puerta de enlace y la resolución de aprobaciones siguen el contrato compartido del cliente de la puerta de enlace (los IDs de `plugin:` se resuelven a través de `plugin.approval.resolve`; otros IDs a través de `exec.approval.resolve`). Las aprobaciones caducan después de 30 minutos por defecto.

    Consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

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
          voice: "cedar",
        },
      },
    },
  },
}
```

Notas:

- `voice.tts` anula `messages.tts` solo para la reproducción de voz `stt-tts`. Los modos en tiempo real usan `voice.realtime.voice`.
- `voice.mode` controla la ruta de la conversación. El valor predeterminado es `agent-proxy`: un front-end de voz en tiempo real maneja el tiempo de turno, la interrupción y la reproducción, delega el trabajo sustancial al agente OpenClaw enrutado a través de `openclaw_agent_consult` y trata el resultado como un mensaje de Discord escrito de ese hablante. `stt-tts` mantiene el flujo anterior de STT por lotes más TTS. `bidi` permite que el modelo en tiempo real converse directamente mientras expone `openclaw_agent_consult` para el cerebro de OpenClaw.
- `voice.agentSession` controla qué conversación de OpenClaw recibe los turnos de voz. Déjelo sin establecer para la propia sesión del canal de voz, o establezca `{ mode: "target", target: "channel:<text-channel-id>" }` para hacer que el canal de voz actúe como la extensión de micrófono/altavoz de una sesión de canal de texto de Discord existente, como `#maintainers`.
- `voice.model` anula el cerebro del agente OpenClaw para las respuestas de voz de Discord y consultas en tiempo real. Déjelo sin establecer para heredar el modelo de agente enrutado. Es independiente de `voice.realtime.model`.
- `voice.followUsers` permite que el bot se una, mueva y salga de la voz de Discord con usuarios seleccionados. Consulte [Follow users in voice](#follow-users-in-voice) para ver las reglas de comportamiento y los ejemplos.
- `agent-proxy` enruta el habla a través de `discord-voice`, lo que preserva la autorización normal de propietario/herramienta para el hablante y la sesión de destino, pero oculta la herramienta `tts` del agente porque la voz de Discord es propietaria de la reproducción. De forma predeterminada, `agent-proxy` otorga a la consulta acceso total a herramientas equivalentes al propietario para los hablantes propietarios (`voice.realtime.toolPolicy: "owner"`) y prefiere encarecidamente consultar al agente OpenClaw antes de las respuestas sustantivas (`voice.realtime.consultPolicy: "always"`). En ese modo `always` predeterminado, la capa en tiempo real no habla automáticamente el relleno antes de la respuesta de la consulta; captura y transcribe el habla, y luego pronuncia la respuesta enrutada de OpenClaw. Si terminan varias respuestas de consultas forzadas mientras Discord sigue reproduciendo la primera respuesta, las respuestas posteriores de voz exacta se ponen en cola hasta que la reproducción se detenga en lugar de reemplazar el habla a mitad de una oración.
- En el modo `stt-tts`, STT utiliza `tools.media.audio`; `voice.model` no afecta la transcripción.
- En modos en tiempo real, `voice.realtime.provider`, `voice.realtime.model` y `voice.realtime.voice` configuran la sesión de audio en tiempo real. Para OpenAI Realtime 2 más el cerebro Codex, utilice `voice.realtime.model: "gpt-realtime-2"` y `voice.model: "openai-codex/gpt-5.5"`.
- Los modos de voz en tiempo real incluyen archivos de perfil pequeños de `IDENTITY.md`, `USER.md` y `SOUL.md` en las instrucciones del proveedor en tiempo real de forma predeterminada, para que los turnos directos rápidos mantengan la misma identidad, referencia del usuario y persona que el agente OpenClau enrutado. Establezca `voice.realtime.bootstrapContextFiles` en un subconjunto para personalizar esto, o `[]` para desactivarlo. Los archivos de arranque en tiempo real compatibles se limitan a esos archivos de perfil; `AGENTS.md` permanece en el contexto normal del agente. El contexto del perfil inyectado no reemplaza `openclaw_agent_consult` para el trabajo del espacio de trabajo, datos actuales, búsqueda de memoria o acciones respaldadas por herramientas.
- En el modo en tiempo real de OpenAI `agent-proxy`, configure `voice.realtime.requireWakeName: true` para mantener la voz en tiempo real de Discord en silencio hasta que una transcripción contenga un nombre de activación. Si `voice.realtime.wakeNames` no está establecido, OpenClaw usa el agente enrutado `name` más `OpenClaw`, recurriendo al id del agente más `OpenClaw`. El control por nombre de activación desactiva la respuesta automática del proveedor en tiempo real y dirige los turnos aceptados a través de la ruta de consulta del agente OpenClaw.
- El proveedor en tiempo real de OpenAI acepta los nombres de eventos actuales de Realtime 2 y los alias compatibles con Codex heredados para eventos de audio y transcripción de salida, por lo que las instantáneas del proveedor compatibles pueden desviarse sin perder el audio del asistente.
- `voice.realtime.bargeIn` controla si los eventos de inicio de hablante de Discord interrumpen la reproducción en tiempo real activa. Si no está configurado, sigue la configuración de interrupción de audio de entrada del proveedor en tiempo real.
- `voice.realtime.minBargeInAudioEndMs` controla la duración mínima de reproducción del asistente antes de que una interrupción en tiempo real de OpenAI trunque el audio. Predeterminado: `250`. Establezca `0` para una interrupción inmediata en habitaciones con poco eco, o aumente el valor para configuraciones de altavoces con mucho eco.
- Para una reproducción de voz de OpenAI en Discord, configure `voice.tts.provider: "openai"` y elija una voz de conversión de texto a voz en `voice.tts.openai.voice` o `voice.tts.providers.openai.voice`. `cedar` es una buena opción con sonido masculino en el modelo TTS actual de OpenAI.
- Las anulaciones de Discord `systemPrompt` por canal se aplican a los turnos de transcripción de voz de ese canal de voz.
- Los turnos de transcripción de voz derivan el estado de propietario de Discord `allowFrom` (o `dm.allowFrom`) para comandos restringidos al propietario y acciones de canal. La visibilidad de herramientas del agente sigue la política de herramientas configurada para la sesión enrutada.
- La voz de Discord es opcional para configuraciones de solo texto; establezca `channels.discord.voice.enabled=true` (o mantenga un bloque `channels.discord.voice` existente) para habilitar los comandos `/vc`, el tiempo de ejecución de voz y la intención de puerta de enlace `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` puede anular explícitamente la suscripción de intención de estado de voz. Déjelo sin establecer para que la intención siga la habilitación efectiva de voz.
- Si `voice.autoJoin` tiene múltiples entradas para el mismo gremio, OpenClaw se une al último canal configurado para ese gremio.
- `voice.allowedChannels` es una lista de permitidos de residencia opcional. Déjelo sin establecer para permitir `/vc join` en cualquier canal de voz de Discord autorizado. Cuando se establece, `/vc join`, la unión automática al inicio y los movimientos de estado de voz del bot se restringen a las entradas `{ guildId, channelId }` listadas. Establézcalo en una matriz vacía para denegar todas las uniones de voz de Discord. Si Discord mueve el bot fuera de la lista de permitidos, OpenClaw abandona ese canal y se vuelve a unir al objetivo de unión automática configurado cuando hay uno disponible.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión `@discordjs/voice`.
- Los valores predeterminados `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no se establecen.
- OpenClaw usa de forma predeterminada el decodificador `opusscript` puro de JS para la recepción de voz de Discord. El paquete nativo opcional `@discordjs/opus` es ignorado por la política de instalación de pnpm del repositorio, por lo que las instalaciones normales, los carriles de Docker y las pruebas no relacionadas no compilan un complemento nativo. Los hosts dedicados de rendimiento de voz pueden optar por `OPENCLAW_DISCORD_OPUS_DECODER=native` después de instalar el complemento nativo.
- `voice.connectTimeoutMs` controla la espera inicial `@discordjs/voice` Ready para `/vc join` y los intentos de unión automática. Por defecto: `30000`.
- `voice.reconnectGraceMs` controla cuánto tiempo espera OpenClaw a que una sesión de voz desconectada comience a reconectarse antes de destruirla. Por defecto: `15000`.
- En el modo `stt-tts`, la reproducción de voz no se detiene solo porque otro usuario comienza a hablar. Para evitar bucles de retroalimentación, OpenClaw ignora la nueva captura de voz mientras se reproduce el TTS; hable después de que termine la reproducción para el siguiente turno. Los modos en tiempo real reenvían los inicios de hablante como señales de interrupción al proveedor en tiempo real.
- En los modos en tiempo real, el eco de los altavoces hacia un micrófono abierto puede parecer una interrupción e interrumpir la reproducción. Para salas de Discord con mucho eco, configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false` para evitar que OpenAI se interrumpa automáticamente con el audio de entrada. Agregue `voice.realtime.bargeIn: true` si aún desea que los eventos de inicio de habla de Discord interrumpan la reproducción activa. El puente en tiempo real de OpenAI ignora los truncamientos de reproducción más cortos que `voice.realtime.minBargeInAudioEndMs` como probable eco/ruido y los registra como omitidos en lugar de borrar la reproducción de Discord.
- `voice.captureSilenceGraceMs` controla cuánto tiempo espera OpenClaw después de que Discord informa que un hablante se detuvo antes de finalizar ese segmento de audio para STT. Por defecto: `2500`; aumente esto si Discord divide las pausas normales en transcripciones parciales entrecortadas.
- Cuando ElevenLabs es el proveedor de TTS seleccionado, la reproducción de voz de Discord utiliza TTS continuo (streaming) y comienza desde el flujo de respuesta del proveedor. Los proveedores sin soporte de streaming vuelven a la ruta del archivo temporal sintetizado.
- OpenClaw también monitorea los fallos de desencriptación de recepción y se recupera automáticamente saliendo/volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` después de actualizar, recopile un informe de dependencias y registros. La línea `@discordjs/voice` incluida incluye la solución de relleno (padding) ascendente del PR #11449 de discord.js, que cerró el problema #11419 de discord.js.
- Se esperan eventos de recepción de `The operation was aborted` cuando OpenClaw finaliza un segmento de hablante capturado; son diagnósticos detallados, no advertencias.
- Los registros detallados de voz de Discord incluyen una vista previa delimitada de una línea de la transcripción STT para cada segmento de hablante aceptado, por lo que la depuración muestra tanto el lado del usuario como la respuesta del agente sin volcar texto de transcripción ilimitado.
- En el modo `agent-proxy`, el respaldo de consulta forzada omite fragmentos de transcripción probablemente incompletos, como texto que termina en `...` o un conector final como `and`, además de cierres obviamente no accionables como "enseguida vuelvo" o "adiós". Los registros muestran `forced agent consult skipped reason=...` cuando esto evita una respuesta en cola obsoleta.

### Seguir a usuarios en voz

Use `voice.followUsers` cuando desee que el bot de voz de Discord se mantenga con uno o más usuarios de Discord conocidos en lugar de unirse a un canal fijo al inicio o esperar `/vc join`.

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

- `followUsers` acepta IDs de usuario de Discord sin formato y valores `discord:<id>`. OpenClaw normaliza ambos formularios antes de hacer coincidir los eventos de estado de voz.
- `followUsersEnabled` tiene como valor predeterminado `true` cuando se configura `followUsers`. Establézcalo en `false` para mantener la lista guardada pero detener el seguimiento automático de voz.
- Cuando un usuario seguido se une a un canal de voz permitido, OpenClaw se une a ese canal. Cuando el usuario se mueve, OpenClaw se mueve con él. Cuando el usuario seguido activo se desconecta, OpenClaw se va.
- Si hay varios usuarios seguidos en el mismo gremio y el usuario seguido activo se va, OpenClaw se mueve al canal de otro usuario seguido rastreado antes de abandonar el gremio. Si varios usuarios seguidos se mueven a la vez, gana el último evento de estado de voz observado.
- `allowedChannels` todavía se aplica. Se ignora a un usuario seguido en un canal no permitido y una sesión propiedad de seguimiento se mueve a otro usuario seguido o se va.
- OpenClaw reconcilia los eventos de estado de voz perdidos al inicio y a intervalos limitados. La reconciliación muestrea los gremios configurados y limita las búsquedas REST por ejecución, por lo que las listas `followUsers` muy grandes pueden tardar más de un intervalo en converger.
- Si Discord o un administrador mueve el bot mientras está siguiendo a un usuario, OpenClaw reconstruye la sesión de voz y conserva la propiedad de seguimiento cuando el destino está permitido. Si el bot se mueve fuera de `allowedChannels`, OpenClaw sale y se une de nuevo al objetivo configurado cuando existe uno.
- La recuperación de recepción de DAVE puede salir y volver a unirse al mismo canal después de fallos de descifrado repetidos. Las sesiones propiedad de seguimiento mantienen su propiedad de seguimiento a través de esa ruta de recuperación, por lo que una desconexión posterior del usuario seguido todavía deja el canal.

Elija entre los modos de unión:

- Use `followUsers` para configuraciones personales o de operador donde el bot debe estar automáticamente en voz cuando usted lo está.
- Use `autoJoin` para bots de sala fija que deben estar presentes incluso cuando ningún usuario rastreado está en voz.
- Use `/vc join` para uniones únicas o salas donde la presencia automática de voz sería sorprendente.

Configuración nativa de opus para checkouts de código fuente:

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

Use Node 22 para la puerta de enlace cuando desee el complemento nativo preconstruido ascendente de macOS arm64. Si usa otro tiempo de ejecución de Node, el instalador opcional puede necesitar una cadena de herramientas de compilación de código fuente `node-gyp` local.

Después de instalar el complemento nativo, inicie la Gateway con:

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

Los registros detallados de voz deberían mostrar `discord voice: opus decoder: @discordjs/opus`. Sin la opción de entorno, o si falta el complemento nativo o no se puede cargar en el host, OpenClaw registra `discord voice: opus decoder: opusscript` y sigue recibiendo voz a través de la alternativa pura de JS.

Canalización STT más TTS:

- La captura de PCM de Discord se convierte en un archivo temporal WAV.
- `tools.media.audio` maneja STT, por ejemplo `openai/gpt-4o-mini-transcribe`.
- La transcripción se envía a través de la entrada y enrutamiento de Discord mientras el LLM de respuesta se ejecuta con una política de salida de voz que oculta la herramienta `tts` del agente y pide texto devuelto, porque la voz de Discord posee la reproducción final de TTS.
- `voice.model`, cuando se establece, anula solo el LLM de respuesta para este turno de canal de voz.
- `voice.tts` se fusiona sobre `messages.tts`; los proveedores con capacidad de transmisión alimentan al reproductor directamente, de lo contrario, el archivo de audio resultante se reproduce en el canal unido.

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
          voice: "cedar",
        },
      },
    },
  },
}
```

Sin ningún bloque `voice.agentSession`, cada canal de voz obtiene su propia sesión enrutada de OpenClaw. Por ejemplo, `/vc join channel:234567890123456789` habla con la sesión de ese canal de voz de Discord. El modelo en tiempo real es solo el front-end de voz; las solicitudes sustantivas se entregan al agente OpenClaw configurado. Si el modelo en tiempo real produce una transcripción final sin llamar a la herramienta de consulta, OpenClaw fuerza la consulta como alternativa para que el comportamiento predeterminado siga pareciendo hablar con el agente.

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
          voice: "cedar",
        },
      },
    },
  },
}
```

En el modo `agent-proxy`, el bot se une al canal de voz configurado, pero los turnos del agente OpenClaw usan la sesión enrutada normal y el agente del canal de destino. La sesión de voz en tiempo real devuelve el resultado hablado al canal de voz. El agente supervisor aún puede usar herramientas de mensajes normales según su política de herramientas, incluyendo enviar un mensaje de Discord separado si esa es la acción correcta.

Mientras una ejecución delegada de OpenClaw está activa, las nuevas transcripciones de voz de Discord se tratan como control de ejecución en vivo antes de comenzar otro turno de agente. Frases como "estado", "cancelar eso", "usar la solución más pequeña" o "cuando termines también verifica las pruebas" se clasifican como entrada de estado, cancelación, dirección o seguimiento para la sesión activa. Los resultados de estado, cancelación, dirección aceptada y seguimiento se devuelven hablados al canal de voz para que la persona que llama sepa si OpenClaw manejó la solicitud.

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

Use esto cuando el modelo escuche su propia reproducción de Discord a través de un micrófono abierto, pero aún quieras interrumpirlo hablando. OpenClaw evita que OpenAI se interrumpa automáticamente con el audio de entrada sin procesar, mientras que `bargeIn: true` permite que los eventos de inicio de altavoz de Discord y el audio de altavoz ya activo cancelen las respuestas en tiempo real activas antes de que el siguiente turno capturado llegue a OpenAI. Las señales de intromisión (barge-in) muy tempranas con `audioEndMs` por debajo de `minBargeInAudioEndMs` se tratan como eco/ruido probable y se ignoran para que el modelo no se corte en el primer cuadro de reproducción.

Registros de voz esperados:

- Al unirse: `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Al iniciar en tiempo real: `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- En audio de altavoz: `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` y `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Al omitir voz obsoleta: `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` o `reason=non-actionable-closing ...`
- Al completar la respuesta en tiempo real: `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Al detener/restablecer la reproducción: `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- En consulta en tiempo real: `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Al responder el agente: `discord voice: agent turn answer ...`
- En voz exacta en cola: `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, seguido de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- En la detección de intromisión: `discord voice: realtime barge-in detected source=speaker-start ...` o `discord voice: realtime barge-in detected source=active-speaker-audio ...`, seguido de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- En interrupción en tiempo real: `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, seguido de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` o `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- En eco/ruido ignorado: `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Al desactivar la intromisión: `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- En reproducción inactiva: `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Para depurar el audio cortado, lea los registros de voz en tiempo real como una línea de tiempo:

1. `realtime audio playback started` significa que Discord ha comenzado a reproducir el audio del asistente. A partir de este punto, el puente comienza a contar los fragmentos de salida del asistente, los bytes PCM de Discord, los bytes en tiempo real del proveedor y la duración del audio sintetizado.
2. `realtime speaker turn opened` marca que un altavoz de Discord se ha vuelto activo. Si la reproducción ya está activa y `bargeIn` está habilitado, esto puede ir seguido de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marca el primer cuadro de audio real recibido para ese turno de hablante. `outputActive=true` o un `outputAudioMs` distinto de cero aquí significa que el micrófono está enviando entrada mientras la reproducción del asistente todavía está activa.
4. `barge-in detected source=active-speaker-audio` significa que OpenClaw vio audio de hablante en vivo mientras la reproducción del asistente estaba activa. Esto es útil para distinguir una interrupción real de un evento de inicio de hablante de Discord sin audio útil.
5. `barge-in requested reason=...` significa que OpenClaw pidió al proveedor en tiempo real que cancelara o truncara la respuesta activa. Incluye `outputAudioMs`, `outputActive` y `playbackChunks` para que pueda ver cuánto audio del asistente se había reproducido realmente antes de la interrupción.
6. `realtime audio playback stopped reason=...` es el punto de restablecimiento de la reproducción local de Discord. La razón indica quién detuvo la reproducción: `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` o `session-close`.
7. `realtime speaker turn closed` resume el turno de entrada capturado. `chunks=0` o `hasAudio=false` significa que el turno del hablante se abrió pero no llegó audio utilizable al puente en tiempo real. `interruptedPlayback=true` significa que el turno de entrada se superpuso con la salida del asistente y activó la lógica de interrupción.

Campos útiles:

- `outputAudioMs`: duración del audio del asistente generada por el proveedor en tiempo real antes de la línea de registro.
- `audioMs`: duración del audio del asistente que OpenClaw contó antes de que se detuviera la reproducción.
- `elapsedMs`: tiempo de reloj real entre la apertura y el cierre del flujo de reproducción o del turno del hablante.
- `discordBytes`: bytes PCM estéreo de 48 kHz enviados o recibidos de la voz de Discord.
- `realtimeBytes`: bytes PCM en formato de proveedor enviados o recibidos del proveedor en tiempo real.
- `playbackChunks`: fragmentos de audio del asistente reenviados a Discord para la respuesta activa.
- `sinceLastAudioMs`: brecha entre el último cuadro de audio del hablante capturado y el cierre del turno del hablante.

Patrones comunes:

- Un corte inmediato con `source=active-speaker-audio`, `outputAudioMs` pequeños, y el mismo usuario cerca generalmente indica que el eco del altavoz está entrando en el micrófono. Aumente `voice.realtime.minBargeInAudioEndMs`, baje el volumen del altavoz, use auriculares o configure `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` seguido de `speaker turn closed ... hasAudio=false` significa que Discord informó el inicio de un altavoz pero ningún audio llegó a OpenClaw. Eso puede ser un evento de voz transitorio de Discord, el comportamiento de la puerta de ruido, o un cliente activando brevemente el micrófono.
- `audio playback stopped reason=stream-close` sin una interrupción cercana o `provider-clear-audio` significa que el flujo de reproducción local de Discord terminó inesperadamente. Verifique el proveedor anterior y los registros del reproductor de Discord.
- `capture ignored during playback (barge-in disabled)` significa que OpenClaw descartó intencionalmente la entrada mientras el audio del asistente estaba activo. Habilite `voice.realtime.bargeIn` si desea que el habla interrumpa la reproducción.
- `barge-in ignored ... outputActive=false` significa que el VAD de Discord o del proveedor detectó voz, pero OpenClaw no tenía ninguna reproducción activa que interrumpir. Esto no debería cortar el audio.

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

    - habilite el Intent de Contenido de Mensajes
    - habilite el Intent de Miembros del Servidor cuando dependa de la resolución de usuario/miembro
    - reinicie la puerta de enlace después de cambiar los intents

  </Accordion>

  <Accordion title="Mensajes de guild bloqueados inesperadamente">

    - verificar `groupPolicy`
    - verificar lista blanca de guild bajo `channels.discord.guilds`
    - si existe el mapa `channels` de la guild, solo se permiten los canales listados
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

    - `groupPolicy="allowlist"` sin lista blanca de guild/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o entrada de canal)
    - remitente bloqueado por lista blanca de guild/canal `users`

  </Accordion>

  <Accordion title="Turnos de Discord de larga duración o respuestas duplicadas">

    Registros típicos:

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Perillas de la cola de la puerta de enlace de Discord:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - multicuenta: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - esto solo controla el trabajo de escucha de la puerta de enlace de Discord, no la vida útil del turno del agente

    Discord no aplica un tiempo de espera propiedad del canal a los turnos del agente en cola. Los escuchas de mensajes transfieren inmediatamente y las ejecuciones de Discord en cola preservan el orden por sesión hasta que el ciclo de vida de la sesión/herramienta/tiempo de ejecución completa o aborta el trabajo.

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
    OpenClaw busca metadatos `/gateway/bot` de Discord antes de conectarse. Las fallas transitorias recurren a la URL predeterminada de la puerta de enlace de Discord y están limitadas en frecuencia en los registros.

    Perillas de tiempo de espera de metadatos:

    - cuenta única: `channels.discord.gatewayInfoTimeoutMs`
    - multicuenta: `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - respaldo de entorno cuando la configuración no está establecida: `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - predeterminado: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Reinicios por tiempo de espera de READY de Gateway">
    OpenClaw espera el evento `READY` de la puerta de enlace de Discord durante el inicio y después de las reconexiones en tiempo de ejecución. Las configuraciones de cuentas múltiples con escalonamiento de inicio pueden necesitar una ventana de READY de inicio más larga que la predeterminada.

    Controles de tiempo de espera de READY:

    - inicio de cuenta única: `channels.discord.gatewayReadyTimeoutMs`
    - inicio de cuentas múltiples: `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - respaldo de env al iniciar cuando la configuración no está establecida: `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - inicio predeterminado: `15000` (15 segundos), máximo: `120000`
    - tiempo de ejecución de cuenta única: `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - tiempo de ejecución de cuentas múltiples: `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - respaldo de env en tiempo de ejecución cuando la configuración no está establecida: `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - tiempo de ejecución predeterminado: `30000` (30 segundos), máximo: `120000`

  </Accordion>

  <Accordion title="Discrepancias en la auditoría de permisos">
    Las verificaciones de permisos `channels status --probe` solo funcionan para IDs de canal numéricos.

    Si usa claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero la sonda no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD deshabilitado: `channels.discord.dm.enabled=false`
    - política de MD deshabilitada: `channels.discord.dmPolicy="disabled"` (legado: `channels.discord.dm.policy`)
    - esperando la aprobación de emparejamiento en el modo `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    De forma predeterminada, se ignoran los mensajes creados por bots.

    Si establece `channels.discord.allowBots=true`, use reglas estrictas de mención y lista de permitidos para evitar el comportamiento de bucle.
    Prefiera `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bots que mencionen al bot.

    OpenClaw también incluye una [protección compartida contra bucles de bots](/es/channels/bot-loop-protection). Siempre que `allowBots` permite que los mensajes creados por bots lleguen al despacho, Discord asigna el evento entrante a los hechos `(account, channel, bot pair)` y el guardia de pares genérico suprime el par después de que exceda el presupuesto de eventos configurado. El guardia evita bucles descontrolados de dos bots que anteriormente tenían que ser detenidos por los límites de velocidad de Discord; no afecta a los despliegues de un solo bot ni a las respuestas de un solo uso de bots que se mantengan por debajo del presupuesto.

    Configuración predeterminada (activa cuando `allowBots` está establecido):

    - `maxEventsPerWindow: 20` -- el par de bots puede intercambiar 20 mensajes dentro de la ventana deslizante
    - `windowSeconds: 60` -- longitud de la ventana deslizante
    - `cooldownSeconds: 60` -- una vez que se activa el presupuesto, cada mensaje adicional de bot a bot en cualquier dirección se descarta durante un minuto

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
    - comienza desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado upstream) y ajusta solo si es necesario
    - vigila los registros en busca de:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si los fallos continúan después de la reincorporación automática, recopila los registros y compáralos con el historial de recepción DAVE upstream en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) y [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Referencia de configuración

Referencia principal: [Configuration reference - Discord](/es/gateway/config-channels#discord).

<Accordion title="Campos de Discord de alta señal">

- inicio de sesión/autorización: `enabled`, `token`, `accounts.*`, `allowBots`
- política: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- comando: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- cola de eventos: `eventQueue.listenerTimeout` (presupuesto de escucha), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- puerta de enlace: `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- respuesta/historial: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- entrega: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- transmisión: `streaming` (alias heredado: `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- medios/reintentos: `mediaMaxMb` (limita las cargas de Discord, por defecto `100MB`), `retry`
- acciones: `actions.*`
- presencia: `activity`, `status`, `activityType`, `activityUrl`
- interfaz de usuario: `ui.components.accentColor`
- características: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## Seguridad y operaciones

- Trate los tokens de bot como secretos (`DISCORD_BOT_TOKEN` preferido en entornos supervisados).
- Conceda permisos de Discord con el privilegio mínimo.
- Si el despliegue/estado del comando está obsoleto, reinicie la puerta de enlace y vuelva a verificar con `openclaw channels status --probe`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Emparejar un usuario de Discord con la puerta de enlace.
  </Card>
  <Card title="Grupos" icon="users" href="/es/channels/groups">
    Comportamiento de chat grupal y lista blanca.
  </Card>
  <Card title="Enrutamiento de canales" icon="route" href="/es/channels/channel-routing">
    Enrutar mensajes entrantes a los agentes.
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
