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
    Los MD de Discord están en modo de emparejamiento por defecto.
  </Card>
  <Card title="Comandos de barra" icon="terminal" href="/en/tools/slash-commands">
    Comportamiento de comandos nativos y catálogo de comandos.
  </Card>
  <Card title="Solución de problemas del canal" icon="wrench" href="/en/channels/troubleshooting">
    Flujo de diagnóstico y reparación entre canales.
  </Card>
</CardGroup>

## Configuración rápida

Necesitarás crear una nueva aplicación con un bot, añadir el bot a tu servidor y emparejarlo con OpenClaw. Recomendamos añadir tu bot a tu propio servidor privado. Si aún no tienes uno, [crea uno primero](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (elige **Crear el mío > Para mí y mis amigos**).

<Steps>
  <Step title="Crear una aplicación y un bot de Discord">
    Ve al [Portal de desarrolladores de Discord](https://discord.com/developers/applications) y haz clic en **Nueva aplicación**. Nómbrala algo como "OpenClaw".

    Haz clic en **Bot** en la barra lateral. Establece el **Nombre de usuario** a como llames a tu agente OpenClaw.

  </Step>

  <Step title="Habilitar intents privilegiados">
    Aún en la página **Bot**, desplázate hacia abajo hasta **Intents de Gateway Privilegiados** y habilita:

    - **Intent de Contenido de Mensajes** (requerido)
    - **Intent de Miembros del Servidor** (recomendado; requerido para listas de permitidos de roles y coincidencia de nombre con ID)
    - **Intent de Presencia** (opcional; solo necesario para actualizaciones de presencia)

  </Step>

  <Step title="Copiar el token de tu bot">
    Vuelve a desplazarte hacia arriba en la página **Bot** y haz clic en **Restablecer Token**.

    <Note>
    A pesar del nombre, esto genera tu primer token — no se está "restableciendo" nada.
    </Note>

    Copia el token y guárdalo en algún lugar. Este es tu **Token de Bot** y lo necesitarás en breve.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Haz clic en **OAuth2** en la barra lateral. Generarás una URL de invitación con los permisos adecuados para añadir el bot a tu servidor.

    Desplázate hacia abajo hasta **OAuth2 URL Generator** (Generador de URL de OAuth2) y habilita:

    - `bot`
    - `applications.commands`

    Aparecerá abajo una sección de **Bot Permissions** (Permisos de bot). Habilita:

    - Ver canales
    - Enviar mensajes
    - Leer el historial de mensajes
    - Incrustar enlaces
    - Adjuntar archivos
    - Añadir reacciones (opcional)

    Copia la URL generada en la parte inferior, pégala en tu navegador, selecciona tu servidor y haz clic en **Continue** (Continuar) para conectar. Ahora deberías ver tu bot en el servidor de Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De vuelta en la aplicación de Discord, debes habilitar el Modo de desarrollador para poder copiar los IDs internos.

    1. Haz clic en **User Settings** (Configuración de usuario, icono de engranaje junto a tu avatar) → **Advanced** (Avanzado) → activa **Developer Mode** (Modo de desarrollador)
    2. Haz clic derecho en el **icono de tu servidor** en la barra lateral → **Copy Server ID** (Copiar ID del servidor)
    3. Haz clic derecho en **tu propio avatar** → **Copy User ID** (Copiar ID de usuario)

    Guarda tu **ID de servidor** y tu **ID de usuario** junto a tu Token de bot — enviarás los tres a OpenClaw en el siguiente paso.

  </Step>

  <Step title="Allow DMs from server members">
    Para que el emparejamiento funcione, Discord necesita permitir que tu bot te envíe mensajes directos. Haz clic derecho en el **icono de tu servidor** → **Privacy Settings** (Configuración de privacidad) → activa **Direct Messages** (Mensajes directos).

    Esto permite que los miembros del servidor (incluidos los bots) te envíen mensajes directos. Mantén esto habilitado si deseas usar los mensajes directos de Discord con OpenClaw. Si solo planeas usar canales del servidor, puedes deshabilitar los mensajes directos después del emparejamiento.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    El token de tu bot de Discord es un secreto (como una contraseña). Establécelo en la máquina que ejecuta OpenClaw antes de enviar mensajes a tu agente.

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    Si OpenClaw ya se está ejecutando como un servicio en segundo plano, reinícialo a través de la aplicación Mac de OpenClaw o deteniendo y reiniciando el proceso `openclaw gateway run`.

  </Step>

  <Step title="Configurar OpenClaw y emparejar">

    <Tabs>
      <Tab title="Pregúntale a tu agente">
        Chatea con tu agente OpenClaw en cualquier canal existente (por ejemplo, Telegram) y dile esto. Si Discord es tu primer canal, usa la pestaña CLI / config en su lugar.

        > "Ya configuré mi token de bot de Discord en la configuración. Por favor termina la configuración de Discord con el ID de usuario `<user_id>` y el ID de servidor `<server_id>`."
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

        Env fallback para la cuenta predeterminada:

```bash
DISCORD_BOT_TOKEN=...
```

        Se admiten valores de texto plano `token`. También se admiten valores SecretRef para `channels.discord.token` a través de proveedores env/file/exec. Consulte [Gestión de secretos](/en/gateway/secrets).

      </Tab>
    </Tabs>

  </Step>

  <Step title="Aprobar primer emparejamiento DM">
    Espere hasta que la puerta de enlace se esté ejecutando y luego envíe un mensaje privado (DM) a su bot en Discord. Responderá con un código de emparejamiento.

    <Tabs>
      <Tab title="Pregúntale a tu agente">
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

    Ahora debería poder chatear con su agente en Discord mediante DM.

  </Step>
</Steps>

<Note>
  La resolución de tokens es consciente de la cuenta. Los valores de token de configuración tienen prioridad sobre el respaldo de variables de entorno. `DISCORD_BOT_TOKEN` solo se usa para la cuenta predeterminada. Para llamadas salientes avanzadas (herramienta de mensajes/acciones de canal), se usa un `token` explícito por llamada para esa llamada. Esto se aplica a acciones de envío y de estilo
  lectura/sondeo (por ejemplo, lectura/búsqueda/obtención/hilo/fijaciones/permisos). La configuración de política/reintentos de la cuenta aún proviene de la cuenta seleccionada en la instantánea de tiempo de ejecución activa.
</Note>

## Recomendado: Configurar un espacio de trabajo de servidor (guild)

Una vez que los DM funcionen, puede configurar su servidor de Discord como un espacio de trabajo completo donde cada canal obtenga su propia sesión de agente con su propio contexto. Esto se recomienda para servidores privados donde solo está usted y su bot.

<Steps>
  <Step title="Añade tu servidor a la lista de permitidos del gremio">
    Esto permite que tu agente responda en cualquier canal de tu servidor, no solo en mensajes directos.

    <Tabs>
      <Tab title="Pregunta a tu agente">
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
    De forma predeterminada, tu agente solo responde en los canales del gremio cuando se le @menciona. Para un servidor privado, probablemente quieras que responda a cada mensaje.

    <Tabs>
      <Tab title="Pregunta a tu agente">
        > "Permite que mi agente responda en este servidor sin tener que ser @mencionado"
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

      </Tab>
    </Tabs>

  </Step>

  <Step title="Planificar la memoria en los canales del gremio">
    De forma predeterminada, la memoria a largo plazo (MEMORY.md) solo se carga en sesiones de mensajes directos. Los canales del gremio no cargan automáticamente MEMORY.md.

    <Tabs>
      <Tab title="Pregunta a tu agente">
        > "Cuando haga preguntas en los canales de Discord, usa memory_search o memory_get si necesitas contexto a largo plazo de MEMORY.md."
      </Tab>
      <Tab title="Manual">
        Si necesitas un contexto compartido en cada canal, pon las instrucciones estables en `AGENTS.md` o `USER.md` (se inyectan en cada sesión). Mantén las notas a largo plazo en `MEMORY.md` y accede a ellas bajo demanda con las herramientas de memoria.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Ahora crea algunos canales en tu servidor de Discord y comienza a chatear. Tu agente puede ver el nombre del canal y cada canal tiene su propia sesión aislada, por lo que puedes configurar `#coding`, `#home`, `#research` o lo que se adapte a tu flujo de trabajo.

## Modelo de tiempo de ejecución

- Gateway es el propietario de la conexión de Discord.
- El enrutamiento de respuestas es determinista: las respuestas entrantes de Discord se devuelven a Discord.
- Por defecto (`session.dmScope=main`), los chats directos comparten la sesión principal del agente (`agent:main:main`).
- Los canales de servidor son claves de sesión aisladas (`agent:<agentId>:discord:channel:<channelId>`).
- Los mensajes directos grupales se ignoran por defecto (`channels.discord.dm.groupEnabled=false`).
- Los comandos nativos de barra diagonal se ejecutan en sesiones de comando aisladas (`agent:<agentId>:discord:slash:<userId>`), mientras que aún transportan `CommandTargetSessionKey` a la sesión de conversación enrutada.

## Canales del foro

Los canales de foro y medios de Discord solo aceptan publicaciones de hilos. OpenClaw admite dos formas de crearlos:

- Envía un mensaje al foro principal (`channel:<forumId>`) para crear un hilo automáticamente. El título del hilo usa la primera línea no vacía de tu mensaje.
- Usa `openclaw message thread create` para crear un hilo directamente. No pases `--message-id` para canales de foro.

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

Los foros principales no aceptan componentes de Discord. Si necesitas componentes, envía al hilo en sí (`channel:<threadId>`).

## Componentes interactivos

OpenClaw soporta contenedores de componentes de Discord v2 para mensajes de agente. Usa la herramienta de mensaje con un payload `components`. Los resultados de las interacciones se enrutan de vuelta al agente como mensajes entrantes normales y siguen la configuración existente de `replyToMode` de Discord.

Bloques admitidos:

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Las filas de acciones permiten hasta 5 botones o un menú de selección único
- Tipos de selección: `string`, `user`, `role`, `mentionable`, `channel`

Por defecto, los componentes son de un solo uso. Establece `components.reusable=true` para permitir que los botones, selecciones y formularios se usen varias veces hasta que expiren.

Para restringir quién puede hacer clic en un botón, establece `allowedUsers` en ese botón (IDs de usuario de Discord, etiquetas o `*`). Cuando se configura, los usuarios que no coinciden reciben una denegación efímera.

Los comandos de barra diagonal `/model` y `/models` abren un selector de modelo interactivo con menús desplegables de proveedor y modelo además de un paso Enviar. La respuesta del selector es efímera y solo el usuario que lo invoca puede usarla.

Archivos adjuntos:

- los bloques `file` deben apuntar a una referencia de adjunto (`attachment://<filename>`)
- Proporcione el adjunto a través de `media`/`path`/`filePath` (archivo único); use `media-gallery` para varios archivos
- Use `filename` para anular el nombre de carga cuando deba coincidir con la referencia del adjunto

Formularios modales:

- Añada `components.modal` con hasta 5 campos
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

    Si la política de MD no está abierta, los usuarios desconocidos están bloqueados (o se les solicita emparejamiento en el modo `pairing`).

    Precedencia de cuentas múltiples:

    - `channels.discord.accounts.default.allowFrom` se aplica solo a la cuenta `default`.
    - Las cuentas con nombre heredan `channels.discord.allowFrom` cuando su propia `allowFrom` no está establecida.
    - Las cuentas con nombre no heredan `channels.discord.accounts.default.allowFrom`.

    Formato de destino de MD para entrega:

    - `user:<id>`
    - mención `<@id>`

    Los IDs numéricos simples son ambiguos y se rechazan a menos que se proporcione un tipo de destino de usuario/canal explícito.

  </Tab>

  <Tab title="Política de gremio">
    El manejo del gremio se controla mediante `channels.discord.groupPolicy`:

    - `open`
    - `allowlist`
    - `disabled`

    La base segura cuando existe `channels.discord` es `allowlist`.

    Comportamiento de `allowlist`:

    - el gremio debe coincidir con `channels.discord.guilds` (se prefiere `id`, se acepta el slug)
    - listas de permitidos de remitentes opcionales: `users` (se recomiendan los ID estables) y `roles` (solo ID de roles); si se configura cualquiera de los dos, los remitentes están permitidos cuando coinciden con `users` O `roles`
    - la coincidencia directa de nombre/etiqueta está deshabilitada de forma predeterminada; habilite `channels.discord.dangerouslyAllowNameMatching: true` solo como modo de compatibilidad de emergencia
    - se admiten nombres/etiquetas para `users`, pero los ID son más seguros; `openclaw security audit` avisa cuando se usan entradas de nombre/etiqueta
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

  <Tab title="Menciones y MDs grupales">
    Los mensajes del gremio están restringidos por menciones por defecto.

    La detección de menciones incluye:

    - mención explícita del bot
    - patrones de mención configurados (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - comportamiento implícito de respuesta al bot en casos compatibles

    `requireMention` se configura por gremio/canal (`channels.discord.guilds...`).
    `ignoreOtherMentions` opcionalmente descarta mensajes que mencionan a otro usuario/rol pero no al bot (excluyendo @everyone/@here).

    MDs grupales:

    - por defecto: ignorados (`dm.groupEnabled=false`)
    - lista de permitidos opcional vía `dm.groupChannels` (IDs de canal o slugs)

  </Tab>
</Tabs>

### Enrutamiento de agentes basado en roles

Use `bindings[].match.roles` para enrutar a los miembros del gremio de Discord a diferentes agentes por ID de rol. Los enlaces basados en roles aceptan solo IDs de roles y se evalúan después de los enlaces peer o parent-peer y antes de los enlaces solo de gremio. Si un enlace también establece otros campos de coincidencia (por ejemplo `peer` + `guildId` + `roles`), todos los campos configurados deben coincidir.

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
  <Accordion title="Crear aplicación y bot">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. Copiar token del bot

  </Accordion>

  <Accordion title="Intents privilegiados">
    En **Bot -> Privileged Gateway Intents**, habilite:

    - Message Content Intent
    - Server Members Intent (recomendado)

    El intent de presencia es opcional y solo se requiere si desea recibir actualizaciones de presencia. Configurar la presencia del bot (`setPresence`) no requiere habilitar las actualizaciones de presencia para los miembros.

  </Accordion>

  <Accordion title="Ámbitos OAuth y permisos base">
    Generador de URL OAuth:

    - ámbitos: `bot`, `applications.commands`

    Permisos base típicos:

    - Ver canales
    - Enviar mensajes
    - Ver historial de mensajes
    - Incrustar enlaces
    - Adjuntar archivos
    - Añadir reacciones (opcional)

    Evite `Administrator` a menos que sea explícitamente necesario.

  </Accordion>

  <Accordion title="Copiar IDs">
    Activa el modo de desarrollador de Discord y luego copia:

    - ID del servidor
    - ID del canal
    - ID del usuario

    Se prefieren los IDs numéricos en la configuración de OpenClaw para auditorías y sondas confiables.

  </Accordion>
</AccordionGroup>

## Comandos nativos y autenticación de comandos

- `commands.native` por defecto es `"auto"` y está habilitado para Discord.
- Anulación por canal: `channels.discord.commands.native`.
- `commands.native=false` borra explícitamente los comandos nativos de Discord registrados anteriormente.
- La autenticación de comandos nativos utiliza las mismas listas de permitidos/políticas de Discord que el manejo normal de mensajes.
- Es posible que los comandos sigan siendo visibles en la interfaz de usuario de Discord para usuarios que no están autorizados; la ejecución aún hace cumplir la autenticación de OpenClaw y devuelve "no autorizado".

Consulte [Comandos de barra](/en/tools/slash-commands) para ver el catálogo y el comportamiento de los comandos.

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

    Nota: `off` deshabilita el hilado de respuestas implícito. Las etiquetas explícitas `[[reply_to_*]]` todavía se respetan.
    `first` siempre adjunta la referencia de respuesta nativa implícita al primer mensaje saliente de Discord para el turno.
    `batched` solo adjunta la referencia de respuesta nativa implícita de Discord cuando el
    turno de entrada fue un lote con rebote de múltiples mensajes. Esto es útil
    cuando desea respuestas nativas principalmente para chats ambiguos y eruptivos, no cada
    turno de mensaje individual.

    Los ID de mensaje se muestran en el contexto/historial para que los agentes puedan apuntar a mensajes específicos.

  </Accordion>

  <Accordion title="Vista previa de transmisión en vivo">
    OpenClaw puede transmitir respuestas borrador enviando un mensaje temporal y editándolo a medida que llega el texto.

    - `channels.discord.streaming` controla la transmisión de vista previa (`off` | `partial` | `block` | `progress`, predeterminado: `off`).
    - El valor predeterminado se mantiene en `off` porque las ediciones de vista previa de Discord pueden alcanzar los límites de velocidad rápidamente, especialmente cuando varios bots o gateways comparten la misma cuenta o el tráfico del servidor.
    - `progress` se acepta para la coherencia entre canales y se asigna a `partial` en Discord.
    - `channels.discord.streamMode` es un alias heredado y se migra automáticamente.
    - `partial` edita un único mensaje de vista previa a medida que llegan los tokens.
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

    Predeterminados de fragmentación del modo `block` (limitado a `channels.discord.textChunkLimit`):

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

    La transmisión de vista previa es solo de texto; las respuestas con medios vuelven a la entrega normal.

    Nota: la transmisión de vista previa es independiente de la transmisión por bloques. Cuando la transmisión por bloques está explícitamente
    habilitada para Discord, OpenClaw omite la transmisión de vista previa para evitar la transmisión doble.

  </Accordion>

  <Accordion title="Historial, contexto y comportamiento de hilos">
    Contexto del historial del gremio:

    - `channels.discord.historyLimit` predeterminado `20`
    - alternativa: `messages.groupChat.historyLimit`
    - `0` desactiva

    Controles del historial de MD:

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportamiento de los hilos:

    - Los hilos de Discord se enrutan como sesiones de canal
    - Los metadatos del hilo principal se pueden usar para el enlace de sesión principal
    - La configuración del hilo hereda la configuración del canal principal a menos que exista una entrada específica para el hilo

    Los temas del canal se inyectan como contexto **no confiable** (no como mensaje del sistema).
    El contexto de respuesta y mensaje citado actualmente permanece tal como se recibe.
    Las listas de permitidos de Discord principalmente controlan quién puede activar el agente, no un límite completo de redacción de contexto suplementario.

  </Accordion>

  <Accordion title="Sesiones vinculadas al hilo para subagentes">
    Discord puede vincular un hilo a un destino de sesión para que los mensajes de seguimiento en ese hilo sigan enrutándose a la misma sesión (incluidas las sesiones de subagente).

    Comandos:

    - `/focus <target>` vincular el hilo actual/nuevo a un destino de subagente/sesión
    - `/unfocus` eliminar la vinculación del hilo actual
    - `/agents` mostrar las ejecuciones activas y el estado de vinculación
    - `/session idle <duration|off>` inspeccionar/actualizar la pérdida de enfoque por inactividad para vinculaciones enfocadas
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
    - Si las vinculaciones de hilos están deshabilitadas para una cuenta, `/focus` y las operaciones relacionadas de vinculación de hilos no están disponibles.

    Consulte [Sub-agentes](/en/tools/subagents), [Agentes ACP](/en/tools/acp-agents) y [Referencia de configuración](/en/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Enlaces de canal ACP persistentes">
    Para espacios de trabajo ACP estables "siempre activos", configure enlaces ACP escritos de nivel superior dirigidos a conversaciones de Discord.

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
    - Eso aún puede significar "iniciar una nueva sesión ACP de Codex", pero no crea un nuevo hilo de Discord por sí mismo. El canal existente sigue siendo la superficie de chat.
    - Codex aún puede ejecutarse en su propio `cwd` o espacio de trabajo de backend en el disco. Ese espacio de trabajo es el estado de tiempo de ejecución, no un hilo de Discord.
    - Los mensajes de hilo pueden heredar el enlace ACP del canal principal.
    - En un canal o hilo vinculado, `/new` y `/reset` reinician la misma sesión ACP en su lugar.
    - Los enlaces de hilos temporales todavía funcionan y pueden anular la resolución del objetivo mientras están activos.
    - `spawnAcpSessions` solo se requiere cuando OpenClaw necesita crear/vincular un hilo secundario a través de `--thread auto|here`. No se requiere para `/acp spawn ... --bind here` en el canal actual.

    Consulte [ACP Agents](/en/tools/acp-agents) para obtener detalles sobre el comportamiento de los enlaces.

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
    - respaldo de emoji de identidad del agente (`agents.list[].identity.emoji`, si no, "👀")

    Notas:

    - Discord acepta emojis unicode o nombres de emojis personalizados.
    - Use `""` para desactivar la reacción para un canal o cuenta.

  </Accordion>

  <Accordion title="Escrituras de configuración">
    Las escrituras de configuración iniciadas por el canal están habilitadas de forma predeterminada.

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
    Enrute el tráfico WebSocket de la puerta de enlace de Discord y las búsquedas REST de inicio (ID de aplicación + resolución de lista de permitidos) a través de un proxy HTTP(S) con `channels.discord.proxy`.

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

  <Accordion title="Soporte de PluralKit">
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
    - los nombres para mostrar de los miembros se emparejan por nombre/solo slug cuando `channels.discord.dangerouslyAllowNameMatching: true`
    - las búsquedas usan el ID del mensaje original y están limitadas por ventana de tiempo
    - si la búsqueda falla, los mensajes con proxy se tratan como mensajes de bot y se descartan a menos que `allowBots=true`

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

    Ejemplo de transmisión (Streaming):

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
    - 4: Personalizado (usa el texto de actividad como estado; el emoji es opcional)
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

    La presencia automática asigna la disponibilidad en tiempo de ejecución al estado de Discord: saludable => en línea, degradado o desconocido => ausente, agotado o no disponible => no molestar. Sobrescrituras de texto opcionales:

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (admite el marcador de posición `{reason}`)

  </Accordion>

  <Accordion title="Aprobaciones en Discord">
    Discord admite el manejo de aprobaciones basadas en botones en MDs y, opcionalmente, puede publicar mensajes de solicitud de aprobación en el canal de origen.

    Ruta de configuración:

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (opcional; vuelve a `commands.ownerAllowFrom` cuando sea posible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, predeterminado: `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está configurado o es `"auto"` y se puede resolver al menos un aprobador, ya sea de `execApprovals.approvers` o de `commands.ownerAllowFrom`. Discord no infiere los aprobadores de ejecución a partir de `allowFrom` del canal, `dm.allowFrom` heredado o `defaultTo` de mensaje directo. Establezca `enabled: false` para deshabilitar explícitamente Discord como cliente de aprobación nativo.

    Cuando `target` es `channel` o `both`, el mensaje de solicitud de aprobación es visible en el canal. Solo los aprobadores resueltos pueden usar los botones; otros usuarios reciben una denegación efímera. Los mensajes de solicitud de aprobación incluyen el texto del comando, por lo que solo habilite la entrega en el canal en canales de confianza. Si no se puede derivar el ID del canal de la clave de sesión, OpenClaw vuelve a la entrega por MD.

    Discord también renderiza los botones de aprobación compartidos que utilizan otros canales de chat. El adaptador nativo de Discord agrega principalmente el enrutamiento por MD del aprobador y la difusión en el canal.
    Cuando esos botones están presentes, constituyen la UX de aprobación principal; OpenClaw
    solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que
    las aprobaciones por chat no están disponibles o la aprobación manual es la única ruta.

    La autenticación de Gateway para este controlador utiliza el mismo contrato de resolución de credenciales compartidas que otros clientes de Gateway:

    - autenticación local con prioridad de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` y luego `gateway.auth.*`)
    - en modo local, `gateway.remote.*` solo se puede usar como respaldo cuando `gateway.auth.*` no está configurado; los SecretRefs locales configurados pero no resueltos fallan de forma cerrada
    - soporte de modo remoto a través de `gateway.remote.*` cuando sea aplicable
    - las anulaciones de URL son seguras ante anulaciones: las anulaciones de CLI no reutilizan credenciales implícitas y las anulaciones de entorno usan solo credenciales de entorno

    Comportamiento de resolución de aprobaciones:

    - Los IDs prefijados con `plugin:` se resuelven a través de `plugin.approval.resolve`.
    - Otros IDs se resuelven a través de `exec.approval.resolve`.
    - Discord no realiza aquí un salto de respaldo adicional de ejecución a complemento; el prefijo
      de id decide a qué método de puerta de enlace llama.

    Las aprobaciones de ejecución caducan después de 30 minutos de forma predeterminada. Si las aprobaciones fallan con
    IDs de aprobación desconocidos, verifique la resolución del aprobador, la habilitación de características y
    que el tipo de ID de aprobación entregado coincida con la solicitud pendiente.

    Documentos relacionados: [Aprobaciones de ejecución](/en/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Herramientas y puertas de acción

Las acciones de mensaje de Discord incluyen mensajería, administración de canales, moderación, presencia y acciones de metadatos.

Ejemplos principales:

- mensajería: `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- reacciones: `react`, `reactions`, `emojiList`
- moderación: `timeout`, `kick`, `ban`
- presencia: `setPresence`

Las puertas de acción (action gates) se encuentran bajo `channels.discord.actions.*`.

Comportamiento de la puerta predeterminado:

| Grupo de acciones                                                                                                                                                             | Predeterminado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| reacciones, mensajes, hilos, fijados, encuestas, búsqueda, memberInfo, roleInfo, channelInfo, canales, voiceStatus, eventos, stickers, emojiUploads, stickerUploads, permisos | habilitado     |
| roles                                                                                                                                                                         | deshabilitado  |
| moderación                                                                                                                                                                    | deshabilitado  |
| presencia                                                                                                                                                                     | deshabilitado  |

## Interfaz de usuario de componentes v2

OpenClaw utiliza componentes de Discord v2 para aprobaciones de ejecución y marcadores de contexto cruzado. Las acciones de mensaje de Discord también pueden aceptar `components` para IU personalizada (avanzado; requiere construir una carga útil de componente a través de la herramienta discord), mientras que los `embeds` heredados siguen disponibles pero no se recomiendan.

- `channels.discord.ui.components.accentColor` establece el color de acento utilizado por los contenedores de componentes de Discord (hex).
- Establecer por cuenta con `channels.discord.accounts.<id>.ui.components.accentColor`.
- Se ignoran `embeds` cuando están presentes los componentes v2.

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

Utilice el comando nativo exclusivo de Discord `/vc join|leave|status` para controlar sesiones. El comando utiliza el agente predeterminado de la cuenta y sigue las mismas reglas de lista de permitidos y políticas de grupo que otros comandos de Discord.

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
- Los turnos de transcripción de voz derivan el estado de propietario de los `allowFrom` de Discord (o `dm.allowFrom`); los hablantes que no son propietarios no pueden acceder a herramientas exclusivas del propietario (por ejemplo `gateway` y `cron`).
- La voz está habilitada de forma predeterminada; establezca `channels.discord.voice.enabled=false` para desactivarla.
- `voice.daveEncryption` y `voice.decryptionFailureTolerance` se pasan a las opciones de unión de `@discordjs/voice`.
- Los valores predeterminados de `@discordjs/voice` son `daveEncryption=true` y `decryptionFailureTolerance=24` si no están establecidos.
- OpenClaw también supervisa los fallos de desencriptación de recepción y se recupera automáticamente saliendo y volviendo a entrar al canal de voz después de fallos repetidos en una ventana corta de tiempo.
- Si los registros de recepción muestran repetidamente `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`, esto puede ser el error de recepción aguas arriba de `@discordjs/voice` rastreado en [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419).

## Mensajes de voz

Los mensajes de voz de Discord muestran una vista previa de la forma de onda y requieren audio OGG/Opus más metadatos. OpenClaw genera la forma de onda automáticamente, pero necesita `ffmpeg` y `ffprobe` disponibles en el host de la puerta de enlace para inspeccionar y convertir archivos de audio.

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

    - habilitar Message Content Intent
    - habilitar Server Members Intent cuando dependas de la resolución de usuario/miembro
    - reiniciar la puerta de enlace después de cambiar los intents

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

    - `groupPolicy="allowlist"` sin lista blanca de gremio/canal coincidente
    - `requireMention` configurado en el lugar incorrecto (debe estar bajo `channels.discord.guilds` o entrada de canal)
    - remitente bloqueado por la lista blanca `users` de gremio/canal

  </Accordion>

  <Accordion title="Los controladores de larga duración agotan el tiempo o duplican respuestas">

    Registros típicos:

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    Control de presupuesto del escucha:

    - cuenta única: `channels.discord.eventQueue.listenerTimeout`
    - multicuenta: `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Control de tiempo de espera de ejecución del trabajador:

    - cuenta única: `channels.discord.inboundWorker.runTimeoutMs`
    - multicuenta: `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - predeterminado: `1800000` (30 minutos); establecer `0` para desactivar

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
    `channels status --probe` las comprobaciones de permisos solo funcionan para los IDs de canal numéricos.

    Si usas claves de slug, la coincidencia en tiempo de ejecución aún puede funcionar, pero la sonda no puede verificar completamente los permisos.

  </Accordion>

  <Accordion title="Problemas de MD y emparejamiento">

    - MD desactivado: `channels.discord.dm.enabled=false`
    - Política de MD desactivada: `channels.discord.dmPolicy="disabled"` (heredado: `channels.discord.dm.policy`)
    - esperando la aprobación de emparejamiento en el modo `pairing`

  </Accordion>

  <Accordion title="Bucles de bot a bot">
    De forma predeterminada, se ignoran los mensajes creados por bots.

    Si estableces `channels.discord.allowBots=true`, usa reglas estrictas de mención y lista de permitidos para evitar el comportamiento de bucle.
    Prefiere `channels.discord.allowBots="mentions"` para aceptar solo mensajes de bot que mencionan al bot.

  </Accordion>

  <Accordion title="Caídas de STT de voz con DecryptionFailed(...)">

    - mantén OpenClaw actualizado (`openclaw update`) para que la lógica de recuperación de recepción de voz de Discord esté presente
    - confirma `channels.discord.voice.daveEncryption=true` (predeterminado)
    - comienza desde `channels.discord.voice.decryptionFailureTolerance=24` (predeterminado upstream) y ajusta solo si es necesario
    - vigila los registros en busca de:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si los fallos continúan después de volver a unirse automáticamente, recopila los registros y compáralos con [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

Referencia principal:

- [Referencia de configuración - Discord](/en/gateway/configuration-reference#discord)

Campos de Discord de alta señal:

- inicio de sesión/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- política: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- comando: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- cola de eventos: `eventQueue.listenerTimeout` (presupuesto de escucha), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (alias heredado: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` limita las cargas salientes de Discord (predeterminado: `100MB`)
- actions: `actions.*`
- presence: `activity`, `status`, `activityType`, `activityUrl`
- UI: `ui.components.accentColor`
- features: `threadBindings`, `bindings[]` de nivel superior (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Seguridad y operaciones

- Trate los tokens de bot como secretos (se prefiere `DISCORD_BOT_TOKEN` en entornos supervisados).
- Conceda permisos de Discord con el privilegio mínimo.
- Si el estado/implantación del comando está obsoleto, reinicie la puerta de enlace y vuelva a verificar con `openclaw channels status --probe`.

## Relacionado

- [Emparejamiento](/en/channels/pairing)
- [Grupos](/en/channels/groups)
- [Enrutamiento de canales](/en/channels/channel-routing)
- [Seguridad](/en/gateway/security)
- [Enrutamiento multiagente](/en/concepts/multi-agent)
- [Solución de problemas](/en/channels/troubleshooting)
- [Comandos de barra](/en/tools/slash-commands)
