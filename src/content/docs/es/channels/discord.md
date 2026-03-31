---
summary: "Estado de soporte, capacidades y configuración del bot de Discord"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

Estado: listo para mensajes directos y canales de servidor a través de la puerta de enlace oficial de Discord.

<CardGroup cols={3}>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    Los MD de Discord por defecto están en modo de emparejamiento.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/en/tools/slash-commands">
    Comportamiento de comando nativo y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Flujo de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Deberás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Crear el mío > Para mí y mis amigos**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal para desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **New Application**. Ponle un nombre como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Username** como llames a tu agente de OpenClaw.

  </Step>

  <Step title="Enable privileged intents">
    Aún en la página **Bot**, desplázate hacia abajo hasta **Privileged Gateway Intents** y activa:

    - **Message Content Intent** (obligatorio)
    - **Server Members Intent** (recomendado; obligatorio para las listas de permitidos por rol y la coincidencia de nombre con ID)
    - **Presence Intent** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copy your bot token">
    Vuelve a subir en la página **Bot** y haz clic en **Reset Token**.

    <Note>
    A pesar del nombre, esto genera tu primer token; no se está "restableciendo" nada.
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Bot Token** y lo necesitarás en breve.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos adecuados para añadir el bot a tu servidor.

    Desplázate hacia abajo hasta **OAuth2 URL Generator** y activa:

    - `bot`
    - `applications.commands`

    Aparecerá debajo una sección **Bot Permissions**. Activa:

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (opcional)

    Copia la URL generada en la parte inferior, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    Vuelve a la aplicación de Discord, necesitas habilitar el Modo de desarrollador para poder copiar los ID internos.

    1. Haz clic en **Configuración de usuario** (icono de engranaje junto a tu avatar) → **Avanzado** → activa **Modo de desarrollador**
    2. Haz clic derecho en el **icono del servidor** en la barra lateral → **Copiar ID del servidor**
    3. Haz clic derecho en tu **propio avatar** → **Copiar ID de usuario**

    Guarda tu **ID del servidor** y tu **ID de usuario** junto a tu Token de Bot — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Allow DMs from server members">
    Para que el emparejamiento funcione, Discord debe permitir que tu bot te envíe MD. Haz clic derecho en el **icono del servidor** → **Configuración de privacidad** → activa **Mensajes directos**.

    Esto permite que los miembros del servidor (incluidos los bots) te envíen MD. Mantén esto habilitado si deseas usar los MD de Discord con OpenClaw. Si solo planeas usar canales del servidor, puedes deshabilitar los MD después del emparejamiento.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    El token de tu bot de Discord es un secreto (como una contraseña). Configúralo en la máquina que ejecuta OpenClaw antes de enviar un mensaje a tu agente.

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    Si OpenClaw ya se está ejecutando como un servicio en segundo plano, usa `openclaw gateway restart` en su lugar.

  </Step>

  <Step title="Configure OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente de OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile lo siguiente. Si Discord es tu primer canal, utiliza la pestaña CLI / config en su lugar.

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

        Respaldo de variables de entorno para la cuenta predeterminada:

```bash
DISCORD_BOT_TOKEN=...
```

        Se admiten valores `token` en texto plano. También se admiten valores SecretRef para `channels.discord.token` en los proveedores env/file/exec. Consulta [Secrets Management](/en/gateway/secrets).

      </Tab>
    </Tabs>

  </Step>

  <Step title="Aprobar el primer emparejamiento por DM">
    Espera a que la puerta de enlace esté en ejecución y luego envía un mensaje privado a tu bot en Discord. Responderá con un código de emparejamiento.

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
  La resolución de tokens es consciente de la cuenta. Los valores de token de configuración tienen prioridad sobre la reserva de variables de entorno. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Para llamadas salientes avanzadas (herramienta de mensajes/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto se aplica a acciones de envío y de estilo
  lectura/sondeo (por ejemplo, read/search/fetch/thread/pins/permissions). La configuración de política/reintentos de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor (guild)

Una vez que los DM funcionen, puede configurar su servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo está usted y su bot.

<Steps>
  <Step title="Agrega tu servidor a la lista blanca del gremio">
    Esto permite que tu agente responda en cualquier canal de tu servidor, no solo en mensajes directos.

    <Tabs>
      <Tab title="Pregunta a tu agente">
        > "Agrega mi ID de Servidor de Discord `<server_id>` a la lista blanca del gremio"
      </Tab>
      <Tab title="Configuración">

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
    De forma predeterminada, su agente solo responde en los canales del gremio cuando se le menciona con @. Para un servidor privado, probablemente desee que responda a cada mensaje.

    <Tabs>
      <Tab title="Ask your agent">
        > "Permitir que mi agente responda en este servidor sin tener que ser @mencionado"
      </Tab>
      <Tab title="Config">
        Establezca `requireMention: false` en su configuración de gremio:

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

      </Tab>
    </Tabs>

  </Step>

  <Step title="Planear la memoria en los canales del servidor">
    De forma predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de MD. Los canales del servidor no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        > "Cuando haga preguntas en los canales de Discord, usa memory_search o memory_get si necesitas contexto a largo plazo de MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesitas un contexto compartido en cada canal, pon las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan en cada sesión). Mantén las notas a largo plazo en `MEMORY.md` y accede a ellas bajo demanda con las herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y comienza a chatear. Tu agente puede ver el nombre del canal, y cada canal obtiene su propia sesión aislada, por lo que puedes configurar `#coding`, `#home`, `#research`, o lo que se ajuste a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway es el propietario de la conexión de Discord.
- El enrutamiento de respuestas es determinista: las respuestas entrantes de Discord se devuelven a Discord.
- De forma predeterminada (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales del servidor (Guild channels) son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los mensajes directos grupales se ignoran de forma predeterminada (`channels.discord.dm.groupEnabled=false`).
- Los comandos de barra nativos se ejecutan en sesiones de comando aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras que aún transportan `CommandTargetSessionKey` a la sesión de conversación enrutada.

## Canales del foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al foro principal (`channel:<forumId>`) para crear automáticamente un hilo. El título del hilo utiliza la primera línea no vacía de tu mensaje.
- Usa `openclaw message thread create` para crear un hilo directamente. No pases `--message-id` para los canales de foro.

Ejemplo: enviar al padre del foro para crear un hilo

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Ejemplo: crear explícitamente un hilo de foro

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Los padres de los foros no aceptan componentes de Discord. Si necesitas componentes, envíalos al hilo en sí (`channel:<threadId>`).

## Componentes interactivos

OpenClaw es compatible con contenedores de componentes de Discord v2 para mensajes de agentes. Utiliza la herramienta de mensajes con un payload `components`. Los resultados de las interacciones se enrutan de vuelta al agente como mensajes entrantes normales y siguen la configuración `replyToMode` existente de Discord.

Bloques admitidos:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un menú de selección único
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

De forma predeterminada, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, las selecciones y los formularios se usen varias veces hasta que caduquen.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (ID de usuario de Discord, etiquetas o `*`). Cuando se configura, los usuarios no coincidentes reciben una denegación efímera.

Los comandos de barra `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor y modelo, además de un paso Enviar. La respuesta del selector es efímera y solo el usuario que la invoca puede utilizarla.

Archivos adjuntos:

- Los bloques `file` deben apuntar a una referencia de archivo adjunto (`attachment://<filename>`)
- Proporcione el archivo adjunto mediante `media`/`path`/`filePath` (archivo único); utilice `media-gallery` para varios archivos
- Use `filename` para anular el nombre de carga cuando debería coincidir con la referencia del archivo adjunto

Formularios modales:

- Agregue `components.modal` con hasta 5 campos
- Tipos de campo: `text`, `checkbox`, `radio`, `select`, `role-select`, `user-select`
- OpenClaw añade automáticamente un botón de activación

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
    `channels.discord.dmPolicy` controla el acceso a MD (legado: `channels.discord.dm.policy`):

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `channels.discord.allowFrom` incluya `"*"`; legado: `channels.discord.dm.allowFrom`)
    - `disabled`

    Si la política de MD no está abierta, los usuarios desconocidos son bloqueados (o se les solicita el emparejamiento en modo `pairing`).

    Precedencia de multicuenta:

    - `channels.discord.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propia `allowFrom` no está establecida.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    Formato de destino de MD para entrega:

    - `user:<id>`
    - Mención `<@id>`

    Los IDs numéricos simples son ambiguos y se rechazan a menos que se proporcione un tipo de destino de usuario/canal explícito.

  </Tab>

  <Tab title="Guild policy">
    El manejo de gremios está controlado por `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La base segura cuando `channels.discord` existe es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta el slug)
    - listas de permitidos de remitentes opcionales: `users` (se recomiendan IDs estables) y `roles` (solo IDs de roles); si se configura cualquiera de los dos, se permite a los remitentes cuando coincidan con `users` O `roles`
    - la coincidencia directa de nombre/etiqueta está deshabilitada de forma predeterminada; habilite `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia
    - se admiten nombres/etiquetas para `users`, pero los IDs son más seguros; `openclaw security audit` advierte cuando se usan entradas de nombre/etiqueta
    - si un gremio tiene `channels` configurado, se deniegan los canales no listados
    - si un gremio no tiene un bloque `channels`, se permiten todos los canales en ese gremio permitido

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

    Si solo configura `DISCORD_BOT_TOKEN` y no crea un bloque `channels.discord`, la alternativa en tiempo de ejecución es `groupPolicy="allowlist"` (con una advertencia en los registros), incluso si `channels.defaults.groupPolicy` es `open`.

  </Tab>

  <Tab title="Menciones y MD de grupo">
    Los mensajes de gremio están bloqueados por mención de forma predeterminada.

    La detección de menciones incluye:

    - mención explícita al bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, alternativa `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` opcionalmente descarta mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    MD de grupo:

    - predeterminado: ignorado (`dm.groupEnabled=false`)
    - lista de permitidos opcional vía `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Use `bindings[].match.roles` para enrutar miembros de gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles aceptan solo IDs de rol y se evalúan después de los enlaces de par o par-padre y antes de los enlaces solo de gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

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

## Configuración del Portal para Desarrolladores

<AccordionGroup>
  <Accordion title="Crear app y bot">

    1. Portal para desarrolladores de Discord -> **Aplicaciones** -> **Nueva aplicación**
    2. **Bot** -> **Añadir bot**
    3. Copiar token del bot

  </Accordion>

  <Accordion title="Privileged intents">
    En **Bot -> Privileged Gateway Intents** (Intents de puerta de enlace privilegiados), habilite:

    - Message Content Intent (Intent de contenido de mensajes)
    - Server Members Intent (Intent de miembros del servidor, recomendado)

    Presence intent (Intent de presencia) es opcional y solo se requiere si desea recibir actualizaciones de presencia. Configurar la presencia del bot (`setPresence`) no requiere habilitar las actualizaciones de presencia para los miembros.

  </Accordion>

  <Accordion title="OAuth scopes and baseline permissions">
    Generador de URL OAuth:

    - ámbitos (scopes): `bot`, `applications.commands`

    Permisos base típicos:

    - View Channels (Ver canales)
    - Send Messages (Enviar mensajes)
    - Read Message History (Ver historial de mensajes)
    - Embed Links (Insertar enlaces)
    - Attach Files (Adjuntar archivos)
    - Add Reactions (Añadir reacciones, opcional)

    Evite `Administrator` a menos que sea explícitamente necesario.

  </Accordion>

  <Accordion title="Copy IDs">
    Habilite el Modo de desarrollador de Discord, luego copie:

    - ID del servidor (server ID)
    - ID del canal (channel ID)
    - ID de usuario (user ID)

    Prefiera los IDs numéricos en la configuración de OpenClaw para auditorías y sondas confiables.

  </Accordion>
</AccordionGroup>

## Comandos nativos y autenticación de comandos

- `commands.native` por defecto es `"auto"` y está habilitado para Discord.
- Anulación por canal: `channels.discord.commands.native`.
- `commands.native=false` borra explícitamente los comandos nativos de Discord registrados previamente.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan siendo visibles en la interfaz de usuario de Discord para usuarios que no están autorizados; la ejecución aún hace cumplir la autenticación de OpenClaw y devuelve "no autorizado".

Consulte [Slash commands](/en/tools/slash-commands) para ver el catálogo de comandos y el comportamiento.

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

    Nota: `off` deshabilita el hilado implícito de respuestas. Las etiquetas `[[reply_to_*]]` explícitas aún se respetan.

    Los IDs de mensaje se exponen en el contexto/historial para que los agentes puedan apuntar a mensajes específicos.

  </Accordion>

  <Accordion title="Vista previa de transmisión en vivo">
    OpenClaw puede transmitir respuestas de borrador enviando un mensaje temporal y editándolo a medida que llega el texto.

    - `channels.discord.streaming` controla la transmisión de vista previa (`off` | `partial` | `block` | `progress`, predeterminado: `off`).
    - El valor predeterminado se mantiene en `off` porque las ediciones de vista previa de Discord pueden alcanzar los límites de velocidad rápidamente, especialmente cuando varios bots o puertas de enlace comparten la misma cuenta o el tráfico del gremio.
    - Se acepta `progress` para la coherencia entre canales y se asigna a `partial` en Discord.
    - `channels.discord.streamMode` es un alias heredado y se migra automáticamente.
    - `partial` edita un solo mensaje de vista previa a medida que llegan los tokens.
    - `block` emite fragmentos del tamaño de un borrador (use `draftChunk` para ajustar el tamaño y los puntos de interrupción).

    Ejemplo:

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    Valores predeterminados de fragmentación en modo `block` (limitado a `channels.discord.textChunkLimit`):

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    La transmisión de vista previa es solo de texto; las respuestas multimedia vuelven a la entrega normal.

    Nota: la transmisión de vista previa es independiente de la transmisión de bloques. Cuando la transmisión de bloques está explícitamente
    habilitada para Discord, OpenClaw omite la transmisión de vista previa para evitar la transmisión doble.

  </Accordion>

  <Accordion title="Historial, contexto y comportamiento de los hilos">
    Contexto del historial del gremio:

    - `channels.discord.historyLimit` predeterminado `20`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` deshabilita

    Controles del historial de DM:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportamiento de los hilos:

    - Los hilos de Discord se enrutan como sesiones de canal
    - Los metadatos del hilo principal se pueden usar para el enlace de la sesión principal
    - La configuración del hilo hereda la configuración del canal principal a menos que exista una entrada específica para el hilo

    Los temas del canal se inyectan como contexto **no confiable** (no como mensaje del sistema).

  </Accordion>

  <Accordion title="Sesiones vinculadas a hilos para subagentes">
    Discord puede vincular un hilo a un objetivo de sesión para que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagente).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un objetivo de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la auto-desactivación por inactividad para las vinculaciones enfocadas
    - `/session max-age <duration|off>` inspeccionar/actualizar la antigüedad máxima forzada para las vinculaciones enfocadas

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
        spawnSubagentSessions: false, // opt-in
      },
    },
  },
}
```

    Notas:

    - `session.threadBindings.*` establece los valores predeterminados globales.
    - `channels.discord.threadBindings.*` anula el comportamiento de Discord.
    - `spawnSubagentSessions` debe ser verdadero para crear/vincular automáticamente hilos para `sessions_spawn({ thread: true })`.
    - `spawnAcpSessions` debe ser verdadero para crear/vincular automáticamente hilos para ACP (`/acp spawn ... --thread ...` o `sessions_spawn({ runtime: "acp", thread: true })`).
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas con la vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/en/tools/subagents), [Agentes ACP](/en/tools/acp-agents) y [Referencia de configuración](/en/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Vínculos de canal ACP persistentes">
    Para espacios de trabajo ACP estables "siempre activos", configure vínculos ACP tipados de nivel superior que apunten a conversaciones de Discord.

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

    - `/acp spawn codex --bind here` vincula el canal o hilo de Discord actual en su lugar y mantiene los mensajes futuros enrutados a la misma sesión ACP.
    - Eso aún puede significar "iniciar una nueva sesión de Codex ACP", pero no crea un nuevo hilo de Discord por sí mismo. El canal existente sigue siendo la superficie de chat.
    - Codex aún puede ejecutarse en su propio `cwd` o espacio de trabajo de backend en disco. Ese espacio de trabajo es el estado de ejecución, no un hilo de Discord.
    - Los mensajes de los hilos pueden heredar el vínculo ACP del canal principal.
    - En un canal o hilo vinculado, `/new` y `/reset` restablecen la misma sesión ACP en su lugar.
    - Los vínculos temporales de hilos aún funcionan y pueden anular la resolución del destino mientras están activos.
    - `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear/vincular un hilo secundario a través de `--thread auto|here`. No se requiere para `/acp spawn ... --bind here` en el canal actual.

    Consulte [ACP Agents](/en/tools/acp-agents) para obtener detalles sobre el comportamiento de vinculación.

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
    - respaldo del emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Discord acepta emoji unicode o nombres de emoji personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Escrituras de configuración">
    Las escrituras de configuración iniciadas por el canal están habilitadas por defecto.

    Esto afecta a los flujos de `/config set|unset` (cuando las funciones de comando están habilitadas).

    Desactivar:

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

  <Accordion title="Proxy de puerta de enlace">
    Enruta el tráfico WebSocket de la puerta de enlace de Discord y las búsquedas REST de inicio (ID de aplicación + resolución de lista blanca) a través de un proxy HTTP(S) con `channels.discord.proxy`.

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    Por cuenta:

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

  <Accordion title="Soporte de PluralKit">
    Habilita la resolución de PluralKit para asignar los mensajes con proxy a la identidad del miembro del sistema:

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

    - las listas blancas pueden usar `pk:<memberId>`
    - los nombres para mostrar de los miembros se coinciden por nombre/solo slug cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están restringidas por ventana de tiempo
    - si la búsqueda falla, los mensajes con proxy se tratan como mensajes de bot y se descartan a menos que `allowBots=true`

  </Accordion>

  <Accordion title="Configuración de presencia">
    Las actualizaciones de presencia se aplican cuando configuras un campo de estado o actividad, o cuando activas la presencia automática.

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
    - 4: Personalizado (usa el texto de actividad como el estado; el emoji es opcional)
    - 5: Compitiendo

    Ejemplo de presencia automática (señal de salud de ejecución):

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

    La presencia automática asigna la disponibilidad de ejecución al estado de Discord: saludable => en línea, degradado o desconocido => ausente, agotado o no disponible => no molestar. Sobrescrituras de texto opcionales:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (admite el marcador de posición `{reason}`)

  </Accordion>

  <Accordion title="Aprobaciones de exec en Discord">
    Discord admite aprobaciones de exec basadas en botones en DMs y, opcionalmente, puede publicar mensajes de solicitud de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Cuando `target` es `channel` o `both`, el mensaje de solicitud de aprobación es visible en el canal. Solo los aprobadores configurados pueden usar los botones; otros usuarios reciben una denegación efímera. Los mensajes de solicitud de aprobación incluyen el texto del comando, por lo que solo debe habilitar la entrega al canal en canales confiables. Si no se puede derivar el ID del canal de la clave de sesión, OpenClaw recurre a la entrega por DM.

    La autenticación de Gateway para este controlador utiliza el mismo contrato de resolución de credenciales compartidas que otros clientes de Gateway:

    - autenticación local con prioridad de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` y luego `gateway.auth.*`)
    - en modo local, `gateway.remote.*` se puede utilizar como alternativa solo cuando `gateway.auth.*` no está establecido; las referencias secretas locales configuradas pero no resueltas fallan de forma cerrada
    - soporte en modo remoto a través de `gateway.remote.*` cuando corresponda
    - las anulaciones de URL son seguras frente a anulaciones: las anulaciones de CLI no reutilizan credenciales implícitas y las anulaciones de entorno usan solo credenciales de entorno

    Si las aprobaciones fallan con IDs de aprobación desconocidos, verifique la lista de aprobadores y la habilitación de funciones.

    Documentos relacionados: [Aprobaciones de exec](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Herramientas y puertas de acción

Las acciones de mensaje de Discord incluyen mensajería, administración de canales, moderación, presencia y acciones de metadatos.

Ejemplos principales:

- mensajería: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reacciones: `react`, `reactions`, `emojiList`
- moderación: `timeout`, `kick`, `ban`
- presencia: `setPresence`

Las compuertas de acción (action gates) se encuentran bajo `channels.discord.actions.*`.

Comportamiento de la puerta predeterminado:

| Grupo de acciones                                                                                                                                                             | Predeterminado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| reacciones, mensajes, hilos, fijados, encuestas, búsqueda, memberInfo, roleInfo, channelInfo, canales, voiceStatus, eventos, stickers, emojiUploads, stickerUploads, permisos | habilitado     |
| roles                                                                                                                                                                         | deshabilitado  |
| moderación                                                                                                                                                                    | deshabilitado  |
| presencia                                                                                                                                                                     | deshabilitado  |

## Interfaz de usuario de componentes v2

OpenClaw utiliza componentes de Discord v2 para aprobaciones de ejecución y marcadores de contexto cruzada. Las acciones de mensaje de Discord también pueden aceptar `components` para una interfaz de usuario personalizada (avanzado; requiere instancias de componentes Carbon), mientras que los `embeds` heredados siguen disponibles pero no se recomiendan.

- `channels.discord.ui.components.accentColor` establece el color de acento utilizado por los contenedores de componentes de Discord (hex).
- Configurar por cuenta con `channels.discord.accounts.<id>.ui.components.accentColor`.
- `embeds` se ignoran cuando hay componentes v2 presentes.

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

## Canales de voz

OpenClaw puede unirse a canales de voz de Discord para conversaciones en tiempo real y continuas. Esto es independiente de los archivos adjuntos de mensajes de voz.

Requisitos:

- Habilitar comandos nativos (`commands.native` o `channels.discord.commands.native`).
- Configurar `channels.discord.voice`.
- El bot necesita permisos de Conectar + Hablar en el canal de voz de destino.

Utilice el comando nativo exclusivo de Discord `/vc join|leave|status` para controlar las sesiones. El comando utiliza el agente predeterminado de la cuenta y sigue las mismas reglas de lista de permitidos y políticas de grupo que otros comandos de Discord.

Ejemplo de unión automática:

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

Notas:

- `voice.tts` anula `messages.tts` solo para la reproducción de voz.
- Los turnos de transcripción de voz derivan el estado de propietario de `allowFrom` de Discord (o `dm.allowFrom`); los hablantes que no son propietarios no pueden acceder a herramientas exclusivas del propietario (por ejemplo, `gateway` y `cron`).
- La voz está habilitada de forma predeterminada; configure `channels.discord.voice.enabled=false` para deshabilitarla.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión de `@discordjs/voice`.
- Los valores predeterminados de `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no se establecen.
- OpenClaw también supervisa los fallos de desencriptación de recepción y se recupera automáticamente saliendo y volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta de tiempo.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`, este puede ser el error de recepción de `@discordjs/voice` aguas arriba rastreado en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419).

## Mensajes de voz

Los mensajes de voz de Discord muestran una vista previa de forma de onda y requieren audio OGG/Opus más metadatos. OpenClaw genera la forma de onda automáticamente, pero necesita `ffmpeg` y `ffprobe` disponibles en el host de la puerta de enlace para inspeccionar y convertir archivos de audio.

Requisitos y restricciones:

- Proporcione una **ruta de archivo local** (se rechazan las URL).
- Omita el contenido de texto (Discord no permite texto + mensaje de voz en la misma carga útil).
- Se acepta cualquier formato de audio; OpenClaw convierte a OGG/Opus cuando es necesario.

Ejemplo:

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="Usó intents no permitidos o el bot no ve mensajes del gremio">

    - habilitar el Intent de contenido de mensajes
    - habilitar el Intent de miembros del servidor cuando dependa de la resolución de usuario/miembro
    - reiniciar la puerta de enlace después de cambiar los intents

  </Accordion>

  <Accordion title="Mensajes del servidor bloqueados inesperadamente">

    - verificar `groupPolicy`
    - verificar la lista de permitidos del servidor bajo `channels.discord.guilds`
    - si existe el mapa del servidor `channels`, solo se permiten los canales listados
    - verificar el comportamiento de `requireMention` y los patrones de mención

    Verificaciones útiles:

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Requerir mención es falso pero aún bloqueado">
    Causas comunes:

    - `groupPolicy="allowlist"` sin una lista de permitidos de servidor/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o entrada de canal)
    - remitente bloqueado por la lista de permitidos de `users` de servidor/canal

  </Accordion>

  <Accordion title="Los controladores de larga duración agotan el tiempo de espera o duplican las respuestas">

    Registros típicos:

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    Control del presupuesto de escucha:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - multicuenta: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Control de tiempo de espera de ejecución del trabajador:

    - cuenta única: `channels.discord.inboundWorker.runTimeoutMs`
    - multicuenta: `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - predeterminado: `1800000` (30 minutos); establezca `0` para desactivar

    Línea base recomendada:

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    Use `eventQueue.listenerTimeout` para la configuración de escucha lenta y `inboundWorker.runTimeoutMs`
    solo si desea una válvula de seguridad separada para los turnos del agente en cola.

  </Accordion>

  <Accordion title="Discrepancias en la auditoría de permisos">
    `channels status --probe` las comprobaciones de permisos solo funcionan para IDs de canal numéricos.

    Si usas claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero el sondeo no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD desactivado: `channels.discord.dm.enabled=false`
    - Política de MD desactivada: `channels.discord.dmPolicy="disabled"` (heredado: `channels.discord.dm.policy`)
    - esperando aprobación de emparejamiento en modo `pairing`

  </Accordion>

  <Accordion title="Bucles de bot a bot">
    De forma predeterminada, los mensajes creados por bots se ignoran.

    Si establece `channels.discord.allowBots=true`, use reglas estrictas de mención y lista de permitidos para evitar el comportamiento de bucle.
    Prefiera `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bot que mencionen al bot.

  </Accordion>

  <Accordion title="Caídas de STT de voz con DecryptionFailed(...)">

    - mantenga OpenClaw actualizado (`openclaw update`) para que la lógica de recuperación de recepción de voz de Discord esté presente
    - confirme `channels.discord.voice.daveEncryption=true` (predeterminado)
    - comience desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado ascendente) y ajuste solo si es necesario
    - vigile los registros para:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si las fallas continúan después de la reincorporación automática, recopile los registros y compárelos con [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Discord](/en/gateway/configuration-reference#discord)

Campos de Discord de alta señal:

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (alias heredado: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` limita las cargas salientes de Discord (predeterminado: `8MB`)
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Seguridad y operaciones

- Trate los tokens de bot como secretos (se prefiere `DISCORD_BOT_TOKEN` en entornos supervisados).
- Conceda permisos de Discord con el privilegio mínimo.
- Si el estado/despliegue de comandos está obsoleto, reinicie el gateway y verifíquelo nuevamente con `openclaw channels status --probe`.

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Enrutamiento multiagente](/en/concepts/multi-agent)
- [Solución de problemas](/en/channels/troubleshooting)
- [Comandos de barra](/en/tools/slash-commands)
