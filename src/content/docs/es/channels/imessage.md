---
summary: "Soporte nativo de iMessage a través de imsg (JSON-RPC sobre stdio), con acciones de API privada para respuestas, tapbacks, efectos, archivos adjuntos y gestión de grupos. Preferido para nuevas configuraciones de OpenClaw iMessage cuando los requisitos del host se ajustan."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
Para despliegues de OpenClaw iMessage, use `imsg` en un host de macOS de Messages con sesión iniciada. Si su Gateway se ejecuta en Linux o Windows, apunte `channels.imessage.cliPath` a un envoltorio SSH que ejecute `imsg` en el Mac.

**La recuperación del tiempo de inactividad del Gateway es opcional.** Cuando está habilitada (`channels.imessage.catchup.enabled: true`), el gateway reproduce los mensajes entrantes que llegaron a `chat.db` mientras estaba fuera de línea (falla, reinicio, suspensión del Mac) en el próximo inicio. Deshabilitado de forma predeterminada; consulte [Recuperación después del tiempo de inactividad del gateway](#catching-up-after-gateway-downtime). Cierra [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649).

</Note>

<Warning>Se eliminó el soporte de BlueBubbles. Migre las configuraciones `channels.bluebubbles` a `channels.imessage`; OpenClaw soporta iMessage solo a través de `imsg`.</Warning>

Estado: integración nativa de CLI externa. El Gateway genera `imsg rpc` y se comunica a través de JSON-RPC en stdio (sin demonio/puerto separado). Las acciones avanzadas requieren `imsg launch` y una sonda de API privada exitosa.

<CardGroup cols={3}>
  <Card title="Acciones de API privada" icon="wand-sparkles" href="#private-api-actions">
    Respuestas, tapbacks, efectos, archivos adjuntos y gestión de grupos.
  </Card>
  <Card title="Emparejamiento" icon="link" href="/es/channels/pairing">
    Los MD de iMessage están en modo de emparejamiento de forma predeterminada.
  </Card>
  <Card title="Mac remoto" icon="terminal" href="#remote-mac-over-ssh">
    Use un envoltorio SSH cuando el Gateway no se esté ejecutando en el Mac de Messages.
  </Card>
  <Card title="Referencia de configuración" icon="settings" href="/es/gateway/config-channels#imessage">
    Referencia completa de campos de iMessage.
  </Card>
</CardGroup>

## Configuración rápida

<Tabs>
  <Tab title="Mac local (vía rápida)">
    <Steps>
      <Step title="Instalar y verificar imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
imsg launch
openclaw channels status --probe
```

      </Step>

      <Step title="Configurar OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/user/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Iniciar la pasarela">

```bash
openclaw gateway
```

      </Step>

      <Step title="Aprobar el primer emparejamiento DM (dmPolicy predeterminado)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        Las solicitudes de emparejamiento caducan después de 1 hora.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Mac remoto a través de SSH">
    OpenClaw solo requiere un `cliPath` compatible con stdio, por lo que puede apuntar `cliPath` a un script contenedor que haga SSH a un Mac remoto y ejecute `imsg`.

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    Configuración recomendada cuando los adjuntos están habilitados:

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

    Si no se establece `remoteHost`, OpenClaw intenta detectarlo automáticamente analizando el script contenedor SSH.
    `remoteHost` debe ser `host` o `user@host` (sin espacios ni opciones de SSH).
    OpenClaw utiliza una verificación estricta de clave de host para SCP, por lo que la clave de host del relé ya debe existir en `~/.ssh/known_hosts`.
    Las rutas de los adjuntos se validan contra las raíces permitidas (`attachmentRoots` / `remoteAttachmentRoots`).

  </Tab>
</Tabs>

## Requisitos y permisos (macOS)

- Debe haber iniciado sesión en Messages en el Mac que ejecuta `imsg`.
- Se requiere acceso de disco completo para el contexto de proceso que ejecuta OpenClaw/`imsg` (acceso a la base de datos de Messages).
- Se requiere permiso de automatización para enviar mensajes a través de Messages.app.
- Para acciones avanzadas (reaccionar / editar / no enviar / respuesta en hilo / efectos / operaciones de grupo), la Protección de Integridad del Sistema debe estar deshabilitada; consulte [Habilitar la API privada de imsg](#enabling-the-imsg-private-api) a continuación. El envío y recepción básicos de texto y medios funcionan sin ella.

<Tip>
Los permisos se otorgan por contexto de proceso. Si la puerta de enlace se ejecuta sin interfaz gráfica (LaunchAgent/SSH), ejecute un comando interactivo único en ese mismo contexto para activar los indicadores:

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## Habilitar la API privada de imsg

`imsg` se envía en dos modos operativos:

- **Modo básico** (predeterminado, no se necesitan cambios de SIP): texto y medios salientes a través de `send`, vigilancia/historial entrante, lista de chats. Esto es lo que obtiene de inmediato con un `brew install steipete/tap/imsg` nuevo más los permisos estándar de macOS mencionados anteriormente.
- **Modo de API privada**: `imsg` inyecta una dylib auxiliar en `Messages.app` para llamar a funciones internas de `IMCore`. Esto es lo que desbloquea `react`, `edit`, `unsend`, `reply` (en hilo), `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, además de indicadores de escritura y confirmaciones de lectura.

Para alcanzar la superficie de acciones avanzadas que documenta esta página del canal, necesita el modo de API privada. El README de `imsg` es explícito sobre el requisito:

> Las funciones avanzadas como `read`, `typing`, `launch`, envío enriquecido respaldado por puente, mutación de mensajes y gestión de chats son opcionales. Requieren que SIP esté deshabilitado y que se inyecte una dylib auxiliar en `Messages.app`. `imsg launch` se niega a inyectar cuando SIP está habilitado.

La técnica de inyección auxiliar utiliza la propia dylib de `imsg` para acceder a las API privadas de Messages. No hay un servidor de terceros ni un tiempo de ejecución de BlueBubbles en la ruta de iMessage de OpenClaw.

<Warning>
**Deshabilitar SIP es una compensación de seguridad real.** SIP es una de las protecciones centrales de macOS contra la ejecución de código del sistema modificado; desactivarlo en todo el sistema abre una superficie de ataque adicional y efectos secundarios. En particular, **deshabilitar SIP en Macs con Apple Silicon también deshabilita la capacidad de instalar y ejecutar apps de iOS en tu Mac**.

Trata esto como una elección operacional deliberada, no como un valor predeterminado. Si tu modelo de amenazas no tolera que SIP esté desactivado, iMessage incluido se limita al modo básico — solo envío y recepción de texto y medios, sin reacciones / editar / no enviar / efectos / operaciones de grupo.

</Warning>

### Configuración

1. **Instala (o actualiza) `imsg`** en la Mac que ejecuta Messages.app:

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   La salida de `imsg status --json` informa `bridge_version`, `rpc_methods` y `selectors` por método para que puedas ver qué soporta la compilación actual antes de comenzar.

2. **Deshabilita la Protección de Integridad del Sistema.** Esto es específico de la versión de macOS porque el requisito subyacente de Apple depende del sistema operativo y el hardware:
   - **macOS 10.13–10.15 (Sierra–Catalina):** deshabilita la Validación de Bibliotecas a través de la Terminal, reinicia en modo de recuperación, ejecuta `csrutil disable`, reinicia.
   - **macOS 11+ (Big Sur y posteriores), Intel:** Modo de recuperación (o recuperación de Internet), `csrutil disable`, reinicia.
   - **macOS 11+, Apple Silicon:** secuencia de inicio con el botón de encendido para entrar en recuperación; en versiones recientes de macOS mantén presionada la tecla **Shift Izquierdo** cuando hagas clic en Continuar, luego `csrutil disable`. Las configuraciones de máquinas virtuales siguen un flujo separado: toma una instantánea de la VM primero.
   - **macOS 26 / Tahoe:** las políticas de validación de bibliotecas y las comprobaciones de derechos de acceso privados de `imagent` se han endurecido aún más; `imsg` puede necesitar una compilación actualizada para mantenerse al día. Si la inyección de `imsg launch` o `selectors` específicos comienzan a devolver falso después de una actualización mayor de macOS, consulta las notas de la versión de `imsg` antes de asumir que el paso de SIP tuvo éxito.

   Sigue el flujo del modo de recuperación de Apple para tu Mac para deshabilitar SIP antes de ejecutar `imsg launch`.

3. **Inyecta el asistente.** Con SIP deshabilitado y Messages.app iniciado:

   ```bash
   imsg launch
   ```

   `imsg launch` se niega a inyectar cuando SIP todavía está habilitado, por lo que esto también sirve como confirmación de que se realizó el paso 2.

4. **Verifica el puente desde OpenClaw:**

   ```bash
   openclaw channels status --probe
   ```

   La entrada de iMessage debe reportar `works`, y `imsg status --json | jq '.selectors'` debería mostrar `retractMessagePart: true` además de los selectores de edición / escritura / lectura que tu compilación de macOS exponga. El filtrado por método del complemento de OpenClaw en `actions.ts` solo anuncia acciones cuyo selector subyacente sea `true`, por lo que la superficie de acción que ves en la lista de herramientas del agente refleja lo que el puente realmente puede hacer en este host.

Si `openclaw channels status --probe` reporta el canal como `works` pero acciones específicas lanzan "iMessage `<action>` requiere el puente de la API privada imsg" en el momento del envío, ejecuta `imsg launch` nuevamente — el auxiliar puede caerse (reinicio de Messages.app, actualización del SO, etc.) y el estado `available: true` en caché seguirá anunciando acciones hasta que la siguiente sondeada actualice.

### Cuando no puedes deshabilitar SIP

Si tener SIP deshabilitado no es aceptable para tu modelo de amenazas:

- `imsg` vuelve al modo básico: solo texto + medios + recepción.
- El complemento de OpenClaw todavía anuncia el envío de texto/medios y el monitoreo entrante; simplemente oculta `react`, `edit`, `unsend`, `reply`, `sendWithEffect` y operaciones de grupo de la superficie de acción (según la puerta de capacidad por método).
- Puedes ejecutar un Mac separado que no sea de Apple Silicon (o un Mac dedicado para bots) con SIP desactivado para la carga de trabajo de iMessage, mientras mantienes SIP habilitado en tus dispositivos principales. Consulta [Usuario de macOS dedicado para bots (identidad de iMessage separada)](#deployment-patterns) más abajo.

## Control de acceso y enrutamiento

<Tabs>
  <Tab title="Política de MD">
    `channels.imessage.dmPolicy` controla los mensajes directos:

    - `pairing` (predeterminado)
    - `allowlist`
    - `open` (requiere que `allowFrom` incluya `"*"`)
    - `disabled`

    Campo de lista de permitidos: `channels.imessage.allowFrom`.

    Las entradas de la lista de permitidos pueden ser identificadores, grupos de acceso de remitentes estáticos (`accessGroup:<name>`) u objetivos de chat (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`).

  </Tab>

  <Tab title="Política de grupo y menciones">
    `channels.imessage.groupPolicy` controla el manejo de grupos:

    - `allowlist` (predeterminado cuando se configura)
    - `open`
    - `disabled`

    Lista de permitidos de remitentes de grupo: `channels.imessage.groupAllowFrom`.

    Las entradas `groupAllowFrom` también pueden hacer referencia a grupos de acceso de remitentes estáticos (`accessGroup:<name>`).

    Respaldo en tiempo de ejecución: si `groupAllowFrom` no está establecido, las comprobaciones de remitente de grupo de iMessage recurren a `allowFrom` cuando está disponible.
    Nota de tiempo de ejecución: si `channels.imessage` falta completamente, el tiempo de ejecución recurre a `groupPolicy="allowlist"` y registra una advertencia (incluso si `channels.defaults.groupPolicy` está establecido).

    <Warning>
    El enrutamiento de grupos tiene **dos** puertas de lista de permitidos ejecutándose una tras otra, y ambas deben aprobarse:

    1. **Lista de permitidos de remitente/destino de chat** (`channels.imessage.groupAllowFrom`) — identificador, `chat_guid`, `chat_identifier` o `chat_id`.
    2. **Registro de grupos** (`channels.imessage.groups`) — con `groupPolicy: "allowlist"`, esta puerta requiere una entrada de comodín `groups: { "*": { ... } }` (establece `allowAll = true`) o una entrada explícita por `chat_id` bajo `groups`.

    Si la puerta 2 no tiene nada, todos los mensajes de grupo se descartan. El complemento emite dos señales de nivel `warn` en el nivel de registro predeterminado:

    - una vez por cuenta al inicio: `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - una vez por `chat_id` en tiempo de ejecución: `imessage: dropping group message from chat_id=<id> ...`

    Los MD continúan funcionando porque toman una ruta de código diferente.

    Configuración mínima para mantener los grupos fluyendo bajo `groupPolicy: "allowlist"`:

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    Si esas líneas `warn` aparecen en el registro de la puerta de enlace, la puerta 2 está descartando; agregue el bloque `groups`.
    </Warning>

    Filtrado de menciones para grupos:

    - iMessage no tiene metadatos de mención nativos
    - la detección de menciones usa patrones de expresiones regulares (`agents.list[].groupChat.mentionPatterns`, respaldo `messages.groupChat.mentionPatterns`)
    - sin patrones configurados, el filtrado de menciones no se puede hacer cumplir

    Los comandos de control de remitentes autorizados pueden omitir el filtrado de menciones en grupos.

    `systemPrompt` por grupo:

    Cada entrada bajo `channels.imessage.groups.*` acepta una cadena `systemPrompt` opcional. El valor se inyecta en el mensaje del sistema del agente en cada turno que maneja un mensaje en ese grupo. La resolución refleja la resolución del mensaje por grupo utilizada por `channels.whatsapp.groups`:

    1. **Mensaje del sistema específico del grupo** (`groups["<chat_id>"].systemPrompt`): se usa cuando existe la entrada específica del grupo en el mapa **y** su clave `systemPrompt` está definida. Si `systemPrompt` es una cadena vacía (`""`), el comodín se suprime y no se aplica ningún mensaje del sistema a ese grupo.
    2. **Mensaje del sistema de comodín de grupo** (`groups["*"].systemPrompt`): se usa cuando la entrada específica del grupo está totalmente ausente del mapa, o cuando existe pero no define ninguna clave `systemPrompt`.

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    Los mensajes por grupo solo se aplican a los mensajes de grupo; los mensajes directos en este canal no se ven afectados.

  </Tab>

  <Tab title="Sesiones y respuestas deterministas">
    - Los MD usan enrutamiento directo; los grupos usan enrutamiento de grupo.
    - Con el `session.dmScope=main` predeterminado, los MD de iMessage se colapsan en la sesión principal del agente.
    - Las sesiones de grupo están aisladas (`agent:<agentId>:imessage:group:<chat_id>`).
    - Las respuestas se enrutan de vuelta a iMessage utilizando los metadatos del canal/objetivo de origen.

    Comportamiento de hilos similares a grupos:

    Algunos hilos de iMessage con varios participantes pueden llegar con `is_group=false`.
    Si ese `chat_id` está configurado explícitamente en `channels.imessage.groups`, OpenClaw lo trata como tráfico de grupo (filtrado de grupo + aislamiento de sesión de grupo).

  </Tab>
</Tabs>

## Vínculos de conversación ACP

Los chats heredados de iMessage también pueden vincularse a sesiones ACP.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD o del chat de grupo permitido.
- Los mensajes futuros en esa misma conversación de iMessage se enrutan a la sesión ACP generada.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

Se admiten vínculos persistentes configurados a través de entradas `bindings[]` de nivel superior con `type: "acp"` y `match.channel: "imessage"`.

`match.peer.id` puede usar:

- identificador de MD normalizado como `+15555550123` o `user@example.com`
- `chat_id:<id>` (recomendado para vínculos de grupo estables)
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

Consulte [Agentes ACP](/es/tools/acp-agents) para obtener información sobre el comportamiento de vinculación ACP compartida.

## Patrones de implementación

<AccordionGroup>
  <Accordion title="Usuario de macOS dedicado para el bot (identidad de iMessage separada)">
    Utilice un ID de Apple y un usuario de macOS dedicados para que el tráfico del bot esté aislado de su perfil personal de Mensajes.

    Flujo típico:

    1. Cree/inicie sesión en un usuario de macOS dedicado.
    2. Inicie sesión en Mensajes con el ID de Apple del bot en ese usuario.
    3. Instale `imsg` en ese usuario.
    4. Cree un contenedor SSH para que OpenClaw pueda ejecutar `imsg` en ese contexto de usuario.
    5. Apunte `channels.imessage.accounts.<id>.cliPath` y `.dbPath` a ese perfil de usuario.

    La primera ejecución puede requerir aprobaciones de GUI (Automatización + Acceso completo al disco) en esa sesión de usuario del bot.

  </Accordion>

  <Accordion title="Mac remoto a través de Tailscale (ejemplo)">
    Topología común:

    - la pasarela se ejecuta en Linux/VM
    - iMessage + `imsg` se ejecutan en una Mac en su tailnet
    - el contenedor `cliPath` usa SSH para ejecutar `imsg`
    - `remoteHost` habilita la recuperación de archivos adjuntos por SCP

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

    Utilice claves SSH para que tanto SSH como SCP sean no interactivos.
    Asegúrese de que la clave del host sea confiable primero (por ejemplo `ssh bot@mac-mini.tailnet-1234.ts.net`) para que `known_hosts` se complete.

  </Accordion>

  <Accordion title="Patrón multicuenta">
    iMessage admite configuración por cuenta bajo `channels.imessage.accounts`.

    Cada cuenta puede anular campos como `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, configuraciones de historial y listas de permisos de raíz de archivos adjuntos.

  </Accordion>
</AccordionGroup>

## Medios, fragmentación y objetivos de entrega

<AccordionGroup>
  <Accordion title="Adjuntos y medios">
    - la ingesta de archivos adjuntos entrantes está **desactivada por defecto** — configure `channels.imessage.includeAttachments: true` para reenviar fotos, notas de voz, videos y otros archivos adjuntos al agente. Con esto desactivado, los iMessages que solo contienen archivos adjuntos se descartan antes de llegar al agente y pueden no producir ninguna línea de registro `Inbound message` en absoluto.
    - las rutas de archivos adjuntos remotos se pueden obtener a través de SCP cuando `remoteHost` está configurado
    - las rutas de los archivos adjuntos deben coincidir con las raíces permitidas:
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (modo SCP remoto)
      - patrón de raíz predeterminado: `/Users/*/Library/Messages/Attachments`
    - SCP utiliza verificación estricta de clave de host (`StrictHostKeyChecking=yes`)
    - el tamaño de los medios salientes utiliza `channels.imessage.mediaMaxMb` (predeterminado 16 MB)

  </Accordion>

  <Accordion title="Fragmentación de salida">
    - límite de fragmento de texto: `channels.imessage.textChunkLimit` (predeterminado 4000)
    - modo de fragmentación: `channels.imessage.chunkMode`
      - `length` (predeterminado)
      - `newline` (división prioritaria por párrafo)

  </Accordion>

  <Accordion title="Formatos de direccionamiento">
    Objetivos explícitos preferidos:

    - `chat_id:123` (recomendado para un enrutamiento estable)
    - `chat_guid:...`
    - `chat_identifier:...`

    También se admiten objetivos de identificador:

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## Acciones de API privada

Cuando `imsg launch` se está ejecutando y `openclaw channels status --probe` informa `privateApi.available: true`, la herramienta de mensajes puede usar acciones nativas de iMessage además de envíos de texto normales.

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Acciones disponibles">
    - **react**: Añadir/eliminar tapbacks de iMessage (`messageId`, `emoji`, `remove`). Los tapbacks admitidos corresponden a me gusta, no me gusta, amor, risa, enfatizar y pregunta.
    - **reply**: Enviar una respuesta en hilo a un mensaje existente (`messageId`, `text` o `message`, más `chatGuid`, `chatId`, `chatIdentifier` o `to`).
    - **sendWithEffect**: Enviar texto con un efecto de iMessage (`text` o `message`, `effect` o `effectId`).
    - **edit**: Editar un mensaje enviado en versiones de macOS/private API compatibles (`messageId`, `text` o `newText`).
    - **unsend**: Retirar un mensaje enviado en versiones de macOS/private API compatibles (`messageId`).
    - **upload-file**: Enviar medios/archivos (`buffer` como base64 o un `media`/`path`/`filePath` hidratado, `filename`, `asVoice` opcional). Alias heredado: `sendAttachment`.
    - **renameGroup**, **setGroupIcon**, **addParticipant**, **removeParticipant**, **leaveGroup**: Gestionar chats grupales cuando el objetivo actual es una conversación grupal.

  </Accordion>

  <Accordion title="IDs de mensaje">
    El contexto entrante de iMessage incluye tanto valores cortos `MessageSid` como GUIDs de mensaje completos cuando están disponibles. Los IDs cortos tienen como alcance la caché de respuestas en memoria reciente y se verifican contra el chat actual antes de su uso. Si un ID corto ha caducado o pertenece a otro chat, intente nuevamente con el `MessageSidFull` completo.

  </Accordion>

  <Accordion title="Detección de capacidades">
    OpenClaw oculta las acciones de la API privada solo cuando el estado de la sonda en caché indica que el puente no está disponible. Si el estado es desconocido, las acciones permanecen visibles y envían sondas de forma diferida para que la primera acción pueda tener éxito después de `imsg launch` sin una actualización manual del estado por separado.

  </Accordion>

  <Accordion title="Confirmaciones de lectura y escritura">
    Cuando el puente de la API privada está activo, los chats entrantes aceptados se marcan como leídos antes del envío y se muestra una burbuja de escritura al remitente mientras el agente genera. Desactive el marcado de lectura con:

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Las versiones antiguas de `imsg` anteriores a la lista de capacidades por método bloquearán silenciosamente la escritura/lectura; OpenClaw registra una advertencia única por cada reinicio para que la confirmación faltante sea atribuible.

  </Accordion>
</AccordionGroup>

## Escrituras de configuración

iMessage permite las escrituras de configuración iniciadas por el canal de forma predeterminada (para `/config set|unset` cuando `commands.config: true`).

Desactivar:

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Agrupación de MDs de envío dividido (comando + URL en una sola composición)

Cuando un usuario escribe un comando y una URL juntos (por ejemplo, `Dump https://example.com/article`), la aplicación Mensajes de Apple divide el envío en **dos filas `chat.db` separadas**:

1. Un mensaje de texto (`"Dump"`).
2. Un globo de vista previa de URL (`"https://..."`) con imágenes de vista previa OG como archivos adjuntos.

Las dos filas llegan a OpenClaw con una diferencia de ~0.8-2.0 s en la mayoría de las configuraciones. Sin la agrupación, el agente recibe solo el comando en el turno 1, responde (a menudo " envíame la URL") y solo ve la URL en el turno 2, momento en el cual el contexto del comando ya se ha perdido. Esta es la canalización de envío de Apple, no algo que introduzca OpenClaw o `imsg`.

`channels.imessage.coalesceSameSenderDms` habilita la fusión de filas consecutivas del mismo remitente en un solo turno de agente para un MD. Los chats de grupo continúan enviándose por mensaje para que se preserve la estructura de turnos de varios usuarios.

<Tabs>
  <Tab title="Cuándo habilitar">
    Habilite cuando:

    - Envía habilidades que esperan `command + payload` en un mensaje (volcado, pegar, guardar, cola, etc.).
    - Sus usuarios pegan URL, imágenes o contenido largo junto con comandos.
    - Puede aceptar la latencia adicional del turno de DM (ver abajo).

    Deje deshabilitado cuando:

    - Necesita la latencia mínima de comando para disparadores de DM de una sola palabra.
    - Todos sus flujos son comandos de un solo tiro sin seguimientos de carga.

  </Tab>
  <Tab title="Habilitación">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Con la bandera activada y sin `messages.inbound.byChannel.imessage` explícito, la ventana de antirrebote se amplía a **2500 ms** (el valor predeterminado heredado es 0 ms — sin antirrebote). Se requiere la ventana más amplia porque el ritmo de envío dividido de Apple de 0.8-2.0 s no encaja en un valor predeterminado más ajustado.

    Para ajustar la ventana usted mismo:

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is
            // slow or under memory pressure (observed gap can stretch past 2 s
            // then).
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Compensaciones">
    - **Latencia añadida para mensajes DM.** Con la bandera activada, cada DM (incluidos los comandos de control independientes y los seguimientos de texto único) espera hasta la ventana de antirrebote antes de despacharse, en caso de que venga una fila de carga. Los mensajes de chat de grupo mantienen el envío instantáneo.
    - **La salida combinada está limitada.** El texto combinado se limita a 4000 caracteres con un marcador `…[truncated]` explícito; los adjuntos se limitan a 20; las entradas de origen se limitan a 10 (se conservan la primera y la más reciente más allá de eso). Cada GUID de origen se rastrea en `coalescedMessageGuids` para telemetría descendente.
    - **Solo DM.** Los chats de grupo pasan al envío por mensaje para que el bot mantenga la capacidad de respuesta cuando varias personas están escribiendo.
    - **Optativo, por canal.** Otros canales (Telegram, WhatsApp, Slack, ...) no se ven afectados. Las configuraciones heredadas de BlueBubbles que establecen `channels.bluebubbles.coalesceSameSenderDms` deben migrar ese valor a `channels.imessage.coalesceSameSenderDms`.

  </Tab>
</Tabs>

### Escenarios y lo que ve el agente

| Usuario compone                                                                           | `chat.db` produce           | Bandera desactivada (predeterminado)             | Bandera activada + ventana de 2500 ms                                            |
| ----------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envío)                                                     | 2 filas separadas por ~1 s  | Dos turnos del agente: "Volcado" solo, luego URL | Un turno: texto combinado `Dump https://example.com`                             |
| `Save this 📎image.jpg caption` (adjunto + texto)                                         | 2 filas                     | Dos turnos (adjunto eliminado al fusionar)       | Un turno: texto + imagen conservados                                             |
| `/status` (comando independiente)                                                         | 1 fila                      | Envío instantáneo                                | **Esperar hasta la ventana y luego enviar**                                      |
| URL pegada sola                                                                           | 1 fila                      | Envío instantáneo                                | Envío instantáneo (solo una entrada en el bucket)                                |
| Texto + URL enviados como dos mensajes separados intencionales, con minutos de diferencia | 2 filas fuera de la ventana | Dos turnos                                       | Dos turnos (la ventana expira entre ellos)                                       |
| Inundación rápida (>10 MD pequeños dentro de la ventana)                                  | N filas                     | N turnos                                         | Un turno, salida limitada (primero + último, límites de texto/adjunto aplicados) |
| Dos personas escribiendo en un chat de grupo                                              | N filas de M remitentes     | M+ turnos (uno por bucket de remitente)          | M+ turnos — los chats de grupo no se fusionan                                    |

## Ponerse al día después del tiempo de inactividad de la puerta de enlace

Cuando la puerta de enlace está desconectada (fallo, reinicio, suspensión de Mac, máquina apagada), `imsg watch` se reanuda desde el estado actual de `chat.db` una vez que la puerta de enlace vuelve a estar en línea; de forma predeterminada, todo lo que llegó durante el intervalo nunca se ve. La puesta al día reproduce esos mensajes en el siguiente inicio para que el agente no pierda silenciosamente el tráfico entrante.

La puesta al día está **desactivada de forma predeterminada**. Actívela por canal:

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // master switch (default: false)
      maxAgeMinutes: 120,        // skip rows older than now - 2h (default: 120, clamp 1..720)
      perRunLimit: 50,           // max rows replayed per startup (default: 50, clamp 1..500)
      firstRunLookbackMinutes: 30, // first run with no cursor: look back 30 min (default: 30)
      maxFailureRetries: 10,     // give up on a wedged guid after 10 dispatch failures (default: 10)
    },
  },
}
```

### Cómo se ejecuta

Un paso por cada inicio de `monitorIMessageProvider`, secuenciado como `imsg launch` listo → `watch.subscribe` → `performIMessageCatchup` → bucle de envío en vivo. La puesta al día en sí utiliza `chats.list` + `messages.history` por chat contra el mismo cliente JSON-RPC utilizado por `imsg watch`. Todo lo que llega durante el paso de puesta al día fluye normalmente a través del envío en vivo; la caché de deduplicación de entrantes existente absorbe cualquier superposición con las filas reproducidas.

Cada fila reproducida se alimenta a través de la ruta de envío en vivo (`evaluateIMessageInbound` + `dispatchInboundMessage`), por lo que las listas de permitidos, la política de grupo, el antirrebote, la caché de eco y los recibos de lectura se comportan de manera idéntica en los mensajes reproducidos y en vivo.

### Semántica de cursor y reintento

La puesta al día mantiene un cursor por cuenta en `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` (el directorio de estado de OpenClaw es `~/.openclaw` de forma predeterminada, modificable con `OPENCLAW_STATE_DIR`):

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- El cursor avanza en cada envío exitoso y se mantiene cuando el envío de una fila falla; el próximo inicio reintenta la misma fila desde el cursor mantenido.
- Después de `maxFailureRetries` fallos consecutivos contra el mismo `guid`, la recuperación registra un `warn` y fuerza el avance del cursor más allá del mensaje bloqueado para que los inicios posteriores puedan avanzar.
- Los GUIDs ya abandonados se omiten a la vista (sin intento de envío) en ejecuciones posteriores y se cuentan bajo `skippedGivenUp` en el resumen de la ejecución.

### Señales visibles para el operador

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

Una línea `WARN ... capped to perRunLimit` significa que un único inicio no drenó el retraso completo. Aumente `perRunLimit` (máx. 500) si sus brechas regularmente exceden el pase predeterminado de 50 filas.

### Cuándo dejarlo desactivado

- El Gateway se ejecuta continuamente con auto-reinicio del watchdog y las brechas siempre son < unos pocos segundos; el valor predeterminado de desactivado está bien.
- El volumen de DM es bajo y los mensajes perdidos no cambiarían el comportamiento del agente; la ventana inicial `firstRunLookbackMinutes` puede enviar un contexto antiguo sorprendente al habilitar por primera vez.

Cuando activa la recuperación, el primer inicio sin cursor solo mira hacia atrás `firstRunLookbackMinutes` (30 min predeterminado), no la ventana completa `maxAgeMinutes`; esto evita reproducir un historial largo de mensajes previos a la activación.

## Solución de problemas

<AccordionGroup>
  <Accordion title="imsg no encontrado o RPC no compatible">
    Valide el binario y el soporte RPC:

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    Si la sonda informa que RPC no es compatible, actualice `imsg`. Si las acciones de la API privada no están disponibles, ejecute `imsg launch` en la sesión de usuario de macOS iniciada y sondee nuevamente. Si el Gateway no se está ejecutando en macOS, use la configuración de Mac remoto a través de SSH anterior en lugar de la ruta local `imsg` predeterminada.

  </Accordion>

  <Accordion title="Gateway is not running on macOS">
    El `cliPath: "imsg"` predeterminado debe ejecutarse en el Mac conectado a Messages. En Linux o Windows, configure `channels.imessage.cliPath` en un script de contenedor que realice SSH a ese Mac y ejecute `imsg "$@"`.

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    Luego ejecute:

```bash
openclaw channels status --probe --channel imessage
```

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
    - comportamiento de lista blanca de `channels.imessage.groups`
    - configuración del patrón de mención (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    Verificar:

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - autenticación de clave SSH/SCP desde el host de la puerta de enlace
    - la clave de host existe en `~/.ssh/known_hosts` en el host de la puerta de enlace
    - legibilidad de la ruta remota en el Mac que ejecuta Messages

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    Vuelva a ejecutar en una terminal de GUI interactiva en el mismo contexto de usuario/sesión y apruebe las solicitudes:

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    Confirme que se hayan otorgado Acceso total al disco + Automatización para el contexto del proceso que ejecuta OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Punteros de referencia de configuración

- [Referencia de configuración - iMessage](/es/gateway/config-channels#imessage)
- [Configuración de la puerta de enlace](/es/gateway/configuration)
- [Emparejamiento](/es/channels/pairing)

## Relacionado

- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Viniendo de BlueBubbles](/es/channels/imessage-from-bluebubbles) — tabla de traducción de configuración y transición paso a paso
- [Emparejamiento](/es/channels/pairing) — autenticación DM y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
