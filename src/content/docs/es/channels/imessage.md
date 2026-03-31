---
summary: "Compatibilidad con iMessage heredada a través de imsg (JSON-RPC a través de stdio). Las nuevas configuraciones deberían usar BlueBubbles."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage (heredado: imsg)

<Warning>
Para nuevos despliegues de iMessage, utilice <a href="/en/channels/bluebubbles">BlueBubbles</a>.

La integración `imsg` es heredada y puede eliminarse en una versión futura.

</Warning>

Estado: integración CLI externa heredada. Gateway inicia `imsg rpc` y se comunica a través de JSON-RPC en stdio (sin demonio/puerto separado).

<CardGroup cols={3}>
  <Card title="BlueBubbles (recomendado)" icon="message-circle" href="/en/channels/bluebubbles">
    Ruta iMessage preferida para nuevas configuraciones.
  </Card>
  <Card title="Emparejamiento" icon="link" href="/en/channels/pairing">
    Los MDs de iMessage por defecto están en modo de emparejamiento.
  </Card>
  <Card title="Referencia de configuración" icon="settings" href="/en/gateway/configuration-reference#imessage">
    Referencia completa de campos de iMessage.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Mac local (ruta rápida)">
    <Steps>
      <Step title="Instalar y verificar imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="Configurar OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Iniciar gateway">

```bash
openclaw gateway
```

      </Step>

      <Step title="Aprobar primer emparejamiento DM (dmPolicy predeterminado)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        Las solicitudes de emparejamiento expiran después de 1 hora.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Mac remoto a través de SSH">
    OpenClaw solo requiere una `cliPath` compatible con stdio, por lo que puede apuntar `cliPath` a un script contenedor que haga SSH a un Mac remoto y ejecute `imsg`.

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    Configuración recomendada cuando los archivos adjuntos están habilitados:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    Si `remoteHost` no está configurado, OpenClaw intenta detectarlo automáticamente analizando el script contenedor de SSH.
    `remoteHost` debe ser `host` o `user@host` (sin espacios ni opciones de SSH).
    OpenClaw utiliza verificación estricta de clave de host para SCP, por lo que la clave de host del relé ya debe existir en `~/.ssh/known_hosts`.
    Las rutas de los archivos adjuntos se validan contra las raíces permitidas (`attachmentRoots` / `remoteAttachmentRoots`).

  </Tab>
</Tabs>

## Requisitos y permisos (macOS)

- Se debe haber iniciado sesión en Messages en el Mac donde se ejecuta `imsg`.
- Se requiere acceso de disco completo para el contexto del proceso que ejecuta OpenClaw/`imsg` (acceso a la base de datos de Messages).
- Se requiere el permiso de automatización para enviar mensajes a través de Messages.app.

<Tip>
Los permisos se otorgan por contexto de proceso. Si la puerta de enlace se ejecuta sin interfaz gráfica (LaunchAgent/SSH), ejecute un comando interactivo único en ese mismo contexto para activar las solicitudes:

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.imessage.dmPolicy` controla los mensajes directos:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    Campo de lista de permitidos: `channels.imessage.allowFrom`.

    Las entradas de la lista de permitidos pueden ser identificadores o destinos de chat (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`).

  </Tab>

  <Tab title="Política de grupo y menciones">
    `channels.imessage.groupPolicy` controla el manejo de grupos:

    - `allowlist` (predeterminado cuando está configurado)
    - `open`
    - `disabled`

    Lista de permitidos de remitentes de grupo: `channels.imessage.groupAllowFrom`.

    Fallback en tiempo de ejecución: si `groupAllowFrom` no está establecido, las comprobaciones de remitente de grupo de iMessage vuelven a `allowFrom` cuando está disponible.
    Nota de tiempo de ejecución: si `channels.imessage` falta por completo, el tiempo de ejecución vuelve a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está establecido).

    Filtrado de menciones para grupos:

    - iMessage no tiene metadatos nativos de menciones
    - la detección de menciones usa patrones de regex (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - sin patrones configurados, el filtrado de menciones no se puede hacer cumplir

    Los comandos de control de remitentes autorizados pueden omitir el filtrado de menciones en grupos.

  </Tab>

  <Tab title="Sesiones y respuestas deterministas">
    - Los MD usan enrutamiento directo; los grupos usan enrutamiento de grupo.
    - Con el `session.dmScope=main` predeterminado, los MD de iMessage se colapsan en la sesión principal del agente.
    - Las sesiones de grupo están aisladas (`agent:<agentId>:imessage:group:<chat_id>`).
    - Las respuestas se enrutan de vuelta a iMessage utilizando los metadatos del canal/destino de origen.

    Comportamiento de hilo similar a grupo:

    Algunos hilos de iMessage de múltiples participantes pueden llegar con `is_group=false`.
    Si ese `chat_id` está configurado explícitamente bajo `channels.imessage.groups`, OpenClaw lo trata como tráfico de grupo (filtrado de grupo + aislamiento de sesión de grupo).

  </Tab>
</Tabs>

## Vínculos de conversación ACP

Los chats heredados de iMessage también se pueden vincular a sesiones ACP.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD o del chat de grupo permitido.
- Los mensajes futuros en esa misma conversación de iMessage se enrutan a la sesión ACP generada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

Los enlaces persistentes configurados son compatibles a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "imessage"`.

`match.peer.id` puede usar:

- identificador de DM normalizado como `+15555550123` o `user@example.com`
- `chat_id:<id>` (recomendado para enlaces de grupo estables)
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Ejemplo:

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

Consulte [ACP Agents](/en/tools/acp-agents) para conocer el comportamiento de enlace ACP compartido.

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Usuario de macOS dedicado al bot (identidad de iMessage separada)">
    Utilice un ID de Apple y un usuario de macOS dedicados para que el tráfico del bot esté aislado de su perfil personal de Mensajes.

    Flujo típico:

    1. Cree/inicie sesión en un usuario de macOS dedicado.
    2. Inicie sesión en Mensajes con el ID de Apple del bot en ese usuario.
    3. Instale `imsg` en ese usuario.
    4. Cree un contenedor SSH para que OpenClaw pueda ejecutar `imsg` en el contexto de ese usuario.
    5. Apunte `channels.imessage.accounts.<id>.cliPath` y `.dbPath` a ese perfil de usuario.

    La primera ejecución puede requerir aprobaciones de la interfaz gráfica (Automatización + Acceso total al disco) en esa sesión de usuario del bot.

  </Accordion>

  <Accordion title="Mac remoto a través de Tailscale (ejemplo)">
    Topología común:

    - gateway se ejecuta en Linux/VM
    - iMessage + `imsg` se ejecuta en un Mac en tu tailnet
    - el wrapper `cliPath` usa SSH para ejecutar `imsg`
    - `remoteHost` habilita la obtención de archivos adjuntos por SCP

    Ejemplo:

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

    Usa claves SSH para que tanto SSH como SCP no sean interactivos.
    Asegúrate de que la clave del host sea confiable primero (por ejemplo `ssh bot@mac-mini.tailnet-1234.ts.net`) para que se rellene `known_hosts`.

  </Accordion>

  <Accordion title="Patrón multicuenta">
    iMessage soporta configuración por cuenta bajo `channels.imessage.accounts`.

    Cada cuenta puede anular campos como `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, configuración de historial y listas de permitidos de raíz de adjuntos.

  </Accordion>
</AccordionGroup>

## Medios, fragmentación y destinos de entrega

<AccordionGroup>
  <Accordion title="Archivos adjuntos y medios">
    - la ingestión de archivos adjuntos entrantes es opcional: `channels.imessage.includeAttachments`
    - las rutas de archivos adjuntos remotos se pueden obtener mediante SCP cuando se establece `remoteHost`
    - las rutas de los archivos adjuntos deben coincidir con las raíces permitidas:
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (modo SCP remoto)
      - patrón de raíz predeterminado: `/Users/*/Library/Messages/Attachments`
    - SCP usa la verificación estricta de claves de host (`StrictHostKeyChecking=yes`)
    - el tamaño de los medios salientes usa `channels.imessage.mediaMaxMb` (predeterminado 16 MB)
  </Accordion>

<Accordion title="Fragmentación de salida">- límite de fragmento de texto: `channels.imessage.textChunkLimit` (predeterminado 4000) - modo de fragmentación: `channels.imessage.chunkMode` - `length` (predeterminado) - `newline` (división por párrafos primero)</Accordion>

  <Accordion title="Formatos de direccionamiento">
    Objetivos explícitos preferidos:

    - `chat_id:123` (recomendado para un enrutamiento estable)
    - `chat_guid:...`
    - `chat_identifier:...`

    También se admiten objetivos de identificador (handle):

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## Escrituras de configuración

iMessage permite escrituras de configuración iniciadas por el canal por defecto (para `/config set|unset` cuando `commands.config: true`).

Deshabilitar:

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## Solución de problemas

<AccordionGroup>
  <Accordion title="imsg not found or RPC unsupported">
    Valide el binario y el soporte RPC:

```bash
imsg rpc --help
openclaw channels status --probe
```

    Si el sondeo indica que RPC no es compatible, actualice `imsg`.

  </Accordion>

  <Accordion title="DMs are ignored">
    Verificar:

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - aprobaciones de emparejamiento (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Group messages are ignored">
    Verificar:

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - comportamiento de la lista de permitidos `channels.imessage.groups`
    - configuración del patrón de mención (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    Verificar:

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - autenticación de clave SSH/SCP desde el host de puerta de enlace
    - la clave de host existe en `~/.ssh/known_hosts` en el host de puerta de enlace
    - legibilidad de la ruta remota en el Mac que ejecuta Messages

  </Accordion>

  <Accordion title="Se omitieron los avisos de permisos de macOS">
    Vuelva a ejecutarlo en una terminal GUI interactiva en el mismo contexto de usuario/sesión y apruebe los avisos:

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    Confirme que se hayan otorgado Acceso total al disco + Automatización para el contexto del proceso que ejecuta OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

- [Referencia de configuración - iMessage](/en/gateway/configuration-reference#imessage)
- [Configuración de Gateway](/en/gateway/configuration)
- [Emparejamiento](/en/channels/pairing)
- [BlueBubbles](/en/channels/bluebubbles)
